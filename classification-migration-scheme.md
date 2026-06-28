# Instruksi Implementasi: Current-State Classification & Perbaikan Alur Balkir

> Dokumen ini ditulis untuk dieksekusi oleh CLI coding agent (mis. Claude Code) di atas
> codebase SvelteKit + Drizzle + MySQL yang sudah ada. Setiap bagian punya konteks **mengapa**,
> bukan cuma **apa**, supaya agent tidak salah arah saat field/edge case di kode aktual sedikit
> berbeda dari yang dijelaskan di sini.

## 0. Latar belakang masalah (baca dulu sebelum eksekusi)

Skema saat ini punya dua state machine yang **konsepnya tumpang tindih tapi disimpan terpisah**:

- `equipment.status` (`READY` / `IN_USE` / `TRANSIT` / `MAINTENANCE` / `DISPOSED`) — dipelihara
  dengan benar di setiap titik mutasi (lihat `routes/(app)/[org_slug]/alat/[type]/mutate/[id]/+page.server.ts`),
  selalu mencerminkan kondisi terkini. **Pola pemeliharaan ini sudah benar — jadikan acuan.**
- `movement.classification` (`BALKIR` / `TRANSITO` / `KOMUNITY`) — **hanya histori event**, TIDAK ADA
  kolom "classification saat ini" di `equipment`. Akibatnya halaman `/stok/balkir`, `/stok/transito`,
  `/stok/komunity` melakukan `WHERE movement.classification = 'X'` atas SELURUH histori, sehingga
  satu equipment yang sudah pindah classification tetap muncul di daftar gudang lama (bug existing,
  bukan sesuatu yang baru diperkenalkan oleh instruksi ini — instruksi ini MEMPERBAIKI itu).

Tujuan dokumen ini: tambahkan `equipment.classification` sebagai **current state**, dipelihara
identik dengan pola `status`/`warehouseId`, lalu perbaiki seluruh titik baca (`/stok/*`, dashboard
kepala gudang) untuk pakai kolom baru ini, bukan histori `movement`.

**Prinsip migrasi**: additive, nullable, ada backfill terhitung, TIDAK menghapus/mengubah satu pun
row `movement` yang sudah ada. Risiko terhadap data lama harus minimal.

---

## 1. Migrasi skema: tambah `equipment.classification`

### 1.1 Edit `src/lib/server/db/schema.ts`

Cari definisi tabel `equipment` (sekitar baris 145-169). Tambahkan kolom `classification` yang
reuse enum yang sudah ada di `movementClassificationEnum`. **Pastikan field ini didefinisikan
SETELAH `movementClassificationEnum` dideklarasikan** (saat ini enum itu dideklarasikan di bawah
tabel `equipment`, jadi perlu dipindah ke atas, ATAU buat enum baru senama untuk equipment, ATAU
pindahkan deklarasi `movementClassificationEnum` ke atas tabel `equipment`). Cara paling aman:
pindahkan blok `movementClassificationEnum` ke atas, sebelum `export const equipment = ...`.

```ts
// Pindahkan ke atas, sebelum tabel equipment:
export const movementClassificationEnum = mysqlEnum('movement_classification', [
	'BALKIR',
	'KOMUNITY',
	'TRANSITO'
]);

export const equipment = mysqlTable(
	'equipment',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		serialNumber: varchar('serial_number', { length: 100 }).unique(),
		brand: varchar('brand', { length: 100 }),
		warehouseId: varchar('warehouse_id', { length: 36 }).references(() => warehouse.id),
		organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id),
		itemId: varchar('item_id', { length: 36 })
			.notNull()
			.references(() => item.id),
		condition: mysqlEnum('condition', ['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT', 'RUSAK_TOTAL'])
			.default('BAIK')
			.notNull(),
		status: mysqlEnum('status', ['READY', 'IN_USE', 'TRANSIT', 'MAINTENANCE', 'DISPOSED']).default(
			'READY'
		),
		// BARU: current classification gudang fisik (BALKIR/TRANSITO/KOMUNITY).
		// Nullable karena ribuan equipment lama belum tentu punya movement classification —
		// backfill akan mengisi sebanyak mungkin, sisanya tetap NULL (artinya "belum diklasifikasi").
		classification: mysqlEnum('classification', ['BALKIR', 'KOMUNITY', 'TRANSITO']),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('equipment_condition_idx').on(table.condition),
		index('equipment_item_id_idx').on(table.itemId),
		// BARU: dashboard kepala gudang akan sering query by (organizationId, classification)
		index('equipment_classification_idx').on(table.classification)
	]
);
```

