import { db } from '$lib/server/db';
import { equipment, item, warehouse, movement } from '$lib/server/db/schema';
import { eq, and, like, sql, desc, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { invalidateOrgInventoryCache } from '$lib/server/redis';

export const load: PageServerLoad = async ({ params, url }) => {
	const { org_slug, type } = params;
	const searchQuery = url.searchParams.get('q') || '';
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = 10;
	const offset = (page - 1) * limit;

	// Map URL type to database equipmentType
	const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

	const org = await db.query.organization.findFirst({
		where: eq(sql`slug`, org_slug)
	});

	if (!org) throw fail(404, { message: 'Organisasi tidak ditemukan' });

	const filters = [
		eq(item.equipmentType, equipmentType),
		eq(equipment.organizationId, org.id)
	];

	if (searchQuery) {
		filters.push(
			sql`(${like(equipment.serialNumber, `%${searchQuery}%`)} OR ${like(item.name, `%${searchQuery}%`)} OR ${like(equipment.brand, `%${searchQuery}%`)})`
		);
	}

	const [dataRaw, totalCountResult] = await Promise.all([
		db
			.select({
				id: equipment.id,
				serialNumber: equipment.serialNumber,
				condition: equipment.condition,
				status: equipment.status,
				itemName: item.name,
				imagePath: item.imagePath,
				warehouseName: warehouse.name,
				createdAt: equipment.createdAt
			})
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.leftJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
			.where(and(...filters))
			.limit(limit)
			.offset(offset)
			.orderBy(desc(equipment.createdAt)),
		db
			.select({ count: sql<number>`count(*)` })
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.where(and(...filters))
	]);

	// Ambil last movement untuk semua equipment dalam 1 query
	// Menggunakan subquery untuk mendapatkan max createdAt per equipmentId
	const equipmentIds = dataRaw.map((e) => e.id);

	let lastMovements: (typeof movement.$inferSelect)[] = [];

	if (equipmentIds.length > 0) {
		// Subquery: ambil createdAt terbaru per equipmentId
		const subquery = db
			.select({
				equipmentId: movement.equipmentId,
				maxDate: sql<Date>`MAX(${movement.createdAt})`.as('max_date')
			})
			.from(movement)
			.where(inArray(movement.equipmentId, equipmentIds))
			.groupBy(movement.equipmentId)
			.as('latest');

		lastMovements = await db
			.select({
				id: movement.id,
				equipmentId: movement.equipmentId,
				eventType: movement.eventType,
				classification: movement.classification,
				createdAt: movement.createdAt,
				notes: movement.notes
			})
			.from(movement)
			.innerJoin(
				subquery,
				and(eq(movement.equipmentId, subquery.equipmentId), eq(movement.createdAt, subquery.maxDate))
			);
	}

	// Map ke equipment — O(n) lookup via Map
	const lastMovMap = new Map(lastMovements.map((m) => [m.equipmentId, m]));

	const equipmentWithMovements = dataRaw.map((eqp) => ({
		...eqp,
		lastMovement: lastMovMap.get(eqp.id) ?? null
	}));

	const totalItems = totalCountResult[0].count;

	return {
		equipment: equipmentWithMovements,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(totalItems / limit),
			totalItems
		},
		filters: { q: searchQuery },
		type
	};
};

export const actions: Actions = {
	delete: async ({ request, params }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID is required' });

		const org = await db.query.organization.findFirst({
			where: eq(sql`slug`, params.org_slug)
		});

		if (!org) return fail(404, { message: 'Organisasi tidak ditemukan' });

		try {
			await db.delete(equipment).where(eq(equipment.id, id));

			// Invalidate cache
			await invalidateOrgInventoryCache(org.id);

			return { success: true, message: 'Alat berhasil dihapus' };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Gagal menghapus alat' });
		}
	}
};
