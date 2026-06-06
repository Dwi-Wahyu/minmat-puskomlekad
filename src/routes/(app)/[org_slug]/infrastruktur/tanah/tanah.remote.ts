import { query } from '$app/server';
import { db } from '$lib/server/db';
import { land } from '$lib/server/db/schema';
import { eq, and, like, sql, desc } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';

const tanahSchema = v.object({
	q: v.optional(v.string(), ''),
	page: v.optional(v.number(), 1)
});

export type TanahListData = {
	lands: any[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
};

export const getTanahData = query(tanahSchema, async (args): Promise<TanahListData> => {
	const { user } = requireAuth();
	const orgId = user.organization.id;

	const searchQuery = args.q || '';
	const page = args.page || 1;
	const limit = 10;
	const offset = (page - 1) * limit;

	const filters = [eq(land.organizationId, orgId)];

	if (searchQuery) {
		filters.push(
			sql`(${like(land.certificateNumber, `%${searchQuery}%`)} OR ${like(land.location, `%${searchQuery}%`)} OR ${like(land.usage, `%${searchQuery}%`)})`
		);
	}

	const [data, totalCountResult] = await Promise.all([
		db
			.select()
			.from(land)
			.where(and(...filters))
			.limit(limit)
			.offset(offset)
			.orderBy(desc(land.createdAt)),
		db
			.select({ count: sql<number>`count(*)` })
			.from(land)
			.where(and(...filters))
	]);

	const totalItems = totalCountResult[0].count;

	return {
		lands: data,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(totalItems / limit),
			totalItems
		}
	};
});
