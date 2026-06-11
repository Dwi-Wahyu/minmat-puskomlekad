<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import {
		ClipboardCheck,
		AlertTriangle,
		Warehouse,
		Info,
		Loader2,
		ArrowLeft
	} from '@lucide/svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
	import { resolve } from '$app/paths';
	import { equipmentStatusLabel } from '@/enums/equipment-enum';

	let { data }: { data: PageData } = $props();

	const assets = $derived(
		data.lending.items.filter((item) => item.equipment?.item?.type === 'ASSET')
	);
	const consumables = $derived(
		data.lending.items.filter((item) => item.equipment?.item?.type === 'CONSUMABLE')
	);

	let loading = $state(false);
	let notes = $state('');
	let conditionOverrides = $state<{ equipmentId: string; condition: string }[]>([]);

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
					Konfirmasi Penerimaan Kembali
				</h1>
				<p class="text-sm text-muted-foreground">
					Unit <strong>{data.lending.unit}</strong> telah mengirim kembali alat. Periksa kondisi setiap
					item di bawah ini.
				</p>
			</div>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Alat List -->
		<div class="space-y-4 lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Warehouse class="h-5 w-5 text-primary" />
						Pemeriksaan Kondisi Alat
					</Card.Title>
					<Card.Description
						>Periksa SN dan tentukan kondisi setiap alat saat diterima kembali.</Card.Description
					>
				</Card.Header>
				<Card.Content>
					<div class="space-y-6">
						{#if assets.length > 0}
							<div class="space-y-3">
								<h3 class="px-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
									Daftar Alat
								</h3>
								<div class="overflow-hidden rounded-xl border bg-muted/30">
									<Table.Root>
										<Table.Header>
											<Table.Row>
												<Table.Head class="pl-4">Nama Alat</Table.Head>
												<Table.Head>Gudang Asal</Table.Head>
												<Table.Head>Kondisi Kembali</Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#each assets as item (item.id)}
												{@const eqId = item.equipment?.id ?? ''}
												{@const currentOverride = conditionOverrides.find(
													(o) => o.equipmentId === eqId
												)}
												{@const displayCondition =
													currentOverride?.condition ?? item.equipment?.condition ?? 'BAIK'}
												<Table.Row>
													<Table.Cell class="max-w-[20%]">
														<h1 class="text-wrap">
															{item.equipment?.item?.name ?? '-'}
														</h1>
														<Badge variant="outline" class="font-mono text-[10px]">
															{item.equipment?.serialNumber ?? '-'}
														</Badge>
													</Table.Cell>
													<Table.Cell class="text-xs text-muted-foreground">
														{item.equipment?.warehouse?.name ?? 'Tidak diketahui'}
													</Table.Cell>
													<Table.Cell class="pr-4">
														<div class="flex items-center justify-end gap-2">
															{#if displayCondition !== 'BAIK'}
																<AlertTriangle class="h-3 w-3 shrink-0 text-amber-500" />
															{/if}
															<div>
																<Select.Root
																	type="single"
																	value={displayCondition}
																	onValueChange={(val) => {
																		conditionOverrides = conditionOverrides.filter(
																			(o) => o.equipmentId !== eqId
																		);
																		if (val !== item.equipment?.condition) {
																			conditionOverrides = [
																				...conditionOverrides,
																				{ equipmentId: eqId, condition: val }
																			];
																		}
																	}}
																>
																	<Select.Trigger>
																		{displayCondition === 'BAIK'
																			? 'Baik'
																			: displayCondition === 'RUSAK_RINGAN'
																				? 'Rusak Ringan'
																				: 'Rusak Berat'}
																	</Select.Trigger>
																	<Select.Content>
																		<Select.Item value="BAIK" class="text-xs">Baik</Select.Item>
																		<Select.Item value="RUSAK_RINGAN" class="text-xs"
																			>Rusak Ringan</Select.Item
																		>
																		<Select.Item value="RUSAK_BERAT" class="text-xs"
																			>Rusak Berat</Select.Item
																		>
																	</Select.Content>
																</Select.Root>
															</div>
														</div>
													</Table.Cell>
												</Table.Row>
											{/each}
										</Table.Body>
									</Table.Root>
								</div>
							</div>
						{/if}

						{#if consumables.length > 0}
							<div class="space-y-3 pt-2">
								<h3 class="px-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
									Daftar Bahan (Consumable)
								</h3>
								<div class="overflow-hidden rounded-xl border bg-muted/30">
									<Table.Root>
										<Table.Header>
											<Table.Row>
												<Table.Head class="pl-4">Nama Bahan</Table.Head>
												<Table.Head class="pr-4 text-right">Tipe</Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#each consumables as item (item.id)}
												<Table.Row>
													<Table.Cell class="pl-4 font-medium">
														{item.equipment?.item?.name ?? '-'}
													</Table.Cell>
													<Table.Cell class="pr-4 text-right">
														<Badge variant="outline" class="bg-background text-[10px] uppercase"
															>Consumable</Badge
														>
													</Table.Cell>
												</Table.Row>
											{/each}
										</Table.Body>
									</Table.Root>
								</div>
							</div>
						{/if}
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
						Finalisasi Pengembalian
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="notes">Catatan Pengembalian</Label>
						<Textarea
							id="notes"
							bind:value={notes}
							placeholder="Catatan tambahan mengenai kondisi fisik, kelengkapan kabel, dsb..."
							rows={4}
						/>
					</div>

					<Alert>
						<Info class="size-4" />
						<AlertDescription>
							Pastikan semua alat telah masuk kembali ke gudang fisik sebelum menekan tombol di
							bawah. Status alat akan kembali menjadi <strong
								>{equipmentStatusLabel['READY']}</strong
							>.
						</AlertDescription>
					</Alert>
				</Card.Content>
				<Card.Footer>
					<form
						method="POST"
						action="?/confirmReturn"
						use:enhance={() => {
							loading = true;
							return async ({ result }) => {
								loading = false;
								if (result.type === 'success') {
									notificationType = 'success';
									notificationTitle = 'Pengembalian Berhasil';
									notificationMsg = 'Alat telah diterima kembali di gudang.';
									notificationOpen = true;
								} else if (result.type === 'failure') {
									notificationType = 'error';
									notificationTitle = 'Gagal';
									notificationMsg = 'Terjadi kesalahan saat konfirmasi pengembalian.';
									notificationOpen = true;
								} else {
									notificationType = 'error';
									notificationTitle = 'Gagal';
									notificationMsg = 'Terjadi kesalahan server.';
									notificationOpen = true;
								}
							};
						}}
						class="w-full"
					>
						<input type="hidden" name="id" value={data.lending.id} />
						<input type="hidden" name="notes" value={notes} />
						<input
							type="hidden"
							name="conditionOverrides"
							value={JSON.stringify(conditionOverrides)}
						/>
						<Button type="submit" class="w-full" disabled={loading}>
							{#if loading}
								<Loader2 class="animate-spin" />
							{:else}
								<ClipboardCheck class="mr-2 size-4" />
							{/if}
							Konfirmasi Terima Kembali
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
