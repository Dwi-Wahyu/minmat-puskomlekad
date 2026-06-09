import { db } from '$lib/server/db';
import { item, stock, warehouse, movement, organization, user } from '$lib/server/db/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const { id, org_slug } = params;
	const startDateStr = url.searchParams.get('start');
	const endDateStr = url.searchParams.get('end');

	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, org_slug)
	});

	if (!org) throw error(404, 'Organisasi tidak ditemukan');

	// 1. Get Item details
	const itemResult = await db.query.item.findFirst({
		where: and(eq(item.id, id), eq(item.type, 'CONSUMABLE')),
		with: {
			unitConversions: true
		}
	});

	if (!itemResult) throw error(404, 'Barang tidak ditemukan');

	// 2. Get Stock per warehouse in this organization
	const stocks = await db
		.select({
			id: stock.id,
			qty: stock.qty,
			warehouseName: warehouse.name,
			warehouseLocation: warehouse.location
		})
		.from(stock)
		.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
		.where(and(eq(stock.itemId, id), eq(warehouse.organizationId, org.id)));

	// 3. Get Movement History with date filtering
	const toWarehouse = alias(warehouse, 'to_warehouse');
	const historyFilters = [eq(movement.itemId, id), eq(movement.organizationId, org.id)];

	if (startDateStr) {
		historyFilters.push(gte(movement.createdAt, new Date(startDateStr)));
	}
	if (endDateStr) {
		const endDate = new Date(endDateStr);
		endDate.setHours(23, 59, 59, 999);
		historyFilters.push(lte(movement.createdAt, endDate));
	}

	const historyResults = await db
		.select({
			movement: movement,
			fromWarehouse: warehouse,
			toWarehouse: toWarehouse,
			pic: {
				name: user.name
			}
		})
		.from(movement)
		.leftJoin(warehouse, eq(movement.fromWarehouseId, warehouse.id))
		.leftJoin(toWarehouse, eq(movement.toWarehouseId, toWarehouse.id))
		.leftJoin(user, eq(movement.picId, user.id))
		.where(and(...historyFilters))
		.orderBy(desc(movement.createdAt), desc(movement.id))
		.limit(50);

	const history = historyResults.map((h) => ({
		...h.movement,
		fromWarehouse: h.fromWarehouse,
		toWarehouse: h.toWarehouse,
		pic: h.pic
	}));

	return {
		item: itemResult,
		stocks,
		history,
		org_slug,
		filters: {
			start: startDateStr,
			end: endDateStr
		}
	};
};
