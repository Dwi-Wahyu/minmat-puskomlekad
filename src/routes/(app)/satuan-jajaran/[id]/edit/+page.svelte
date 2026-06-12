<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { ChevronLeft, Save, Building2 } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { untrack } from 'svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let name = $state(untrack(() => data.targetOrg.name));
	let displayName = $state(untrack(() => data.targetOrg.displayName ?? ''));
	let slug = $state(untrack(() => data.targetOrg.slug));
	let loading = $state(false);

	// Auto generate slug from name
	function handleNameChange(e: Event) {
		const target = e.target as HTMLInputElement;
		name = target.value;
		// Format to lowercase, replace spaces with hyphen, remove special chars
		slug = name
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '');
	}

	function handleSlugChange(e: Event) {
		const target = e.target as HTMLInputElement;
		// Force format even if user types manually
		slug = target.value
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '');
	}
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 md:gap-6 md:p-6">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" href="/satuan-jajaran/{data.targetOrg.id}">
			<ChevronLeft class="size-4" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Edit Satuan</h1>
			<p class="text-sm text-muted-foreground">Perbarui informasi dasar satuan jajaran.</p>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Building2 class="size-5" />
				Informasi Satuan
			</Card.Title>
			<Card.Description>
				Pastikan slug sesuai dengan format standar (huruf kecil dan tanda hubung).
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if form?.message}
				<Alert.Root variant="destructive" class="mb-6">
					<Alert.Description>{form.message}</Alert.Description>
				</Alert.Root>
			{/if}

			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
				class="space-y-6"
			>
				<div class="space-y-2">
					<Label for="name">Nama Satuan <span class="text-destructive">*</span></Label>
					<Input
						id="name"
						name="name"
						bind:value={name}
						oninput={handleNameChange}
						placeholder="Contoh: Batalyon Infanteri 1"
						required
					/>
				</div>

				<div class="space-y-2">
					<Label for="displayName">Nama Tampilan (Display Name)</Label>
					<Input
						id="displayName"
						name="displayName"
						bind:value={displayName}
						placeholder="Contoh: Yonif 1"
					/>
					<p class="text-[10px] text-muted-foreground">
						Nama alternatif/singkat yang akan ditampilkan pada layout/navigasi. (Opsional)
					</p>
				</div>

				<div class="space-y-2">
					<Label for="slug">Slug (URL) <span class="text-destructive">*</span></Label>
					<Input
						id="slug"
						name="slug"
						bind:value={slug}
						oninput={handleSlugChange}
						placeholder="contoh-batalyon-infanteri-1"
						required
					/>
					<p class="text-[10px] text-muted-foreground">
						Akan digunakan pada URL sistem. Format: huruf kecil dan tanpa spasi.
					</p>
				</div>

				<div class="space-y-2">
					<Label for="logo">Logo Satuan</Label>
					<div class="flex items-center gap-4">
						{#if data.targetOrg.logo}
							<div class="h-16 w-16 overflow-hidden rounded-md border bg-muted">
								<img
									src="/uploads/organization/{data.targetOrg.logo}"
									alt="Current Logo"
									class="h-full w-full object-cover"
								/>
							</div>
						{/if}
						<div class="flex-1">
							<Input
								id="logo"
								name="logo"
								type="file"
								accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
								class="cursor-pointer file:text-primary"
							/>
							<p class="mt-1 text-[10px] text-muted-foreground">
								Format: PNG, JPG, JPEG, SVG, WEBP. Maks 5MB. Biarkan kosong jika tidak ingin
								mengubah.
							</p>
						</div>
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<Button type="submit" disabled={loading || !name || !slug}>
						<Save class="mr-2 size-4" />
						{loading ? 'Menyimpan...' : 'Simpan Perubahan'}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
