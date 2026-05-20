import { db } from '$lib/server/db';
import { item, equipment, warehouse } from '$lib/server/db/schema';
import { organization } from '$lib/server/db/auth.schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { getOrSetCache, invalidateCache } from '$lib/server/redis';

export const load: PageServerLoad = async ({ params }) => {
	const { org_slug } = params;
	const cacheKey = `report:btk-16:${org_slug}`;

	try {
		const reports = await getOrSetCache(cacheKey, async () => {
			console.log(`[Cache Miss] Fetching BTK-16 for ${org_slug}`);
			return await db
				.select({
					itemId: item.id,
					itemName: item.name,
					itemDescription: item.description,
					unit: item.baseUnit,
					brand: equipment.brand,
					serialNumber: equipment.serialNumber,
					condition: equipment.condition
				})
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.innerJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
				.innerJoin(organization, eq(warehouse.organizationId, organization.id))
				.where(eq(organization.slug, org_slug));
		});

		return {
			reports: reports ?? []
		};
	} catch (err) {
		console.error('Error fetching BTK-16:', err);
		throw error(500, 'Internal Server Error');
	}
};

export const actions: Actions = {
	reload: async ({ params }) => {
		const { org_slug } = params;
		const cacheKey = `report:btk-16:${org_slug}`;
		await invalidateCache(cacheKey);
		return { success: true };
	}
};
