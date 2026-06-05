import { query } from '$app/server';
import { db } from '$lib/server/db';
import { equipment, stock, movement, warehouse, item, organization } from '$lib/server/db/schema';
import { eq, and, count, sum, gte, desc, sql } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import { getOrSetCache, CacheKeys, CacheTTL } from '$lib/server/redis';

export type DashboardData = {
	org_slug: string;
	summary: {
		activeInventory: number;
		warehouseStock: number;
		damagedItems: number;
		monthlyMovements: number;
	};
	transito: {
		incoming: number;
		outgoing: number;
		pending: number;
	};
	komoditi: {
		active: number;
		outgoing: number;
		damaged: number;
	};
	balkir: {
		total: number;
		used: number;
		ready: number;
		damaged: number;
		incoming: number;
		outgoing: number;
	};
	recentEquipments: any[];
};

export const getDashboardData = query(async (): Promise<DashboardData> => {
	const { user } = requireAuth();
	const orgId = user.organization.id;
	const orgSlug = user.organization.slug;

	const cacheKey = CacheKeys.dashboard(orgId);

	return await getOrSetCache(
		cacheKey,
		async () => {
			const now = new Date();
			const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

			const [activeInventoryCount] = await db
				.select({ count: count() })
				.from(equipment)
				.where(eq(equipment.organizationId, orgId));

			const [warehouseStockSum] = await db
				.select({ total: sum(stock.qty) })
				.from(stock)
				.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
				.where(eq(warehouse.organizationId, orgId));

			const [damagedItemsCount] = await db
				.select({ count: count() })
				.from(equipment)
				.where(and(eq(equipment.organizationId, orgId), sql`${equipment.condition} != 'BAIK'`));

			const [monthlyMovementsCount] = await db
				.select({ count: count() })
				.from(movement)
				.where(and(eq(movement.organizationId, orgId), gte(movement.createdAt, firstDayOfMonth)));

			const [transitoIncoming] = await db
				.select({ count: count() })
				.from(movement)
				.where(
					and(
						eq(movement.organizationId, orgId),
						eq(movement.classification, 'TRANSITO'),
						eq(movement.eventType, 'RECEIVE'),
						gte(movement.createdAt, firstDayOfMonth)
					)
				);

			const [transitoOutgoing] = await db
				.select({ count: count() })
				.from(movement)
				.where(
					and(
						eq(movement.organizationId, orgId),
						eq(movement.classification, 'TRANSITO'),
						eq(movement.eventType, 'ISSUE'),
						gte(movement.createdAt, firstDayOfMonth)
					)
				);

			const [transitoPending] = await db
				.select({ count: count() })
				.from(equipment)
				.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'TRANSIT')));

			const [komoditiActive] = await db
				.select({ count: count() })
				.from(equipment)
				.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'IN_USE')));

			const [komoditiOutgoing] = await db
				.select({ count: count() })
				.from(movement)
				.where(
					and(
						eq(movement.organizationId, orgId),
						eq(movement.classification, 'KOMUNITY'),
						eq(movement.eventType, 'ISSUE'),
						gte(movement.createdAt, firstDayOfMonth)
					)
				);

			const [balkirTotal] = await db
				.select({ count: count() })
				.from(equipment)
				.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'READY')));

			const [balkirDamaged] = await db
				.select({ count: count() })
				.from(equipment)
				.where(
					and(
						eq(equipment.organizationId, orgId),
						eq(equipment.status, 'READY'),
						sql`${equipment.condition} != 'BAIK'`
					)
				);

			const [balkirIncoming] = await db
				.select({ count: count() })
				.from(movement)
				.where(
					and(
						eq(movement.organizationId, orgId),
						eq(movement.classification, 'BALKIR'),
						eq(movement.eventType, 'RECEIVE'),
						gte(movement.createdAt, firstDayOfMonth)
					)
				);

			const [balkirOutgoing] = await db
				.select({ count: count() })
				.from(movement)
				.where(
					and(
						eq(movement.organizationId, orgId),
						eq(movement.classification, 'BALKIR'),
						eq(movement.eventType, 'ISSUE'),
						gte(movement.createdAt, firstDayOfMonth)
					)
				);

			const recentEquipmentsResults = await db
				.select({
					equipment: equipment,
					item: item
				})
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(eq(equipment.organizationId, orgId))
				.limit(5)
				.orderBy(desc(equipment.createdAt));

			return {
				org_slug: orgSlug,
				summary: {
					activeInventory: Number(activeInventoryCount?.count) || 0,
					warehouseStock: Number(warehouseStockSum?.total) || 0,
					damagedItems: Number(damagedItemsCount?.count) || 0,
					monthlyMovements: Number(monthlyMovementsCount?.count) || 0
				},
				transito: {
					incoming: Number(transitoIncoming?.count) || 0,
					outgoing: Number(transitoOutgoing?.count) || 0,
					pending: Number(transitoPending?.count) || 0
				},
				komoditi: {
					active: Number(komoditiActive?.count) || 0,
					outgoing: Number(komoditiOutgoing?.count) || 0,
					damaged: 0
				},
				balkir: {
					total: Number(balkirTotal?.count) || 0,
					used: Number(komoditiActive?.count) || 0,
					ready: Number(balkirTotal?.count) || 0,
					damaged: Number(balkirDamaged?.count) || 0,
					incoming: Number(balkirIncoming?.count) || 0,
					outgoing: Number(balkirOutgoing?.count) || 0
				},
				recentEquipments: recentEquipmentsResults.map((r) => ({
					id: r.equipment.id,
					name: r.item.name,
					brand: r.equipment.brand,
					serialNumber: r.equipment.serialNumber,
					type: r.item.equipmentType,
					condition: r.equipment.condition,
					status: r.equipment.status
				}))
			};
		},
		CacheTTL.DASHBOARD
	);
});
