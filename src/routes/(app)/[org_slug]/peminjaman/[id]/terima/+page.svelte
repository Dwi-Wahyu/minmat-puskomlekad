<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { ChevronLeft, PackageCheck, ClipboardCheck, Info } from '@lucide/svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import Alert from '@/components/ui/alert/alert.svelte';
	import { resolve } from '$app/paths';
	import { AlertDescription } from '@/components/ui/alert';

	let { data } = $props();

	let loading = $state(false);
	let notes = $state('');

	// Notification State
	let notificationOpen = $state(false);
	let notificationType = $state<'success' | 'error' | 'info'>('success');
	let notificationTitle = $state('');
	let notificationMsg = $state('');

	function handleBack() {
		goto(
			resolve('/(app)/[org_slug]/peminjaman/[id]', {
				org_slug: data.org_slug,
				id: data.lending.id
			})
		);
	}
</script>

<div class="flex flex-col gap-6 p-4 md:p-8">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div class="flex flex-col gap-1">
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon" onclick={handleBack} class="h-8 w-8 rounded-full">
					<ChevronLeft class="h-4 w-4" />
				</Button>
				<h1 class="text-2xl font-bold tracking-tight">Konfirmasi Penerimaan Alat</h1>
			</div>
			<p class="ml-10 text-muted-foreground">
				Konfirmasi bahwa unit <strong>{data.lending.unit}</strong> telah menerima alat-alat berikut.
			</p>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Alat List -->
		<div class="space-y-4 lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<PackageCheck class="h-5 w-5 text-success" />
						Daftar Alat yang Diterima
					</Card.Title>
					<Card.Description>Periksa Serial Number (SN) alat sebelum konfirmasi.</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-3">
						{#each data.lending.items as item (item.id)}
							<div class="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
								<div class="flex flex-col gap-1">
									<span class="font-semibold">{item.equipment?.item?.name ?? '-'}</span>
									<span class="text-xs text-muted-foreground"
										>Brand: {item.equipment?.brand ?? '-'}</span
									>
								</div>
								<Badge variant="secondary" class="font-mono"
									>SN: {item.equipment?.serialNumber ?? '-'}</Badge
								>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Form Actions -->
		<div class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<ClipboardCheck class="h-5 w-5" />
						Aksi Konfirmasi
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="notes">Catatan Penerimaan (Opsional)</Label>
						<Textarea
							id="notes"
							bind:value={notes}
							placeholder="Misal: Diterima lengkap, kondisi box sedikit penyok..."
							rows={4}
						/>
					</div>

					<Alert>
						<Info />
						<AlertDescription>
							Dengan menekan tombol di bawah, Anda menyatakan bahwa alat telah diterima dan tanggung
							jawab beralih ke unit peminjam.
						</AlertDescription>
					</Alert>
				</Card.Content>
				<Card.Footer>
					<form
						method="POST"
						action={`/${data.org_slug}/peminjaman/${data.lending.id}/?/confirmReceive`}
						use:enhance={() => {
							loading = true;
							return async ({ result }) => {
								loading = false;
								if (result.type === 'success') {
									notificationType = 'success';
									notificationTitle = 'Penerimaan Berhasil';
									notificationMsg = 'Penerimaan alat telah dikonfirmasi.';
									notificationOpen = true;
								} else {
									notificationType = 'error';
									notificationTitle = 'Gagal';
									notificationMsg = 'Terjadi kesalahan saat konfirmasi penerimaan.';
									notificationOpen = true;
								}
							};
						}}
						class="w-full"
					>
						<input type="hidden" name="id" value={data.lending.id} />
						<input type="hidden" name="notes" value={notes} />
						<Button type="submit" class="w-full gap-2" disabled={loading}>
							{#if loading}
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
								></div>
							{:else}
								<PackageCheck class="h-4 w-4" />
							{/if}
							Konfirmasi Terima Alat
						</Button>
					</form>
				</Card.Footer>
			</Card.Root>
		</div>
	</div>
</div>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationTitle}
	description={notificationMsg}
	onAction={() => {
		notificationOpen = false;
		if (notificationType === 'success') handleBack();
	}}
/>
