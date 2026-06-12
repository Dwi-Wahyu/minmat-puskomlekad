import { db } from '$lib/server/db';
import { equipment, item, warehouse, organization, movement } from '$lib/server/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const { id } = params;

	// Filters
	const startDate = url.searchParams.get('start');
	const endDate = url.searchParams.get('end');

	// Use aliases for multiple joins to the same table if needed
	const toWarehouse = alias(warehouse, 'to_warehouse');

	// Use explicit select with joins to avoid LEFT JOIN LATERAL issues on some MySQL/MariaDB versions
	const results = await db
		.select({
			equipment: equipment,
			item: item,
			warehouse: warehouse,
			organization: organization
		})
		.from(equipment)
		.innerJoin(item, eq(equipment.itemId, item.id))
		.leftJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
		.leftJoin(organization, eq(warehouse.organizationId, organization.id))
		.where(eq(equipment.id, id))
		.limit(1);

	if (results.length === 0) throw error(404, 'Alat tidak ditemukan');

	const row = results[0];
	const detail = {
		...row.equipment,
		item: row.item,
		warehouse: row.warehouse
			? {
					...row.warehouse,
					organization: row.organization
				}
			: null
	};

	// Build history filters
	const historyFilters = [eq(movement.equipmentId, id)];
	if (startDate) historyFilters.push(gte(movement.createdAt, new Date(startDate)));
	if (endDate) {
		const end = new Date(endDate);
		end.setHours(23, 59, 59, 999);
		historyFilters.push(lte(movement.createdAt, end));
	}

	// Ambil riwayat pergerakan terakhir menggunakan join eksplisit
	const historyResults = await db
		.select({
			movement: movement,
			organization: organization,
			fromWarehouse: warehouse,
			toWarehouse: toWarehouse
		})
		.from(movement)
		.leftJoin(organization, eq(movement.organizationId, organization.id))
		.leftJoin(warehouse, eq(movement.fromWarehouseId, warehouse.id))
		.leftJoin(toWarehouse, eq(movement.toWarehouseId, toWarehouse.id))
		.where(and(...historyFilters))
		.orderBy(desc(movement.createdAt), desc(movement.id))
		.limit(20);

	const history = historyResults.map((h) => ({
		...h.movement,
		organization: h.organization,
		fromWarehouse: h.fromWarehouse,
		toWarehouse: h.toWarehouse
	}));

	return {
		equipment: detail,
		history,
		org_slug: params.org_slug,
		filters: {
			start: startDate,
			end: endDate
		}
	};
};
