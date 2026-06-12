<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Package,
		AlertTriangle,
		ArrowLeftRight,
		ClipboardList,
		FileText,
		BarChart2,
		Activity,
		Box,
		ChevronRight,
		PocketKnife
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	// Tipe data dashboard pimpinan — sesuai return value dari getOrSetCache di server
	type DashboardData = {
		org_slug: string;
		activeFilters: { period: string; equipmentType: string };
		summary: {
			activeInventory: number;
			warehouseStock: number;
			damagedItems: number;
			monthlyMovements: number;
		};
		transito: { incoming: number; outgoing: number; pending: number };
		komoditi: { active: number; outgoing: number; damaged: number };
		balkir: {
			total: number;
			used: number;
			ready: number;
			damaged: number;
			incoming: number;
			outgoing: number;
		};
		recentEquipments: {
			id: string;
			name: string;
			brand: string | null;
			serialNumber: string | null;
			type: 'ALKOMLEK' | 'PERNIKA_LEK';
			condition: string;
			status: string;
		}[];
	};

	// activeFilters diterima terpisah agar filter toolbar bisa render sebelum Promise resolved
	let {
		data,
		activeFilters,
		userRole,
		org_slug
	} = $props<{
		data: DashboardData;
		activeFilters: { period: string; equipmentType: string };
		userRole: string;
		org_slug: string;
	}>();

	const summary = $derived(
		data.summary ?? { activeInventory: 0, warehouseStock: 0, damagedItems: 0, monthlyMovements: 0 }
	);
	const transito = $derived(data.transito ?? { incoming: 0, outgoing: 0, pending: 0 });
	const komoditi = $derived(data.komoditi ?? { active: 0, outgoing: 0, damaged: 0 });
	const balkir = $derived(
		data.balkir ?? { total: 0, used: 0, ready: 0, damaged: 0, incoming: 0, outgoing: 0 }
	);
	const recentEquipments = $derived(data.recentEquipments ?? []);

	const periods = [
		{ value: 'this_month', label: 'Bulan Ini' },
		{ value: '3_months', label: '3 Bulan' },
		{ value: '6_months', label: '6 Bulan' },
		{ value: 'this_year', label: 'Tahun Ini' }
	];

	const equipmentTypes = [
		{ value: 'ALL', label: 'Semua Tipe' },
		{ value: 'ALKOMLEK', label: 'Alkomlek' },
		{ value: 'PERNIKA_LEK', label: 'Pernika & Lek' }
	];

	function applyFilter(period: string, type: string) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('period', period);
		params.set('type', type);
		goto(resolve(`/(app)/[org_slug]/dashboard?${params.toString()}`, { org_slug }), {
			invalidateAll: true
		});
	}

	const chartData = $derived([
		{ label: 'Transito', value: transito.incoming, color: 'bg-blue-500' },
		{ label: 'Komunity', value: komoditi.outgoing, color: 'bg-orange-500' },
		{ label: 'Balkir', value: balkir.incoming, color: 'bg-emerald-500' }
	]);

	const maxChartValue = $derived(Math.max(...chartData.map((d) => d.value), 10));
</script>

