import { db } from '$lib/server/db';
import { lending, lendingItem, equipment, item } from '$lib/server/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

export async function getLendingBreakdownByItem(orgId: string, itemId: string) {
	return db
		.select({
			unit: lending.unit,
			count: sql<number>`count(*)`.as('count')
		})
		.from(lendingItem)
		.innerJoin(lending, eq(lendingItem.lendingId, lending.id))
		.innerJoin(equipment, eq(lendingItem.equipmentId, equipment.id))
		.where(
			and(
				eq(equipment.itemId, itemId),
				eq(lending.organizationId, orgId),
				inArray(lending.status, ['DIPINJAM', 'PERINTAH_LANGSUNG'])
			)
		)
		.groupBy(lending.unit);
}