Hapus deklarasi `movementClassificationEnum` yang lama di lokasi aslinya (sekitar baris 237-241)
karena sudah dipindah ke atas.

### 1.2 Generate & jalankan migrasi Drizzle

```bash
# Sesuaikan dengan script yang ada di package.json (biasanya salah satu ini):
npx drizzle-kit generate
npx drizzle-kit migrate
# atau jika pakai push-based workflow:
npx drizzle-kit push
```

Periksa file migrasi SQL yang dihasilkan — pastikan isinya HANYA:

```sql
ALTER TABLE `equipment` ADD COLUMN `classification` enum('BALKIR','KOMUNITY','TRANSITO');
CREATE INDEX `equipment_classification_idx` ON `equipment` (`classification`);
```

Tidak boleh ada `DROP`, `RENAME`, atau perubahan tipe kolom lain. Jika drizzle-kit menghasilkan
sesuatu di luar itu (misal karena urutan kolom berubah memicu rewrite tabel), **stop dan tulis ulang
migrasi SQL secara manual** dengan isi di atas saja.

### 1.3 Backfill data lama (script satu kali)

Buat file baru `src/lib/server/db/backfill-equipment-classification.ts`:

```ts
import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from './schema';
import * as authSchema from './auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

/**
 * Backfill equipment.classification dari movement terakhir per equipmentId.
 * Read-only terhadap tabel movement — hanya menulis ke equipment.classification.
 * Aman dijalankan berkali-kali (idempotent) karena selalu ambil movement TERBARU.
 */
async function main() {
	console.log('🔄 Backfill equipment.classification dari histori movement...');

	// Ambil classification movement terakhir per equipmentId menggunakan window function.
	// MySQL 8+ support ROW_NUMBER(), pastikan versi DB mendukung (cek dengan `SELECT VERSION();`).
	const result = await db.execute(sql`
		UPDATE equipment e
		INNER JOIN (
			SELECT m.equipment_id, m.classification,
			       ROW_NUMBER() OVER (PARTITION BY m.equipment_id ORDER BY m.created_at DESC) AS rn
			FROM movement m
			WHERE m.equipment_id IS NOT NULL AND m.classification IS NOT NULL
		) latest ON latest.equipment_id = e.id AND latest.rn = 1
		SET e.classification = latest.classification
		WHERE e.classification IS NULL
	`);

	console.log('✅ Backfill selesai.', result);

	// Laporkan berapa equipment yang TIDAK terbackfill (tidak punya movement classification sama sekali)
	const [unbackfilled] = await db.execute(sql`
		SELECT COUNT(*) as count FROM equipment WHERE classification IS NULL
	`);
	console.log('⚠️  Equipment tanpa classification setelah backfill:', unbackfilled);

	process.exit(0);
}

main().catch((err) => {
	console.error('❌ Backfill gagal:', err);
	process.exit(1);
});
```

Jalankan dengan dry-run dulu di environment staging/copy database sebelum produksi:

```bash
npx tsx src/lib/server/db/backfill-equipment-classification.ts
```

Setelah backfill, **laporkan ke pengguna** berapa banyak equipment yang `classification IS NULL`
(berarti alat yang sejak awal tidak punya movement bertipe classification — biasanya equipment yang
diinput manual lewat halaman create tanpa lewat mutasi). Ini perlu diputuskan satu per satu nanti
(apakah default ke KOMUNITY, atau dibiarkan NULL dan ditandai "Belum Diklasifikasi" di UI) — JANGAN
tebak sendiri, tanyakan ke pengguna sebelum mengisi nilai default secara massal.

---

## 2. Pemeliharaan `equipment.classification` di setiap titik mutasi

