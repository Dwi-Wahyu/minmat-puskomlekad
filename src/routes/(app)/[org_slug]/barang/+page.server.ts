import { db } from '$lib/server/db';
import { item } from '$lib/server/db/schema';
import { eq, and, like, desc, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const searchQuery = url.searchParams.get('name') || '';
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = 10;
	const offset = (page - 1) * limit;

	const filters = [eq(item.type, 'CONSUMABLE')];
	if (searchQuery) filters.push(like(item.name, `%${searchQuery}%`));

	const [data, totalCountResult] = await Promise.all([
		db
			.select()
			.from(item)
			.where(and(...filters))
			.limit(limit)
			.offset(offset)
			.orderBy(desc(item.createdAt)),
		db
			.select({ count: sql<number>`count(*)` })
			.from(item)
			.where(and(...filters))
	]);

	return {
		consumables: data,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(totalCountResult[0].count / limit),
			totalItems: totalCountResult[0].count
		},
		filters: { name: searchQuery }
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		await db.delete(item).where(eq(item.id, id));
		return { success: true };
	}
};
