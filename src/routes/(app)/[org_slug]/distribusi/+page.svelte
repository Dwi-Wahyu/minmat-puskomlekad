<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { Plus, Eye, Package, Clock, CheckCircle2, Truck, Archive } from '@lucide/svelte';
	import { page } from '$app/state';
	import { distributionStatusLabel } from '@/enums/distribution-enum';

	let { data }: { data: PageData } = $props();

	const isParent = $derived(data.user?.organization?.parentId === null);

	function getStatusVariant(status: string) {
		switch (status) {
			case 'DRAFT':
				return 'secondary';
			case 'APPROVED':
				return 'outline';
			case 'SHIPPED':
				return 'default';
			case 'RECEIVED':
				return 'secondary';
			default:
				return 'outline';
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'DRAFT':
				return Clock;
			case 'APPROVED':
				return CheckCircle2;
			case 'SHIPPED':
				return Truck;
			case 'RECEIVED':
				return Archive;
			default:
				return Clock;
		}
	}
</script>

<div class="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Distribusi Material</h1>
			<p class="text-muted-foreground">
				Kelola pengiriman alat dan bahan habis pakai antar kesatuan.
			</p>
		</div>
		{#if isParent}
			<Button href="/{page.params.org_slug}/distribusi/create">
				<Plus class="mr-2 size-4" />
				Permintaan Baru
			</Button>
		{/if}
	</div>

	{#await data.distributionsPromise}
		<!-- Skeleton -->
		<div class="rounded-xl border bg-card shadow-sm">
			<div class="space-y-2 p-4">
				<div class="h-10 w-full animate-pulse rounded bg-muted/60"></div>
				{#each Array(5) as _}
					<div class="flex animate-pulse gap-3">
						<div class="h-12 w-1/4 rounded bg-muted"></div>
						<div class="h-12 w-1/4 rounded bg-muted"></div>
						<div class="h-12 w-1/4 rounded bg-muted"></div>
						<div class="h-12 w-1/6 rounded bg-muted"></div>
						<div class="ml-auto h-12 w-1/6 rounded bg-muted"></div>
					</div>
				{/each}
			</div>
		</div>
	{:then distributions}
		<div class="rounded-xl border bg-card shadow-sm">
			<Table.Root>
				<Table.Header class="bg-muted/50">
					<Table.Row>
						<Table.Head>ID / Tanggal</Table.Head>
						{#if isParent}
							<Table.Head>Dari</Table.Head>
							<Table.Head>Ke</Table.Head>
						{/if}
						<Table.Head>Item</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each distributions as dist (dist.id)}
						<Table.Row>
							<Table.Cell>
								<div class="flex flex-col">
									<span class="font-mono text-xs text-muted-foreground">{dist.id.slice(0, 8)}</span>
									<span class="text-sm">{new Date(dist.createdAt).toLocaleDateString('id-ID')}</span
									>
								</div>
							</Table.Cell>
							{#if isParent}
								<Table.Cell>
									<div class="flex items-center gap-2">
										<span class="max-w-30 truncate text-xs font-medium"
											>{dist.fromOrganization?.name}</span
										>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<span class="max-w-30 truncate text-xs font-medium"
											>{dist.toOrganization?.name}</span
										>
									</div>
								</Table.Cell>
							{/if}
							<Table.Cell>
								<div class="flex items-center gap-1 text-muted-foreground">
									<Package class="size-3" />
									<span class="text-xs"
										>{dist.equipmentItems.length + dist.consumableItems.length} item</span
									>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Badge variant={getStatusVariant(dist.status!)} class="gap-1 px-2 text-[10px]">
									{@const Icon = getStatusIcon(dist.status!)}
									<Icon class="size-3" />
									{distributionStatusLabel[dist.status!]}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-right">
								<Button
									variant="ghost"
									size="icon"
									href="/{page.params.org_slug}/distribusi/{dist.id}"
								>
									<Eye class="size-4" />
								</Button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={isParent ? 6 : 4} class="h-24 text-center text-muted-foreground">
								Belum ada data distribusi.
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
			Gagal memuat data distribusi: {err.message}
		</div>
	{/await}
</div>
