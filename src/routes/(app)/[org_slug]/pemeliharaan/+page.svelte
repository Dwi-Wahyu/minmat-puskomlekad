<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { invalidateAll, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enhance, applyAction } from '$app/forms';
	import { parseDate, type DateValue } from '@internationalized/date';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { toast } from '$lib/components/ui/toast';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { RangeCalendar } from '$lib/components/ui/range-calendar';
	import {
		Wrench,
		Plus,
		Search,
		CalendarIcon,
		X,
		Trash2,
		Edit,
		Clock,
		CheckCircle2,
		AlertCircle,
		Filter
	} from '@lucide/svelte';
	import { maintenanceStatusLabel, maintenanceTypeLabel } from '@/enums/maintenance-enum';

	let { data }: { data: PageData } = $props();

	// State untuk filter
	let selectedEquipmentIds = $state<string[]>([]);
	let dateRange = $state<{ start: DateValue | undefined; end: DateValue | undefined }>({
		start: undefined,
		end: undefined
	});

	$effect(() => {
		untrack(() => {
			selectedEquipmentIds = data.filters.equipmentIds;
			if (data.filters.start) dateRange.start = parseDate(data.filters.start);
			if (data.filters.end) dateRange.end = parseDate(data.filters.end);
		});
	});

	$effect(() => {
		const url = new URL(window.location.href);
		let hasChanges = false;

		const currentEqIds = url.searchParams.get('equipmentIds')?.split(',').filter(Boolean) || [];
		if (
			JSON.stringify(currentEqIds.sort()) !== JSON.stringify(selectedEquipmentIds.slice().sort())
		) {
			if (selectedEquipmentIds.length > 0) {
				url.searchParams.set('equipmentIds', selectedEquipmentIds.join(','));
			} else {
				url.searchParams.delete('equipmentIds');
			}
			hasChanges = true;
		}

		if (dateRange.start && dateRange.end) {
			const startStr = dateRange.start.toString();
			const endStr = dateRange.end.toString();
			if (startStr !== data.filters.start || endStr !== data.filters.end) {
				url.searchParams.set('start', startStr);
				url.searchParams.set('end', endStr);
				hasChanges = true;
			}
		}

		if (hasChanges) {
			goto(url.toString(), { keepFocus: true, noScroll: true });
		}
	});

	function resetDateFilter() {
		dateRange.start = undefined;
		dateRange.end = undefined;
		const url = new URL(page.url);
		url.searchParams.delete('start');
		url.searchParams.delete('end');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	// State untuk dialog konfirmasi hapus
	let showDeleteDialog = $state(false);
	let deleteForm: HTMLFormElement | null = $state(null);

	// Handler untuk membuka dialog hapus
	function confirmDelete(id: string, event: Event) {
		const target = event.currentTarget as HTMLElement;
		const form = target.closest('form');
		if (form) {
			deleteForm = form;
			showDeleteDialog = true;
		}
	}

	// Handler untuk aksi hapus
	function handleDelete() {
		if (deleteForm) {
			deleteForm.requestSubmit();
		}
		showDeleteDialog = false;
	}

	// Handler untuk batal hapus
	function handleCancelDelete() {
		deleteForm = null;
		showDeleteDialog = false;
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'COMPLETED':
				return 'bg-success/10 text-success border-success/20';
			case 'IN_PROGRESS':
				return 'bg-primary/10 text-primary border-primary/20';
			case 'PENDING':
				return 'bg-secondary/10 text-secondary border-secondary/20';
			default:
				return 'bg-muted text-muted-foreground border-border';
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'COMPLETED':
				return CheckCircle2;
			case 'IN_PROGRESS':
				return Clock;
			case 'PENDING':
				return AlertCircle;
			default:
				return AlertCircle;
		}
	}

	function formatDate(date: string | Date) {
		return new Intl.DateTimeFormat('id-ID', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(date));
	}
