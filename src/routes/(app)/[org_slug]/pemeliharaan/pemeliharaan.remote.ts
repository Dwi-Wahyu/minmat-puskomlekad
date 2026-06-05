import { query } from '$app/server';
import { db } from '$lib/server/db';
import { maintenance, equipment } from '$lib/server/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';

const pemeliharaanSchema = v.object({
	equipmentIds: v.optional(v.array(v.string()), [])
});

export type PemeliharaanListData = {
	maintenance: any[];
	equipment: any[];
};

export const getPemeliharaanData = query(pemeliharaanSchema, async (args): Promise<PemeliharaanListData> => {
	const { user } = requireAuth();
	const orgId = user.organization.id;
	const { equipmentIds } = args;

	const maintenanceList = await db.query.maintenance.findMany({
		where: equipmentIds && equipmentIds.length > 0 ? inArray(maintenance.equipmentId, equipmentIds) : undefined,
		with: {
			equipment: {
				with: {
					item: true
				}
			}
		},
		orderBy: [desc(maintenance.scheduledDate)]
	});

	const equipmentList = await db.query.equipment.findMany({
		where: eq(equipment.organizationId, orgId),
		with: {
			item: true
		}
	});

	const filteredMaintenance = maintenanceList.filter(
		(m) => m.equipment?.organizationId === orgId
	);

	return {
		maintenance: filteredMaintenance,
		equipment: equipmentList
	};
});
