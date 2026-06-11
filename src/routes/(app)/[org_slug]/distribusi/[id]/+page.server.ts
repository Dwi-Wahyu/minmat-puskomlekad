import { db } from '$lib/server/db';
import {
	distribution,
	warehouse,
	distributionEquipment,
	distributionConsumable
} from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import {
	validateDistribution,
	approveDistribution,
	shipDistribution,
	receiveDistribution
} from '$lib/server/distribution';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id } = params;
	if (!locals.user) throw error(401, 'Unauthorized');

	const dist = await db.query.distribution.findFirst({
		where: eq(distribution.id, id),
		with: {
			fromOrganization: true,
			toOrganization: true,
			requestedByUser: true,
			approvedByUser: true,
			equipmentItems: {
				with: {
					equipment: {
						with: { item: true, warehouse: true }
					}
				}
			},
			consumableItems: {
				with: {
					item: {
						with: {
							stocks: {
								with: { warehouse: true }
							}
						}
					},
					fromWarehouse: true
				}
			}
		}
	});

	if (!dist) throw error(404, 'Distribusi tidak ditemukan');

	// Filter consumable stocks to only include those from the sending organization
	if (dist.consumableItems) {
		for (const cons of dist.consumableItems) {
			if (cons.item?.stocks) {
				cons.item.stocks = cons.item.stocks.filter(
					(s) => s.warehouse?.organizationId === dist.fromOrganizationId
				);
			}
		}
	}

	// Get warehouses for the current organization to handle shipping/receiving
	const warehouses = await db.query.warehouse.findMany({
		where: eq(warehouse.organizationId, locals.user.organization.id)
	});

	// Get approval if exists
	const approvalData = await db.query.approval.findFirst({
		where: (a, { and, eq }) => and(eq(a.referenceId, id), eq(a.referenceType, 'DISTRIBUTION')),
		with: { approvedByUser: true },
		orderBy: (a, { desc }) => [desc(a.createdAt)]
	});

	return {
		distribution: dist,
		warehouses,
		approval: approvalData,
		currentOrgId: locals.user.organization.id,
		canValidate: ['operatorBinmatDanBekharrah', 'operatorPusatDanDaerah', 'superadmin'].includes(
			locals.user.role
		),
		canApprove:
			['pimpinan', 'kakomlek', 'superadmin'].includes(locals.user.role) &&
			dist.status === 'VALIDATED'
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		if (!id) return fail(400, { message: 'ID required' });

		try {
			const dist = await db.query.distribution.findFirst({
				where: eq(distribution.id, id)
			});

			if (!dist) return fail(404, { message: 'Distribusi tidak ditemukan' });
			if (dist.status !== 'DRAFT')
				return fail(400, { message: 'Hanya distribusi DRAFT yang dapat dihapus' });
			if (dist.requestedBy !== locals.user.id)
				return fail(403, { message: 'Hanya pembuat yang dapat menghapus' });

			// Delete related items first (assuming no cascading deletes for safety)
			await db.delete(distributionEquipment).where(eq(distributionEquipment.distributionId, id));
			await db.delete(distributionConsumable).where(eq(distributionConsumable.distributionId, id));
			await db.delete(distribution).where(eq(distribution.id, id));

			return { success: true, message: 'Distribusi berhasil dihapus', action: 'delete' };
		} catch (e) {
			console.log('Gagal hapus distribusi: ' + e);
			return fail(500, { message: 'Gagal menghapus distribusi' });
		}
	},

	validate: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		if (!id) return fail(400, { message: 'ID required' });

		try {
			await validateDistribution(id, locals.user.id);
			return { success: true, message: 'Distribusi berhasil divalidasi' };
		} catch (e) {
			console.log('Gagal validasi kesiapan distribusi: ' + e);
			return fail(500, { message: 'Gagal validasi' });
		}
	},

	approve: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const isApproved = formData.get('isApproved')?.toString() === 'true';
		const note = formData.get('note')?.toString();

		if (!id) return fail(400, { message: 'ID required' });

		try {
			await approveDistribution(id, locals.user.id, isApproved, note);
			return {
				success: true,
				message: isApproved ? 'Distribusi disetujui' : 'Distribusi ditolak'
			};
		} catch (e) {
			console.log('Gagal approve distribusi: ' + e);
			return fail(500, { message: 'Gagal approval' });
		}
	},

	ship: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) return fail(400, { message: 'ID required' });

		const consumableWarehouses: Record<string, string> = {};
		for (const [key, value] of formData.entries()) {
			if (key.startsWith('warehouse_')) {
				const distConsId = key.replace('warehouse_', '');
				consumableWarehouses[distConsId] = value.toString();
			}
		}

		try {
			await shipDistribution(id, locals.user.id, consumableWarehouses);
			return { success: true, message: 'Materi dalam pengiriman' };
		} catch (e) {
			console.log('Gagal konfirmasi kirim: ' + e);
			return fail(500, { message: e instanceof Error ? e.message : 'Gagal pengiriman' });
		}
	},

	receive: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const toWarehouseId = formData.get('toWarehouseId')?.toString();

		if (!id || !toWarehouseId) return fail(400, { message: 'ID dan Gudang required' });

		try {
			await receiveDistribution(id, locals.user.id, toWarehouseId);
			return { success: true, message: 'Materi berhasil diterima' };
		} catch (e) {
			console.log('Gagal konfirmasi terima: ' + e);
			return fail(500, { message: 'Gagal penerimaan' });
		}
	}
};
