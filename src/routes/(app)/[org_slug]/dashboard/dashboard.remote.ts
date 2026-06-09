import { query } from '$app/server';
import { db } from '$lib/server/db';
import { equipment, stock, movement, warehouse, item } from '$lib/server/db/schema';
import { eq, and, count, sum, gte, desc, sql, inArray } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import { getOrSetCache, CacheTTL } from '$lib/server/redis';

export type DashboardData = {
	org_slug: string;
	activeFilters: {
		period: string;
		equipmentType: string;
	};
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
	recentEquipments: {
		id: string;
		name: string;
		brand: string | null;
		serialNumber: string | null;
		type: 'ALKOMLEK' | 'PERNIKA_LEK';
		condition: string;
		status: string;
	}[];
};

export const getDashboardData = query(
	async (filters?: { period?: string; equipmentType?: string }): Promise<DashboardData> => {
		const { user } = requireAuth();
		const orgId = user.organization.id;
		const orgSlug = user.organization.slug;

		const period = filters?.period || 'this_month';
		const equipmentType = filters?.equipmentType || 'ALL';

		const cacheKey = `dashboard:${orgId}:${period}:${equipmentType}`;

		return await getOrSetCache(
			cacheKey,
			async () => {
				const now = new Date();
				let startDate: Date;

				switch (period) {
					case '3_months':
						startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
						break;
					case '6_months':
						startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
						break;
					case 'this_year':
						startDate = new Date(now.getFullYear(), 0, 1);
						break;
					case 'this_month':
					default:
						startDate = new Date(now.getFullYear(), now.getMonth(), 1);
						break;
				}

				// Filter tipe alat — null berarti tidak difilter (ALL)
				const equipmentTypeFilter =
					equipmentType !== 'ALL'
						? eq(item.equipmentType, equipmentType as 'ALKOMLEK' | 'PERNIKA_LEK')
						: undefined;

				const [activeInventoryCount] = await db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(and(eq(equipment.organizationId, orgId), equipmentTypeFilter));

				const [warehouseStockSum] = await db
					.select({ total: sum(stock.qty) })
					.from(stock)
					.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
					.where(eq(warehouse.organizationId, orgId));

				const [damagedItemsCount] = await db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							sql`${equipment.condition} != 'BAIK'`,
							equipmentTypeFilter
						)
					);

				const [monthlyMovementsCount] = await db
					.select({ count: count() })
					.from(movement)
					.where(and(eq(movement.organizationId, orgId), gte(movement.createdAt, startDate)));

				const [transitoIncoming] = await db
					.select({ count: count() })
					.from(movement)
					.where(
						and(
							eq(movement.organizationId, orgId),
							eq(movement.classification, 'TRANSITO'),
							inArray(movement.eventType, ['RECEIVE', 'TRANSFER_IN']),
							gte(movement.createdAt, startDate)
						)
					);

				const [transitoOutgoing] = await db
					.select({ count: count() })
					.from(movement)
					.where(
						and(
							eq(movement.organizationId, orgId),
							eq(movement.classification, 'TRANSITO'),
							inArray(movement.eventType, ['ISSUE', 'TRANSFER_OUT']),
							gte(movement.createdAt, startDate)
						)
					);

				const [transitoPending] = await db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							eq(equipment.status, 'TRANSIT'),
							equipmentTypeFilter
						)
					);

				const [komoditiActive] = await db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							eq(equipment.status, 'IN_USE'),
							equipmentTypeFilter
						)
					);

				const [komoditiOutgoing] = await db
					.select({ count: count() })
					.from(movement)
					.where(
						and(
							eq(movement.organizationId, orgId),
							eq(movement.classification, 'KOMUNITY'),
							inArray(movement.eventType, ['ISSUE', 'TRANSFER_OUT', 'DISTRIBUTE_OUT']),
							gte(movement.createdAt, startDate)
						)
					);

				const [komoditiDamaged] = await db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							eq(equipment.status, 'IN_USE'),
							sql`${equipment.condition} != 'BAIK'`,
							equipmentTypeFilter
						)
					);

				const [balkirTotal] = await db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							eq(equipment.status, 'READY'),
							equipmentTypeFilter
						)
					);

				const [balkirReady] = await db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							eq(equipment.status, 'READY'),
							eq(equipment.condition, 'BAIK'),
							equipmentTypeFilter
						)
					);

				const [balkirDamaged] = await db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							eq(equipment.status, 'READY'),
							sql`${equipment.condition} != 'BAIK'`,
							equipmentTypeFilter
						)
					);

				const [balkirIncoming] = await db
					.select({ count: count() })
					.from(movement)
					.where(
						and(
							eq(movement.organizationId, orgId),
							eq(movement.classification, 'BALKIR'),
							inArray(movement.eventType, ['RECEIVE', 'TRANSFER_IN']),
							gte(movement.createdAt, startDate)
						)
					);

				const [balkirOutgoing] = await db
					.select({ count: count() })
					.from(movement)
					.where(
						and(
							eq(movement.organizationId, orgId),
							eq(movement.classification, 'BALKIR'),
							inArray(movement.eventType, ['ISSUE', 'TRANSFER_OUT']),
							gte(movement.createdAt, startDate)
						)
					);

				const recentEquipmentsResults = await db
					.select({
						equipment: equipment,
						item: item
					})
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(and(eq(equipment.organizationId, orgId), equipmentTypeFilter))
					.limit(5)
					.orderBy(desc(equipment.createdAt));

				return {
					org_slug: orgSlug,
					activeFilters: {
						period,
						equipmentType
					},
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
						damaged: Number(komoditiDamaged?.count) || 0
					},
					balkir: {
						total: Number(balkirTotal?.count) || 0,
						used: Number(komoditiActive?.count) || 0,
						ready: Number(balkirReady?.count) || 0,
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
	}
);
