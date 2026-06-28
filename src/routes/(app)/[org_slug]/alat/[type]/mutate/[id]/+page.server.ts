import { db } from '$lib/server/db';
import {
	equipment,
	warehouse,
	movement,
	organization,
	notification,
	member
} from '$lib/server/db/schema';
import { eq, and, ne, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { invalidateOrgInventoryCache, invalidateNotifCache } from '$lib/server/redis';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id, org_slug } = params;
	const { user } = locals;

	if (!user) throw redirect(302, '/');

	const [data, org] = await Promise.all([
		db.query.equipment.findFirst({
			where: eq(equipment.id, id),
			with: {
				item: true,
				warehouse: true
			}
		}),
		db.query.organization.findFirst({
			where: eq(organization.slug, org_slug)
		})
	]);

	if (!data) throw redirect(302, `/${org_slug}/alat/${params.type}`);
	if (!org) throw redirect(302, '/dashboard');

	// Fetch available warehouses for the organization
	const warehouses = await db.query.warehouse.findMany({
		where: eq(warehouse.organizationId, org.id)
	});

	// Fetch last mutation/movement for this equipment
	const lastMovement = await db.query.movement.findFirst({
		where: eq(movement.equipmentId, id),
		orderBy: (movement, { desc }) => [desc(movement.createdAt)],
		with: {
			fromWarehouse: true,
			toWarehouse: true,
			pic: true
		}
	});

	return {
		equipment: data,
		warehouses,
		lastMovement,
		type: params.type,
		org_slug: params.org_slug
	};
};

// ─── Helper: kirim notifikasi mutasi ke operator lain ───────────────────────

const OPERATOR_ROLES = ['operatorPusatDanDaerah', 'operatorBinmatDanBekharrah'];

