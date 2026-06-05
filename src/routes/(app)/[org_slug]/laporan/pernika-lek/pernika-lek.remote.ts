import { query } from '$app/server';
import { db } from '$lib/server/db';
import { item, equipment } from '$lib/server/db/schema';
import { organization } from '$lib/server/db/auth.schema';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import { getOrSetCache, CacheTTL } from '$lib/server/redis';

export type PernikaLekReportItem = {
	orgName: string;
	itemName: string;
	brand: string | null;
	unit: string;
	total: number;
	baik: number;
	rr: number;
	rb: number;
	ket: string | null;
	index: number;
};

export type PernikaLekGroupedData = {
	orgName: string;
	items: PernikaLekReportItem[];
}[];

export const getPernikaLekData = query(async (): Promise<PernikaLekGroupedData> => {
	const { user } = requireAuth();
	const orgSlug = user.organization.slug;
	const cacheKey = `report:pernika-lek:${orgSlug}`;

	return await getOrSetCache(
		cacheKey,
		async () => {
			const rawData = await db
				.select({
					orgName: organization.name,
					itemName: item.name,
					brand: equipment.brand,
					unit: item.baseUnit,
					total: sql<number>`cast(count(${equipment.id}) as unsigned)`,
					baik: sql<number>`cast(sum(case when ${equipment.condition} = 'BAIK' then 1 else 0 end) as unsigned)`,
					rr: sql<number>`cast(sum(case when ${equipment.condition} = 'RUSAK_RINGAN' then 1 else 0 end) as unsigned)`,
					rb: sql<number>`cast(sum(case when ${equipment.condition} = 'RUSAK_BERAT' then 1 else 0 end) as unsigned)`,
					ket: sql<string>`MAX(${item.description})`
				})
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.innerJoin(organization, eq(equipment.organizationId, organization.id))
				.where(eq(item.equipmentType, 'PERNIKA_LEK'))
				.groupBy(organization.id, item.name, equipment.brand, item.baseUnit)
				.orderBy(organization.name, item.name);

			let globalCounter = 0;
			return rawData.reduce((acc, curr) => {
				let existingOrg = acc.find((o: any) => o.orgName === curr.orgName);
				const itemWithIndex = { ...curr, index: ++globalCounter };

				if (existingOrg) {
					existingOrg.items.push(itemWithIndex);
				} else {
					acc.push({
						orgName: curr.orgName,
						items: [itemWithIndex]
					});
				}
				return acc;
			}, [] as PernikaLekGroupedData);
		},
		CacheTTL.LAPORAN
	);
});
