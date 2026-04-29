<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { CardTitle } from '$lib/components/ui/card';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Search, ChevronLeft, ChevronRight, Building2, Filter } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	// Filters State
	let searchQuery = $state(data.filters.search);
	let typeFilter = $state(data.filters.type);
	let categoryFilter = $state(data.filters.category);

	let currentPage = $state(1);
	let itemsPerPage = $state(10);

	let totalItems = $derived(data.items.length);
	let totalPages = $derived(Math.ceil(totalItems / itemsPerPage));
	let paginatedItems = $derived(
		data.items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	function updateFilters() {
		const newUrl = new URL(page.url);
		if (searchQuery) newUrl.searchParams.set('search', searchQuery);
		else newUrl.searchParams.delete('search');

		if (typeFilter) newUrl.searchParams.set('type', typeFilter);
		else newUrl.searchParams.delete('type');

		if (categoryFilter) newUrl.searchParams.set('category', categoryFilter);
		else newUrl.searchParams.delete('category');

		currentPage = 1; // Reset to first page on filter change
		goto(newUrl.toString(), { keepFocus: true, noScroll: true });
	}

	function handleOrgChange(val: string | undefined) {
		if (!val) return;
		const newUrl = new URL(page.url);
		newUrl.searchParams.set('orgId', val);
		goto(newUrl.toString());
	}

	let selectedOrgName = $derived(
		data.organizations.find((o) => o.id === data.selectedOrgId)?.name || 'Pilih Kesatuan'
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
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div class="flex flex-col gap-1">
			<CardTitle class="text-2xl font-bold">Gudang Komunity</CardTitle>
			<p class="text-sm text-muted-foreground">Pergerakan inventaris gudang komunity</p>
		</div>
		<div class="flex flex-wrap items-end gap-3">
			{#if data.isMabes}
				<div class="flex flex-col gap-1.5">
					<Label for="org-filter">Filter Kesatuan</Label>
					<SearchableSelect.Root
						type="single"
						value={data.selectedOrgId}
						onValueChange={handleOrgChange}
					>
						<SearchableSelect.Trigger class="w-[200px] border-2">
							<Building2 class="mr-2 h-4 w-4 opacity-50" />
							{selectedOrgName}
						</SearchableSelect.Trigger>
						<SearchableSelect.Content>
							{#each data.organizations as org (org.id)}
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
						{typeOptions.find((o) => o.value === typeFilter)?.label || 'Semua Jenis'}
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
						{categoryOptions.find((o) => o.value === categoryFilter)?.label || 'Semua Kategori'}
					</Select.Trigger>
					<Select.Content>
						{#each categoryOptions as opt}
							<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
						{/each}
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

			<Button variant="secondary" size="icon" onclick={updateFilters} title="Refresh Filter">
				<Filter class="size-4" />
			</Button>
		</div>
	</div>

	<div class="rounded-lg border border-border bg-card shadow-sm">
		<div class="overflow-x-auto">
			<Table.Table class="w-full border-collapse text-sm">
				<Table.Header class="sticky top-0 bg-muted/50">
					<Table.Row class="border-b-2 border-border">
						<Table.Head rowspan={2} class="border-r border-border text-center font-bold">Barang</Table.Head>
						<Table.Head rowspan={2} class="border-r border-border text-center font-bold">Stok</Table.Head>
						<Table.Head rowspan={2} class="border-r border-border text-center font-bold">Masuk</Table.Head>
						<Table.Head rowspan={2} class="border-r border-border text-center font-bold">Keluar</Table.Head>
						<Table.Head class="border-r border-border text-center font-bold" colspan={3}>Sisa</Table.Head>
						<Table.Head rowspan={2} class="border-r border-border text-center font-bold">Ket</Table.Head>
						<Table.Head rowspan={2} class="text-center font-bold">Tahun</Table.Head>
					</Table.Row>

					<Table.Row class="border-b-2 border-border bg-muted/30">
						<Table.Head class="border-r border-border text-center font-semibold text-success">B</Table.Head>
						<Table.Head class="border-r border-border text-center font-semibold text-primary">RR</Table.Head>
						<Table.Head class="border-r border-border text-center font-semibold text-destructive">RB</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#if paginatedItems.length === 0}
						<Table.Row>
							<Table.Cell colspan={12} class="h-32 text-center text-muted-foreground">
								Tidak ada data yang sesuai dengan filter.
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each paginatedItems as item (item.id)}
							<Table.Row class="border-b border-border hover:bg-muted/50">
								<Table.Cell class="border-r border-border">
									<div class="font-semibold">{item.namaBarang}</div>
									<div class="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
										<span class="font-mono text-[10px] text-muted-foreground">
											{item.matkomplek}
										</span>
										<span class="text-[10px] font-medium uppercase text-primary/70">
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

		{#if totalPages > 1}
			<div class="flex items-center justify-between rounded-b-lg border-t border-border px-6 py-4">
				<div class="text-sm text-muted-foreground">
					Menampilkan <span class="font-semibold text-foreground"
						>{(currentPage - 1) * itemsPerPage + 1}</span
					>
					-
					<span class="font-semibold text-foreground"
						>{Math.min(currentPage * itemsPerPage, totalItems)}</span
					>
					dari <span class="font-semibold text-foreground">{totalItems}</span> data
				</div>
				<div class="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onclick={() => (currentPage = Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
					>
						<ChevronLeft class="mr-1 h-4 w-4" />
						Sebelumnya
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
						disabled={currentPage === totalPages}
					>
						Selanjutnya
						<ChevronRight class="ml-1 h-4 w-4" />
					</Button>
				</div>
			</div>
		{/if}
	</div>
</div>
