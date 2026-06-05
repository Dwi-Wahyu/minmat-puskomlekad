import { query } from '$app/server';
import { db } from '$lib/server/db';
import { warehouse } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import { redis, getOrSetCache, CacheKeys, CacheTTL } from '$lib/server/redis';

export type WarehouseData = Awaited<ReturnType<typeof db.query.warehouse.findMany>>;

export const getGudangData = query(async () => {
	const { user } = requireAuth();

	const orgId = user.organization.id;
	const cacheKey = `minmat:gudang-mgmt:${orgId}`;

	return await getOrSetCache(
		cacheKey,
		async () => {
			return await db.query.warehouse.findMany({
				where: eq(warehouse.organizationId, orgId),
				orderBy: [desc(warehouse.createdAt)]
			});
		},
		CacheTTL.GUDANG
	);
});
