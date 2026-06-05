import { query } from '$app/server';
import { db } from '$lib/server/db';
import { item, stock, warehouse, itemUnitConversion, organization } from '$lib/server/db/schema';
import { eq, and, like, desc, sql, inArray } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';

const barangSchema = v.object({
	name: v.optional(v.string(), ''),
	page: v.optional(v.number(), 1)
});

export type BarangData = {
	consumables: any[];
	warehouses: any[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
};

export const getBarangData = query(barangSchema, async (args): Promise<BarangData> => {
	const { user } = requireAuth();
	const organizationId = user.organization.id;

	const searchQuery = args.name || '';
	const page = args.page || 1;
	const limit = 10;
	const offset = (page - 1) * limit;

	const stockAgg = db
		.select({
			itemId: stock.itemId,
			totalQty: sql<string>`SUM(${stock.qty})`.as('totalQty')
		})
		.from(stock)
		.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
		.where(eq(warehouse.organizationId, organizationId))
		.groupBy(stock.itemId)
		.as('sa');

	const filters = [eq(item.type, 'CONSUMABLE')];
	if (searchQuery) filters.push(like(item.name, `%${searchQuery}%`));

	const [itemsData, totalCountResult, warehouses] = await Promise.all([
		db
			.select({
				id: item.id,
				name: item.name,
				baseUnit: item.baseUnit,
				createdAt: item.createdAt,
				totalStock: stockAgg.totalQty
			})
			.from(item)
			.leftJoin(stockAgg, eq(item.id, stockAgg.itemId))
			.where(and(...filters))
			.limit(limit)
			.offset(offset)
			.orderBy(desc(item.createdAt)),
		db
			.select({ count: sql<number>`count(*)` })
			.from(item)
			.where(and(...filters)),
		db.query.warehouse.findMany({
			where: eq(warehouse.organizationId, organizationId)
		})
	]);

	const itemIds = itemsData.map((i) => i.id);
	const conversions =
		itemIds.length > 0
			? await db.query.itemUnitConversion.findMany({
					where: inArray(itemUnitConversion.itemId, itemIds)
				})
			: [];

	const consumables = itemsData.map((item: any) => ({
		...item,
		conversions: conversions.filter((c) => c.itemId === item.id)
	}));

	return {
		consumables,
		warehouses,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(totalCountResult[0].count / limit),
			totalItems: totalCountResult[0].count
		}
	};
});
