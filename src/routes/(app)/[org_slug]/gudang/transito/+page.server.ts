import { db } from '$lib/server/db';
import { movement, organization } from '$lib/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const userOrg = locals.user.organization;
	const isMabes = userOrg.parentId === null;
	const selectedOrgId = url.searchParams.get('orgId') || userOrg.id;

	if (!userOrg.id) {
		return {
			movements: [],
			organizations: [],
			isMabes: false,
			selectedOrgId: ''
		};
	}

	// Fetch all organizations if user is Mabes
	const orgs = isMabes ? await db.query.organization.findMany() : [];

	const movements = await db.query.movement.findMany({
		where: and(
			eq(movement.classification, 'TRANSITO'),
			eq(movement.organizationId, selectedOrgId)
		),

		with: {
			equipment: {
				with: {
					item: true
				}
			},
			item: true
		},
		orderBy: [desc(movement.createdAt)]
	});

	return {
		movements: movements.map((m) => {
			// Jika movement untuk asset (punya equipment)
			if (m.equipment) {
				return {
					id: m.id,
					type: 'asset' as const,
					nama: m.equipment.item.name,
					kategori: m.item?.equipmentType,
					notes: m.notes,
					qty: m.qty
				};
			}
			// Jika movement untuk consumable (punya item)
			else if (m.item) {
				return {
					id: m.id,
					type: 'consumable' as const,
					nama: m.item.name,
					kategori: null, // consumable tidak punya equipment type
					notes: m.notes,
					qty: m.qty
				};
			}
			// Fallback jika keduanya null (seharusnya tidak terjadi)
			return {
				id: m.id,
				type: 'unknown' as const,
				nama: 'Unknown',
				kategori: null,
				qty: m.qty,
				notes: m.notes
			};
		}),
		organizations: orgs,
		isMabes: isMabes,
		selectedOrgId: selectedOrgId
	};
};
