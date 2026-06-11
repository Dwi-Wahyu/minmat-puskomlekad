<script lang="ts">
	import type { PageData } from './$types';
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { CardTitle } from '$lib/components/ui/card';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { getKomunityData } from './komunity.remote';
	import { Search, ChevronLeft, ChevronRight, Building2, Filter } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data }: { data: PageData } = $props();

	// Filters State
	let searchQuery = $state(page.url.searchParams.get('search') || '');
	let typeFilter = $state(page.url.searchParams.get('type') || '');
	let categoryFilter = $state(page.url.searchParams.get('category') || '');

	const limit = $derived(Number(page.url.searchParams.get('limit')) || 25);
	const currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);

	const komunityQuery = $derived(
		getKomunityData({
			orgId: page.url.searchParams.get('orgId') || '',
			search: page.url.searchParams.get('search') || '',
			type: page.url.searchParams.get('type') || '',
			category: page.url.searchParams.get('category') || '',
			page: currentPage,
			limit: limit
		})
	);

	const paginatedItems = $derived(komunityQuery.current?.items || []);

	function updateFilters() {
		const newUrl = new URL(page.url);
		if (searchQuery) newUrl.searchParams.set('search', searchQuery);
		else newUrl.searchParams.delete('search');

		if (typeFilter) newUrl.searchParams.set('type', typeFilter);
		else newUrl.searchParams.delete('type');

		if (categoryFilter) newUrl.searchParams.set('category', categoryFilter);
		else newUrl.searchParams.delete('category');

		newUrl.searchParams.set('page', '1');

		goto(newUrl.toString(), { keepFocus: true, noScroll: true });
	}

	function handleOrgChange(val: string | undefined) {
		if (!val) return;
		const newUrl = new URL(page.url);
		newUrl.searchParams.set('orgId', val);
		newUrl.searchParams.set('page', '1');
		goto(newUrl.toString());
	}

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

	let selectedOrgName = $derived(
		komunityQuery.current?.organizations.find(
			(o: any) => o.id === komunityQuery.current?.selectedOrgId
		)?.name || 'Pilih Kesatuan'
	);

	const typeOptions = [
		{ value: '', label: 'Semua Jenis' },
		{ value: 'ASSET', label: 'Alat (Asset)' },
		{ value: 'CONSUMABLE', label: 'Barang (Consumable)' }
	];

	const categoryOptions = [
		{ value: '', label: 'Semua Kategori' },
		{ value: 'ALKOMLEK', label: 'ALKOMLEK' },
		{ value: 'PERNIKA_LEK', label: 'PERNIKA_LEK' }
	];

	const visiblePages = $derived.by(() => {
		const total = komunityQuery.current?.pagination.totalPages || 0;
		const maxButtons = 4;
		if (total <= maxButtons) {
			return Array.from({ length: total }, (_, i) => i + 1);
		}
		let start = currentPage - 1;
		if (start < 1) start = 1;
		if (start + maxButtons - 1 > total) {
			start = total - maxButtons + 1;
		}
		return Array.from({ length: maxButtons }, (_, i) => start + i);
	});
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div class="flex flex-col gap-1">
			<CardTitle class="text-2xl font-bold">Gudang Komunity</CardTitle>
			<p class="text-sm text-muted-foreground">Pergerakan inventaris gudang komunity</p>
		</div>
		<div class="flex flex-wrap items-end gap-3">
			{#if komunityQuery.current?.isMabes}
				<div class="flex flex-col gap-1.5">
					<Label for="org-filter">Filter Kesatuan</Label>
					<SearchableSelect.Root
						type="single"
						value={komunityQuery.current.selectedOrgId}
						onValueChange={handleOrgChange}
					>
						<SearchableSelect.Trigger class="w-[200px] border-2">
							<Building2 class="mr-2 h-4 w-4 opacity-50" />
							{selectedOrgName}
						</SearchableSelect.Trigger>
						<SearchableSelect.Content>
							{#each komunityQuery.current.organizations as org (org.id)}
								<SearchableSelect.Item value={org.id} label={org.name}
									>{org.name}</SearchableSelect.Item
								>
							{/each}
						</SearchableSelect.Content>
					</SearchableSelect.Root>
				</div>
			{/if}

			<div class="flex flex-col gap-1.5">
				<Label for="type-filter">Jenis</Label>
				<Select.Root type="single" bind:value={typeFilter} onValueChange={updateFilters}>
					<Select.Trigger class="w-[180px] border-2">
						{typeOptions.find((o: any) => o.value === typeFilter)?.label || 'Semua Jenis'}
					</Select.Trigger>
					<Select.Content>
						{#each typeOptions as opt}
							<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="flex flex-col gap-1.5">
				<Label for="category-filter">Kategori Alat</Label>
				<Select.Root type="single" bind:value={categoryFilter} onValueChange={updateFilters}>
					<Select.Trigger class="w-[180px] border-2">
						{categoryOptions.find((o: any) => o.value === categoryFilter)?.label ||
							'Semua Kategori'}
					</Select.Trigger>
					<Select.Content>
						{#each categoryOptions as opt}
							<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="flex flex-col gap-1.5">
				<Label for="limit-filter">Tampilkan</Label>
				<Select.Root type="single" value={limit.toString()} onValueChange={updateLimit}>
					<Select.Trigger class="w-[120px] border-2">
						{limit} baris
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="10" label="10 baris">10 baris</Select.Item>
						<Select.Item value="25" label="25 baris">25 baris</Select.Item>
						<Select.Item value="50" label="50 baris">50 baris</Select.Item>
						<Select.Item value="100" label="100 baris">100 baris</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>

			<div class="flex flex-col gap-1.5">
				<Label for="search">Cari Barang</Label>
				<div class="relative max-w-md">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id="search"
						type="text"
						placeholder="Cari SN atau nama..."
						class="w-[250px] border-2 pl-10"
						bind:value={searchQuery}
						onkeydown={(e) => e.key === 'Enter' && updateFilters()}
					/>
				</div>
			</div>

			<Button variant="secondary" onclick={updateFilters} title="Refresh Filter">
				Terapkan Filter
			</Button>
		</div>
	</div>

	<div class="rounded-lg border border-border bg-card shadow-sm">
		<div class="overflow-x-auto">
			<Table.Table class="w-full border-collapse text-sm">
				<Table.Header class="sticky top-0 bg-muted/50">
					<Table.Row class="border-b-2 border-border">
						<Table.Head rowspan={2} class="border-r border-border text-center font-bold"
							>Barang</Table.Head
						>
						<Table.Head rowspan={2} class="border-r border-border text-center font-bold"
							>Stok</Table.Head
						>
						<Table.Head rowspan={2} class="border-r border-border text-center font-bold"
							>Masuk</Table.Head
						>
						<Table.Head rowspan={2} class="border-r border-border text-center font-bold"
							>Keluar</Table.Head
						>
						<Table.Head class="border-r border-border text-center font-bold" colspan={3}
							>Sisa</Table.Head
						>
						<Table.Head rowspan={2} class="border-r border-border text-center font-bold"
							>Ket</Table.Head
						>
						<Table.Head rowspan={2} class="text-center font-bold">Tahun</Table.Head>
					</Table.Row>

					<Table.Row class="border-b-2 border-border bg-muted/30">
						<Table.Head class="border-r border-border text-center font-semibold text-success"
							>B</Table.Head
						>
						<Table.Head class="border-r border-border text-center font-semibold text-primary"
							>RR</Table.Head
						>
						<Table.Head class="border-r border-border text-center font-semibold text-destructive"
							>RB</Table.Head
						>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#if komunityQuery.loading}
						{#each Array(5) as _, i (i)}
							<Table.Row class="border-b border-border">
								<Table.Cell class="border-r border-border">
									<div class="flex flex-col gap-2">
										<Skeleton class="h-5 w-[150px]" />
										<Skeleton class="h-3 w-[100px]" />
									</div>
								</Table.Cell>
								<Table.Cell class="border-r border-border">
									<Skeleton class="mx-auto h-5 w-8" />
								</Table.Cell>
								<Table.Cell class="border-r border-border">
									<Skeleton class="mx-auto h-5 w-8" />
								</Table.Cell>
								<Table.Cell class="border-r border-border">
									<Skeleton class="mx-auto h-5 w-8" />
								</Table.Cell>
								<Table.Cell class="border-r border-border">
									<Skeleton class="mx-auto h-5 w-8" />
								</Table.Cell>
								<Table.Cell class="border-r border-border">
									<Skeleton class="mx-auto h-5 w-8" />
								</Table.Cell>
								<Table.Cell class="border-r border-border">
									<Skeleton class="mx-auto h-5 w-8" />
								</Table.Cell>
								<Table.Cell class="border-r border-border">
									<Skeleton class="h-3 w-[100px]" />
								</Table.Cell>
								<Table.Cell>
									<Skeleton class="mx-auto h-5 w-12" />
								</Table.Cell>
							</Table.Row>
						{/each}
					{:else if paginatedItems.length === 0}
						<Table.Row>
							<Table.Cell colspan={12} class="h-32 text-center text-muted-foreground italic">
								Tidak ada data yang sesuai dengan filter{page.url.searchParams.get('search')
									? ` untuk pencarian "${page.url.searchParams.get('search')}"`
									: ''}.
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each paginatedItems as item (item.id)}
							<Table.Row class="border-b border-border hover:bg-muted/50">
								<Table.Cell class="border-r border-border">
									<div class="font-semibold">{item.namaBarang}</div>
									<div class="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
										<span class="font-mono text-[10px] text-muted-foreground">
											{item.matkomplek}
										</span>
										<span class="text-[10px] font-medium text-primary/70 uppercase">
											• {item.tipe === 'ASSET' ? 'Alat' : 'Barang'}
											{#if item.equipmentType}
												({item.equipmentType})
											{/if}
										</span>
									</div>
								</Table.Cell>

								<Table.Cell class="border-r border-border text-center font-semibold">
									{item.stok}
								</Table.Cell>

								<Table.Cell class="border-r border-border text-center text-success">
									{item.masuk}
								</Table.Cell>

								<Table.Cell class="border-r border-border text-center text-destructive">
									{item.keluar}
								</Table.Cell>

								<Table.Cell class="border-r border-border text-center font-medium">
									{item.sisaBaik}
								</Table.Cell>

								<Table.Cell class="border-r border-border text-center font-medium text-primary">
									{item.sisaRR}
								</Table.Cell>

								<Table.Cell class="border-r border-border text-center font-medium text-destructive">
									{item.sisaRB}
								</Table.Cell>

								<Table.Cell class="border-r border-border text-xs">
									{item.keterangan}
								</Table.Cell>

								<Table.Cell class="text-center">
									{item.tahun}
								</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Table>
		</div>

		{#if komunityQuery.current && komunityQuery.current.pagination.totalPages > 1}
			<div
				class="flex flex-col-reverse items-center justify-between gap-4 border-t border-border px-6 py-4 md:flex-row md:gap-0"
			>
				<div class="text-xs text-muted-foreground">
					Menampilkan <span class="font-semibold text-foreground"
						>{(currentPage - 1) * limit + 1}</span
					>
					-
					<span class="font-semibold text-foreground"
						>{Math.min(currentPage * limit, komunityQuery.current.pagination.totalItems)}</span
					>
					dari
					<span class="font-semibold text-foreground"
						>{komunityQuery.current.pagination.totalItems}</span
					> data
				</div>
				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onclick={() => goToPage(currentPage - 1)}
						disabled={currentPage <= 1}
						class="h-8 gap-1 border-2 px-2 text-xs"
					>
						<ChevronLeft class="h-3 w-3" />
						Sebelumnya
					</Button>
					<div class="flex items-center gap-1">
						{#each visiblePages as p}
							<Button
								variant={currentPage === p ? 'default' : 'ghost'}
								size="sm"
								onclick={() => goToPage(p)}
								class="h-8 w-8 p-0 text-xs"
							>
								{p}
							</Button>
						{/each}
					</div>
					<Button
						variant="outline"
						size="sm"
						onclick={() => goToPage(currentPage + 1)}
						disabled={currentPage >= komunityQuery.current.pagination.totalPages}
						class="h-8 gap-1 border-2 px-2 text-xs"
					>
						Selanjutnya
						<ChevronRight class="h-3 w-3" />
					</Button>
				</div>
			</div>
		{/if}
	</div>
</div>
