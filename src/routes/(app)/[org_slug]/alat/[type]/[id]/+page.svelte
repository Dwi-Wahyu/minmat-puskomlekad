<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { parseDate, type DateValue } from '@internationalized/date';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { RangeCalendar } from '$lib/components/ui/range-calendar';
	import { Separator } from '$lib/components/ui/separator';
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
		ShieldCheck,
		CalendarIcon,
		X
	} from '@lucide/svelte';
	import {
		equipmentConditionColor,
		equipmentConditionLabel,
		equipmentStatusColor,
		equipmentStatusLabel
	} from '@/enums/equipment-enum';
	import { movementEventTypeLabel, movementEventTypeIcon } from '@/enums/movement-enum';
	import Label from '@/components/ui/label/label.svelte';

	let { data }: { data: PageData } = $props();

	// Date Filter State
	let dateRange = $state<{ start: DateValue | undefined; end: DateValue | undefined }>({
		start: undefined,
		end: undefined
	});

	// Initialize from data once
	$effect(() => {
		untrack(() => {
			if (data.filters.start) dateRange.start = parseDate(data.filters.start);
			if (data.filters.end) dateRange.end = parseDate(data.filters.end);
		});
	});

	$effect(() => {
		if (dateRange.start && dateRange.end) {
			const startStr = dateRange.start.toString();
			const endStr = dateRange.end.toString();

			if (startStr !== data.filters.start || endStr !== data.filters.end) {
				const url = new URL(page.url);
				url.searchParams.set('start', startStr);
				url.searchParams.set('end', endStr);
				goto(
					resolve(`/(app)/[org_slug]/alat/[type]/[id]?${url.toString()}`, {
						org_slug: data.org_slug,
						type: page.params.type as string,
						id: data.equipment.id
					}),
					{
						keepFocus: true,
						noScroll: true
					}
				);
			}
		}
	});

	function resetFilter() {
		dateRange.start = undefined;
		dateRange.end = undefined;
		const url = new URL(page.url);
		url.searchParams.delete('start');
		url.searchParams.delete('end');
		goto(
			resolve('/(app)/[org_slug]/alat/[type]/[id]', {
				org_slug: data.org_slug,
				type: page.params.type as string,
				id: data.equipment.id
			}),
			{
				keepFocus: true,
				noScroll: true
			}
		);
	}

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

