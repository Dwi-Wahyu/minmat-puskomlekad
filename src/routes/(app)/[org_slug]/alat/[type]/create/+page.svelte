<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { ChevronLeft, Save, Loader2 } from '@lucide/svelte';
	import { equipmentConditionLabel, equipmentStatusLabel } from '@/enums/equipment-enum';
	import { superForm } from 'sveltekit-superforms';
	import { yupClient } from 'sveltekit-superforms/adapters';
	import { equipmentSchema } from '$lib/schemas/equipment-schema';
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
			onUpdated: ({ form }) => {
				if (form.valid) {
					notificationMsg = $message || 'Alat berhasil ditambahkan';
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

	const typeLabel = $derived(data.type === 'alpernika' ? 'Pernika & Lek' : 'Alkomlek');

	function handleAction() {
		if (notificationType === 'success') {
			window.location.href = `/${page.params.org_slug}/alat/${data.type}`;
		}
	}

	async function scrollToError() {
		await tick();
		const errorElement = document.querySelector('[aria-invalid="true"], .text-destructive');
		if (errorElement) {
			errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
			if (errorElement instanceof HTMLInputElement || errorElement instanceof HTMLSelectElement) {
				errorElement.focus();
			}
		}
	}

	const isKepalaGudangSatuan = $derived(
		data.user.role === 'kepalaGudang' && data.user.warehouseHeadType === null
	);
	const isHeadBalkir = $derived(
		data.user.role === 'kepalaGudang' && data.user.warehouseHeadType === 'BALKIR'
	);
	const isHeadTransito = $derived(
		data.user.role === 'kepalaGudang' && data.user.warehouseHeadType === 'TRANSITO'
	);
	const isHeadKomunity = $derived(
		data.user.role === 'kepalaGudang' && data.user.warehouseHeadType === 'KOMUNITY'
	);

	$effect(() => {
		if (Object.keys($errors).length > 0) {
			scrollToError();
		}
	});
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:gap-6 md:p-6">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" href="/{page.params.org_slug}/alat/{data.type}">
			<ChevronLeft class="size-4" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Tambah {typeLabel}</h1>
			<p class="text-muted-foreground">Masukkan informasi peralatan baru ke dalam sistem.</p>
		</div>
	</div>

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance
		class="grid gap-8 rounded-lg border bg-card p-6 shadow-sm"
	>
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
						<SearchableSelectTrigger class="w-full text-left text-xs">
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

		<div class="grid gap-6 md:grid-cols-2">
			<div class="space-y-2">
				<Label for="itemName" class={$errors.itemName ? 'text-destructive' : ''}>Nama Alat</Label>
				<Input
					name="itemName"
					id="itemName"
					placeholder="Contoh: Radio HT, Jammer..."
					aria-invalid={$errors.itemName ? 'true' : undefined}
					bind:value={$form.itemName}
				/>
				{#if $errors.itemName}
					<p class="text-xs font-medium text-destructive">{$errors.itemName}</p>
				{:else}
					<p class="text-xs text-muted-foreground">Nama spesifik atau model peralatan.</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="serialNumber" class={$errors.serialNumber ? 'text-destructive' : ''}
					>Serial Number (SN)</Label
				>
				<Input
					name="serialNumber"
					id="serialNumber"
					placeholder="Contoh: SN-12345678"
					aria-invalid={$errors.serialNumber ? 'true' : undefined}
					bind:value={$form.serialNumber}
				/>
				{#if $errors.serialNumber}
					<p class="text-xs font-medium text-destructive">{$errors.serialNumber}</p>
				{:else}
					<p class="text-xs text-muted-foreground">Nomor seri unik</p>
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
					onValueChange={(v) => {
						$form.condition = v as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'RUSAK_TOTAL';
						if (v === 'RUSAK_TOTAL') {
							$form.status = 'DISPOSED';
						}
					}}
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
				<Label for="status">Status Aset</Label>
				<Select.Root
					type="single"
					value={$form.status || ''}
					onValueChange={(v) =>
						($form.status = v as 'READY' | 'IN_USE' | 'TRANSIT' | 'MAINTENANCE' | 'DISPOSED')}
				>
					<Select.Trigger class="w-full">
						{equipmentStatusLabel[$form.status as keyof typeof equipmentStatusLabel] || ''}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="READY">{equipmentStatusLabel['READY']}</Select.Item>
						<Select.Item value="IN_USE">{equipmentStatusLabel['IN_USE']}</Select.Item>
						<Select.Item value="TRANSIT">{equipmentStatusLabel['TRANSIT']}</Select.Item>
						<Select.Item value="MAINTENANCE">{equipmentStatusLabel['MAINTENANCE']}</Select.Item>
						<Select.Item value="DISPOSED">{equipmentStatusLabel['DISPOSED']}</Select.Item>
					</Select.Content>
				</Select.Root>
				<input type="hidden" name="status" value={$form.status} />
			</div>

			<div class="space-y-2">
				<Label for="classification">Klasifikasi Mutasi</Label>
				<Select.Root
					type="single"
					value={$form.classification || ''}
					onValueChange={(v) => ($form.classification = v as 'TRANSITO' | 'BALKIR' | 'KOMUNITY')}
				>
					<Select.Trigger class="w-full">
						{$form.classification === 'TRANSITO'
							? 'Transito'
							: $form.classification === 'BALKIR'
								? 'Balkir'
								: $form.classification === 'KOMUNITY'
									? 'Komunity'
									: '-- Pilih Klasifikasi --'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">-- Pilih Klasifikasi --</Select.Item>

						{#if isKepalaGudangSatuan}
							<Select.Item value="TRANSITO">Transito</Select.Item>
							<Select.Item value="BALKIR">Balkir</Select.Item>
							<Select.Item value="KOMUNITY">Komunity</Select.Item>
						{:else if isHeadBalkir}
							<Select.Item value="BALKIR">Balkir</Select.Item>
						{:else if isHeadTransito}
							<Select.Item value="BALKIR">Transito</Select.Item>
						{:else if isHeadKomunity}
							<Select.Item value="BALKIR">Komunity</Select.Item>
						{/if}
					</Select.Content>
				</Select.Root>
				<input type="hidden" name="classification" value={$form.classification} />
				<p class="text-xs text-muted-foreground">Catat mutasi awal saat penambahan alat.</p>
			</div>

			<div class="space-y-2">
				<Label for="image" class={$errors.image ? 'text-destructive' : ''}>Gambar Peralatan</Label>
				<Input
					type="file"
					name="image"
					id="image"
					accept="image/png, image/jpeg, image/jpg"
					class="cursor-pointer"
					onchange={(e) => {
						const file = e.currentTarget.files?.[0];
						if (file) $form.image = file;
					}}
				/>
				{#if $errors.image}
					<p class="text-xs font-medium text-destructive">{$errors.image}</p>
				{:else}
					<p class="text-xs text-muted-foreground">Max 5MB. Format: PNG, JPG, JPEG.</p>
				{/if}
			</div>
		</div>

		<div class="flex justify-end gap-3">
			<Button variant="outline" href="/{page.params.org_slug}/alat/{data.type}" disabled={$delayed}>
				Batal
			</Button>
			<Button type="submit" class="min-w-30 gap-2" disabled={$delayed}>
				{#if $delayed}
					<Loader2 class="size-4 animate-spin" />
					Menyimpan...
				{:else}
					<Save class="size-4" />
					Simpan Alat
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
