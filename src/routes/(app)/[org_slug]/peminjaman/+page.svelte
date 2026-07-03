<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		Search,
		Plus,
		Eye,
		Clock,
		CheckCircle2,
		XCircle,
		Package,
		RotateCcw,
		AlertCircle,
		Edit,
		Truck
	} from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { lendingPurposeLabel, lendingStatusLabel } from '@/enums/lending-enum';

	let { data }: { data: PageData } = $props();

	const statusOptions = [
		{ value: 'ALL', label: 'Semua Status' },
		{ value: 'DRAFT', label: 'Menunggu' },
		{ value: 'APPROVED', label: 'Disetujui' },
		{ value: 'REJECTED', label: 'Ditolak' },
		{ value: 'PERINTAH_LANGSUNG', label: 'Perintah' },
		{ value: 'DIPINJAM', label: 'Dipinjam' },
		{ value: 'KEMBALI', label: 'Kembali' }
	];

	let activeTab = $state(page.url.searchParams.get('tab') || 'pengajuan');

	function handleTabChange(val: string) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('tab', val);
		goto(
			resolve(`/(app)/[org_slug]/peminjaman?${params.toString()}`, { org_slug: data.org_slug }),
			{
				noScroll: true,
				replaceState: true
			}
		);
	}

	$effect(() => {
		const tabParam = page.url.searchParams.get('tab') || 'pengajuan';
		if (activeTab !== tabParam) {
			activeTab = tabParam;
		}
	});

	function handleStatusChange(val: string | undefined) {
		if (!val) return;

		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('status', val);

		goto(
			resolve(`/(app)/[org_slug]/peminjaman?${params.toString()}`, { org_slug: data.org_slug }),
			{ noScroll: true, replaceState: true }
		);
	}

	const statusConfig = {
		DRAFT: {
			label: 'Menunggu',
			color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
			icon: Clock
		},
		APPROVED: {
			label: 'Disetujui',
			color: 'bg-blue-100 text-blue-700 border-blue-200',
			icon: CheckCircle2
		},
		REJECTED: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
		PERINTAH_LANGSUNG: {
			label: 'Perintah',
			color: 'bg-orange-100 text-orange-700 border-orange-200',
			icon: AlertCircle
		},
		DIPINJAM: {
			label: 'Dipinjam',
			color: 'bg-purple-100 text-purple-700 border-purple-200',
			icon: Package
		},
		DALAM_PENGIRIMAN: {
			label: 'Dikirim',
			color: 'bg-purple-100 text-purple-700 border-purple-200',
			icon: Truck
		},
		DIKIRIM_KEMBALI: {
			label: 'Dikirim Kembali',
			color: 'bg-purple-100 text-purple-700 border-purple-200',
			icon: Truck
		},
		KEMBALI: {
			label: 'Kembali',
			color: 'bg-green-100 text-green-700 border-green-200',
			icon: RotateCcw
		}
	};

	function formatDate(date: Date) {
		return new Date(date).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function isOverdue(endDate: Date | null) {
		return !!endDate && new Date(endDate) < new Date();
	}
</script>

<div class="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
	<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center md:gap-0">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">
				{data.isInduk ? 'Daftar Pengajuan Masuk' : 'Tracking Peminjaman'}
			</h1>
			<p class="text-muted-foreground">
				{data.isInduk
					? 'Kelola pengajuan peminjaman dari satuan jajaran.'
					: 'Pantau status pengajuan.'}
			</p>
		</div>
		{#if !data.isInduk}
			<Button href="/{page.params.org_slug}/peminjaman/create">
				<Plus />
				Buat Pengajuan
			</Button>
		{/if}
	</div>

	<Tabs.Root bind:value={activeTab} onValueChange={handleTabChange} class="space-y-6">
		<div
			class="w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
		>
			<Tabs.List
				variant="line"
				class="flex h-auto min-w-max justify-start rounded-none border-b bg-transparent px-0"
			>
				<Tabs.Trigger
					value="pengajuan"
					class="rounded-none border-b-2 border-transparent bg-transparent px-6 py-3 data-active:border-primary data-active:bg-transparent"
				>
					Daftar Pengajuan
				</Tabs.Trigger>
				<Tabs.Trigger
					value="dipinjam"
					class="rounded-none border-b-2 border-transparent bg-transparent px-6 py-3 data-active:border-primary data-active:bg-transparent"
				>
					Alat Dipinjam
				</Tabs.Trigger>
			</Tabs.List>
		</div>

		<Tabs.Content value="pengajuan" class="space-y-4">
			<div class="flex flex-col items-center gap-4 md:flex-row">
				<div class="relative w-full flex-1">
					<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<form method="GET" class="w-full">
						<Input
							name="q"
							placeholder="Cari berdasarkan unit peminjam..."
							class="pl-10"
							value={data.filters.q}
						/>
					</form>
				</div>
				<div class="flex w-full items-center gap-2 md:w-fit">
					<Select.Root
						type="single"
						value={data.filters.status || 'ALL'}
						onValueChange={handleStatusChange}
					>
						<Select.Trigger class="w-full">
							{statusOptions.find((o) => o.value === (data.filters.status || 'ALL'))?.label ||
								'Semua Status'}
						</Select.Trigger>
						<Select.Content>
							{#each statusOptions as opt (opt.value)}
								<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			{#await data.lendingListPromise}
				<!-- Skeleton -->
				<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
					<div class="space-y-2 p-4">
						<div class="h-10 w-full animate-pulse rounded bg-muted/60"></div>
						{#each Array(6) as _}
							<div class="flex animate-pulse gap-3">
								<div class="h-12 w-1/4 rounded bg-muted"></div>
								<div class="h-12 w-1/5 rounded bg-muted"></div>
								<div class="h-12 w-1/5 rounded bg-muted"></div>
								<div class="h-12 w-1/6 rounded bg-muted"></div>
								<div class="ml-auto h-12 w-1/6 rounded bg-muted"></div>
							</div>
						{/each}
					</div>
				</div>
			{:then lendingList}
				<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
					<Table.Root>
						<Table.Header>
							<Table.Row class="bg-muted/50">
								<Table.Head>Unit Peminjam</Table.Head>
								<Table.Head>Tujuan</Table.Head>
								<Table.Head>Tanggal</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head class="text-right">Aksi</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each lendingList as item (item.id)}
								{@const config = statusConfig[item.status as keyof typeof statusConfig]}
								<Table.Row class="transition-colors hover:bg-muted/30">
									<Table.Cell>
										<div class="flex flex-col">
											<span class="font-bold">{item.unit}</span>
											<span class="text-xs text-muted-foreground"
												>Oleh: {item.requestedByUser?.name}</span
											>
										</div>
									</Table.Cell>
									<Table.Cell>
										<Badge variant="outline">{lendingPurposeLabel[item.purpose]}</Badge>
									</Table.Cell>
									<Table.Cell>
										<div class="flex flex-col text-sm">
											<span>{formatDate(item.startDate)}</span>
											{#if item.endDate}
												<span class="text-muted-foreground"
													>s/d {formatDate(item.endDate as Date)}</span
												>
											{/if}
										</div>
									</Table.Cell>
									<Table.Cell>
										<Badge variant="outline" class={config.color}>
											<config.icon class="size-3" />
											{lendingStatusLabel[item.status!]}
										</Badge>
									</Table.Cell>
									<Table.Cell class="text-right">
										{#if item.status === 'DRAFT' && item.requestedBy === data.user.id}
											<Button
												variant="ghost"
												size="icon"
												href={resolve('/(app)/[org_slug]/peminjaman/[id]/edit', {
													org_slug: data.org_slug,
													id: item.id
												})}
												title="Edit Pengajuan"
											>
												<Edit class="size-4" />
											</Button>
										{/if}
										<Button
											variant="ghost"
											size="icon"
											href={resolve('/(app)/[org_slug]/peminjaman/[id]', {
												org_slug: data.org_slug,
												id: item.id
											})}
											title="Detail Pengajuan"
										>
											<Eye class="size-4" />
										</Button>
									</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={6} class="h-32 text-center text-muted-foreground">
										Tidak ada data peminjaman yang ditemukan.
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:catch err}
				<div
					class="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive"
				>
					Gagal memuat data peminjaman: {err.message}
				</div>
			{/await}
		</Tabs.Content>

		<Tabs.Content value="dipinjam">
			{#await data.dipinjamListPromise}
				<!-- Skeleton -->
				<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
					<div class="space-y-2 p-4">
						<div class="h-10 w-full animate-pulse rounded bg-muted/60"></div>
						{#each Array(6) as _}
							<div class="flex animate-pulse gap-3">
								<div class="h-12 w-1/4 rounded bg-muted"></div>
								<div class="h-12 w-1/5 rounded bg-muted"></div>
								<div class="h-12 w-1/5 rounded bg-muted"></div>
								<div class="h-12 w-1/6 rounded bg-muted"></div>
								<div class="ml-auto h-12 w-1/6 rounded bg-muted"></div>
							</div>
						{/each}
					</div>
				</div>
			{:then dipinjamList}
				<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
					<Table.Root>
						<Table.Header>
							<Table.Row class="bg-muted/50">
								<Table.Head>Alat</Table.Head>
								<Table.Head>Unit Peminjam</Table.Head>
								<Table.Head>Tanggal Dipinjam</Table.Head>
								<Table.Head>Tanggal Harus Kembali</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head class="text-right">Aksi</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{@const flatEquipments = dipinjamList.flatMap((lending) =>
								(lending.items || []).map((li) => ({
									lendingId: lending.id,
									unit: lending.unit,
									borrower: lending.requestedByUser?.name ?? '-',
									startDate: lending.startDate,
									endDate: lending.endDate,
									name: li.equipment?.item?.name ?? 'Alat tidak dikenal',
									serialNumber: li.equipment?.serialNumber ?? '-'
								}))
							)}
							{#each flatEquipments as eqp, index (eqp.lendingId + '-' + index)}
								<Table.Row class="transition-colors hover:bg-muted/30">
									<Table.Cell>
										<div class="flex flex-col">
											<span class="font-bold">{eqp.name}</span>
											<span class="text-opacity-80 text-xs text-muted-foreground">
												S/N: {eqp.serialNumber}
											</span>
										</div>
									</Table.Cell>
									<Table.Cell>
										<div class="flex flex-col">
											<span class="font-medium">{eqp.unit}</span>
										</div>
									</Table.Cell>
									<Table.Cell>{formatDate(eqp.startDate)}</Table.Cell>
									<Table.Cell>
										{eqp.endDate ? formatDate(eqp.endDate as Date) : '-'}
									</Table.Cell>
									<Table.Cell>
										{#if isOverdue(eqp.endDate as Date)}
											<Badge variant="outline" class="border-red-200 bg-red-100 text-red-700">
												<AlertCircle class="mr-1 size-3" /> Terlambat
											</Badge>
										{:else}
											<Badge variant="outline" class={statusConfig.DIPINJAM.color}>
												<Package class="mr-1 size-3" /> Dipinjam
											</Badge>
										{/if}
									</Table.Cell>
									<Table.Cell class="text-right">
										<Button
											variant="ghost"
											size="icon"
											href={resolve('/(app)/[org_slug]/peminjaman/[id]', {
												org_slug: data.org_slug,
												id: eqp.lendingId
											})}
											title="Detail Pengajuan"
										>
											<Eye class="size-4" />
										</Button>
									</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={6} class="h-32 text-center text-muted-foreground">
										Tidak ada alat yang sedang dipinjam.
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:catch err}
				<div
					class="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive"
				>
					Gagal memuat data alat dipinjam: {err.message}
				</div>
			{/await}
		</Tabs.Content>
	</Tabs.Root>
</div>
