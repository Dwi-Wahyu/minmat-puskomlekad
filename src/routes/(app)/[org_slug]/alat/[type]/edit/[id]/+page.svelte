<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { ChevronLeft, Save, Loader2, Trash2, Plus, Layers } from '@lucide/svelte';
	import { superForm } from 'sveltekit-superforms';
	import { yupClient } from 'sveltekit-superforms/adapters';
	import { equipmentSchema } from '$lib/schemas/equipment-schema';
	import { equipmentConditionLabel, equipmentStatusLabel } from '@/enums/equipment-enum';
	import { untrack } from 'svelte';
	import {
		SearchableSelect,
		SearchableSelectContent,
		SearchableSelectItem,
		SearchableSelectTrigger
	} from '$lib/components/ui/searchable-select';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, delayed, message } = superForm(
		untrack(() => data.form),
		{
			validators: yupClient(equipmentSchema),
			dataType: 'json',
			onUpdated: ({ form }) => {
				if (form.valid) {
					notificationMsg = $message || 'Data alat berhasil diperbarui';
					notificationType = 'success';
					notificationOpen = true;
				} else {
					const hasFieldErrors = Object.values($errors).some((error) => error !== undefined);
					if ($message && !hasFieldErrors) {
						notificationMsg = $message;
						notificationType = 'error';
						notificationOpen = true;
					}
				}
			},
			onError: ({ result }) => {
				notificationMsg = result.error.message || 'Terjadi kesalahan';
				notificationType = 'error';
				notificationOpen = true;
			}
		}
	);

	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	let imagePreview = $state<string | null>(null);

	$effect(() => {
		untrack(() => {
			imagePreview = data.equipment.item.imagePath
				? `/uploads/item/${data.equipment.item.imagePath}`
				: null;
		});
	});

	function handleImageChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			$form.image = file;
			const reader = new FileReader();
			reader.onload = (e) => {
				imagePreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		} else {
			$form.image = undefined;
			imagePreview = data.equipment.item.imagePath
				? `/uploads/item/${data.equipment.item.imagePath}`
				: null;
		}
	}

	const typeLabel = $derived(data.type === 'alpernika' ? 'Pernika & Lek' : 'Alkomlek');

	function handleAction() {
		if (notificationType === 'success') {
			window.location.href = `/${page.params.org_slug}/alat/${data.type}`;
		}
	}
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:gap-6 md:p-6">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" href="/{page.params.org_slug}/alat/{data.type}">
			<ChevronLeft class="size-4" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Edit {typeLabel}</h1>
			<p class="text-muted-foreground">Perbarui informasi peralatan yang sudah ada.</p>
		</div>
	</div>

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance
		class="grid gap-8 rounded-lg border bg-card p-6 shadow-sm"
	>
		{#if imagePreview}
			<div class="space-y-2">
				<Label for="image">Gambar</Label>

				<div class="aspect-video h-40 w-40 overflow-hidden rounded-xl border bg-muted shadow-sm">
					<img src={imagePreview} alt={data.equipment.item.name} class="size-full object-cover" />
				</div>
			</div>
		{/if}

		<!-- KATEGORI FIELD -->
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<Label class="text-sm font-bold">Kategori Alat</Label>
				<button
					type="button"
					onclick={() => {
						$form.categoryMode = $form.categoryMode === 'select' ? 'new' : 'select';
					}}
					class="text-xs font-semibold text-primary hover:underline"
				>
					{$form.categoryMode === 'select' ? '+ Buat Kategori Baru' : 'Pilih Kategori Terdaftar'}
				</button>
			</div>

			<!-- Hidden Inputs untuk data superforms -->
			<input type="hidden" name="categoryMode" value={$form.categoryMode} />

			{#if $form.categoryMode === 'select'}
				<div class="space-y-2">
					<Label for="categoryId">Pilih Kategori</Label>
					<SearchableSelect type="single" bind:value={$form.categoryId}>
						<SearchableSelectTrigger class="w-full bg-card text-left text-xs">
							{(() => {
								const cat = data.categories?.find((c: any) => c.id === $form.categoryId);
								if (!cat) return 'Pilih Kategori...';
								return cat.parent ? `${cat.parent.name} - ${cat.name}` : cat.name;
							})()}
						</SearchableSelectTrigger>
						<SearchableSelectContent>
							<SearchableSelectItem value="" label="Tanpa Kategori"
								>Tanpa Kategori</SearchableSelectItem
							>
							{#each data.categories || [] as cat (cat.id)}
								{@const label = cat.parent ? `${cat.parent.name} - ${cat.name}` : cat.name}
								<SearchableSelectItem value={cat.id} {label}>
									{label}
								</SearchableSelectItem>
							{/each}
						</SearchableSelectContent>
					</SearchableSelect>
					<input type="hidden" name="categoryId" value={$form.categoryId || ''} />
					<p class="text-xs text-muted-foreground">
						Kategori mempermudah pengelompokan pada laporan BTK-16.
					</p>
				</div>
			{:else}
				<div class="grid gap-4 pt-2 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="newCategoryName"
							>Nama Kategori Baru <span class="text-destructive">*</span></Label
						>
						<Input
							name="newCategoryName"
							id="newCategoryName"
							placeholder="Masukkan nama kategori baru..."
							bind:value={$form.newCategoryName}
						/>
					</div>
					<div class="space-y-2">
						<Label for="parentCategoryId"
							>Kategori Induk <span class="text-xs text-muted-foreground">(Opsional)</span></Label
						>
						<Select.Root
							type="single"
							value={$form.parentCategoryId || ''}
							onValueChange={(val) => {
								$form.parentCategoryId = val || null;
							}}
						>
							<Select.Trigger class="w-full bg-card text-left text-xs">
								{data.categories?.find((c: any) => c.id === $form.parentCategoryId)?.name ||
									'Tidak Ada (Kategori Utama)'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="">Tidak Ada (Kategori Utama)</Select.Item>
								{#each (data.categories || []).filter((c: any) => !c.parentId) as cat (cat.id)}
									<Select.Item value={cat.id}>{cat.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="parentCategoryId" value={$form.parentCategoryId || ''} />
					</div>
				</div>
			{/if}
		</div>

		<!-- TOGGLE ALAT BERUPA SET -->
		<div class="flex items-center justify-between rounded-lg border bg-muted/30 p-4 shadow-sm">
			<div class="space-y-0.5">
				<div class="flex items-center gap-2">
					<Layers class="size-4 text-primary" />
					<Label for="isSetToggleEdit" class="text-sm font-bold cursor-pointer">Alat Berupa Set / Kit</Label>
				</div>
				<p class="text-xs text-muted-foreground">
					Aktifkan jika alat ini terdiri dari beberapa komponen/subset fisik (misal: Antena Satelit, Adaptor, dll.).
				</p>
			</div>
			<div class="flex items-center">
				<input
					type="checkbox"
					id="isSetToggleEdit"
					class="h-5 w-5 rounded border-input text-primary focus:ring-primary cursor-pointer"
					bind:checked={$form.isSet}
					onchange={() => {
						if ($form.isSet) {
							$form.baseUnit = 'SET';
							if (!$form.components || $form.components.length === 0) {
								$form.components = [
									{ name: '', brand: '', condition: 'BAIK', isRequired: true }
								];
							}
						} else {
							$form.baseUnit = 'UNIT';
						}
					}}
				/>
				<input type="hidden" name="isSet" value={$form.isSet ? 'true' : 'false'} />
				<input type="hidden" name="baseUnit" value={$form.baseUnit || ($form.isSet ? 'SET' : 'UNIT')} />
			</div>
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<div class="space-y-2">
				<Label for="itemName" class={$errors.itemName ? 'text-destructive' : ''}>Nama Alat</Label>
				<Input
					name="itemName"
					id="itemName"
					placeholder="Contoh: Radio HT, Jammer, Starlink..."
					aria-invalid={$errors.itemName ? 'true' : undefined}
					bind:value={$form.itemName}
				/>
				{#if $errors.itemName}
					<p class="text-xs font-medium text-destructive">{$errors.itemName}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="serialNumber" class={$errors.serialNumber ? 'text-destructive' : ''}>
					{$form.isSet ? 'Serial Number (SN) Set Utama' : 'Serial Number (SN)'}
				</Label>
				<Input
					name="serialNumber"
					id="serialNumber"
					placeholder={$form.isSet ? 'Contoh: SN-SET-001' : 'Contoh: SN-12345678'}
					aria-invalid={$errors.serialNumber ? 'true' : undefined}
					bind:value={$form.serialNumber}
				/>
				{#if $errors.serialNumber}
					<p class="text-xs font-medium text-destructive">{$errors.serialNumber}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="brand">Brand / Merek</Label>
				<Input
					name="brand"
					id="brand"
					placeholder="Contoh: Motorola, Kenwood..."
					bind:value={$form.brand}
				/>
			</div>

			<div class="space-y-2">
				<Label for="warehouseId">Gudang Penyimpanan</Label>
				<Select.Root
					type="single"
					value={$form.warehouseId || ''}
					onValueChange={(v) => ($form.warehouseId = v)}
				>
					<Select.Trigger class="w-full">
						{data.warehouses.find((w) => w.id === $form.warehouseId)?.name || 'Tanpa Gudang'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">Tanpa Gudang</Select.Item>
						{#each data.warehouses as warehouse (warehouse.id)}
							<Select.Item value={warehouse.id}>{warehouse.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<input type="hidden" name="warehouseId" value={$form.warehouseId} />
			</div>

			<div class="space-y-2">
				<Label for="condition">Kondisi Alat</Label>
				<Select.Root
					type="single"
					value={$form.condition || ''}
					onValueChange={(v) =>
						($form.condition = v as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'RUSAK_TOTAL')}
				>
					<Select.Trigger class="w-full">
						{equipmentConditionLabel[$form.condition]}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="BAIK">Baik</Select.Item>
						<Select.Item value="RUSAK_RINGAN">Rusak Ringan</Select.Item>
						<Select.Item value="RUSAK_BERAT">Rusak Berat</Select.Item>
						<Select.Item value="RUSAK_TOTAL">Rusak Total</Select.Item>
					</Select.Content>
				</Select.Root>
				<input type="hidden" name="condition" value={$form.condition} />
			</div>

			<div class="space-y-2">
				<Label for="image" class={$errors.image ? 'text-destructive' : ''}>Gambar Baru</Label>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div class="flex-1 space-y-2">
						<Input
							type="file"
							name="image"
							id="image"
							accept="image/png, image/jpeg, image/jpg"
							onchange={handleImageChange}
						/>
						{#if $errors.image}
							<p class="text-xs font-medium text-destructive">{$errors.image}</p>
						{:else}
							<p class="text-xs text-muted-foreground">Max 5MB. Format: PNG, JPG, JPEG.</p>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- SECTION RINCIAN KOMPONEN SET -->
		{#if $form.isSet}
			<div class="space-y-4">
				<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h3 class="text-base font-bold text-foreground">Rincian Subset Alat</h3>
						<p class="text-xs text-muted-foreground">
							Daftarkan sub-komponen fisik beserta kondisinya masing-masing.
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						class="gap-1.5 text-xs font-semibold bg-background"
						onclick={() => {
							$form.components = [
								...($form.components || []),
								{ name: '', brand: '', condition: 'BAIK', isRequired: true }
							];
						}}
					>
						<Plus class="size-3.5" />
						Tambah Komponen
					</Button>
				</div>

				{#if !$form.components || $form.components.length === 0}
					<div class="rounded-md border border-dashed bg-background p-6 text-center">
						<p class="text-xs text-muted-foreground italic">
							Belum ada komponen yang ditambahkan. Klik tombol "+ Tambah Komponen" di atas untuk menambahkan rincian subset alat.
						</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each $form.components as component, idx (idx)}
							<div class="grid gap-3 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-12 items-end">
								{#if component.id}
									<input type="hidden" name="components[{idx}].id" value={component.id} />
								{/if}
								<div class="sm:col-span-7 space-y-1.5">
									<Label class="text-xs font-semibold">Nama Komponen <span class="text-destructive">*</span></Label>
									<Input
										name="components[{idx}].name"
										placeholder="Contoh: Adaptor, Antena Satelit"
										class="h-9 text-xs"
										bind:value={component.name}
									/>
								</div>
								<div class="sm:col-span-4 space-y-1.5">
									<Label class="text-xs font-semibold">Kondisi</Label>
									<Select.Root
										type="single"
										value={component.condition || 'BAIK'}
										onValueChange={(v) => {
											if (v) {
												const condition = v as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'RUSAK_TOTAL';
												$form.components[idx].condition = condition;
												component.condition = condition;
											}
										}}
									>
										<Select.Trigger class="h-9 w-full bg-background text-xs">
											{equipmentConditionLabel[component.condition] || 'Pilih Kondisi'}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="BAIK">Baik</Select.Item>
											<Select.Item value="RUSAK_RINGAN">Rusak Ringan</Select.Item>
											<Select.Item value="RUSAK_BERAT">Rusak Berat</Select.Item>
											<Select.Item value="RUSAK_TOTAL">Rusak Total</Select.Item>
										</Select.Content>
									</Select.Root>
									<input type="hidden" name="components[{idx}].condition" value={component.condition} />
								</div>
								<div class="sm:col-span-1 flex justify-end">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										class="text-destructive hover:bg-destructive/10 size-9"
										onclick={() => {
											$form.components = $form.components.filter((_, i) => i !== idx);
										}}
									>
										<Trash2 class="size-4" />
									</Button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<div class="flex justify-end gap-3">
			<Button variant="outline" href="/{page.params.org_slug}/alat/{data.type}" disabled={$delayed}>
				Batal
			</Button>
			<Button type="submit" class="min-w-30 gap-2" disabled={$delayed}>
				{#if $delayed}
					<Loader2 class="size-4 animate-spin" />
					Memperbarui...
				{:else}
					<Save class="size-4" />
					Simpan Perubahan
				{/if}
			</Button>
		</div>
	</form>
</div>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={handleAction}
/>
