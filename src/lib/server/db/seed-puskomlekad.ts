import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from './schema';
import * as authSchema from './auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

// ─── Konfigurasi ──────────────────────────────────────────────────────────────
const CSV_DIR = path.resolve(__dirname, './csv');
const BATCH_SIZE = 100;
const ORG_NAME = 'PUSKOMLEKAD';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readCsv<T = Record<string, string>>(filename: string): T[] {
	const filePath = path.join(CSV_DIR, filename);
	if (!fs.existsSync(filePath)) {
		throw new Error(`CSV tidak ditemukan: ${filePath}`);
	}
	const content = fs.readFileSync(filePath, 'utf-8');
	return parse(content, { columns: true, skip_empty_lines: true, trim: true }) as T[];
}

async function batchInsert<T extends object>(
	label: string,
	rows: T[],
	inserter: (batch: T[]) => Promise<unknown>
) {
	if (rows.length === 0) {
		console.log(`  ⚠️  ${label}: tidak ada data, dilewati.`);
		return;
	}
	let inserted = 0;
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batch = rows.slice(i, i + BATCH_SIZE);
		await inserter(batch);
		inserted += batch.length;
		process.stdout.write(`\r  ✦ ${label}: ${inserted}/${rows.length}`);
	}
	console.log(`\r  ✅ ${label}: ${inserted} baris berhasil diinsert`);
}

// ─── Tipe CSV ─────────────────────────────────────────────────────────────────
interface ItemRow {
	id: string;
	name: string;
	type: 'ASSET' | 'CONSUMABLE';
	baseUnit: string;
	description: string;
	equipmentType: string;
	createdAt: string;
}

interface EquipmentRow {
	id: string;
	itemId: string;
	serialNumber: string;
	brand: string;
	condition: string;
	status: string;
	createdAt: string;
}

interface StockRow {
	id: string;
	itemId: string;
	qty: string;
	unit: string;
}

interface MovementRow {
	id: string;
	itemId: string;
	equipmentId: string;
	eventType: string;
	qty: string;
	unit: string;
	classification: string;
	notes: string;
	createdAt: string;
}

// ─── Seeders ──────────────────────────────────────────────────────────────────

/**
 * Import Items (katalog barang PUSKOMLEKAD).
 *
 * Logika skip duplikat:
 * - Cek apakah item dengan nama persis sama sudah ada di DB.
 * - Jika sudah ada → skip (tidak insert ulang).
 * - Jika belum ada → insert baru.
 *
 * Ini penting karena beberapa item PUSKOMLEKAD mungkin sudah di-seed
 * dari satuan lain (AKMIL, dll) dengan nama yang identik.
 */
async function seedItems() {
	console.log('\n📦 Step 1: Import Items (Katalog Barang)...');
	const rows = readCsv<ItemRow>('puskomlekad/items.csv');

	// Ambil semua nama item yang sudah ada di DB (satu query)
	const existingItems = await db.query.item.findMany({
		columns: { name: true }
	});
	const existingNames = new Set(existingItems.map((i) => i.name));

	const validUnits = new Set([
		'PCS',
		'BOX',
		'METER',
		'LOT',
		'BUAH',
		'ROLL',
		'UNIT',
		'SET',
		'PAKET',
		'CABINET'
	]);

	const toInsert = rows
		.filter((r) => {
			const name = r.name.trim();
			if (existingNames.has(name)) {
				return false; // skip nama persis sama
			}
			return true;
		})
		.map((r) => ({
			id: r.id,
			name: r.name.trim(),
			type: r.type as 'ASSET' | 'CONSUMABLE',
			baseUnit: (validUnits.has(r.baseUnit) ? r.baseUnit : 'UNIT') as
				| 'PCS'
				| 'BOX'
				| 'METER'
				| 'LOT'
				| 'BUAH'
				| 'ROLL'
				| 'UNIT'
				| 'SET'
				| 'PAKET'
				| 'CABINET',
			equipmentType:
				r.equipmentType === 'ALKOMLEK' || r.equipmentType === 'PERNIKA_LEK'
					? (r.equipmentType as 'ALKOMLEK' | 'PERNIKA_LEK')
					: null,
			description: r.description || null,
			imagePath: null,
			createdAt: new Date(r.createdAt)
		}));

	const skippedCount = rows.length - toInsert.length;
	console.log(
		`  📊 Total CSV: ${rows.length} | Akan diinsert: ${toInsert.length} | Skip (duplikat): ${skippedCount}`
	);

	await batchInsert('items', toInsert, (batch) =>
		db
			.insert(schema.item)
			.values(batch)
			.onDuplicateKeyUpdate({ set: { id: sql`id` } })
	);

	// Kembalikan map name→id untuk dipakai step berikutnya
	// (termasuk yang sudah ada di DB, agar equipment/stock tetap bisa di-link)
	const allItems = await db.query.item.findMany({
		columns: { id: true, name: true }
	});
	return new Map(allItems.map((i) => [i.name, i.id]));
}

