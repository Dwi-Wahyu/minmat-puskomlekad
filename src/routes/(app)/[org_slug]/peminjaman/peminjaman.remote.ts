import { query } from '$app/server';
import { db } from '$lib/server/db';
import { lending, member } from '$lib/server/db/schema';
import { eq, or, desc, and, like, inArray } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';

const peminjamanSchema = v.object({
	q: v.optional(v.string(), ''),
	status: v.optional(v.string(), 'ALL')
});

export type PeminjamanListData = {
	lendingList: any[];
	isInduk: boolean;
};

export const getPeminjamanData = query(peminjamanSchema, async (args): Promise<PeminjamanListData> => {
	const { user: currentUser } = requireAuth();
	const { q: searchQuery, status: statusFilter } = args;

	const orgUserIdsSubquery = db
		.select({ id: member.userId })
		.from(member)
		.where(eq(member.organizationId, currentUser.organization.id));

	const isInduk = currentUser.organization.parentId === null;

	const filters = isInduk
		? [eq(lending.organizationId, currentUser.organization.id)]
		: [
				or(
					eq(lending.organizationId, currentUser.organization.id),
					inArray(lending.requestedBy, orgUserIdsSubquery)
				)
			];

	if (statusFilter !== 'ALL') {
		filters.push(eq(lending.status, statusFilter as any));
	}

	if (searchQuery) {
		filters.push(like(lending.unit, `%${searchQuery}%`));
	}

	const data = await db.query.lending.findMany({
		where: and(...filters),
		with: {
			organization: true,
			requestedByUser: {
				columns: { name: true }
			}
		},
		orderBy: [desc(lending.createdAt)]
	});

	return {
		lendingList: data,
		isInduk
	};
});
