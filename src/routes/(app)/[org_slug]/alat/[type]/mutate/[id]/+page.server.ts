import { db } from '$lib/server/db';
import { equipment, item, warehouse, movement, organization } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { invalidateOrgInventoryCache } from '$lib/server/redis';

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
		type: params.type
	};
};

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

			// Start a transaction to update equipment and record movement
			await db.transaction(async (tx) => {
				let fromWhId: string | null = null;
				let toWhId: string | null = null;
				let equipmentUpdate: any = {};

				// 1. Logic based on business rules
				switch (eventType) {
					case 'RECEIVE':
						// External -> System
						fromWhId = null;
						toWhId = toWarehouseId;
						equipmentUpdate = { warehouseId: toWhId, status: status || 'READY' };
						break;

					case 'ISSUE':
						// System -> External (Permanent)
						fromWhId = currentEquipment.warehouseId;
						toWhId = null;
						equipmentUpdate = { warehouseId: null, status: status || 'READY' };
						break;

					case 'TRANSFER_OUT':
						// Internal Movement (Kirim)
						fromWhId = currentEquipment.warehouseId;
						toWhId = toWarehouseId;
						equipmentUpdate = { warehouseId: fromWhId, status: status || 'TRANSIT' };
						break;

					case 'TRANSFER_IN':
						// Internal Movement (Terima)
						fromWhId = currentEquipment.warehouseId;
						toWhId = toWarehouseId;
						equipmentUpdate = { warehouseId: toWhId, status: status || 'READY' };
						break;

					default:
						fromWhId = currentEquipment.warehouseId;
						toWhId = toWarehouseId;
						if (status) equipmentUpdate.status = status;
				}

				// Update Equipment State
				if (Object.keys(equipmentUpdate).length > 0) {
					await tx.update(equipment).set(equipmentUpdate).where(eq(equipment.id, id));
				}

				// Record the movement
				await tx.insert(movement).values({
					id: crypto.randomUUID(),
					equipmentId: id,
					organizationId: org.id,
					eventType: eventType,
					classification: classification || null,
					qty: '1.0000',
					fromWarehouseId: fromWhId,
					toWarehouseId: toWhId,
					specificLocationName: specificLocationName || null,
					notes: notes || `Mutasi manual: ${eventType}`,
					picId: user.id,
					createdAt: new Date()
				});
			});

			// Invalidate cache
			await invalidateOrgInventoryCache(org.id);

			return { success: true, message: 'Mutasi alat berhasil dicatat' };
		} catch (error) {
			console.error('Error in mutate equipment:', error);
			return fail(500, { message: 'Gagal mencatat mutasi alat' });
		}
	}
};
