<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { ChevronLeft, Save, Loader2 } from '@lucide/svelte';
	import { superForm } from 'sveltekit-superforms';
	import { yupClient } from 'sveltekit-superforms/adapters';
	import { equipmentSchema } from '$lib/schemas/equipment-schema';
	import { equipmentConditionLabel, equipmentStatusLabel } from '@/enums/equipment-enum';
	import { untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, delayed, message } = superForm(
		untrack(() => data.form),
		{
			validators: yupClient(equipmentSchema),
			onUpdated: ({ form }) => {
				if (form.valid) {
					notificationMsg = $message || 'Data alat berhasil diperbarui';
					notificationType = 'success';
					notificationOpen = true;
				} else {
					const hasFieldErrors = Object.values($errors).some((error) => error !== undefined);
					if ($message && !hasFieldErrors) {
						// Only show dialog for general messages if there are no specific field errors
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
			const reader = new FileReader();
			reader.onload = (e) => {
				imagePreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		} else {
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
		{#if data.equipment.item.imagePath}
			<div class="space-y-2">
				<Label for="image">Gambar</Label>

				<div class="aspect-video h-40 w-40 overflow-hidden rounded-xl border bg-muted shadow-sm">
					<img
						src="/uploads/item/{data.equipment.item.imagePath}"
						alt={data.equipment.item.name}
						class="size-full object-cover"
					/>
				</div>
			</div>
		{/if}

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
					onValueChange={(v) => ($form.condition = v as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT')}
				>
					<Select.Trigger class="w-full">
						{equipmentConditionLabel[$form.condition]}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="BAIK">Baik</Select.Item>
						<Select.Item value="RUSAK_RINGAN">Rusak Ringan</Select.Item>
						<Select.Item value="RUSAK_BERAT">Rusak Berat</Select.Item>
					</Select.Content>
				</Select.Root>
				<input type="hidden" name="condition" value={$form.condition} />
			</div>

			<!-- <div class="space-y-2">
				<Label for="status">Status Aset</Label>
				<Select.Root
					type="single"
					value={$form.status || ''}
					onValueChange={(v) =>
						($form.status = v as 'READY' | 'IN_USE' | 'TRANSIT' | 'MAINTENANCE')}
				>
					<Select.Trigger class="w-full">
						{equipmentStatusLabel[$form.status as keyof typeof equipmentStatusLabel]}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="READY">{equipmentStatusLabel['READY']}</Select.Item>
						<Select.Item value="IN_USE">{equipmentStatusLabel['IN_USE']}</Select.Item>
						<Select.Item value="TRANSIT">{equipmentStatusLabel['TRANSIT']}</Select.Item>
						<Select.Item value="MAINTENANCE">{equipmentStatusLabel['MAINTENANCE']}</Select.Item>
					</Select.Content>
				</Select.Root>
				<input type="hidden" name="status" value={$form.status} />
			</div> -->

			<div class="space-y-2">
				<Label for="image">Gambar Baru</Label>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div class="flex-1 space-y-2">
						<Input
							type="file"
							name="image"
							id="image"
							accept="image/png, image/jpeg, image/jpg"
							onchange={handleImageChange}
						/>
						<p class="text-xs text-muted-foreground">Max 5MB. Format: PNG, JPG, JPEG.</p>
					</div>
				</div>
			</div>
		</div>

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
