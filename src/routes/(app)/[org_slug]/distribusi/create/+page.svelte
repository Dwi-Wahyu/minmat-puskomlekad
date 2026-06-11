<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import {
		ArrowLeft,
		Save,
		Search,
		Package,
		Box,
		Tag,
		Warehouse,
		Loader2,
		ChevronLeft,
		ChevronRight,
		PocketKnife,
		X
	} from '@lucide/svelte';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { getAvailableEquipment, getAvailableConsumables } from '../distribusi.remote';
	import { untrack } from 'svelte';

	let { data, form }: { data: any; form: any } = $props();

	let toOrganizationId = $state(untrack(() => data.parentOrg?.id || ''));
	let activeTab = $state('equipment');

	// Pagination & Search States
	let equipmentSearch = $state('');
	let activeEquipmentSearch = $state('');
	let equipmentPage = $state(1);
	let equipmentTotalPages = $state(1);
	let equipmentLoading = $state(false);
	let loadedEquipment = $state<any[]>([]);

	let consumableSearch = $state('');
	let activeConsumableSearch = $state('');
	let consumablePage = $state(1);
	let consumableTotalPages = $state(1);
	let consumableLoading = $state(false);
	let loadedConsumables = $state<any[]>([]);

	// State untuk items yang dipilih (Persistent across pagination)
	let selectedEquipment = $state<
		Record<
			string,
			{ selected: boolean; note: string; name: string; sn: string; brand: string; wh: string }
		>
	>({});
	let selectedConsumables = $state<
		Record<
			string,
			{
				selected: boolean;
				displayQuantity: number;
				unitSelection: string;
				multiplier: number;
				unit: string;
				note: string;
				name: string;
				max: number;
				base: string;
			}
		>
	>({});

	let showNotification = $state(false);
	let notificationConfig = $state({
		type: 'success' as 'success' | 'error' | 'info',
		title: '',
		description: ''
	});

	$effect(() => {
		if (form?.success === false) {
			notificationConfig = {
				type: 'error',
				title: 'Gagal',
				description: form.message
			};
			showNotification = true;
		} else if (form?.success === true) {
			notificationConfig = {
				type: 'success',
				title: 'Berhasil',
				description: form.message
			};
			showNotification = true;
		}
	});

	function handleNotificationAction() {
		showNotification = false;
		if (form?.success && form?.distributionId) {
			goto(`/${data.currentOrgId === data.parentOrg?.id ? data.organizations[0]?.slug : page.params.org_slug}/distribusi/${form.distributionId}`);
		}
	}

	// Load Equipment
	$effect(() => {
		const orgId = data.currentOrgId;
		const query = activeEquipmentSearch;
		const p = equipmentPage;

		equipmentLoading = true;
		getAvailableEquipment({ orgId, q: query, page: p })
			.then((res) => {
				loadedEquipment = res.items;
				equipmentTotalPages = res.pagination.totalPages;
				equipmentLoading = false;
			})
			.catch(() => {
				equipmentLoading = false;
			});
	});

	// Load Consumables
	$effect(() => {
		const orgId = data.currentOrgId;
		const query = activeConsumableSearch;
		const p = consumablePage;

		consumableLoading = true;
		getAvailableConsumables({ orgId, q: query, page: p })
			.then((res) => {
				loadedConsumables = res.items;
				consumableTotalPages = res.pagination.totalPages;
				consumableLoading = false;
			})
			.catch(() => {
				consumableLoading = false;
			});
	});

	// Unified items list for submission
	const itemsToSubmit = $derived([
		...Object.entries(selectedEquipment)
			.filter(([_, val]) => val.selected)
			.map(([id, val]) => ({
				type: 'EQUIPMENT' as const,
				id,
				note: val.note
			})),
		...Object.entries(selectedConsumables)
			.filter(([_, val]) => val.selected && val.displayQuantity > 0)
			.map(([id, val]) => ({
				type: 'CONSUMABLE' as const,
				id,
				quantity: val.displayQuantity * val.multiplier,
				unit: val.base, // Always send base unit to backend since quantity is scaled
				note: val.note
			}))
	]);

	const hasStockError = $derived(
		Object.values(selectedConsumables).some(
			(val) => val.selected && val.displayQuantity * val.multiplier > val.max
		)
	);

	const selectedCount = $derived(itemsToSubmit.length);

	function toggleEquipment(eq: any) {
		if (selectedEquipment[eq.id]) {
			selectedEquipment[eq.id].selected = !selectedEquipment[eq.id].selected;
		} else {
			selectedEquipment[eq.id] = {
				selected: true,
				note: '',
				name: eq.item.name,
				sn: eq.serialNumber,
				brand: eq.brand,
				wh: eq.warehouse?.name
			};
		}
	}

	function toggleConsumable(item: any) {
		if (selectedConsumables[item.id]) {
			selectedConsumables[item.id].selected = !selectedConsumables[item.id].selected;
		} else {
			selectedConsumables[item.id] = {
				selected: true,
				displayQuantity: 1,
				unitSelection: item.baseUnit,
				multiplier: 1,
				unit: item.baseUnit,
				note: '',
				name: item.name,
				max: item.totalStock,
				base: item.baseUnit
			};
		}
	}

	function handleConsumableUnitChange(itemId: string, newUnit: string, itemData: any) {
		if (newUnit === itemData.baseUnit) {
			selectedConsumables[itemId].multiplier = 1;
		} else {
			const conversion = itemData.unitConversions?.find((c: any) => c.toUnit === newUnit);
			if (conversion) {
				selectedConsumables[itemId].multiplier = Number(conversion.multiplier);
			}
		}
		selectedConsumables[itemId].unitSelection = newUnit;
	}

	const selectedToOrg = $derived(data.organizations.find((o: any) => o.id === toOrganizationId));

	function handleEquipmentSearch(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			activeEquipmentSearch = equipmentSearch;
			equipmentPage = 1;
		}
	}

	function handleConsumableSearch(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			activeConsumableSearch = consumableSearch;
			consumablePage = 1;
		}
	}
