<script lang="ts">
	import { enhance } from '$app/forms';
	import { RotateCw } from '@lucide/svelte';
	let { data } = $props();

	let isLoading = $state(false);

	function exportCSV() {
		if (!data.reports.length) return;

		const headers = [
			'NO URT',
			'NO SAT',
			'NO KAT / KODE',
			'NAMA MATERIAL',
			'MEREK / TYPE',
			'SATUAN',
			'NO SERI/MESIN',
			'B',
			'RR',
			'RB',
			'KET'
		];
		const rows = data.reports.map((r, i) => [
			i + 1,
			i + 1,
			r.itemId, // Menggunakan ID sebagai Kode
			r.itemName,
			r.brand || '-',
			r.unit,
			r.serialNumber || '-',
			r.condition === 'BAIK' ? '1' : '0',
			r.condition === 'RUSAK_RINGAN' ? '1' : '0',
			r.condition === 'RUSAK_BERAT' ? '1' : '0',
			r.itemDescription || '-'
		]);

		const content = [headers, ...rows].map((row) => row.join(',')).join('\n');
		const blob = new Blob([content], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `BTK16_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
	}
</script>

<div class="space-y-4 p-6">
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-lg font-bold uppercase underline text-foreground">LAPORAN KONDISI MATERIIL</h1>
			<h2 class="text-md font-bold uppercase text-foreground">( BTK - 16 )</h2>
		</div>
		<div class="flex shrink-0 items-center gap-2">
			<form
				method="POST"
				action="?/reload"
				use:enhance={() => {
					isLoading = true;
					return async ({ update }) => {
						await update();
						isLoading = false;
					};
				}}
			>
				<button
					type="submit"
					disabled={isLoading}
					class="flex items-center gap-2 whitespace-nowrap rounded bg-primary px-4 py-2 text-sm text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					<RotateCw class="h-4 w-4 {isLoading ? 'animate-spin' : ''}" />
					{isLoading ? 'Memproses...' : 'Muat Ulang Data'}
				</button>
			</form>
			<button
				onclick={exportCSV}
				class="whitespace-nowrap rounded bg-success px-4 py-2 text-sm text-success-foreground shadow-sm transition-opacity hover:opacity-90"
			>
				Ekspor CSV
			</button>
		</div>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full border-collapse border border-border text-[11px] text-foreground">
			<thead>
				<tr class="bg-muted uppercase">
					<th class="w-8 border border-border px-1 py-2" rowspan="2">No Urt</th>
					<th class="border border-border px-2 py-2" rowspan="2">No Kat / Kode Barang</th>
					<th class="border border-border px-2 py-2" rowspan="2">Nama Material</th>
					<th class="border border-border px-2 py-2" rowspan="2">Merek / Type</th>
					<th class="border border-border px-2 py-2" rowspan="2">Satuan</th>
					<th class="border border-border px-2 py-2" rowspan="2">No. Senjata / Rangka / Mesin</th>
					<th class="border border-border px-2 py-1" colspan="3">Kondisi</th>
					<th class="border border-border px-2 py-2" rowspan="2">Ket</th>
				</tr>
				<tr class="bg-muted">
					<th class="w-8 border border-border px-1 py-1 text-center">B</th>
					<th class="w-8 border border-border px-1 py-1 text-center">RR</th>
					<th class="w-8 border border-border px-1 py-1 text-center">RB</th>
				</tr>
			</thead>
			<tbody>
				{#each data.reports as row, i}
					<tr class="uppercase hover:bg-muted/50 transition-colors">
						<td class="border border-border p-1 text-center">{i + 1}</td>
						<td class="border border-border p-1 px-2 font-mono">{row.itemId.slice(0, 8)}</td>
						<td class="border border-border p-1 px-2 font-semibold">{row.itemName}</td>
						<td class="border border-border p-1 px-2">{row.brand || '-'}</td>
						<td class="border border-border p-1 text-center">{row.unit}</td>
						<td class="border border-border p-1 px-2 text-center">{row.serialNumber || '-'}</td>

						<td class="border border-border p-1 text-center font-bold">
							{row.condition === 'BAIK' ? '✓' : ''}
						</td>
						<td class="border border-border p-1 text-center font-bold">
							{row.condition === 'RUSAK_RINGAN' ? '✓' : ''}
						</td>
						<td class="border border-border p-1 text-center font-bold">
							{row.condition === 'RUSAK_BERAT' ? '✓' : ''}
						</td>

						<td class="border border-border p-1 px-2 text-[10px] lowercase italic">
							{row.itemDescription || '-'}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="11" class="border border-border p-4 text-center text-muted-foreground">
							Data tidak tersedia.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	table {
		border-spacing: 0;
	}
	th {
		font-weight: bold;
	}
	@media print {
		button {
			display: none;
		}
	}
</style>
