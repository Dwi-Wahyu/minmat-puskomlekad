<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		ArrowLeft,
		Building2,
		MapPin,
		Trash2,
		Save,
		Sparkles,
		AlertTriangle,
		Search,
		Info,
		Layers,
		Plus,
		CheckCircle2,
		ListChecks
	} from '@lucide/svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import {
		SearchableSelect,
		SearchableSelectContent,
		SearchableSelectItem,
		SearchableSelectTrigger
	} from '$lib/components/ui/searchable-select';
	import * as Select from '$lib/components/ui/select';
	import { untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Form State
	let inputMode = $state<'list' | 'new'>('list');
	let selectedItemId = $state('');
	let selectedItemName = $state('');
	let newItemName = $state('');
	let brand = $state('');
	let isSet = $state(false);
	let batchComponentNames = $state<string[]>(['Antena Satelit', 'Adaptor']);

	// Category on-the-fly State
	let categoryMode = $state<'select' | 'new'>('select');
	let categoryId = $state('');
	let newCategoryName = $state('');
	let parentCategoryId = $state('');

	let totalKomunity = $state(0);
	let totalBalkir = $state(0);
	let totalTransito = $state(0);

	// Dynamic Rows State
	interface RowComponent {
		name: string;
		condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'RUSAK_TOTAL';
	}

	interface Row {
		index: number;
		serialNumber: string;
		classification: 'BALKIR' | 'KOMUNITY' | 'TRANSITO';
		condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'RUSAK_TOTAL';
		subUnitId: string | undefined;
		subUnitName: string | null;
		components?: RowComponent[];
	}
	let rows = $state<Row[]>([]);

	// Search Modal State
	let itemsModalOpen = $state(false);
	let modalSearchQuery = $state('');
	let modalItemsList = $state<any[]>([]);
	let isModalLoading = $state(false);
	let debounceTimeout: any;

	// Lending Dialog State
	let lendingDialogOpen = $state(false);
	let activeRowIndex = $state<number | null>(null);
	let tempSubUnitId = $state<string | undefined>(undefined);

	// Components Dialog State
	let componentsDialogOpen = $state(false);
	let activeComponentRowIndex = $state<number | null>(null);
	let tempRowComponents = $state<RowComponent[]>([]);

	// Submit Loading & Notifications
	let isSubmitting = $state(false);
	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error'>('success');

	// Derived values for validation
	const isHeadBalkir = $derived(data.warehouseHeadType === 'BALKIR');
	const isHeadTransito = $derived(data.warehouseHeadType === 'TRANSITO');
	const isHeadKomunity = $derived(data.warehouseHeadType === 'KOMUNITY');

	const totalAlat = $derived(
		isHeadBalkir
			? totalBalkir
			: isHeadTransito
				? totalTransito
				: isHeadKomunity
					? totalKomunity
					: totalKomunity
	);

	const isValidationError = $derived(
		data.warehouseHeadType === null && totalBalkir > totalKomunity
	);

	function getRowComponents(existingRow?: Row): RowComponent[] {
		if (!isSet) return [];
		const existing = existingRow?.components || [];
		return batchComponentNames.filter(Boolean).map((name) => {
			const found = existing.find((c) => c.name === name);
			return {
				name,
				condition: found?.condition || 'BAIK'
			};
		});
	}

	function openComponentsDialog(index: number) {
		activeComponentRowIndex = index;
		const row = rows[index];
		const existingComps = row.components || [];

		tempRowComponents = batchComponentNames.filter(Boolean).map((name) => {
			const found = existingComps.find((c) => c.name === name);
			return {
				name,
				condition: found?.condition || 'BAIK'
			};
		});

		componentsDialogOpen = true;
	}

	function saveComponents() {
		if (activeComponentRowIndex !== null && rows[activeComponentRowIndex]) {
			rows[activeComponentRowIndex].components = JSON.parse(JSON.stringify(tempRowComponents));
		}
		componentsDialogOpen = false;
	}

	// Auto-assign values when total or type changes
	$effect(() => {
		const headType = data.warehouseHeadType;
		const currentTotalBalkir = totalBalkir;
		const currentTotalTransito = totalTransito;
		const currentTotalKomunity = totalKomunity;
		const currentIsSet = isSet;
		const currentBatchComponents = batchComponentNames;

		untrack(() => {
			let count = 0;
			let list: Row[] = [];

			if (headType === 'BALKIR') {
				count = currentTotalBalkir;
				for (let i = 0; i < count; i++) {
					list.push({
						index: i,
						serialNumber: rows[i]?.serialNumber || '',
						classification: 'BALKIR',
						condition: 'RUSAK_BERAT',
						subUnitId: rows[i]?.subUnitId || undefined,
						subUnitName: rows[i]?.subUnitName || null,
						components: getRowComponents(rows[i])
					});
				}
			} else if (headType === 'TRANSITO') {
				count = currentTotalTransito;
				for (let i = 0; i < count; i++) {
					list.push({
						index: i,
						serialNumber: rows[i]?.serialNumber || '',
						classification: 'TRANSITO',
						condition: 'BAIK',
						subUnitId: rows[i]?.subUnitId || undefined,
						subUnitName: rows[i]?.subUnitName || null,
						components: getRowComponents(rows[i])
					});
				}
			} else if (headType === 'KOMUNITY') {
				count = currentTotalKomunity;
				for (let i = 0; i < count; i++) {
					list.push({
						index: i,
						serialNumber: rows[i]?.serialNumber || '',
						classification: 'KOMUNITY',
						condition: 'BAIK',
						subUnitId: rows[i]?.subUnitId || undefined,
						subUnitName: rows[i]?.subUnitName || null,
						components: getRowComponents(rows[i])
					});
				}
			} else {
				// Normal flow: totalKomunity is the grand total
				count = currentTotalKomunity;
				// Only auto assign when there's no validation error
				if (currentTotalBalkir <= currentTotalKomunity) {
					for (let i = 0; i < count; i++) {
						const isBalkir = i < currentTotalBalkir;
						list.push({
							index: i,
							serialNumber: rows[i]?.serialNumber || '',
							classification: isBalkir ? 'BALKIR' : 'KOMUNITY',
							condition: isBalkir ? 'RUSAK_BERAT' : 'BAIK',
							subUnitId: rows[i]?.subUnitId || undefined,
							subUnitName: rows[i]?.subUnitName || null,
							components: getRowComponents(rows[i])
						});
					}
				}
			}
			rows = list;
		});
	});

	// Lazy Load Modal fetch helper
	function fetchItems(query: string) {
		isModalLoading = true;
		const equipmentType = data.type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';
		fetch(`/api/item-list?q=${encodeURIComponent(query)}&equipmentType=${equipmentType}`)
			.then((res) => res.json())
			.then((resData) => {
				if (resData.success) {
					modalItemsList = resData.items;
				}
				isModalLoading = false;
			})
			.catch((err) => {
				console.error(err);
				isModalLoading = false;
			});
	}

	// Debounce effect for search
	$effect(() => {
		if (itemsModalOpen) {
			const query = modalSearchQuery;
			clearTimeout(debounceTimeout);
			debounceTimeout = setTimeout(() => {
				untrack(() => fetchItems(query));
			}, 300);
		}
	});

	function selectItem(item: any) {
		selectedItemId = item.id;
		selectedItemName = item.name;
		newItemName = '';
		if (item.brand) {
			brand = item.brand;
		}
		itemsModalOpen = false;
	}

	function openLending(index: number) {
		activeRowIndex = index;
		tempSubUnitId = rows[index].subUnitId;
		lendingDialogOpen = true;
	}

	function saveLending() {
		if (activeRowIndex !== null) {
			const sub = data.subUnits.find((s) => s.id === tempSubUnitId);
			rows[activeRowIndex].subUnitId = tempSubUnitId || undefined;
			rows[activeRowIndex].subUnitName = sub ? sub.name : null;
		}
		lendingDialogOpen = false;
	}

	function clearLending(index: number) {
		rows[index].subUnitId = undefined;
		rows[index].subUnitName = null;
	}

	const subUnitLabel = $derived(() => {
		const found = data.subUnits.find((s) => s.id === tempSubUnitId);
		return found ? found.name : 'Pilih satuan jajaran...';
	});
</script>

<div class="mx-auto flex max-w-5xl flex-col gap-6 p-4 custom-scrollbar text-foreground">
	<header class="flex items-center gap-4">
		<Button size="icon" href="/{page.params.org_slug}/alat/{data.type}" variant="outline">
			<ArrowLeft class="size-4" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight uppercase">Batch Input Alat</h1>
			<p class="text-sm text-muted-foreground">
				Tambahkan banyak alat secara dinamis. Tentukan jenis alat, merek, and kuantitas input.
			</p>
		</div>
	</header>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<!-- Sidebar Form Configuration -->
		<div class="h-fit">
			<div class="space-y-4">
				<!-- Choice Mode for Jenis Alat -->
				<div class="space-y-2">
					<Label>Jenis Alat <span class="text-red-500">*</span></Label>
					<div class="flex gap-1 rounded-lg border border-border bg-muted p-1">
						<button
							type="button"
							class="flex-1 rounded-md py-1.5 text-xs font-semibold transition-all duration-200 {inputMode ===
							'list'
								? 'bg-background text-foreground shadow-xs'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => {
								inputMode = 'list';
								newItemName = '';
							}}
						>
							Pilih dari Daftar
						</button>
						<button
							type="button"
							class="flex-1 rounded-md py-1.5 text-xs font-semibold transition-all duration-200 {inputMode ===
							'new'
								? 'bg-background text-foreground shadow-xs'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => {
								inputMode = 'new';
								selectedItemId = '';
								selectedItemName = '';
							}}
						>
							Nama Alat Baru
						</button>
					</div>

					{#if inputMode === 'list'}
						<div class="space-y-2 pt-1">
							<Button
								type="button"
								variant="outline"
								class="w-full justify-between truncate text-left font-normal"
								onclick={() => {
									modalSearchQuery = '';
									itemsModalOpen = true;
									fetchItems('');
								}}
							>
								<span class="truncate"
									>{selectedItemName ? selectedItemName : 'Pilih Alat dari Database...'}</span
								>
								<Search class="size-4 shrink-0 text-muted-foreground" />
							</Button>
							{#if selectedItemId}
								<p class="text-[10px] font-semibold text-muted-foreground">
									ID: <span class="font-mono">{selectedItemId}</span>
								</p>
							{/if}
						</div>
					{:else}
						<div class="space-y-2 pt-1">
							<div class="space-y-1">
								<Label for="newItemName">Nama Alat Baru <span class="text-red-500">*</span></Label>
								<Input
									id="newItemName"
									bind:value={newItemName}
									placeholder="Ketik nama alat baru..."
									required
								/>
							</div>

							<!-- Category on-the-fly selection inside Batch Create -->
							<div class="mt-3 space-y-3">
								<div class="flex items-center justify-between">
									<Label class="text-xs font-bold text-muted-foreground uppercase"
										>Kategori Alat <span class="text-red-500">*</span></Label
									>
									<button
										type="button"
										onclick={() => {
											categoryMode = categoryMode === 'select' ? 'new' : 'select';
										}}
										class="text-[10px] font-semibold text-primary hover:underline"
									>
										{categoryMode === 'select' ? '+ Baru' : 'Pilih'}
									</button>
								</div>

								{#if categoryMode === 'select'}
									<div class="space-y-1">
										<SearchableSelect type="single" bind:value={categoryId}>
											<SearchableSelectTrigger class="w-full bg-card text-left text-xs">
												{(() => {
													const cat = data.categories?.find((c: any) => c.id === categoryId);
													if (!cat) return 'Pilih Kategori...';
													return cat.parent ? `${cat.parent.name} - ${cat.name}` : cat.name;
												})()}
											</SearchableSelectTrigger>
											<SearchableSelectContent>
												<SearchableSelectItem value="" label="Tanpa Kategori"
													>Tanpa Kategori</SearchableSelectItem
												>
												{#each data.categories || [] as cat (cat.id)}
													{@const label = cat.parent
														? `${cat.parent.name} - ${cat.name}`
														: cat.name}
													<SearchableSelectItem value={cat.id} {label}>
														{label}
													</SearchableSelectItem>
												{/each}
											</SearchableSelectContent>
										</SearchableSelect>
									</div>
								{:else}
									<div class="space-y-2 pt-2">
										<div class="space-y-1">
											<Label for="newCategoryName" class="text-[10px]"
												>Nama Kategori Baru <span class="text-red-500">*</span></Label
											>
											<Input
												id="newCategoryName"
												placeholder="Masukkan nama kategori..."
												bind:value={newCategoryName}
												class="h-8 text-xs"
												required={inputMode === 'new' && categoryMode === 'new'}
											/>
										</div>
										<div class="space-y-1">
											<Label for="parentCategoryId" class="text-[10px]">Kategori Induk</Label>
											<Select.Root
												type="single"
												value={parentCategoryId}
												onValueChange={(val) => {
													parentCategoryId = val || '';
												}}
											>
												<Select.Trigger class="h-8 w-full bg-card text-left text-xs">
													{data.categories?.find((c: any) => c.id === parentCategoryId)?.name ||
														'Tidak Ada (Kategori Utama)'}
												</Select.Trigger>
												<Select.Content>
													<Select.Item value="">Tidak Ada (Kategori Utama)</Select.Item>
													{#each (data.categories || []).filter((c: any) => !c.parentId) as cat (cat.id)}
														<Select.Item value={cat.id}>{cat.name}</Select.Item>
													{/each}
												</Select.Content>
											</Select.Root>
										</div>
									</div>
								{/if}
							</div>

							<p class="mt-2 text-[10px] text-muted-foreground">
								Alat & Kategori baru otomatis terbuat saat Anda menyimpan batch.
							</p>
						</div>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="brand"
						>Merek / Brand <span class="text-xs text-muted-foreground">(Opsional)</span></Label
					>
					<Input id="brand" bind:value={brand} placeholder="Contoh: Motorola, Kenwood" />
				</div>

				<!-- Toggle Alat Berupa Set -->
				<div class="flex items-center justify-between rounded-lg border bg-muted/40 p-3 shadow-xs">
					<div class="space-y-0.5">
						<div class="flex items-center gap-1.5">
							<Layers class="size-3.5 text-primary" />
							<Label for="batchIsSetToggle" class="text-xs font-bold cursor-pointer">Alat Berupa Set / Kit</Label>
						</div>
						<p class="text-[10px] text-muted-foreground">
							Aktifkan jika alat dalam batch ini memiliki kelengkapan sub-komponen berseri.
						</p>
					</div>
					<input
						type="checkbox"
						id="batchIsSetToggle"
						class="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
						bind:checked={isSet}
					/>
				</div>

				{#if isSet}
					<div class="space-y-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
						<div class="flex items-center justify-between">
							<Label class="text-xs font-bold text-foreground">Kelengkapan Set Standar</Label>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								class="h-6 text-[10px] font-semibold text-primary px-1.5 hover:bg-primary/10"
								onclick={() => {
									batchComponentNames = [...batchComponentNames, ''];
								}}
							>
								<Plus class="size-3 mr-0.5" />
								Komponen
							</Button>
						</div>
						<p class="text-[10px] text-muted-foreground">
							Tentukan sub-komponen fisik yang ada di setiap unit set.
						</p>
						<div class="space-y-1.5">
							{#each batchComponentNames as compName, cIdx (cIdx)}
								<div class="flex items-center gap-1.5">
									<Input
										class="h-7 text-xs bg-background"
										placeholder="Contoh: Adaptor, Antena..."
										bind:value={batchComponentNames[cIdx]}
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										class="size-7 text-destructive hover:bg-destructive/10 shrink-0"
										disabled={batchComponentNames.length <= 1}
										onclick={() => {
											batchComponentNames = batchComponentNames.filter((_, i) => i !== cIdx);
										}}
									>
										<Trash2 class="size-3" />
									</Button>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<hr class="my-2 border-border" />

				<!-- Render based on warehouseHeadType -->
				{#if isHeadBalkir}
					<div class="space-y-2">
						<Label for="totalBalkir">Total Balkir</Label>
						<Input
							id="totalBalkir"
							type="number"
							min="0"
							bind:value={totalBalkir}
							placeholder="Kuantitas alat Balkir"
						/>
						<p class="text-xs text-muted-foreground italic">
							Klasifikasi dikunci ke BALKIR (Rusak Berat).
						</p>
					</div>
				{:else if isHeadTransito}
					<div class="space-y-2">
						<Label for="totalTransito">Total Transito</Label>
						<Input
							id="totalTransito"
							type="number"
							min="0"
							bind:value={totalTransito}
							placeholder="Kuantitas alat Transito"
						/>
						<p class="text-xs text-muted-foreground italic">
							Klasifikasi dikunci ke TRANSITO (Baik).
						</p>
					</div>
				{:else if isHeadKomunity}
					<div class="space-y-2">
						<Label for="totalKomunity">Total Komunity</Label>
						<Input
							id="totalKomunity"
							type="number"
							min="0"
							bind:value={totalKomunity}
							placeholder="Kuantitas alat Komunity"
						/>
						<p class="text-xs text-muted-foreground italic">
							Klasifikasi dikunci ke KOMUNITY (Baik).
						</p>
					</div>
				{:else}
					<!-- Render standard role controls: Superadmin, Kakomlek, Operator -->
					<div class="space-y-4">
						<div class="space-y-2">
							<Label for="totalKomunity">Total Komunity (Grand Total)</Label>
							<Input
								id="totalKomunity"
								type="number"
								min="0"
								bind:value={totalKomunity}
								placeholder="Grand Total alat"
							/>
						</div>
						<div class="space-y-2">
							<Label for="totalBalkir">Total Balkir (Dari Total Komunity)</Label>
							<Input
								id="totalBalkir"
								type="number"
								min="0"
								bind:value={totalBalkir}
								placeholder="Jumlah alat Balkir (Rusak)"
							/>
						</div>
						{#if isValidationError}
							<div
								class="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive"
							>
								<AlertTriangle class="mt-0.5 size-4 shrink-0" />
								<span>Total Balkir tidak boleh lebih besar dari Total Komunity.</span>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Main Dynamic Rows Input Area -->
		<div class="space-y-4 md:col-span-2">
			<Card.Root class="border-border bg-card shadow-sm">
				<Card.Header class="border-b pb-3">
					<Card.Title>
						Daftar Input Serial Number ({totalAlat} Alat)
					</Card.Title>
					<Card.Description>
						{isHeadTransito
							? 'Masukkan serial number dan kelola distribusi untuk setiap alat.'
							: 'Masukkan serial number dan kelola pinjaman untuk setiap alat.'}
					</Card.Description>
				</Card.Header>
				<Card.Content class="max-h-[60vh] custom-scrollbar overflow-y-auto p-0">
					{#if rows.length === 0}
						<div
							class="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground"
						>
							<Building2 class="size-10 text-primary opacity-30" />
							<p class="font-medium">Belum ada baris input.</p>
							<p class="max-w-sm px-6 text-xs">
								Tentukan jenis alat dan jumlah kuantitas pada panel samping untuk membuat form
								dinamis.
							</p>
						</div>
					{:else}
						<Table.Root>
							<Table.Header class="sticky top-0 z-10 bg-muted/30">
								<Table.Row>
									<Table.Head class="w-12 text-center">No</Table.Head>
									<Table.Head class="w-44">Klasifikasi</Table.Head>
									<Table.Head>{isSet ? 'Serial Number (Set)' : 'Serial Number'}</Table.Head>
									{#if isSet}
										<Table.Head class="w-48">Kelengkapan Set</Table.Head>
									{/if}
									<Table.Head class="w-24 text-right"
										>{isHeadTransito ? 'Satuan Tujuan' : 'Pinjamkan'}</Table.Head
									>
								</Table.Row>
							</Table.Header>
							<Table.Body class="divide-y divide-border">
								{#each rows as row, i (row.index)}
									<Table.Row class="transition-colors hover:bg-muted/10">
										<Table.Cell class="text-center font-mono font-medium text-muted-foreground">
											{i + 1}
										</Table.Cell>
										<Table.Cell>
											<div class="flex flex-col items-start gap-1">
												<Badge
													variant="secondary"
													class="text-[10px] font-bold tracking-wider uppercase
													{row.classification === 'BALKIR'
														? 'border border-destructive/20 bg-destructive/15 text-destructive'
														: ''}
													{row.classification === 'KOMUNITY' ? 'border border-success/20 bg-success/15 text-success' : ''}
													{row.classification === 'TRANSITO' ? 'bg-info/15 text-info border-info/20 border' : ''}
												"
												>
													{row.classification}
												</Badge>
												<span class="text-[10px] font-semibold text-muted-foreground">
													Kondisi: {row.condition === 'BAIK' ? 'Baik' : 'Rusak Berat'}
												</span>
											</div>
										</Table.Cell>
										<Table.Cell>
											<div class="space-y-1">
												<Input
													bind:value={row.serialNumber}
													placeholder={isSet ? 'SN Set Utama...' : 'Masukkan SN Alat...'}
													class="h-9 font-mono uppercase"
													required
												/>
												{#if row.subUnitName}
													<div
														class="flex w-fit items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
													>
														<MapPin class="size-3" />
														<span class="max-w-44 truncate uppercase"
															>{isHeadTransito ? 'Tujuan: ' : ''}{row.subUnitName}</span
														>
														<button
															type="button"
															onclick={() => clearLending(i)}
															class="ml-1 font-bold text-primary transition-transform hover:scale-110 hover:text-destructive"
															title={isHeadTransito ? 'Batalkan Tujuan' : 'Batalkan Pinjaman'}
														>
															×
														</button>
													</div>
												{/if}
											</div>
										</Table.Cell>
										{#if isSet}
											<Table.Cell>
												{@const filledCount = row.components?.filter(c => c.name?.trim())?.length || 0}
												{@const totalCount = row.components?.length || 0}
												<Button
													type="button"
													variant="outline"
													size="sm"
													class="h-8 text-xs gap-1.5 w-full justify-between font-normal {filledCount === totalCount && totalCount > 0 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20' : 'text-muted-foreground'}"
													onclick={() => openComponentsDialog(i)}
												>
													<span class="flex items-center gap-1 truncate">
														<ListChecks class="size-3.5 shrink-0" />
														<span>{filledCount}/{totalCount} Komponen</span>
													</span>
													{#if filledCount === totalCount && totalCount > 0}
														<CheckCircle2 class="size-3.5 text-emerald-600 shrink-0" />
													{/if}
												</Button>
											</Table.Cell>
										{/if}
										<Table.Cell class="text-right">
											<Button
												type="button"
												variant={row.subUnitId ? 'secondary' : 'outline'}
												size="icon"
												class="size-8"
												onclick={() => openLending(i)}
												title={isHeadTransito
													? 'Tentukan Satuan Tujuan'
													: 'Pinjamkan ke Satuan Jajaran'}
											>
												<Building2 class="size-3.5" />
											</Button>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
				{#if rows.length > 0}
					<Card.Footer class="flex justify-end gap-3 border-t px-6 py-4">
						<form
							method="POST"
							use:enhance={() => {
								isSubmitting = true;
								return async ({ result, update }) => {
									isSubmitting = false;
									if (result.type === 'success') {
										notificationMsg = 'Batch input alat berhasil disimpan';
										notificationType = 'success';
										notificationOpen = true;
									} else {
										const err =
											result.type === 'failure'
												? (result.data as any)?.message
												: 'Gagal menyimpan batch alat';
										notificationMsg = err;
										notificationType = 'error';
										notificationOpen = true;
									}
								};
							}}
							class="flex w-full items-center justify-between"
						>
							<input type="hidden" name="itemId" value={selectedItemId} />
							<input type="hidden" name="newItemName" value={newItemName} />
							<input type="hidden" name="brand" value={brand} />
							<input type="hidden" name="isSet" value={isSet ? 'true' : 'false'} />
							<input type="hidden" name="rows" value={JSON.stringify(rows)} />
							<input type="hidden" name="categoryId" value={categoryId} />
							<input type="hidden" name="newCategoryName" value={newCategoryName} />
							<input type="hidden" name="parentCategoryId" value={parentCategoryId} />
							<input type="hidden" name="categoryMode" value={categoryMode} />

							<div class="text-xs text-muted-foreground">
								Pastikan semua data Serial Number sudah valid sebelum menyimpan.
							</div>

							<Button
								type="submit"
								disabled={isSubmitting ||
									(!selectedItemId && !newItemName) ||
									(inputMode === 'new' && categoryMode === 'new' && !newCategoryName) ||
									isValidationError}
								class="gap-2"
							>
								<Save class="size-4" />
								{isSubmitting ? 'Menyimpan...' : 'Simpan Batch'}
							</Button>
						</form>
					</Card.Footer>
				{/if}
			</Card.Root>
		</div>
	</div>
</div>

<!-- CLIENT SIDE LAZY LOAD MODAL (DAFTAR ALAT) -->
<Dialog.Root bind:open={itemsModalOpen}>
	<Dialog.Content class="border-border bg-card text-foreground sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Daftar Jenis Alat</Dialog.Title>
			<Dialog.Description>
				Pilih jenis alat dari database. Gunakan pencarian untuk memfilter data.
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="relative">
				<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					bind:value={modalSearchQuery}
					placeholder="Cari nama alat (HT, Radio...)"
					class="pl-10"
				/>
			</div>

			<div class="max-h-[300px] space-y-2 overflow-y-auto pr-1">
				{#if isModalLoading}
					{#each Array(4) as _}
						<div
							class="flex animate-pulse items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3"
						>
							<div class="space-y-2">
								<div class="h-4 w-32 rounded bg-muted"></div>
								<div class="h-3 w-20 rounded bg-muted"></div>
							</div>
							<div class="h-8 w-16 rounded bg-muted"></div>
						</div>
					{/each}
				{:else if modalItemsList.length === 0}
					<div class="py-8 text-center text-sm text-muted-foreground">Alat tidak ditemukan.</div>
				{:else}
					{#each modalItemsList as item (item.id)}
						<div
							class="flex items-center justify-between custom-scrollbar rounded-lg border border-border p-2.5 transition-colors hover:bg-muted/30"
						>
							<div class="flex flex-col">
								<span class="text-sm font-medium text-foreground">{item.name}</span>
								<span class="font-mono text-[10px] text-muted-foreground uppercase"
									>{item.equipmentType}</span
								>
							</div>
							<Button size="sm" variant="secondary" onclick={() => selectItem(item)}>Pilih</Button>
						</div>
					{/each}
				{/if}
			</div>
		</div>
		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={() => (itemsModalOpen = false)}>Tutup</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- LENDING SUB-UNIT DIALOG -->
<Dialog.Root bind:open={lendingDialogOpen}>
	<Dialog.Content class="border-border bg-card text-foreground sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title
				>{isHeadTransito ? 'Pilih Satuan Tujuan' : 'Pinjamkan ke Satuan Jajaran'}</Dialog.Title
			>
			<Dialog.Description>
				{#if isHeadTransito}
					Pilih satuan target distribusi alat ini. Status alat akan diset ke READY untuk proses
					pengiriman.
				{:else}
					Pilih satuan peminjam / peruntukan satuan alat ini.
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-6">
			{#if data.subUnits.length === 0}
				<div
					class="rounded-lg border border-dashed p-4 py-4 text-center text-sm text-muted-foreground"
				>
					Belum ada Satuan Jajaran yang terdaftar.
					<p class="mt-1 text-xs">
						Silakan tambahkan data Satuan Jajaran di menu Pengaturan terlebih dahulu.
					</p>
				</div>
			{:else}
				<div class="space-y-2">
					<Label for="subUnitSelect">Satuan Jajaran</Label>
					<SearchableSelect type="single" bind:value={tempSubUnitId}>
						<SearchableSelectTrigger class="w-full justify-between truncate text-left">
							{subUnitLabel()}
						</SearchableSelectTrigger>
						<SearchableSelectContent>
							{#each data.subUnits as sub (sub.id)}
								<SearchableSelectItem value={sub.id} label={sub.name}>
									{sub.name}
								</SearchableSelectItem>
							{/each}
						</SearchableSelectContent>
					</SearchableSelect>
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={() => (lendingDialogOpen = false)}
				>Batal</Button
			>
			<Button type="button" onclick={saveLending} disabled={data.subUnits.length === 0}
				>Simpan Pilihan</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- EDIT ROW COMPONENTS DIALOG -->
<Dialog.Root bind:open={componentsDialogOpen}>
	<Dialog.Content class="border-border bg-card text-foreground sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Layers class="size-4 text-primary" />
				<span>Kelengkapan Sub-Komponen (Baris #{activeComponentRowIndex !== null ? activeComponentRowIndex + 1 : 1})</span>
			</Dialog.Title>
			<Dialog.Description>
				Periksa kelengkapan dan kondisi masing-masing komponen untuk unit alat ini.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-3 py-4 max-h-[50vh] overflow-y-auto pr-1">
			{#if tempRowComponents.length === 0}
				<div class="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
					Tidak ada komponen standar yang ditentukan pada panel samping.
				</div>
			{:else}
				{#each tempRowComponents as comp, cIdx (cIdx)}
					<div class="grid gap-3 rounded-lg border bg-muted/20 p-3.5 sm:grid-cols-12 items-end">
						<div class="sm:col-span-7 space-y-1">
							<Label class="text-xs font-semibold">Nama Komponen</Label>
							<Input
								class="h-8 text-xs bg-background"
								bind:value={comp.name}
								placeholder="Nama komponen..."
							/>
						</div>
						<div class="sm:col-span-5 space-y-1">
							<Label class="text-xs font-semibold">Kondisi</Label>
							<select
								class="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								bind:value={comp.condition}
							>
								<option value="BAIK">Baik</option>
								<option value="RUSAK_RINGAN">Rusak Ringan</option>
								<option value="RUSAK_BERAT">Rusak Berat</option>
								<option value="RUSAK_TOTAL">Rusak Total</option>
							</select>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<Dialog.Footer class="flex justify-between sm:justify-between items-center">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="text-xs gap-1"
				onclick={() => {
					tempRowComponents = [
						...tempRowComponents,
						{ name: '', condition: 'BAIK' }
					];
				}}
			>
				<Plus class="size-3.5" />
				Tambah Komponen Khusus Baris Ini
			</Button>
			<div class="flex gap-2">
				<Button type="button" variant="outline" size="sm" onclick={() => (componentsDialogOpen = false)}>
					Batal
				</Button>
				<Button type="button" size="sm" onclick={saveComponents}>
					Simpan Kelengkapan
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- NOTIFICATION DIALOG -->
<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={() => {
		notificationOpen = false;
		if (notificationType === 'success') {
			goto(`/${page.params.org_slug}/alat/${data.type}`);
		}
	}}
/>
