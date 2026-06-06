import { query } from '$app/server';
import { db } from '$lib/server/db';
import { item, equipment, warehouse } from '$lib/server/db/schema';
import { organization } from '$lib/server/db/auth.schema';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import { getOrSetCache, CacheTTL } from '$lib/server/redis';
import * as v from 'valibot';

const btkSchema = v.object({
	page: v.optional(v.number(), 1),
	limit: v.optional(v.number(), 50)
});

export type Btk16Data = {
	reports: {
		itemId: string;
		itemName: string;
		itemDescription: string | null;
		unit: string;
		brand: string | null;
		serialNumber: string | null;
		condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | null;
	}[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
};

export const getBtk16Data = query(btkSchema, async (args): Promise<Btk16Data> => {
	const { user } = requireAuth();
	const orgSlug = user.organization.slug;
	const { page = 1, limit = 50 } = args;
	const offset = (page - 1) * limit;

	const cacheKey = `report:btk-16:${orgSlug}`;

	const allData = await getOrSetCache(
		cacheKey,
		async () => {
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
				.where(eq(organization.slug, orgSlug));
		},
		CacheTTL.LAPORAN
	);

	const totalItems = allData.length;
	const reports = allData.slice(offset, offset + limit);

	return {
		reports,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(totalItems / limit),
			totalItems
		}
	};
});