Kolom baru ini HARUS di-update di SETIAP tempat yang sudah meng-update `equipment.status` —
mengikuti pola yang sudah benar di kode existing. Cari semua lokasi berikut:

```bash
grep -rln "equipmentUpdate\|equipment).set(" src/routes --include="*.ts"
```

Lokasi yang sudah dikonfirmasi perlu diubah (cek juga lokasi lain hasil grep di atas):

### 2.1 `src/routes/(app)/[org_slug]/alat/[type]/mutate/[id]/+page.server.ts`

Form submit sudah membawa field `classification` (lihat baris ~168: `const classification =
formData.get('classification')`), dan sudah dipakai untuk insert ke `movement.classification`
(baris ~286). **Tambahkan classification ke `equipmentUpdate` juga**, supaya current-state equipment
ikut diupdate, bukan cuma histori movement:

```ts
switch (eventType) {
	case 'RECEIVE':
		fromWhId = null;
		toWhId = toWarehouseId;
		equipmentUpdate = {
			warehouseId: toWhId,
			status: status || 'READY',
			classification: classification || null // BARU
		};
		break;

	case 'ISSUE':
		fromWhId = currentEquipment.warehouseId;
		toWhId = null;
		equipmentUpdate = {
			warehouseId: null,
			status: status || 'READY',
			classification: classification || null // BARU
		};
		break;

	case 'TRANSFER_OUT':
		fromWhId = currentEquipment.warehouseId;
		toWhId = toWarehouseId;
		equipmentUpdate = {
			warehouseId: fromWhId,
			status: status || 'TRANSIT',
			classification: classification || null // BARU
		};
		break;

	case 'TRANSFER_IN':
		fromWhId = currentEquipment.warehouseId;
		toWhId = toWarehouseId;
		equipmentUpdate = {
			warehouseId: toWhId,
			status: status || 'READY',
			classification: classification || null, // BARU
			...(conditionAtArrival
				? { condition: conditionAtArrival as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' }
				: {})
		};
		break;

	default:
		fromWhId = currentEquipment.warehouseId;
		toWhId = toWarehouseId;
		if (status) equipmentUpdate.status = status;
		if (classification) equipmentUpdate.classification = classification; // BARU
}
```

**PENTING — jangan otomatis ubah `status` berdasarkan `classification`.** Sesuai kesepakatan,
classification (lokasi gudang fisik: Balkir/Transito/Komunity) independen dari status (lifecycle:
Ready/InUse/Transit/Maintenance/Disposed). Pindah ke Balkir TIDAK mengubah status secara otomatis.

### 2.2 `src/routes/(app)/[org_slug]/alat/batch-mutate/+page.server.ts`

Cek apakah file ini juga melakukan insert ke `movement` dengan `classification` dan update
`equipment`. Jika ya, terapkan perubahan yang sama (tambahkan `classification` ke object update
equipment). Baca file ini dulu sebelum mengubah — strukturnya mungkin berbeda dari mutate/[id]
karena ini batch operation.

### 2.3 `src/routes/(app)/[org_slug]/alat/[type]/create/+page.server.ts`

Saat alat baru dibuat, jika form punya field classification awal, set `equipment.classification`
saat insert (bukan hanya di movement, jika movement RECEIVE dibuat bersamaan). Baca file ini dulu
untuk konfirmasi field apa saja yang ada di form create saat ini.

### 2.4 `src/routes/(app)/[org_slug]/peminjaman/[id]/+page.server.ts` dan `konfirmasi-kembali/+page.server.ts`

Proses lending mengubah `equipment.status` (kemungkinan ke `IN_USE` saat dipinjam, balik ke
sebelumnya saat kembali). **Lending TIDAK mengubah classification** — alat yang dipinjam tetap
tercatat sebagai milik gudang Komunity asalnya (lending adalah event terpisah dari classification
gudang). Pastikan kode di sini TIDAK menyentuh kolom `classification` sama sekali — biarkan apa
adanya. Ini hanya untuk verifikasi, kemungkinan tidak perlu diubah.

### 2.5 Jangan lupa: distribution

