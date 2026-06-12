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
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { RangeCalendar } from '$lib/components/ui/range-calendar';
	import {
		ChevronLeft,
		Package,
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
		Database,
		CalendarIcon,
		X,
		ArrowRightLeft
	} from '@lucide/svelte';
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
					resolve(`/(app)/[org_slug]/barang/[id]?${url.toString()}`, {
						org_slug: data.org_slug,
						id: data.item.id
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
		goto(resolve('/(app)/[org_slug]/barang/[id]', { org_slug: data.org_slug, id: data.item.id }), {
			keepFocus: true,
			noScroll: true
		});
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

	const totalQty = $derived(
		data.stocks.reduce((acc: number, s: { qty: string }) => acc + Number(s.qty), 0)
	);
</script>

<div class="flex w-full flex-col gap-4 p-4 md:gap-6 md:p-6">
	<!-- Header -->
	<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center md:gap-0">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" href="/{data.org_slug}/barang">
				<ChevronLeft class="size-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-foreground">Detail Barang</h1>
				<p class="text-sm text-muted-foreground">Informasi stok dan riwayat pergerakan materiil.</p>
			</div>
		</div>
		<Button
			href={resolve('/(app)/[org_slug]/barang/mutate/[id]', {
				org_slug: data.org_slug,
				id: data.item.id
			})}
			class="gap-2"
		>
			<ArrowRightLeft class="size-4" />
			Mutasi Stok
		</Button>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Main Info -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Package class="size-5 text-primary" />
					{data.item.name}
				</Card.Title>
				<Card.Description>{data.item.id}</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-6">
					{#if data.item.imagePath}
						<div class="size-48 shrink-0 overflow-hidden rounded-lg border bg-muted shadow-sm">
							<img
								src="/uploads/item/{data.item.imagePath}"
								alt={data.item.name}
								class="size-full object-cover"
							/>
						</div>
					{/if}
					<div class="grid flex-1 grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
						<div class="space-y-1">
							<Label>Total Stok Keseluruhan</Label>
							<p class="text-2xl font-bold text-primary">
								{formatStock(totalQty, data.item.baseUnit, data.item.unitConversions)}
							</p>
							{#if data.item.unitConversions?.length > 0 && totalQty > 0}
								<p class="text-xs text-muted-foreground italic">
									(Setara: {totalQty}
									{data.item.baseUnit})
								</p>
							{/if}
						</div>
						<div class="space-y-1">
							<Label>Satuan Dasar</Label>
							<div>
								<Badge variant="outline" class="border-blue-200 bg-blue-50 text-blue-700">
									{data.item.baseUnit}
								</Badge>
							</div>
						</div>
						<div class="space-y-1 sm:col-span-2">
							<Label>Deskripsi</Label>
							<p class="text-sm text-muted-foreground">
								{data.item.description || 'Tidak ada deskripsi.'}
							</p>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Stock per Warehouse -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Database class="size-5 text-amber-600" />
					Stok per Gudang
				</Card.Title>
			</Card.Header>
			<Card.Content class="p-0">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="pl-6">Gudang</Table.Head>
							<Table.Head class="pr-6 text-right">Stok</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.stocks as s (s.id)}
							<Table.Row>
								<Table.Cell class="pl-6">
									<div class="flex flex-col">
										<span class="font-medium">{s.warehouseName}</span>
										<span class="text-[10px] text-muted-foreground"
											>{s.warehouseLocation || '-'}</span
										>
									</div>
								</Table.Cell>
								<Table.Cell class="pr-6 text-right font-mono text-sm font-bold">
									{formatStock(s.qty, data.item.baseUnit, data.item.unitConversions)}
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={2} class="h-24 text-center text-muted-foreground italic">
									Belum ada stok di gudang manapun.
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>

		<!-- History Timeline -->
		<Card.Root class="lg:col-span-2">
			<Card.Header
				class="flex flex-col gap-4 space-y-0 pb-7 md:flex-row md:items-center md:justify-between"
			>
				<Card.Title class="flex items-center gap-2">
					<History class="size-5 text-purple-600" />
					Riwayat Pergerakan Terakhir
				</Card.Title>
				<div class="flex w-full items-center gap-2 md:w-fit">
					{#if data.filters.start || data.filters.end}
						<Button variant="ghost" size="sm" onclick={resetFilter} class="h-8 gap-1 px-2 text-xs">
							<X class="size-3" /> Reset Filter
						</Button>
					{/if}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger class="flex-1 md:flex-initial">
							<Button variant="outline" size="sm" class="h-8 w-full gap-2 text-xs md:w-fit">
								<CalendarIcon class="size-3.5" />
								{#if data.filters.start && data.filters.end}
									{data.filters.start} - {data.filters.end}
								{:else}
									Filter Tanggal
								{/if}
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-auto p-0">
							<RangeCalendar bind:value={dateRange} class="rounded-md border-0" />
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</Card.Header>
			<Card.Content>
				{#if data.history.length > 0}
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
									<div class="mb-2 flex items-center justify-between space-x-2">
										<div
											class="font-bold text-foreground transition-colors group-hover/card:text-primary"
										>
											{movementEventTypeLabel[log.eventType]}
										</div>
										<time class="font-mono text-xs text-primary">
											{new Date(log.createdAt).toLocaleString('id-ID', {
												dateStyle: 'medium',
												timeStyle: 'short'
											})}
										</time>
									</div>
									<div class="mb-2 flex items-center gap-2">
										<Badge variant="secondary" class="font-mono text-[10px]">
											{Math.abs(Number(log.qty))}
											{log.unit || data.item.baseUnit}
										</Badge>
										<span class="text-xs text-muted-foreground"
											>Oleh: {log.pic?.name || 'Sistem'}</span
										>
									</div>
									<div class="text-sm text-muted-foreground">
										{#if log.notes}
											{log.notes}
										{:else}
											Pergerakan dari <span class="font-medium text-foreground"
												>{log.fromWarehouse?.name || 'Sumber'}</span
											>
											ke
											<span class="font-medium text-foreground"
												>{log.toWarehouse?.name || 'Tujuan'}</span
											>
										{/if}
									</div>
								</a>
							</div>
						{/each}
					</div>
				{:else}
					<div class="flex h-20 items-center justify-center">
						<p class="text-muted-foreground">Belum ada riwayat pergerakan untuk barang ini.</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
