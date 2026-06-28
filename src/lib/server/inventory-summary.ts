import { db } from '$lib/server/db';
import { equipment, item } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function getItemClassificationBreakdown(orgId: string) {
	const rows = await db
		.select({
			itemId: item.id,
			itemName: item.name,
			classification: equipment.classification,
			condition: equipment.condition,
			count: sql<number>`count(*)`.as('count')
		})
		.from(equipment)
		.innerJoin(item, eq(equipment.itemId, item.id))
		.where(and(eq(equipment.organizationId, orgId), sql`${equipment.status} != 'DISPOSED'`))
		.groupBy(item.id, item.name, equipment.classification, equipment.condition);

	// Susun ulang jadi shape: { itemName: { baik, balkir, transito, komunity } }
	const grouped = new Map<
		string,
		{ itemName: string; baik: number; balkir: number; transito: number; komunity: number }
	>();

	for (const row of rows) {
		const key = row.itemId;
		if (!grouped.has(key)) {
			grouped.set(key, { itemName: row.itemName, baik: 0, balkir: 0, transito: 0, komunity: 0 });
		}
		const entry = grouped.get(key)!;
		if (row.condition === 'BAIK') entry.baik += row.count;
		if (row.classification === 'BALKIR') entry.balkir += row.count;
		if (row.classification === 'TRANSITO') entry.transito += row.count;
		if (row.classification === 'KOMUNITY') entry.komunity += row.count;
	}

	return Array.from(grouped.values());
}
