<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import {
		ArrowLeft,
		ArrowRightLeft,
		Package,
		BookOpen,
		Info,
		Clock,
		SquareArrowOutUpRight
	} from '@lucide/svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { equipmentStatusLabel } from '@/enums/equipment-enum.js';
	import Badge from '@/components/ui/badge/badge.svelte';
	import { movementEventTypeLabel } from '@/enums/movement-enum.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	let loading = $state(false);
	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	let guideOpen = $state(false);

	// Form states
	let eventType = $state('RECEIVE');
	let classification = $state('KOMUNITY');
	let status = $state('');
	let toWarehouseId = $state('');
	let specificLocationName = $state('');
	let notes = $state('');
	let conditionAtArrival = $state('');

	const conditionOptions = [
		{ value: 'BAIK', label: 'Baik' },
		{ value: 'RUSAK_RINGAN', label: 'Rusak Ringan' },
		{ value: 'RUSAK_BERAT', label: 'Rusak Berat' }
	];

	const selectedConditionLabel = $derived(
		conditionOptions.find((c) => c.value === conditionAtArrival)?.label ??
			'-- Tidak Ada Laporan Kerusakan --'
	);

	$effect(() => {
		if (data.equipment) {
			toWarehouseId = data.equipment.warehouseId || '';
			status = data.equipment.status || 'READY';
		}
	});

	$effect(() => {
		// Auto-update status based on eventType
		if (eventType === 'TRANSFER_OUT') {
			status = 'TRANSIT';
		} else if (['RECEIVE', 'TRANSFER_IN', 'ISSUE'].includes(eventType)) {
			status = 'READY';
		}

		// Auto-fill toWarehouseId for TRANSFER_IN if last movement was TRANSFER_OUT
		if (eventType === 'TRANSFER_IN' && data.lastMovement?.eventType === 'TRANSFER_OUT') {
			if (data.lastMovement.toWarehouseId) {
				toWarehouseId = data.lastMovement.toWarehouseId;
			}
		}
	});

	const isToWhDisabled = $derived(
		eventType === 'TRANSFER_IN' && data.lastMovement?.eventType === 'TRANSFER_OUT'
	);

	$effect(() => {
		if (form?.success) {
			notificationMsg = form.message || 'Mutasi berhasil dicatat';
			notificationType = 'success';
			notificationOpen = true;
		} else if (form?.message) {
			notificationMsg = form.message;
			notificationType = 'error';
			notificationOpen = true;
		}
	});

	function handleBack() {
		goto(
			resolve('/(app)/[org_slug]/alat/[type]', {
				org_slug: data.org_slug,
				type: data.equipment.item.equipmentType as string
			})
		);
	}

	const ALL_EVENT_TYPES = [
		{ value: 'RECEIVE', label: 'Masuk (Eksternal)' },
		{ value: 'ISSUE', label: 'Keluar / Penghapusan (Permanen)' },
		{ value: 'TRANSFER_OUT', label: 'Transfer Keluar (Internal)' },
		{ value: 'TRANSFER_IN', label: 'Transfer Masuk (Internal)' }
	] as const;

	const allowedEventTypes = $derived.by(() => {
		const s = data.equipment.status;
		const hasWarehouse = !!data.equipment.warehouseId;
		if (s === 'TRANSIT') {
			return ALL_EVENT_TYPES.filter((e) => ['TRANSFER_IN', 'ISSUE'].includes(e.value));
		}
		if (s === 'MAINTENANCE') {
			// Tidak ada opsi manual, tampilkan pesan khusus
			return [];
		}
		if (!hasWarehouse) {
			return ALL_EVENT_TYPES.filter((e) => e.value === 'RECEIVE');
		}
		// READY / IN_USE di gudang
		const allowed: string[] = ['TRANSFER_OUT', 'ISSUE'];
		// Jika mutasi terakhir BUKAN RECEIVE, mungkin masih boleh RECEIVE (misal setelah ISSUE lalu masuk lagi)
		if (data.lastMovement?.eventType !== 'RECEIVE') {
			allowed.push('RECEIVE');
		}
		return ALL_EVENT_TYPES.filter((e) => allowed.includes(e.value));
	});

	const ALL_CLASSIFICATIONS = [
		{ value: 'KOMUNITY', label: 'Komunity' },
		{ value: 'BALKIR', label: 'Balkir' },
		{ value: 'TRANSITO', label: 'Transito' }
	] as const;

	const classificationMap: Record<string, string[]> = {
		RECEIVE: ['KOMUNITY', 'TRANSITO'],
		ISSUE: ['BALKIR', 'KOMUNITY'],
		TRANSFER_OUT: ['BALKIR', 'TRANSITO'],
		TRANSFER_IN: ['KOMUNITY', 'TRANSITO']
	};

	const allowedClassifications = $derived.by(() => {
		const allowed = classificationMap[eventType] ?? [];
		return ALL_CLASSIFICATIONS.filter((c) => allowed.includes(c.value));
	});

	$effect(() => {
		const allowed = allowedEventTypes;
		if (allowed.length === 0) return;
		// Jika eventType saat ini tidak ada di allowed, reset ke pilihan pertama
		if (!allowed.find((e) => e.value === eventType)) {
			eventType = allowed[0].value;
		}
	});

	$effect(() => {
		const allowed = allowedClassifications;
		if (!allowed.find((c) => c.value === classification)) {
			// Untuk ISSUE, force BALKIR
			classification = eventType === 'ISSUE' ? 'BALKIR' : (allowed[0]?.value ?? 'KOMUNITY');
		}
	});

	const eventDescriptions = {
		RECEIVE: `Barang masuk dari luar sistem (pengadaan/hibah). Gudang asal kosong, status menjadi ${equipmentStatusLabel['READY']}.`,
		ISSUE: `Barang keluar sistem secara permanen. Gudang tujuan kosong, alat siap untuk penghapusan.`,
		TRANSFER_OUT: `Kirim barang antar gudang internal. Status menjadi ${equipmentStatusLabel['TRANSIT']} (tidak bisa dipinjam/digunakan di jalan).`,
		TRANSFER_IN: `Konfirmasi barang sampai di gudang tujuan. Status kembali menjadi ${equipmentStatusLabel['READY']} di lokasi baru.`
	};

	const selectedEventDescription = $derived(
		eventDescriptions[eventType as keyof typeof eventDescriptions]
	);

	// Derived logic for UI
	const needsToWarehouse = $derived(['RECEIVE', 'TRANSFER_OUT', 'TRANSFER_IN'].includes(eventType));
	const showFromWarehouse = $derived(['ISSUE', 'TRANSFER_OUT', 'TRANSFER_IN'].includes(eventType));
