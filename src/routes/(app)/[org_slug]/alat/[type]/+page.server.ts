import { db } from '$lib/server/db';
import { equipment } from '$lib/server/db/schema';
import { eq, and, like, sql, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, params }) => {
	const { type } = params;

	const uppercasedType = type.toUpperCase();

	const searchQuery = url.searchParams.get('name') || '';
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = 10;
	const offset = (page - 1) * limit;

	const filters = [];

	// if (searchQuery) filters.push(like(equipment.name, `%${searchQuery}%`));

	filters.push(eq(equipment.type, uppercasedType as 'ALKOMLEK' | 'PERNIKA_LEK'));

	const [data, totalCountResult] = await Promise.all([
		db
			.select()
			.from(equipment)
			.where(and(...filters))
			.limit(limit)
			.offset(offset)
			.orderBy(desc(equipment.createdAt)),
		db
			.select({ count: sql<number>`count(*)` })
			.from(equipment)
			.where(and(...filters))
	]);

	const totalItems = totalCountResult[0].count;

	return {
		data,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(totalItems / limit),
			totalItems
		},
		filters: { name: searchQuery }
	};
};
