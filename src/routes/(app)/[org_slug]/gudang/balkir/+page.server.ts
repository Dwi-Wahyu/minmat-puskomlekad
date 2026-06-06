import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import { equipment, movement } from '@/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const userOrg = locals.user.organization;
	if (!userOrg?.id) {
		throw error(401, 'Unauthorized');
	}

	return {};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401);

		const formData = await request.formData();
		const movementId = formData.get('id') as string;

		try {
			await db.transaction(async (tx) => {
				const currentMovement = await tx.query.movement.findFirst({
					where: eq(movement.id, movementId),
					with: {
						equipment: true
					}
				});

				if (!currentMovement) throw new Error('Data mutasi tidak ditemukan');

				if (currentMovement.equipmentId) {
					await tx
						.update(equipment)
						.set({
							warehouseId: null,
							status: 'READY'
						})
						.where(eq(equipment.id, currentMovement.equipmentId));

					await tx.insert(movement).values({
						id: crypto.randomUUID(),
						equipmentId: currentMovement.equipmentId,
						organizationId: user.organization.id,
						eventType: 'ISSUE',
						classification: null,
						qty: '1.0000',
						fromWarehouseId: currentMovement.toWarehouseId || currentMovement.fromWarehouseId,
						notes: 'Penghapusan permanen dari Gudang Balkir',
						picId: user.id,
						createdAt: new Date()
					});
				}

				await tx.update(movement).set({ classification: null }).where(eq(movement.id, movementId));
			});

			return { success: true, message: 'Barang berhasil dihapus permanen dari sistem' };
		} catch (error) {
			console.error('Error deleting from balkir:', error);
			return fail(500, { message: 'Gagal memproses penghapusan barang' });
		}
	}
};
