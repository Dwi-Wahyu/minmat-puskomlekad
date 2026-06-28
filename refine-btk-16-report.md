# Instruksi untuk CLI Agent (Copy dari sini ke bawah)

## Instruksi Implementasi: Migrasi Kategori Item & Laporan BTK-16 Dinamis

> **Konteks untuk Agent:**
> Anda akan melakukan perubahan skema database (Drizzle ORM) untuk mendukung hierarki kategori barang (Kategori Utama -> Sub Kategori -> Item), memperbarui validasi skema, dan merombak halaman Laporan BTK-16 agar memiliki tabel dinamis (View Grouping) berdasarkan tipe laporan (Triwulan, Nominatif, Bulanan) beserta fitur Export CSV yang _WYSIWYG (What You See Is What You Get)_.

### 1. Perubahan Skema Database (`src/lib/server/db/schema.ts`)

Kita perlu tabel `item_category` yang mendukung relasi _parent-child_ (hierarki) dan menyambungkannya ke tabel `item`.

- **1.1 Buat Tabel `itemCategory`:**

```typescript
export const itemCategory = mysqlTable('item_category', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar('name', { length: 255 }).notNull(),
    parentId: varchar('parent_id', { length: 36 }), // Null jika kategori level 1 (Utama)
    order: int('order').default(0), // Untuk sorting urutan laporan (A, B, C atau I, II, III)
    createdAt: timestamp('created_at').defaultNow().notNull()
});

```

- **1.2 Modifikasi Tabel `item`:**
- Tambahkan kolom: `categoryId: varchar('category_id', { length: 36 }).references(() => itemCategory.id)`

- **1.3 Update Relasi (Drizzle Relations):**
- Buat relasi `itemCategoryRelations`: punya `parent` (one), `children` (many), dan `items` (many).
- Tambahkan relasi `category` (one) ke dalam `itemRelations`.

- **1.4 Generate & Run Migration:** \* Instruksikan agent untuk menjalankan `bun run db:generate` dan `bun run db:push` setelah mengubah file schema.

### 2. Update Skema Validasi (`src/lib/schemas/item-schema.ts`)

- Tambahkan `categoryId: yup.string().nullable().default(null)` ke dalam `itemSchema`.

### 3. Perombakan API Laporan (`src/routes/(app)/[org_slug]/laporan/btk-16/btk-16.remote.ts`)

Ubah endpoint data untuk mendukung filter kompleks dan mengembalikan data yang sudah di-grup.

- **3.1 Update Parameter Query (Valibot):**
- Ubah skema argumen untuk menerima: `reportType: v.enum(['TRIWULAN', 'NOMINATIF', 'BULANAN'])`, `periodStr: v.string()` (format YYYY-MM atau YYYY-Q1), dan `categoryId: v.optional(v.string())`.

- **3.2 Struktur Data Kembalian (_Return Type_):**
- Sistem harus mengelompokkan data secara _nested_: `Array of Categories -> Array of SubCategories -> Array of Items/Equipments`.

- **3.3 Logika Query Berdasarkan `reportType`:**
- **Jika `NOMINATIF`:** Ambil _raw data_ dari tabel `equipment`. Join dengan `item`, `itemCategory`, dan `lending_item` + `lending` (untuk mencari status dipinjam oleh siapa). Keterangan diisi: Jika dipinjam, "Dipinjam oleh [lending.unit]", jika tidak, "Di gudang".
- **Jika `BULANAN`:** Agregasi jumlah alat per `item.id`. Gunakan fungsi `SUM()` bersyarat untuk menghitung Kondisi B, RR, RB. Keterangan diisi agregasi nama satuan peminjam.
- **Jika `TRIWULAN`:** Logika kompleks. Anda harus menghitung _stok historis_.
- Hitung `TW_LALU` dengan mengambil total equipment dikurangi mutasi (`movement`) yang terjadi di kuartal berjalan.
- Hitung `TAMBAH` (jumlah movement RECEIVE di kuartal berjalan).
- Hitung `KURANG` (jumlah movement DISPOSED/TRANSFER_OUT di kuartal berjalan).
- (Gunakan Drizzle Subqueries atau gabungkan data movement secara in-memory grouping di TypeScript untuk mempercepat eksekusi).

### 4. Implementasi UI Halaman BTK-16 (`src/routes/(app)/[org_slug]/laporan/btk-16/+page.svelte`)

- **4.1 Komponen Filter (Header):**
- Tambahkan Dropdown `Select` untuk Tipe Laporan (Triwulan, Nominatif, Bulanan).
- Tambahkan `Input` atau Dropdown untuk Periode Waktu.
- Tambahkan Dropdown `Select` Kategori Induk.

- **4.2 Tabel Dinamis (Dynamic Table Grouping):**
- Bentuk struktur tabel (kolom `<th>`) berubah berdasarkan state `reportType`.
- Gunakan struktur perulangan _nested_ `{#each}` dari Svelte 5.
- _Contoh untuk Triwulan / Bulanan:_
- Loop Kategori Utama (Tampilkan baris header tabel khusus, misal `A. ALKOM RADIO` dengan `colspan` penuh).
- Loop Sub Kategori (Tampilkan baris header, misal `I. RADIO SSB`).
- Loop Baris Item (Tampilkan data baris alat, kolom urut: No, Jenis Alat, DSPP, Kondisi, Keterangan).

- _Keterangan Col:_ Tampilkan string `keterangan` dari API (yang berisi info "Di gudang" atau rincian satuan peminjam).
- Terapkan _rowspan_ atau _cell merging_ secara visual jika data Kategori/SubKategori kosong.

### 5. Logika Export CSV Dinamis

Fungsi `exportCSV()` harus mengikuti state tampilan saat ini (_WYSIWYG_).

- Ganti hardcode _headers_ CSV menjadi dinamis:
- Jika `reportType === 'NOMINATIF'`, headers: `NO, KAT/KODE, TAHUN PEROLEHAN, JENIS MATERIEL, MERK/TYPE, SATUAN, NO SERI, JUMLAH, B, RR, RB, LOKASI, KETERANGAN`.
- Jika `reportType === 'TRIWULAN'`, headers: `NO, KAT/KODE, JENIS MATERIEL, SAT, TOP, TW LALU, TAMBAH, KURANG, SEKARANG, B, RR, RB, LOKASI, KETERANGAN`.

- Saat _looping_ untuk mengisi baris CSV (_rows_), masukkan juga baris Kategori Utama (misal `A, ALKOM RADIO, , , ...`) dan Sub Kategori (`I, RADIO SSB, , , ...`) sebagai _row_ tersendiri agar saat dibuka di Excel, pengelompokannya sama persis seperti di tampilan Svelte.

### Aturan Tambahan untuk Agent:

1. Pastikan logika mutasi database (Drizzle) tidak merusak data `item` dan `equipment` yang sudah ada (gunakan `LEFT JOIN` jika memungkinkan, karena alat lama mungkin `categoryId`-nya masih kosong).
2. Manfaatkan Drizzle SQL operators (`sql`, `sum`, `count`) untuk melakukan agregasi data di backend `btk-16.remote.ts`, HINDARI menarik seluruh data ke memori Node.js dan melakukan `.reduce()` jika jumlah baris mencapai ribuan.
3. Tetap patuhi Svelte 5 syntax (`$state`, `$derived`, komponen snippet jika perlu untuk render nested tables).
4. Jangan build untuk verifikasi cukup bun run check
