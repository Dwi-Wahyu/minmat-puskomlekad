<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { getBarangData } from './barang.remote';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Search, Plus, Pencil, Trash2, ArrowRightLeft, Info } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	let { data } = $props();

	const barangQuery = $derived(
		getBarangData({
			orgSlug: page.params.org_slug as string,
			name: page.url.searchParams.get('name') || '',
			page: Number(page.url.searchParams.get('page')) || 1
		})
	);

	// State Dialogs
	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	let deleteDialogOpen = $state(false);
	let deleteLoading = $state(false);
	let selectedId = $state('');

	function confirmDelete(id: string) {
		selectedId = id;
		deleteDialogOpen = true;
	}

	function openMutate(id: string) {
		goto(
			resolve('/(app)/[org_slug]/barang/mutate/[id]', {
				id,
				org_slug: data.org_slug
			})
		);
	}

	function formatStock(qty: string | number, baseUnit: string, conversions: any[]) {
		let total = Number(qty);
		if (total === 0) return '0 ' + baseUnit;

		// Sort conversions by multiplier (largest first)
		const sorted = [...(conversions || [])].sort(
			(a, b) => Number(b.multiplier) - Number(a.multiplier)
		);

		let result: string[] = [];
		let remaining = total;

		for (const conv of sorted) {
			const mult = Number(conv.multiplier);
			if (mult <= 0) continue;

			const amount = Math.floor(remaining / mult);
			if (amount > 0) {
				result.push(`${amount} ${conv.fromUnit}`);
				remaining = Number((remaining % mult).toFixed(4));
			}
		}

		if (remaining > 0 || result.length === 0) {
			result.push(`${remaining} ${baseUnit}`);
		}

		return result.join(' ');
	}
</script>