async function seedEquipment(
	orgId: string,
	warehouseId: string,
	itemNameToId: Map<string, string>
) {
	console.log('\n🔧 Step 2: Import Equipment (Unit Fisik ASSET)...');
	const rows = readCsv<EquipmentRow>('puskomlekad/equipment.csv');

	// Baca items.csv untuk mendapatkan nama per itemId CSV
	const itemsCsv = readCsv<ItemRow>('puskomlekad/items.csv');
	const csvIdToName = new Map(itemsCsv.map((r) => [r.id, r.name.trim()]));

	const mapped = rows.map((r) => {
		// Resolve itemId: gunakan ID dari DB (yang mungkin berbeda jika item sudah ada)
		const itemName = csvIdToName.get(r.itemId);
		const resolvedItemId = itemName ? (itemNameToId.get(itemName) ?? r.itemId) : r.itemId;

		return {
			id: r.id,
			itemId: resolvedItemId,
			serialNumber: r.serialNumber && r.serialNumber !== 'nan' ? r.serialNumber.trim() : null,
			brand: r.brand && r.brand !== 'nan' ? r.brand.trim() : null,
			condition: (r.condition as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT') ?? 'BAIK',
			status: (r.status as 'READY' | 'IN_USE' | 'TRANSIT' | 'MAINTENANCE') ?? 'READY',
			warehouseId: warehouseId,
			organizationId: orgId,
			createdAt: new Date(r.createdAt)
		};
	});

	console.log(`  📊 Total: ${mapped.length} unit`);

	await batchInsert('equipment', mapped, (batch) =>
		db
			.insert(schema.equipment)
			.values(batch)
			.onDuplicateKeyUpdate({ set: { id: sql`id` } })
	);
}

async function seedStock(warehouseId: string, itemNameToId: Map<string, string>) {
	console.log('\n📊 Step 3: Import Stock (Stok ASSET)...');
	const rows = readCsv<StockRow>('puskomlekad/stock.csv');

	const itemsCsv = readCsv<ItemRow>('puskomlekad/items.csv');
	const csvIdToName = new Map(itemsCsv.map((r) => [r.id, r.name.trim()]));

	const mapped = rows.map((r) => {
		const itemName = csvIdToName.get(r.itemId);
		const resolvedItemId = itemName ? (itemNameToId.get(itemName) ?? r.itemId) : r.itemId;

		return {
			id: r.id,
			itemId: resolvedItemId,
			warehouseId: warehouseId,
			qty: parseFloat(r.qty).toFixed(4)
		};
	});

	await batchInsert('stock', mapped, (batch) =>
		db
			.insert(schema.stock)
			.values(batch)
			.onDuplicateKeyUpdate({ set: { id: sql`id` } })
	);
}

async function seedMovements(
	orgId: string,
	warehouseId: string,
	itemNameToId: Map<string, string>
) {
	console.log('\n🚚 Step 4: Import Movement (Riwayat RECEIVE awal)...');
	const rows = readCsv<MovementRow>('puskomlekad/movement_receive.csv');

	const itemsCsv = readCsv<ItemRow>('puskomlekad/items.csv');
	const csvIdToName = new Map(itemsCsv.map((r) => [r.id, r.name.trim()]));

	const validEventTypes = new Set([
		'RECEIVE',
		'ISSUE',
		'ADJUSTMENT',
		'TRANSFER_OUT',
		'TRANSFER_IN',
		'LOAN_OUT',
		'LOAN_RETURN',
		'DISTRIBUTE_OUT',
		'DISTRIBUTE_IN',
		'MAINTENANCE_IN',
		'MAINTENANCE_OUT'
	]);
	const validClassifications = new Set(['BALKIR', 'KOMUNITY', 'TRANSITO']);

	const mapped = rows.map((r) => {
		const itemName = csvIdToName.get(r.itemId);
		const resolvedItemId = itemName ? (itemNameToId.get(itemName) ?? r.itemId) : r.itemId;

		return {
			id: r.id,
			itemId: resolvedItemId || null,
			equipmentId: r.equipmentId && r.equipmentId.trim() !== '' ? r.equipmentId : null,
			eventType: (validEventTypes.has(r.eventType) ? r.eventType : 'RECEIVE') as
				| 'RECEIVE'
				| 'ISSUE'
				| 'ADJUSTMENT'
				| 'TRANSFER_OUT'
				| 'TRANSFER_IN'
				| 'LOAN_OUT'
				| 'LOAN_RETURN'
				| 'DISTRIBUTE_OUT'
				| 'DISTRIBUTE_IN'
				| 'MAINTENANCE_IN'
				| 'MAINTENANCE_OUT',
			qty: parseFloat(r.qty).toFixed(4),
			unit: r.unit || null,
			classification: (validClassifications.has(r.classification)
				? r.classification
				: 'KOMUNITY') as 'BALKIR' | 'KOMUNITY' | 'TRANSITO',
			specificLocationName: `Gudang Utama ${ORG_NAME}`,
			fromWarehouseId: null,
			toWarehouseId: warehouseId,
			organizationId: orgId,
			notes: r.notes || null,
			picId: null,
			referenceType: null,
			referenceId: null,
			createdAt: new Date(r.createdAt)
		};
	});

	await batchInsert('movement', mapped, (batch) =>
		db
			.insert(schema.movement)
			.values(batch)
			.onDuplicateKeyUpdate({ set: { id: sql`id` } })
	);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
	console.log('════════════════════════════════════════════════════');
	console.log(`  🪖  SEEDING DATA ${ORG_NAME}`);
	console.log('════════════════════════════════════════════════════');
	console.log(`  Database : ${process.env.DATABASE_URL?.split('@')[1] ?? '(tersembunyi)'}`);
	console.log(`  CSV Dir  : ${CSV_DIR}`);
	console.log(`  Batch    : ${BATCH_SIZE} rows/insert`);

	// Validasi CSV tersedia
	const required = [
		'puskomlekad/items.csv',
		'puskomlekad/equipment.csv',
		'puskomlekad/stock.csv',
		'puskomlekad/movement_receive.csv'
	];
	for (const f of required) {
		if (!fs.existsSync(path.join(CSV_DIR, f))) {
			throw new Error(
				`File CSV tidak ditemukan: ${path.join(CSV_DIR, f)}\n` +
					`Jalankan terlebih dahulu: python3 convert_puskomlekad.py`
			);
		}
	}

	// Ambil org & warehouse yang sudah di-seed dari seeding utama
	const existingOrg = await db.query.organization.findFirst({
		where: (org, { eq }) => eq(org.name, ORG_NAME)
	});

	if (!existingOrg) {
		console.log(
			`  ⚠️  Organisasi ${ORG_NAME} belum ditemukan. Jalankan seeding utama terlebih dahulu.`
		);
		process.exit(1);
	}

	const existingWarehouse = await db.query.warehouse.findFirst({
		where: (warehouse, { eq }) => eq(warehouse.organizationId, existingOrg.id)
	});

	if (!existingWarehouse) {
		console.log(
			`  ⚠️  Gudang untuk ${ORG_NAME} belum ditemukan. Jalankan seeding utama terlebih dahulu.`
		);
		process.exit(1);
	}

	console.log(`\n  🏢 Organisasi : ${existingOrg.name} (${existingOrg.id})`);
	console.log(`  🏭 Gudang     : ${existingWarehouse.name} (${existingWarehouse.id})`);

	// Seed steps — itemNameToId diperlukan untuk resolve ID cross-step
	const itemNameToId = await seedItems();
	await seedEquipment(existingOrg.id, existingWarehouse.id, itemNameToId);
	await seedStock(existingWarehouse.id, itemNameToId);
	await seedMovements(existingOrg.id, existingWarehouse.id, itemNameToId);

	console.log('\n════════════════════════════════════════════════════');
	console.log('  ✅  Seeding selesai!');
	console.log('════════════════════════════════════════════════════\n');
	process.exit(0);
}

main().catch((err) => {
	console.error('\n❌ Seeding gagal:', err);
	process.exit(1);
});
