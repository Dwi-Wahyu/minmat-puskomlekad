import { query } from '$app/server';
import { db } from '$lib/server/db';
import { building } from '$lib/server/db/schema';
import { eq, and, like, sql, desc } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';

const bangunanSchema = v.object({
	q: v.optional(v.string(), ''),
	page: v.optional(v.number(), 1)
});

export type BangunanListData = {
	buildings: any[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
};

export const getBangunanData = query(bangunanSchema, async (args): Promise<BangunanListData> => {
	const { user } = requireAuth();
	const orgId = user.organization.id;

	const searchQuery = args.q || '';
	const page = args.page || 1;
	const limit = 10;
	const offset = (page - 1) * limit;

	const filters = [eq(building.organizationId, orgId)];

	if (searchQuery) {
		filters.push(
			sql`(${like(building.code, `%${searchQuery}%`)} OR ${like(building.name, `%${searchQuery}%`)} OR ${like(building.location, `%${searchQuery}%`)})`
		);
	}

	const [data, totalCountResult] = await Promise.all([
		db
			.select()
			.from(building)
			.where(and(...filters))
			.limit(limit)
			.offset(offset)
			.orderBy(desc(building.createdAt)),
		db
			.select({ count: sql<number>`count(*)` })
			.from(building)
			.where(and(...filters))
	]);

	const totalItems = totalCountResult[0].count;

	return {
		buildings: data,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(totalItems / limit),
			totalItems
		}
	};
});
