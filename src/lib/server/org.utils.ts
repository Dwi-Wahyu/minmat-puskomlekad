import { db } from '$lib/server/db';
import { organization } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';

/**
 * Mendapatkan ID organisasi beserta seluruh ID organisasi bawahannya secara rekursif.
 * Jika organisasi tidak memiliki bawahan, akan mengembalikan array berisi [orgId].
 */
export async function getOrgAndSubordinateIds(orgId: string): Promise<string[]> {
	const allIds = new Set<string>([orgId]);
	let currentLevel = [orgId];

	while (currentLevel.length > 0) {
		const children = await db.query.organization.findMany({
			columns: { id: true },
			where: inArray(organization.parentId, currentLevel)
		});

		const childIds = children.map((c) => c.id).filter((id) => !allIds.has(id));
		if (childIds.length === 0) break;

		for (const id of childIds) {
			allIds.add(id);
		}
		currentLevel = childIds;
	}

	return Array.from(allIds);
}
