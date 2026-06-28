# Instruksi untuk CLI Agent (Bagian 2)

## Instruksi Implementasi: Pemilihan & Pembuatan Kategori Hierarkis di Form Input Alat

> **Konteks untuk Agent:**
> Melanjutkan penambahan tabel `item_category` (hierarkis) pada skema database, Anda sekarang harus memodifikasi form input alat (Single Input & Batch Input) agar pengguna dapat memilih kategori yang sudah ada atau membuat kategori baru secara langsung (_on-the-fly_) saat mendata Alat/Item baru.
> Ingat: Kategori menempel pada tabel `item` (Master Barang), BUKAN pada tabel `equipment` (Fisik Alat).

### 1. Update Loaders untuk Mengambil Data Kategori

Pada halaman form, kita perlu mengirimkan daftar kategori ke klien (UI) agar bisa dipilih. Kategori harus diambil beserta relasi _parent_-nya agar UI bisa merender nama kategori dengan jelas (misal: "ALKOM RADIO - RADIO SSB").

- **Target Files:**
- `src/routes/(app)/[org_slug]/alat/[type]/create/+page.server.ts`
- `src/routes/(app)/[org_slug]/alat/[type]/edit/[id]/+page.server.ts`
- `src/routes/(app)/[org_slug]/alat/batch-create/+page.server.ts`

- **Instruksi:**
- Di dalam fungsi `load`, tambahkan query Drizzle: `const categories = await db.query.itemCategory.findMany({ with: { parent: true } });`.
- _Return_ variabel `categories` ini ke halaman Svelte.

### 2. Modifikasi Form Single Create & Edit (`alat/[type]/create/+page.svelte` & `edit/[id]/+page.svelte`)

Tambahkan field input Kategori di bawah/di atas field "Nama Alat".

- **Instruksi State Svelte 5:**
- Buat toggle state: `let categoryMode = $state<'select' | 'new'>('select');`

- **Logika UI Form:**
- **Mode 'select':** Tampilkan `SearchableSelect` atau Svelte-select standar yang melooping data `categories`. Value yang dibinding adalah `categoryId`. Jika kategori memiliki _parent_, render labelnya sebagai `ParentName - ChildName`.
- **Mode 'new':** Tampilkan 2 input:

1. Input Text `newCategoryName` (Wajib).
2. Dropdown `parentCategoryId` (Opsional) -> Isinya daftar kategori existing level 1 yang bisa dipilih sebagai induk.

- Sediakan tombol kecil (seperti "Tambah Kategori Baru" / "Pilih Kategori Existing") untuk men-toggle `categoryMode`.

- **Superforms Integration:**
- Pastikan Anda menyesuaikan `equipmentSchema` di SvelteKit Superforms untuk menerima field baru: `categoryId` (nullable), `newCategoryName` (string opsional), dan `parentCategoryId` (string opsional).

### 3. Modifikasi Form Batch Create (`alat/batch-create/+page.svelte`)

Halaman ini sudah menggunakan skema _vanilla form_ (tanpa superforms). Terapkan logika yang sama dengan form single.

- **Instruksi Logika UI:**
- Modifikasi blok `{#if inputMode === 'new'}` di sidebar "Konfigurasi Batch".
- Saat `inputMode === 'new'` (artinya Admin membuat Nama Alat Baru), wajibkan pengguna untuk mengisi Kategori.
- Terapkan toggle state `categoryMode` (`'select'` atau `'new'`) di dalam blok ini.
- Sediakan hidden inputs di dalam `<form method="POST">` (bagian footer submit) untuk mengirimkan nilai: `categoryId`, `newCategoryName`, `parentCategoryId`, dan `categoryMode`.

### 4. Modifikasi Form Actions (Penyimpanan ke Database)

_Backend_ harus bisa memproses kategori baru jika pengguna memilih membuat kategori secara _on-the-fly_.

- **Target Files:**
- `src/routes/(app)/[org_slug]/alat/[type]/create/+page.server.ts` (Action `default`)
- `src/routes/(app)/[org_slug]/alat/batch-create/+page.server.ts` (Action `default`)

- **Instruksi Logika Insert/Update:**
- Ambil data dari form: `categoryMode`, `categoryId`, `newCategoryName`, `parentCategoryId`.
- Sebelum melakukan blok `if (!existingItem) { insert item }`:
- Jika `categoryMode === 'new'` dan `newCategoryName` ada isinya:

1. _Generate_ UUID baru untuk kategori: `const newCatId = crypto.randomUUID();`
2. Insert ke `itemCategory`: `await tx.insert(itemCategory).values({ id: newCatId, name: newCategoryName, parentId: parentCategoryId || null })`
3. Set variabel `finalCategoryId = newCatId`.

- Jika `categoryMode === 'select'`:

1. Set variabel `finalCategoryId = categoryId`.

- Saat melakukan `tx.insert(item).values({ ... })` (Membuat master item baru), pastikan field `categoryId: finalCategoryId` ikut dimasukkan.

### Aturan Ketat untuk Agent:

1. **Jangan menimpa Kategori Item yang sudah ada tanpa alasan yang jelas!** Di form _Edit_ atau saat Batch Create dengan `inputMode === 'list'`, jika pengguna memilih barang yang sudah ada (`existingItem`), kita **tidak perlu** memaksakan _update_ kategori kecuali jika di UI memang disediakan opsi untuk memodifikasi master datanya. Fokuskan pembuatan kategori pada alur pembuatan `item` baru.
2. Karena menggunakan MySQL, _recursive query_ untuk mengambil kategori hierarkis tidak selalu jalan di versi MySQL lama. Oleh karena itu, di `load` ambil saja semua kategori secara _flat_, dan gabungkan _label parent-child_ nya di sisi TypeScript (Frontend `+page.svelte`) sebelum di-render ke dropdown (misal: `const label = cat.parent ? ${cat.parent.name} - ${cat.name} : cat.name;`).
3. Pastikan field-field ini aman diletakkan dalam Drizzle `db.transaction(async (tx) => { ... })` agar jika pembuatan alat/batch gagal, pembuatan kategorinya juga di-_rollback_.
