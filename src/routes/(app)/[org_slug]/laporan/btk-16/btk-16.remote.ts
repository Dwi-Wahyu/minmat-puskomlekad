import { query } from '$app/server';
import { db } from '$lib/server/db';
import { item, equipment, warehouse } from '$lib/server/db/schema';
import { organization } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import { getOrSetCache, CacheTTL } from '$lib/server/redis';

export type Btk16Data = {
	itemId: string;
	itemName: string;
	itemDescription: string | null;
	unit: string;
	brand: string | null;
	serialNumber: string | null;
	condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | null;
};

export const getBtk16Data = query(async () => {
	const { user } = requireAuth();
	const orgSlug = user.organization.slug;
	const cacheKey = `report:btk-16:${orgSlug}`;

	return await getOrSetCache(
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
});
