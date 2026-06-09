import { db } from '$lib/server/db';
import { equipment, item, warehouse, organization, movement, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id } = params;

	if (!locals.user) {
		throw redirect(302, '/');
	}

	const toWarehouse = alias(warehouse, 'to_warehouse');
	const picUser = alias(user, 'pic_user');

	const results = await db
		.select({
			movement: movement,
			equipment: equipment,
			item: item,
			organization: organization,
			fromWarehouse: warehouse,
			toWarehouse: toWarehouse,
			pic: picUser
		})
		.from(movement)
		.leftJoin(equipment, eq(movement.equipmentId, equipment.id))
		.leftJoin(item, eq(movement.itemId, item.id))
		.leftJoin(organization, eq(movement.organizationId, organization.id))
		.leftJoin(warehouse, eq(movement.fromWarehouseId, warehouse.id))
		.leftJoin(toWarehouse, eq(movement.toWarehouseId, toWarehouse.id))
		.leftJoin(picUser, eq(movement.picId, picUser.id))
		.where(eq(movement.id, id))
		.limit(1);

	if (results.length === 0) {
		throw error(404, 'Detail mutasi tidak ditemukan');
	}

	const row = results[0];

	// Resolve the item details for the equipment if it is linked
	let itemDetail = row.item;
	if (row.equipment && !itemDetail) {
		const eqItem = await db.query.item.findFirst({
			where: eq(item.id, row.equipment.itemId)
		});
		itemDetail = eqItem || null;
	}

	return {
		movement: {
			...row.movement,
			equipment: row.equipment ? { ...row.equipment, item: itemDetail } : null,
			item: itemDetail,
			organization: row.organization,
			fromWarehouse: row.fromWarehouse,
			toWarehouse: row.toWarehouse,
			pic: row.pic
		}
	};
};
