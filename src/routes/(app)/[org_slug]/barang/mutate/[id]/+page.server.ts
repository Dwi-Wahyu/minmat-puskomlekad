import { db } from '$lib/server/db';
import {
	item,
	stock,
	warehouse,
	movement,
	organization,
	notification,
	member
} from '$lib/server/db/schema';
import { eq, and, ne, inArray } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { superValidate, message } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { barangMutationSchema } from '$lib/schemas/barang-mutation-schema';
import { invalidateOrgInventoryCache, invalidateNotifCache } from '$lib/server/redis';

const OPERATOR_ROLES = ['operatorPusatDanDaerah', 'operatorBinmatDanBekharrah'];

async function sendBarangMutationNotifications({
	orgId,
	picId,
	itemName,
	eventType,
	qty,
	unit,
	movementId,
	orgSlug,
	itemId
}: {
	orgId: string;
	picId: string;
	itemName: string;
	eventType: string;
	qty: number;
	unit?: string | null;
	movementId: string;
	orgSlug: string;
	itemId: string;
}) {
	const targets = await db.query.member.findMany({
		where: and(
			eq(member.organizationId, orgId),
			inArray(member.role, OPERATOR_ROLES),
			ne(member.userId, picId)
		),
		columns: { userId: true }
	});

	const uniqueUserIds = [...new Set(targets.filter((t) => t.userId).map((t) => t.userId!))];
	if (uniqueUserIds.length === 0) return;

	const eventLabels: Record<string, string> = {
		RECEIVE: 'Penerimaan',
		ISSUE: 'Pengeluaran',
		TRANSFER_OUT: 'Transfer Keluar',
		TRANSFER_IN: 'Transfer Masuk',
		ADJUSTMENT: 'Penyesuaian Stok'
	};

	const routeLabel = eventLabels[eventType] ?? eventType;
	const unitLabel = unit ? ` ${unit}` : '';
	const title = `Mutasi Barang — ${routeLabel}: ${itemName}`;
	const body = `Telah dicatat mutasi ${routeLabel} sebesar ${qty}${unitLabel} untuk barang "${itemName}". Silakan verifikasi jika diperlukan.`;
	const priority = eventType === 'TRANSFER_OUT' || eventType === 'TRANSFER_IN' ? 'HIGH' : 'MEDIUM';

	const action = JSON.stringify({
		type: 'MUTASI_BARANG_DETAIL',
		resourceId: movementId,
		webPath: `/${orgSlug}/barang/${itemId}`
	});

	const now = new Date();
	const notifValues = uniqueUserIds.map((userId) => ({
		id: crypto.randomUUID(),
		userId,
		organizationId: null,
		title,
		body,
		priority: priority as 'HIGH' | 'MEDIUM' | 'LOW',
		read: false,
		action,
		createdAt: now
	}));

	await db.insert(notification).values(notifValues);

	for (const userId of uniqueUserIds) {
		invalidateNotifCache(userId).catch((err) => {
			console.error(`[Notifikasi Mutasi Barang] Gagal invalidasi cache untuk user ${userId}:`, err);
		});
	}
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id, org_slug } = params;

	const { user } = locals;

	const [itemData, org] = await Promise.all([
		db.query.item.findFirst({
			where: and(eq(item.id, id), eq(item.type, 'CONSUMABLE'))
		}),
		db.query.organization.findFirst({
			where: eq(organization.slug, org_slug)
		})
	]);

	if (!itemData) throw error(404, 'Barang tidak ditemukan');
	if (!org) throw error(404, 'Organisasi tidak ditemukan');

	const warehouses = await db.query.warehouse.findMany({
		where: eq(warehouse.organizationId, org.id)
	});

	// Fetch current stock for this item in all warehouses of this org
	const stocks = await db
		.select({
			id: stock.id,
			itemId: stock.itemId,
			warehouseId: stock.warehouseId,
			qty: stock.qty,
			updatedAt: stock.updatedAt
		})
		.from(stock)
		.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
		.where(and(eq(stock.itemId, id), eq(warehouse.organizationId, org.id)));

	const form = await superValidate({ itemId: id }, yup(barangMutationSchema));

	return {
		user,
		item: itemData,
		warehouses,
		stocks,
		org_slug,
		form
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const { user } = locals;
		const { org_slug } = params;
		const formData = await request.formData();
		const form = await superValidate(formData, yup(barangMutationSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const { itemId, warehouseId, toWarehouseId, qty, type, classification, notes } = form.data;

			const [org, itemData] = await Promise.all([
				db.query.organization.findFirst({
					where: eq(organization.slug, org_slug)
				}),
				db.query.item.findFirst({
					where: eq(item.id, itemId)
				})
			]);

			if (!org) return message(form, 'Organisasi tidak ditemukan', { status: 404 });
			if (!itemData) return message(form, 'Barang tidak ditemukan', { status: 404 });

			// Logic for consumable mutation
			// If it's ISSUE or TRANSFER_OUT, we decrease stock from source warehouse
			// If it's RECEIVE or TRANSFER_IN, we increase stock in target warehouse
			// If it's ADJUSTMENT, we treat it as an increase/decrease based on UI (here it's always positive)
			// For TRANSFER_OUT, we also increase stock in toWarehouseId if provided

			const deltaSource = type === 'ISSUE' || type === 'TRANSFER_OUT' ? -qty : (type === 'ADJUSTMENT' || type === 'RECEIVE' || type === 'TRANSFER_IN' ? qty : 0);

			let newMovementId = crypto.randomUUID();

			await db.transaction(async (tx) => {
				// 1. Record movement
				await tx.insert(movement).values({
					id: newMovementId,
					itemId,
					organizationId: org.id,
					eventType: type,
					classification: classification,
					qty: qty.toString(),
					fromWarehouseId:
						type === 'ISSUE' || type === 'TRANSFER_OUT' || type === 'ADJUSTMENT'
							? warehouseId
							: null,
					toWarehouseId:
						type === 'TRANSFER_OUT'
							? toWarehouseId
							: (type === 'RECEIVE' || type === 'TRANSFER_IN' || type === 'ADJUSTMENT'
								? warehouseId
								: null),
					notes: notes || 'Mutasi manual',
					picId: user?.id,
					createdAt: new Date()
				});

				// 2. Update Source/Primary Stock
				const existingStock = await tx.query.stock.findFirst({
					where: and(eq(stock.itemId, itemId), eq(stock.warehouseId, warehouseId))
				});

				if (existingStock) {
					const newQty = Number(existingStock.qty) + deltaSource;
					if (newQty < 0) throw new Error('Stok tidak mencukupi untuk pengeluaran ini');

					await tx
						.update(stock)
						.set({ qty: newQty.toFixed(4), updatedAt: new Date() })
						.where(eq(stock.id, existingStock.id));
				} else {
					if (deltaSource < 0) throw new Error('Stok awal tidak bisa negatif');
					await tx.insert(stock).values({
						id: crypto.randomUUID(),
						itemId,
						warehouseId,
						qty: deltaSource.toFixed(4),
						updatedAt: new Date()
					});
				}

				// 3. Update Destination Stock for TRANSFER_OUT
				if (type === 'TRANSFER_OUT' && toWarehouseId) {
					const existingDestStock = await tx.query.stock.findFirst({
						where: and(eq(stock.itemId, itemId), eq(stock.warehouseId, toWarehouseId))
					});

					if (existingDestStock) {
						const newDestQty = Number(existingDestStock.qty) + qty;
						await tx
							.update(stock)
							.set({ qty: newDestQty.toFixed(4), updatedAt: new Date() })
							.where(eq(stock.id, existingDestStock.id));
					} else {
						await tx.insert(stock).values({
							id: crypto.randomUUID(),
							itemId,
							warehouseId: toWarehouseId,
							qty: qty.toFixed(4),
							updatedAt: new Date()
						});
					}
				}
			});

			// Kirim notifikasi (non-blocking)
			sendBarangMutationNotifications({
				orgId: org.id,
				picId: user?.id ?? '',
				itemName: itemData.name,
				eventType: type,
				qty: qty,
				unit: itemData.baseUnit,
				movementId: newMovementId,
				orgSlug: org_slug,
				itemId: itemId
			}).catch((err) => console.error('[Notifikasi Mutasi Barang] Gagal mengirim:', err));

			if (org) await invalidateOrgInventoryCache(org.id);

			return message(form, 'Mutasi berhasil dicatat');
		} catch (err) {
			console.error('Error in mutate barang:', err);
			const errorMessage = err instanceof Error ? err.message : 'Gagal mencatat mutasi';
			return message(form, errorMessage, { status: 500 });
		}
	}
};