</script>

<div class="flex flex-col gap-4 p-4 pb-10 md:gap-6 md:p-6">
	<div class="flex flex-col items-center justify-between gap-4 md:flex-row md:gap-0">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" onclick={handleBack}>
				<ArrowLeft class="size-4" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Catat Mutasi Alat</h1>
				<p class="text-sm text-muted-foreground">
					Sesuai aturan bisnis mutasi inventaris Puskomlekad.
				</p>
			</div>
		</div>
		<Button variant="outline" class="w-full md:w-fit" onclick={() => (guideOpen = true)}>
			<BookOpen />
			Baca Panduan
		</Button>
	</div>

	{#if data.equipment.status === 'TRANSIT'}
		<Alert.Root>
			<Info />
			<Alert.Title class="font-semibold"
				>Alat Sedang Dalam {equipmentStatusLabel['TRANSIT']}</Alert.Title
			>
			<Alert.Description>
				Hanya bisa dicatat sebagai <strong>Transfer Masuk</strong> (konfirmasi tiba di tujuan) atau
				<strong>Keluar Permanen</strong> jika barang hilang/rusak di jalan (Balkir).
			</Alert.Description>
		</Alert.Root>
	{/if}

	{#if data.equipment.status === 'MAINTENANCE'}
		<div
			class="flex items-start gap-3 rounded-lg border border-blue-300 bg-blue-50/60 p-4 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-200"
		>
			<Info class="mt-0.5 size-4 shrink-0" />
			<p>
				Alat sedang <strong>{equipmentStatusLabel['MAINTENANCE']}</strong>. Mutasi manual tidak
				dapat dilakukan. Selesaikan proses pemeliharaan terlebih dahulu melalui modul Pemeliharaan.
			</p>
		</div>
	{/if}

	<div class="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
		<!-- Last Mutation Card -->
		{#if data.lastMovement}
			<Card.Root class="md:col-1">
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>Mutasi Terakhir Peralatan</Card.Title>
						<Button
							variant="link"
							size="icon"
							href="/{page.params.org_slug}/mutasi/{data.lastMovement.id}?type={page.params.type}"
						>
							<SquareArrowOutUpRight />
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-col gap-4">
						<div>
							<Label class="mb-2">Tanggal</Label>

							<Badge variant="outline">
								<Clock />
								{new Date(data.lastMovement.createdAt).toLocaleDateString('id-ID', {
									dateStyle: 'long'
								})}
							</Badge>
						</div>

						<div>
							<Label class="mb-2">Jenis Kejadian</Label>
							<Badge variant="outline">
								{movementEventTypeLabel[data.lastMovement.eventType]}
							</Badge>
						</div>

						<div>
							<Label class="mb-1">Asal</Label>
							<p class="text-muted-foreground">
								{data.lastMovement.fromWarehouse?.name || '(Luar Sistem)'}
							</p>
						</div>

						<div>
							<Label class="mb-1">Tujuan</Label>
							<p class="text-muted-foreground">
								{data.lastMovement.toWarehouse?.name || '(Keluar Sistem)'}
							</p>
						</div>

						{#if data.lastMovement.notes}
							<div class="space-y-1">
								<Label>Keterangan</Label>
								<p class="max-w-md text-sm text-wrap text-muted-foreground italic">
									{data.lastMovement.notes}
								</p>
							</div>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Form Mutasi -->
		<div class="md:col-span-2">
			<Card.Root>
				<form
					method="POST"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							loading = false;
							await update();
						};
					}}
				>
					<Card.Content class="space-y-6">
						<div>
							<Card.Title>Informasi Mutasi</Card.Title>
							<Card.Description>Lengkapi data perpindahan di bawah ini.</Card.Description>
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label for="eventType">Jenis Kejadian</Label>
								<Select.Root type="single" name="eventType" bind:value={eventType}>
									<Select.Trigger class="w-full">
										{allowedEventTypes.find((t) => t.value === eventType)?.label || 'Pilih Jenis'}
									</Select.Trigger>
									<Select.Content>
										{#each allowedEventTypes as type (type.value)}
											<Select.Item value={type.value}>{type.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>

							<div class="space-y-2">
								<Label for="classification">Klasifikasi</Label>
								{#if eventType === 'ISSUE'}
									<div
										class="flex h-9 w-full items-center rounded-full border border-input bg-muted/40 px-3 text-sm"
									>
										<span class="font-medium">Balkir (Otomatis)</span>
									</div>
									<input type="hidden" name="classification" value="BALKIR" />
								{:else}
									<Select.Root type="single" name="classification" bind:value={classification}>
										<Select.Trigger class="w-full">
											{allowedClassifications.find((c) => c.value === classification)?.label ||
												'Pilih Klasifikasi'}
										</Select.Trigger>
										<Select.Content>
											{#each allowedClassifications as cl (cl.value)}
												<Select.Item value={cl.value}>{cl.label}</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								{/if}
							</div>
						</div>

						{#if selectedEventDescription}
							<div
								class="-mt-1 flex items-start gap-3 rounded-lg border bg-blue-50/50 p-3 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-200"
							>
								<Info class="mt-0.5 size-4 shrink-0" />
								<p>{selectedEventDescription}</p>
							</div>
						{/if}

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label>Asal</Label>
								<div
									class="flex h-9 w-full items-center rounded-full border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
								>
									{#if showFromWarehouse}
										{data.equipment.warehouse?.name || 'Pusat/Luar Sistem'}
									{:else}
										<span class="text-xs italic">(Penerimaan dari luar sistem)</span>
									{/if}
								</div>
							</div>

							{#if needsToWarehouse}
								<div class="space-y-2">
									<Label for="toWarehouseId">Tujuan</Label>
									<Select.Root
										type="single"
										name="toWarehouseId"
										bind:value={toWarehouseId}
										disabled={isToWhDisabled}
									>
										<Select.Trigger class="w-full">
											{data.warehouses.find((w) => w.id === toWarehouseId)?.name ||
												'-- Pilih Gudang Tujuan --'}
										</Select.Trigger>
										<Select.Content>
											{#each data.warehouses as wh (wh.id)}
												<Select.Item value={wh.id}>{wh.name}</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
									{#if isToWhDisabled}
										<input type="hidden" name="toWarehouseId" value={toWarehouseId} />
										<p class="text-[10px] text-muted-foreground italic">
											Tujuan dikunci sesuai rencana transfer sebelumnya.
										</p>
									{/if}
								</div>
							{:else}
								<div class="space-y-2">
									<Label>Gudang Tujuan</Label>
									<div
										class="flex h-9 w-full items-center rounded-full border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
									>
										Keluar dari sistem (Permanen)
									</div>
								</div>
							{/if}
						</div>

						<!-- <div class="space-y-2">
							<Label for="status">Status Peralatan (Baru)</Label>
							<Select.Root type="single" name="status" bind:value={status}>
								<Select.Trigger class="w-full">
									{equipmentStatusLabel[status] || 'Pilih Status'}
								</Select.Trigger>
								<Select.Content>
									{#each Object.entries(equipmentStatusLabel) as [value, label] (value)}
										<Select.Item {value}>{label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<p class="text-xs text-muted-foreground">
								Status otomatis disesuaikan berdasarkan Jenis Kejadian, namun dapat diubah manual.
							</p>
						</div> -->

						{#if eventType === 'TRANSFER_IN'}
							<div class="space-y-2">
								<Label for="conditionAtArrival">Kondisi Saat Tiba</Label>
								<Select.Root type="single" bind:value={conditionAtArrival}>
									<Select.Trigger class="w-full">
										{selectedConditionLabel}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="" label="-- Tidak Ada Laporan Kerusakan --"
											>-- Tidak Ada Laporan Kerusakan --</Select.Item
										>
										{#each conditionOptions as opt (opt.value)}
											<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" name="conditionAtArrival" value={conditionAtArrival} />
								<p class="text-xs text-muted-foreground">
									Isi jika kondisi alat saat tiba berbeda dari kondisi saat dikirim.
								</p>
							</div>
						{/if}

						<div class="space-y-2">
							<Label for="specificLocationName">Lokasi Spesifik</Label>
							<Input
								id="specificLocationName"
								name="specificLocationName"
								placeholder="Contoh: Yonif 201, Kapal X, Truk A, dll"
								bind:value={specificLocationName}
							/>
						</div>

						<div class="space-y-2">
							<Label for="notes">Catatan Tambahan</Label>
							<Textarea
								id="notes"
								name="notes"
								placeholder="Tambahkan keterangan mutasi jika diperlukan..."
								class="min-h-20"
								bind:value={notes}
							/>
						</div>

						<div class="flex justify-end gap-3">
							<Button variant="outline" type="button" onclick={handleBack} disabled={loading}>
								Batal
							</Button>
							<Button
								type="submit"
								class="gap-2"
								disabled={loading || data.equipment.status === 'MAINTENANCE'}
							>
								{#if loading}
									<div
										class="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
									></div>
								{:else}
									<ArrowRightLeft class="size-4" />
								{/if}
								Catat Mutasi
							</Button>
						</div>
					</Card.Content>
				</form>
			</Card.Root>
		</div>
	</div>
</div>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={() => {
		notificationOpen = false;
		if (notificationType === 'success') {
			handleBack();
		}
	}}
/>

<Dialog.Root bind:open={guideOpen}>
	<Dialog.Content class="sm:max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>Panduan Alur Mutasi Inventaris</Dialog.Title>
			<Dialog.Description>
				Penjelasan mengenai alur perpindahan barang di sistem Inventaris Puskomlekad.
			</Dialog.Description>
		</Dialog.Header>

		<div class="max-h-[65vh] space-y-6 overflow-y-auto py-4 pr-2">
			<section class="space-y-4">
				<h3 class="flex items-center gap-2 font-semibold text-primary">
					<Info class="size-4" />
					Jenis Kejadian
				</h3>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="rounded-lg border p-3 shadow-sm">
						<p class="font-medium text-blue-600 dark:text-blue-400">
							Penerimaan / Masuk (Eksternal)
						</p>
						<p class="mt-1 text-sm text-muted-foreground">
							Barang masuk dari sumber luar (pengadaan, hibah, dll). Gudang asal dikosongkan karena
							datang dari luar sistem. Alat otomatis siap digunakan {equipmentStatusLabel['READY']}.
						</p>
					</div>
					<div class="rounded-lg border p-3 shadow-sm">
						<p class="font-medium text-orange-600 dark:text-orange-400">
							Pengeluaran / Keluar (Permanen)
						</p>
						<p class="mt-1 text-sm text-muted-foreground">
							Barang keluar dari sistem secara permanen (lelang, penghapusan, atau rusak total).
							Gudang tujuan dikosongkan karena barang tidak lagi dalam pengawasan sistem.
						</p>
					</div>
					<div class="rounded-lg border p-3 shadow-sm">
						<p class="font-medium text-purple-600 dark:text-purple-400">
							Transfer Keluar (Internal)
						</p>
						<p class="mt-1 text-sm text-muted-foreground">
							Mengirim barang antar gudang dalam organisasi. Alat akan berstatus {equipmentStatusLabel[
								'TRANSIT'
							]} (dalam perjalanan) dan tidak bisa dipinjam/digunakan sementara waktu.
						</p>
					</div>
					<div class="rounded-lg border p-3 shadow-sm">
						<p class="font-medium text-green-600 dark:text-green-400">Transfer Masuk (Internal)</p>
						<p class="mt-1 text-sm text-muted-foreground">
							Konfirmasi bahwa barang yang dikirim (Transfer Keluar) telah sampai di tujuan. Alat
							kembali berstatus {equipmentStatusLabel['READY']} di gudang yang baru.
						</p>
					</div>
				</div>
			</section>

			<section class="space-y-4">
				<h3 class="flex items-center gap-2 font-semibold text-primary">
					<Package class="size-4" />
					Klasifikasi
				</h3>
				<div class="grid gap-3 sm:grid-cols-3">
					<div class="rounded-md border p-3 text-sm shadow-sm">
						<p class="mb-1 font-semibold">Komunity</p>
						<p class="text-xs text-muted-foreground">
							Digunakan jika mutasi adalah serah terima ke satuan pemakai (siap pakai).
						</p>
					</div>
					<div class="rounded-md border p-3 text-sm shadow-sm">
						<p class="mb-1 font-semibold">Balkir</p>
						<p class="text-xs text-muted-foreground">
							Digunakan jika mutasi dalam rangka persiapan penghapusan atau ekspedisi.
						</p>
					</div>
					<div class="rounded-md border p-3 text-sm shadow-sm">
						<p class="mb-1 font-semibold">Transito</p>
						<p class="text-xs text-muted-foreground">
							Titipan sementara di gudang transit sebelum dikirim ke lokasi akhir.
						</p>
					</div>
				</div>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (guideOpen = false)}>Mengerti</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