`src/lib/server/distribution.ts` — periksa apakah proses distribusi (pusat → satuan anak) mengubah
`movement.classification`. Jika distribusi adalah event yang juga harus mengubah classification
equipment (misal: barang yang didistribusikan dari Transito Pusat ke satuan anak, begitu diterima
statusnya jadi Komunity di organisasi penerima), tambahkan update `equipment.classification` di
titik penerimaan distribusi juga. **Konfirmasi dulu ke pengguna apakah penerimaan distribusi
otomatis mengubah classification penerima, atau itu langkah manual terpisah** — jangan diasumsikan.

---

## 3. Perbaikan logika Balkir (dibalik dari versi sebelumnya)

Implementasi dashboard kepala gudang sebelumnya SALAH ARAH — mengasumsikan Balkir = stok siap
pakai (`condition === 'BAIK'`). Yang benar: **Balkir = alat rusak (`RUSAK_RINGAN`/`RUSAK_BERAT`)
yang masih berstatus aktif, ditempatkan secara administratif menunggu keputusan: diperbaiki &
dikembalikan ke sirkulasi, ATAU dikonfirmasi `RUSAK_TOTAL` dan diajukan untuk dihapuskan.**

Balik logika berikut di `src/routes/(app)/[org_slug]/dashboard/+page.server.ts`, blok
`if (headType === 'BALKIR' || headType === 'ALL')`:

```ts
// SALAH (versi sebelumnya) — JANGAN PAKAI:
// const [ready] = ... eq(equipment.condition, 'BAIK') ...

// BENAR — Balkir menampilkan alat rusak yang ditempatkan di sana, dipecah per tingkat keparahan:
const [rusakRingan] = await db
	.select({ count: count() })
	.from(equipment)
	.where(
		and(
			eq(equipment.organizationId, orgId),
			eq(equipment.classification, 'BALKIR'), // pakai kolom baru, bukan status
			eq(equipment.condition, 'RUSAK_RINGAN')
		)
	);

const [rusakBerat] = await db
	.select({ count: count() })
	.from(equipment)
	.where(
		and(
			eq(equipment.organizationId, orgId),
			eq(equipment.classification, 'BALKIR'),
			eq(equipment.condition, 'RUSAK_BERAT')
		)
	);

// Kandidat penghapusan: sudah RUSAK_TOTAL tapi BELUM DISPOSED (masih menunggu keputusan administratif)
const [kandidatPenghapusan] = await db
	.select({ count: count() })
	.from(equipment)
	.where(
		and(
			eq(equipment.organizationId, orgId),
			eq(equipment.classification, 'BALKIR'),
			eq(equipment.condition, 'RUSAK_TOTAL'),
			ne(equipment.status, 'DISPOSED')
		)
	);

// Sudah selesai dihapuskan (untuk konteks historis, opsional ditampilkan)
const [sudahDihapuskan] = await db
	.select({ count: count() })
	.from(equipment)
	.where(
		and(
			eq(equipment.organizationId, orgId),
			eq(equipment.classification, 'BALKIR'),
			eq(equipment.status, 'DISPOSED')
		)
	);

balkir = {
	rusakRingan: Number(rusakRingan?.count) || 0,
	rusakBerat: Number(rusakBerat?.count) || 0,
	kandidatPenghapusan: Number(kandidatPenghapusan?.count) || 0,
	sudahDihapuskan: Number(sudahDihapuskan?.count) || 0
};
```

Hapus field `ready` dan `perluPerawatan` dari shape `balkir` yang lama (sudah tidak relevan dengan
definisi Balkir yang benar — "ready/siap pakai" bukan konsep yang berlaku di Balkir). Field
`perluPerawatan` (maintenance pending) sebenarnya **tidak unik untuk Balkir** — alat yang sedang
diperbaiki bisa saja statusnya `MAINTENANCE` di classification mana pun (Transito/Komunity/Balkir).
Jika pengguna masih ingin info maintenance pending muncul di dashboard Balkir, itu query terpisah
yang TIDAK terikat `classification = 'BALKIR'`, melainkan terikat `equipment.status = 'MAINTENANCE'`
— filter berbeda yang harus jelas dipisah, jangan dicampur dengan query kandidat penghapusan di atas.

