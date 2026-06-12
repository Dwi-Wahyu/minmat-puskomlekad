<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Select from '$lib/components/ui/select';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import {
		ArrowLeft,
		User,
		Building2,
		Calendar,
		Clock,
		CheckCircle2,
		Truck,
		Archive,
		ShieldCheck,
		Send,
		CheckCircle,
		Tag,
		Box,
		Trash2,
		Info
	} from '@lucide/svelte';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { cn } from '$lib/utils';
	import Label from '@/components/ui/label/label.svelte';
	import { approvalStatusLabel } from '@/enums/approval-enum';
	import { distributionStatusLabel } from '@/enums/distribution-enum';

	let { data, form } = $props();

	const dist = $derived(data.distribution);
	const isFromOrg = $derived(dist.fromOrganizationId === data.currentOrgId);
	const isToOrg = $derived(dist.toOrganizationId === data.currentOrgId);

	// Dialog States
	let showConfirm = $state(false);
	let showNotification = $state(false);
	let confirmConfig = $state({
		type: 'info' as 'success' | 'error' | 'info',
		title: '',
		description: '',
		actionLabel: '',
		action: 'validate',
		data: {}
	});

	let notificationConfig = $state({
		type: 'success' as 'success' | 'error' | 'info',
		title: '',
		description: ''
	});

	// Form values for shipping/receiving
	let activeTab = $state('equipment');
	let selectedWarehouseId = $state('');
	let consumableWarehouses = $state<Record<string, string>>({});

	const missingConsumableWarehousesCount = $derived(
		dist.consumableItems.filter((c) => !consumableWarehouses[c.itemId]).length
	);

	function handleAction(
		action: string,
		title: string,
		description: string,
		actionLabel: string,
		type = 'info' as 'error' | 'success' | 'info'
	) {
		if (action === 'ship') {
			// Check if all consumables have warehouses
			for (const cons of dist.consumableItems) {
				if (!consumableWarehouses[cons.id]) {
					activeTab = 'consumable';
					notificationConfig = {
						type: 'error',
						title: 'Gudang Belum Dipilih',
						description: `Pilih gudang asal untuk item ${cons.item?.name}`
					};
					showNotification = true;
					return;
				}
			}
		}

		confirmConfig = {
			type,
			title,
			description,
			actionLabel,
			action,
			data: {}
		};
		showConfirm = true;
	}

	$effect(() => {
		if (form?.success) {
			notificationConfig = {
				type: 'success',
				title: 'Berhasil',
				description: form.message
			};
			showNotification = true;
		} else if (form?.success === false) {
			notificationConfig = {
				type: 'error',
				title: 'Gagal',
				description: form.message
			};
			showNotification = true;
		}
	});

	function handleNotificationAction() {
		showNotification = false;
		if (form?.success && form?.action === 'delete') {
			import('$app/navigation').then(({ goto }) => {
				goto(`/${page.params.org_slug}/distribusi`);
			});
		}
	}

	const steps = [
		{ status: 'DRAFT', label: 'Draft', icon: Clock },
		{ status: 'VALIDATED', label: 'Tervalidasi', icon: ShieldCheck },
		{ status: 'APPROVED', label: 'Disetujui', icon: CheckCircle2 },
		{ status: 'SHIPPED', label: 'Dikirim', icon: Truck },
		{ status: 'RECEIVED', label: 'Diterima', icon: Archive }
	];

	const currentStepIndex = $derived(steps.findIndex((s) => s.status === dist.status));

	function getStatusVariant(status: string) {
		switch (status) {
			case 'DRAFT':
				return 'secondary';
			case 'VALIDATED':
				return 'outline';
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
</script>

<div class="mx-auto flex max-w-6xl flex-col gap-4 p-4 pb-20 md:gap-6 md:p-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div class="flex items-center gap-4">
			<Button
				variant="outline"
				size="icon"
				href="/{page.params.org_slug}/distribusi"
				class="rounded-full shadow-sm"
			>
				<ArrowLeft size={18} />
			</Button>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="flex items-center gap-2 text-2xl font-bold">Detail Distribusi</h1>

					<Badge variant={getStatusVariant(dist.status!)}
						>{distributionStatusLabel[dist.status!]}</Badge
					>
				</div>

				<p class="font-mono text-sm text-muted-foreground">{dist.id}</p>
			</div>
		</div>

		<!-- Top Actions -->
		<div class="flex items-center gap-2">
			{#if dist.status === 'DRAFT'}
				{#if data.canValidate}
					<Button
						onclick={() =>
							handleAction(
								'validate',
								'Validasi Distribusi',
								'Apakah data distribusi sudah lengkap dan siap diajukan untuk approval?',
								'Validasi Data'
							)}
					>
						<ShieldCheck />
						Validasi Sekarang
					</Button>
				{/if}
				{#if dist.requestedBy === data.user?.id}
					<Button
						variant="destructive"
						onclick={() =>
							handleAction(
								'delete',
								'Hapus Distribusi',
								'Apakah Anda yakin ingin menghapus pengajuan distribusi ini? Tindakan ini tidak dapat dibatalkan.',
								'Hapus'
							)}
					>
						<Trash2 />
						Hapus
					</Button>
				{/if}
			{:else if dist.status === 'SHIPPED' && isToOrg}
				<div class="flex items-center gap-4 rounded-lg border bg-primary/5 p-2 px-4">
					<div class="flex items-center gap-2">
						<Label class="text-xs">Gudang Tujuan</Label>
						<Select.Root type="single" bind:value={selectedWarehouseId}>
							<Select.Trigger>
								{data.warehouses.find((w) => w.id === selectedWarehouseId)?.name || 'Pilih Gudang'}
							</Select.Trigger>
							<Select.Content>
								{#each data.warehouses as wh (wh.id)}
									<Select.Item value={wh.id}>{wh.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<Button
						class="bg-green-600 hover:bg-green-700"
						disabled={!selectedWarehouseId}
						onclick={() =>
							handleAction(
								'receive',
								'Terima Inventaris',
								'Inventaris akan dimasukkan ke inventaris satuan Anda.',
								'Konfirmasi Terima',
								'success'
							)}
					>
						<CheckCircle />
						Terima
					</Button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Stepper -->
	<div class="grid grid-cols-5 gap-4 rounded-xl border bg-card p-4 shadow-sm">
		{#each steps as step, i (step.status)}
			<div class="relative flex flex-col items-center gap-2">
				<div
					class={cn(
						'flex size-10 items-center justify-center rounded-full border-2 transition-colors',
						i <= currentStepIndex
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-muted bg-muted text-muted-foreground'
					)}
				>
					<step.icon class="size-5" />
				</div>
				<span
					class={cn(
						'text-xs font-medium',
						i <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
					)}
				>
					{step.label}
				</span>
				{#if i < steps.length - 1}
					<div
						class={cn(
							'absolute top-5 left-[calc(50%+25px)] h-0.5 w-[calc(100%-50px)]',
							i < currentStepIndex ? 'bg-primary' : 'bg-muted'
						)}
					></div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="grid gap-6">
		<div class="grid gap-6 md:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Informasi Pengiriman</CardTitle>
				</CardHeader>
				<CardContent class="flex flex-col gap-6">
					<div class="grid gap-6 sm:grid-cols-2">
						<div class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
							<div class="flex items-center gap-2 text-muted-foreground">
								<Building2 class="size-4" />
								<span class="text-xs font-bold tracking-wider uppercase">Dari Kesatuan</span>
							</div>
							<div class="flex items-center gap-3">
								<div class="flex flex-col">
									<span class="font-bold">{dist.fromOrganization?.name}</span>
								</div>
							</div>
						</div>

						<div class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
							<div class="flex items-center gap-2 text-muted-foreground">
								<Building2 class="size-4" />
								<span class="text-xs font-bold tracking-wider uppercase">Ke Kesatuan</span>
							</div>
							<div class="flex items-center gap-3">
								<div class="flex flex-col">
									<span class="font-bold">{dist.toOrganization?.name}</span>
								</div>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="flex items-center gap-2 text-sm">
							<div>
								<Label>Diajukan oleh</Label>
								<span class="mt-1 block text-sm text-muted-foreground"
									>{dist.requestedByUser?.name}</span
								>
							</div>
						</div>
						<div class="flex items-center gap-2 text-sm">
							<div>
								<Label>Tanggal</Label>
								<span class="mt-1 block text-sm text-muted-foreground">
									{new Date(dist.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}
								</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{#if dist.status === 'DRAFT'}
				<Card>
					<CardContent class="flex h-full flex-col items-center justify-center gap-1 text-center">
						<Info class="h-20 w-20 shrink-0" />
						<CardTitle class="mt-2">Menunggu Validasi</CardTitle>
						<CardDescription>
							Pengajuan distribusi ini sedang menunggu validasi manual dari operator <span
								class="font-semibold">Puskomlekad</span
							> sebelum dapat diproses lebih lanjut.
						</CardDescription>
					</CardContent>
				</Card>
			{/if}

			{#if dist.status === 'VALIDATED' && !data.canApprove}
				<Card>
					<CardContent class="flex h-full flex-col items-center justify-center gap-1 text-center">
						<Info class="h-20 w-20 shrink-0" />
						<CardTitle class="mt-2">Menunggu Approval</CardTitle>
						<CardDescription>
							Pengajuan distribusi ini sedang menunggu persetujuan dari pimpinan <span
								class="font-semibold">Puskomlekad</span
							> sebelum dapat diproses lebih lanjut.
						</CardDescription>
					</CardContent>
				</Card>
			{/if}

			{#if dist.status === 'VALIDATED' && data.canApprove}
				<Card>
					<CardContent class="flex h-full flex-col items-center justify-center gap-1 text-center">
						<Info class="h-20 w-20 shrink-0" />
						<CardTitle class="mt-2">Menunggu Approval</CardTitle>
						<CardDescription>
							Pengajuan distribusi ini sedang menunggu persetujuan dari anda sebelum dapat diproses
							lebih lanjut.
						</CardDescription>

						<div class="mt-4 flex gap-2">
							<Button
								variant="destructive"
								onclick={() =>
									handleAction(
										'reject',
										'Tolak Distribusi',
										'Permintaan akan dikembalikan ke status DRAFT untuk diperbaiki.',
										'Tolak'
									)}
							>
								Tolak
							</Button>
							<Button
								variant="default"
								class="bg-green-600 hover:bg-green-700"
								onclick={() =>
									handleAction(
										'approve',
										'Setujui Distribusi',
										'Anda akan menyetujui distribusi ini untuk segera diproses pengirimannya.',
										'Setujui',
										'success'
									)}
							>
								<CheckCircle2 />
								Setujui
							</Button>
						</div>
					</CardContent>
				</Card>
			{/if}

			<!-- Approval Info -->
			{#if data.approval}
				<Card>
					<CardHeader>
						<CardTitle>Approval</CardTitle>
					</CardHeader>
					<CardContent class="grid gap-4">
						<div class="flex items-start gap-4">
							<div
								class={cn(
									'mt-1 size-3 rounded-full',
									data.approval.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'
								)}
							></div>
							<div class="flex flex-col gap-1">
								{#if data.approval.status}
									<span class="text-sm font-bold uppercase"
										>{approvalStatusLabel[data.approval.status]}</span
									>
								{/if}

								<div class="flex flex-col text-xs text-muted-foreground">
									<span class="font-medium text-foreground"
										>Oleh: {data.approval.approvedByUser?.name}</span
									>
									<span>{new Date(data.approval.createdAt).toLocaleString('id-ID')}</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			{/if}
		</div>

		<Card class="pb-0">
			<CardHeader class="flex flex-row items-center justify-between">
				<div class="space-y-1.5">
					<CardTitle>Daftar Inventaris</CardTitle>
					<CardDescription>
						{dist.equipmentItems.length + dist.consumableItems.length} item akan dikirim.
					</CardDescription>
				</div>
				{#if dist.status === 'APPROVED' && isFromOrg && data.canValidate}
					<Button
						onclick={() =>
							handleAction(
								'ship',
								'Kirim Inventaris',
								`Alat akan ditandai sebagai ${distributionStatusLabel['SHIPPED']} dan stok barang akan dikurangi dari gudang asal.`,
								'Proses Pengiriman',
								'info'
							)}
					>
						<Send />
						Kirim
					</Button>
				{/if}
			</CardHeader>
			<CardContent class="p-0">
				<Tabs.Root bind:value={activeTab} class="w-full">
					<div class="border-t border-b bg-muted/2 py-2">
						<Tabs.List class="w-full justify-start rounded-none bg-transparent px-6">
							<Tabs.Trigger class="h-9 cursor-pointer" value="equipment">
								Alat
								<Badge variant="secondary" class="ml-2">{dist.equipmentItems.length}</Badge>
							</Tabs.Trigger>
							<Tabs.Trigger class="h-9 cursor-pointer" value="consumable">
								Barang Habis Pakai
								<Badge variant="secondary" class="ml-2">{dist.consumableItems.length}</Badge>
								{#if missingConsumableWarehousesCount > 0 && dist.status === 'APPROVED' && isFromOrg && data.canValidate}
									<span class="absolute top-2 right-2 flex size-2">
										<span
											class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"
										></span>
										<span class="relative inline-flex size-2 rounded-full bg-red-500"></span>
									</span>
								{/if}
							</Tabs.Trigger>
						</Tabs.List>
					</div>

					<Tabs.Content value="equipment" class="m-0 border-none p-0">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="pl-6">Nama Inventaris</Table.Head>
									<Table.Head>S/N</Table.Head>
									<Table.Head class="pr-6">Gudang</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#if dist.equipmentItems.length === 0}
									<Table.Row>
										<Table.Cell colspan={3} class="h-24 text-center text-muted-foreground">
											Tidak ada materi riil.
										</Table.Cell>
									</Table.Row>
								{/if}
								{#each dist.equipmentItems as eqItem (eqItem.id)}
									<Table.Row>
										<Table.Cell class="pl-6">
											<div class="flex items-center gap-2">
												<Tag class="size-3.5 text-primary" />
												<span class="font-medium">{eqItem.equipment?.item?.name}</span>
											</div>
										</Table.Cell>
										<Table.Cell>
											<Badge variant="outline" class="font-mono text-[10px] uppercase">
												{eqItem.equipment?.serialNumber}
											</Badge>
										</Table.Cell>
										<Table.Cell class="pr-6">
											<div class="flex flex-col gap-1">
												{#if eqItem.equipment?.warehouse}
													<div
														class="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase"
													>
														<Building2 class="size-3" />
														{eqItem.equipment.warehouse.name}
													</div>
												{/if}
												{#if eqItem.note}
													<span class="text-xs text-muted-foreground italic">
														{eqItem.note}
													</span>
												{/if}
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</Tabs.Content>

					<Tabs.Content value="consumable" class="m-0 border-none p-0">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="pl-6">Nama Inventaris</Table.Head>
									<Table.Head class="text-center">Kuantitas</Table.Head>
									<Table.Head class="pr-6">Gudang Asal</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#if dist.consumableItems.length === 0}
									<Table.Row>
										<Table.Cell colspan={3} class="h-24 text-center text-muted-foreground">
											Tidak ada materi pakai habis.
										</Table.Cell>
									</Table.Row>
								{/if}
								{#each dist.consumableItems as consItem (consItem.id)}
									<Table.Row>
										<Table.Cell class="pl-6">
											<div class="flex items-center gap-2">
												<Box class="size-3.5 text-amber-500" />
												<span class="font-medium">{consItem.item?.name}</span>
											</div>
										</Table.Cell>
										<Table.Cell class="text-center">
											<span class="font-bold">{consItem.quantity}</span>
											<span class="ml-1 text-[10px] text-muted-foreground uppercase"
												>{consItem.unit}</span
											>
										</Table.Cell>
										<Table.Cell class="pr-6">
											<div class="flex flex-col gap-2">
												{#if dist.status === 'APPROVED' && isFromOrg && data.canValidate}
													<div class="flex items-center gap-2">
														<Select.Root
															type="single"
															bind:value={consumableWarehouses[consItem.id]}
														>
															<Select.Trigger
																class={cn(
																	'h-8 text-xs',
																	!consumableWarehouses[consItem.id] && 'border-red-500 bg-red-50'
																)}
															>
																{consItem.item?.stocks?.find(
																	(st) => st.warehouseId === consumableWarehouses[consItem.id]
																)?.warehouse?.name || 'Pilih Gudang'}
															</Select.Trigger>

															<Select.Content>
																{#each consItem.item?.stocks || [] as st (st.id)}
																	<Select.Item
																		value={st.warehouseId as string}
																		disabled={Number(st.qty) < Number(consItem.quantity)}
																	>
																		<div class="flex flex-col">
																			<span>{st.warehouse?.name}</span>
																			<span class="text-[10px] text-muted-foreground">
																				Stok: {st.qty}
																			</span>
																		</div>
																	</Select.Item>
																{/each}
															</Select.Content>
														</Select.Root>
													</div>
												{:else if consItem.fromWarehouseId}
													<div
														class="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase"
													>
														<Building2 class="size-3" />
														{consItem.fromWarehouse?.name || 'Unknown'}
													</div>
												{/if}
												{#if consItem.note}
													<span class="text-xs text-muted-foreground italic">
														{consItem.note}
													</span>
												{/if}
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</Tabs.Content>
				</Tabs.Root>
			</CardContent>
		</Card>
	</div>
</div>

<!-- Form helpers for Dialogs -->
<form id="actionForm" method="POST" use:enhance>
	<input type="hidden" name="id" value={dist.id} />
	{#if confirmConfig.action === 'approve' || confirmConfig.action === 'reject'}
		<input
			type="hidden"
			name="isApproved"
			value={confirmConfig.action === 'approve' ? 'true' : 'false'}
		/>
		<input type="hidden" name="note" value="Disetujui" />
	{:else if confirmConfig.action === 'ship'}
		<!-- Handled dynamically in onAction -->
	{:else if confirmConfig.action === 'receive'}
		<input type="hidden" name="toWarehouseId" value={selectedWarehouseId} />
	{/if}
</form>

<ConfirmationDialog
	bind:open={showConfirm}
	type={confirmConfig.type}
	title={confirmConfig.title}
	description={confirmConfig.description}
	actionLabel={confirmConfig.actionLabel}
	onAction={() => {
		const formEl = document.getElementById('actionForm') as HTMLFormElement;
		if (formEl) {
			if (confirmConfig.action === 'ship') {
				// Remove existing warehouse inputs
				const existing = formEl.querySelectorAll('input[name^="warehouse_"]');
				existing.forEach((el) => el.remove());

				// Add current mappings
				for (const [itemId, warehouseId] of Object.entries(consumableWarehouses)) {
					const input = document.createElement('input');
					input.type = 'hidden';
					input.name = `warehouse_${itemId}`;
					input.value = warehouseId;
					formEl.appendChild(input);
				}
			}

			formEl.action = `?/${confirmConfig.action === 'reject' ? 'approve' : confirmConfig.action}`;
			formEl.requestSubmit();
		}
		showConfirm = false;
	}}
/>
<NotificationDialog
	bind:open={showNotification}
	type={notificationConfig.type}
	title={notificationConfig.title}
	description={notificationConfig.description}
	onAction={handleNotificationAction}
/>