<div class="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
				Barang Habis Pakai
			</h1>
			<p class="text-sm text-muted-foreground">
				Kelola stok barang habis pakai dan materiil konsumsi.
			</p>
		</div>
		<div class="flex flex-wrap gap-2 md:gap-3">
			<!-- <Button
				href="/{page.params.org_slug}/barang/batch-mutate{selectedIds.length > 0
					? `?ids=${selectedIds.join(',')}`
					: ''}"
				variant="outline"
				class="gap-2"
			>
				<ArrowRightLeft class="size-4" />
				Mutasi Batch {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
			</Button> -->
			<Button href="/{page.params.org_slug}/barang/create" class="w-full md:w-auto">
				<Plus class="size-4" />
				Tambah Barang
			</Button>
		</div>
	</div>

	<div class="flex items-center gap-4">
		<form method="GET" class="flex flex-1 items-center gap-2">
			<div class="relative flex-1">
				<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					name="name"
					placeholder="Cari nama barang atau deskripsi..."
					class="pl-10"
					value={page.url.searchParams.get('name')}
				/>
			</div>
			<Button type="submit" variant="secondary">Cari</Button>
		</form>
	</div>

	<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row class="bg-muted/50">
						<Table.Head class="w-12.5 text-center">No</Table.Head>
						<Table.Head class="min-w-50">Nama Barang</Table.Head>
						<Table.Head class="text-center">Total Stok</Table.Head>
						<Table.Head>Satuan Dasar</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if barangQuery.loading}
						{#each Array(10) as _, i (i)}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell class="text-center">
									<Skeleton class="mx-auto h-4 w-4" />
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-col gap-2">
										<Skeleton class="h-5 w-45" />
										<Skeleton class="h-3 w-50" />
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-col items-center gap-1">
										<Skeleton class="h-4 w-24" />
										<Skeleton class="h-3 w-16" />
									</div>
								</Table.Cell>
								<Table.Cell>
									<Skeleton class="h-6 w-16 rounded-full" />
								</Table.Cell>
								<Table.Cell class="text-right">
									<Skeleton class="ml-auto h-8 w-8" />
								</Table.Cell>
							</Table.Row>
						{/each}
					{:else if barangQuery.current && barangQuery.current.consumables.length > 0}
						{#each barangQuery.current.consumables as item, i (item.id)}
							<Table.Row class="transition-colors hover:bg-muted/30">
								<Table.Cell class="text-center font-medium text-muted-foreground">
									{i + 1 + (barangQuery.current.pagination.currentPage - 1) * 10}
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-col gap-1">
										<a
											href={resolve('/(app)/[org_slug]/barang/[id]', {
												id: item.id,
												org_slug: data.org_slug
											})}
											class="font-semibold text-foreground transition-colors hover:text-primary"
										>
											{item.name}
										</a>
										<span class="font-mono text-[10px] text-muted-foreground"
											>{item.id.slice(0, 8)}</span
										>
									</div>
								</Table.Cell>
								<Table.Cell class="text-center">
									<div class="flex flex-col items-center gap-0.5">
										<span class="font-medium text-foreground">
											{formatStock(item.totalStock || 0, item.baseUnit, item.conversions || [])}
										</span>
										{#if item.conversions?.length > 0 && Number(item.totalStock || 0) > 0}
											<span class="text-[10px] text-muted-foreground italic">
												(Total: {Number(item.totalStock)}
												{item.baseUnit})
											</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge variant="outline" class="border-blue-200 bg-blue-50 text-blue-700">
										{item.baseUnit}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										variant="outline"
										onclick={() =>
											goto(
												resolve('/(app)/[org_slug]/barang/[id]', {
													id: item.id,
													org_slug: data.org_slug
												})
											)}
									>
										<Info class="size-4" /> Detail
									</Button>
									<Button onclick={() => openMutate(item.id)} variant="outline">
										<ArrowRightLeft class="size-4" /> Mutasi
									</Button>
									<Button
										variant="outline"
										onclick={() =>
											goto(
												resolve('/(app)/[org_slug]/barang/edit/[id]', {
													id: item.id,
													org_slug: data.org_slug
												})
											)}
									>
										<Pencil class="size-4" /> Edit
									</Button>
									<Button onclick={() => confirmDelete(item.id)} variant="destructive">
										<Trash2 class="size-4" /> Hapus
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					{:else}
						<Table.Row>
							<Table.Cell colspan={6} class="h-32 text-center text-muted-foreground italic">
								Tidak ada data barang ditemukan{page.url.searchParams.get('name')
									? ` untuk pencarian "${page.url.searchParams.get('name')}"`
									: ''}.
							</Table.Cell>
						</Table.Row>
					{/if}
				</Table.Body>
			</Table.Root>
		</div>

		{#if barangQuery.current && barangQuery.current.pagination.totalPages > 1}
			<div
				class="flex flex-col gap-4 border-t bg-muted/20 px-6 py-4 md:flex-row md:items-center md:justify-between"
			>
				<p class="text-sm font-medium text-muted-foreground">
					Halaman <span class="font-bold text-foreground"
						>{barangQuery.current.pagination.currentPage}</span
					>
					dari {barangQuery.current.pagination.totalPages}
				</p>
				<div class="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={barangQuery.current.pagination.currentPage <= 1}
						href="?page={barangQuery.current.pagination.currentPage -
							1}&name={page.url.searchParams.get('name') || ''}"
					>
						Sebelumnya
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={barangQuery.current.pagination.currentPage >=
							barangQuery.current.pagination.totalPages}
						href="?page={barangQuery.current.pagination.currentPage +
							1}&name={page.url.searchParams.get('name') || ''}"
					>
						Selanjutnya
					</Button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- HIDDEN FORMS -->
<form
	id="delete-form"
	method="POST"
	action="?/delete"
	use:enhance={() => {
		deleteLoading = true;
		return async ({ result, update }) => {
			deleteLoading = false;
			deleteDialogOpen = false;
			await update();
			if (result?.type === 'success') {
				notificationMsg = 'Barang berhasil dihapus';
				notificationType = 'success';
				notificationOpen = true;
			} else {
				notificationMsg = ((result as any)?.data as any)?.message || 'Gagal menghapus barang';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={selectedId} />
</form>

<!-- DIALOGS -->
<ConfirmationDialog
	bind:open={deleteDialogOpen}
	loading={deleteLoading}
	type="error"
	title="Hapus Barang"
	description="Apakah Anda yakin? Barang yang dihapus tidak dapat dipulihkan."
	actionLabel="Hapus Permanen"
	onAction={() => {
		const deleteform = document.getElementById('delete-form') as HTMLFormElement;
		deleteform.requestSubmit();
	}}
/>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={() => (notificationOpen = false)}
/>