**Konfirmasi ke pengguna sebelum eksekusi**: apakah field `perluPerawatan` masih ingin ditampilkan
di panel Balkir dengan filter yang benar (`status = 'MAINTENANCE'`, tidak peduli classification),
atau dihapus saja dari panel ini karena maintenance sudah punya panel sendiri di kolom kanan
dashboard ("Pemeliharaan").

Update juga komponen `src/lib/components/DashboardKepalaGudang.svelte` — bagian render panel Balkir
(blok `{#if data.balkir}`) — sesuaikan kartu yang ditampilkan dengan shape baru (`rusakRingan`,
`rusakBerat`, `kandidatPenghapusan`, `sudahDihapuskan`), bukan `ready`/`perluPerawatan` yang lama.

---

## 4. Hapus auto-DISPOSED dari halaman edit

Di `src/routes/(app)/[org_slug]/alat/[type]/edit/[id]/+page.server.ts`, baris ~80:

```ts
// HAPUS baris ini:
const finalStatus = condition === 'RUSAK_TOTAL' ? 'DISPOSED' : status;

// GANTI dengan:
const finalStatus = status;
```

Dan di baris ~156-157, pastikan `status: (finalStatus as ...)` tetap memakai nilai dari form apa
adanya, tidak ada lagi pemaksaan ke `DISPOSED`. `DISPOSED` sekarang HANYA bisa diset jika pengguna
memilih status itu secara eksplisit dari dropdown form (sudah ada opsinya di
`create/+page.svelte` baris ~212 — pastikan opsi `DISPOSED` juga tersedia di form edit yang sama,
cek `equipmentSchema` terkait).

Setelah perubahan ini, `RUSAK_TOTAL` murni jadi label kondisi fisik yang akan ditampilkan sebagai
badge "Kandidat Penghapusan" di dashboard Balkir (lihat bagian 3) — keputusan `DISPOSED` tetap
aksi manual terpisah yang dilakukan operator/kepala gudang setelah ada proses administratif
(BAP, persetujuan, dll — di luar scope teknis dokumen ini).

---

## 5. Perbaikan query `/stok/balkir`, `/stok/transito`, `/stok/komunity`

Ketiga file `*.remote.ts` di `src/routes/(app)/[org_slug]/stok/{balkir,transito,komunity}/` saat
ini query `movement.classification = 'X'` atas SELURUH histori (bug — equipment yang sudah pindah
classification tetap muncul di gudang lama). Ganti basis query dari `movement` ke `equipment`:

Untuk `balkir.remote.ts` (terapkan pola serupa untuk transito & komunity, ganti `'BALKIR'` sesuai
konteks file):

```ts
// SEBELUM (query ke movement, basis histori — SALAH):
const assetMovements = await db.query.movement.findMany({
	where: and(
		eq(movement.classification, 'BALKIR'),
		eq(movement.organizationId, selectedOrgId),
		isNotNull(movement.equipmentId)
	)
	// ...
});

// SESUDAH (query ke equipment, basis current-state — BENAR):
const assetEquipments = await db.query.equipment.findMany({
	where: and(eq(equipment.classification, 'BALKIR'), eq(equipment.organizationId, selectedOrgId)),
	with: {
		item: true,
		warehouse: true
	}
});
```

Sesuaikan seluruh mapping di bawahnya (`mappedAssets`, dst.) karena shape data dari `equipment`
berbeda dari `movement` (tidak ada lagi `m.equipment!.id`, langsung `eq.id`; tidak ada lagi
`m.createdAt` untuk "tanggal masuk", gunakan `eq.updatedAt` atau ambil dari movement TERAKHIR
sebagai informasi tambahan jika kolom "tanggal masuk gudang ini" perlu ditampilkan — JANGAN
campur balik ke query lama, cukup JOIN ke movement terakhir secara terpisah jika dibutuhkan tanggal
spesifik).

