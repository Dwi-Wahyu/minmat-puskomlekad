<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { ArrowLeft, Save, Box, X } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { getAvailableEquipmentForMaintenance } from '../pemeliharaan.remote';
	import { superForm } from 'sveltekit-superforms';
	import { yup } from 'sveltekit-superforms/adapters';
	import { maintenanceCreateSchema } from '$lib/schemas/maintenance-mutation-schema';
	import { maintenanceStatusLabel, maintenanceTypeLabel } from '$lib/enums/maintenance-enum';
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import { equipmentConditionLabel } from '@/enums/equipment-enum';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, delayed } = superForm(
		untrack(() => data.form),
		{
			validators: yup(maintenanceCreateSchema),
			dataType: 'json',
			onUpdated: ({ form }) => {
				if (form.message) {
					if (form.valid) {
						showSuccessNotification(form.message);
					} else {
						showErrorNotification(form.message);
					}
				}
			}
		}
	);

	// Helper untuk mendapatkan label alat yang dipilih
	function getEquipmentLabel(id: string) {
		const eq = (data.equipment || equipmentList).find((e: any) => e.id === id);
		if (!eq) return id;
		return `${eq.item?.name || 'Tanpa Nama'} ${eq.serialNumber ? `(${eq.serialNumber})` : ''}`;
	}

	function removeEquipment(id: string) {
		$form.equipmentIds = $form.equipmentIds.filter((itemId) => itemId !== id);
	}

	// State untuk dialog notifikasi
	let showNotification = $state(false);
	let notificationType: 'success' | 'error' | 'info' = $state('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');
	let notificationActionLabel = $state('OK');

	// State pencarian alat & paginasi remote
	let searchQuery = $state('');
	let activeSearchQuery = $state('');

	let equipmentList = $state<any[]>([]);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);
	let isEquipmentLoading = $state(false);

	function triggerSearch() {
		if (activeSearchQuery !== searchQuery) {
			activeSearchQuery = searchQuery;
			currentPage = 1;
		}
	}

	function toggleEquipment(id: string) {
		if ($form.equipmentIds.includes(id)) {
			$form.equipmentIds = $form.equipmentIds.filter((x) => x !== id);
		} else {
			$form.equipmentIds = [...$form.equipmentIds, id];
		}
	}

	$effect(() => {
		const pageNum = currentPage;
		const queryStr = activeSearchQuery;

		isEquipmentLoading = true;
		getAvailableEquipmentForMaintenance({
			q: queryStr,
			page: pageNum
		})
			.then((res) => {
				equipmentList = res.equipment;
				totalPages = res.pagination.totalPages;
				totalItems = res.pagination.totalItems;
				isEquipmentLoading = false;
			})
			.catch((err) => {
				console.error('Gagal mengambil daftar alat:', err);
				isEquipmentLoading = false;
			});
	});

	const maintenanceTypes = Object.entries(maintenanceTypeLabel).map(([value, label]) => ({
		value,
		label
	}));
	const statusOptions = Object.entries(maintenanceStatusLabel).map(([value, label]) => ({
		value,
		label
	}));

	// Handler untuk menampilkan notifikasi
	function showSuccessNotification(message?: string) {
		notificationType = 'success';
		notificationTitle = 'Berhasil!';
		notificationDescription = message || 'Data pemeliharaan berhasil disimpan.';
		notificationActionLabel = 'OK';
		showNotification = true;
	}

	function showErrorNotification(message: string) {
		notificationType = 'error';
		notificationTitle = 'Gagal!';
		notificationDescription = message || 'Terjadi kesalahan saat menyimpan data.';
		notificationActionLabel = 'Coba Lagi';
		showNotification = true;
	}

	// Handler untuk aksi setelah notifikasi
	function handleNotificationAction() {
		showNotification = false;
		if (notificationType === 'success') {
			goto(
				resolve('/(app)/[org_slug]/pemeliharaan', {
					org_slug: data.org_slug
				})
			);
		}
	}
</script>

<svelte:head>
	<title>Tambah Pemeliharaan | MINMAT</title>
</svelte:head>

