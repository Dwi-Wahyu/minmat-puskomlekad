<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ArrowLeft,
		Calendar,
		User,
		Package,
		ArrowRightLeft,
		Clock,
		FileText,
		PackagePlus,
		PackageMinus,
		Settings2,
		ArrowUpRight,
		ArrowDownLeft,
		HandHelping,
		RotateCcw,
		Truck,
		PackageCheck,
		Wrench,
		ShieldCheck,
		ArrowRightToLine
	} from '@lucide/svelte';
	import {
		equipmentConditionColor,
		equipmentConditionLabel,
		equipmentStatusColor,
		equipmentStatusLabel
	} from '@/enums/equipment-enum';
	import {
		movementEventTypeLabel,
		movementClassificationLabel,
		movementReferenceTypeLabel,
		movementEventTypeColor,
		movementEventTypeIcon
	} from '@/enums/movement-enum';
	import Label from '@/components/ui/label/label.svelte';

	let { data } = $props();
	const movement = $derived(data.movement);

	const iconMap: Record<string, any> = {
		PackagePlus,
		PackageMinus,
		Settings2,
		ArrowUpRight,
		ArrowDownLeft,
		HandHelping,
		RotateCcw,
		Truck,
		PackageCheck,
		Wrench,
		ShieldCheck
	};

	function handleBack() {
		history.back();
	}

	const eventColor = $derived(
		movementEventTypeColor[movement.eventType] || 'bg-muted text-muted-foreground border-border'
	);
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" onclick={handleBack}>
				<ArrowLeft class="size-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-foreground">Detail Mutasi</h1>
				<p class="text-sm text-muted-foreground">Detail pencatatan pergerakan sistem.</p>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
		<!-- Left: Mutation Info (2 cols) -->
		<div class="space-y-6 md:col-span-2">
			<Card.Root>
				<Card.Content class="space-y-6">
					<!-- Source & Destination flow -->
					<div>
						<div class="flex flex-col items-center justify-between gap-6 sm:flex-row">
							<!-- From Warehouse -->
							<div class="flex-1 space-y-2 text-center sm:text-left">
								<Label>Asal</Label>
								<div class="mt-1">
									<p class="text-base font-semibold">
										{movement.fromWarehouse?.name || '(Luar Sistem / Eksternal)'}
									</p>
								</div>
								{#if movement.fromWarehouse?.location}
									<p class="text-xs text-muted-foreground">
										{movement.fromWarehouse.location}
									</p>
								{/if}
							</div>

							<!-- Connection icon -->
							<div
								class="flex shrink-0 items-center justify-center rounded-full bg-primary/10 p-3 text-primary"
							>
								<ArrowRightToLine class="size-6" />
							</div>

							<!-- To Warehouse -->
							<div class="flex-1 space-y-2 md:text-right">
								<Label class="flex justify-end">Tujuan</Label>
								<div class="mt-1">
									<p class="text-base font-semibold">
										{movement.toWarehouse?.name || '(Keluar Sistem / Permanen)'}
									</p>
								</div>
								{#if movement.toWarehouse?.location}
									<p class="text-xs text-muted-foreground">{movement.toWarehouse.location}</p>
								{/if}
							</div>
						</div>
					</div>

					<!-- Details Grid -->
					<div class="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2">
						{#if movement.conditionAtArrival && movement.eventType === 'TRANSFER_IN'}
							<div
								class="col-span-1 rounded-lg border px-4 py-3 text-sm sm:col-span-2
								{movement.conditionAtArrival === 'BAIK'
									? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
									: movement.conditionAtArrival === 'RUSAK_RINGAN'
										? 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
										: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'}"
							>
								<span class="font-medium">Kondisi saat tiba:</span>
								{movement.conditionAtArrival === 'BAIK'
									? '✅ Baik'
									: movement.conditionAtArrival === 'RUSAK_RINGAN'
										? '⚠️ Rusak Ringan'
										: '🔴 Rusak Berat'}
							</div>
						{/if}

						<div class="space-y-1">
							<Label>Jenis Transaksi</Label>

							{#if movement.eventType}
								{@const Icon = iconMap[movementEventTypeIcon[movement.eventType]] || Package}
								<Badge variant="outline" class="mt-1 {eventColor}">
									<Icon />
									{movementEventTypeLabel[movement.eventType] || movement.eventType}
								</Badge>
							{/if}
						</div>

						<div class="space-y-1">
							<Label>Klasifikasi</Label>
							<p class="text-sm text-muted-foreground">
								{movementClassificationLabel[movement.classification || ''] ||
									movement.classification ||
									'-'}
							</p>
						</div>

						<div class="space-y-1">
							<Label>Lokasi Spesifik</Label>
							<p class="text-sm text-muted-foreground">{movement.specificLocationName || '-'}</p>
						</div>

						<div class="space-y-1">
							<Label>Waktu Mutasi</Label>
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<Calendar class="size-4 text-muted-foreground" />
								<span
									>{new Date(movement.createdAt).toLocaleDateString('id-ID', {
										dateStyle: 'long'
									})}</span
								>
								<Clock class="ml-2 size-4 text-muted-foreground" />
								<span
									>{new Date(movement.createdAt).toLocaleTimeString('id-ID', {
										timeStyle: 'short'
									})} WIB</span
								>
							</div>
						</div>

						<div class="space-y-1">
							<Label>Penanggung Jawab (PIC)</Label>
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<User class="size-4 text-muted-foreground" />
								<div>
									<h1 class="font-medium">{movement.pic?.name || 'Sistem'}</h1>
								</div>
							</div>
						</div>
					</div>

					{#if movement.referenceType}
						<div class="space-y-1 border-t pt-4">
							<Label>Referensi Transaksi</Label>
							<div class="mt-1 flex items-center gap-2 text-sm">
								<FileText class="size-4 text-primary" />
								<span class="font-semibold text-primary"
									>{movementReferenceTypeLabel[movement.referenceType] ||
										movement.referenceType}</span
								>
								{#if movement.referenceId}
									<span class="text-xs text-muted-foreground">ID: {movement.referenceId}</span>
								{/if}
							</div>
						</div>
					{/if}

					<div class="space-y-2">
						<Label>Catatan / Keterangan</Label>
						<div class="text-sm text-muted-foreground italic">
							{movement.notes || 'Tidak ada catatan tambahan.'}
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			{#if movement.equipment}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Button
						variant="default"
						class="w-full gap-2"
						href="/{page.params.org_slug}/alat/{page.url.searchParams.get('type') ||
							'alkomlek'}/mutate/{movement.equipment.id}"
					>
						<ArrowRightLeft class="size-4" />
						Catat Mutasi Baru
					</Button>
					<Button
						variant="outline"
						class="w-full gap-2"
						href="/{page.params.org_slug}/alat/{page.url.searchParams.get('type') ||
							'alkomlek'}/{movement.equipment.id}"
					>
						<Package class="size-4" />
						Lihat Detail Alat
					</Button>
				</div>
			{/if}
		</div>

		<!-- Right: Equipment Detail -->
		<div class="space-y-6 md:col-span-1">
			<Card.Root>
				<Card.Header class="border-b">
					<Card.Title class="flex items-center gap-2 text-base font-bold">
						<Package class="size-4 text-primary" />

						{#if movement.equipment}
							Alat Terkait
						{:else}
							Barang Terkait
						{/if}
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#if movement.equipment}
						{#if movement.equipment.item?.imagePath}
							<div
								class="aspect-square w-full shrink-0 overflow-hidden rounded-lg border bg-muted shadow-sm"
							>
								<img
									src="/uploads/item/{movement.equipment.item.imagePath}"
									alt={movement.equipment.item.name}
									class="size-full object-cover"
								/>
							</div>
						{:else}
							<div
								class="flex aspect-square w-full items-center justify-center rounded-lg border bg-muted"
							>
								<Package class="size-16 text-muted-foreground/30" />
							</div>
						{/if}

						<div class="space-y-3 pt-2">
							<div>
								<Label class="mb-1">Nama Peralatan</Label>
								<p class="text-sm leading-snug font-semibold">
									{movement.equipment.item?.name || '-'}
								</p>
							</div>

							<div>
								<Label class="mb-1">Serial Number</Label>
								<p class="text-sm text-muted-foreground">
									{movement.equipment.serialNumber || '-'}
								</p>
							</div>

							<div>
								<Label class="mb-1">Merek / Brand</Label>
								<p class="text-sm text-muted-foreground">{movement.equipment.brand || '-'}</p>
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div>
									<Label>Kondisi</Label>
									<div class="mt-1">
										<Badge
											variant="outline"
											class={equipmentConditionColor[movement.equipment.condition] || ''}
										>
											{equipmentConditionLabel[movement.equipment.condition] ||
												movement.equipment.condition}
										</Badge>
									</div>
								</div>
								<div>
									<Label>Status</Label>
									<div class="mt-1">
										<Badge
											variant="secondary"
											class={equipmentStatusColor[movement.equipment.status || ''] || ''}
										>
											{equipmentStatusLabel[movement.equipment.status || ''] ||
												movement.equipment.status ||
												''}
										</Badge>
									</div>
								</div>
							</div>
						</div>
					{:else if movement.item}
						<!-- Consumable Item -->
						{#if movement.item.imagePath}
							<div
								class="aspect-square w-full shrink-0 overflow-hidden rounded-lg border bg-muted shadow-sm"
							>
								<img
									src="/uploads/item/{movement.item.imagePath}"
									alt={movement.item.name}
									class="size-full object-cover"
								/>
							</div>
						{:else}
							<div
								class="flex aspect-square w-full items-center justify-center rounded-lg border bg-muted"
							>
								<Package class="size-16 text-muted-foreground/30" />
							</div>
						{/if}

						<div class="space-y-3 pt-2">
							<div>
								<Label class="mb-1">Nama Barang</Label>
								<p class="text-sm text-muted-foreground">{movement.item.name || '-'}</p>
							</div>
							<div>
								<Label class="mb-1">Jumlah (Qty)</Label>
								<p class="text-sm text-muted-foreground">
									{Number(movement.qty)}
									{movement.unit || 'PCS'}
								</p>
							</div>
						</div>
					{:else}
						<div class="py-6 text-center text-sm text-muted-foreground italic">
							Peralatan tidak ditemukan
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
