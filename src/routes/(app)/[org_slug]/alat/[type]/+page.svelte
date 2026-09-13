<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { getAlatData } from './alat.remote';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import {
		SearchableSelect,
		SearchableSelectContent,
		SearchableSelectItem,
		SearchableSelectTrigger
	} from '$lib/components/ui/searchable-select';
	import {
		Search,
		Plus,
		Pencil,
		Package,
		ArrowRightLeft,
		Info,
		Ellipsis,
		SlidersHorizontal,
		X,
		RotateCcw
	} from '@lucide/svelte';
	import {
		equipmentConditionColor,
		equipmentConditionLabel,
		equipmentStatusColor,
		equipmentStatusLabel
	} from '@/enums/equipment-enum';
	import { movementEventTypeLabel } from '@/enums/movement-enum';

	let { data }: { data: PageData } = $props();

	// Search and filter parameters from URL
	const qParam = $derived(page.url.searchParams.get('q') || '');
	const pageParam = $derived(Number(page.url.searchParams.get('page')) || 1);
	const categoryIdParam = $derived(page.url.searchParams.get('categoryId') || '');
	const conditionParam = $derived(page.url.searchParams.get('condition') || '');
	const warehouseIdParam = $derived(page.url.searchParams.get('warehouseId') || '');
	const statusParam = $derived(page.url.searchParams.get('status') || '');

	const alatQuery = $derived(
		getAlatData({
			orgSlug: page.params.org_slug || '',
			type: page.params.type || '',
			q: qParam,
			page: pageParam,
			categoryId: categoryIdParam,
			condition: conditionParam,
			warehouseId: warehouseIdParam,
			status: statusParam
		})
	);

	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	// Selection state
	let selectedIds = $state<string[]>([]);
	const isAllSelected = $derived(
		alatQuery.current?.equipment &&
			alatQuery.current.equipment.length > 0 &&
			selectedIds.length === alatQuery.current.equipment.length
	);

	function toggleSelectAll() {
		if (isAllSelected) {
			selectedIds = [];
		} else if (alatQuery.current?.equipment) {
			selectedIds = alatQuery.current.equipment.map((item: any) => item.id);
		}
	}

	function toggleSelect(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((i) => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
	}

	const typeLabel = $derived(page.params.type === 'alpernika' ? 'Pernika & Lek' : 'Alkomlek');

	function openMutate(id: string) {
		goto(`/${page.params.org_slug}/alat/${page.params.type}/mutate/${id}`);
	}

	// Advanced filter dialog state
	let isFilterModalOpen = $state(false);
	let draftCategoryId = $state('');
	let draftCondition = $state('');
	let draftWarehouseId = $state('');
	let draftStatus = $state('');

	function openFilterModal() {
		draftCategoryId = page.url.searchParams.get('categoryId') || '';
		draftCondition = page.url.searchParams.get('condition') || '';
		draftWarehouseId = page.url.searchParams.get('warehouseId') || '';
		draftStatus = page.url.searchParams.get('status') || '';
		isFilterModalOpen = true;
	}

	function applyFilters() {
		const newUrl = new URL(page.url);
		if (draftCategoryId) newUrl.searchParams.set('categoryId', draftCategoryId);
		else newUrl.searchParams.delete('categoryId');

		if (draftCondition) newUrl.searchParams.set('condition', draftCondition);
		else newUrl.searchParams.delete('condition');

		if (draftWarehouseId) newUrl.searchParams.set('warehouseId', draftWarehouseId);
		else newUrl.searchParams.delete('warehouseId');

		if (draftStatus) newUrl.searchParams.set('status', draftStatus);
		else newUrl.searchParams.delete('status');

		newUrl.searchParams.set('page', '1');

		isFilterModalOpen = false;
		goto(newUrl.toString(), { keepFocus: true, noScroll: true });
	}

	function resetDraftFilters() {
		draftCategoryId = '';
		draftCondition = '';
		draftWarehouseId = '';
		draftStatus = '';
	}

	function clearAllFilters() {
		const newUrl = new URL(page.url);
		newUrl.searchParams.delete('categoryId');
		newUrl.searchParams.delete('condition');
		newUrl.searchParams.delete('warehouseId');
		newUrl.searchParams.delete('status');
		newUrl.searchParams.set('page', '1');

		resetDraftFilters();
		goto(newUrl.toString(), { keepFocus: true, noScroll: true });
	}

	function removeSingleFilter(key: 'categoryId' | 'condition' | 'warehouseId' | 'status') {
		const newUrl = new URL(page.url);
		newUrl.searchParams.delete(key);
		newUrl.searchParams.set('page', '1');
		goto(newUrl.toString(), { keepFocus: true, noScroll: true });
	}

	function resetAll() {
		const newUrl = new URL(page.url);
		newUrl.searchParams.delete('q');
		newUrl.searchParams.delete('categoryId');
		newUrl.searchParams.delete('condition');
		newUrl.searchParams.delete('warehouseId');
		newUrl.searchParams.delete('status');
		newUrl.searchParams.set('page', '1');

		resetDraftFilters();
		goto(newUrl.toString(), { keepFocus: true, noScroll: true });
	}

	const activeFilterCount = $derived.by(() => {
		let count = 0;
		if (categoryIdParam) count++;
		if (conditionParam) count++;
		if (warehouseIdParam) count++;
		if (statusParam) count++;
		return count;
	});

	const formattedCategories = $derived(
		(data.categories || [])
			.map((c: any) => ({
				id: c.id,
				name: c.name,
				displayName: c.parent ? `${c.parent.name} > ${c.name}` : c.name
			}))
			.sort((a: any, b: any) => a.displayName.localeCompare(b.displayName))
	);

	const selectedCategoryTriggerLabel = $derived.by(() => {
		if (!draftCategoryId) return 'Semua Kategori';
		if (draftCategoryId === 'none') return 'Tanpa Kategori';
		const found = formattedCategories.find((c: any) => c.id === draftCategoryId);
		return found ? found.displayName : 'Semua Kategori';
	});

	const selectedConditionTriggerLabel = $derived.by(() => {
		if (!draftCondition) return 'Semua Kondisi';
		return equipmentConditionLabel[draftCondition] || draftCondition;
	});

	const selectedWarehouseTriggerLabel = $derived.by(() => {
		if (!draftWarehouseId) return 'Semua Gudang';
		if (draftWarehouseId === 'none') return 'Tanpa Gudang';
		const found = (data.warehouses || []).find((w: any) => w.id === draftWarehouseId);
		return found ? found.name : 'Semua Gudang';
	});

	const selectedStatusTriggerLabel = $derived.by(() => {
		if (!draftStatus) return 'Semua Status';
		return equipmentStatusLabel[draftStatus] || draftStatus;
	});

	const activeCategoryLabel = $derived.by(() => {
		if (!categoryIdParam) return null;
		if (categoryIdParam === 'none') return 'Tanpa Kategori';
		const found = formattedCategories.find((c: any) => c.id === categoryIdParam);
		return found ? found.displayName : categoryIdParam;
	});

	const activeConditionLabel = $derived.by(() => {
		if (!conditionParam) return null;
		return equipmentConditionLabel[conditionParam] || conditionParam;
	});

	const activeWarehouseLabel = $derived.by(() => {
		if (!warehouseIdParam) return null;
		if (warehouseIdParam === 'none') return 'Tanpa Gudang';
		const found = (data.warehouses || []).find((w: any) => w.id === warehouseIdParam);
		return found ? found.name : warehouseIdParam;
	});

	const activeStatusLabel = $derived.by(() => {
		if (!statusParam) return null;
		return equipmentStatusLabel[statusParam] || statusParam;
	});

	function getPageHref(newPage: number) {
		const newUrl = new URL(page.url);
		newUrl.searchParams.set('page', newPage.toString());
		return `${newUrl.pathname}?${newUrl.searchParams.toString()}`;
	}
</script>

<div class="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div class="flex items-center gap-4">
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
					Data {typeLabel}
				</h1>
				<p class="text-sm text-muted-foreground">
					Kelola aset dan peralatan {typeLabel.toLowerCase()} satuan.
				</p>
			</div>
		</div>
		<div class="flex flex-wrap gap-2 md:gap-3">
			<!-- <Button
				href="/{page.params.org_slug}/alat/batch-mutate{selectedIds.length > 0
					? `?ids=${selectedIds.join(',')}`
					: ''}"
				variant="outline"
				class="gap-2"
			>
				<ArrowRightLeft class="size-4" />
				Mutasi Batch {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
			</Button> -->
			<Button
				variant="outline"
				href="/{page.params.org_slug}/alat/{page.params.type}/batch-create"
				class="w-full gap-2 md:w-fit"
			>
				<Plus class="size-4" />
				Batch Input Alat
			</Button>
			<Button
				href="/{page.params.org_slug}/alat/{page.params.type}/create"
				class="w-full gap-2 md:w-fit"
			>
				<Plus class="size-4" />
				Tambah Alat
			</Button>
		</div>
	</div>

	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-2 md:gap-4">
			<div class="relative min-w-60 flex-1">
				<form method="GET" class="flex items-center gap-2">
					<div class="relative flex-1">
						<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							name="q"
							placeholder="Cari nama barang..."
							class="pl-10"
							value={page.url.searchParams.get('q')}
						/>
					</div>
					{#if categoryIdParam}
						<input type="hidden" name="categoryId" value={categoryIdParam} />
					{/if}
					{#if conditionParam}
						<input type="hidden" name="condition" value={conditionParam} />
					{/if}
					{#if warehouseIdParam}
						<input type="hidden" name="warehouseId" value={warehouseIdParam} />
					{/if}
					{#if statusParam}
						<input type="hidden" name="status" value={statusParam} />
					{/if}
					<Button type="submit" variant="secondary">Cari</Button>
				</form>
			</div>

			<Button
				variant={activeFilterCount > 0 ? 'default' : 'outline'}
				onclick={openFilterModal}
				class="shrink-0 gap-2"
			>
				<SlidersHorizontal class="size-4" />
				<span>Filter Lanjutan</span>
				{#if activeFilterCount > 0}
					<Badge variant="secondary" class="h-5 px-1.5 text-[10px] font-bold">
						{activeFilterCount}
					</Badge>
				{/if}
			</Button>

			{#if activeFilterCount > 0 || qParam}
				<Button
					variant="ghost"
					size="sm"
					onclick={resetAll}
					class="shrink-0 gap-1 text-muted-foreground hover:text-foreground"
				>
					<X class="size-4" />
					Reset
				</Button>
			{/if}
		</div>

		{#if activeFilterCount > 0}
			<div class="flex flex-wrap items-center gap-2 pt-1">
				<span class="text-xs font-medium text-muted-foreground">Filter aktif:</span>
				{#if activeCategoryLabel}
					<Badge variant="secondary" class="gap-1.5 px-2.5 py-1 text-xs font-normal">
						<span>Kategori: <strong class="font-semibold">{activeCategoryLabel}</strong></span>
						<button
							type="button"
							onclick={() => removeSingleFilter('categoryId')}
							class="ml-0.5 rounded-full text-muted-foreground hover:text-foreground"
							title="Hapus filter kategori"
						>
							<X class="size-3" />
						</button>
					</Badge>
				{/if}
				{#if activeConditionLabel}
					<Badge variant="secondary" class="gap-1.5 px-2.5 py-1 text-xs font-normal">
						<span>Kondisi: <strong class="font-semibold">{activeConditionLabel}</strong></span>
						<button
							type="button"
							onclick={() => removeSingleFilter('condition')}
							class="ml-0.5 rounded-full text-muted-foreground hover:text-foreground"
							title="Hapus filter kondisi"
						>
							<X class="size-3" />
						</button>
					</Badge>
				{/if}
				{#if activeWarehouseLabel}
					<Badge variant="secondary" class="gap-1.5 px-2.5 py-1 text-xs font-normal">
						<span>Gudang: <strong class="font-semibold">{activeWarehouseLabel}</strong></span>
						<button
							type="button"
							onclick={() => removeSingleFilter('warehouseId')}
							class="ml-0.5 rounded-full text-muted-foreground hover:text-foreground"
							title="Hapus filter gudang"
						>
							<X class="size-3" />
						</button>
					</Badge>
				{/if}
				{#if activeStatusLabel}
					<Badge variant="secondary" class="gap-1.5 px-2.5 py-1 text-xs font-normal">
						<span>Status: <strong class="font-semibold">{activeStatusLabel}</strong></span>
						<button
							type="button"
							onclick={() => removeSingleFilter('status')}
							class="ml-0.5 rounded-full text-muted-foreground hover:text-foreground"
							title="Hapus filter status"
						>
							<X class="size-3" />
						</button>
					</Badge>
				{/if}
				<Button
					variant="ghost"
					size="sm"
					onclick={clearAllFilters}
					class="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
				>
					Hapus Semua Filter
				</Button>
			</div>
		{/if}
	</div>

	<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row class="bg-muted/50">
						<Table.Head class="w-12.5 text-center">No</Table.Head>
						<Table.Head class="max-w-[30%]">Alat</Table.Head>
						<Table.Head>Gudang</Table.Head>
						<Table.Head>Kondisi</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Mutasi Terakhir</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if alatQuery.loading}
						{#each Array(10) as _, i (i)}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell class="text-center">
									<Skeleton class="mx-auto h-4 w-4" />
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-col gap-2">
										<Skeleton class="h-5 w-50" />
										<Skeleton class="h-4 w-30" />
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<Skeleton class="h-4 w-4" />
										<Skeleton class="h-4 w-25" />
									</div>
								</Table.Cell>
								<Table.Cell>
									<Skeleton class="h-6 w-16 rounded-full" />
								</Table.Cell>
								<Table.Cell>
									<Skeleton class="h-6 w-20 rounded-full" />
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-col gap-1">
										<Skeleton class="h-3 w-16" />
										<Skeleton class="h-3 w-12" />
									</div>
								</Table.Cell>
								<Table.Cell class="text-right">
									<Skeleton class="ml-auto h-8 w-8" />
								</Table.Cell>
							</Table.Row>
						{/each}
					{:else if alatQuery.current && alatQuery.current.equipment.length > 0}
						{#each alatQuery.current.equipment as item, i (item.id)}
							<Table.Row class="transition-colors hover:bg-muted/30">
								<Table.Cell class="text-center font-medium text-muted-foreground">
									{i + 1 + (alatQuery.current.pagination.currentPage - 1) * 10}
								</Table.Cell>
								<Table.Cell class="word-wrap max-w-[30%]">
									<div class="flex flex-col gap-1">
										<span class="line-clamp-2 font-semibold text-foreground md:line-clamp-none"
											>{item.itemName}</span
										>
										<code
											class="w-fit rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] md:text-xs"
										>
											{item.serialNumber || '-'}
										</code>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-1.5 text-sm">
										<Package class="size-3.5 text-muted-foreground" />
										<span class="max-w-30 truncate" title={item.warehouseName}
											>{item.warehouseName || 'Tanpa Gudang'}</span
										>
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge
										variant="outline"
										class="whitespace-nowrap {equipmentConditionColor[item.condition]}"
									>
										{equipmentConditionLabel[item.condition] || item.condition}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<Badge
										variant="secondary"
										class="whitespace-nowrap {equipmentStatusColor[item.status!]}"
									>
										{equipmentStatusLabel[item.status!] || item.status}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									{#if item.lastMovement}
										<div class="flex min-w-25 flex-col gap-0.5">
											<span class="text-xs font-semibold text-primary">
												{movementEventTypeLabel[item.lastMovement.eventType] ||
													item.lastMovement.eventType}
											</span>
											<span class="text-[10px] text-muted-foreground">
												{new Date(item.lastMovement.createdAt).toLocaleDateString('id-ID')}
											</span>
										</div>
									{:else}
										<span class="text-xs text-muted-foreground italic">Belum ada data</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											<Ellipsis class="size-4" />
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end" class="w-48">
											<DropdownMenu.Item
												onclick={() =>
													goto(`/${page.params.org_slug}/alat/${page.params.type}/${item.id}`)}
												class="gap-2"
											>
												<Info class="size-4" /> Lihat Detail
											</DropdownMenu.Item>
											<DropdownMenu.Item onclick={() => openMutate(item.id)} class="gap-2">
												<ArrowRightLeft class="size-4" /> Mutasi
											</DropdownMenu.Item>
											<DropdownMenu.Item
												onclick={() =>
													goto(`/${page.params.org_slug}/alat/${page.params.type}/edit/${item.id}`)}
												class="gap-2"
											>
												<Pencil class="size-4" /> Edit Data
											</DropdownMenu.Item>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</Table.Cell>
							</Table.Row>
						{/each}
					{:else}
						<Table.Row>
							<Table.Cell colspan={7} class="h-32 text-center text-muted-foreground italic">
								Tidak ada data {typeLabel.toLowerCase()} ditemukan{qParam
									? ` untuk pencarian "${qParam}"`
									: ''}{activeFilterCount > 0 ? ' dengan filter yang dipilih' : ''}.
							</Table.Cell>
						</Table.Row>
					{/if}
				</Table.Body>
			</Table.Root>
		</div>

		{#if alatQuery.current && alatQuery.current.pagination.totalPages > 1}
			<div
				class="flex flex-col gap-4 border-t bg-muted/20 px-6 py-4 md:flex-row md:items-center md:justify-between"
			>
				<p class="text-sm font-medium text-muted-foreground">
					Halaman <span class="font-bold text-foreground"
						>{alatQuery.current.pagination.currentPage}</span
					>
					dari {alatQuery.current.pagination.totalPages}
				</p>
				<div class="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={alatQuery.current.pagination.currentPage <= 1}
						href={getPageHref(alatQuery.current.pagination.currentPage - 1)}
					>
						Sebelumnya
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={alatQuery.current.pagination.currentPage >=
							alatQuery.current.pagination.totalPages}
						href={getPageHref(alatQuery.current.pagination.currentPage + 1)}
					>
						Selanjutnya
					</Button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modal Dialog Filter Lanjutan -->
<Dialog.Root bind:open={isFilterModalOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Filter Lanjutan</Dialog.Title>
			<Dialog.Description>
				Saring data {typeLabel.toLowerCase()} berdasarkan kategori, kondisi, gudang, dan status.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-2">
			<!-- Filter Kategori -->
			<div class="space-y-1.5">
				<Label for="filter-category" class="text-xs font-semibold">Kategori</Label>
				<SearchableSelect
					type="single"
					value={draftCategoryId}
					onValueChange={(val) => (draftCategoryId = val || '')}
				>
					<SearchableSelectTrigger id="filter-category" class="w-full">
						{selectedCategoryTriggerLabel}
					</SearchableSelectTrigger>
					<SearchableSelectContent searchPlaceholder="Cari kategori..." class="z-[60]">
						<SearchableSelectItem value="" label="Semua Kategori">
							Semua Kategori
						</SearchableSelectItem>
						<SearchableSelectItem value="none" label="Tanpa Kategori">
							Tanpa Kategori
						</SearchableSelectItem>
						{#each formattedCategories as cat (cat.id)}
							<SearchableSelectItem value={cat.id} label={cat.displayName}>
								{cat.displayName}
							</SearchableSelectItem>
						{/each}
					</SearchableSelectContent>
				</SearchableSelect>
			</div>

			<!-- Filter Kondisi -->
			<div class="space-y-1.5">
				<Label for="filter-condition" class="text-xs font-semibold">Kondisi</Label>
				<Select.Root
					type="single"
					value={draftCondition}
					onValueChange={(val) => (draftCondition = val || '')}
				>
					<Select.Trigger id="filter-condition" class="w-full">
						{selectedConditionTriggerLabel}
					</Select.Trigger>
					<Select.Content class="z-[60]">
						<Select.Item value="" label="Semua Kondisi">Semua Kondisi</Select.Item>
						<Select.Item value="BAIK" label={equipmentConditionLabel['BAIK']}>
							{equipmentConditionLabel['BAIK']}
						</Select.Item>
						<Select.Item value="RUSAK_RINGAN" label={equipmentConditionLabel['RUSAK_RINGAN']}>
							{equipmentConditionLabel['RUSAK_RINGAN']}
						</Select.Item>
						<Select.Item value="RUSAK_BERAT" label={equipmentConditionLabel['RUSAK_BERAT']}>
							{equipmentConditionLabel['RUSAK_BERAT']}
						</Select.Item>
						<Select.Item value="RUSAK_TOTAL" label={equipmentConditionLabel['RUSAK_TOTAL']}>
							{equipmentConditionLabel['RUSAK_TOTAL']}
						</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Filter Gudang -->
			<div class="space-y-1.5">
				<Label for="filter-warehouse" class="text-xs font-semibold">Gudang</Label>
				<Select.Root
					type="single"
					value={draftWarehouseId}
					onValueChange={(val) => (draftWarehouseId = val || '')}
				>
					<Select.Trigger id="filter-warehouse" class="w-full">
						{selectedWarehouseTriggerLabel}
					</Select.Trigger>
					<Select.Content class="z-[60] max-h-60 overflow-y-auto">
						<Select.Item value="" label="Semua Gudang">Semua Gudang</Select.Item>
						<Select.Item value="none" label="Tanpa Gudang">Tanpa Gudang</Select.Item>
						{#each (data.warehouses || []) as wh (wh.id)}
							<Select.Item value={wh.id} label={wh.name}>{wh.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Filter Status -->
			<div class="space-y-1.5">
				<Label for="filter-status" class="text-xs font-semibold">Status</Label>
				<Select.Root
					type="single"
					value={draftStatus}
					onValueChange={(val) => (draftStatus = val || '')}
				>
					<Select.Trigger id="filter-status" class="w-full">
						{selectedStatusTriggerLabel}
					</Select.Trigger>
					<Select.Content class="z-[60]">
						<Select.Item value="" label="Semua Status">Semua Status</Select.Item>
						<Select.Item value="READY" label={equipmentStatusLabel['READY']}>
							{equipmentStatusLabel['READY']}
						</Select.Item>
						<Select.Item value="IN_USE" label={equipmentStatusLabel['IN_USE']}>
							{equipmentStatusLabel['IN_USE']}
						</Select.Item>
						<Select.Item value="TRANSIT" label={equipmentStatusLabel['TRANSIT']}>
							{equipmentStatusLabel['TRANSIT']}
						</Select.Item>
						<Select.Item value="MAINTENANCE" label={equipmentStatusLabel['MAINTENANCE']}>
							{equipmentStatusLabel['MAINTENANCE']}
						</Select.Item>
						<Select.Item value="DISPOSED" label={equipmentStatusLabel['DISPOSED']}>
							{equipmentStatusLabel['DISPOSED']}
						</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		<Dialog.Footer class="flex flex-row items-center justify-between gap-2 pt-2">
			<Button
				variant="ghost"
				size="sm"
				onclick={resetDraftFilters}
				disabled={!draftCategoryId && !draftCondition && !draftWarehouseId && !draftStatus}
				class="gap-1 text-muted-foreground"
			>
				<RotateCcw class="size-3.5" />
				Reset
			</Button>
			<div class="flex items-center gap-2">
				<Button variant="outline" onclick={() => (isFilterModalOpen = false)}>
					Batal
				</Button>
				<Button onclick={applyFilters}>
					Terapkan Filter
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={() => (notificationOpen = false)}
/>
