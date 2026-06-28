import { query } from '$app/server';
import { db } from '$lib/server/db';
import { movement, equipment, organization, item, stock, warehouse } from '$lib/server/db/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';

const komunitySchema = v.object({
	orgId: v.optional(v.string(), ''),
	search: v.optional(v.string(), ''),
	type: v.optional(v.string(), ''),
	category: v.optional(v.string(), ''),
	page: v.optional(v.number(), 1),
	limit: v.optional(v.number(), 25)
});

export type KomunityItem = {
	id: string;
	itemId: string | null;
	matkomplek: string;
	namaBarang: string;
	tipe: 'ASSET' | 'CONSUMABLE';
	stok: number;
	masuk: number;
	keluar: number;
	sisaBaik: number;
	sisaRR: number;
	sisaRB: number;
	kondisi: string;
	keterangan: string;
	tahun: number;
	equipmentType: string | null;
	baseUnit: string;
};

export type KomunityData = {
	items: KomunityItem[];
	organizations: { id: string; name: string | null; slug: string | null }[];
	isMabes: boolean;
	selectedOrgId: string;
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
};

const INCOMING_EVENTS = ['RECEIVE', 'ADJUSTMENT', 'DISTRIBUTE_IN', 'TRANSFER_IN'] as const;
const OUTGOING_EVENTS = ['ISSUE', 'DISTRIBUTE_OUT', 'TRANSFER_OUT'] as const;

