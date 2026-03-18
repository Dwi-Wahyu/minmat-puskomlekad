<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let isLoading = $state(false);
</script>

<div class="mx-auto max-w-4xl p-6">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-800">Edit Data Alat</h1>
		<p class="text-sm text-gray-500">
			Perbarui informasi untuk <strong>{data.equipment.name}</strong>
		</p>
	</div>

	{#if form?.success}
		<div class="mb-6 rounded-lg border border-blue-200 bg-blue-100 p-4 text-blue-700">
			{form.message}
		</div>
	{/if}

	<form
		method="POST"
		action="?/update"
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
				value={data.equipment.name}
				class="rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
			/>
		</div>

		<div class="flex flex-col gap-2">
			<label for="serialNumber" class="text-sm font-semibold text-gray-700">Nomor Seri (S/N)</label>
			<input
				type="text"
				name="serialNumber"
				id="serialNumber"
				value={data.equipment.serialNumber}
				class="rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
			/>
		</div>

		<div class="flex flex-col gap-2">
			<label for="warehouseId" class="text-sm font-semibold text-gray-700">Lokasi Gudang</label>
			<select
				name="warehouseId"
				id="warehouseId"
				required
				class="rounded-lg border bg-white p-2.5 outline-none focus:ring-2 focus:ring-[#2D5A43]"
			>
				{#each data.warehouses as wh}
					<option value={wh.id} selected={wh.id === data.equipment.warehouseId}>
						{wh.name} ({wh.category})
					</option>
				{/each}
			</select>
		</div>

		<div class="mt-4 flex gap-3 md:col-span-2">
			<a
				href="/dashboard"
				class="flex-1 rounded-lg border border-gray-300 py-3 text-center font-medium transition hover:bg-gray-50"
			>
				Batal
			</a>
			<button
				disabled={isLoading}
				type="submit"
				class="hover:bg-opacity-90 flex-2 rounded-lg bg-[#2D5A43] py-3 font-bold text-white transition disabled:opacity-50"
			>
				{isLoading ? 'Menyimpan Perubahan...' : 'Update Data Alat'}
			</button>
		</div>
	</form>
</div>
