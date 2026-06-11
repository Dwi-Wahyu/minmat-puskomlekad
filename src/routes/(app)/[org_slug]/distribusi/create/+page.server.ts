import { db } from '$lib/server/db';
import { organization, equipment, item, warehouse } from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { createDistribution } from '$lib/server/distribution';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = locals;
	if (!user) throw error(401, 'Unauthorized');

	if (user.organization.parentId) {
		throw error(403, 'Hanya organisasi pusat yang dapat membuat distribusi');
	}

	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, params.org_slug)
	});

	if (!org) throw error(404, 'Kesatuan tidak ditemukan');

	const organizations = await db.query.organization.findMany({
		where: ne(organization.id, org.id)
	});
	const parentOrg = null;

	// Fetch warehouses for this organization to scope stock check
	const warehouses = await db.query.warehouse.findMany({
		where: eq(warehouse.organizationId, org.id),
		columns: { id: true }
	});
	const warehouseIds = warehouses.map((w) => w.id);

	// Fetch available equipment (READY and in this org)
	const availableEquipment = await db.query.equipment.findMany({
		where: and(eq(equipment.organizationId, org.id), eq(equipment.status, 'READY')),
		with: { item: true, warehouse: true }
	});

	// Fetch items that are CONSUMABLE and their total stock in this organization
	const consumableItems = await db.query.item.findMany({
		where: eq(item.type, 'CONSUMABLE'),
		with: {
			stocks: {
				where: (s, { inArray }) =>
					warehouseIds.length > 0 ? inArray(s.warehouseId, warehouseIds) : eq(s.warehouseId, 'none')
			},
			unitConversions: true
		}
	});

	const consumableItemsWithStock = consumableItems.map((it) => ({
		...it,
		totalStock: it.stocks.reduce((acc, s) => acc + parseFloat(s.qty as any), 0)
	}));

	return {
		organizations,
		parentOrg,
		availableEquipment,
		consumableItems: consumableItemsWithStock,
		currentOrgId: org.id
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');
		if (locals.user.organization.parentId) {
			throw error(403, 'Hanya organisasi pusat yang dapat membuat distribusi');
		}

		const formData = await request.formData();
		const toOrganizationId = formData.get('toOrganizationId') as string;
		const fromOrganizationId = formData.get('fromOrganizationId') as string;
		const itemsJson = formData.get('items') as string;

		if (!toOrganizationId || !itemsJson) throw error(400, 'Data tidak lengkap');

		const items = JSON.parse(itemsJson);
		let distributionId = '';

		try {
			distributionId = await createDistribution({
				fromOrganizationId,
				toOrganizationId,
				requestedBy: locals.user.id,
				requesterRole: locals.user.role,
				items: items.map((it: any) => ({
					type: it.type,
					id: it.id, // equipmentId or itemId
					quantity: Number(it.quantity || 1),
					unit: it.unit || undefined,
					note: it.note || undefined
				}))
			});
		} catch (e) {
			console.error(e);
			return {
				success: false,
				message: e instanceof Error ? e.message : 'Gagal membuat distribusi'
			};
		}

		if (distributionId) {
			return {
				success: true,
				distributionId,
				message: 'Permintaan distribusi berhasil dibuat'
			};
		}
	}
};
