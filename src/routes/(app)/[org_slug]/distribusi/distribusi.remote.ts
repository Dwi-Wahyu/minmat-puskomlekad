import { query } from '$app/server';
import { db } from '$lib/server/db';
import { distribution } from '$lib/server/db/schema';
import { eq, or, desc } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';

export type DistribusiListData = {
	distributions: any[];
	currentOrgId: string;
};

export const getDistribusiData = query(async (): Promise<DistribusiListData> => {
	const { user } = requireAuth();
	const orgId = user.organization.id;

	const distributions = await db.query.distribution.findMany({
		where: or(
			eq(distribution.fromOrganizationId, orgId),
			eq(distribution.toOrganizationId, orgId)
		),
		with: {
			fromOrganization: true,
			toOrganization: true,
			requestedByUser: true,
			items: true
		},
		orderBy: [desc(distribution.createdAt)]
	});

	return {
		distributions,
		currentOrgId: orgId
	};
});
