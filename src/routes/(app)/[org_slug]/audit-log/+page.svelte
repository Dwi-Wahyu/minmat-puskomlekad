<script lang="ts">
	import type { PageData } from './$types';
	import {
		History,
		User,
		Table as TableIcon,
		Activity,
		Search,
		Calendar,
		X,
		ChevronLeft,
		ChevronRight,
		Eye
	} from '@lucide/svelte';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import Input from '@/components/ui/input/input.svelte';
	import Button from '@/components/ui/button/button.svelte';
	import { Label } from '@/components/ui/label';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { auditActionLabel, auditTableLabel } from '$lib/enums/audit-log-enum';

	let { data }: { data: any } = $props();

	let selectedLog = $state<any>(null);
	let isModalOpen = $state(false);
	let isFilterModalOpen = $state(false);

	// Filter states
	let searchQuery = $state('');
	let startDate = $state('');
	let endDate = $state('');

	$effect(() => {
		searchQuery = data.filters.search || '';
		startDate = data.filters.startDate || '';
		endDate = data.filters.endDate || '';
	});

	function formatDate(date: Date) {
		return new Intl.DateTimeFormat('id-ID', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(date));
	}

	function getActionColor(action: string) {
		const a = (action || '').toLowerCase();
		if (a.includes('create') || a.includes('insert') || a.includes('buat') || a.includes('terima'))
			return 'bg-emerald-50 text-emerald-700 border-emerald-100';
		if (
			a.includes('update') ||
			a.includes('edit') ||
			a.includes('perbarui') ||
			a.includes('pindahkan') ||
			a.includes('setujui') ||
			a.includes('validasi') ||
			a.includes('kirim')
		)
			return 'bg-blue-50 text-blue-700 border-blue-100';
		if (
			a.includes('delete') ||
			a.includes('hapus') ||
			a.includes('tolak') ||
			a.includes('keluarkan')
		)
			return 'bg-red-50 text-red-700 border-red-100';
		return 'bg-slate-50 text-slate-700 border-slate-100';
	}

	function showDetail(log: any) {
		selectedLog = log;
		isModalOpen = true;
	}

	function formatJson(json: string | null) {
		if (!json || json === 'null') return '-';
		try {
			if (typeof json === 'object') return JSON.stringify(json, null, 2);
			const obj = JSON.parse(json);
			return JSON.stringify(obj, null, 2);
		} catch (e) {
			return json;
		}
	}

	function applyFilters() {
		const url = new URL(page.url);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');

		if (startDate) url.searchParams.set('start_date', startDate);
		else url.searchParams.delete('start_date');

		if (endDate) url.searchParams.set('end_date', endDate);
		else url.searchParams.delete('end_date');

		url.searchParams.set('page', '1'); // reset page to 1 on filter
		goto(url.toString(), { keepFocus: true, noScroll: true });
		isFilterModalOpen = false;
	}

	function resetFilters() {
		searchQuery = '';
		startDate = '';
		endDate = '';
		applyFilters();
	}

	let searchTimeout: any;
	function handleSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			applyFilters();
		}, 500);
	}

	// Pagination numbers generator (max 4 buttons)
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
		const url = new URL(page.url);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}
</script>