Konsumsi yang basisnya `stock`/`item` consumable (bukan equipment per-unit) **TIDAK bisa** dipindah
ke pola yang sama karena consumable tidak punya identitas unit individual (tidak ada baris
`equipment` per consumable). Untuk consumable, classification HARUS tetap berbasis histori
`movement` seperti sekarang, KARENA tidak ada tempat lain untuk menyimpan current-state consumable
per classification (tidak ada kolom `stock.classification`). **Ini adalah keterbatasan yang perlu
didiskusikan terpisah** — kemungkinan butuh tabel `stock` dipecah per classification, atau kolom
baru `stock.classification` + perubahan unique index dari `(itemId, warehouseId)` jadi
`(itemId, warehouseId, classification)`. JANGAN ubah ini tanpa konfirmasi eksplisit dari pengguna,
karena ini migrasi yang menyentuh constraint unik dan berdampak pada perhitungan stok consumable
yang sudah berjalan.

---

## 6. Dashboard kepala gudang — perbaiki basis filter

Di `src/routes/(app)/[org_slug]/dashboard/+page.server.ts`, blok `isKepalaGudang`, ganti SEMUA
filter yang sebelumnya pakai `equipment.status` (READY/TRANSIT/IN_USE) sebagai proxy classification
menjadi filter langsung `equipment.classification`:

```ts
// SEBELUM (salah — status bukan classification):
const statusByHeadType: Record<string, ('READY' | 'TRANSIT' | 'IN_USE')[]> = {
	BALKIR: ['READY'],
	TRANSITO: ['TRANSIT'],
	KOMUNITY: ['IN_USE'],
	ALL: ['READY', 'TRANSIT', 'IN_USE']
};
const relevantStatuses = statusByHeadType[headType];
// ... eq(equipment.status, relevantStatus) di semua query

// SESUDAH (benar — pakai classification langsung):
const relevantClassifications: ('BALKIR' | 'TRANSITO' | 'KOMUNITY')[] =
	headType === 'ALL' ? ['BALKIR', 'TRANSITO', 'KOMUNITY'] : [headType];

// Ganti semua eq(equipment.status, relevantStatus) menjadi:
inArray(equipment.classification, relevantClassifications);
```

Terapkan penggantian ini di SEMUA query dalam blok tersebut: `totalAlat`, `siapPakai`, `rusak`,
panel Transito/Balkir/Komunity (sesuaikan dengan perbaikan logika Balkir di bagian 3),
`pemeliharaanResults`, `alatPerluPerhatianResults`. Untuk `siapPakai`, definisikan ulang artinya
dalam konteks classification (bukan status) — kemungkinan "siap pakai" = `classification IN
(TRANSITO, KOMUNITY) AND condition = 'BAIK' AND status != 'DISPOSED'`, BUKAN termasuk Balkir karena
Balkir secara definisi isinya alat yang tidak baik. **Konfirmasi definisi "siap pakai" ini ke
pengguna sebelum diimplementasikan** — jangan tebak sendiri arti istilah bisnisnya.

---

## 7. Agregasi lintas-classification per item (kebutuhan "Radio: 10 Baik, 2 Balkir, 4 Transito")

Buat fungsi/query baru (lokasi disarankan: `src/lib/server/inventory-summary.ts`, file baru) yang
menghitung breakdown per item per classification dalam satu organisasi:

```ts
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
```

**Catatan penting**: contoh "Radio 10 Baik, 2 Balkir, 4 Transito" dari pengguna mencampur dua dimensi
berbeda (condition "Baik" vs classification "Balkir"/"Transito") dalam satu baris — ini sah secara
bisnis (satu radio bisa "Baik" sekaligus berlokasi di Transito), TAPI representasi tabelnya perlu
diperjelas ke pengguna: apakah "Baik" di sana berarti "Baik DAN sedang di Komunity" (artinya kolom
"Baik" implisit hanya menghitung yang TIDAK di Balkir/Transito), atau "Baik" itu total terpisah dari
breakdown lokasi. **Tunjukkan dulu mockup tabel dengan data contoh ke pengguna sebelum mengimplementasi
tampilan akhirnya** — jangan asumsikan satu interpretasi.

