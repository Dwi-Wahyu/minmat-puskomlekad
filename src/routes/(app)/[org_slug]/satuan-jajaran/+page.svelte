<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Plus, Pencil, Trash2, Building, Calendar, ArrowLeft } from '@lucide/svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	let { data }: { data: PageData } = $props();

	let openCreateDialog = $state(false);
	let openEditDialog = $state(false);
	let deleteDialogOpen = $state(false);

	let createLoading = $state(false);
	let editLoading = $state(false);
	let deleteLoading = $state(false);

	let selectedUnit = $state<{ id: string; name: string; displayName: string | null } | null>(null);
	let editName = $state('');
	let editDisplayName = $state('');

	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error'>('success');

	function openEdit(unit: any) {
		selectedUnit = unit;
		editName = unit.name;
		editDisplayName = unit.displayName || unit.name;
		openEditDialog = true;
	}

	function confirmDelete(unit: any) {
		selectedUnit = unit;
		deleteDialogOpen = true;
	}
</script>

<div class="flex flex-col gap-4 p-4 text-foreground md:gap-6 md:p-6">
	<header class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight uppercase">Satuan Jajaran</h1>
			<p class="text-sm text-muted-foreground">
				Kelola daftar Satuan Jajaran di bawah {data.currentOrg.displayName || data.currentOrg.name}.
			</p>
		</div>
		<Button onclick={() => (openCreateDialog = true)} class="gap-2">
			<Plus class="size-4" />
			Tambah Satuan Jajaran
		</Button>
	</header>

	<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
		<Table.Root>
			<Table.Header>
				<Table.Row class="bg-muted/50">
					<Table.Head class="w-12 text-center">No</Table.Head>
					<Table.Head>Nama Satuan Jajaran</Table.Head>
					<Table.Head>Nama Tampilan</Table.Head>
					<Table.Head>Tanggal Dibuat</Table.Head>
					<Table.Head class="text-right">Aksi</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.units as unit, i (unit.id)}
					<Table.Row class="transition-colors hover:bg-muted/30">
						<Table.Cell class="text-center font-medium text-muted-foreground">
							{i + 1}
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-3">
								<div class="rounded-md bg-primary/10 p-2 text-primary">
									<Building class="size-4" />
								</div>
								<span class="font-semibold text-foreground uppercase">{unit.name}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<span class="text-sm text-muted-foreground">{unit.displayName || '-'}</span>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-1.5 text-muted-foreground">
								<Calendar class="size-3.5" />
								<span class="text-sm">
									{new Date(unit.createdAt).toLocaleDateString('id-ID', {
										day: 'numeric',
										month: 'long',
										year: 'numeric'
									})}
								</span>
							</div>
						</Table.Cell>
						<Table.Cell class="text-right">
							<div class="flex justify-end gap-2">
								<Button
									variant="outline"
									size="sm"
									class="h-8 gap-1.5 px-2"
									onclick={() => openEdit(unit)}
								>
									<Pencil class="size-3.5" />
									<span>Edit</span>
								</Button>
								<Button
									variant="destructive"
									size="sm"
									class="h-8 gap-1.5 px-2"
									onclick={() => confirmDelete(unit)}
								>
									<Trash2 class="size-3.5" />
									<span>Hapus</span>
								</Button>
							</div>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={5} class="h-32 text-center text-muted-foreground italic">
							Belum ada data Satuan Jajaran.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<!-- CREATE DIALOG -->
