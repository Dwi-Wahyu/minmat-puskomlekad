<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { cn } from '$lib/utils';
	import {
		ChevronLeft,
		CheckCircle2,
		XCircle,
		Clock,
		Package,
		History,
		User,
		AlertCircle,
		RotateCcw,
		Download,
		FileText,
		Truck,
		PackageCheck,
		Send,
		ClipboardCheck,
		AlertTriangle,
		Warehouse
	} from '@lucide/svelte';
	import { equipmentStatusLabel, equipmentTypeLabel } from '@/enums/equipment-enum';
	import { lendingPurposeLabel } from '@/enums/lending-enum';
	import AlertDescription from '@/components/ui/alert/alert-description.svelte';
	import { Alert, AlertTitle } from '@/components/ui/alert';

	let { data }: { data: PageData } = $props();

	const assets = $derived(
		data.lending.items.filter((item) => item.equipment?.item?.type === 'ASSET')
	);

	// State Dialog
	let notificationOpen = $state(false);
	let notificationType = $state<'success' | 'error' | 'info'>('success');
	let notificationTitle = $state('');

	let notificationMsg = $state('');

	let approveDialogOpen = $state(false);
	let approveLoading = $state(false);

	let overrideDialogOpen = $state(false);
	let overrideLoading = $state(false);
	let overrideReason = $state('');

	let rejectDialogOpen = $state(false);
	let rejectLoading = $state(false);
	let rejectReason = $state('');

	// let startDialogOpen = $state(false);
	// let startLoading = $state(false);

	// let returnDialogOpen = $state(false);
	// let returnLoading = $state(false);

	let deleteDialogOpen = $state(false);
	let deleteLoading = $state(false);

	let dispatchDialogOpen = $state(false);
	let dispatchLoading = $state(false);
	let confirmReceiveDialogOpen = $state(false);
	let confirmReceiveLoading = $state(false);
	let confirmReceiveNotes = $state('');
	let sendBackDialogOpen = $state(false);
	let sendBackLoading = $state(false);
	let sendBackNotes = $state('');
	let confirmReturnDialogOpen = $state(false);
	let confirmReturnLoading = $state(false);
	let confirmReturnNotes = $state('');
	let conditionOverrides = $state<{ equipmentId: string; condition: string }[]>([]);

	const statusConfig = {
		DRAFT: {
			label: 'Menunggu Persetujuan',
			color: 'bg-secondary/10 text-secondary border-secondary/20',
			icon: Clock
		},
		APPROVED: {
			label: 'Disetujui',
			color: 'bg-primary/10 text-primary border-primary/20',
			icon: CheckCircle2
		},
		REJECTED: {
			label: 'Ditolak',
			color: 'bg-destructive/10 text-destructive border-destructive/20',
			icon: XCircle
		},
		PERINTAH_LANGSUNG: {
			label: 'Perintah Langsung',
			color: 'bg-secondary/10 text-secondary border-secondary/20',
			icon: AlertCircle
		},
		DALAM_PENGIRIMAN: {
			label: 'Dalam Pengiriman',
			color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
			icon: Truck
		},
		DIPINJAM: {
			label: 'Sedang Dipinjam',
			color: 'bg-primary/10 text-primary border-primary/20',
			icon: Package
		},
		DIKIRIM_KEMBALI: {
			label: 'Dikirim Kembali',
			color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
			icon: Send
		},
		KEMBALI: {
			label: 'Sudah Kembali',
			color: 'bg-success/10 text-success border-success/20',
			icon: RotateCcw
		}
	};

	const currentStatus = $derived(statusConfig[data.lending.status as keyof typeof statusConfig]);

	const steps = $derived([
		{ status: 'DRAFT', label: 'Draft', icon: Clock },
		{
			status: data.lending.status === 'PERINTAH_LANGSUNG' ? 'PERINTAH_LANGSUNG' : 'APPROVED',
			label: data.lending.status === 'PERINTAH_LANGSUNG' ? 'Perintah' : 'Disetujui',
			icon: data.lending.status === 'PERINTAH_LANGSUNG' ? AlertCircle : CheckCircle2
		},
		{ status: 'DALAM_PENGIRIMAN', label: 'Dikirim', icon: Truck },
		{ status: 'DIPINJAM', label: 'Diterima', icon: Package },
		{ status: 'DIKIRIM_KEMBALI', label: 'Dikirim Kembali', icon: Send },
		{ status: 'KEMBALI', label: 'Kembali', icon: RotateCcw }
	]);

	function formatDate(date: Date) {
		if (!date) return '-';
		return new Date(date).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:gap-6 md:p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button
				variant="outline"
				class="border"
				size="icon"
				href="/{page.params.org_slug}/peminjaman"
			>
				<ChevronLeft class="size-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-foreground">Detail Peminjaman</h1>
				<div class="mt-1 flex items-center gap-2">
					<Badge variant="outline" class={currentStatus.color}>
						<currentStatus.icon class="mr-1 size-3" />
						{currentStatus.label}
					</Badge>
					<span class="text-xs text-muted-foreground">ID: {data.lending.id}</span>
				</div>
			</div>
		</div>

		<div class="flex gap-2">
			{#if data.canDelete}
				<Button
					variant="outline"
					class="border-destructive/20 text-destructive hover:bg-destructive/10"
					onclick={() => (deleteDialogOpen = true)}
				>
					Hapus Pengajuan
				</Button>
			{/if}

			{#if data.canApprove}
				<Button
					variant="outline"
					class="border-destructive/20 text-destructive hover:bg-destructive/10"
					onclick={() => (rejectDialogOpen = true)}
				>
					Tolak Pengajuan
				</Button>
				<Button
					class="bg-success text-success-foreground hover:bg-success/90"
					onclick={() => (approveDialogOpen = true)}
				>
					Setujui Pengajuan
				</Button>
			{/if}

			{#if data.canDispatch}
				<Button onclick={() => (dispatchDialogOpen = true)} class="gap-2">
					<Truck class="h-4 w-4" /> Keluarkan Alat dari Gudang
				</Button>
			{/if}

			{#if data.canConfirmReceive}
				<Button href={`/${data.orgSlug}/peminjaman/${data.lending.id}/terima`} class="gap-2">
					<PackageCheck class="h-4 w-4" /> Konfirmasi Penerimaan
				</Button>
			{/if}

			{#if data.canSendBack}
				<Button onclick={() => (sendBackDialogOpen = true)} variant="outline" class="gap-2">
					<Send class="h-4 w-4" /> Kirim Kembali
				</Button>
			{/if}

			{#if data.canConfirmReturn}
				<Button
					href={`/${data.orgSlug}/peminjaman/${data.lending.id}/konfirmasi-kembali`}
					class="gap-2"
				>
					<ClipboardCheck class="h-4 w-4" /> Konfirmasi Penerimaan Kembali
				</Button>
			{/if}
		</div>
	</div>

	<!-- Stepper -->
	<div class="mb-2">
		<div class="grid grid-cols-6 gap-2 rounded-xl border bg-card p-4 shadow-sm md:p-6">
			{#each steps as step, i (step.status)}
				{@const statusOrder = [
					'DRAFT',
					'APPROVED',
					'PERINTAH_LANGSUNG',
					'DALAM_PENGIRIMAN',
					'DIPINJAM',
					'DIKIRIM_KEMBALI',
					'KEMBALI'
				]}
				{@const currentIndex = statusOrder.indexOf(data.lending.status!)}
				{@const stepIndex = statusOrder.indexOf(step.status)}
				{@const isCompleted =
					data.lending.status === 'REJECTED' ? false : currentIndex >= stepIndex}
				{@const isActive = data.lending.status === step.status}

				<div class="relative flex flex-col items-center gap-2">
					<div
						class={cn(
							'z-10 flex size-10 items-center justify-center rounded-full border-2 transition-all duration-300 md:size-12',
							isActive
								? 'border-primary bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20'
								: isCompleted
									? 'border-success bg-success text-success-foreground'
									: 'border-muted bg-muted text-muted-foreground'
						)}
					>
						{#if data.lending.status === 'REJECTED' && i === 1}
							<XCircle class="size-5 md:size-6" />
						{:else if isCompleted && !isActive}
							<CheckCircle2 class="size-5 md:size-6" />
						{:else}
							<step.icon class="size-5 md:size-6" />
						{/if}
					</div>
					<span
						class={cn(
							'text-[10px] font-bold tracking-tight md:text-xs',
							isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted-foreground'
						)}
					>
						{step.label}
					</span>

					{#if i < steps.length - 1}
						<div
							class={cn(
								'absolute top-5 left-[calc(50%+25px)] h-0.5 w-[calc(100%-50px)] md:top-6',
								isCompleted &&
									statusOrder.indexOf(data.lending.status!) > statusOrder.indexOf(step.status)
									? 'bg-success'
									: 'bg-muted'
							)}
						></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<Tabs value="info" class="w-full">
		<TabsList class="grid w-full max-w-md grid-cols-3">
			<TabsTrigger value="info">Informasi</TabsTrigger>
			<TabsTrigger value="items">Daftar Inventaris ({data.lending.items.length})</TabsTrigger>
			<TabsTrigger value="history">Riwayat</TabsTrigger>
		</TabsList>

		<TabsContent value="info" class="mt-6 space-y-6">
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<!-- General Info -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-lg">Informasi Operasional</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-1">
								<Label>Unit Peminjam</Label>
								<p class="font-medium text-muted-foreground">{data.lending.unit}</p>
							</div>
							<div class="space-y-1">
								<Label>Tujuan</Label>
								<Badge variant="secondary" class="mt-1"
									>{lendingPurposeLabel[data.lending.purpose]}</Badge
								>
							</div>
							<div class="space-y-1">
								<Label>Rencana Mulai</Label>
								<p class="text-sm text-muted-foreground">{formatDate(data.lending.startDate)}</p>
							</div>
							{#if data.lending.endDate}
								<div class="space-y-1">
									<Label>Rencana Selesai</Label>
									<p class="text-sm text-muted-foreground">{formatDate(data.lending.endDate)}</p>
								</div>
							{/if}
						</div>
						<Separator />
						<div class="space-y-1">
							<Label>Satuan Pemilik Aset</Label>
							<p class="text-sm font-semibold text-muted-foreground">
								{data.lending.organization?.name}
							</p>
						</div>

						{#if data.lending.attachmentPath}
							<Separator />
							<div class="space-y-2">
								<Label>Dokumen Pendukung</Label>
								<div class="flex items-center justify-between gap-3">
									<div class="flex items-center gap-3 overflow-hidden">
										<div class="rounded bg-background p-2 text-primary shadow-sm">
											<FileText class="size-5" />
										</div>
										<div class="overflow-hidden">
											<p class="truncate text-sm font-medium">
												{data.lending.attachmentName || 'Dokumen Peminjaman'}
											</p>
											<p class="text-[10px] text-muted-foreground uppercase">PDF / DOCX</p>
										</div>
									</div>
									<Button
										variant="outline"
										size="icon"
										href={data.lending.attachmentPath}
										download={data.lending.attachmentName}
										class="shrink-0"
									>
										<Download />
									</Button>
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Requester Info -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-lg">Pemohon & Persetujuan</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						{#if data.lending.status === 'REJECTED'}
							<Alert variant="destructive">
								<AlertCircle />

								<AlertTitle>Alasan Penolakan</AlertTitle>
								<AlertDescription>
									{data.lending.rejectedReason}
								</AlertDescription>
							</Alert>
						{/if}

						{#if data.lending.status === 'PERINTAH_LANGSUNG'}
							<Alert variant="destructive">
								<AlertCircle />

								<AlertTitle>Perintah Langsung</AlertTitle>
								<AlertDescription>
									{data.lending.overrideReason}. Oleh: {data.lending.overrideByUser?.name ||
										'Pimpinan'}
								</AlertDescription>
							</Alert>
						{/if}

						<div class="flex items-center gap-3">
							<div class="rounded-full bg-muted p-2">
								<User class="size-5" />
							</div>
							<div>
								<Label>Diajukan Oleh</Label>
								<p class="text-sm text-muted-foreground">
									{data.lending.requestedByUser?.name}
								</p>
							</div>
						</div>

						{#if data.lending.approvedByUser}
							<div class="flex items-center gap-3 pt-2">
								<div class="rounded-full bg-primary/10 p-2 text-primary">
									<CheckCircle2 class="size-5" />
								</div>
								<div>
									<Label>Diproses Oleh</Label>
									<p class="text-sm text-muted-foreground">{data.lending.approvedByUser?.name}</p>
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</TabsContent>

		<TabsContent value="items" class="mt-6 space-y-6">
			{#if assets.length > 0}
				<Card.Root class="py-0">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Nama Alat</Table.Head>
								<Table.Head>Serial Number</Table.Head>
								<Table.Head>Jenis</Table.Head>
								<Table.Head>Brand</Table.Head>
								<Table.Head>Gudang</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each assets as item (item.id)}
								<Table.Row>
									<Table.Cell class="font-medium">{item.equipment?.item?.name || '-'}</Table.Cell>
									<Table.Cell>
										{#if item.equipment?.serialNumber}
											<code class="rounded bg-muted px-1 text-xs"
												>{item.equipment.serialNumber}</code
											>
										{:else}
											-
										{/if}
									</Table.Cell>
									<Table.Cell
										>{equipmentTypeLabel[
											item.equipment?.item?.equipmentType ?? 'ALKOMLEK'
										]}</Table.Cell
									>
									<Table.Cell>{item.equipment?.brand || '-'}</Table.Cell>
									<Table.Cell>{item.equipment?.warehouse?.name || '-'}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Root>
			{/if}

			{#if assets.length === 0}
				<div
					class="flex flex-col items-center justify-center rounded-lg border bg-card p-8 text-center text-muted-foreground"
				>
					<Package class="mb-2 size-8" />
					<p>Tidak ada daftar inventaris dalam peminjaman ini</p>
				</div>
			{/if}
		</TabsContent>

		<TabsContent value="history" class="mt-6">
			<Card.Root>
				<Card.Content>
					<div class="space-y-6">
						{#each data.lending.approvals as log (log.id)}
							{@const noteText = log.note || ''}
							{@const isOverride = noteText.startsWith('[COMMAND OVERRIDE]')}
							{@const isDispatch = noteText.startsWith('[DALAM_PENGIRIMAN]')}
							{@const isDipinjam = noteText.startsWith('[DIPINJAM]')}
							{@const isDikirimKembali = noteText.startsWith('[DIKIRIM_KEMBALI]')}
							{@const isKembali = noteText.startsWith('[KEMBALI]')}

							{@const displayNote = isOverride
								? noteText.replace('[COMMAND OVERRIDE] ', '')
								: isDispatch
									? noteText.replace('[DALAM_PENGIRIMAN] ', '')
									: isDipinjam
										? noteText.replace('[DIPINJAM] ', '')
										: isDikirimKembali
											? noteText.replace('[DIKIRIM_KEMBALI] ', '')
											: isKembali
												? noteText.replace('[KEMBALI] ', '')
												: noteText}

							<div class="flex gap-4">
								<div class="flex flex-col items-center">
									<div
										class={isDispatch || isDipinjam || isDikirimKembali || isKembali
											? 'text-primary'
											: isOverride
												? 'text-secondary'
												: log.status === 'APPROVED'
													? 'text-success'
													: 'text-destructive'}
									>
										{#if isDispatch}
											<Truck class="size-5" />
										{:else if isDipinjam}
											<PackageCheck class="size-5" />
										{:else if isDikirimKembali}
											<Send class="size-5" />
										{:else if isKembali}
											<RotateCcw class="size-5" />
										{:else if isOverride}
											<AlertCircle class="size-5" />
										{:else}
											<History class="size-5" />
										{/if}
									</div>
									<div class="mt-2 h-full w-px bg-border"></div>
								</div>
								<div class="space-y-1 pb-6">
									<p class="text-sm font-bold">
										{#if isDispatch}
											Alat Dikeluarkan dari Gudang
										{:else if isDipinjam}
											Alat Diterima Peminjam
										{:else if isDikirimKembali}
											Alat Dikirim Kembali
										{:else if isKembali}
											Alat Kembali ke Gudang
										{:else if isOverride}
											Perintah Langsung (Override)
										{:else}
											{log.status === 'APPROVED' ? 'Persetujuan Diterima' : 'Pengajuan Ditolak'}
										{/if}
									</p>
									<p class="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
									<p class="mt-2 text-sm text-muted-foreground italic">"{displayNote}"</p>
									<p class="text-xs font-medium">Oleh: {log.approvedByUser?.name}</p>
								</div>
							</div>
						{/each}
						<div class="flex gap-4">
							<div class="text-primary">
								<Clock class="size-5" />
							</div>
							<div>
								<p class="text-sm font-bold">Pengajuan Dibuat</p>
								<p class="text-xs text-muted-foreground">{formatDate(data.lending.createdAt)}</p>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</TabsContent>
	</Tabs>
</div>

<!-- ACTIONS FORMS -->
<form
	id="override-form"
	method="POST"
	action="?/override"
	use:enhance={() => {
		overrideLoading = true;
		return ({ result }) => {
			overrideLoading = false;
			overrideDialogOpen = false;
			if (result?.type === 'success') {
				notificationMsg = (result?.data?.message as string) || '';
				notificationType = 'success';
				notificationOpen = true;
				invalidateAll();
			} else if (result?.type === 'failure') {
				notificationMsg =
					(result?.data?.message as string) || 'Gagal melakukan override perintah langsung';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={data.lending.id} />
	<input type="hidden" name="reason" value={overrideReason} />
</form>

<form
	id="approve-form"
	method="POST"
	action="?/approve"
	use:enhance={() => {
		approveLoading = true;
		return ({ result }) => {
			approveLoading = false;
			approveDialogOpen = false;
			if (result?.type === 'success') {
				notificationMsg = (result?.data?.message as string) || '';
				notificationType = 'success';
				notificationOpen = true;
				invalidateAll();
			} else if (result?.type === 'failure') {
				notificationMsg = (result?.data?.message as string) || 'Gagal menyetujui peminjaman';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={data.lending.id} />
</form>

<form
	id="reject-form"
	method="POST"
	action="?/reject"
	use:enhance={() => {
		rejectLoading = true;
		return ({ result }) => {
			rejectLoading = false;
			rejectDialogOpen = false;
			if (result?.type === 'success') {
				notificationMsg = (result?.data?.message as string) || '';
				notificationType = 'success';
				notificationOpen = true;
				invalidateAll();
			} else if (result?.type === 'failure') {
				notificationMsg = (result?.data?.message as string) || 'Gagal menolak peminjaman';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={data.lending.id} />
	<input type="hidden" name="reason" value={rejectReason} />
</form>

<!-- DIALOGS -->
<form
	id="delete-form"
	method="POST"
	action="?/delete"
	use:enhance={() => {
		deleteLoading = true;
		return ({ result }) => {
			deleteLoading = false;
			deleteDialogOpen = false;
			if (result?.type === 'success') {
				notificationMsg = 'Pengajuan telah dihapus';
				notificationType = 'success';
				notificationOpen = true;
				setTimeout(() => {
					window.location.href = `/${page.params.org_slug}/peminjaman`;
				}, 1500);
			} else if (result?.type === 'failure') {
				notificationMsg = (result?.data?.message as string) || 'Gagal menghapus pengajuan';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={data.lending.id} />
</form>

<ConfirmationDialog
	bind:open={deleteDialogOpen}
	loading={deleteLoading}
	type="error"
	title="Hapus Pengajuan"
	description="Apakah Anda yakin ingin menghapus pengajuan peminjaman ini? Tindakan ini tidak dapat dibatalkan."
	actionLabel="Hapus"
	onAction={() => (document.getElementById('delete-form') as HTMLFormElement)?.requestSubmit()}
/>

<ConfirmationDialog
	bind:open={approveDialogOpen}
	loading={approveLoading}
	type="success"
	title="Setujui Peminjaman"
	description="Apakah Anda yakin ingin menyetujui pengajuan peminjaman alat ini?"
	actionLabel="Setujui"
	onAction={() => (document.getElementById('approve-form') as HTMLFormElement)?.requestSubmit()}
/>

<ConfirmationDialog
	bind:open={overrideDialogOpen}
	loading={overrideLoading}
	type="info"
	title="Perintah Langsung"
	description="Gunakan fitur ini hanya untuk instruksi mendesak atau operasi militer khusus yang melompati jalur persetujuan normal."
	actionLabel="Konfirmasi Perintah"
	onAction={() => {
		if (!overrideReason) return alert('Alasan perintah harus diisi');
		(document.getElementById('override-form') as HTMLFormElement)?.requestSubmit();
	}}
>
	<div class="mt-4">
		<Label for="overrideReason">Alasan Perintah / Keterangan Operasi</Label>
		<Textarea
			bind:value={overrideReason}
			placeholder="Contoh: Perintah Ops Darurat Mabes TNI..."
			class="mt-2"
			required
		/>
	</div>
</ConfirmationDialog>

<ConfirmationDialog
	bind:open={rejectDialogOpen}
	loading={rejectLoading}
	type="error"
	title="Tolak Peminjaman"
	description="Masukkan alasan penolakan pengajuan ini."
	actionLabel="Tolak"
	onAction={() => {
		if (!rejectReason) return alert('Alasan harus diisi');
		(document.getElementById('reject-form') as HTMLFormElement)?.requestSubmit();
	}}
>
	<Textarea
		bind:value={rejectReason}
		placeholder="Contoh: Alat sedang dibutuhkan untuk operasi lain..."
		required
	/>
</ConfirmationDialog>

<ConfirmationDialog
	bind:open={dispatchDialogOpen}
	title="Keluarkan Alat dari Gudang"
	description="Alat-alat berikut akan dikeluarkan dari gudang asal masing-masing dan berstatus {equipmentStatusLabel[
		'TRANSIT'
	]}. Gudang asal ditentukan otomatis dari data alat."
	loading={dispatchLoading}
	onAction={async () => {
		dispatchLoading = true;
		const fd = new FormData();
		fd.append('id', data.lending.id);
		const res = await fetch(`?/dispatch`, { method: 'POST', body: fd });
		const result = await res.json();
		console.log(result);

		dispatchLoading = false;
		dispatchDialogOpen = false;
		notificationMsg = result.data?.message || 'Berhasil';
		notificationType = res.ok ? 'success' : 'error';
		notificationTitle = res.ok ? 'Berhasil!' : 'Gagal!';
		notificationOpen = true;
		if (res.ok) await invalidateAll();
	}}
>
	<div class="mt-3 space-y-2">
		{#each data.lending.items as lendingItem (lendingItem.id)}
			<div class="rounded border px-3 py-2 text-sm">
				<h1 class="font-medium">{lendingItem.equipment?.item?.name ?? '-'}</h1>

				<div class="flex items-center gap-1 text-muted-foreground">
					<Warehouse size={10} />

					{lendingItem.equipment?.warehouse?.name ?? 'Tidak diketahui'}
				</div>
			</div>
		{/each}
	</div>
</ConfirmationDialog>

<ConfirmationDialog
	bind:open={confirmReceiveDialogOpen}
	title="Konfirmasi Penerimaan Alat"
	description="Konfirmasi bahwa semua alat di bawah ini telah diterima dalam kondisi baik."
	loading={confirmReceiveLoading}
	onAction={async () => {
		confirmReceiveLoading = true;
		const fd = new FormData();
		fd.append('id', data.lending.id);
		fd.append('notes', confirmReceiveNotes);
		const res = await fetch(`?/confirmReceive`, { method: 'POST', body: fd });
		const result = await res.json();
		confirmReceiveLoading = false;
		confirmReceiveDialogOpen = false;
		notificationMsg = result.data?.message || 'Berhasil';
		notificationType = res.ok ? 'success' : 'error';
		notificationTitle = res.ok ? 'Berhasil!' : 'Gagal!';
		notificationOpen = true;
		if (res.ok) await invalidateAll();
	}}
>
	<div class="mt-3 space-y-3 text-left">
		{#each data.lending.items as lendingItem (lendingItem.id)}
			<div class="flex items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3 text-sm">
				<PackageCheck class="h-4 w-4 shrink-0 text-success" />
				<span class="font-semibold">{lendingItem.equipment?.item?.name ?? '-'}</span>
				<Badge variant="outline" class="ml-auto font-mono text-[10px]"
					>SN: {lendingItem.equipment?.serialNumber ?? '-'}</Badge
				>
			</div>
		{/each}
		<div class="space-y-2">
			<Label for="confirm-receive-notes">Catatan Penerimaan (Opsional)</Label>
			<Textarea
				id="confirm-receive-notes"
				bind:value={confirmReceiveNotes}
				class="w-full"
				placeholder="Catatan kondisi saat penerimaan..."
			/>
		</div>
	</div>
</ConfirmationDialog>

<ConfirmationDialog
	bind:open={sendBackDialogOpen}
	title="Kirim Kembali"
	description="Tandai bahwa semua alat telah dikirimkan kembali. Operator gudang akan mengkonfirmasi penerimaan."
	loading={sendBackLoading}
	onAction={async () => {
		sendBackLoading = true;
		const fd = new FormData();
		fd.append('id', data.lending.id);
		fd.append('notes', sendBackNotes);
		const res = await fetch(`?/sendBack`, { method: 'POST', body: fd });
		const result = await res.json();

		// SvelteKit action fetch result parsing
		let message = 'Berhasil';
		try {
			const actionData = JSON.parse(result.data);
			// Data usually looks like ["success", {"message": "..."}] or similar depending on version/config
			message = actionData[1]?.message || actionData?.message || 'Berhasil';
		} catch (e) {
			console.error('Error parsing action data:', e);
		}

		sendBackLoading = false;
		sendBackDialogOpen = false;
		notificationMsg = message;
		notificationType = res.ok ? 'success' : 'error';
		notificationTitle = res.ok ? 'Berhasil!' : 'Gagal!';
		notificationOpen = true;
		if (res.ok) await invalidateAll();
	}}
>
	<div class="mt-3 space-y-2 text-left">
		<Label for="send-back-notes">Catatan Pengiriman (Opsional)</Label>
		<Textarea
			id="send-back-notes"
			bind:value={sendBackNotes}
			class="w-full"
			placeholder="Misal: semua alat kondisi baik, dikirim via kurir internal..."
		/>
	</div>
</ConfirmationDialog>

<ConfirmationDialog
	bind:open={confirmReturnDialogOpen}
	title="Konfirmasi Penerimaan Kembali"
	description="Periksa kondisi setiap alat. Tandai alat yang kondisinya berubah setelah pemakaian."
	loading={confirmReturnLoading}
	onAction={async () => {
		confirmReturnLoading = true;
		const fd = new FormData();
		fd.append('id', data.lending.id);
		fd.append('notes', confirmReturnNotes);
		fd.append('conditionOverrides', JSON.stringify(conditionOverrides));
		const res = await fetch(`?/confirmReturn`, { method: 'POST', body: fd });
		const result = await res.json();
		confirmReturnLoading = false;
		confirmReturnDialogOpen = false;
		notificationMsg = result.data?.message || 'Berhasil';
		notificationType = res.ok ? 'success' : 'error';
		notificationTitle = res.ok ? 'Berhasil!' : 'Gagal!';
		notificationOpen = true;
		if (res.ok) await invalidateAll();
	}}
>
	<div class="mt-3 space-y-3 text-left">
		{#each data.lending.items as lendingItem (lendingItem.id)}
			{@const eqId = lendingItem.equipment?.id ?? ''}
			{@const currentOverride = conditionOverrides.find((o) => o.equipmentId === eqId)}
			{@const displayCondition =
				currentOverride?.condition ?? lendingItem.equipment?.condition ?? 'BAIK'}
			<div class="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
				<div class="flex items-center justify-between">
					<span class="font-semibold">{lendingItem.equipment?.item?.name ?? '-'}</span>
					<Badge variant="outline" class="font-mono text-[10px]"
						>SN: {lendingItem.equipment?.serialNumber ?? '-'}</Badge
					>
				</div>
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-2">
						{#if displayCondition !== 'BAIK'}
							<AlertTriangle class="h-4 w-4 shrink-0 text-amber-500" />
						{/if}
						<Label for="condition-{eqId}" class="text-xs text-muted-foreground"
							>Kondisi kembali:</Label
						>
					</div>
					<div class="w-40">
						<Select.Root
							type="single"
							value={displayCondition}
							onValueChange={(val) => {
								conditionOverrides = conditionOverrides.filter((o) => o.equipmentId !== eqId);
								if (val !== lendingItem.equipment?.condition) {
									conditionOverrides = [
										...conditionOverrides,
										{ equipmentId: eqId, condition: val }
									];
								}
							}}
						>
							<Select.Trigger class="h-8 text-xs">
								{displayCondition === 'BAIK'
									? 'Baik'
									: displayCondition === 'RUSAK_RINGAN'
										? 'Rusak Ringan'
										: 'Rusak Berat'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="BAIK">Baik</Select.Item>
								<Select.Item value="RUSAK_RINGAN">Rusak Ringan</Select.Item>
								<Select.Item value="RUSAK_BERAT">Rusak Berat</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</div>
			</div>
		{/each}
		<div class="space-y-2">
			<Label for="confirm-return-notes">Catatan Penerimaan (Opsional)</Label>
			<Textarea
				id="confirm-return-notes"
				bind:value={confirmReturnNotes}
				class="w-full"
				placeholder="Catatan tambahan mengenai kondisi pengembalian..."
			/>
		</div>
	</div>
</ConfirmationDialog>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Terjadi Kesalahan'}
	description={notificationMsg}
	onAction={() => (notificationOpen = false)}
/>