<div class="flex w-full flex-col gap-4 p-0 md:gap-6 md:p-6">
	<!-- Header -->
	<div class="hidden items-center justify-between p-4 md:flex md:p-0">
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

	<div class="m-4 -mb-4 block md:hidden">
		<Button variant="outline" size="lg" href="/{page.params.org_slug}/alat/{page.params.type}">
			<ChevronLeft />
			Kembali
		</Button>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
		<!-- Main Info & Current Location -->
		<Card.Root
			class="rounded-none border-none bg-transparent shadow-none ring-0 md:rounded-xl md:border md:border-card md:bg-card md:ring-1 md:shadow-card lg:col-span-7"
		>
			<Card.Content class="space-y-4">
				<div class="flex items-start justify-between">
					<div>
						<Card.Title class="text-2xl">{data.equipment.item.name}</Card.Title>
						<Card.Description>{data.equipment.serialNumber || '-'}</Card.Description>
					</div>
				</div>

				{#if data.equipment.item.imagePath}
					<div class="aspect-video w-full overflow-hidden rounded-xl border bg-muted shadow-sm">
						<img
							src="/uploads/item/{data.equipment.item.imagePath}"
							alt={data.equipment.item.name}
							class="size-full object-cover"
						/>
					</div>
				{/if}

				<div class="space-y-4">
					<div class="flex flex-col md:flex-row md:items-center md:justify-between">
						<Label>Status</Label>

						<div class="mt-1">
							<Badge variant="secondary" class={equipmentStatusColor[data.equipment!.status!]}>
								{equipmentStatusLabel[data.equipment!.status!] ||
									data.equipment!.status!.replace('_', ' ')}
							</Badge>
						</div>
					</div>
					<Separator />
					<div class="flex flex-col md:flex-row md:items-center md:justify-between">
						<Label>Brand / Merek</Label>
						<p class="text-sm font-medium text-muted-foreground md:text-right">
							{data.equipment.brand || '-'}
						</p>
					</div>
					<Separator />
					<div class="flex flex-col md:flex-row md:items-center md:justify-between">
						<Label>Kondisi</Label>
						<div class="mt-1">
							<Badge variant="outline" class={equipmentConditionColor[data.equipment!.condition]}>
								{equipmentConditionLabel[data.equipment!.condition]}
							</Badge>
						</div>
					</div>
					<Separator />
					<div class="flex flex-col md:flex-row md:items-center md:justify-between">
						<Label>Terdaftar</Label>
						<p class="text-sm font-medium text-muted-foreground md:text-right">
							{new Date(data.equipment.createdAt).toLocaleDateString('id-ID')}
						</p>
					</div>
					<Separator />
					<div class="flex flex-col md:flex-row md:items-center md:justify-between">
						<Label>Satuan Pemilik</Label>
						<p class="text-sm font-medium text-muted-foreground md:text-right">
							{data.equipment.warehouse?.organization?.displayName || 'Tidak diketahui'}
						</p>
					</div>
					<Separator />
					<div class="flex flex-col md:flex-row md:items-center md:justify-between">
						<Label>Gudang</Label>
						<div class="md:text-right">
							<p class="text-sm font-medium text-muted-foreground">
								{data.equipment.warehouse?.name || 'Tanpa Gudang'}
							</p>
							<p class="text-[10px] text-muted-foreground/60">
								{data.equipment.warehouse?.location || '-'}
							</p>
						</div>
					</div>
					<Separator />
					<div class="space-y-2 pt-2">
						<Label>Deskripsi Item</Label>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{data.equipment.item.description || 'Tidak ada deskripsi.'}
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- History Timeline -->
		<Card.Root class="m-4 mt-0 md:m-0 lg:col-span-5">
			<Card.Header
				class="flex flex-col justify-between gap-4 space-y-0 pb-7 md:flex-row md:items-center md:gap-0"
			>
				<Card.Title class="flex items-center gap-2">Riwayat Pergerakan</Card.Title>
				<div class="flex w-full gap-2 md:w-fit">
					{#if data.filters.start || data.filters.end}
						<Button variant="outline" size="sm" onclick={resetFilter}>
							<X class="size-3" />
						</Button>
					{/if}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger class="w-full md:w-fit">
							<Button variant="outline" size="sm" class="w-full md:w-fit">
								<CalendarIcon />
								{data.filters.start ? 'Filter Aktif' : 'Pilih Tanggal'}
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="center" class="w-auto p-0">
							<RangeCalendar bind:value={dateRange} class="rounded-md border-0" />
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</Card.Header>
			<Card.Content>
				{#if data.history.length > 0}
					<div
						class="relative space-y-6 before:absolute before:left-4 before:h-full before:w-0.5 before:bg-border"
					>
						{#each data.history.slice(0, 5) as log (log.id)}
							{@const Icon = iconMap[movementEventTypeIcon[log.eventType]] || Package}
							<div class="relative flex items-start pl-10">
								<!-- Icon Dot -->
								<div
									class="absolute left-0 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm"
								>
									<Icon class="size-4 text-primary" />
								</div>

								<!-- Content -->
								<a
									href={resolve('/(app)/[org_slug]/mutasi/[id]', {
										org_slug: data.org_slug,
										id: log.id
									})}
									class="flex-1 space-y-1 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
								>
									<div class="flex items-center justify-between gap-2">
										<span class="text-xs font-bold tracking-wider text-foreground uppercase">
											{movementEventTypeLabel[log.eventType]}
										</span>
										<span class="font-mono text-[10px] text-muted-foreground">
											{new Date(log.createdAt).toLocaleDateString('id-ID')}
										</span>
									</div>
									<p class="line-clamp-2 text-xs text-muted-foreground">
										{log.notes ||
											`Material dari ${log.fromWarehouse?.name || 'Sumber'} ke ${log.toWarehouse?.name || 'Tujuan'}`}
									</p>
								</a>
							</div>
						{/each}
					</div>
				{:else}
					<div
						class="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"
					>
						<p class="text-sm">Belum ada riwayat pergerakan.</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
