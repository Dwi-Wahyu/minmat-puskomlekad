<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { ChevronLeft, Save, Loader2 } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	// Form states for Select bindings
	let warehouseId = $state('');
	let condition = $state('BAIK');
	let status = $state('READY');
	let classification = $state('');

	const typeLabel = $derived(data.type === 'alpernika' ? 'Pernika & Lek' : 'Alkomlek');

	function handleAction() {
		if (notificationType === 'success') {
			window.location.href = `/${page.params.org_slug}/alat/${data.type}`;
		}
	}
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
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
		use:enhance={() => {
			loading = true;
			return ({ result }) => {
				loading = false;
				if (result?.type === 'success') {
					notificationMsg = (result.data as any)?.message || 'Alat berhasil ditambahkan';
					notificationType = 'success';
					notificationOpen = true;
				} else if (result?.type === 'failure') {
					notificationMsg = (result.data as any)?.message || 'Terjadi kesalahan';
					notificationType = 'error';
					notificationOpen = true;
				}
			};
		}}
		class="grid gap-8 rounded-lg border bg-card p-8 shadow-sm"
	>
		<div class="grid gap-6 md:grid-cols-2">
			<div class="space-y-2">
				<Label for="itemName">Nama Alat</Label>
				<Input name="itemName" id="itemName" required placeholder="Contoh: Radio HT, Jammer..." />
				<p class="text-xs text-muted-foreground">Nama spesifik atau model peralatan.</p>
			</div>

			<div class="space-y-2">
				<Label for="serialNumber">Serial Number (SN)</Label>
				<Input name="serialNumber" id="serialNumber" placeholder="Contoh: SN-12345678" />
				<p class="text-xs text-muted-foreground">Nomor seri unik</p>
			</div>

			<div class="space-y-2">
				<Label for="brand">Brand / Merek</Label>
				<Input name="brand" id="brand" placeholder="Contoh: Motorola, Kenwood..." />
			</div>

			<div class="space-y-2">
				<Label for="warehouseId">Gudang Penyimpanan</Label>
				<Select.Root type="single" bind:value={warehouseId}>
					<Select.Trigger class="w-full">
						{data.warehouses.find((w) => w.id === warehouseId)?.name || 'Tanpa Gudang'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">Tanpa Gudang</Select.Item>
						{#each data.warehouses as warehouse (warehouse.id)}
							<Select.Item value={warehouse.id}>{warehouse.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<input type="hidden" name="warehouseId" value={warehouseId} />
			</div>

			<div class="space-y-2">
				<Label for="condition">Kondisi Alat</Label>
				<Select.Root type="single" bind:value={condition}>
					<Select.Trigger class="w-full">
						{condition === 'BAIK'
							? 'Baik'
							: condition === 'RUSAK_RINGAN'
								? 'Rusak Ringan'
								: 'Rusak Berat'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="BAIK">Baik</Select.Item>
						<Select.Item value="RUSAK_RINGAN">Rusak Ringan</Select.Item>
						<Select.Item value="RUSAK_BERAT">Rusak Berat</Select.Item>
					</Select.Content>
				</Select.Root>
				<input type="hidden" name="condition" value={condition} />
			</div>

			<div class="space-y-2">
				<Label for="status">Status Aset</Label>
				<Select.Root type="single" bind:value={status}>
					<Select.Trigger class="w-full">
						{status === 'READY'
							? 'Ready (Tersedia)'
							: status === 'IN_USE'
								? 'In Use (Digunakan)'
								: status === 'TRANSIT'
									? 'Transit (Dalam Pengiriman)'
									: 'Maintenance (Perbaikan)'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="READY">Ready (Tersedia)</Select.Item>
						<Select.Item value="IN_USE">In Use (Digunakan)</Select.Item>
						<Select.Item value="TRANSIT">Transit (Dalam Pengiriman)</Select.Item>
						<Select.Item value="MAINTENANCE">Maintenance (Perbaikan)</Select.Item>
					</Select.Content>
				</Select.Root>
				<input type="hidden" name="status" value={status} />
			</div>

			<div class="space-y-2">
				<Label for="classification">Klasifikasi Mutasi</Label>
				<Select.Root type="single" bind:value={classification}>
					<Select.Trigger class="w-full">
						{classification === 'TRANSITO'
							? 'Transito'
							: classification === 'BALKIR'
								? 'Balkir'
								: classification === 'KOMUNITY'
									? 'Komunity'
									: '-- Pilih Klasifikasi --'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">-- Pilih Klasifikasi --</Select.Item>
						<Select.Item value="TRANSITO">Transito</Select.Item>
						<Select.Item value="BALKIR">Balkir</Select.Item>
						<Select.Item value="KOMUNITY">Komunity</Select.Item>
					</Select.Content>
				</Select.Root>
				<input type="hidden" name="classification" value={classification} />
				<p class="text-xs text-muted-foreground">Catat mutasi awal saat penambahan alat.</p>
			</div>

			<div class="space-y-2">
				<Label for="image">Gambar Peralatan</Label>
				<Input
					type="file"
					name="image"
					id="image"
					accept="image/png, image/jpeg, image/jpg"
					class="cursor-pointer"
				/>
				<p class="text-xs text-muted-foreground">Maksimal 5MB. Format: PNG, JPG, JPEG.</p>
			</div>
		</div>

		<div class="flex justify-end gap-3">
			<Button variant="outline" href="/{page.params.org_slug}/alat/{data.type}" disabled={loading}>
				Batal
			</Button>
			<Button type="submit" class="min-w-30 gap-2" disabled={loading}>
				{#if loading}
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