<div class="space-y-4 p-4 md:space-y-6 md:p-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button
				variant="outline"
				size="icon"
				href="/{data.org_slug}/pemeliharaan"
				class="rounded-full shadow-sm"
			>
				<ArrowLeft size={18} />
			</Button>
			<div>
				<h1 class="flex items-center gap-2 text-2xl font-bold text-foreground">
					Tambah Pemeliharaan Baru
				</h1>
				<p class="text-sm text-muted-foreground">
					Buat jadwal perawatan atau perbaikan peralatan baru
				</p>
			</div>
		</div>
	</div>

	<Card.Root>
		<Card.Content>
			<form method="POST" use:enhance class="space-y-6">
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<!-- Equipment Selection Table -->
					<div class="space-y-4 md:col-span-2">
						<Label>Pilih Peralatan</Label>
						{#if $errors.equipmentIds}
							<p class="text-sm text-destructive">{$errors.equipmentIds}</p>
						{/if}

						<!-- Search Filter -->
						<div class="flex gap-2">
							<Input
								type="text"
								placeholder="Cari nama alat..."
								bind:value={searchQuery}
								onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), triggerSearch())}
							/>
							<Button type="button" variant="secondary" onclick={triggerSearch}>Cari</Button>
						</div>

						<!-- Table -->
						<div class="overflow-hidden rounded-xl border bg-card">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head class="w-12 text-center"></Table.Head>
										<Table.Head>Nama Alat</Table.Head>
										<Table.Head>Serial Number</Table.Head>
										<Table.Head>Gudang</Table.Head>
										<Table.Head>Kondisi</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#if isEquipmentLoading}
										<!-- Skeleton Loading (5 rows) -->
										{#each Array(5) as _, i (i)}
											<Table.Row>
												<Table.Cell class="text-center">
													<div class="mx-auto h-4 w-4 animate-pulse rounded bg-muted"></div>
												</Table.Cell>
												<Table.Cell>
													<div class="h-4 w-40 animate-pulse rounded bg-muted"></div>
												</Table.Cell>
												<Table.Cell>
													<div class="h-4 w-28 animate-pulse rounded bg-muted"></div>
												</Table.Cell>
												<Table.Cell>
													<div class="h-4 w-20 animate-pulse rounded bg-muted"></div>
												</Table.Cell>
												<Table.Cell>
													<div class="h-4 w-24 animate-pulse rounded bg-muted"></div>
												</Table.Cell>
												<Table.Cell>
													<div class="h-4 w-16 animate-pulse rounded bg-muted"></div>
												</Table.Cell>
											</Table.Row>
										{/each}
									{:else if equipmentList.length === 0}
										<Table.Row>
											<Table.Cell colspan={6} class="h-24 text-center text-muted-foreground">
												Tidak ada alat ditemukan.
											</Table.Cell>
										</Table.Row>
									{:else}
										{#each equipmentList as eq (eq.id)}
											{@const isSelected = $form.equipmentIds.includes(eq.id)}
											<Table.Row
												class="cursor-pointer transition-colors hover:bg-muted/50"
												onclick={() => toggleEquipment(eq.id)}
											>
												<Table.Cell class="text-center" onclick={(e) => e.stopPropagation()}>
													<input
														type="checkbox"
														checked={isSelected}
														onchange={() => toggleEquipment(eq.id)}
														class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
													/>
												</Table.Cell>
												<Table.Cell class="max-w-40">
													<h1 class="text-wrap">
														{eq.item?.name || 'Tanpa Nama'}
													</h1>
												</Table.Cell>
												<Table.Cell>
													{#if eq.serialNumber}
														<code class="rounded bg-muted px-1 text-xs">{eq.serialNumber}</code>
													{:else}
														-
													{/if}
												</Table.Cell>
												<Table.Cell>{eq.warehouse?.name || '-'}</Table.Cell>
												<Table.Cell>
													<Badge variant="outline">
														{equipmentConditionLabel[eq.condition]}
													</Badge>
												</Table.Cell>
											</Table.Row>
										{/each}
									{/if}
								</Table.Body>
							</Table.Root>
						</div>

						<!-- Pagination -->
						{#if totalPages > 1}
							<div class="flex items-center justify-between">
								<span class="text-xs text-muted-foreground">
									Menampilkan {equipmentList.length} dari {totalItems} entri
								</span>
								<div class="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={currentPage === 1 || isEquipmentLoading}
										onclick={() => (currentPage = Math.max(1, currentPage - 1))}
										class="h-8 rounded-lg"
									>
										Sebelumnya
									</Button>
									<span class="text-xs font-medium">Halaman {currentPage} dari {totalPages}</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={currentPage === totalPages || isEquipmentLoading}
										onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
										class="h-8 rounded-lg"
									>
										Selanjutnya
									</Button>
								</div>
							</div>
						{/if}

						<!-- Selected list as badges -->
						{#if $form.equipmentIds.length > 0}
							<div class="space-y-1.5 pt-2">
								<Label>
									Alat Terpilih ({$form.equipmentIds.length}):
								</Label>
								<div class="flex flex-wrap gap-2">
									{#each $form.equipmentIds as id (id)}
										<Badge
											variant="secondary"
											class="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs text-wrap text-foreground hover:bg-accent"
										>
											<Box size={12} class="text-muted-foreground" />
											{getEquipmentLabel(id as string)}
											<button
												type="button"
												onclick={() => removeEquipment(id as string)}
												class="ml-1 text-muted-foreground hover:text-foreground"
											>
												<X size={14} />
											</button>
										</Badge>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<!-- Tipe -->
					<div class="space-y-2">
						<Label for="maintenanceType"
							>Tipe Pemeliharaan
							<span class="text-red-500">*</span>
						</Label>
						<Select.Root type="single" bind:value={$form.maintenanceType}>
							<Select.Trigger class="w-full">
								{maintenanceTypeLabel[$form.maintenanceType] || 'Pilih Tipe'}
							</Select.Trigger>
							<Select.Content>
								{#each maintenanceTypes as type (type.value)}
									<Select.Item value={type.value}>{type.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						{#if $errors.maintenanceType}
							<p class="text-sm text-destructive">{$errors.maintenanceType}</p>
						{/if}
					</div>

					<!-- Tanggal Jadwal -->
					<div class="space-y-2">
						<Label for="scheduledDate">
							Tanggal Jadwal
							<span class="text-red-500">*</span>
						</Label>
						<Input
							id="scheduledDate"
							name="scheduledDate"
							type="datetime-local"
							bind:value={$form.scheduledDate}
						/>
						{#if $errors.scheduledDate}
							<p class="text-sm text-destructive">{$errors.scheduledDate}</p>
						{/if}
					</div>

					<!-- Status -->
					<div class="space-y-2">
						<Label for="status">Status</Label>
						<Select.Root type="single" bind:value={$form.status}>
							<Select.Trigger class="w-full">
								{maintenanceStatusLabel[$form.status] || 'Pilih Status'}
							</Select.Trigger>
							<Select.Content>
								{#each statusOptions as status (status.value)}
									<Select.Item value={status.value}>{status.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						{#if $errors.status}
							<p class="text-sm text-destructive">{$errors.status}</p>
						{/if}
					</div>

					<!-- Tanggal Selesai -->
					<div class="space-y-2">
						<Label for="completionDate">Tanggal Selesai</Label>
						<Input
							id="completionDate"
							name="completionDate"
							type="datetime-local"
							bind:value={$form.completionDate}
						/>
						{#if $errors.completionDate}
							<p class="text-sm text-destructive">{$errors.completionDate}</p>
						{/if}
					</div>
				</div>

				<!-- Deskripsi -->
				<div class="space-y-2">
					<Label for="description">Deskripsi Pekerjaan</Label>
					<Textarea
						id="description"
						name="description"
						bind:value={$form.description}
						rows={4}
						class="resize-none rounded-xl border-border"
						placeholder="Jelaskan detail pemeliharaan..."
					/>
					{#if $errors.description}
						<p class="text-sm text-destructive">{$errors.description}</p>
					{/if}
				</div>

				<div class="flex justify-end gap-3">
					<Button variant="outline" href="/{data.org_slug}/pemeliharaan">Batal</Button>
					<Button type="submit" disabled={$delayed}>
						<Save size={18} />
						Simpan Data
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Notification Dialog -->
	<NotificationDialog
		bind:open={showNotification}
		type={notificationType}
		title={notificationTitle}
		description={notificationDescription}
		actionLabel={notificationActionLabel}
		onAction={handleNotificationAction}
	/>
</div>
