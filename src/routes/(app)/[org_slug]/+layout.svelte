<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import NotificationBell from '$lib/components/NotificationBell.svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { LogOut, Menu, User } from '@lucide/svelte';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { goto } from '$app/navigation';
	import * as Button from '$lib/components/ui/button/index.js';
	import { setSidebarState } from '@/components/ui/sidebar/context.svelte.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { BookText } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	let { data, children } = $props();
	const sidebar = setSidebarState();

	let isLogoutDialogOpen = $state(false);
	let onboardingOpen = $state(false);

	$effect(() => {
		const seen = localStorage.getItem(`guide_book_popup_seen_${data.user.id}`);
		if (!seen) {
			onboardingOpen = true;
		}

		console.log(data.user);
	});

	const toTitleCase = (str: string) => {
		return str
			.toLowerCase()
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	const orgName = $derived(data.user.organization.name ?? '');

	function handleLogout() {
		goto(resolve('/logout'));
	}

	function handleCloseOnboarding() {
		localStorage.setItem(`guide_book_popup_seen_${data.user.id}`, 'true');
		onboardingOpen = false;
	}

	function handleGoToGuideBook() {
		handleCloseOnboarding();
		goto(resolve('/(app)/[org_slug]/guide-book', { org_slug: data.user.organization.slug }));
	}
</script>

<div class="flex h-screen overflow-hidden bg-background">
	<Sidebar user={data.user} />

	<main class="flex flex-1 flex-col overflow-hidden">
		<header
			class="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/50 px-8 shadow transition-all duration-300"
		>
			<div class="flex items-center gap-4">
				<button
					onclick={() => sidebar.toggle()}
					class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
					title="Toggle Sidebar"
				>
					<Menu size={20} />
				</button>
				<h1 class="hidden text-foreground md:block">{toTitleCase(orgName)}</h1>
			</div>

			<div class="flex items-center gap-3">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class="flex items-center gap-3 outline-none">
						<div class="hidden flex-col items-end md:flex">
							<span class="text-sm font-medium text-foreground">{data.user.name}</span>
							<span class="text-xs text-muted-foreground">{data.user.role}</span>
						</div>
						<Avatar.Root class="h-9 w-9 border border-border">
							<Avatar.Image src="https://github.com/shadcn.png" alt="@shadcn" />
							<Avatar.Fallback>{data.user.name.charAt(0)}</Avatar.Fallback>
						</Avatar.Root>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						<DropdownMenu.Label>Akun Saya</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Group>
							<DropdownMenu.Item>
								<a
									href={resolve(`/(app)/[org_slug]/profil`, {
										org_slug: data.user.organization.slug
									})}
									class="flex w-full items-center gap-2"
								>
									<User class="h-4 w-4" />
									<span>Profil</span>
								</a>
							</DropdownMenu.Item>
						</DropdownMenu.Group>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={() => (isLogoutDialogOpen = true)} variant="destructive">
							<LogOut />
							<span>Keluar</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<NotificationBell
					notifications={data.notifications}
					unreadCount={data.unreadCount}
					organizationId={data.user.organization.id}
					orgSlug={data.user.organization.slug}
				/>
			</div>
		</header>

		<div class="flex-1 overflow-y-auto">
			{@render children()}
		</div>
	</main>
</div>

<ConfirmationDialog
	bind:open={isLogoutDialogOpen}
	type="info"
	title="Konfirmasi Keluar"
	description="Apakah Anda yakin ingin keluar dari sistem? Anda akan diminta login kembali untuk mengakses data."
	actionLabel="Keluar"
	cancelLabel="Batal"
	onAction={handleLogout}
/>

<Dialog.Root bind:open={onboardingOpen}>
	<Dialog.Content class="sm:max-w-106.25" showCloseButton={false}>
		<Dialog.Header class="flex flex-col justify-center text-center">
			<div
				class="mb-4 flex h-12 w-12 items-center justify-center self-center rounded-full bg-primary/10"
			>
				<BookText class="h-6 w-6 text-primary" />
			</div>
			<Dialog.Title>Selamat Datang!</Dialog.Title>
			<Dialog.Description>
				Halo <strong>{data.user.name}</strong>, selamat datang di sistem MINMAT. Untuk memudahkan
				Anda memahami fitur-fitur yang ada, kami menyarankan Anda membaca Panduan Penggunaan (Guide
				Book) terlebih dahulu.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex flex-col gap-2 sm:flex-row">
			<Button.Root variant="outline" onclick={handleCloseOnboarding} class="sm:flex-1">
				Nanti Saja
			</Button.Root>
			<Button.Root onclick={handleGoToGuideBook} class="sm:flex-1">Baca Sekarang</Button.Root>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
