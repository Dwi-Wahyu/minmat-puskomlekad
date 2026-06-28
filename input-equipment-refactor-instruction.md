## Instruksi Implementasi: Fitur Batch Input Alat, Satuan Jajaran (Level 3), & Restriksi Gudang

> **Konteks untuk Agent:**
> Anda bekerja pada codebase SvelteKit + Drizzle ORM + MySQL. Instruksi ini bertujuan untuk membuat fitur "Batch Input Alat" yang dinamis, menambahkan manajemen Satuan Bawahan (Level 3), dan menerapkan aturan akses (_Role-based_) untuk Kepala Gudang di level Pusat (Level 1).

### 1. Buat Fitur CRUD "Satuan Jajaran" (Organisasi Level 3)

Saat ini skema `organization` memiliki relasi `parentId`. Organisasi Level 3 adalah data `organization` yang `parentId`-nya merujuk ke ID Organisasi Level 2 (Satuan). Tidak perlu membuatkan _user_ untuk organisasi Level 3 ini (hanya master data).

- **1.1 Buat Halaman CRUD:**
- Target path: `src/routes/(app)/[org_slug]/satuan-jajaran`
- Fungsi: Menampilkan tabel daftar Satuan Jajaran (anak dari `locals.organization.id`).
- Sediakan form/modal untuk _Create_, _Edit_, dan _Delete_ (kolom yang diisi cukup: `name`, `displayName`).

- **1.2 Modifikasi Sidebar (`src/lib/components/Sidebar.svelte`):**
- Tambahkan menu **"Satuan Jajaran"**.
- **Syarat Tampil:** Menu ini HANYA muncul jika organisasi yang sedang aktif adalah Organisasi Level 2 (misalnya dengan mengecek apakah organisasi tersebut punya `parentId` yang merujuk ke Pusat, ATAU menggunakan properti metadata tertentu yang menandakan ia adalah Level 2).

### 2. Buat Halaman Batch Input Alat (`/alat/[type]/batch-create`)

Buat form dinamis untuk memasukkan beberapa alat sekaligus.

- **2.1 Logika Form Utama (Header):**
- Pilih Jenis Alat (dari tabel `item`).
- Input _Number_: **"Total Komunity"** (Ini bertindak sebagai Grand Total dari alat yang diinput).
- Input _Number_: **"Total Balkir"** (Jumlah alat yang rusak di dalam Total Komunity tersebut).
- _(Validasi UI: Total Balkir tidak boleh lebih besar dari Total Komunity)._

- **2.2 Generate State Input Serial Number (Dynamic Rows):**
- Setelah mengisi total, munculkan daftar input dinamis sebanyak jumlah "Total Komunity".
- _Auto-assign classification:_ Sebanyak jumlah "Total Balkir", tandai _state_ internal baris tersebut sebagai `BALKIR` (dan kondisinya `RUSAK_BERAT`). Sisanya ditandai sebagai `KOMUNITY` (kondisinya `BAIK`). _Catatan: Untuk pusat (Level 1), ikuti aturan pada Poin 3._

- **2.3 Tombol "Pinjamkan ke Satuan Jajaran" (Level 3 Placement):**
- Di sebelah _tiap baris input Serial Number_, tambahkan sebuah tombol ikon (misalnya panah/lokasi).
- Jika diklik, buka sebuah _Dialog_ (dari `src/lib/components/ui/dialog`) yang berisi _Autocomplete/Dropdown_ berisi daftar **Satuan Jajaran** (ambil dari data tabel `organization` yang `parentId`-nya adalah org saat ini).
- Simpan pilihan satuan bawahan tersebut di _state array_ Svelte untuk baris tersebut. Jika dipilih, tampilkan _badge_ nama satuan jajaran di sebelah input Serial Number agar visualnya jelas.

### 3. Restriksi Role Kepala Gudang (Level 1 / Pusat)

Organisasi Pusat (Level 1) memiliki 3 Kepala Gudang yang berbeda (Transito, Balkir, Komunity) berdasarkan nilai enum `warehouseHeadType`.

