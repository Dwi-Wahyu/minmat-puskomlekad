import { query } from '$app/server';
import { db } from '$lib/server/db';
import { movement, equipment, organization, item } from '$lib/server/db/schema';
import { eq, desc, and, isNotNull, sql } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';

const komunitySchema = v.object({
	orgId: v.optional(v.string(), ''),
	search: v.optional(v.string(), ''),
	type: v.optional(v.string(), ''),
	category: v.optional(v.string(), '')
});

export type KomunityData = {
	items: any[];
	organizations: any[];
	isMabes: boolean;
	selectedOrgId: string;
};

export const getKomunityData = query(komunitySchema, async (args): Promise<KomunityData> => {
	const { user } = requireAuth();
	const userOrg = user.organization;

	const isMabes = userOrg.parentId === null;
	const selectedOrgId = args.orgId || userOrg.id;

	const { search: searchQuery, type: typeFilter, category: categoryFilter } = args;

	// Fetch all organizations if user is Mabes
	const orgs = isMabes ? await db.query.organization.findMany() : [];

	// 1. Get Assets (Equipment)
	const equipmentList = await db.query.equipment.findMany({
		where: eq(equipment.organizationId, selectedOrgId),
		with: {
			item: true,
			movements: {
				where: eq(movement.classification, 'KOMUNITY'),
				orderBy: [desc(movement.createdAt)]
			}
		}
	});

	// 2. Get Consumable Movements
	const consumableMovements = await db.query.movement.findMany({
		where: and(
			eq(movement.classification, 'KOMUNITY'),
			eq(movement.organizationId, selectedOrgId),
			isNotNull(movement.itemId)
		),
		with: {
			item: true
		}
	});

	// Transform Assets
	const assets = equipmentList.map((equip) => {
		let totalMasuk = 0;
		let totalKeluar = 0;

		equip.movements.forEach((m) => {
			if (m.eventType === 'RECEIVE' || m.eventType === 'ADJUSTMENT' || m.eventType === 'DISTRIBUTE_IN' || m.eventType === 'TRANSFER_IN') {
				totalMasuk += Number(m.qty);
			} else if (m.eventType === 'ISSUE' || m.eventType === 'DISTRIBUTE_OUT' || m.eventType === 'TRANSFER_OUT') {
				totalKeluar += Number(m.qty);
			}
		});

		const stok = totalMasuk - totalKeluar;
		let sisaBaik = 0, sisaRR = 0, sisaRB = 0;

		if (equip.condition === 'BAIK') sisaBaik = stok;
		else if (equip.condition === 'RUSAK_RINGAN') sisaRR = stok;
		else if (equip.condition === 'RUSAK_BERAT') sisaRB = stok;

		return {
			id: equip.id,
			itemId: equip.itemId,
			matkomplek: equip.serialNumber,
			namaBarang: equip.item.name,
			tipe: 'ASSET' as const,
			stok: stok,
			masuk: totalMasuk,
			keluar: totalKeluar,
			sisaBaik: sisaBaik,
			sisaRR: sisaRR,
			sisaRB: sisaRB,
			kondisi: equip.condition,
			keterangan: '-',
			tahun: new Date(equip.createdAt).getFullYear(),
			equipmentType: equip.item.equipmentType,
			baseUnit: equip.item.baseUnit
		};
	});

	// Transform & Group Consumables
	const consumableMap = new Map<string, any>();
	consumableMovements.forEach((m) => {
		if (!m.item) return;
		const key = m.itemId!;
		const existing = consumableMap.get(key) || {
			id: `c-${m.itemId}`,
			itemId: m.itemId,
			matkomplek: '-',
			namaBarang: m.item.name,
			tipe: 'CONSUMABLE' as const,
			stok: 0,
			masuk: 0,
			keluar: 0,
			sisaBaik: 0,
			sisaRR: 0,
			sisaRB: 0,
			kondisi: 'BAIK',
			keterangan: '-',
			tahun: new Date(m.item.createdAt).getFullYear(),
			equipmentType: null,
			baseUnit: m.item.baseUnit
		};

		const qty = Number(m.qty);
		if (m.eventType === 'RECEIVE' || m.eventType === 'ADJUSTMENT' || m.eventType === 'DISTRIBUTE_IN' || m.eventType === 'TRANSFER_IN') {
			existing.masuk += qty;
		} else if (m.eventType === 'ISSUE' || m.eventType === 'DISTRIBUTE_OUT' || m.eventType === 'TRANSFER_OUT') {
			existing.keluar += qty;
		}

		existing.stok = existing.masuk - existing.keluar;
		existing.sisaBaik = existing.stok;
		consumableMap.set(key, existing);
	});

	const allItems = [...assets, ...Array.from(consumableMap.values())];

	// Apply Filters
	const filteredItems = allItems.filter((item) => {
		if (searchQuery) {
			const nameMatch = item.namaBarang.toLowerCase().includes(searchQuery.toLowerCase());
			const snMatch = item.matkomplek?.toLowerCase().includes(searchQuery.toLowerCase());
			if (!nameMatch && !snMatch) return false;
		}

		if (typeFilter && item.tipe !== typeFilter) return false;

		if (categoryFilter && item.equipmentType !== categoryFilter) return false;

		return item.stok > 0 || item.masuk > 0 || item.keluar > 0;
	});

	return {
		items: filteredItems,
		organizations: orgs,
		isMabes: isMabes,
		selectedOrgId: selectedOrgId
	};
});