<!-- Filter Toolbar -->
<div class="flex flex-wrap items-center gap-3">
	<div class="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
		{#each periods as p (p.value)}
			<button
				onclick={() => applyFilter(p.value, activeFilters?.equipmentType ?? 'ALL')}
				class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all {activeFilters?.period ===
				p.value
					? 'bg-primary text-primary-foreground shadow-sm'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				{p.label}
			</button>
		{/each}
	</div>

	<div class="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
		{#each equipmentTypes as t (t.value)}
			<button
				onclick={() => applyFilter(activeFilters?.period ?? 'this_month', t.value)}
				class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all {activeFilters?.equipmentType ===
				t.value
					? 'bg-primary text-primary-foreground shadow-sm'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				{t.label}
			</button>
		{/each}
	</div>
</div>

<!-- Summary Cards -->
<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
	<div
		class="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
	>
		<div class="rounded-xl bg-primary/10 p-3 text-primary"><Box size={24} /></div>
		<div>
			<p class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
				Inventaris Aktif
			</p>
			<p class="text-2xl font-bold text-foreground">{summary.activeInventory.toLocaleString()}</p>
		</div>
	</div>

	<div
		class="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
	>
		<div class="rounded-xl bg-success/10 p-3 text-success"><Package size={24} /></div>
		<div>
			<p class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
				Persediaan Gudang
			</p>
			<p class="text-2xl font-bold text-foreground">{summary.warehouseStock.toLocaleString()}</p>
		</div>
	</div>

	<div
		class="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
	>
		<div class="rounded-xl bg-destructive/10 p-3 text-destructive">
			<AlertTriangle size={24} />
		</div>
		<div>
			<p class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
				Barang Rusak
			</p>
			<p class="text-2xl font-bold text-foreground">{summary.damagedItems.toLocaleString()}</p>
		</div>
	</div>

	<div
		class="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
	>
		<div class="rounded-xl bg-primary/10 p-3 text-primary"><ArrowLeftRight size={24} /></div>
		<div>
			<p class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
				Mutasi Bulan Ini
			</p>
			<p class="text-2xl font-bold text-foreground">{summary.monthlyMovements.toLocaleString()}</p>
		</div>
	</div>
</div>

<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
	<!-- Logistic Groups -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-3 lg:col-span-2">
		<!-- Transito -->
		<div class="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<div class="border-b border-border bg-muted/50 px-5 py-4">
				<h3 class="text-sm font-bold tracking-wide text-foreground uppercase">Gudang Transito</h3>
			</div>
			<div class="flex flex-1 flex-col justify-between space-y-4 p-5">
				<div>
					<div class="mb-4 flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Barang Masuk</span>
						<span class="font-bold text-foreground">{transito.incoming}</span>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Barang Keluar</span>
						<span class="font-bold text-foreground">{transito.outgoing}</span>
					</div>
				</div>
				<div
					class="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold text-primary"
				>
					<span>Pending</span>
					<span>{transito.pending} Item</span>
				</div>
			</div>
		</div>

		<!-- Komoditi -->
		<div class="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<div class="border-b border-border bg-muted/50 px-5 py-4">
				<h3 class="text-sm font-bold tracking-wide text-foreground uppercase">Gudang Komunity</h3>
			</div>
			<div class="flex flex-1 flex-col justify-between space-y-4 p-5">
				<div>
					<div class="mb-4 flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Stok Aktif</span>
						<span class="font-bold text-foreground">{komoditi.active.toLocaleString()}</span>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Barang Keluar</span>
						<span class="font-bold text-foreground">{komoditi.outgoing}</span>
					</div>
				</div>
				<div
					class="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold text-success"
				>
					<span>Barang Rusak</span>
					<span>{komoditi.damaged}</span>
				</div>
			</div>
		</div>

		<!-- Balkir -->
		<div class="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<div class="border-b border-border bg-muted/50 px-5 py-4">
				<h3 class="text-sm font-bold tracking-wide text-foreground uppercase">Gudang Balkir</h3>
			</div>
			<div class="flex flex-1 flex-col justify-between space-y-4 p-5">
				<div>
					<div class="mb-4 flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Masuk</span>
						<span class="font-bold text-foreground">{balkir.incoming}</span>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Barang Dihapus</span>
						<span class="font-bold text-foreground">{balkir.outgoing}</span>
					</div>
				</div>
				<div
					class="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold text-destructive"
				>
					<span>Total di Balkir</span>
					<span>{balkir.incoming - balkir.outgoing} Item</span>
				</div>
			</div>
		</div>

		<!-- Chart -->
		<div class="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-3">
			<div class="mb-8 flex items-center justify-between">
				<h3 class="flex items-center gap-2 font-bold text-foreground">
					<BarChart2 size={18} class="text-muted-foreground" /> Pergerakan Barang
				</h3>
				<div class="text-xs font-medium text-muted-foreground">
					{#if activeFilters?.period === 'this_month'}
						{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
					{:else if activeFilters?.period === '3_months'}
						3 Bulan Terakhir
					{:else if activeFilters?.period === '6_months'}
						6 Bulan Terakhir
					{:else}
						Tahun {new Date().getFullYear()}
					{/if}
				</div>
			</div>

			<div class="flex h-48 items-end gap-8 border-b border-border px-4 pb-2">
				{#each chartData as bar (bar.label)}
					<div class="group relative flex h-full flex-1 flex-col items-center justify-end">
						<div
							class="absolute -top-8 z-10 rounded border border-border bg-card px-2 py-1 text-xs font-bold whitespace-nowrap text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
						>
							{bar.value}
						</div>
						<div
							class="{bar.color} w-full rounded-t-lg shadow-sm transition-all hover:brightness-110"
							style="height: {(bar.value / (maxChartValue || 1)) * 100}%"
						></div>
						<span
							class="absolute -bottom-6 text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
						>
							{bar.label}
						</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Right Column -->
	<div class="space-y-8">
		<!-- Status Kesiapan -->
		<div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
			<div class="mb-6 flex items-center justify-between">
				<h3
					class="flex items-center gap-2 text-sm font-bold tracking-wide text-foreground uppercase"
				>
					<Activity size={18} class="text-success" /> Status Kesiapan
				</h3>
			</div>

			<div class="space-y-6">
				<div>
					<div class="mb-2 flex justify-between text-xs font-bold text-muted-foreground uppercase">
						<span>Kesiapan Material</span>
						<span>{Math.round((balkir.ready / (balkir.total || 1)) * 100)}%</span>
					</div>
					<div class="h-2 overflow-hidden rounded-full bg-muted">
						<div
							class="h-full rounded-full bg-success"
							style="width: {Math.round((balkir.ready / (balkir.total || 1)) * 100)}%"
						></div>
					</div>
				</div>

				<div>
					<div class="mb-2 flex justify-between text-xs font-bold text-muted-foreground uppercase">
						<span>Tingkat Kerusakan</span>
						<span
							>{Math.round((summary.damagedItems / (summary.activeInventory || 1)) * 100)}%</span
						>
					</div>
					<div class="h-2 overflow-hidden rounded-full bg-muted">
						<div
							class="h-full rounded-full bg-destructive"
							style="width: {Math.round(
								(summary.damagedItems / (summary.activeInventory || 1)) * 100
							)}%"
						></div>
					</div>
				</div>
			</div>
		</div>

		<!-- Peralatan Terbaru -->
		<div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
			<h3 class="mb-6 text-sm font-bold tracking-wide text-foreground uppercase">
				Peralatan Terbaru
			</h3>
			<div class="space-y-4">
				{#each recentEquipments as eq (eq.id)}
					<a
						href={resolve('/(app)/[org_slug]/alat/[type]/[id]', {
							org_slug,
							type: eq.type as string,
							id: eq.id
						})}
						class="group flex cursor-pointer items-center gap-4"
					>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<p class="truncate text-sm font-bold text-foreground">{eq.name}</p>
							</div>
							<p class="font-mono text-[10px] text-muted-foreground">
								{eq.serialNumber || 'No SN'}
							</p>
						</div>
						<div
							class="rounded px-2 py-1 text-[10px] font-bold {eq.condition === 'BAIK'
								? 'bg-success/10 text-success'
								: 'bg-destructive/10 text-destructive'}"
						>
							{eq.condition === 'BAIK'
								? 'Baik'
								: eq.condition === 'RUSAK_RINGAN'
									? 'Rusak Ringan'
									: 'Rusak Berat'}
						</div>
					</a>
				{:else}
					<p class="text-center text-sm text-muted-foreground">Belum ada peralatan baru</p>
				{/each}
			</div>

			<a
				href={resolve('/(app)/[org_slug]/stok/komunity', { org_slug })}
				class="group mt-6 flex w-full items-center justify-center gap-1 py-2 text-xs font-bold text-primary hover:text-primary/80"
			>
				Lihat Semua Inventaris
				<ChevronRight size={14} class="transition-transform group-hover:translate-x-1" />
			</a>
		</div>
	</div>
</div>

<!-- Quick Actions -->
<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
	<a
		href={resolve('/(app)/[org_slug]/alat/[type]', { org_slug, type: 'alkomlek' })}
		class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:bg-primary/5"
	>
		<ClipboardList size={22} class="text-muted-foreground group-hover:text-primary" />
		<span
			class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase group-hover:text-foreground"
			>Inventaris</span
		>
	</a>

	<a
		href={resolve('/(app)/[org_slug]/stok/transito', { org_slug })}
		class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:bg-primary/5"
	>
		<ArrowLeftRight size={22} class="text-muted-foreground group-hover:text-primary" />
		<span
			class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase group-hover:text-foreground"
			>Mutasi</span
		>
	</a>

	<a
		href={resolve('/(app)/[org_slug]/alat/[type]', { org_slug, type: 'ALKOMLEK' })}
		class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:bg-primary/5"
	>
		<PocketKnife size={22} class="text-muted-foreground group-hover:text-primary" />
		<span
			class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase group-hover:text-foreground"
			>Alat</span
		>
	</a>

	<a
		href={resolve('/(app)/[org_slug]/barang', { org_slug })}
		class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:bg-primary/5"
	>
		<Package size={22} class="text-muted-foreground group-hover:text-primary" />
		<span
			class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase group-hover:text-foreground"
			>Barang</span
		>
	</a>

	<a
		href={resolve('/(app)/[org_slug]/laporan/btk-16', { org_slug })}
		class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:bg-primary/5"
	>
		<FileText size={22} class="text-muted-foreground group-hover:text-primary" />
		<span
			class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase group-hover:text-foreground"
			>Laporan</span
		>
	</a>

	{#if userRole === 'superadmin'}
		<a
			href={resolve('/(app)/[org_slug]/audit-log', { org_slug })}
			class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:bg-primary/5"
		>
			<BarChart2 size={22} class="text-muted-foreground group-hover:text-primary" />
			<span
				class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase group-hover:text-foreground"
				>Monitoring</span
			>
		</a>
	{/if}
</div>