async function sendMutationNotifications({
	orgId,
	picId,
	equipmentName,
	eventType,
	fromWarehouseName,
	toWarehouseName,
	movementId,
	orgSlug,
	equipmentId,
	equipmentType,
	conditionAtArrival
}: {
	orgId: string;
	picId: string;
	equipmentName: string;
	eventType: string;
	fromWarehouseName: string | null;
	toWarehouseName: string | null;
	movementId: string;
	orgSlug: string;
	equipmentId: string;
	equipmentType: string;
	conditionAtArrival?: string | null;
}) {
	// 1. Ambil semua member dengan role operator, kecuali yang mencatat
	const targets = await db.query.member.findMany({
		where: and(
			eq(member.organizationId, orgId),
			inArray(member.role, OPERATOR_ROLES),
			ne(member.userId, picId)
		),
		columns: { userId: true }
	});

	const validTargets = targets.filter((t) => t.userId);
	const uniqueUserIds = [...new Set(validTargets.map((t) => t.userId!))];
	if (uniqueUserIds.length === 0) return;

	// 2. Susun teks notifikasi berdasarkan eventType
	const eventLabels: Record<string, string> = {
		RECEIVE: 'Penerimaan (Masuk)',
		ISSUE: 'Pengeluaran Permanen',
		TRANSFER_OUT: 'Transfer Keluar',
		TRANSFER_IN: 'Transfer Masuk (Konfirmasi)'
	};

	const routeLabel = eventLabels[eventType] ?? eventType;

	const fromLabel = fromWarehouseName ?? 'Luar Sistem';
	const toLabel = toWarehouseName ?? 'Keluar Sistem';

	const conditionSuffix =
		conditionAtArrival && conditionAtArrival !== 'BAIK'
			? ` ⚠️ Kondisi tiba: ${conditionAtArrival === 'RUSAK_RINGAN' ? 'Rusak Ringan' : 'Rusak Berat'}.`
			: '';

	const title = `Mutasi ${routeLabel}: ${equipmentName}`;
	const body = `Telah dicatat mutasi ${routeLabel} untuk alat "${equipmentName}". Asal: ${fromLabel} → Tujuan: ${toLabel}.${conditionSuffix} Silakan verifikasi jika diperlukan.`;

	// 3. Tentukan priority berdasarkan event
	const priority = eventType === 'TRANSFER_OUT' || eventType === 'TRANSFER_IN' ? 'HIGH' : 'MEDIUM';

	// 4. Deep link ke halaman detail alat (bukan halaman mutasi)
	const action = JSON.stringify({
		type: 'MUTASI_DETAIL',
		resourceId: movementId,
		webPath: `/${orgSlug}/alat/${equipmentType}/${equipmentId}`
	});

	// 5. Insert notifikasi untuk setiap target (organizationId = null agar tidak dianggap broadcast untuk seluruh org)
	const now = new Date();
	const notifValues = uniqueUserIds.map((userId) => ({
		id: crypto.randomUUID(),
		userId: userId,
		organizationId: null,
		title,
		body,
		priority: priority as 'HIGH' | 'MEDIUM' | 'LOW',
		read: false,
		action,
		createdAt: now
	}));

	// Batch insert semua notifikasi sekaligus
	await db.insert(notification).values(notifValues);

	// Invalidasi cache layout notifikasi untuk masing-masing operator agar UI terupdate
	for (const userId of uniqueUserIds) {
		invalidateNotifCache(userId).catch((err) => {
			console.error(`[Notifikasi Mutasi] Gagal invalidasi cache untuk user ${userId}:`, err);
		});
	}
}

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { user } = locals;
		if (!user) return fail(401);

		const formData = await request.formData();
		const eventType = formData.get('eventType') as any;
		const classification = formData.get('classification') as any;
		const status = formData.get('status') as string;
		const toWarehouseId = formData.get('toWarehouseId') as string;
		const specificLocationName = formData.get('specificLocationName') as string;
		const notes = formData.get('notes') as string;
		const conditionAtArrival = formData.get('conditionAtArrival') as string | null;

		const { id, org_slug, type } = params;

		try {
			const org = await db.query.organization.findFirst({
				where: eq(organization.slug, org_slug)
			});

			if (!org) return fail(404, { message: 'Organisasi tidak ditemukan' });

			const currentEquipment = await db.query.equipment.findFirst({
				where: eq(equipment.id, id)
			});

			if (!currentEquipment) return fail(404, { message: 'Alat tidak ditemukan' });

			// Fetch last movement for state validation
			const lastMovementCheck = await db.query.movement.findFirst({
				where: eq(movement.equipmentId, id),
				orderBy: (movement, { desc }) => [desc(movement.createdAt)]
			});

			// Validasi state machine
			const validTransitions: Record<string, string[]> = {
				TRANSIT: ['TRANSFER_IN', 'ISSUE'],
				READY: ['TRANSFER_OUT', 'ISSUE', 'RECEIVE'],
				IN_USE: ['TRANSFER_OUT', 'ISSUE', 'RECEIVE'],
				MAINTENANCE: [] // tidak ada mutasi manual saat maintenance
			};
			const currentStatus = currentEquipment.status ?? 'READY';
			const allowed = validTransitions[currentStatus] ?? [];

			if (!allowed.includes(eventType)) {
				return fail(400, {
					message: `Mutasi "${eventType}" tidak valid untuk alat dengan status "${currentStatus}".`
				});
			}

			// Validasi tambahan: jika sudah RECEIVE, tidak boleh RECEIVE lagi secara berturut-turut
			if (eventType === 'RECEIVE' && lastMovementCheck?.eventType === 'RECEIVE') {
				return fail(400, {
					message: 'Alat ini sudah diterima sebelumnya (tidak perlu RECEIVE lagi).'
				});
			}

			let newMovementId = '';
			let fromWhId: string | null = null;
			let toWhId: string | null = null;

			// Start a transaction to update equipment and record movement
			await db.transaction(async (tx) => {
				let equipmentUpdate: any = {};

				// 1. Logic based on business rules
				switch (eventType) {
					case 'RECEIVE':
						// External -> System
						fromWhId = null;
						toWhId = toWarehouseId;
						equipmentUpdate = {
							warehouseId: toWhId,
							status: status || 'READY',
							classification: classification || null
						};
						break;

					case 'ISSUE':
						// System -> External (Permanent)
						fromWhId = currentEquipment.warehouseId;
						toWhId = null;
						equipmentUpdate = {
							warehouseId: null,
							status: status || 'READY',

							classification: classification || null
						};
						break;

					case 'TRANSFER_OUT':
						// Internal Movement (Kirim)
						fromWhId = currentEquipment.warehouseId;
						toWhId = toWarehouseId;
						equipmentUpdate = {
							warehouseId: fromWhId,
							status: status || 'TRANSIT',
							classification: classification || null
						};
						break;

					case 'TRANSFER_IN':
						// Internal Movement (Terima)
						fromWhId = currentEquipment.warehouseId;
						toWhId = toWarehouseId;
						equipmentUpdate = {
							warehouseId: toWhId,
							status: status || 'READY',
							classification: classification || null,
							// Update kondisi equipment jika penerima melaporkan kerusakan
							...(conditionAtArrival
								? { condition: conditionAtArrival as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' }
								: {})
						};
						break;

					default:
						fromWhId = currentEquipment.warehouseId;
						toWhId = toWarehouseId;
						if (status) equipmentUpdate.status = status;
						if (classification) equipmentUpdate.classification = classification;
				}

				// Update Equipment State
				if (Object.keys(equipmentUpdate).length > 0) {
					await tx.update(equipment).set(equipmentUpdate).where(eq(equipment.id, id));
				}

				const eventLabels: Record<string, string> = {
					RECEIVE: 'Masuk (Eksternal)',
					ISSUE: 'Keluar / Penghapusan (Permanen)',
					TRANSFER_OUT: 'Transfer Keluar (Internal)',
					TRANSFER_IN: 'Transfer Masuk (Internal)'
				};

				newMovementId = crypto.randomUUID();

				// Record the movement
				await tx.insert(movement).values({
					id: newMovementId,
					equipmentId: id,
					organizationId: org.id,
					eventType: eventType,
					classification: classification || null,
					qty: '1.0000',
					fromWarehouseId: fromWhId,
					toWarehouseId: toWhId,
					specificLocationName: specificLocationName || null,
					notes: notes || `Mutasi manual: ${eventLabels[eventType] || eventType}`,
					conditionAtArrival:
						eventType === 'TRANSFER_IN' && conditionAtArrival ? (conditionAtArrival as any) : null,
					picId: user.id,
					createdAt: new Date()
				});
			});

			// Ambil nama warehouse untuk teks notifikasi
			const fromWhName = fromWhId
				? ((await db.query.warehouse.findFirst({ where: eq(warehouse.id, fromWhId) }))?.name ??
					null)
				: null;
			const toWhName = toWhId
				? ((await db.query.warehouse.findFirst({ where: eq(warehouse.id, toWhId) }))?.name ?? null)
				: null;

			const equipmentForNotif = await db.query.equipment.findFirst({
				where: eq(equipment.id, id),
				with: { item: true }
			});

			// Kirim notifikasi ke operator lain (non-blocking, jangan await jika ingin tidak menunda response)
			sendMutationNotifications({
				orgId: org.id,
				picId: user.id,
				equipmentName: equipmentForNotif?.item?.name ?? id,
				eventType,
				fromWarehouseName: fromWhName,
				toWarehouseName: toWhName,
				movementId: newMovementId,
				orgSlug: org_slug,
				equipmentId: id,
				equipmentType: type,
				conditionAtArrival: eventType === 'TRANSFER_IN' ? conditionAtArrival : null
			}).catch((err) => console.error('[Notifikasi Mutasi] Gagal mengirim:', err));

			// Invalidate cache
			await invalidateOrgInventoryCache(org.id);

			return { success: true, message: 'Mutasi alat berhasil dicatat' };
		} catch (error) {
			console.error('Error in mutate equipment:', error);
			return fail(500, { message: 'Gagal mencatat mutasi alat' });
		}
	}
};