export const getKomunityData = query(komunitySchema, async (args): Promise<KomunityData> => {
	const { user } = requireAuth();
	const userOrg = user.organization;

	const isMabes = userOrg.parentId === null;
	const selectedOrgId = args.orgId || userOrg.id;

	const { search: searchQuery, type: typeFilter, category: categoryFilter } = args;

	const orgs = isMabes
		? await db
				.select({ id: organization.id, name: organization.name, slug: organization.slug })
				.from(organization)
		: [];

	// ─── 1. ASSET: query ke equipment (current-state) ─────────────────────────
	// Sebelumnya: filter equipment berdasarkan movement.classification = 'KOMUNITY' (histori).
	// Sekarang: filter langsung dari equipment.classification = 'KOMUNITY' (current-state).
	// Equipment yang sudah pindah ke Balkir/Transito tidak akan muncul lagi di sini.
	const equipmentList = await db.query.equipment.findMany({
		where: and(
			eq(equipment.classification, 'KOMUNITY'),
			eq(equipment.organizationId, selectedOrgId)
		),
		with: {
			item: true
		}
	});

	const assets: KomunityItem[] = equipmentList
		.filter((equip) => equip.item != null)
		.map((equip) => {
			// Untuk komunity, qty asset per unit selalu 1.
			// masuk/keluar tidak relevan per-unit — dihitung 1 karena equipment ini ada di sini sekarang.
			return {
				id: equip.id,
				itemId: equip.itemId,
				matkomplek: equip.serialNumber ?? '-',
				namaBarang: equip.item.name,
				tipe: 'ASSET' as const,
				stok: 1,
				masuk: 1,
				keluar: 0,
				sisaBaik: equip.condition === 'BAIK' ? 1 : 0,
				sisaRR: equip.condition === 'RUSAK_RINGAN' ? 1 : 0,
				sisaRB: equip.condition === 'RUSAK_BERAT' ? 1 : 0,
				kondisi: equip.condition,
				keterangan: '-',
				tahun: new Date(equip.createdAt).getFullYear(),
				equipmentType: equip.item.equipmentType ?? null,
				baseUnit: equip.item.baseUnit
			};
		});

	// ─── 2. CONSUMABLE: tetap dari movement ────────────────────────────────────
	// Consumable tidak punya identitas unit individual, tidak ada equipment row per-unit,
	// sehingga classification-nya hanya bisa diambil dari histori movement.
	const consumableMovements = await db
		.select({
			id: movement.id,
			itemId: movement.itemId,
			eventType: movement.eventType,
			qty: movement.qty,
			itemName: item.name,
			itemBaseUnit: item.baseUnit,
			itemCreatedAt: item.createdAt
		})
		.from(movement)
		.innerJoin(item, eq(movement.itemId, item.id))
		.where(
			and(
				eq(movement.classification, 'KOMUNITY'),
				eq(movement.organizationId, selectedOrgId),
				eq(item.type, 'CONSUMABLE'),
				isNull(movement.equipmentId)
			)
		);

	// ─── 3. CONSUMABLE: Fallback via tabel stock ───────────────────────────────
	const stockRows = await db
		.select({
			itemId: stock.itemId,
			qty: stock.qty,
			itemName: item.name,
			itemBaseUnit: item.baseUnit,
			itemCreatedAt: item.createdAt
		})
		.from(stock)
		.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
		.innerJoin(item, eq(stock.itemId, item.id))
		.where(and(eq(warehouse.organizationId, selectedOrgId), eq(item.type, 'CONSUMABLE')));

	// ─── 4. Gabungkan movement consumable + stock fallback ─────────────────────
	const consumableMap = new Map<string, KomunityItem>();

	consumableMovements.forEach((m) => {
		if (!m.itemId) return;
		const key = m.itemId;
		const existing = consumableMap.get(key) ?? {
			id: `c-${m.itemId}`,
			itemId: m.itemId,
			matkomplek: '-',
			namaBarang: m.itemName,
			tipe: 'CONSUMABLE' as const,
			stok: 0,
			masuk: 0,
			keluar: 0,
			sisaBaik: 0,
			sisaRR: 0,
			sisaRB: 0,
			kondisi: 'BAIK',
			keterangan: '-',
			tahun: new Date(m.itemCreatedAt).getFullYear(),
			equipmentType: null,
			baseUnit: m.itemBaseUnit
		};

		const qty = Number(m.qty);
		if (INCOMING_EVENTS.includes(m.eventType as any)) {
			existing.masuk += qty;
		} else if (OUTGOING_EVENTS.includes(m.eventType as any)) {
			existing.keluar += qty;
		}

		existing.stok = existing.masuk - existing.keluar;
		existing.sisaBaik = existing.stok > 0 ? existing.stok : 0;
		consumableMap.set(key, existing);
	});

	stockRows.forEach((s) => {
		if (!s.itemId) return;
		const key = s.itemId;
		if (consumableMap.has(key)) return;

		const qty = Number(s.qty);
		if (qty <= 0) return;

		consumableMap.set(key, {
			id: `c-${s.itemId}`,
			itemId: s.itemId,
			matkomplek: '-',
			namaBarang: s.itemName,
			tipe: 'CONSUMABLE' as const,
			stok: qty,
			masuk: qty,
			keluar: 0,
			sisaBaik: qty,
			sisaRR: 0,
			sisaRB: 0,
			kondisi: 'BAIK',
			keterangan: 'Stok awal (tanpa riwayat mutasi)',
			tahun: new Date(s.itemCreatedAt).getFullYear(),
			equipmentType: null,
			baseUnit: s.itemBaseUnit
		});
	});

	// ─── 5. Gabung asset + consumable ──────────────────────────────────────────
	const allItems: KomunityItem[] = [...assets, ...Array.from(consumableMap.values())];

	// ─── 6. Apply Filters ──────────────────────────────────────────────────────
	const filteredItems = allItems.filter((it) => {
		if (searchQuery) {
			const nameMatch = it.namaBarang.toLowerCase().includes(searchQuery.toLowerCase());
			const snMatch = it.matkomplek?.toLowerCase().includes(searchQuery.toLowerCase());
			if (!nameMatch && !snMatch) return false;
		}

		if (typeFilter && it.tipe !== typeFilter) return false;

		if (categoryFilter) {
			if (it.tipe === 'CONSUMABLE') return false;
			if (it.equipmentType !== categoryFilter) return false;
		}

		return it.stok > 0 || it.masuk > 0 || it.keluar > 0;
	});

	// ─── 7. Pagination ─────────────────────────────────────────────────────────
	const { page = 1, limit = 25 } = args;
	const totalItems = filteredItems.length;
	const totalPages = Math.ceil(totalItems / limit);
	const offset = (page - 1) * limit;
	const paginatedItems = filteredItems.slice(offset, offset + limit);

	return {
		items: paginatedItems,
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
