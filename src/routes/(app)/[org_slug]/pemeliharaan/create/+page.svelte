<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import {
		ArrowLeft,
		Save,
		Activity,
		Clock,
		User as UserIcon,
		Calendar,
		Box,
		X
	} from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { getAvailableEquipmentForMaintenance } from '../pemeliharaan.remote';

	let { data }: { data: PageData } = $props();

	// State form
	let formData = $state({
		equipmentIds: [] as string[],
		maintenanceType: 'PERAWATAN',
		description: '',
		scheduledDate: '',
		completionDate: '',
		status: 'PENDING',
		technicianId: ''
	});

	// Helper untuk mendapatkan label alat yang dipilih
	function getEquipmentLabel(id: string) {
		const eq = data.equipment.find((e: any) => e.id === id);
		if (!eq) return id;
		return `${eq.item?.name || 'Tanpa Nama'} ${eq.serialNumber ? `(${eq.serialNumber})` : ''}`;
	}

	function removeEquipment(id: string) {
		formData.equipmentIds = formData.equipmentIds.filter((itemId) => itemId !== id);
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
		if (formData.equipmentIds.includes(id)) {
			formData.equipmentIds = formData.equipmentIds.filter((x) => x !== id);
		} else {
			formData.equipmentIds = [...formData.equipmentIds, id];
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

	const maintenanceTypes = ['PERAWATAN', 'PERBAIKAN'];
	const statusOptions = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

	// Handler untuk menampilkan notifikasi
	function showSuccessNotification() {
		notificationType = 'success';
		notificationTitle = 'Berhasil!';
		notificationDescription = 'Data pemeliharaan berhasil disimpan.';
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
			goto(`/${data.org_slug}/pemeliharaan`);
		}
	}
</script>

<svelte:head>
	<title>Tambah Pemeliharaan | MINMAT</title>
</svelte:head>

<div class="space-y-6 p-6">
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
			<form
				method="POST"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (
							result?.type === 'success' ||
							(result?.type === 'redirect' && result.location.includes('pemeliharaan'))
						) {
							showSuccessNotification();
						} else if (result?.type === 'failure') {
							showErrorNotification((result?.data as any)?.message || 'Terjadi kesalahan');
						}
						await update();
					};
				}}
				class="space-y-6"
			>
				<!-- Hidden inputs for custom selects -->
				<input type="hidden" name="maintenanceType" value={formData.maintenanceType} />
				<input type="hidden" name="status" value={formData.status} />

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<!-- Equipment Selection Table -->
					<div class="space-y-4 md:col-span-2">
						<Label>Pilih Peralatan</Label>

						<!-- Hidden Inputs for form submission -->
						{#each formData.equipmentIds as id (id)}
							<input type="hidden" name="equipmentId" value={id} />
						{/each}

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
										{#each Array(5) as _}
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
											{@const isSelected = formData.equipmentIds.includes(eq.id)}
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
													<Badge
														variant="outline"
														class={eq.condition === 'BAIK'
															? 'border-success/20 bg-success/10 text-success'
															: eq.condition === 'RUSAK_RINGAN'
																? 'bg-warning/10 text-warning border-warning/20'
																: 'border-destructive/20 bg-destructive/10 text-destructive'}
													>
														{eq.condition}
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
						{#if formData.equipmentIds.length > 0}
							<div class="space-y-1.5 pt-2">
								<Label>
									Alat Terpilih ({formData.equipmentIds.length}):
								</Label>
								<div class="flex flex-wrap gap-2">
									{#each formData.equipmentIds as id (id)}
										<Badge
											variant="secondary"
											class="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs text-foreground hover:bg-accent"
										>
											<Box size={12} class="text-muted-foreground" />
											{getEquipmentLabel(id)}
											<button
												type="button"
												onclick={() => removeEquipment(id)}
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
						<Select.Root
							type="single"
							bind:value={formData.maintenanceType}
							onValueChange={(v) => (formData.maintenanceType = v)}
						>
							<Select.Trigger class="w-full">
								{formData.maintenanceType || 'Pilih Tipe'}
							</Select.Trigger>
							<Select.Content>
								{#each maintenanceTypes as type (type)}
									<Select.Item value={type}>{type}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
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
							bind:value={formData.scheduledDate}
							required
						/>
					</div>

					<!-- Status -->
					<div class="space-y-2">
						<Label for="status">Status</Label>
						<Select.Root
							type="single"
							bind:value={formData.status}
							onValueChange={(v) => (formData.status = v)}
						>
							<Select.Trigger class="w-full">
								{formData.status || 'Pilih Status'}
							</Select.Trigger>
							<Select.Content>
								{#each statusOptions as status (status)}
									<Select.Item value={status}>{status}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<!-- Tanggal Selesai -->
					<div class="space-y-2">
						<Label for="completionDate">Tanggal Selesai</Label>
						<Input
							id="completionDate"
							name="completionDate"
							type="datetime-local"
							bind:value={formData.completionDate}
						/>
					</div>
				</div>

				<!-- Deskripsi -->
				<div class="space-y-2">
					<Label for="description">Deskripsi Pekerjaan</Label>
					<Textarea
						id="description"
						name="description"
						bind:value={formData.description}
						required
						rows={4}
						class="resize-none rounded-xl border-border"
						placeholder="Jelaskan detail pemeliharaan..."
					/>
				</div>

				<div class="flex justify-end gap-3">
					<Button variant="outline" href="/{data.org_slug}/pemeliharaan">Batal</Button>
					<Button type="submit">
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