</script>

<svelte:head>
	<title>Pemeliharaan Alat | MINMAT</title>
</svelte:head>

<div class="space-y-4 p-4 md:space-y-6 md:p-6">
	<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Manajemen Pemeliharaan</h1>

			<p class="text-muted-foreground">Kelola jadwal perawatan dan perbaikan peralatan matkomlek</p>
		</div>

		{#if data.isOperator}
			<Button href="/{data.org_slug}/pemeliharaan/create" class="w-full md:w-fit">
				<Plus />
				Tambah Pemeliharaan
			</Button>
		{/if}
	</div>

	<div class="flex flex-col items-center justify-between gap-4 md:flex-row">
		<div class="flex w-full flex-wrap gap-3 md:w-auto">
			<!-- Filter Peralatan Multi-select -->
			<div class="w-full md:w-64">
				{#await data.dataPromise}
					<div
						class="flex h-10 w-full animate-pulse items-center justify-between rounded-xl border border-border bg-card px-3 py-2"
					>
						<div class="h-4 w-24 rounded bg-muted"></div>
					</div>
				{:then resolvedData}
					<SearchableSelect.Root type="multiple" bind:value={selectedEquipmentIds}>
						<SearchableSelect.Trigger class="w-full md:w-fit">
							<div class="flex items-center gap-2 overflow-hidden">
								<Filter size={16} class="shrink-0" />
								{#if selectedEquipmentIds.length === 0}
									<span class="truncate">Filter Peralatan</span>
								{:else}
									<span class="truncate">{selectedEquipmentIds.length} Alat</span>
								{/if}
							</div>
						</SearchableSelect.Trigger>
						<SearchableSelect.Content>
							{#each resolvedData.equipment as eq (eq.id)}
								<SearchableSelect.Item
									value={eq.id}
									label={`${eq.item?.name || 'Tanpa Nama'} ${eq.serialNumber ? `(${eq.serialNumber})` : ''}`}
								>
									<div class="flex flex-col">
										<span class="text-xs font-medium">{eq.item?.name || 'Tanpa Nama'}</span>
										{#if eq.serialNumber}
											<span class="text-[10px] text-muted-foreground">SN: {eq.serialNumber}</span>
										{/if}
									</div>
								</SearchableSelect.Item>
							{/each}
						</SearchableSelect.Content>
					</SearchableSelect.Root>
				{/await}
			</div>

			<!-- Filter Tanggal -->
			<div class="flex w-full items-center gap-2 md:w-fit">
				{#if data.filters.start || data.filters.end}
					<Button variant="outline" onclick={resetDateFilter}>Reset</Button>
				{/if}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class="flex-1 md:flex-initial">
						<Button
							variant="outline"
							class="flex w-full items-center justify-start gap-2 text-sm md:w-fit md:justify-center"
						>
							<CalendarIcon class="size-4" />
							{#if data.filters.start && data.filters.end}
								{data.filters.start} - {data.filters.end}
							{:else}
								Filter Tanggal
							{/if}
						</Button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="center" class="w-auto p-0">
						<RangeCalendar bind:value={dateRange} class="rounded-md border-0" />
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>
	</div>

	{#await data.dataPromise}
		<!-- Skeleton -->
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<div class="space-y-2 p-4">
				<div class="h-10 w-full animate-pulse rounded bg-muted/60"></div>
				{#each Array(6) as _}
					<div class="flex animate-pulse gap-3">
						<div class="h-14 w-1/3 rounded bg-muted"></div>
						<div class="h-14 w-1/5 rounded bg-muted"></div>
						<div class="h-14 w-1/5 rounded bg-muted"></div>
						<div class="h-14 w-1/6 rounded bg-muted"></div>
						<div class="ml-auto h-14 w-16 rounded bg-muted"></div>
					</div>
				{/each}
			</div>
			<div class="border-t border-border bg-muted/30 p-4">
				<div class="h-4 w-40 animate-pulse rounded bg-muted"></div>
			</div>
		</div>
	{:then resolvedData}
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<Table.Root>
				<Table.Header class="bg-muted/50">
					<Table.Row>
						<Table.Head class="w-75">Peralatan</Table.Head>
						<Table.Head>Tipe</Table.Head>
						<Table.Head>Jadwal</Table.Head>
						<Table.Head>Status</Table.Head>
						{#if data.isOperator}
							<Table.Head class="text-right">Aksi</Table.Head>
						{/if}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each resolvedData.maintenance as item (item.id)}
						<Table.Row class="group transition-colors hover:bg-accent/50">
							<Table.Cell>
								<div class="flex max-w-75 items-center gap-3">
									<div class="flex flex-col">
										<span class="leading-tight font-bold text-wrap text-foreground">
											{item.equipment?.item?.name ?? item.equipmentId}
										</span>
										<span class="mt-1 font-mono text-[10px] text-muted-foreground"
											>SN: {item.equipment?.serialNumber || '-'}</span
										>
									</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Badge variant="outline">
									{maintenanceTypeLabel[item.maintenanceType]}
								</Badge>
							</Table.Cell>

							<Table.Cell>
								<div class="flex flex-col">
									<span class="text-sm font-medium text-foreground"
										>{formatDate(item.scheduledDate)}</span
									>
								</div>
							</Table.Cell>
							<Table.Cell>
								{@const StatusIcon = getStatusIcon(item.status)}
								<Badge variant="outline" class={getStatusColor(item.status)}>
									<StatusIcon />
									{maintenanceStatusLabel[item.status]}
								</Badge>
							</Table.Cell>
							{#if data.isOperator}
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-1">
										<Button
											size="icon"
											variant="ghost"
											href="/{data.org_slug}/pemeliharaan/{item.id}/edit"
										>
											<Edit size={16} />
										</Button>

										<!-- Form Delete -->
										<form
											method="POST"
											action="?/delete"
											use:enhance={() => {
												return async ({ result }) => {
													if (result?.type === 'success') {
														toast.success('Berhasil', 'Pemeliharaan berhasil dihapus');
														await invalidateAll();
													} else if (result?.type === 'failure') {
														toast.error(
															'Gagal',
															(result?.data as any)?.message || 'Gagal menghapus pemeliharaan'
														);
													}
													await applyAction(result);
												};
											}}
										>
											<input type="hidden" name="id" value={item.id} />
											<Button
												size="icon"
												variant="ghost"
												type="button"
												onclick={(e) => confirmDelete(item.id, e)}
											>
												<Trash2 size={16} />
											</Button>
										</form>
									</div>
								</Table.Cell>
							{/if}
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={6} class="h-64 text-center">
								<div class="flex flex-col items-center justify-center text-muted-foreground gap-3">
									<Wrench size={48} strokeWidth={1} class="text-border" />
									<p class="text-sm">Belum ada data pemeliharaan yang tercatat</p>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>

			<div
				class="flex items-center justify-between border-t border-border bg-muted/30 p-4 text-xs font-medium text-muted-foreground"
			>
				<span>Total {resolvedData.maintenance.length} jadwal pemeliharaan</span>
			</div>
		</div>
	{:catch err}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive"
		>
			Gagal memuat data pemeliharaan: {err.message}
		</div>
	{/await}

	<!-- Dialog Konfirmasi Hapus -->
	<ConfirmationDialog
		bind:open={showDeleteDialog}
		type="error"
		title="Hapus Pemeliharaan"
		description="Apakah Anda yakin ingin menghapus data pemeliharaan ini? Tindakan ini akan menghapus riwayat dari sistem dan tidak dapat dikembalikan."
		cancelLabel="Batal"
		actionLabel="Ya, Hapus"
		onAction={handleDelete}
		onCancel={handleCancelDelete}
	/>
</div>
