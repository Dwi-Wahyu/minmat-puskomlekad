<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { ArrowLeft, Save } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { yup } from 'sveltekit-superforms/adapters';
	import { maintenanceMutationSchema } from '$lib/schemas/maintenance-mutation-schema';
	import { maintenanceStatusLabel, maintenanceTypeLabel } from '$lib/enums/maintenance-enum';
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	const {
		form,
		errors,
		enhance: superEnhance,
		delayed
	} = superForm(
		untrack(() => data.form),
		{
			validators: yup(maintenanceMutationSchema),
			dataType: 'json',
			onUpdated: ({ form }) => {
				if (form.message) {
					if (form.valid) {
						showSuccessNotification(form.message);
					} else {
						showErrorNotification(form.message);
					}
				}
			}
		}
	);

	// Transform datetime strings back to local format for inputs (YYYY-MM-DDThh:mm)
	let localScheduledDate = $state('');
	let localCompletionDate = $state('');

	$effect(() => {
		if ($form.scheduledDate) {
			localScheduledDate = $form.scheduledDate.slice(0, 16);
		}
		if ($form.completionDate) {
			localCompletionDate = $form.completionDate.slice(0, 16);
		}
	});

	// When local inputs change, update the form store
	function updateScheduledDate(e: Event) {
		const target = e.target as HTMLInputElement;
		localScheduledDate = target.value;
		$form.scheduledDate = target.value ? new Date(target.value).toISOString() : '';
	}

	function updateCompletionDate(e: Event) {
		const target = e.target as HTMLInputElement;
		localCompletionDate = target.value;
		$form.completionDate = target.value ? new Date(target.value).toISOString() : null;
	}

	// State untuk dialog notifikasi
	let showNotification = $state(false);
	let notificationType: 'success' | 'error' | 'info' = $state('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');
	let notificationActionLabel = $state('OK');

	const maintenanceTypes = Object.entries(maintenanceTypeLabel).map(([value, label]) => ({
		value,
		label
	}));
	const statusOptions = Object.entries(maintenanceStatusLabel).map(([value, label]) => ({
		value,
		label
	}));

	// Handler untuk menampilkan notifikasi
	function showSuccessNotification(message?: string) {
		notificationType = 'success';
		notificationTitle = 'Berhasil Diperbarui!';
		notificationDescription = message || 'Perubahan data pemeliharaan berhasil disimpan.';
		notificationActionLabel = 'Selesai';
		showNotification = true;
	}

	function showErrorNotification(message: string) {
		notificationType = 'error';
		notificationTitle = 'Gagal Memperbarui!';
		notificationDescription = message || 'Terjadi kesalahan saat menyimpan perubahan.';
		notificationActionLabel = 'Coba Lagi';
		showNotification = true;
	}

	// Handler untuk aksi setelah notifikasi
	function handleNotificationAction() {
		showNotification = false;
		if (notificationType === 'success') {
			goto(resolve('/(app)/[org_slug]/pemeliharaan', { org_slug: data.org_slug }));
		}
	}

	const equipmentName = $derived(
		`${data.maintenance.equipment?.item?.name || 'Tanpa Nama'} ${data.maintenance.equipment?.serialNumber ? `(${data.maintenance.equipment.serialNumber})` : ''}`
	);
</script>

<svelte:head>
	<title>Edit Pemeliharaan | MINMAT</title>
</svelte:head>

<div class="space-y-6 p-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button
				variant="outline"
				size="icon"
				href="/{data.org_slug}/pemeliharaan"
				class="rounded-full shadow-sm"
			>
				<ArrowLeft size={18} />
			</Button>
			<div>
				<h1 class="flex items-center gap-2 text-2xl font-bold text-foreground">
					Edit Pemeliharaan
				</h1>
				<p class="text-sm text-muted-foreground">Perbarui detail jadwal pemeliharaan peralatan</p>
			</div>
		</div>
	</div>

	<Card.Root class="overflow-hidden">
		<Card.Content>
			<form method="POST" use:superEnhance class="space-y-6">
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<!-- Equipment Info (Read Only) -->
					<div class="space-y-2 md:col-span-2">
						<Label for="equipment">Alat</Label>
						<Input id="equipment" value={equipmentName} readonly disabled />
						<input type="hidden" name="equipmentIds" value={data.maintenance.equipmentId} />
					</div>

					<!-- Tipe -->
					<div class="space-y-2">
						<Label for="maintenanceType"
							>Tipe Pemeliharaan
							<span class="text-red-500">*</span>
						</Label>
						<Select.Root type="single" bind:value={$form.maintenanceType}>
							<Select.Trigger class="w-full">
								{maintenanceTypeLabel[$form.maintenanceType] || 'Pilih Tipe'}
							</Select.Trigger>
							<Select.Content>
								{#each maintenanceTypes as type (type.value)}
									<Select.Item value={type.value}>{type.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						{#if $errors.maintenanceType}
							<p class="text-sm text-destructive">{$errors.maintenanceType}</p>
						{/if}
					</div>

					<!-- Tanggal Jadwal -->
					<div class="space-y-2">
						<Label for="scheduledDate">
							Tanggal Jadwal
							<span class="text-red-500">*</span>
						</Label>
						<Input
							id="scheduledDate"
							name="scheduledDate"
							type="datetime-local"
							value={localScheduledDate}
							oninput={updateScheduledDate}
						/>
						{#if $errors.scheduledDate}
							<p class="text-sm text-destructive">{$errors.scheduledDate}</p>
						{/if}
					</div>

					<!-- Status -->
					<div class="space-y-2">
						<Label for="status">
							Status
							<span class="text-red-500">*</span>
						</Label>
						<Select.Root type="single" bind:value={$form.status}>
							<Select.Trigger class="w-full">
								{maintenanceStatusLabel[$form.status] || 'Pilih Status'}
							</Select.Trigger>
							<Select.Content>
								{#each statusOptions as status (status.value)}
									<Select.Item value={status.value}>{status.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						{#if $errors.status}
							<p class="text-sm text-destructive">{$errors.status}</p>
						{/if}
					</div>

					<!-- Tanggal Selesai -->
					<div class="space-y-2">
						<Label for="completionDate">Tanggal Selesai</Label>
						<Input
							id="completionDate"
							name="completionDate"
							type="datetime-local"
							value={localCompletionDate}
							oninput={updateCompletionDate}
						/>
						{#if $errors.completionDate}
							<p class="text-sm text-destructive">{$errors.completionDate}</p>
						{/if}
					</div>
				</div>

				<!-- Deskripsi -->
				<div class="space-y-2">
					<Label for="description">Deskripsi Pekerjaan</Label>
					<Textarea
						id="description"
						name="description"
						bind:value={$form.description}
						rows={4}
						class="resize-none rounded-xl border-border"
						placeholder="Jelaskan detail pemeliharaan..."
					/>
					{#if $errors.description}
						<p class="text-sm text-destructive">{$errors.description}</p>
					{/if}
				</div>

				<div class="flex justify-end gap-3">
					<Button variant="outline" href="/{data.org_slug}/pemeliharaan">Batal</Button>
					<Button type="submit" disabled={$delayed}>
						<Save size={18} />
						Simpan Perubahan
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Notification Dialog -->
	<NotificationDialog
		bind:open={showNotification}
		type={notificationType}
		title={notificationTitle}
		description={notificationDescription}
		actionLabel={notificationActionLabel}
		onAction={handleNotificationAction}
	/>
</div>