- **3.1 Pengecekan di Load Function (`+page.server.ts`):**
- Cek apakah `locals.member.warehouseHeadType` (atau object `session/user` terkait di `locals`) tersedia.
- Jika user adalah Kepala Gudang spesifik (misal `TRANSITO`), maka sistem harus **mengunci** nilai klasifikasi alat yang diinput HANYA untuk klasifikasi tersebut.

- **3.2 Dampak pada UI Batch Input:**
- Jika yang login adalah Kepala Gudang `BALKIR`, sembunyikan input "Total Komunity", ubah label utamanya menjadi "Total Balkir", dan pastikan semua alat yang di-generate masuk ke _state_ `classification = 'BALKIR'`.
- Jika yang login adalah Kepala Gudang `KOMUNITY`, kunci semua alat ke `KOMUNITY`.
- Jika yang login adalah Kepala Gudang `TRANSITO`, sembunyikan input Balkir/Komunity, ganti label menjadi "Total Transito", dan set `classification = 'TRANSITO'`.
- _(Pastikan form logic diubah secara dinamis berdasarkan `warehouseHeadType` ini)._

### 4. Transaksi Penyimpanan ke Database (SvelteKit Form Action)

Ketika disubmit, data berupa array of objects (SerialNumber, Status, TargetSatuanBawahanId) dikirim ke backend. Gunakan `db.transaction()` karena kita akan memasukkan data ke banyak tabel.

- **4.1 Insert ke tabel `equipment`:**
- `serialNumber`: dari input.
- `classification`: sesuai pembagian _state_ (KOMUNITY/BALKIR/TRANSITO).
- `organizationId`: Tetap gunakan `locals.organization.id` (Milik Satuan Induk / Level 2, BUKAN id satuan bawahan).
- `warehouseId`: Gudang default milik satuan induk.
- `status`: Jika alat ini ditandai untuk dipinjamkan ke satuan jajaran (ada TargetSatuanBawahanId), set `status = 'IN_USE'`. Jika tidak, set `READY`.

- **4.2 Record Peminjaman ke tabel `lending` & `lending_item`:**
- Untuk alat yang memiliki target Satuan Jajaran, kelompokkan berdasarkan Satuan Jajaran yang sama.
- Buat row di tabel `lending` dengan:
- `organizationId`: `locals.organization.id`
- `unit`: Isi dengan Nama Satuan Jajaran (Atau Anda bisa menyimpan ID-nya ke field tertentu jika skema mendukung, tapi karena `unit` adalah `varchar(100)`, simpan nama Satuan Jajaran di sini).
- `purpose`: `'OPERASI'`
- `status`: `'DIPINJAM'`

- Masukkan equipment tersebut ke `lending_item`.

- **4.3 Record Histori ke tabel `movement`:**
- Catat `eventType = 'RECEIVE'` untuk semua alat yang baru masuk.
- Untuk alat yang langsung dipinjamkan ke Satuan Jajaran, catat tambahan event `eventType = 'LOAN_OUT'` dengan `toWarehouseId` NULL dan `notes` mengarah ke Satuan Jajaran.

### Aturan Eksekusi:

1. Baca dan periksa tipe data relasi `lending`, `equipment`, dan `organization` di `src/lib/server/db/schema.ts` sebelum menulis kode.
2. Gunakan komponen UI Shadcn-svelte (`src/lib/components/ui/*`) yang sudah ada.
3. Pastikan tidak menggunakan sintaks Svelte 4. Codebase ini menggunakan **Svelte 5 Runes** (`$state`, `$derived`, `$effect`).
4. Lakukan pembuatan secara berurutan: CRUD Level 3 dulu -> Modifikasi Sidebar -> UI Halaman Batch Input -> API/Action Backend.
5. Gunakan icon dari `@lucide/svelte` BUKAN `lucide-svelte`, baca @GEMINI.md untuk tool calling Sveltekit MCP
6. Jangan build untuk verifikasi cukup bun run check
