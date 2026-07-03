<script lang="ts">
	import { resolve } from '$app/paths';
	import { ClipboardCheck, Truck, PackageCheck, Send, ArrowRight } from '@lucide/svelte';
	import { page } from '$app/state';

	type OperatorDashboard = {
		pendingTransferIn: {
			movementId: string;
			equipmentId: string;
			equipmentType: string | null;
			itemName: string;
			serialNumber: string | null;
			fromWarehouseName: string;
			picName: string;
			createdAt: Date;
		}[];
		transitCount: number;
		myMovementsThisMonth: number;
		damagedCount: number;
		pendingLendingActions: {
			lendingId: string;
			unit: string;
			status: string;
			actionLabel: string;
			createdAt: Date;
		}[];
	};

	let { org_slug, operatorDashboard }: { org_slug: string; operatorDashboard: OperatorDashboard } =
		$props();

	const isSubordinate = $derived(page.data.user?.organization?.parentId !== null);
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">Dashboard Operator</h1>
		<p class="text-sm text-muted-foreground">Mutasi yang perlu ditindaklanjuti</p>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-2 gap-4 {isSubordinate ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}">
		{#if !isSubordinate}
			<a
				href={resolve('/(app)/[org_slug]/alat/[type]', { org_slug, type: 'ALKOMLEK' })}
				class="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
			>
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Perlu Dikonfirmasi
				</p>
				<p class="mt-2 text-3xl font-bold text-primary">{operatorDashboard.transitCount}</p>
				<p class="mt-1 text-sm text-muted-foreground">Alat sedang transit</p>
			</a>
		{/if}

		<div class="rounded-xl border border-border bg-card p-5">
			<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Transfer Menunggu
			</p>
			<p class="mt-2 text-3xl font-bold text-orange-500">
				{operatorDashboard.pendingTransferIn.length}
			</p>
			<p class="mt-1 text-sm text-muted-foreground">Dibuat orang lain, belum dikonfirmasi</p>
		</div>

		<div class="rounded-xl border border-border bg-card p-5">
			<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Mutasi Bulan Ini
			</p>
			<p class="mt-2 text-3xl font-bold">{operatorDashboard.myMovementsThisMonth}</p>
			<p class="mt-1 text-sm text-muted-foreground">Dicatat oleh organisasi ini</p>
		</div>

		<a
			href={resolve('/(app)/[org_slug]/alat/[type]', { org_slug, type: 'ALKOMLEK' })}
			class="rounded-xl border border-border bg-card p-5 transition-colors hover:border-destructive/50"
		>
			<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Perlu Perhatian
			</p>
			<p class="mt-2 text-3xl font-bold text-destructive">{operatorDashboard.damagedCount}</p>
			<p class="mt-1 text-sm text-muted-foreground">Alat kondisi rusak</p>
		</a>
	</div>

	{#if operatorDashboard.pendingTransferIn.length > 0}
		<div class="overflow-hidden rounded-xl border border-border bg-card">
			<div class="border-b border-border px-5 py-4">
				<h2 class="font-semibold">Menunggu Konfirmasi Penerimaan</h2>
				<p class="mt-0.5 text-xs text-muted-foreground">
					Mutasi ini dibuat oleh operator lain dan memerlukan konfirmasi Transfer Masuk dari Anda
				</p>
			</div>
			<div class="divide-y divide-border">
				{#each operatorDashboard.pendingTransferIn as item (item.movementId)}
					<a
						href={resolve('/(app)/[org_slug]/alat/[type]/[id]', {
							org_slug,
							type: item.equipmentType?.toLowerCase() ?? 'alkomlek',
							id: item.equipmentId
						})}
						class="flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/40"
					>
						<div>
							<p class="text-sm font-medium">{item.itemName}</p>
							<p class="text-xs text-muted-foreground">
								SN: {item.serialNumber ?? '-'} · Dari: {item.fromWarehouseName} · Oleh: {item.picName}
							</p>
						</div>
						<div class="flex items-center gap-2">
							<span
								class="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
							>
								TRANSIT
							</span>
							<span class="text-muted-foreground">→</span>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	{#if operatorDashboard.pendingLendingActions?.length > 0}
		<div class="overflow-hidden rounded-xl border border-border bg-card">
			<div class="flex items-center gap-2 border-b border-border px-5 py-4">
				<ClipboardCheck class="h-4 w-4 text-amber-500" />
				<h2 class="font-semibold">Aksi Peminjaman Diperlukan</h2>
				<span
					class="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
				>
					{operatorDashboard.pendingLendingActions.length}
				</span>
			</div>
			<div class="divide-y divide-border">
				{#each operatorDashboard.pendingLendingActions as action (action.lendingId)}
					<a
						href={resolve('/(app)/[org_slug]/peminjaman/[id]', { org_slug, id: action.lendingId })}
						class="flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/40"
					>
						<div class="flex items-center gap-3">
							<div class="rounded-full bg-muted p-2 text-muted-foreground">
								{#if action.status === 'APPROVED' || action.status === 'PERINTAH_LANGSUNG'}
									<Truck class="h-4 w-4" />
								{:else if action.status === 'DALAM_PENGIRIMAN'}
									<PackageCheck class="h-4 w-4" />
								{:else if action.status === 'DIPINJAM'}
									<Send class="h-4 w-4" />
								{:else if action.status === 'DIKIRIM_KEMBALI'}
									<ClipboardCheck class="h-4 w-4 text-amber-500" />
								{/if}
							</div>
							<div>
								<p class="text-sm font-medium">{action.unit}</p>
								<p class="text-xs text-muted-foreground">{action.actionLabel}</p>
							</div>
						</div>
						<ArrowRight class="h-4 w-4 text-muted-foreground" />
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>
