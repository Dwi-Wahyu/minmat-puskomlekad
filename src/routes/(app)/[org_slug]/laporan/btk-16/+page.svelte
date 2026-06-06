<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { RotateCw, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { getBtk16Data } from './btk-16.remote';

	const limit = $derived(Number(page.url.searchParams.get('limit')) || 50);
	const currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);

	const btkQuery = $derived(
		getBtk16Data({
			page: currentPage,
			limit: limit
		})
	);

	function updateLimit(val: string | undefined) {
		if (!val) return;
		const newUrl = new URL(page.url);
		newUrl.searchParams.set('limit', val);
		newUrl.searchParams.set('page', '1');
		goto(newUrl.toString(), { noScroll: true });
	}

	function goToPage(p: number) {
		const newUrl = new URL(page.url);
		newUrl.searchParams.set('page', p.toString());
		goto(newUrl.toString(), { noScroll: true });
	}

	function exportCSV() {
		if (!btkQuery.current?.reports.length) return;

		const headers = [
			'NO URT',
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
		const rows = btkQuery.current.reports.map((r: any, i: number) => [
			i + 1 + (currentPage - 1) * limit,
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
		<div class="flex flex-wrap items-center gap-4">
			<div class="flex items-center gap-2">
				<span class="text-xs font-medium text-muted-foreground">Baris per halaman:</span>
				<Select.Root type="single" value={limit.toString()} onValueChange={updateLimit}>
					<Select.Trigger class="h-8 w-20 text-xs">
						{limit}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="25" label="25">25</Select.Item>
						<Select.Item value="50" label="50">50</Select.Item>
						<Select.Item value="100" label="100">100</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>

			<div class="flex shrink-0 items-center gap-2">
				<form
					method="POST"
					action="?/reload"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								btkQuery.refresh();
							}
						};
					}}
				>
					<button
						type="submit"
						disabled={btkQuery.loading}
						class="flex items-center gap-2 whitespace-nowrap rounded bg-primary px-4 py-2 text-sm text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
					>
						<RotateCw class="h-4 w-4 {btkQuery.loading ? 'animate-spin' : ''}" />
						{btkQuery.loading ? 'Memproses...' : 'Muat Ulang Data'}
					</button>
				</form>
				<button
					onclick={exportCSV}
					disabled={btkQuery.loading || !btkQuery.current?.reports.length}
					class="whitespace-nowrap rounded bg-success px-4 py-2 text-sm text-success-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					Ekspor CSV
				</button>
			</div>
		</div>
	</div>

	<div class="overflow-x-auto rounded-lg border">
		<table class="w-full border-collapse text-[11px] text-foreground">
			<thead>
				<tr class="bg-muted uppercase">
					<th class="w-8 border-b border-r px-1 py-2 text-center" rowspan="2">No Urt</th>
					<th class="border-b border-r px-2 py-2 text-center" rowspan="2">No Kat / Kode Barang</th>
					<th class="border-b border-r px-2 py-2 text-left" rowspan="2">Nama Material</th>
					<th class="border-b border-r px-2 py-2 text-center" rowspan="2">Merek / Type</th>
					<th class="border-b border-r px-2 py-2 text-center" rowspan="2">Satuan</th>
					<th class="border-b border-r px-2 py-2 text-center" rowspan="2"
						>No. Senjata / Rangka / Mesin</th
					>
					<th class="border-b border-r px-2 py-1 text-center" colspan="3">Kondisi</th>
					<th class="border-b px-2 py-2 text-center" rowspan="2">Ket</th>
				</tr>
				<tr class="bg-muted uppercase">
					<th class="w-8 border-b border-r px-1 py-1 text-center">B</th>
					<th class="w-8 border-b border-r px-1 py-1 text-center">RR</th>
					<th class="w-8 border-b border-r px-1 py-1 text-center">RB</th>
				</tr>
			</thead>
			<tbody>
				{#if btkQuery.loading}
					{#each Array(10) as _, i (i)}
						<tr class="border-b">
							<td class="border-r p-1 text-center"><Skeleton class="h-3 w-4 mx-auto" /></td>
							<td class="border-r p-1 px-2"><Skeleton class="h-3 w-16" /></td>
							<td class="border-r p-1 px-2"><Skeleton class="h-3 w-32" /></td>
							<td class="border-r p-1 px-2"><Skeleton class="h-3 w-20" /></td>
							<td class="border-r p-1 text-center"><Skeleton class="h-3 w-8 mx-auto" /></td>
							<td class="border-r p-1 px-2 text-center"><Skeleton class="h-3 w-24 mx-auto" /></td>
							<td class="border-r p-1 text-center"><Skeleton class="h-3 w-4 mx-auto" /></td>
							<td class="border-r p-1 text-center"><Skeleton class="h-3 w-4 mx-auto" /></td>
							<td class="border-r p-1 text-center"><Skeleton class="h-3 w-4 mx-auto" /></td>
							<td class="p-1 px-2"><Skeleton class="h-3 w-20" /></td>
						</tr>
					{/each}
				{:else if btkQuery.current && btkQuery.current.reports.length > 0}
					{#each btkQuery.current.reports as row, i (row.itemId + row.serialNumber + i)}
						<tr class="border-b uppercase transition-colors hover:bg-muted/50">
							<td class="border-r p-1 text-center">{i + 1 + (currentPage - 1) * limit}</td>
							<td class="border-r p-1 px-2 font-mono text-center">{row.itemId.slice(0, 8)}</td>
							<td class="border-r p-1 px-2 font-semibold text-left">{row.itemName}</td>
							<td class="border-r p-1 px-2 text-center">{row.brand || '-'}</td>
							<td class="border-r p-1 text-center">{row.unit}</td>
							<td class="border-r p-1 px-2 text-center font-mono">{row.serialNumber || '-'}</td>

							<td class="border-r p-1 text-center font-bold text-success">
								{row.condition === 'BAIK' ? '✓' : ''}
							</td>
							<td class="border-r p-1 text-center font-bold text-primary">
								{row.condition === 'RUSAK_RINGAN' ? '✓' : ''}
							</td>
							<td class="border-r p-1 text-center font-bold text-destructive">
								{row.condition === 'RUSAK_BERAT' ? '✓' : ''}
							</td>

							<td class="p-1 px-2 text-[10px] normal-case italic text-muted-foreground">
								{row.itemDescription || '-'}
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="11" class="border-b p-8 text-center text-muted-foreground italic">
							Data tidak tersedia.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	{#if btkQuery.current && btkQuery.current.pagination.totalPages > 1}
		<div class="flex items-center justify-between border-t py-4">
			<div class="text-xs text-muted-foreground">
				Menampilkan <span class="font-semibold text-foreground"
					>{(currentPage - 1) * limit + 1}</span
				>
				-
				<span class="font-semibold text-foreground"
					>{Math.min(currentPage * limit, btkQuery.current.pagination.totalItems)}</span
				>
				dari <span class="font-semibold text-foreground"
					>{btkQuery.current.pagination.totalItems}</span
				> data
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => goToPage(currentPage - 1)}
					disabled={currentPage <= 1}
					class="h-8 gap-1 px-2 text-xs"
				>
					<ChevronLeft class="h-3 w-3" />
					Sebelumnya
				</Button>
				<div class="flex items-center gap-1">
					{#each Array(btkQuery.current.pagination.totalPages) as _, i}
						{@const p = i + 1}
						{#if p === 1 || p === btkQuery.current.pagination.totalPages || (p >= currentPage - 1 && p <= currentPage + 1)}
							<Button
								variant={currentPage === p ? 'default' : 'ghost'}
								size="sm"
								onclick={() => goToPage(p)}
								class="h-8 w-8 p-0 text-xs"
							>
								{p}
							</Button>
						{:else if p === currentPage - 2 || p === currentPage + 2}
							<span class="px-1 text-muted-foreground">...</span>
						{/if}
					{/each}
				</div>
				<Button
					variant="outline"
					size="sm"
					onclick={() => goToPage(currentPage + 1)}
					disabled={currentPage >= btkQuery.current.pagination.totalPages}
					class="h-8 gap-1 px-2 text-xs"
				>
					Selanjutnya
					<ChevronRight class="h-3 w-3" />
				</Button>
			</div>
		</div>
	{/if}
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
