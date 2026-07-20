<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Plus,
		Pencil,
		Trash2,
		FolderTree,
		Tag,
		Search,
		ChevronLeft,
		ChevronRight,
		HelpCircle
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { CategoryListData } from './kategori.remote';

	let {
		data
	}: {
		data: {
			parentCategories: { id: string; name: string }[];
			canCreate: boolean;
			canEdit: boolean;
			canDelete: boolean;
			categoryDataPromise: Promise<CategoryListData>;
			filters: { q: string; page: number; limit: number };
		};
	} = $props();

	// Read pagination limit from searchParams
	const limit = $derived(Number(page.url.searchParams.get('limit')) || 10);

	let openCreateDialog = $state(false);
	let openEditDialog = $state(false);
	let openDeleteDialog = $state(false);

	let createLoading = $state(false);
	let editLoading = $state(false);
	let deleteLoading = $state(false);

	// Form fields for Create
	let newName = $state('');
	let newOrder = $state(0);
	let newParentId = $state('');

	// Form fields for Edit
	let editId = $state('');
	let editName = $state('');
	let editOrder = $state(0);
	let editParentId = $state('');

	// Selected Category for Deletion
	let selectedCategory = $state<{ id: string; name: string } | null>(null);

	// Search input state
	let searchVal = $state(page.url.searchParams.get('q') || '');
	$effect(() => {
		searchVal = page.url.searchParams.get('q') || '';
	});

	// Perform search
	function handleSearch() {
		const newUrl = new URL(page.url);
		if (searchVal.trim()) {
			newUrl.searchParams.set('q', searchVal.trim());
		} else {
			newUrl.searchParams.delete('q');
		}
		newUrl.searchParams.set('page', '1');
		goto(newUrl.toString(), { keepFocus: true });
	}

	// Pagination Navigation
	function goToPage(p: number) {
		const newUrl = new URL(page.url);
		newUrl.searchParams.set('page', p.toString());
		goto(newUrl.toString());
	}

	function handleLimitChange(val: string | undefined) {
		if (!val) return;
		const newUrl = new URL(page.url);
		newUrl.searchParams.set('limit', val);
		newUrl.searchParams.set('page', '1');
		goto(newUrl.toString());
	}

	function openEdit(category: any) {
		editId = category.id;
		editName = category.name;
		editOrder = category.order ?? 0;
		editParentId = category.parentId ?? '';
		openEditDialog = true;
	}

	function confirmDelete(category: any) {
		selectedCategory = category;
		openDeleteDialog = true;
	}
</script>

