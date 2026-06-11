<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { yup } from 'sveltekit-superforms/adapters';
	import { barangMutationSchema } from '$lib/schemas/barang-mutation-schema';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ChevronLeft, Package, ArrowRightLeft } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { resolve } from '$app/paths';
	import type { Stock } from '$lib/server/db/schema';
	import { movementClassificationLabel } from '$lib/enums/movement-enum';
	import type { PageData } from './$types';
	import { untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, delayed } = superForm(
		untrack(() => data.form),
		{
			validators: yup(barangMutationSchema),
			onUpdated: ({ form }) => {
				if (form.message) {
					notificationMsg = form.message;
					notificationType = form.valid ? 'success' : 'error';
					notificationOpen = true;
				}
			},
			onSubmit: ({ cancel }) => {
				if ($form.type === 'TRANSFER_OUT') {
					if ($form.warehouseId === $form.toWarehouseId) {
						notificationMsg = 'Gudang asal dan tujuan tidak boleh sama';
						notificationType = 'error';
						notificationOpen = true;
						cancel();
						return;
					}

					const stock = Number(currentStockInSelectedWarehouse);
					if (stock <= 0) {
						notificationMsg = 'Stok di gudang asal kosong, tidak dapat melakukan transfer keluar';
						notificationType = 'error';
						notificationOpen = true;
						cancel();
						return;
					}

					if ($form.qty > stock) {
						notificationMsg = 'Stok tidak mencukupi untuk jumlah transfer tersebut';
						notificationType = 'error';
						notificationOpen = true;
						cancel();
						return;
					}
				}
			}
		}
	);

	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	const typeOptions = [
		{ value: 'RECEIVE', label: 'Masuk (Receive)' },
		{ value: 'ISSUE', label: 'Keluar (Issue)' },
		{ value: 'ADJUSTMENT', label: 'Penyesuaian (Adjustment)' },
		{ value: 'TRANSFER_OUT', label: 'Transfer Keluar' },
		{ value: 'TRANSFER_IN', label: 'Transfer Masuk' }
	];

	const classificationOptions = Object.entries(movementClassificationLabel).map(
		([value, label]) => ({
			value,
			label
		})
	);

	const selectedTypeLabel = $derived(
		typeOptions.find((o) => o.value === $form.type)?.label ?? 'Pilih Jenis'
	);

	const selectedWhLabel = $derived(
		data.warehouses.find((w: { id: string }) => w.id === $form.warehouseId)?.name ?? 'Pilih Gudang'
	);

	const selectedToWhLabel = $derived(
		data.warehouses.find((w: { id: string }) => w.id === $form.toWarehouseId)?.name ??
			'Pilih Gudang Tujuan'
	);

	const selectedClassLabel = $derived(
		classificationOptions.find((o) => o.value === $form.classification)?.label ??
			'Pilih Klasifikasi'
	);

	const currentStockInSelectedWarehouse = $derived(
		data.stocks.find((s: Stock) => s.warehouseId === $form.warehouseId)?.qty ?? '0.0000'
	);

	function handleClose() {
		if (notificationType === 'success') {
			goto(resolve('/(app)/[org_slug]/barang/[id]', { org_slug: data.org_slug, id: data.item.id }));
		}
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex items-center gap-4">
		<Button
			variant="outline"
			size="icon"
			href={resolve('/(app)/[org_slug]/barang/[id]', {
				org_slug: data.org_slug,
				id: data.item.id
			})}
		>
			<ChevronLeft class="size-4" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Mutasi Barang</h1>
			<p class="text-sm text-muted-foreground">Catat pergerakan stok.</p>
		</div>
	</div>

	<div class="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
		<!-- Left Card: Item Info -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Package class="size-5 text-primary" />
					Informasi Barang
				</Card.Title>
			</Card.Header>
			<Card.Content class="grid gap-6">
				<div class="space-y-1">
					<Label>Nama Barang</Label>
					<p class="text-muted-foreground">{data.item.name}</p>
				</div>

				<div class="space-y-2">
					<Label>Satuan Dasar</Label>
					<Badge variant="outline" class="uppercase">
						{data.item.baseUnit}
					</Badge>
				</div>

				{#if $form.warehouseId}
					<div class="rounded-lg border bg-muted/50 p-4">
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>Stok Saat Ini</Label>
								<p class="text-2xl font-bold text-foreground">
									{Number(currentStockInSelectedWarehouse)}
									<span class="text-sm font-normal text-muted-foreground">{data.item.baseUnit}</span
									>
								</p>
							</div>
						</div>
					</div>
				{:else}
					<div
						class="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
					>
						Pilih gudang untuk melihat stok
					</div>
				{/if}

				<div class="space-y-1">
					<Label>Deskripsi</Label>
					<p class="text-sm text-muted-foreground">
						{data.item.description || 'Tidak ada deskripsi.'}
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Right Card: Form -->
		<Card.Root class="md:col-span-2">
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<ArrowRightLeft class="size-5 text-blue-600" />
					Form Mutasi
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<form method="POST" use:enhance class="grid gap-6">
					<input type="hidden" name="itemId" bind:value={$form.itemId} />

					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label for="warehouseId"
								>{$form.type === 'TRANSFER_OUT' ? 'Asal' : 'Pilih Gudang'}</Label
							>
							<Select.Root type="single" bind:value={$form.warehouseId as string}>
								<Select.Trigger class="w-full">
									{selectedWhLabel}
								</Select.Trigger>
								<Select.Content>
									{#each data.warehouses as wh (wh.id)}
										<Select.Item value={wh.id} label={wh.name}>{wh.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<input type="hidden" name="warehouseId" bind:value={$form.warehouseId} />
							{#if $errors.warehouseId}
								<p class="text-sm text-destructive">{$errors.warehouseId}</p>
							{/if}
						</div>

						{#if $form.type === 'TRANSFER_OUT'}
							<div class="space-y-2">
								<Label for="toWarehouseId">Tujuan</Label>
								<Select.Root type="single" bind:value={$form.toWarehouseId as string}>
									<Select.Trigger class="w-full">
										{selectedToWhLabel}
									</Select.Trigger>
									<Select.Content>
										{#each data.warehouses as wh (wh.id)}
											{#if wh.id !== $form.warehouseId}
												<Select.Item value={wh.id} label={wh.name}>{wh.name}</Select.Item>
											{/if}
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" name="toWarehouseId" bind:value={$form.toWarehouseId} />
								{#if $errors.toWarehouseId}
									<p class="text-sm text-destructive">{$errors.toWarehouseId}</p>
								{/if}
							</div>
						{/if}
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label for="type">Jenis Pergerakan</Label>
							<Select.Root type="single" bind:value={$form.type as string}>
								<Select.Trigger class="w-full">
									{selectedTypeLabel}
								</Select.Trigger>
								<Select.Content>
									{#each typeOptions as opt (opt.value)}
										<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<input type="hidden" name="type" bind:value={$form.type} />
							{#if $errors.type}
								<p class="text-sm text-destructive">{$errors.type}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="classification">Klasifikasi</Label>
							<Select.Root type="single" bind:value={$form.classification as string}>
								<Select.Trigger class="w-full">
									{selectedClassLabel}
								</Select.Trigger>
								<Select.Content>
									{#each classificationOptions as opt (opt.value)}
										<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<input type="hidden" name="classification" bind:value={$form.classification} />
							{#if $errors.classification}
								<p class="text-sm text-destructive">{$errors.classification}</p>
							{/if}
						</div>
					</div>

					<div class="space-y-2">
						<Label for="qty">Jumlah (Qty)</Label>
						<Input
							type="number"
							id="qty"
							name="qty"
							bind:value={$form.qty}
							step="0.0001"
							placeholder="Masukkan jumlah..."
						/>
						{#if $errors.qty}
							<p class="text-sm text-destructive">{$errors.qty}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="notes">Catatan / Keterangan</Label>
						<Textarea
							id="notes"
							name="notes"
							bind:value={$form.notes as string}
							placeholder="Contoh: Stok masuk dari pengadaan pusat..."
						/>
						{#if $errors.notes}
							<p class="text-sm text-destructive">{$errors.notes}</p>
						{/if}
					</div>

					<div class="flex justify-end gap-3">
						<Button
							variant="outline"
							href={resolve('/(app)/[org_slug]/barang/[id]', {
								org_slug: data.org_slug,
								id: data.item.id
							})}>Batal</Button
						>
						<Button type="submit" disabled={$delayed}>
							{#if $delayed}
								Menyimpan...
							{:else}
								Simpan Mutasi
							{/if}
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={handleClose}
/>