</script>

<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
	<div class="flex items-center gap-4">
		<Button
			variant="outline"
			size="icon"
			href="/{page.params.org_slug}/distribusi"
			class="rounded-full shadow-sm"
		>
			<ArrowLeft size={18} />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Permintaan Distribusi Baru</h1>
			<p class="text-muted-foreground">
				Pilih alat atau bahan habis pakai yang akan didistribusikan.
			</p>
		</div>
	</div>

	<form
		method="POST"
		use:enhance={({ formData }) => {
			formData.append('items', JSON.stringify(itemsToSubmit));
			formData.append('fromOrganizationId', data.currentOrgId);
			if (data.parentOrg) {
				formData.append('toOrganizationId', data.parentOrg.id);
			}
		}}
		class="grid gap-6"
	>
		<!-- Informasi Tujuan -->
		{#if !data.parentOrg}
			<Card>
				<CardHeader>
					<CardTitle>Informasi Tujuan</CardTitle>
					<CardDescription>Pilih kesatuan tujuan pengiriman materi.</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="grid gap-4">
						<div class="flex flex-col gap-2">
							<Label for="toOrg">Kesatuan Tujuan</Label>
							<SearchableSelect.Root
								type="single"
								bind:value={toOrganizationId}
								name="toOrganizationId"
							>
								<SearchableSelect.Trigger class="w-full">
									{selectedToOrg?.name || 'Pilih Kesatuan Tujuan'}
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
					</div>
				</CardContent>
			</Card>
		{:else}
			<Card>
				<CardHeader>
					<CardTitle>Informasi Tujuan</CardTitle>
					<CardDescription>Pengiriman akan ditujukan ke satuan induk.</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex flex-col gap-2">
						<Label>Kesatuan Tujuan</Label>
						<Input value={data.parentOrg.name} readonly disabled />
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- Pemilihan Materi (Tabs) -->
		<Card class="pb-0">
			<CardContent class="p-0">
				<div class="flex flex-row items-center justify-between border-b px-6 pb-4">
					<div>
						<CardTitle>Daftar Inventaris</CardTitle>
						<CardDescription>Pilih aset dan stok yang akan dikirim.</CardDescription>
					</div>
					<Badge variant="secondary" class="h-6">
						{selectedCount} Item Terpilih
					</Badge>
				</div>

				<Tabs bind:value={activeTab} class="w-full">
					<div class="border-b bg-muted/20 px-6 py-2">
						<TabsList variant="default" class="w-full bg-transparent">
							<TabsTrigger value="equipment" class="h-8 cursor-pointer rounded-full ">
								<PocketKnife />
								Alat
							</TabsTrigger>
							<TabsTrigger value="consumable" class="h-8 cursor-pointer rounded-full ">
								<Box />
								Barang
							</TabsTrigger>
						</TabsList>
					</div>

					<!-- Equipment Tab -->
					<TabsContent value="equipment" class="mt-0">
						<div class="space-y-4 p-6">
							<div class="flex gap-2">
								<div class="relative flex-1">
									<Search
										class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
									/>
									<Input
										placeholder="Cari Nama Alat atau SN..."
										bind:value={equipmentSearch}
										onkeydown={handleEquipmentSearch}
										class="pl-10"
									/>
								</div>
								<Button
									type="button"
									variant="secondary"
									onclick={() => {
										activeEquipmentSearch = equipmentSearch;
										equipmentPage = 1;
									}}>Cari</Button
								>
							</div>

							<div class="overflow-hidden rounded-md border bg-card">
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head class="w-12 text-center">Pilih</Table.Head>
											<Table.Head>Informasi Alat</Table.Head>
											<Table.Head>Serial Number</Table.Head>
											<Table.Head>Gudang</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#if equipmentLoading}
											<Table.Row>
												<Table.Cell colspan={4} class="h-48 text-center">
													<div class="flex flex-col items-center gap-2">
														<Loader2 class="h-8 w-8 animate-spin text-primary opacity-50" />
														<span class="text-sm text-muted-foreground">Memuat data alat...</span>
													</div>
												</Table.Cell>
											</Table.Row>
										{:else}
											{#each loadedEquipment as eq (eq.id)}
												{@const isSelected = selectedEquipment[eq.id]?.selected}
												<Table.Row class={isSelected ? 'bg-primary/5' : ''}>
													<Table.Cell class="text-center">
														<Checkbox
															checked={isSelected}
															onCheckedChange={() => toggleEquipment(eq)}
														/>
													</Table.Cell>
													<Table.Cell>
														<div class="flex flex-col">
															<span class="text-sm font-medium">{eq.item.name}</span>
															<span class="text-[10px] text-muted-foreground uppercase"
																>{eq.brand || '-'}</span
															>
														</div>
													</Table.Cell>
													<Table.Cell>
														<Badge variant="outline" class="font-mono text-[10px]"
															>{eq.serialNumber}</Badge
														>
													</Table.Cell>
													<Table.Cell>
														<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
															<Warehouse class="h-3 w-3" />
															<span class="max-w-25 truncate">{eq.warehouse?.name || '-'}</span>
														</div>
													</Table.Cell>
												</Table.Row>
											{/each}
											{#if loadedEquipment.length === 0}
												<Table.Row>
													<Table.Cell
														colspan={4}
														class="h-24 text-center text-sm text-muted-foreground italic"
													>
														Tidak ada alat tersedia.
													</Table.Cell>
												</Table.Row>
											{/if}
										{/if}
									</Table.Body>
								</Table.Root>
							</div>

							<!-- Pagination Equipment -->
							{#if equipmentTotalPages > 1}
								<div class="flex items-center justify-between py-2">
									<p class="text-xs text-muted-foreground">
										Halaman {equipmentPage} dari {equipmentTotalPages}
									</p>
									<div class="flex items-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											class="h-8"
											disabled={equipmentPage === 1}
											onclick={() => equipmentPage--}
										>
											<ChevronLeft class="mr-1 h-4 w-4" /> Sebelumnya
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											class="h-8"
											disabled={equipmentPage === equipmentTotalPages}
											onclick={() => equipmentPage++}
										>
											Berikutnya <ChevronRight class="ml-1 h-4 w-4" />
										</Button>
									</div>
								</div>
							{/if}
						</div>
					</TabsContent>

					<!-- Consumable Tab -->
					<TabsContent value="consumable" class="mt-0">
						<div class="space-y-4 p-6">
							<div class="flex gap-2">
								<div class="relative flex-1">
									<Search
										class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
									/>
									<Input
										placeholder="Cari Nama Barang..."
										bind:value={consumableSearch}
										onkeydown={handleConsumableSearch}
										class="pl-10"
									/>
								</div>
								<Button
									type="button"
									variant="secondary"
									onclick={() => {
										activeConsumableSearch = consumableSearch;
										consumablePage = 1;
									}}>Cari</Button
								>
							</div>

							<div class="overflow-hidden rounded-md border bg-card">
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head class="w-12 text-center">Pilih</Table.Head>
											<Table.Head>Nama Barang</Table.Head>
											<Table.Head class="text-center">Stok Tersedia</Table.Head>
											<Table.Head class="w-24 text-center">Jumlah</Table.Head>
											<Table.Head class="w-40 text-center">Satuan</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#if consumableLoading}
											<Table.Row>
												<Table.Cell colspan={6} class="h-48 text-center">
													<div class="flex flex-col items-center gap-2">
														<Loader2 class="h-8 w-8 animate-spin text-primary opacity-50" />
														<span class="text-sm text-muted-foreground">Memuat data bahan...</span>
													</div>
												</Table.Cell>
											</Table.Row>
										{:else}
											{#each loadedConsumables as item (item.id)}
												{@const isSelected = selectedConsumables[item.id]?.selected}
												{@const requestedQty = selectedConsumables[item.id]?.displayQuantity || 0}
												{@const multiplier = selectedConsumables[item.id]?.multiplier || 1}
												{@const totalRequested = requestedQty * multiplier}
												{@const isStockExceeded = isSelected && totalRequested > item.totalStock}
												{@const hasConversions =
													item.unitConversions && item.unitConversions.length > 0}

												<Table.Row class={isSelected ? 'bg-primary/5' : ''}>
													<Table.Cell class="text-center">
														<Checkbox
															checked={isSelected}
															onCheckedChange={() => toggleConsumable(item)}
														/>
													</Table.Cell>
													<Table.Cell>
														<div class="flex flex-col">
															<span
																class="text-sm font-medium {isStockExceeded ? 'text-red-500' : ''}"
															>
																{item.name}
															</span>
															{#if isSelected && totalRequested > 0}
																<span class="mt-1 text-[10px] text-muted-foreground">
																	Total: <strong class={isStockExceeded ? 'text-red-500' : ''}
																		>{totalRequested} {item.baseUnit}</strong
																	>
																</span>
															{/if}
														</div>
													</Table.Cell>
													<Table.Cell class="text-center">
														<Badge variant="outline" class="font-mono text-[10px]"
															>{item.totalStock} {item.baseUnit}</Badge
														>
													</Table.Cell>
													<Table.Cell>
														{#if isSelected}
															<Input
																type="number"
																min="1"
																bind:value={selectedConsumables[item.id].displayQuantity}
																class="h-8 text-center text-xs {isStockExceeded
																	? 'border-red-500 focus-visible:ring-red-500'
																	: ''}"
															/>
														{:else}
															<div class="h-8 w-full rounded-md bg-muted/20"></div>
														{/if}
													</Table.Cell>
													<Table.Cell>
														{#if isSelected}
															<Select.Root
																type="single"
																bind:value={selectedConsumables[item.id].unitSelection}
																onValueChange={(val) =>
																	handleConsumableUnitChange(item.id, val, item)}
																disabled={!hasConversions}
															>
																<Select.Trigger class="h-8 w-full text-xs">
																	{selectedConsumables[item.id].unitSelection}
																</Select.Trigger>
																<Select.Content>
																	<Select.Item value={item.baseUnit} label={item.baseUnit}>
																		{item.baseUnit} (1 {item.baseUnit})
																	</Select.Item>
																	{#if hasConversions}
																		{#each item.unitConversions as conv}
																			<Select.Item value={conv.toUnit} label={conv.toUnit}>
																				{conv.toUnit} ({conv.multiplier}
																				{item.baseUnit})
																			</Select.Item>
																		{/each}
																	{/if}
																</Select.Content>
															</Select.Root>
														{:else}
															<div class="h-8 w-full rounded-md bg-muted/20"></div>
														{/if}
													</Table.Cell>
												</Table.Row>
											{/each}
											{#if loadedConsumables.length === 0}
												<Table.Row>
													<Table.Cell
														colspan={5}
														class="h-24 text-center text-sm text-muted-foreground italic"
													>
														Tidak ada bahan tersedia.
													</Table.Cell>
												</Table.Row>
											{/if}
										{/if}
									</Table.Body>
								</Table.Root>
							</div>

							<!-- Pagination Consumables -->
							{#if consumableTotalPages > 1}
								<div class="flex items-center justify-between py-2">
									<p class="text-xs text-muted-foreground">
										Halaman {consumablePage} dari {consumableTotalPages}
									</p>
									<div class="flex items-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											class="h-8"
											disabled={consumablePage === 1}
											onclick={() => consumablePage--}
										>
											<ChevronLeft class="mr-1 h-4 w-4" /> Sebelumnya
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											class="h-8"
											disabled={consumablePage === consumableTotalPages}
											onclick={() => consumablePage++}
										>
											Berikutnya <ChevronRight class="ml-1 h-4 w-4" />
										</Button>
									</div>
								</div>
							{/if}
						</div>
					</TabsContent>
				</Tabs>

				<!-- Selection Summary -->
				{#if selectedCount > 0}
					<div class="border-t bg-primary/5 px-6 py-4">
						<h4 class="mb-3 text-xs font-bold tracking-wider uppercase">Ringkasan Pilihan:</h4>
						<div class="flex flex-wrap gap-2">
							{#each Object.entries(selectedEquipment) as [id, val] (id)}
								{#if val.selected}
									<Badge variant="secondary" class="h-6 gap-1 pr-1">
										<Tag class="h-3 w-3" />
										{val.name} (SN: {val.sn})
										<Button
											variant="ghost"
											size="icon"
											class="ml-1 h-4 w-4 rounded-full"
											onclick={() => (selectedEquipment[id].selected = false)}
										>
											<X class="h-2 w-2" />
										</Button>
									</Badge>
								{/if}
							{/each}
							{#each Object.entries(selectedConsumables) as [id, val] (id)}
								{#if val.selected}
									<Badge
										variant="secondary"
										class="h-6 gap-1 border-amber-500/20 bg-amber-500/10 pr-1 text-amber-600"
									>
										<Box class="h-3 w-3" />
										{val.name}: {val.displayQuantity}
										{val.unit}
										<Button
											variant="ghost"
											size="icon"
											class="ml-1 h-4 w-4 rounded-full"
											onclick={() => (selectedConsumables[id].selected = false)}
										>
											<X class="h-2 w-2" />
										</Button>
									</Badge>
								{/if}
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex justify-end gap-3 border-t bg-muted/10 p-6">
					<Button variant="outline" href="/{page.params.org_slug}/distribusi">Batal</Button>
					<Button
						type="submit"
						class="min-w-37.5"
						disabled={!toOrganizationId || selectedCount === 0 || hasStockError}
					>
						<Save class="mr-2 size-4" />
						Buat Permintaan
					</Button>
				</div>
			</CardContent>
		</Card>
	</form>
</div>

<NotificationDialog
	bind:open={showNotification}
	type={notificationConfig.type}
	title={notificationConfig.title}
	description={notificationConfig.description}
	onAction={handleNotificationAction}
/>
