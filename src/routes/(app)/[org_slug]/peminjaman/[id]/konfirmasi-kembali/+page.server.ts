import { db } from '$lib/server/db';
import {
	lending,
	lendingItem,
	approval,
	equipment,
	movement,
	auditLog
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createNotification } from '$lib/server/notification';
import { v4 as uuidv4 } from 'uuid';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id, org_slug } = params;
	const { user } = locals;

	if (!user) throw redirect(302, '/');

	const lendingDetail = await db.query.lending.findFirst({
		where: eq(lending.id, id),
		with: {
			organization: true,
			items: {
				with: {
					equipment: { with: { item: true, warehouse: true } }
				}
			}
		}
	});

	if (!lendingDetail) throw redirect(303, `/${org_slug}/peminjaman`);

	// Auth check: only lender side can confirm return
	const isLender = user.organization.id === lendingDetail.organizationId;
	if (!isLender || lendingDetail.status !== 'DIKIRIM_KEMBALI') {
		throw redirect(303, `/${org_slug}/peminjaman/${id}`);
	}

	return {
		lending: lendingDetail,
		org_slug
	};
};

export const actions: Actions = {
	confirmReturn: async ({ request, locals, params }) => {
		const { user } = locals;
		const { org_slug } = params;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const notes = formData.get('notes')?.toString() || '';
		// conditionOverrides: JSON string array [{equipmentId, condition}] untuk alat yang kondisinya berubah
		const conditionOverridesRaw = formData.get('conditionOverrides')?.toString();
		const conditionOverrides: { equipmentId: string; condition: string }[] = conditionOverridesRaw
			? JSON.parse(conditionOverridesRaw)
			: [];

		if (!id) return fail(400, { message: 'ID required' });

		try {
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id),
				columns: { requestedBy: true, unit: true, status: true, organizationId: true }
			});

			if (lendingData?.status !== 'DIKIRIM_KEMBALI') {
				return fail(400, { message: 'Status tidak valid untuk konfirmasi pengembalian' });
			}

			await db.transaction(async (tx) => {
				await tx.update(lending).set({ status: 'KEMBALI' }).where(eq(lending.id, id));

				await tx.insert(approval).values({
					id: uuidv4(),
					referenceType: 'LENDING',
					referenceId: id,
					approvedBy: user.id,
					status: 'APPROVED',
					note: `[KEMBALI] Pengembalian dikonfirmasi oleh: ${user.name}${notes ? '. Catatan: ' + notes : ''}`
				});

				const items = await tx.query.lendingItem.findMany({
					where: eq(lendingItem.lendingId, id),
					with: { equipment: true }
				});

				for (const item of items) {
					// Cek apakah ada override kondisi untuk alat ini
					const override = conditionOverrides.find((o) => o.equipmentId === item.equipmentId);
					const finalCondition = (override?.condition ?? item.equipment!.condition) as any;

					// Kembalikan status ke READY
					await tx
						.update(equipment)
						.set({ status: 'READY', condition: finalCondition })
						.where(eq(equipment.id, item.equipmentId!));

					// Catat LOAN_RETURN — gudang tujuan adalah warehouseId asal equipment
					await tx.insert(movement).values({
						id: uuidv4(),
						equipmentId: item.equipmentId,
						itemId: item.equipment!.itemId,
						organizationId: lendingData.organizationId,
						eventType: 'LOAN_RETURN',
						classification: 'KOMUNITY',
						fromWarehouseId: null, // unit peminjam tidak punya warehouseId
						toWarehouseId: item.equipment!.warehouseId, // ← kembali ke gudang asal equipment
						specificLocationName: lendingData.unit,
						referenceType: 'LENDING',
						referenceId: id,
						qty: '1',
						notes: `Alat dikembalikan dari unit: ${lendingData.unit}${notes ? '. Catatan: ' + notes : ''}`,
						picId: user.id
					});

					await tx.insert(auditLog).values({
						id: uuidv4(),
						userId: user.id,
						action: 'UPDATE_EQUIPMENT_STATUS',
						tableName: 'equipment',
						recordId: item.equipmentId,
						oldValue: JSON.stringify({ status: 'IN_USE', condition: item.equipment!.condition }),
						newValue: JSON.stringify({ status: 'READY', condition: finalCondition })
					});
				}

				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'CONFIRM_RETURN_LENDING',
					tableName: 'lending',
					recordId: id,
					oldValue: JSON.stringify({ status: 'DIKIRIM_KEMBALI' }),
					newValue: JSON.stringify({ status: 'KEMBALI' })
				});
			});

			if (lendingData.requestedBy) {
				await createNotification({
					userId: lendingData.requestedBy,
					title: 'Peminjaman Selesai',
					body: `Pengembalian alat untuk unit ${lendingData.unit} telah dikonfirmasi oleh gudang.`,
					priority: 'MEDIUM',
					action: {
						type: 'LENDING_DETAIL',
						resourceId: id,
						webPath: `/${org_slug}/peminjaman/${id}`
					}
				});
			}

			return { success: true, message: 'Pengembalian alat berhasil dikonfirmasi' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal konfirmasi pengembalian' });
		}
	}
};
