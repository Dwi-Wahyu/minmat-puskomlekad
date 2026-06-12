<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { ArrowLeft, Loader2 } from '@lucide/svelte';
	import { superForm } from 'sveltekit-superforms';
	import { yupClient } from 'sveltekit-superforms/adapters';
	import { itemSchema } from '$lib/schemas/item-schema';
	import { untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, delayed, message } = superForm(
		untrack(() => data.form),
		{
			validators: yupClient(itemSchema),
			onUpdated: ({ form }) => {
				if (form.valid) {
					notificationMsg = $message || 'Data barang berhasil diperbarui.';
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
				notificationMsg = result.error.message || 'Terjadi kesalahan sistem.';
				notificationType = 'error';
				notificationOpen = true;
			}
		}
	);

	let notificationOpen = $state(false);
	let notificationType = $state<'success' | 'error' | 'info'>('success');
	let notificationMsg = $state('');

	let imagePreview = $state<string | null>(null);

	$effect(() => {
		untrack(() => {
			imagePreview = data.consumable.imagePath
				? `/uploads/item/${data.consumable.imagePath}`
				: null;
		});
	});

	function handleBack() {
		goto(`/${data.org_slug}/barang`);
	}

	function handleImageChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				imagePreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		} else {
			imagePreview = data.consumable.imagePath
				? `/uploads/item/${data.consumable.imagePath}`
				: null;
		}
	}
</script>

<div class="mx-auto max-w-4xl space-y-4 p-4 md:space-y-6 md:p-6">
	<div class="flex items-center gap-4">
		<Button
			variant="outline"
			size="icon"
			href="/{data.org_slug}/barang"
			class="rounded-full shadow-sm"
		>
			<ArrowLeft size={18} />
		</Button>
		<div>
			<h1 class="flex items-center gap-2 text-2xl font-bold">Edit Barang Habis Pakai</h1>
			<p class="text-sm text-slate-500">Perbarui informasi definisi barang.</p>
		</div>
	</div>

	<Card.Root>
		<Card.Content class="space-y-6">
			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance
				class="grid grid-cols-1 gap-6 md:grid-cols-2"
			>
				<div class="flex flex-col gap-2 md:col-span-2">
					<Label for="image">Foto Barang</Label>
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
						<div
							class="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed"
						>
							{#if imagePreview}
								<img src={imagePreview} alt="Preview" class="h-full w-full object-cover" />
							{:else}
								<div class="text-center text-xs text-slate-400">Belum ada foto</div>
							{/if}
						</div>
					</div>
					<div class="flex-1">
						<Input
							type="file"
							name="image"
							id="image"
							accept="image/*"
							onchange={handleImageChange}
							class="cursor-pointer"
						/>
						<p class="mt-1.5 text-xs text-muted-foreground">
							Format: JPG, PNG, atau WEBP. Maks: 5MB. Biarkan kosong jika tidak ingin mengubah foto.
						</p>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="name" class={$errors.name ? 'text-destructive' : ''}>Nama Barang</Label>
					<Input
						type="text"
						name="name"
						id="name"
						placeholder="Contoh: Baterai AA"
						bind:value={$form.name}
						aria-invalid={$errors.name ? 'true' : undefined}
					/>
					{#if $errors.name}
						<p class="text-xs font-medium text-destructive">{$errors.name}</p>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<Label for="baseUnit" class={$errors.baseUnit ? 'text-destructive' : ''}
						>Satuan Dasar</Label
					>
					<Select.Root
						type="single"
						value={$form.baseUnit}
						onValueChange={(v) => ($form.baseUnit = v as any)}
					>
						<Select.Trigger class="w-full">
							{$form.baseUnit || 'Pilih Satuan'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="PCS">PCS</Select.Item>
							<Select.Item value="BOX">BOX</Select.Item>
							<Select.Item value="METER">METER</Select.Item>
							<Select.Item value="ROLL">ROLL</Select.Item>
							<Select.Item value="UNIT">UNIT</Select.Item>
						</Select.Content>
					</Select.Root>
					{#if $errors.baseUnit}
						<p class="text-xs font-medium text-destructive">{$errors.baseUnit}</p>
					{/if}
					<input type="hidden" name="baseUnit" value={$form.baseUnit} />
				</div>

				<div class="flex flex-col gap-2 md:col-span-2">
					<Label for="description" class={$errors.description ? 'text-destructive' : ''}
						>Deskripsi / Keterangan</Label
					>
					<Textarea
						name="description"
						id="description"
						placeholder="Tambahkan catatan singkat tentang barang ini..."
						class="min-h-24"
						bind:value={$form.description}
						aria-invalid={$errors.description ? 'true' : undefined}
					/>
					{#if $errors.description}
						<p class="text-xs font-medium text-destructive">{$errors.description}</p>
					{/if}
				</div>

				<div class="flex justify-end gap-4 md:col-span-2">
					<Button variant="outline" onclick={handleBack} disabled={$delayed}>Batal</Button>
					<Button type="submit" class="min-w-40" disabled={$delayed}>
						{#if $delayed}
							<Loader2 class="mr-2 size-4 animate-spin" />
							Menyimpan...
						{:else}
							Update Data Barang
						{/if}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil!' : 'Gagal!'}
	description={notificationMsg}
	onAction={() => {
		notificationOpen = false;
		if (notificationType === 'success') handleBack();
	}}
/>
