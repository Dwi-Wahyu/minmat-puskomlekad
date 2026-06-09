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

// Event types yang dihitung sebagai MASUK
const INCOMING_EVENTS = ['RECEIVE', 'ADJUSTMENT', 'DISTRIBUTE_IN', 'TRANSFER_IN'] as const;

// Event types yang dihitung sebagai KELUAR
const OUTGOING_EVENTS = ['ISSUE', 'DISTRIBUTE_OUT', 'TRANSFER_OUT'] as const;

export const getKomunityData = query(komunitySchema, async (args): Promise<KomunityData> => {
	const { user } = requireAuth();
	const userOrg = user.organization;

	const isMabes = userOrg.parentId === null;
	const selectedOrgId = args.orgId || userOrg.id;

	const { search: searchQuery, type: typeFilter, category: categoryFilter } = args;

	// Fetch all organizations if user is Mabes
	const orgs = isMabes
		? await db
				.select({ id: organization.id, name: organization.name, slug: organization.slug })
				.from(organization)
		: [];

	// ─── 1. ASSET: Equipment dengan movement KOMUNITY ────────────────────────────

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

	const assets: KomunityItem[] = equipmentList
		// Hanya tampilkan equipment yang pernah punya movement KOMUNITY
		.filter((equip) => equip.movements.length > 0)
		.map((equip) => {
			let totalMasuk = 0;
			let totalKeluar = 0;

			equip.movements.forEach((m) => {
				const qty = Number(m.qty);
				if (INCOMING_EVENTS.includes(m.eventType as any)) {
					totalMasuk += qty;
				} else if (OUTGOING_EVENTS.includes(m.eventType as any)) {
					totalKeluar += qty;
				}
			});

			const stok = totalMasuk - totalKeluar;
			const sisaBaik = equip.condition === 'BAIK' ? stok : 0;
			const sisaRR = equip.condition === 'RUSAK_RINGAN' ? stok : 0;
			const sisaRB = equip.condition === 'RUSAK_BERAT' ? stok : 0;

			return {
				id: equip.id,
				itemId: equip.itemId,
				matkomplek: equip.serialNumber ?? '-',
				namaBarang: equip.item.name,
				tipe: 'ASSET' as const,
				stok,
				masuk: totalMasuk,
				keluar: totalKeluar,
				sisaBaik,
				sisaRR,
				sisaRB,
				kondisi: equip.condition,
				keterangan: '-',
				tahun: new Date(equip.createdAt).getFullYear(),
				equipmentType: equip.item.equipmentType ?? null,
				baseUnit: equip.item.baseUnit
			};
		});

	// ─── 2. CONSUMABLE: Via tabel movement ───────────────────────────────────────
	// Gunakan explicit join ke item dan filter item.type = 'CONSUMABLE'
	// isNull(movement.equipmentId) memastikan ini bukan movement asset

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
				eq(item.type, 'CONSUMABLE'), // filter yang benar: hanya CONSUMABLE
				isNull(movement.equipmentId) // pastikan bukan movement asset
			)
		);

	// ─── 3. CONSUMABLE: Fallback via tabel stock ─────────────────────────────────
	// Untuk consumable yang stoknya diisi langsung tanpa movement (seed/import),
	// ambil dari tabel stock yang warehousenya milik org ini.
	// Hasilnya digabung dengan data movement agar tidak double-count.

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

	// ─── 4. Gabungkan movement consumable + stock fallback ───────────────────────

	// Pertama, build dari movement
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

	// Tambahkan consumable dari stock yang tidak punya movement sama sekali
	stockRows.forEach((s) => {
		if (!s.itemId) return;
		const key = s.itemId;
		if (consumableMap.has(key)) return; // sudah ada dari movement, skip

		const qty = Number(s.qty);
		if (qty <= 0) return; // skip stok kosong

		consumableMap.set(key, {
			id: `c-${s.itemId}`,
			itemId: s.itemId,
			matkomplek: '-',
			namaBarang: s.itemName,
			tipe: 'CONSUMABLE' as const,
			stok: qty,
			masuk: qty, // dianggap masuk dari sumber stok awal
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

	// ─── 5. Gabung asset + consumable ────────────────────────────────────────────

	const allItems: KomunityItem[] = [...assets, ...Array.from(consumableMap.values())];

	// ─── 6. Apply Filters ─────────────────────────────────────────────────────────

	const filteredItems = allItems.filter((it) => {
		// Filter pencarian nama atau matkomplek/SN
		if (searchQuery) {
			const nameMatch = it.namaBarang.toLowerCase().includes(searchQuery.toLowerCase());
			const snMatch = it.matkomplek?.toLowerCase().includes(searchQuery.toLowerCase());
			if (!nameMatch && !snMatch) return false;
		}

		// Filter jenis: ASSET atau CONSUMABLE
		if (typeFilter && it.tipe !== typeFilter) return false;

		// Filter kategori alat (hanya berlaku untuk ASSET)
		if (categoryFilter) {
			if (it.tipe === 'CONSUMABLE') return false; // consumable tidak punya equipmentType
			if (it.equipmentType !== categoryFilter) return false;
		}

		// Tampilkan hanya item yang punya aktivitas (stok > 0 atau ada pergerakan)
		return it.stok > 0 || it.masuk > 0 || it.keluar > 0;
	});

	// ─── 7. Pagination ────────────────────────────────────────────────────────────

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
