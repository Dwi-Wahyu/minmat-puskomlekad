import { query } from '$app/server';
import { db } from '$lib/server/db';
import { movement } from '$lib/server/db/schema';
import { eq, desc, and, isNull, isNotNull } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';

const balkirSchema = v.object({
	orgId: v.optional(v.string(), ''),
	search: v.optional(v.string(), ''),
	type: v.optional(v.string(), ''),
	category: v.optional(v.string(), ''),
	page: v.optional(v.number(), 1),
	limit: v.optional(v.number(), 25)
});

export type BalkirData = {
	movements: any[];
	organizations: any[];
	isMabes: boolean;
	selectedOrgId: string;
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
};

export const getBalkirData = query(balkirSchema, async (args): Promise<BalkirData> => {
	const { user } = requireAuth();
	const userOrg = user.organization;

	const isMabes = userOrg.parentId === null;
	const selectedOrgId = args.orgId || userOrg.id;

	const { search: searchQuery, type: typeFilter, category: categoryFilter } = args;

	const orgs = isMabes ? await db.query.organization.findMany() : [];

	// ─── 1. Asset movements ───────────────────────────────────────────────────────
	const assetMovements = await db.query.movement.findMany({
		where: and(
			eq(movement.classification, 'BALKIR'),
			eq(movement.organizationId, selectedOrgId),
			isNotNull(movement.equipmentId)
		),
		with: {
			equipment: {
				with: {
					item: true,
					warehouse: true
				}
			},
			organization: { columns: { name: true } },
			fromWarehouse: { columns: { name: true } }
		},
		orderBy: [desc(movement.createdAt)]
	});

	// ─── 2. Consumable movements ──────────────────────────────────────────────────
	const consumableMovements = await db.query.movement.findMany({
		where: and(
			eq(movement.classification, 'BALKIR'),
			eq(movement.organizationId, selectedOrgId),
			isNull(movement.equipmentId),
			isNotNull(movement.itemId)
		),
		with: {
			item: true,
			organization: { columns: { name: true } },
			fromWarehouse: { columns: { name: true } }
		},
		orderBy: [desc(movement.createdAt)]
	});

	// ─── 3. Filter assets ─────────────────────────────────────────────────────────
	const filteredAssets = assetMovements.filter((m) => {
		const itemData = m.equipment?.item;
		if (!itemData) return false;

		if (searchQuery) {
			const nameMatch = itemData.name.toLowerCase().includes(searchQuery.toLowerCase());
			const snMatch = m.equipment?.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());
			if (!nameMatch && !snMatch) return false;
		}

		if (typeFilter && typeFilter !== 'ASSET') return false;
		if (categoryFilter && itemData.equipmentType !== categoryFilter) return false;

		return true;
	});

	// ─── 4. Filter consumables ────────────────────────────────────────────────────
	const filteredConsumables = consumableMovements.filter((m) => {
		if (!m.item || m.item.type !== 'CONSUMABLE') return false;

		if (searchQuery) {
			const nameMatch = m.item.name.toLowerCase().includes(searchQuery.toLowerCase());
			if (!nameMatch) return false;
		}

		if (typeFilter && typeFilter !== 'CONSUMABLE') return false;
		if (categoryFilter) return false; // consumable tidak punya equipmentType

		return true;
	});

	// ─── 5. Map ke shape yang sama ────────────────────────────────────────────────
	const mappedAssets = filteredAssets.map((m) => {
		const displayOrgName =
			m.organizationId === userOrg.id ? 'Internal' : (m.organization?.name ?? 'Unknown');
		return {
			id: m.id,
			equipmentId: m.equipment!.id,
			type: 'asset' as const,
			nama: m.equipment!.item.name,
			tipe: m.equipment!.item.type,
			kategori: m.equipment!.item.equipmentType,
			sn: m.equipment!.serialNumber,
			qty: 1,
			satuan: m.equipment!.item.baseUnit,
			kondisi: m.equipment!.condition,
			lokasi: m.specificLocationName,
			tglMasuk: m.createdAt,
			organizationName: displayOrgName,
			fromWarehouse: m.fromWarehouse?.name || 'Pusat/Luar',
			classification: m.classification
		};
	});

	const mappedConsumables = filteredConsumables.map((m) => {
		const displayOrgName =
			m.organizationId === userOrg.id ? 'Internal' : (m.organization?.name ?? 'Unknown');
		return {
			id: m.id,
			itemId: m.item!.id,
			type: 'consumable' as const,
			nama: m.item!.name,
			tipe: m.item!.type,
			kategori: null,
			sn: null,
			qty: Number(m.qty),
			satuan: m.item!.baseUnit,
			kondisi: null,
			lokasi: m.specificLocationName,
			tglMasuk: m.createdAt,
			organizationName: displayOrgName,
			fromWarehouse: m.fromWarehouse?.name || 'Pusat/Luar',
			classification: m.classification
		};
	});

	// ─── 6. Group consumables ─────────────────────────────────────────────────────
	const finalMovements: any[] = [...mappedAssets];
	const consumableGroups = new Map<string, any>();

	for (const m of mappedConsumables) {
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
	}

	finalMovements.push(...Array.from(consumableGroups.values()));

	finalMovements.sort((a, b) => new Date(b.tglMasuk).getTime() - new Date(a.tglMasuk).getTime());

	// ─── 7. Pagination ────────────────────────────────────────────────────────────
	const { page = 1, limit = 25 } = args;
	const totalItems = finalMovements.length;
	const totalPages = Math.ceil(totalItems / limit);
	const offset = (page - 1) * limit;
	const paginatedMovements = finalMovements.slice(offset, offset + limit);

	return {
		movements: paginatedMovements,
		organizations: orgs,
		isMabes,
		selectedOrgId,
		pagination: {
			currentPage: page,
			totalPages,
			totalItems
		}
	};
});
