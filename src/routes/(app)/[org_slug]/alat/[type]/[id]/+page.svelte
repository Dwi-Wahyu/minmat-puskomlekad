<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {
		ChevronLeft,
		Package,
		MapPin,
		History,
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
	} from '@lucide/svelte';
	import {
		equipmentConditionColor,
		equipmentConditionLabel,
		equipmentStatusColor,
		equipmentStatusLabel
	} from '@/enums/equipment-enum';
	import { movementEventTypeLabel, movementEventTypeIcon } from '@/enums/movement-enum';
	import Label from '@/components/ui/label/label.svelte';
	import { resolve } from '$app/paths';

	let { data }: { data: PageData } = $props();

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
</script>

<div class="flex w-full flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" href="/{page.params.org_slug}/alat/{page.params.type}">
				<ChevronLeft class="size-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-foreground">Detail Alat</h1>
				<p class="text-sm text-muted-foreground">Informasi spesifik dan lokasi aset.</p>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<!-- Main Info -->
		<Card.Root class={data.equipment.item.imagePath ? 'md:col-span-2' : 'md:col-span-2'}>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					{data.equipment.item.name}
				</Card.Title>
				<Card.Description>{data.equipment.id}</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if data.equipment.item.imagePath}
					<div class="mb-6 size-64 shrink-0 overflow-hidden rounded-lg border bg-muted shadow-sm">
						<img
							src="/uploads/item/{data.equipment.item.imagePath}"
							alt={data.equipment.item.name}
							class="size-full object-cover"
						/>
					</div>
				{/if}
				<div class="grid grid-cols-2 gap-x-4 gap-y-6">
					<div class="space-y-1">
						<Label>Serial Number</Label>
						<p class="font-mono text-lg">{data.equipment.serialNumber || '-'}</p>
					</div>
					<div class="space-y-1">
						<Label>Brand / Merek</Label>
						<p class="text-lg">{data.equipment.brand || '-'}</p>
					</div>
					<div class="space-y-1">
						<Label>Kondisi</Label>
						<div>
							<Badge variant="outline" class={equipmentConditionColor[data.equipment!.condition]}>
								{equipmentConditionLabel[data.equipment!.condition]}
							</Badge>
						</div>
					</div>
					<div class="space-y-1">
						<Label>Status Operasional</Label>
						<div>
							<Badge variant="secondary" class={equipmentStatusColor[data.equipment!.status!]}>
								{equipmentStatusLabel[data.equipment!.status!] ||
									data.equipment!.status!.replace('_', ' ')}
							</Badge>
						</div>
					</div>
					<div class="col-span-2 space-y-1">
						<Label>Deskripsi Item</Label>
						<p class="text-sm text-muted-foreground">
							{data.equipment.item.description || 'Tidak ada deskripsi.'}
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Location Info -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<MapPin class="size-5 text-red-600" />
					Lokasi Saat Ini
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="space-y-1">
					<Label>Satuan Pemilik</Label>
					<p class="text-sm font-medium">
						{data.equipment.warehouse?.organization?.name || 'Tidak diketahui'}
					</p>
				</div>
				<div class="space-y-1">
					<Label>Gudang</Label>
					<p class="text-sm font-medium">{data.equipment.warehouse?.name || 'Tanpa Gudang'}</p>
					<p class="text-xs text-muted-foreground">{data.equipment.warehouse?.location || '-'}</p>
				</div>

				<div class="space-y-1">
					<Label>Terdaftar pada</Label>
					<p class="text-sm font-medium">
						{new Date(data.equipment.createdAt).toLocaleDateString('id-ID')}
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- History Timeline -->
		<Card.Root class="md:col-span-3">
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<History class="size-5 text-purple-600" />
					Riwayat Pergerakan Terakhir
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div
					class="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-border md:before:left-1/2 md:before:ml-0"
				>
					{#each data.history as log (log.id)}
						{@const Icon = iconMap[movementEventTypeIcon[log.eventType]] || Package}
						<div
							class="group relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse"
						>
							<!-- Icon/Dot -->
							<div
								class="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow md:absolute md:left-1/2 md:-translate-x-1/2"
							>
								<Icon class="size-5" />
							</div>

							<!-- Content Card -->
							<a
								href={resolve('/(app)/[org_slug]/mutasi/[id]', {
									org_slug: data.org_slug,
									id: log.id
								})}
								class="group/card block w-[calc(100%-4rem)] rounded-lg border border-border bg-muted/30 p-4 shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-muted/60 md:w-[calc(50%-2.5rem)]"
							>
								<div class="mb-1 flex items-center justify-between space-x-2">
									<div
										class="font-bold text-foreground transition-colors group-hover/card:text-primary"
									>
										{movementEventTypeLabel[log.eventType]}
									</div>
									<time class="font-mono text-xs text-primary"
										>{new Date(log.createdAt).toLocaleDateString()}</time
									>
								</div>
								<div class="text-sm text-muted-foreground">
									{log.notes ||
										`Pergerakan material dari ${log.fromWarehouse?.name || 'Sumber'} ke ${log.toWarehouse?.name || 'Tujuan'}`}
								</div>
							</a>
						</div>
					{:else}
						<p class="py-8 text-center text-muted-foreground">
							Belum ada riwayat pergerakan untuk alat ini.
						</p>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
