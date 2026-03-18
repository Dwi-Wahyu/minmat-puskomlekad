<script lang="ts">
	let { data } = $props();

	const getConditionClass = (condition: string) => {
		switch (condition) {
			case 'BAIK':
				return 'bg-green-100 text-green-700 border-green-200';
			case 'RUSAK_RINGAN':
				return 'bg-yellow-100 text-yellow-700 border-yellow-200';
			case 'RUSAK_BERAT':
				return 'bg-red-100 text-red-700 border-red-200';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	};
</script>

<div class="space-y-6 p-6">
	<header class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 uppercase">
				Daftar Barang Gudang {data.warehouse.category}
			</h1>
			<p class="text-sm text-gray-500">{data.warehouse.name} - {data.warehouse.location}</p>
		</div>
		<button
			class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
		>
			+ Tambah Barang
		</button>
	</header>

	<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="bg-gray-50 text-[11px] font-semibold tracking-wider text-gray-600 uppercase">
					<tr>
						<th class="px-6 py-4">No</th>
						<th class="px-6 py-4">Nama Materiel / Merk</th>
						<th class="px-6 py-4">Nomor Seri</th>
						<th class="px-6 py-4">Kondisi</th>
						<th class="px-6 py-4">Status</th>
						<th class="px-6 py-4 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#each data.warehouse.equipments as item, i}
						{@const lastLending = item.lendings[0]}
						<tr class="transition-colors hover:bg-gray-50">
							<td class="px-6 py-4 text-gray-500">{i + 1}</td>
							<td class="px-6 py-4">
								<div class="font-bold text-gray-900">{item.name}</div>
								<div class="text-xs text-gray-500">{item.brand || '-'}</div>
							</td>
							<td class="px-6 py-4 font-mono text-xs text-gray-600">
								{item.serialNumber || 'N/A'}
							</td>
							<td class="px-6 py-4">
								<span
									class="rounded-md border px-2 py-1 text-[10px] font-bold {getConditionClass(
										item.condition
									)}"
								>
									{item.condition.replace('_', ' ')}
								</span>
							</td>
							<td class="px-6 py-4">
								{#if lastLending && lastLending.status === 'DIPINJAM'}
									<span class="flex items-center gap-1.5 font-medium text-orange-600">
										<span class="h-2 w-2 rounded-full bg-orange-500"></span>
										Dipinjam ({lastLending.unit})
									</span>
								{:else}
									<span class="flex items-center gap-1.5 font-medium text-green-600">
										<span class="h-2 w-2 rounded-full bg-green-500"></span>
										Tersedia
									</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-right">
								<button class="mr-3 font-medium text-blue-600 hover:text-blue-800">Detail</button>
								<button class="text-gray-400 hover:text-red-600">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path
											d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
										/></svg
									>
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="px-6 py-12 text-center text-gray-500">
								Belum ada data barang di gudang ini.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
