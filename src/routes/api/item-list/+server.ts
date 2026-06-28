import { db } from '$lib/server/db';
import { item, equipment } from '$lib/server/db/schema';
import { eq, and, like, asc } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	const q = url.searchParams.get('q') || '';
	const equipmentType = url.searchParams.get('equipmentType') || 'ALKOMLEK';

	try {
		const items = await db.query.item.findMany({
			where: and(
				eq(item.type, 'ASSET'),
				eq(item.equipmentType, equipmentType as any),
				q ? like(item.name, `%${q}%`) : undefined
			),
			orderBy: [asc(item.name)],
			limit: 50
		});

		// Fetch the latest brand used for each item to auto-populate
		const itemsWithBrand = await Promise.all(
			items.map(async (i) => {
				const eqp = await db.query.equipment.findFirst({
					where: eq(equipment.itemId, i.id),
					columns: { brand: true }
				});
				return {
					...i,
					brand: eqp?.brand || ''
				};
			})
		);

		return json({ success: true, items: itemsWithBrand });
	} catch (err) {
		console.error('Error fetching item list:', err);
		return json({ success: false, message: 'Server error' }, { status: 500 });
	}
};
