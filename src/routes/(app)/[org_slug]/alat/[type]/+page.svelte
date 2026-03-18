<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();

	// Helper untuk warna badge kondisi
	const getConditionClass = (condition: string) => {
		switch (condition) {
			case 'BAIK':
				return 'bg-green-100 text-green-800 border-green-200';
			case 'RUSAK_RINGAN':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'RUSAK_BERAT':
				return 'bg-red-100 text-red-800 border-red-200';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};
</script>

<div class="space-y-6 p-6">
	<header class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Data {data.type.title}</h1>
			<p class="text-sm text-gray-500">Total {data.pagination.totalItems} perangkat ditemukan</p>
		</div>
		<a
			href={resolve('/(app)/[org_slug]/alat/[type]/create', {
				org_slug: data.user.organization.slug,
				type: data.type.path
			})}
			class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
		>
			+ Tambah Alat
		</a>
	</header>

	<section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
		<form method="GET" class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<div class="md:col-span-2">
				<label for="name" class="mb-1 block text-xs font-medium text-gray-700"
					>Cari Nama / Merk</label
				>
				<input
					type="text"
					name="name"
					id="name"
					placeholder="Contoh: Radio HF..."
					value={data.filters.name}
					class="w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>

			<div class="flex items-end">
				<button
					type="submit"
					class="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
				>
					Terapkan Filter
				</button>
			</div>
		</form>
	</section>

	<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
					<tr>
						<th class="px-6 py-4">ID Barang</th>
						<th class="px-6 py-4">Nama</th>
						<th class="px-6 py-4">Status</th>
						<th class="px-6 py-4">Gudang</th>
						<th class="px-6 py-4 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#each data.data as item}
						<tr class="transition hover:bg-gray-50">
							<td class="px-6 py-4 font-mono text-xs">{item.serialNumber || 'N/A'}</td>

							<td class="px-6 py-4">
								<div class="font-medium text-gray-900">{item.name}</div>
								<div class="text-xs text-gray-500">{item.brand || '-'}</div>
							</td>
							<td class="px-6 py-4">
								<span
									class="rounded border px-2 py-0.5 text-xs font-semibold {getConditionClass(
										item.condition
									)}"
								>
									{item.condition.replace('_', ' ')}
								</span>
							</td>
							<td class="px-6 py-4 text-gray-500"
								>{new Date(item.createdAt).toLocaleDateString('id-ID')}</td
							>
							<td class="px-6 py-4 text-right">
								<a
									href={resolve('/(app)/[org_slug]/alat/[type]/edit/[id]', {
										id: item.id,
										org_slug: data.user.organization.slug,
										type: data.type.path
									})}
									class="font-medium text-blue-600 hover:underline">Edit</a
								>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="px-6 py-10 text-center text-gray-500">
								Tidak ada data yang ditemukan.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<footer class="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
			<div class="text-xs text-gray-500">
				Halaman <span class="font-bold text-gray-900">{data.pagination.currentPage}</span> dari
				<span class="font-bold text-gray-900">{data.pagination.totalPages}</span>
			</div>
			<div class="flex gap-2">
				<a
					href="?page={data.pagination.currentPage - 1}&name={data.filters.name}}"
					class="rounded border bg-white px-3 py-1 text-xs font-medium hover:bg-gray-50 {data
						.pagination.currentPage <= 1
						? 'pointer-events-none opacity-50'
						: ''}"
				>
					Sebelumnya
				</a>
				<a
					href="?page={data.pagination.currentPage + 1}&name={data.filters.name}}"
					class="rounded border bg-white px-3 py-1 text-xs font-medium hover:bg-gray-50 {data
						.pagination.currentPage >= data.pagination.totalPages
						? 'pointer-events-none opacity-50'
						: ''}"
				>
					Selanjutnya
				</a>
			</div>
		</footer>
	</div>
</div>