<div class="flex flex-col gap-4 p-4 text-foreground md:gap-6 md:p-6">
	<header class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold tracking-tight uppercase">Manajemen Kategori</h1>
				<Popover.Root>
					<Popover.Trigger>
						<Button variant="outline" size="sm" class="gap-1.5 text-xs">
							<HelpCircle class="size-4 text-primary" />
							Tips
						</Button>
					</Popover.Trigger>
					<Popover.Content class="w-80">
						<Popover.Header>
							<Popover.Title class="flex items-center gap-2 text-sm font-semibold">
								<HelpCircle class="size-4 text-primary" />
								Informasi Hierarki & Jumlah Alat
							</Popover.Title>
							<Popover.Description class="text-xs">
								Penjelasan mengenai cara perhitungan dan struktur tampilan data kategori.
							</Popover.Description>
						</Popover.Header>
						<div class="space-y-2 pt-1 text-xs text-muted-foreground">
							<p>
								<strong class="text-foreground">Total Kategori Induk:</strong> Angka pada baris
								kategori induk (parent) menampilkan <strong>total agregat</strong> (gabungan alat langsung
								di induk + seluruh alat pada sub-kategori).
							</p>
							<p>
								<strong class="text-foreground">Tanpa Sub-Kategori:</strong> Jika kategori induk
								memiliki alat langsung yang belum dimasukkan ke sub-kategori spesifik, alat tersebut
								ditampilkan sebagai sub-kategori <em>"Tanpa Sub-Kategori"</em>.
							</p>
						</div>
					</Popover.Content>
				</Popover.Root>
			</div>
			<p class="mt-1 text-sm text-muted-foreground">
				Daftar kategori materiil dan alat yang terdaftar di dalam sistem Puskomlekad.
			</p>
		</div>
		{#if data.canCreate}
			<Button onclick={() => (openCreateDialog = true)} class="gap-2">
				<Plus class="size-4" />
				Tambah Kategori
			</Button>
		{/if}
	</header>

	<!-- Search & Limit Control Bar -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex w-full max-w-sm items-center gap-2">
			<div class="relative w-full">
				<Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Cari nama kategori..."
					class="pl-8"
					bind:value={searchVal}
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
				/>
			</div>
			<Button variant="secondary" onclick={handleSearch}>Cari</Button>
		</div>

		<div class="flex items-center gap-2 self-end sm:self-auto">
			<span class="text-xs whitespace-nowrap text-muted-foreground">Tampilkan:</span>
			<Select.Root type="single" value={String(limit)} onValueChange={handleLimitChange}>
				<Select.Trigger class="h-9 w-[110px] text-xs">
					{limit} / hal
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="5" label="5 / hal">5 / hal</Select.Item>
					<Select.Item value="10" label="10 / hal">10 / hal</Select.Item>
					<Select.Item value="20" label="20 / hal">20 / hal</Select.Item>
					<Select.Item value="50" label="50 / hal">50 / hal</Select.Item>
					<Select.Item value="100" label="100 / hal">100 / hal</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
		<Table.Root>
			<Table.Header>
				<Table.Row class="bg-muted/50">
					<Table.Head>Nama Kategori</Table.Head>
					<Table.Head class="w-32 text-center">Jumlah Alat</Table.Head>
					{#if data.canEdit || data.canDelete}
						<Table.Head class="w-36 text-right">Aksi</Table.Head>
					{/if}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#await data.categoryDataPromise}
					{#each Array(5) as _, pIdx (pIdx)}
						<Table.Row class="bg-muted/10 hover:bg-transparent">
							<Table.Cell>
								<div class="flex items-center gap-2">
									<Skeleton class="h-4 w-4 rounded-full" />
									<Skeleton class="h-4 w-36" />
								</div>
							</Table.Cell>
							<Table.Cell>
								<Skeleton class="mx-auto h-4 w-8" />
							</Table.Cell>
							{#if data.canEdit || data.canDelete}
								<Table.Cell class="text-right">
									<Skeleton class="ml-auto h-8 w-16" />
								</Table.Cell>
							{/if}
						</Table.Row>
						<Table.Row class="hover:bg-transparent">
							<Table.Cell class="pl-8">
								<div class="flex items-center gap-2">
									<Skeleton class="h-3.5 w-3.5 rounded-full" />
									<Skeleton class="h-4 w-28" />
								</div>
							</Table.Cell>
							<Table.Cell>
								<Skeleton class="mx-auto h-4 w-8" />
							</Table.Cell>
							{#if data.canEdit || data.canDelete}
								<Table.Cell class="text-right">
									<Skeleton class="ml-auto h-8 w-16" />
								</Table.Cell>
							{/if}
						</Table.Row>
					{/each}
				{:then categoryData}
					{#if categoryData.categories && categoryData.categories.length > 0}
						{#each categoryData.categories as parent (parent.id)}
							{@const subTotal = parent.subCategories.reduce(
								(sum, sub) => sum + sub.equipmentCount,
								0
							)}
							{@const grandTotal = parent.equipmentCount + subTotal}
							{@const hasDirectItems = parent.equipmentCount > 0}
							{@const displaySubCategories =
								hasDirectItems && parent.subCategories.length > 0
									? [
											{
												id: `${parent.id}-direct`,
												name: 'Tanpa Sub-Kategori',
												order: 0,
												equipmentCount: parent.equipmentCount,
												isVirtual: true,
												originalParent: parent
											},
											...parent.subCategories
										]
									: parent.subCategories}

							<!-- Render Baris Parent (Menampilkan Grand Total) -->
							<Table.Row class="bg-muted/10 font-semibold transition-colors hover:bg-muted/20">
								<Table.Cell class="font-bold text-foreground">
									<div class="flex items-center gap-2">
										<FolderTree class="size-4 text-primary" />
										{parent.name}
									</div>
								</Table.Cell>
								<Table.Cell class="text-center font-bold text-foreground">
									{grandTotal}
								</Table.Cell>
								{#if data.canEdit || data.canDelete}
									<Table.Cell class="text-right">
										<div class="flex justify-end gap-2">
											{#if data.canEdit}
												<Button
													variant="outline"
													size="icon"
													onclick={() => openEdit(parent)}
													title="Ubah Kategori"
												>
													<Pencil class="size-4" />
												</Button>
											{/if}
											{#if data.canDelete}
												<Button
													variant="destructive"
													size="icon"
													onclick={() => confirmDelete(parent)}
													title="Hapus Kategori"
												>
													<Trash2 class="size-4" />
												</Button>
											{/if}
										</div>
									</Table.Cell>
								{/if}
							</Table.Row>

							<!-- Render Baris Sub-Kategori (Termasuk Virtual Child jika ada) -->
							{#each displaySubCategories as sub (sub.id)}
								<Table.Row class="transition-colors hover:bg-muted/30">
									<Table.Cell class="pl-8">
										<div
											class="flex items-center gap-2 {sub.isVirtual
												? 'text-muted-foreground italic'
												: 'font-medium text-foreground'}"
										>
											<Tag class="size-3.5 text-muted-foreground" />
											{sub.name}
										</div>
									</Table.Cell>
									<Table.Cell class="text-center text-muted-foreground">
										{sub.equipmentCount}
									</Table.Cell>
									{#if data.canEdit || data.canDelete}
										<Table.Cell class="text-right">
											{#if !sub.isVirtual}
												<div class="flex justify-end gap-2">
													{#if data.canEdit}
														<Button
															variant="outline"
															size="icon"
															onclick={() => openEdit(sub)}
															title="Ubah Kategori"
														>
															<Pencil class="size-4" />
														</Button>
													{/if}
													{#if data.canDelete}
														<Button
															variant="destructive"
															size="icon"
															onclick={() => confirmDelete(sub)}
															title="Hapus Kategori"
														>
															<Trash2 class="size-4" />
														</Button>
													{/if}
												</div>
											{/if}
										</Table.Cell>
									{/if}
								</Table.Row>
							{/each}
						{/each}
					{:else}
						<Table.Row>
							<Table.Cell
								colspan={data.canEdit || data.canDelete ? 3 : 2}
								class="py-10 text-center text-muted-foreground"
							>
								Belum ada data kategori yang terdaftar
							</Table.Cell>
						</Table.Row>
					{/if}
				{:catch err}
					<Table.Row>
						<Table.Cell
							colspan={data.canEdit || data.canDelete ? 3 : 2}
							class="py-6 text-center text-destructive"
						>
							Gagal memuat data kategori: {err.message}
						</Table.Cell>
					</Table.Row>
				{/await}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Pagination Section -->
	{#await data.categoryDataPromise}
		<div class="flex flex-col items-center justify-between gap-4 border-t pt-4 sm:flex-row">
			<Skeleton class="h-6 w-48" />
			<div class="flex items-center gap-2">
				<Skeleton class="h-8 w-8" />
				<Skeleton class="h-6 w-24" />
				<Skeleton class="h-8 w-8" />
			</div>
		</div>
	{:then categoryData}
		{@const pag = categoryData.pagination}
		<div class="flex flex-col items-center justify-between gap-4 border-t pt-4 sm:flex-row">
			<div class="text-sm text-muted-foreground">
				<span>Total {pag.totalItems} Kategori Utama</span>
			</div>

			<div class="flex items-center gap-1">
				<Button
					variant="outline"
					size="icon"
					onclick={() => goToPage(pag.currentPage - 1)}
					disabled={pag.currentPage <= 1}
				>
					<ChevronLeft class="size-4" />
				</Button>
				<span class="px-3 text-sm font-semibold">
					Hal. {pag.currentPage} / {pag.totalPages || 1}
				</span>
				<Button
					variant="outline"
					size="icon"
					onclick={() => goToPage(pag.currentPage + 1)}
					disabled={pag.currentPage >= pag.totalPages}
				>
					<ChevronRight class="size-4" />
				</Button>
			</div>
		</div>
	{/await}
</div>

<!-- CREATE DIALOG -->
<Dialog.Root bind:open={openCreateDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Tambah Kategori</Dialog.Title>
			<Dialog.Description>
				Silakan masukkan data kategori baru yang ingin Anda daftarkan ke sistem.
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
						newName = '';
						newOrder = 0;
						newParentId = '';
						toast.success(String((result as any).data?.message || 'Kategori berhasil ditambahkan'));
						await update();
					} else {
						toast.error(String((result as any).data?.message || 'Gagal menambahkan kategori'));
					}
				};
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="create-name">Nama Kategori <span class="text-destructive">*</span></Label>
				<Input
					id="create-name"
					name="name"
					bind:value={newName}
					placeholder="Masukkan nama kategori"
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="create-order">Urutan Tampilan</Label>
				<Input id="create-order" type="number" name="order" bind:value={newOrder} placeholder="0" />
			</div>

			<div class="space-y-2">
				<Label for="create-parent">Kategori Induk</Label>
				<select
					id="create-parent"
					name="parentId"
					bind:value={newParentId}
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value="">Tidak ada / Kategori Utama</option>
					{#each data.parentCategories as pc}
						<option value={pc.id}>{pc.name}</option>
					{/each}
				</select>
			</div>

			<Dialog.Footer class="pt-2">
				<Button type="button" variant="outline" onclick={() => (openCreateDialog = false)}>
					Batal
				</Button>
				<Button type="submit" disabled={createLoading}>
					{createLoading ? 'Menyimpan...' : 'Tambah Kategori'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- EDIT DIALOG -->
<Dialog.Root bind:open={openEditDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Ubah Kategori</Dialog.Title>
			<Dialog.Description>
				Silakan perbarui informasi data kategori yang Anda pilih.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				editLoading = true;
				return async ({ result, update }) => {
					editLoading = false;
					if (result.type === 'success') {
						openEditDialog = false;
						toast.success(String((result as any).data?.message || 'Kategori berhasil diperbarui'));
						await update();
					} else {
						toast.error(String((result as any).data?.message || 'Gagal memperbarui kategori'));
					}
				};
			}}
			class="space-y-4"
		>
			<input type="hidden" name="id" value={editId} />

			<div class="space-y-2">
				<Label for="edit-name">Nama Kategori <span class="text-destructive">*</span></Label>
				<Input
					id="edit-name"
					name="name"
					bind:value={editName}
					placeholder="Masukkan nama kategori"
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="edit-order">Urutan Tampilan</Label>
				<Input id="edit-order" type="number" name="order" bind:value={editOrder} placeholder="0" />
			</div>

			<div class="space-y-2">
				<Label for="edit-parent">Kategori Induk</Label>
				<select
					id="edit-parent"
					name="parentId"
					bind:value={editParentId}
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value="">Tidak ada / Kategori Utama</option>
					{#each data.parentCategories as pc}
						{#if pc.id !== editId}
							<option value={pc.id}>{pc.name}</option>
						{/if}
					{/each}
				</select>
			</div>

			<Dialog.Footer class="pt-2">
				<Button type="button" variant="outline" onclick={() => (openEditDialog = false)}>
					Batal
				</Button>
				<Button type="submit" disabled={editLoading}>
					{editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- DELETE CONFIRMATION DIALOG -->
<AlertDialog.Root bind:open={openDeleteDialog}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Hapus Kategori</AlertDialog.Title>
			<AlertDialog.Description>
				Apakah Anda yakin ingin menghapus kategori <strong>{selectedCategory?.name}</strong>?
				Tindakan ini tidak dapat dibatalkan, dan kategori tidak dapat dihapus jika masih digunakan
				oleh data materiil/alat atau subkategori lainnya.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Batal</AlertDialog.Cancel>
			<form
				method="POST"
				action="?/delete"
				use:enhance={() => {
					deleteLoading = true;
					return async ({ result, update }) => {
						deleteLoading = false;
						openDeleteDialog = false;
						if (result.type === 'success') {
							toast.success(String((result as any).data?.message || 'Kategori berhasil dihapus'));
							await update();
						} else {
							toast.error(String((result as any).data?.message || 'Gagal menghapus kategori'));
						}
					};
				}}
			>
				<input type="hidden" name="id" value={selectedCategory?.id} />
				<Button type="submit" variant="destructive" disabled={deleteLoading}>
					{deleteLoading ? 'Menghapus...' : 'Hapus Kategori'}
				</Button>
			</form>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
