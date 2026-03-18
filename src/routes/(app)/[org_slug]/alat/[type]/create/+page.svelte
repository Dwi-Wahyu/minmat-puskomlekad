<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let isLoading = $state(false);
</script>

<div class="mx-auto max-w-4xl p-6">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-800">Input Data Alat Baru</h1>
		<p class="text-sm text-gray-500">Tambahkan peralatan baru ke dalam inventaris gudang.</p>
	</div>

	{#if form?.success}
		<div class="mb-6 rounded-lg border border-green-200 bg-green-100 p-4 text-green-700">
			{form.message}
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			isLoading = true;
			return async ({ update }) => {
				isLoading = false;
				update();
			};
		}}
		class="grid grid-cols-1 gap-6 rounded-xl border border-gray-100 bg-white p-8 shadow-sm md:grid-cols-2"
	>
		<div class="flex flex-col gap-2">
			<label for="name" class="text-sm font-semibold text-gray-700">Nama Alat</label>
			<input
				type="text"
				name="name"
				id="name"
				required
				class="rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
				placeholder="Contoh: Radio HT Motorola"
			/>
		</div>

		<div class="flex flex-col gap-2">
			<label for="serialNumber" class="text-sm font-semibold text-gray-700">Nomor Seri (S/N)</label>
			<input
				type="text"
				name="serialNumber"
				id="serialNumber"
				class="rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
				placeholder="Masukkan S/N unik"
			/>
		</div>

		<div class="flex flex-col gap-2">
			<label for="brand" class="text-sm font-semibold text-gray-700">Merk/Brand</label>
			<input
				type="text"
				name="brand"
				id="brand"
				class="rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
				placeholder="Contoh: Harris, Motorola"
			/>
		</div>

		<div class="flex flex-col gap-2">
			<label for="warehouseId" class="text-sm font-semibold text-gray-700">Pilih Gudang</label>
			<select
				name="warehouseId"
				id="warehouseId"
				required
				class="rounded-lg border bg-white p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
			>
				<option value="">-- Pilih Gudang Tujuan --</option>
				{#each data.warehouses as wh}
					<option value={wh.id}>{wh.name} ({wh.category})</option>
				{/each}
			</select>
		</div>

		<div class="flex flex-col gap-2">
			<label for="type" class="text-sm font-semibold text-gray-700">Tipe Alat</label>
			<select
				name="type"
				id="type"
				required
				class="rounded-lg border bg-white p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
			>
				<option value="ALKOMLEK">ALKOMLEK</option>
				<option value="PERNIKA_LEK">PERNIKA_LEK</option>
			</select>
		</div>

		<div class="flex flex-col gap-2">
			<label for="category" class="text-sm font-semibold text-gray-700">Kategori Spesifik</label>
			<input
				type="text"
				name="category"
				id="category"
				required
				class="rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
				placeholder="Contoh: Alat Komunikasi"
			/>
		</div>

		<div class="flex flex-col gap-2">
			<label for="condition" class="text-sm font-semibold text-gray-700">Kondisi Barang</label>
			<select
				name="condition"
				id="condition"
				class="rounded-lg border bg-white p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
			>
				<option value="BAIK">BAIK</option>
				<option value="RUSAK_RINGAN">RUSAK RINGAN</option>
				<option value="RUSAK_BERAT">RUSAK BERAT</option>
			</select>
		</div>

		<div class="flex flex-col gap-2">
			<label for="quantity" class="text-sm font-semibold text-gray-700">Jumlah (Quantity)</label>
			<input
				type="number"
				name="quantity"
				id="quantity"
				min="1"
				value="1"
				required
				class="rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
			/>
		</div>

		<div class="mt-4 flex w-full justify-end gap-4">
			<button
				onclick={() => history.back()}
				class="hover:bg-opacity-90 w-full rounded-lg bg-[#2D5A43] py-3 font-bold text-white"
			>
				Kembali
			</button>

			<button
				disabled={isLoading}
				type="submit"
				class="hover:bg-opacity-90 w-full rounded-lg bg-[#2D5A43] py-3 font-bold text-white transition disabled:opacity-50"
			>
				{isLoading ? 'Menyimpan...' : 'Simpan Data Alat'}
			</button>
		</div>
	</form>
</div>
