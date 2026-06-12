<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import {
		Search,
		ChevronLeft,
		ChevronRight,
		Building2,
		Package,
		Radio,
		Zap,
		Box
	} from '@lucide/svelte';
	import {
		equipmentStatusLabel,
		equipmentStatusColor,
		equipmentConditionColor
	} from '@/enums/equipment-enum.js';

	let { data }: { data: PageData } = $props();

	// Function to generate pagination numbers (max 4 buttons)
	function getPaginationRange(currentPage: number, totalPages: number) {
		const delta = 1; // Number of pages to show before and after current
		let left = Math.max(1, currentPage - delta);
		let right = Math.min(totalPages, currentPage + delta);

		if (currentPage - 1 <= delta) {
			right = Math.min(totalPages, 1 + delta * 2);
		}
		if (totalPages - currentPage <= delta) {
			left = Math.max(1, totalPages - delta * 2);
		}

		const range = [];
		for (let i = left; i <= right; i++) {
			range.push(i);
		}
		return range;
	}

	function goToPage(p: number) {
		const newUrl = new URL(page.url);
		newUrl.searchParams.set('page', p.toString());
		goto(newUrl.toString(), { noScroll: true });
	}
</script>

<div class="mx-auto flex w-full flex-col gap-4 p-4 md:gap-6 md:p-6">
	<!-- Header & Back Button -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" href="/satuan-jajaran">
				<ChevronLeft class="size-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-foreground">Detail Satuan</h1>
				<p class="text-sm text-muted-foreground">
					Informasi lengkap dan inventaris material satuan.
				</p>
			</div>
		</div>
		{#if data.isSuperadmin}
			<Button href="/satuan-jajaran/{data.targetOrg.id}/edit" variant="secondary">
				Edit Satuan
			</Button>
		{/if}
	</div>

	<!-- Unit Info Card -->
	<Card.Root>
		<Card.Header class="flex flex-row items-center gap-4">
			<div class="rounded-full bg-blue-100 p-3 text-blue-600">
				<Building2 class="size-6" />
			</div>
			<div>
				<Card.Title class="text-2xl">{data.targetOrg.name}</Card.Title>
				<!-- <Card.Description></Card.Description> -->
			</div>
		</Card.Header>
	</Card.Root>

	<!-- Inventory Section -->
	<div class="space-y-4">
		<div class="flex flex-col justify-between gap-4 md:flex-row md:items-end">
			<div class="flex flex-1 flex-col gap-2">
				<h2 class="flex items-center gap-2 text-xl font-bold">
					<Package class="size-5" />
					Daftar Inventaris
				</h2>
				<!-- Filters -->
				<div class="flex flex-wrap gap-2">
					<Button
						variant={data.filters.type === 'ALL' ? 'default' : 'outline'}
						size="sm"
						href="?type=ALL&q={data.filters.q}"
						class="gap-1.5"
					>
						Semua
					</Button>
					<Button
						variant={data.filters.type === 'ALKOMLEK' ? 'default' : 'outline'}
						size="sm"
						href="?type=ALKOMLEK&q={data.filters.q}"
						class="gap-1.5"
					>
						<Radio class="size-3.5" />
						Alkomlek
					</Button>
					<Button
						variant={data.filters.type === 'PERNIKA_LEK' ? 'default' : 'outline'}
						size="sm"
						href="?type=PERNIKA_LEK&q={data.filters.q}"
						class="gap-1.5"
					>
						<Zap class="size-3.5" />
						Pernika & Lek
					</Button>
					<Button
						variant={data.filters.type === 'CONSUMABLE' ? 'default' : 'outline'}
						size="sm"
						href="?type=CONSUMABLE&q={data.filters.q}"
						class="gap-1.5"
					>
						<Box class="size-3.5" />
						Habis Pakai
					</Button>
				</div>
			</div>

			<form method="GET" class="flex flex-col items-end gap-2 md:w-96 md:flex-row">
				<input type="hidden" name="type" value={data.filters.type} />
				<div class="relative w-full">
					<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input name="q" placeholder="Cari nama barang..." class="pl-10" value={data.filters.q} />
				</div>
				<Button type="submit" variant="secondary">Cari</Button>
			</form>
		</div>

		<!-- Table -->
		<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
			<Table.Root>
				<Table.Header>
					<Table.Row class="bg-muted/50">
						<Table.Head>Nama Barang</Table.Head>
						<Table.Head>Tipe</Table.Head>
						<Table.Head>Serial / Brand</Table.Head>
						<Table.Head>Stok</Table.Head>
						<Table.Head>Gudang</Table.Head>
						<Table.Head>Kondisi</Table.Head>
						<Table.Head>Status</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#await data.lazy.inventoryData}
						<!-- Skeleton Loading -->
						{#each Array(10) as _}
							<Table.Row>
								<Table.Cell
									><Skeleton class="h-4 w-32" /><Skeleton class="mt-1 h-3 w-16" /></Table.Cell
								>
								<Table.Cell><Skeleton class="h-5 w-12 rounded-full" /></Table.Cell>
								<Table.Cell
									><Skeleton class="h-4 w-24" /><Skeleton class="mt-1 h-3 w-16" /></Table.Cell
								>
								<Table.Cell><Skeleton class="h-4 w-12" /></Table.Cell>
								<Table.Cell><Skeleton class="h-4 w-20" /></Table.Cell>
								<Table.Cell><Skeleton class="h-5 w-16 rounded-full" /></Table.Cell>
								<Table.Cell><Skeleton class="h-5 w-20 rounded-full" /></Table.Cell>
							</Table.Row>
						{/each}
					{:then { items, pagination }}
						{#each items as item (item.id)}
							<Table.Row class="transition-colors hover:bg-muted/30">
								<Table.Cell>
									<div class="flex flex-col">
										<span class="font-semibold">{item.name}</span>
										<span class="text-xs tracking-tight text-muted-foreground uppercase">
											{item.type === 'ASSET' ? item.equipmentType || 'ALAT' : 'HABIS PAKAI'}
										</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									{#if item.type === 'ASSET'}
										<Badge variant="outline" class="border-blue-200 bg-blue-50 text-blue-700"
											>Aset</Badge
										>
									{:else}
										<Badge variant="outline" class="border-orange-200 bg-orange-50 text-orange-700"
											>BHP</Badge
										>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-col gap-0.5">
										<code class="font-mono text-xs">{item.serialNumber || '-'}</code>
										<span class="text-xs text-muted-foreground">{item.brand || '-'}</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<span class="font-bold">{item.qty}</span>
									<span class="ml-1 text-xs text-muted-foreground">{item.unit}</span>
								</Table.Cell>
								<Table.Cell>
									<span class="text-xs">{item.warehouseName || '-'}</span>
								</Table.Cell>
								<Table.Cell>
									<Badge variant="outline" class={equipmentConditionColor[item.condition]}>
										{item.condition}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<Badge variant="secondary" class={equipmentStatusColor[item.status!]}>
										{equipmentStatusLabel[item.status!] || item.status!.replace('_', ' ')}
									</Badge>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={7} class="h-32 text-center text-muted-foreground">
									Tidak ada inventaris ditemukan untuk satuan ini.
								</Table.Cell>
							</Table.Row>
						{/each}
					{/await}
				</Table.Body>
			</Table.Root>
		</div>

		<!-- Pagination Controls -->
		{#await data.lazy.inventoryData then { pagination }}
			{#if pagination.totalPages > 1}
				<div class="flex items-center justify-between px-2">
					<div class="text-sm text-muted-foreground">
						Menampilkan {(pagination.page - 1) * pagination.limit + 1} sampai
						{Math.min(pagination.page * pagination.limit, pagination.totalItems)} dari
						{pagination.totalItems} inventaris
					</div>
					<div class="flex items-center gap-1">
						<Button
							variant="outline"
							size="sm"
							class="h-8 w-8 p-0"
							disabled={pagination.page <= 1}
							onclick={() => goToPage(pagination.page - 1)}
						>
							<span class="sr-only">Halaman sebelumnya</span>
							<ChevronLeft class="h-4 w-4" />
						</Button>

						{#each getPaginationRange(pagination.page, pagination.totalPages) as p}
							<Button
								variant={p === pagination.page ? 'default' : 'outline'}
								size="sm"
								class="h-8 w-8 p-0"
								onclick={() => goToPage(p)}
							>
								{p}
							</Button>
						{/each}

						<Button
							variant="outline"
							size="sm"
							class="h-8 w-8 p-0"
							disabled={pagination.page >= pagination.totalPages}
							onclick={() => goToPage(pagination.page + 1)}
						>
							<span class="sr-only">Halaman selanjutnya</span>
							<ChevronRight class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/if}
		{/await}
	</div>
</div>
