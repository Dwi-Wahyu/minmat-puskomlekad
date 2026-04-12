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
		where: and(eq(movement.classification, 'BALKIR'), eq(movement.organizationId, selectedOrgId)),
		with: {
			equipment: {
				with: {
					item: true
				}
			},
			organization: {
				columns: {
					name: true
				}
			},
			fromWarehouse: {
				columns: {
					name: true
				}
			},
			item: true
		},
		orderBy: [desc(movement.createdAt)]
	});

	return {
		movements: movements.map((m) => {
			// Helper untuk menentukan nama organisasi
			const displayOrgName =
				m.organizationId === userOrg.id ? 'Internal' : (m.organization?.name ?? 'Unknown');

			if (m.equipment) {
				return {
					id: m.id,
					type: 'asset' as const,
					nama: m.equipment.item.name,
					tipe: m.equipment.item.type,
					kategori: m.equipment.item.equipmentType,
					sn: m.equipment.serialNumber,
					qty: m.qty,
					satuan: m.equipment.item.baseUnit,
					kondisi: m.equipment.condition,
					lokasi: m.specificLocationName,
					tglMasuk: m.createdAt,
					organizationName: displayOrgName,
					fromWarehouse: m.fromWarehouse?.name,
					classification: m.classification
				};
			}

			if (m.item) {
				return {
					id: m.id,
					type: 'consumable' as const,
					nama: m.item.name,
					tipe: m.item.type,
					kategori: null,
					sn: null,
					qty: m.qty,
					satuan: m.item.baseUnit,
					kondisi: null,
					lokasi: m.specificLocationName,
					tglMasuk: m.createdAt,
					organizationName: displayOrgName,
					fromWarehouse: m.fromWarehouse?.name,
					classification: m.classification
				};
			}

			return {
				id: m.id,
				type: 'unknown' as const,
				nama: 'Unknown',
				tipe: null,
				kategori: null,
				sn: null,
				qty: m.qty,
				satuan: null,
				kondisi: null,
				lokasi: m.specificLocationName,
				tglMasuk: m.createdAt,
				organizationName: displayOrgName,
				fromWarehouse: m.fromWarehouse?.name
			};
		}),
		organizations: orgs,
		isMabes: isMabes,
		selectedOrgId: selectedOrgId
	};
};
