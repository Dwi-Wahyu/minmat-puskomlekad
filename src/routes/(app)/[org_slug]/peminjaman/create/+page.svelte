<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { FileText, Search, ChevronDown, ChevronUp, Check, Warehouse, Tags } from '@lucide/svelte';
	import { getAvailableEquipment } from '../peminjaman.remote';
	import { untrack } from 'svelte';
	import * as Select from '$lib/components/ui/select';
	import { superForm } from 'sveltekit-superforms';
	import { yup } from 'sveltekit-superforms/adapters';
	import { lendingMutationSchema } from '$lib/schemas/lending-mutation-schema';
	import { lendingPurposeLabel } from '$lib/enums/lending-enum';
	import { equipmentConditionLabel, equipmentStatusLabel } from '@/enums/equipment-enum';

	let { data }: { data: PageData } = $props();

	const {
		form,
		errors,
		enhance: superEnhance,
		delayed
	} = superForm(
		untrack(() => data.form),
		{
			validators: yup(lendingMutationSchema),
			onUpdated: ({ form }) => {
				if (form.message) {
					notificationMsg = form.message;
					notificationType = form.valid ? 'success' : 'error';
					notificationTitle = form.valid ? 'Berhasil!' : 'Gagal!';
					notificationOpen = true;
				}
			}
		}
	);

	$effect(() => {
		$form.targetOrgId = data.targetOrg?.id || '';
	});

	// Transform datetime strings back to local format for inputs
	let localStartDate = $state('');
	let localEndDate = $state('');

	$effect(() => {
		if ($form.startDate) {
			localStartDate = $form.startDate.slice(0, 16);
		}
		if ($form.endDate) {
			localEndDate = $form.endDate.slice(0, 16);
		}
	});

	function updateStartDate(e: Event) {
		const target = e.target as HTMLInputElement;
		localStartDate = target.value;
		$form.startDate = target.value ? new Date(target.value).toISOString() : '';
	}

	function updateEndDate(e: Event) {
		const target = e.target as HTMLInputElement;
		localEndDate = target.value;
		$form.endDate = target.value ? new Date(target.value).toISOString() : '';
	}

	// State untuk items yang dipilih
	let selectedItems = $state<
		Record<
			string,
			{
				selected: boolean;
				qty: number;
				manualIds: string[];
				itemId: string;
				warehouseId: string;
				condition: string;
			}
		>
	>({});

	// State expand grup
	let expandedGroups = $state<Record<string, boolean>>({});

	// State untuk notifikasi
	let notificationOpen = $state(false);
	let notificationType: 'success' | 'error' | 'info' = $state('success');
	let notificationTitle = $state('');
	let notificationMsg = $state('');
	let notificationActionLabel = $state('OK');

	// State pencarian alat & paginasi remote
	let searchQuery = $state('');
	let activeSearchQuery = $state('');

	let groupedEquipment = $state<any[]>([]);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);
	let isLoading = $state(false);

	function triggerSearch() {
		if (activeSearchQuery !== searchQuery) {
			activeSearchQuery = searchQuery;
			currentPage = 1; // Reset ke halaman 1
		}
	}

	// Load data secara dinamis/remote
	$effect(() => {
		const targetOrgId = data.targetOrg?.id;
		if (!targetOrgId) {
			groupedEquipment = [];
			return;
		}

		const pageNum = currentPage;
		const queryStr = activeSearchQuery;

		isLoading = true;
		getAvailableEquipment({
			targetOrgId,
			q: queryStr,
			page: pageNum,
			preselectedEquipmentId: data.preselectedEquipmentId || ''
		})
			.then((res) => {
				groupedEquipment = res.groupedEquipment;
				totalPages = res.pagination.totalPages;
				totalItems = res.pagination.totalItems;
				isLoading = false;
			})
			.catch((err) => {
				console.error('Gagal mengambil daftar alat:', err);
				isLoading = false;
			});
	});

	// Merge item baru yang di-load ke selectedItems agar jika terpilih atau preselected terdaftar
	$effect(() => {
		if (groupedEquipment.length > 0) {
			untrack(() => {
				const updated = { ...selectedItems };
				groupedEquipment.forEach((group: any) => {
					if (updated[group.id] === undefined) {
						const isPreselected = group.preselected;
						updated[group.id] = {
							selected: isPreselected,
							qty: isPreselected ? 1 : 0,
							manualIds: isPreselected ? [data.preselectedEquipmentId || ''] : [],
							itemId: group.itemId,
							warehouseId: group.warehouseId,
							condition: group.condition
						};
					}
				});
				selectedItems = updated;
			});
		}
	});

	// Hitung jumlah item yang dipilih
	const selectedCount = $derived(
		Object.values(selectedItems).reduce((acc, item) => acc + (item.selected ? item.qty : 0), 0)
	);

	// Handler untuk checkbox
	function toggleItem(group: any) {
		const isSelected = !selectedItems[group.id]?.selected;
		selectedItems[group.id] = {
			selected: isSelected,
			qty: isSelected ? 1 : 0,
			manualIds: [],
			itemId: group.itemId,
			warehouseId: group.warehouseId,
			condition: group.condition
		};
		selectedItems = { ...selectedItems };
	}

	// Handler untuk quantity
	function updateQty(group: any, qty: number, max: number) {
		const val = Math.min(Math.max(1, qty), max);
		selectedItems[group.id] = {
			qty: val,
			selected: val > 0,
			manualIds: [],
			itemId: group.itemId,
			warehouseId: group.warehouseId,
			condition: group.condition
		};
		selectedItems = { ...selectedItems };
	}

	function toggleManualUnit(group: any, equipmentId: string) {
		let currentManual = selectedItems[group.id]?.manualIds || [];

		if (currentManual.includes(equipmentId)) {
			currentManual = currentManual.filter((id) => id !== equipmentId);
		} else {
			currentManual = [...currentManual, equipmentId];
		}

		selectedItems[group.id] = {
			manualIds: currentManual,
			qty: currentManual.length,
			selected: currentManual.length > 0,
			itemId: group.itemId,
			warehouseId: group.warehouseId,
			condition: group.condition
		};
		selectedItems = { ...selectedItems };
	}

	function toggleGroupExpand(id: string) {
		expandedGroups[id] = !expandedGroups[id];
		expandedGroups = { ...expandedGroups };
	}

	function getConditionColor(condition: string) {
		switch (condition) {
			case 'BAIK':
				return 'bg-success/10 text-success border-success/20';
			case 'RUSAK_RINGAN':
				return 'bg-primary/10 text-primary border-primary/20';
			case 'RUSAK_BERAT':
				return 'bg-destructive/10 text-destructive border-destructive/20';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}

	function handleNotificationAction() {
		notificationOpen = false;
		if (notificationType === 'success') {
			window.location.href = `/${page.params.org_slug}/peminjaman`;
		}
	}

	const purposeOptions = Object.entries(lendingPurposeLabel).map(([value, label]) => ({
		value,
		label
	}));
</script>

<svelte:head>
	<title>Ajukan Peminjaman | {data.targetOrg?.name || 'Pilih Satuan'}</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex flex-col gap-2">
		<div class="flex items-center justify-between">
			<h1 class="text-3xl font-bold tracking-tight">Ajukan Peminjaman</h1>
			<Button variant="outline" href={`/${page.params.org_slug}/peminjaman`}>Kembali</Button>
		</div>
		<p class="text-muted-foreground">Silakan pilih daftar alat yang ingin dipinjam.</p>
	</div>

	{#if data.targetOrg}
		<form method="POST" enctype="multipart/form-data" use:superEnhance class="space-y-6">
			<!-- Target Organization ID (Hidden) -->
			<input type="hidden" name="targetOrgId" bind:value={$form.targetOrgId} />

			<!-- Informasi Peminjaman -->
			<div class="rounded-lg border bg-card p-6 shadow-sm">
				<h2 class="mb-4 pb-2 text-lg font-semibold">Informasi Operasional</h2>
				<div class="grid gap-6 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="unit">Unit <span class="text-red-500"> * </span></Label>
						<Input
							id="unit"
							name="unit"
							bind:value={$form.unit}
							placeholder="Contoh: Yonif 201, Hubdam, dll."
						/>
						{#if $errors.unit}
							<p class="text-sm text-destructive">{$errors.unit}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="purpose">Tujuan Penggunaan <span class="text-red-500"> * </span></Label>
						<Select.Root type="single" name="purpose" bind:value={$form.purpose}>
							<Select.Trigger class="w-full">
								{lendingPurposeLabel[$form.purpose] || 'Pilih Tujuan'}
							</Select.Trigger>
							<Select.Content>
								{#each purposeOptions as opt (opt.value)}
									<Select.Item value={opt.value}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						{#if $errors.purpose}
							<p class="text-sm text-destructive">{$errors.purpose}</p>
						{/if}
					</div>

					{#if $form.purpose === 'PERINTAH_LANGSUNG'}
						<div class="col-span-2 space-y-2">
							<Label for="overrideReason">Keterangan Perintah Langsung</Label>
							<Input
								id="overrideReason"
								name="overrideReason"
								bind:value={$form.overrideReason}
								placeholder="Contoh: Operasi mendesak atas perintah pimpinan..."
								class="border-primary/20 focus-visible:ring-primary"
							/>
							{#if $errors.overrideReason}
								<p class="text-sm text-destructive">{$errors.overrideReason}</p>
							{/if}
						</div>
					{/if}

					<div class="space-y-2">
						<Label for="startDate">
							Rencana Tanggal Mulai <span class="text-red-500"> * </span>
						</Label>
						<Input
							id="startDate"
							name="startDate"
							type="datetime-local"
							value={localStartDate}
							oninput={updateStartDate}
						/>
						{#if $errors.startDate}
							<p class="text-sm text-destructive">{$errors.startDate}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="endDate">Rencana Tanggal Selesai</Label>
						<Input
							id="endDate"
							name="endDate"
							type="datetime-local"
							value={localEndDate}
							oninput={updateEndDate}
						/>
						{#if $errors.endDate}
							<p class="text-sm text-destructive">{$errors.endDate}</p>
						{/if}
					</div>

					<div class="col-span-2 space-y-2">
						<Label for="attachment" class="flex items-center gap-2">
							Dokumen Pendukung (Surat Perintah/Permohonan)
						</Label>
						<Input
							id="attachment"
							name="attachment"
							type="file"
							accept=".pdf,.docx"
							class="cursor-pointer"
						/>
						<p class="text-[10px] text-muted-foreground uppercase">
							Format yang diterima: .PDF, .DOCX (Maks 5MB)
						</p>
					</div>
				</div>
			</div>

			<!-- Pemilihan Equipment -->
			<div class="rounded-lg border bg-card p-6 shadow-sm">
				<div class="mb-4 flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-lg font-semibold">Daftar Alat</h2>
						<p class="text-xs text-muted-foreground">Pilih alat yang akan dipinjam</p>
					</div>
					<Badge variant="secondary" class="w-fit px-3 py-1">
						{selectedCount} Alat Terpilih
					</Badge>
				</div>

				<div class="mb-4 flex gap-2">
					<div class="relative flex-1">
						<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Cari alat berdasarkan nama, brand, atau gudang..."
							bind:value={searchQuery}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									triggerSearch();
								}
							}}
							class="pl-10"
						/>
					</div>
					<Button type="button" variant="secondary" onclick={triggerSearch} class="gap-2">
						Cari
					</Button>
				</div>

				{#if isLoading}
					<div class="grid gap-3">
						{#each [1, 2, 3] as i (i)}
							<div
								class="flex animate-pulse flex-col overflow-hidden rounded-lg border border-border bg-card p-4"
							>
								<div class="flex items-center gap-4">
									<div class="h-4 w-4 rounded bg-muted"></div>
									<div class="flex-1 space-y-2">
										<div class="h-5 w-1/3 animate-pulse rounded bg-muted"></div>
										<div class="flex gap-4">
											<div class="h-4 w-1/4 animate-pulse rounded bg-muted"></div>
											<div class="h-4 w-1/4 animate-pulse rounded bg-muted"></div>
										</div>
									</div>
									<div class="h-8 w-8 animate-pulse rounded bg-muted"></div>
								</div>
							</div>
						{/each}
					</div>
				{:else if totalItems === 0}
					<div class="rounded-lg p-10 text-center">
						<p class="text-muted-foreground italic">
							Tidak ada alat berstatus {equipmentStatusLabel['READY']}.
						</p>
					</div>
				{:else}
					<div class="grid gap-3">
						{#each groupedEquipment as group (group.id)}
							<div class="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
								<div
									class="flex items-center gap-4 p-4 transition-colors {selectedItems[group.id]
										?.selected
										? 'border-primary/20 bg-primary/5'
										: 'hover:bg-muted/30'}"
								>
									<Checkbox
										id={group.id}
										checked={selectedItems[group.id]?.selected || false}
										onCheckedChange={() => toggleItem(group)}
									/>

									<div class="flex-1">
										<div class="flex items-center gap-2">
											<Label for={group.id} class="block cursor-pointer font-bold text-foreground">
												{group.name}
											</Label>
											<span class="text-xs font-bold text-primary">{group.totalAvailable} Unit</span
											>
										</div>

										<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
											{#if group.brand}
												<div class="flex items-center gap-1.5">
													<Tags class="h-3.5 w-3.5" />
													<span class="font-medium">{group.brand}</span>
												</div>
											{/if}
											<div class="flex items-center gap-1.5">
												<Warehouse class="h-3.5 w-3.5" />
												<span class="mt-0.5 font-medium">{group.warehouseName || '-'}</span>
											</div>
										</div>
									</div>

									<div class="flex items-center gap-2">
										{#if selectedItems[group.id]?.selected}
											<div class="flex flex-col items-end gap-1">
												<Label class="text-[10px] font-bold text-muted-foreground uppercase"
													>Jumlah Pinjam</Label
												>
												<div class="w-20">
													<Input
														type="number"
														min="1"
														max={group.totalAvailable}
														value={selectedItems[group.id]?.qty || 1}
														oninput={(e) =>
															updateQty(
																group,
																parseInt(e.currentTarget.value),
																group.totalAvailable
															)}
														class="h-8 text-center"
														disabled={selectedItems[group.id]?.manualIds?.length > 0}
													/>
												</div>
											</div>
										{/if}

										<Button
											type="button"
											variant="ghost"
											size="icon"
											class="size-8"
											onclick={() => toggleGroupExpand(group.id)}
										>
											{#if expandedGroups[group.id]}
												<ChevronUp class="size-4" />
											{:else}
												<ChevronDown class="size-4" />
											{/if}
										</Button>
									</div>
								</div>

								{#if expandedGroups[group.id]}
									<div class="border-t bg-muted/20 p-4">
										<p class="mb-3 text-xs font-semibold text-muted-foreground uppercase">
											Pilih Unit Spesifik
										</p>
										<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-2">
											{#each group.equipments as eq (eq.id)}
												<button
													type="button"
													class="flex flex-col gap-2 rounded border bg-card p-3 text-left transition-colors hover:border-primary/50 {selectedItems[
														group.id
													]?.manualIds?.includes(eq.id)
														? 'border-primary bg-primary/5 ring-1 ring-primary'
														: ''}"
													onclick={() => toggleManualUnit(group, eq.id)}
												>
													<div class="flex items-center justify-between">
														<span class="font-mono text-sm font-bold"
															>{eq.serialNumber || 'Tanpa SN'}</span
														>
														{#if selectedItems[group.id]?.manualIds?.includes(eq.id)}
															<Check class="size-4 text-primary" />
														{/if}
													</div>
													<div class="flex flex-wrap gap-2">
														<Badge variant="outline" class=" {getConditionColor(eq.condition)}">
															{equipmentConditionLabel[eq.condition]}
														</Badge>
														<Badge variant="outline">
															{equipmentStatusLabel[eq.status]}
														</Badge>
													</div>
												</button>
											{/each}
										</div>
										{#if selectedItems[group.id]?.manualIds?.length > 0}
											<p class="mt-3 text-[10px] text-primary italic">
												* Mode pemilihan manual aktif. Jumlah dikunci sesuai unit yang dipilih.
											</p>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>

					<!-- Paginasi -->
					{#if totalPages > 1}
						<div class="flex items-center justify-between pt-4">
							<span class="text-sm text-muted-foreground">
								Menampilkan {groupedEquipment.length} dari {totalItems} alat
							</span>
							<div class="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={currentPage === 1 || isLoading}
									onclick={() => (currentPage = Math.max(1, currentPage - 1))}
								>
									Sebelumnya
								</Button>
								<span class="px-2 text-sm font-medium">
									Halaman {currentPage} dari {totalPages}
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={currentPage === totalPages || isLoading}
									onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
								>
									Selanjutnya
								</Button>
							</div>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Hidden Fields for all selected items (including those on other pages) -->
			{#each Object.entries(selectedItems) as [groupId, item]}
				{#if item.selected}
					{#if item.manualIds && item.manualIds.length > 0}
						{#each item.manualIds as manualId}
							<input type="hidden" name="manualEquipmentId[]" value={manualId} />
						{/each}
					{:else}
						<input type="hidden" name="itemId[]" value={item.itemId} />
						<input type="hidden" name="warehouseId[]" value={item.warehouseId} />
						<input type="hidden" name="condition[]" value={item.condition} />
						<input type="hidden" name="qty[]" value={item.qty || 1} />
					{/if}
				{/if}
			{/each}

			<div class="flex justify-end gap-3 pt-4">
				<Button variant="ghost" size="lg" href={`/${page.params.org_slug}/peminjaman`}>Batal</Button
				>
				<Button type="submit" size="lg" disabled={$delayed || selectedCount === 0}>
					Kirim Pengajuan
				</Button>
			</div>
		</form>
	{:else}
		<div class="rounded-lg border-2 border-dashed bg-muted/50 p-20 text-center">
			<p class="text-xl font-medium text-muted-foreground">
				Silakan pilih satuan tujuan terlebih dahulu untuk melihat daftar alat.
			</p>
		</div>
	{/if}

	<!-- Notification Dialog -->
	<NotificationDialog
		bind:open={notificationOpen}
		type={notificationType}
		title={notificationTitle}
		description={notificationMsg}
		actionLabel={notificationActionLabel}
		onAction={handleNotificationAction}
	/>
</div>
