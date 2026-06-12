<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { RotateCw, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { getPernikaLekData } from './pernika-lek.remote';

	let { data } = $props();

	const limit = $derived(Number(page.url.searchParams.get('limit')) || 50);
	const currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);
	const isParentOrg = $derived(data.isParentOrg);

	const pernikaQuery = $derived(
		getPernikaLekData({
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
		if (!pernikaQuery.current?.groupedReports.length) return;

		const headers = [
			'NO',
			...(isParentOrg ? ['SATKER'] : []),
			'NAMA MATERIIL',
			'MEREK / TYPE',
			'SATUAN',
			'JUMLAH',
			'B',
			'RR',
			'RB',
			'KET'
		];

		const csvRows: string[] = [];

		pernikaQuery.current.groupedReports.forEach((org: any) => {
			org.items.forEach((item: any) => {
				const rowData = [
					item.index,
					...(isParentOrg ? [org.orgName] : []),
					item.itemName,
					item.brand || '-',
					item.unit,
					item.total,
					item.baik || 0,
					item.rr || 0,
					item.rb || 0,
					item.ket || '-'
				];
				csvRows.push(rowData.map((val) => `"${val}"`).join(','));
			});
		});

		const content = [headers.join(','), ...csvRows].join('\n');
		const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `LAP_PERNIKA_LEK_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="space-y-4 p-4 md:space-y-6 md:p-6">
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div class="space-y-1">
			<h1 class="text-xl font-bold uppercase underline">LAPORAN MATERIIL PERNIKA DAN LEK</h1>
			<p class="text-sm font-semibold text-muted-foreground italic">
				Daftar Materiil Berdasarkan Satuan Jajaran
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-4 print:hidden">
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
								pernikaQuery.refresh();
							}
						};
					}}
				>
					<button
						type="submit"
						disabled={pernikaQuery.loading}
						class="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-xs font-bold tracking-wider whitespace-nowrap text-primary-foreground uppercase shadow transition hover:bg-primary/90 disabled:opacity-50"
					>
						<RotateCw class="h-4 w-4 {pernikaQuery.loading ? 'animate-spin' : ''}" />
						{pernikaQuery.loading ? 'Memproses...' : 'Muat Ulang Data'}
					</button>
				</form>

				<Button
					onclick={exportCSV}
					variant="secondary"
					disabled={pernikaQuery.loading || !pernikaQuery.current?.groupedReports.length}
					class="rounded px-4 py-2 text-sm whitespace-nowrap shadow-sm transition-opacity"
				>
					Ekspor CSV
				</Button>
			</div>
		</div>
	</div>

	<div class="overflow-x-auto border-[1.5px] border-border">
		<table class="w-full border-collapse text-[11.5px]">
			<thead>
				<tr class="bg-muted font-bold uppercase">
					<th class="w-10 border border-border px-1 py-3" rowspan="2">No</th>
					{#if isParentOrg}
						<th class="border border-border px-4 py-3" rowspan="2">Satuan</th>
					{/if}
					<th class="border border-border px-4 py-3 text-left" rowspan="2"
						>Nama Materiil / Jenis Alkom</th
					>
					<th class="border border-border px-4 py-3" rowspan="2">Merek / Type</th>
					<th class="border border-border px-2 py-3" rowspan="2">Satuan</th>
					<th class="border border-border px-2 py-3" rowspan="2">Jumlah</th>
					<th class="border border-border py-1" colspan="3">Kondisi</th>
					<th class="border border-border px-4 py-3" rowspan="2">Ket</th>
				</tr>
				<tr class="bg-muted font-bold uppercase">
					<th class="w-12 border border-border px-2 py-1">B</th>
					<th class="w-12 border border-border px-2 py-1">RR</th>
					<th class="w-12 border border-border px-2 py-1">RB</th>
				</tr>
			</thead>
			<tbody>
				{#if pernikaQuery.loading}
					{#each Array(10) as _, i (i)}
						<tr class="border-b border-border">
							<td class="border border-border p-2 text-center"
								><Skeleton class="mx-auto h-3 w-4" /></td
							>
							{#if isParentOrg}
								<td class="border border-border p-2 px-4"><Skeleton class="mx-auto h-3 w-20" /></td>
							{/if}
							<td class="border border-border p-2 px-4"><Skeleton class="h-3 w-32" /></td>
							<td class="border border-border p-2 px-4 text-center"
								><Skeleton class="mx-auto h-3 w-20" /></td
							>
							<td class="border border-border p-2 text-center"
								><Skeleton class="mx-auto h-3 w-8" /></td
							>
							<td class="border border-border p-2 text-center font-bold"
								><Skeleton class="mx-auto h-3 w-8" /></td
							>
							<td class="border border-border p-2 text-center font-bold text-success"
								><Skeleton class="mx-auto h-3 w-4" /></td
							>
							<td class="border border-border p-2 text-center font-bold text-primary"
								><Skeleton class="mx-auto h-3 w-4" /></td
							>
							<td class="border border-border p-2 text-center font-bold text-destructive"
								><Skeleton class="mx-auto h-3 w-4" /></td
							>
							<td class="border border-border p-2 px-4 text-left"><Skeleton class="h-3 w-24" /></td>
						</tr>
					{/each}
				{:else if pernikaQuery.current && pernikaQuery.current.groupedReports.length > 0}
					{#each pernikaQuery.current.groupedReports as org (org.orgName)}
						{#each org.items as row, i (row.index)}
							<tr class="border-b border-border uppercase hover:bg-muted/30">
								<td class="border border-border p-2 text-center font-mono">
									{row.index}
								</td>

								{#if isParentOrg}
									{#if i === 0}
										<td
											class="border border-border bg-muted/50 p-2 px-4 text-center font-bold"
											rowspan={org.items.length}
										>
											{org.orgName}
										</td>
									{/if}
								{/if}

								<td class="border border-border p-2 px-4 text-left font-semibold">{row.itemName}</td
								>
								<td class="border border-border p-2 px-4 text-center">{row.brand || '-'}</td>
								<td class="border border-border p-2 text-center">{row.unit}</td>

								<td class="border border-border bg-muted/20 p-2 text-center font-bold"
									>{row.total}</td
								>

								<td class="border border-border p-2 text-center font-bold text-success"
									>{row.baik || 0}</td
								>
								<td class="border border-border p-2 text-center font-bold text-primary"
									>{row.rr || 0}</td
								>
								<td class="border border-border p-2 text-center font-bold text-destructive"
									>{row.rb || 0}</td
								>

								<td
									class="border border-border p-2 px-4 text-left text-muted-foreground normal-case italic"
								>
									{row.ket || '-'}
								</td>
							</tr>
						{/each}
					{/each}
				{:else}
					<tr>
						<td
							colspan={isParentOrg ? 10 : 9}
							class="border border-border bg-muted/20 p-16 text-center text-muted-foreground italic"
						>
							Data tidak tersedia.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	{#if pernikaQuery.current && pernikaQuery.current.pagination.totalPages > 1}
		<div class="flex flex-col-reverse items-center justify-between gap-4 py-4 md:flex-row md:gap-0">
			<div class="text-xs text-muted-foreground">
				Menampilkan <span class="font-semibold text-foreground"
					>{(currentPage - 1) * limit + 1}</span
				>
				-
				<span class="font-semibold text-foreground"
					>{Math.min(currentPage * limit, pernikaQuery.current.pagination.totalItems)}</span
				>
				dari
				<span class="font-semibold text-foreground"
					>{pernikaQuery.current.pagination.totalItems}</span
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
					{#each Array(pernikaQuery.current.pagination.totalPages) as _, i}
						{@const p = i + 1}
						{#if p === 1 || p === pernikaQuery.current.pagination.totalPages || (p >= currentPage - 1 && p <= currentPage + 1)}
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
					disabled={currentPage >= pernikaQuery.current.pagination.totalPages}
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
	@media print {
		button {
			display: none !important;
		}
		th,
		td {
			border: 1px solid black !important;
		}
	}
</style>