Lingkup organisasi untuk agregasi ini: tunggu keputusan eksplisit dari pengguna soal scope (per
organisasi tunggal, atau gabungan organisasi+anak) — JANGAN diasumsikan otomatis menggabungkan
seluruh hierarki organisasi tanpa konfirmasi, karena `equipment.organizationId` adalah kepemilikan
tetap satu level (sesuai diskusi: alat dimiliki satuan anak langsung dari pusat, bukan berjenjang).

---

## 8. Breakdown peminjaman per satuan ("10 Kodim A, 11 Kodim B") — TIDAK perlu migrasi

Buat query baru (bisa di file yang sama dengan bagian 7, atau file terpisah
`src/lib/server/lending-summary.ts`):

```ts
import { db } from '$lib/server/db';
import { lending, lendingItem, equipment, item } from '$lib/server/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

export async function getLendingBreakdownByItem(orgId: string, itemId: string) {
	return db
		.select({
			unit: lending.unit,
			count: sql<number>`count(*)`.as('count')
		})
		.from(lendingItem)
		.innerJoin(lending, eq(lendingItem.lendingId, lending.id))
		.innerJoin(equipment, eq(lendingItem.equipmentId, equipment.id))
		.where(
			and(
				eq(equipment.itemId, itemId),
				eq(lending.organizationId, orgId),
				inArray(lending.status, ['DIPINJAM', 'PERINTAH_LANGSUNG'])
			)
		)
		.groupBy(lending.unit);
}
```

**Peringatan yang harus disampaikan ke pengguna, bukan langsung diperbaiki di sini**: `lending.unit`
adalah teks bebas (varchar), rawan fragmentasi nama (mis. "Kodim 0735" vs "KODIM 0735 Surakarta"
dianggap dua grup berbeda walau merujuk satuan yang sama). Query di atas akan menghasilkan grouping
yang HANYA SEAKURAT konsistensi input historis. **Jangan mencoba menormalisasi nama secara otomatis
(misal uppercase/trim) tanpa izin** — itu mengubah makna data historis, dan harus dikonfirmasi
sebagai keputusan terpisah (idealnya jangka panjang menuju dropdown/autocomplete saat input lending
baru, bukan diubah retroaktif pada data lama).

---

## 9. Urutan eksekusi yang disarankan (untuk menghindari downtime/state tidak konsisten)

1. Jalankan migrasi skema (bagian 1.1-1.2) di environment staging dulu.
2. Jalankan backfill (bagian 1.3) di staging, cek hasil log (berapa equipment ter-backfill, berapa
   NULL). Laporkan ke pengguna sebelum lanjut ke produksi.
3. Deploy perubahan kode pemeliharaan classification (bagian 2) BERSAMAAN dengan migrasi —
   jangan deploy migrasi dulu tanpa kode penulisnya, supaya tidak ada window waktu di mana data baru
   masuk tanpa classification ter-update.
4. Setelah deploy ke produksi, jalankan migrasi + backfill produksi (idealnya saat traffic rendah).
5. Baru kemudian deploy perbaikan titik baca (bagian 3, 5, 6) yang mengandalkan
   `equipment.classification` — supaya saat fitur baca baru aktif, datanya sudah lengkap.
6. Bagian 4 (hapus auto-DISPOSED) dan bagian 7-8 (agregasi baru) bisa menyusul kapan saja setelah
   langkah 1-5 stabil, tidak punya dependency migrasi.

---

## 10. Yang TIDAK boleh dilakukan tanpa konfirmasi eksplisit tambahan

- Jangan mengisi default `classification` untuk equipment yang `NULL` setelah backfill (bagian 1.3)
  tanpa bertanya dulu nilai default apa yang masuk akal.
- Jangan menyentuh struktur `stock`/consumable classification (bagian 5, paragraf terakhir) tanpa
  diskusi terpisah — itu migrasi yang berbeda kelas risikonya (mengubah unique constraint).
- Jangan menormalisasi/mengubah nilai `lending.unit` yang sudah ada di database (bagian 8).
- Jangan mengasumsikan scope organisasi untuk agregasi (bagian 7) — single org vs gabungan
  hierarki — tanpa jawaban eksplisit.
- Jangan membuat `RUSAK_TOTAL` memicu apa pun otomatis di status (bagian 4) — keputusan
  administratif penghapusan harus tetap manual.