<div class="space-y-6 p-6">
	<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold">Audit Log Sistem</h1>
			<p class="mt-1 text-slate-500">Memantau seluruh aktivitas perubahan data dalam sistem</p>
		</div>

		<div class="flex gap-3">
			<div class="relative">
				<Search class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={16} />
				<Input
					type="text"
					placeholder="Cari aksi, tabel..."
					class="pl-10"
					bind:value={searchQuery}
					oninput={handleSearchInput}
				/>
			</div>
			<Button variant="outline" onclick={() => (isFilterModalOpen = true)} class="gap-2">
				<Calendar size={16} />
				{startDate || endDate ? 'Filter Aktif' : 'Filter Tanggal'}
				{#if startDate || endDate}
					<Badge variant="secondary" class="ml-1 h-5 px-1 text-[10px]">1</Badge>
				{/if}
			</Button>
			{#if searchQuery || startDate || endDate}
				<Button variant="ghost" onclick={resetFilters} class="px-2 text-slate-500">
					<X size={16} />
				</Button>
			{/if}
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl border shadow-sm">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Waktu</Table.Head>
					<Table.Head>Pengguna</Table.Head>
					<Table.Head>Aksi</Table.Head>
					<Table.Head>Tabel</Table.Head>
					<Table.Head class="text-right">Detail</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#await data.lazy.logsData}
					<!-- Skeleton Loading -->
					{#each Array(10) as _}
						<Table.Row>
							<Table.Cell
								><Skeleton class="h-4 w-32" /><Skeleton class="mt-1 h-3 w-16" /></Table.Cell
							>
							<Table.Cell>
								<div class="flex items-center gap-2">
									<Skeleton class="h-8 w-8 rounded-full" />
									<div class="flex flex-col gap-1">
										<Skeleton class="h-4 w-24" />
										<Skeleton class="h-3 w-20" />
									</div>
								</div>
							</Table.Cell>
							<Table.Cell><Skeleton class="h-5 w-20 rounded-full" /></Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-2">
									<Skeleton class="h-4 w-4 rounded" />
									<Skeleton class="h-4 w-24" />
								</div>
							</Table.Cell>
							<Table.Cell class="text-right"
								><Skeleton class="ml-auto h-8 w-8 rounded-lg" /></Table.Cell
							>
						</Table.Row>
					{/each}
				{:then { logs, pagination }}
					{#each logs as log (log.id)}
						<Table.Row>
							<Table.Cell class="font-medium">
								<div class="flex flex-col">
									<span class="">{formatDate(log.createdAt)}</span>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-2">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
									>
										<User size={14} />
									</div>
									<div class="flex flex-col">
										<span class="text-sm font-semibold">{log.userName || 'System'}</span>
										<span class="font-mono text-[10px] text-slate-400"
											>{log.userUsername || ''}</span
										>
									</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Badge variant="outline">
									{auditActionLabel[log.action || ''] || log.action}
								</Badge>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-2 text-muted-foreground">
									<TableIcon size={14} />
									<span class="font-mono text-xs"
										>{auditTableLabel[log.tableName || ''] || log.tableName}</span
									>
								</div>
							</Table.Cell>
							<Table.Cell class="text-right">
								<button
									onclick={() => showDetail(log)}
									class="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900"
								>
									<Eye size={16} title="Lihat Perubahan" />
								</button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={5} class="h-64 text-center">
								<div class="flex flex-col items-center justify-center text-slate-400 gap-2">
									<History size={48} strokeWidth={1} />
									<p>Belum ada log aktivitas yang tercatat</p>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				{/await}
			</Table.Body>
		</Table.Root>

		<div class="flex items-center justify-between border-t p-4">
			{#await data.lazy.logsData}
				<Skeleton class="h-4 w-40" />
				<div class="flex gap-2">
					<Skeleton class="h-8 w-8" />
					<Skeleton class="h-8 w-8" />
				</div>
			{:then { logs, pagination }}
				<span class="text-xs font-medium text-slate-400 italic">
					{#if logs.length > 0}
						Menampilkan {(pagination.page - 1) * pagination.limit + 1} sampai
						{Math.min(pagination.page * pagination.limit, pagination.totalItems)} dari
						{pagination.totalItems} aktivitas
					{:else}
						Tidak ada data yang ditemukan
					{/if}
				</span>
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
			{/await}
		</div>
	</div>
</div>

<!-- Modal Filter Tanggal -->
<Dialog.Root bind:open={isFilterModalOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Filter Berdasarkan Tanggal</Dialog.Title>
			<Dialog.Description>
				Pilih rentang tanggal untuk mempersempit hasil audit log.
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="start-date">Tanggal Mulai</Label>
					<Input type="date" id="start-date" bind:value={startDate} />
				</div>
				<div class="space-y-2">
					<Label for="end-date">Tanggal Akhir</Label>
					<Input type="date" id="end-date" bind:value={endDate} />
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (isFilterModalOpen = false)}>Batal</Button>
			<Button onclick={applyFilters}>Terapkan Filter</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={isModalOpen}>
	<Dialog.Content class="sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>Detail Perubahan Data</Dialog.Title>
			<Dialog.Description>
				Berikut adalah detail data sebelum dan sesudah perubahan.
			</Dialog.Description>
		</Dialog.Header>

		{#if selectedLog}
			<div class="custom-scrollbar max-h-[60vh] space-y-6 overflow-y-auto pr-2">
				<div class="space-y-3">
					<Label>ID Record</Label>

					<div class="rounded-sm border border-card bg-card p-2 font-mono text-xs">
						{selectedLog.recordId}
					</div>
				</div>

				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<Label>Nilai Lama</Label>
					</div>

					<pre class="overflow-x-auto rounded-md border border-card bg-muted/30 p-3 font-mono text-[10px]">
						{formatJson(selectedLog.oldValue)}
					</pre>
				</div>

				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<Label>Nilai Baru</Label>
					</div>

					<pre class="overflow-x-auto rounded-md border border-card bg-muted/30 p-3 font-mono text-[10px]">
						{formatJson(selectedLog.newValue)}
					</pre>
				</div>
			</div>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (isModalOpen = false)}>Tutup</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #e2e8f0;
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: #cbd5e1;
	}
</style>
