<script lang="ts">
	import { Bell, X } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { invalidateAll, goto } from '$app/navigation';
	import { cn } from '$lib/utils';
	import { notificationPriorityColor, notificationPriorityLabel } from '@/enums/notification-enum';
	import Badge from './ui/badge/badge.svelte';

	type NotificationAction = {
		type?: string;
		resourceId?: string;
		webPath?: string;
		mobilePath?: string;
	};

	type Notification = {
		id: string;
		title: string;
		body: string;
		priority: 'LOW' | 'MEDIUM' | 'HIGH';
		read: boolean;
		createdAt: Date | string;
		action?: NotificationAction | null;
	};

	let {
		notifications = [] as Notification[],
		unreadCount = 0,
		organizationId = '',
		orgSlug = ''
	} = $props();

	let dropdownOpen = $state(false);

	function formatRelativeTime(date: Date | string | number) {
		const now = new Date().getTime();
		const diff = now - new Date(date).getTime();

		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days} hari yang lalu`;
		if (hours > 0) return `${hours} jam yang lalu`;
		if (minutes > 0) return `${minutes} menit yang lalu`;
		return 'Baru saja';
	}

	async function markAsRead(e: MouseEvent, id: string) {
		e.stopPropagation();
		const res = await fetch('/api/notifications', {
			method: 'PATCH',
			body: JSON.stringify({ id }),
			headers: { 'Content-Type': 'application/json' }
		});
		if (res.ok) {
			invalidateAll();
		}
	}

	async function clearNotification(e: MouseEvent, id: string) {
		e.stopPropagation();
		const res = await fetch('/api/notifications', {
			method: 'DELETE',
			body: JSON.stringify({ id }),
			headers: { 'Content-Type': 'application/json' }
		});
		if (res.ok) {
			invalidateAll();
		}
	}

	async function clearAll(e: MouseEvent) {
		e.stopPropagation();
		const res = await fetch('/api/notifications', {
			method: 'DELETE',
			body: JSON.stringify({ clearAll: true, organizationId }),
			headers: { 'Content-Type': 'application/json' }
		});
		if (res.ok) {
			invalidateAll();
		}
	}

	async function handleNotificationClick(notif: Notification) {
		if (!notif.action?.webPath) return;

		// Tutup dropdown terlebih dahulu agar tidak berlomba dengan goto()
		dropdownOpen = false;

		if (!notif.read) {
			await fetch('/api/notifications', {
				method: 'PATCH',
				body: JSON.stringify({ id: notif.id }),
				headers: { 'Content-Type': 'application/json' }
			});
			invalidateAll();
		}

		goto(notif.action.webPath);
	}
</script>

<DropdownMenu.Root bind:open={dropdownOpen}>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button variant="ghost" size="icon" class="relative h-10 w-10 rounded-full" {...props}>
				<Bell class="h-5 w-5" />
				{#if unreadCount > 0}
					<span
						class="text-destructive-foreground absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold"
					>
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				{/if}
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-80 overflow-hidden p-0">
		<div class="flex items-center justify-between border-b p-4">
			<h3 class="text-sm font-semibold">Notifikasi</h3>
			{#if notifications.length > 0}
				<Button
					variant="ghost"
					size="sm"
					class="h-auto p-0 text-xs text-primary hover:bg-transparent"
					onclick={(e) => clearAll(e)}
				>
					Hapus Semua
				</Button>
			{/if}
		</div>

		<div
			class="max-h-100 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
		>
			{#if notifications.length === 0}
				<div class="flex flex-col items-center justify-center px-4 py-10 text-center">
					<div class="mb-2 rounded-full bg-muted p-3">
						<Bell class="h-6 w-6 text-muted-foreground opacity-20" />
					</div>
					<p class="text-sm font-medium text-muted-foreground">Tidak ada notifikasi</p>
					<p class="mt-1 text-xs text-muted-foreground/60">
						Semua notifikasi baru akan muncul di sini
					</p>
				</div>
			{:else}
				{#each notifications as notif (notif.id)}
					<DropdownMenu.Item
						closeOnSelect={false}
						class={cn(
							'relative flex cursor-pointer flex-col items-start gap-1 rounded-none border-b p-4 transition-colors last:border-0 focus:bg-muted/50 data-[highlighted]:bg-muted/50',
							!notif.read && 'bg-primary/5'
						)}
						onclick={() => handleNotificationClick(notif)}
					>
						<div class="flex w-full items-start justify-between gap-2">
							<div class="flex flex-col gap-1 overflow-hidden">
								<div class="flex items-center gap-2">
									<Badge class={cn(notificationPriorityColor[notif.priority])}>
										{notificationPriorityLabel[notif.priority]}
									</Badge>
									<span class="truncate text-xs text-muted-foreground">
										{formatRelativeTime(notif.createdAt)}
									</span>
								</div>
								<h4 class="truncate text-sm leading-tight font-semibold text-foreground">
									{notif.title}
								</h4>
							</div>
							<div class="flex items-center">
								<button
									class="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
									title="Hapus"
									onclick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										clearNotification(e, notif.id);
									}}
								>
									<X class="h-3.5 w-3.5" />
								</button>
							</div>
						</div>
						<p class="line-clamp-2 w-full text-left text-sm text-muted-foreground">
							{notif.body}
						</p>
					</DropdownMenu.Item>
				{/each}
			{/if}
		</div>

		{#if notifications.length > 0}
			<div class="border-top bg-muted/20 p-2">
				<Button
					variant="ghost"
					class="h-8 w-full text-xs font-medium"
					size="sm"
					href="/{orgSlug}/notifikasi"
				>
					Tampilkan Semua
				</Button>
			</div>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