<Dialog.Root bind:open={openCreateDialog}>
	<Dialog.Content class="border-border bg-card text-foreground sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Tambah Satuan Jajaran</Dialog.Title>
			<Dialog.Description>
				Masukkan data Satuan Jajaran baru di bawah organisasi saat ini.
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				createLoading = true;
				return async ({ result, update }) => {
					createLoading = false;
					if (result.type === 'success') {
						openCreateDialog = false;
						await update();
						notificationMsg = 'Satuan Jajaran berhasil ditambahkan';
						notificationType = 'success';
						notificationOpen = true;
					} else {
						const err =
							result.type === 'failure'
								? (result.data as any)?.message
								: 'Gagal menambahkan Satuan Jajaran';
						notificationMsg = err;
						notificationType = 'error';
						notificationOpen = true;
					}
				};
			}}
			class="space-y-4 py-4"
		>
			<div class="space-y-2">
				<Label for="create-name">Nama Satuan (Singkatan)</Label>
				<Input id="create-name" name="name" placeholder="Contoh: Yonif 201" required />
			</div>
			<div class="space-y-2">
				<Label for="create-display-name">Nama Lengkap / Tampilan</Label>
				<Input
					id="create-display-name"
					name="displayName"
					placeholder="Contoh: Batalyon Infanteri Mekanis 201/Jaya Yudha"
				/>
			</div>
			<Dialog.Footer class="pt-2">
				<Button type="button" variant="outline" onclick={() => (openCreateDialog = false)}
					>Batal</Button
				>
				<Button type="submit" disabled={createLoading}>
					{createLoading ? 'Menambahkan...' : 'Tambah'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- EDIT DIALOG -->
<Dialog.Root bind:open={openEditDialog}>
	<Dialog.Content class="border-border bg-card text-foreground sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Satuan Jajaran</Dialog.Title>
			<Dialog.Description>Perbarui data Satuan Jajaran terpilih.</Dialog.Description>
		</Dialog.Header>
		{#if selectedUnit}
			<form
				method="POST"
				action="?/update"
				use:enhance={() => {
					editLoading = true;
					return async ({ result, update }) => {
						editLoading = false;
						if (result.type === 'success') {
							openEditDialog = false;
							await update();
							notificationMsg = 'Satuan Jajaran berhasil diperbarui';
							notificationType = 'success';
							notificationOpen = true;
						} else {
							const err =
								result.type === 'failure'
									? (result.data as any)?.message
									: 'Gagal memperbarui Satuan Jajaran';
							notificationMsg = err;
							notificationType = 'error';
							notificationOpen = true;
						}
					};
				}}
				class="space-y-4 py-4"
			>
				<input type="hidden" name="id" value={selectedUnit.id} />
				<div class="space-y-2">
					<Label for="edit-name">Nama Satuan (Singkatan)</Label>
					<Input
						id="edit-name"
						name="name"
						bind:value={editName}
						placeholder="Contoh: Yonif 201"
						required
					/>
				</div>
				<div class="space-y-2">
					<Label for="edit-display-name">Nama Lengkap / Tampilan</Label>
					<Input
						id="edit-display-name"
						name="displayName"
						bind:value={editDisplayName}
						placeholder="Contoh: Batalyon Infanteri Mekanis 201/Jaya Yudha"
					/>
				</div>
				<Dialog.Footer class="pt-2">
					<Button type="button" variant="outline" onclick={() => (openEditDialog = false)}
						>Batal</Button
					>
					<Button type="submit" disabled={editLoading}>
						{editLoading ? 'Menyimpan...' : 'Simpan'}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- DELETE FORM -->
{#if selectedUnit}
	<form
		id="delete-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			deleteLoading = true;
			return async ({ result, update }) => {
				deleteLoading = false;
				deleteDialogOpen = false;
				if (result.type === 'success') {
					await update();
					notificationMsg = 'Satuan Jajaran berhasil dihapus';
					notificationType = 'success';
					notificationOpen = true;
				} else {
					const err =
						result.type === 'failure'
							? (result.data as any)?.message
							: 'Gagal menghapus Satuan Jajaran';
					notificationMsg = err;
					notificationType = 'error';
					notificationOpen = true;
				}
			};
		}}
		hidden
	>
		<input type="hidden" name="id" value={selectedUnit.id} />
	</form>
{/if}

<!-- DELETE DIALOG -->
<ConfirmationDialog
	bind:open={deleteDialogOpen}
	loading={deleteLoading}
	type="error"
	title="Hapus Satuan Jajaran"
	description="Apakah Anda yakin ingin menghapus Satuan Jajaran ini? Pastikan tidak ada data materiil atau mutasi yang terikat dengan satuan ini."
	actionLabel="Hapus Satuan"
	onAction={() => (document.getElementById('delete-form') as HTMLFormElement)?.requestSubmit()}
/>

<!-- NOTIFICATION DIALOG -->
<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={() => (notificationOpen = false)}
/>
