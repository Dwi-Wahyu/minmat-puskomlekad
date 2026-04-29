import { db } from '$lib/server/db';
import { movement, organization, equipment, item } from '$lib/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const userOrg = locals.user.organization;
	if (!userOrg?.id) {
		return {
			movements: [],
			organizations: [],
			isMabes: false,
			selectedOrgId: '',
			filters: { search: '', type: '', category: '' }
		};
	}

	const isMabes = userOrg.parentId === null;
	const selectedOrgId = url.searchParams.get('orgId') || userOrg.id;

	// Filter Params
	const searchQuery = url.searchParams.get('search') || '';
	const typeFilter = url.searchParams.get('type') || '';
	const categoryFilter = url.searchParams.get('category') || '';

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
			item: true,
			organization: {
				columns: { name: true }
			},
			fromWarehouse: {
				columns: { name: true }
			}
		},
		orderBy: [desc(movement.createdAt)]
	});

	// Filter and Grouping logic
	const filtered = movements.filter((m) => {
		const itemData = m.equipment?.item || m.item;
		if (!itemData) return false;

		// Search Filter
		if (searchQuery) {
			const nameMatch = itemData.name.toLowerCase().includes(searchQuery.toLowerCase());
			const snMatch = m.equipment?.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());
			if (!nameMatch && !snMatch) return false;
		}

		// Type Filter
		if (typeFilter && itemData.type !== typeFilter) return false;

		// Category Filter
		if (categoryFilter && itemData.equipmentType !== categoryFilter) return false;

		return true;
	});

	// Mapping & Grouping
	const mappedMovements = filtered.map((m) => {
		const displayOrgName =
			m.organizationId === userOrg.id ? 'Internal' : (m.organization?.name ?? 'Unknown');
if (m.equipment) {
	return {
		id: m.id,
		equipmentId: m.equipment.id,
		type: 'asset' as const,
		nama: m.equipment.item.name,
		tipe: m.equipment.item.type,
		kategori: m.equipment.item.equipmentType,
		sn: m.equipment.serialNumber,
		qty: 1,
		satuan: m.equipment.item.baseUnit,
		notes: m.notes,
		lokasi: m.specificLocationName,
		tglMasuk: m.createdAt,
		organizationName: displayOrgName,
		fromWarehouse: m.fromWarehouse?.name || 'Pusat/Luar'
	};
}

return {
	id: m.id,
	itemId: m.item?.id,
	type: 'consumable' as const,
	nama: m.item?.name || 'Unknown',
	tipe: m.item?.type || 'CONSUMABLE',
	kategori: null,
	sn: null,
	qty: Number(m.qty),
	satuan: m.item?.baseUnit,
	notes: m.notes,
	lokasi: m.specificLocationName,
	tglMasuk: m.createdAt,
	organizationName: displayOrgName,
	fromWarehouse: m.fromWarehouse?.name || 'Pusat/Luar'
};
});

// Terapkan Grouping untuk Consumables
const finalMovements: any[] = [];
const consumableGroups = new Map<string, any>();

for (const m of mappedMovements) {
if (m.type === 'consumable' && m.itemId) {
	const key = `${m.itemId}-${m.lokasi}-${m.organizationName}-${m.fromWarehouse}`;
	const existing = consumableGroups.get(key);
	if (existing) {
		existing.qty += m.qty;
		if (new Date(m.tglMasuk) > new Date(existing.tglMasuk)) {
			existing.tglMasuk = m.tglMasuk;
		}
	} else {
		consumableGroups.set(key, { ...m });
	}
} else {
	finalMovements.push(m);
}
}


	finalMovements.push(...Array.from(consumableGroups.values()));
	
	// Sort by latest date again
	finalMovements.sort((a, b) => new Date(b.tglMasuk).getTime() - new Date(a.tglMasuk).getTime());

	return {
		movements: finalMovements,
		organizations: orgs,
		isMabes: isMabes,
		selectedOrgId: selectedOrgId,
		filters: {
			search: searchQuery,
			type: typeFilter,
			category: categoryFilter
		}
	};
};
