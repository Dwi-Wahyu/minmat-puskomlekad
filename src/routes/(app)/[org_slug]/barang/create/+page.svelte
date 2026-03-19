<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let isLoading = $state(false);
</script>

<div class="mx-auto max-w-4xl p-6">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-800">Tambah Barang Habis Pakai</h1>
		<p class="text-sm text-gray-500">Daftarkan definisi barang baru untuk</p>
	</div>

	{#if form?.success}
		<div class="mb-6 rounded-lg border border-green-200 bg-green-100 p-4 text-green-700">
			Berhasil menambahkan barang baru.
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
			<label for="name" class="text-sm font-semibold text-gray-700">Nama Barang</label>
			<input
				type="text"
				name="name"
				id="name"
				required
				placeholder="Contoh: Baterai AA"
				class="rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
			/>
		</div>

		<div class="flex flex-col gap-2">
			<label for="baseUnit" class="text-sm font-semibold text-gray-700">Satuan Dasar</label>
			<select
				name="baseUnit"
				id="baseUnit"
				required
				class="rounded-lg border bg-white p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
			>
				<option value="" disabled selected>Pilih Satuan</option>
				<option value="PCS">PCS</option>
				<option value="BOX">BOX</option>
				<option value="METER">METER</option>
				<option value="ROLL">ROLL</option>
				<option value="UNIT">UNIT</option>
			</select>
		</div>

		<div class="flex flex-col gap-2 md:col-span-2">
			<label for="description" class="text-sm font-semibold text-gray-700"
				>Deskripsi / Keterangan</label
			>
			<textarea
				name="description"
				id="description"
				rows="4"
				placeholder="Tambahkan catatan singkat tentang barang ini..."
				class="rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
			></textarea>
		</div>

		<div class="mt-4 flex gap-3 md:col-span-2">
			<a
				href="/{data.user.organization.slug}/barang"
				class="flex-1 rounded-lg border border-gray-300 py-3 text-center font-medium transition hover:bg-gray-50"
			>
				Batal
			</a>
			<button
				disabled={isLoading}
				type="submit"
				class="hover:bg-opacity-90 flex-2 rounded-lg bg-[#2D5A43] py-3 font-bold text-white transition disabled:opacity-50"
			>
				{isLoading ? 'Menyimpan...' : 'Simpan Barang'}
			</button>
		</div>
	</form>
</div>
