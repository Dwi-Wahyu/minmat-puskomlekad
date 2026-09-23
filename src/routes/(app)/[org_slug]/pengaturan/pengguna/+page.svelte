<script lang="ts">
	import type { PageData } from './$types';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import {
		UserRound,
		Settings2,
		ShieldCheck,
		Mail,
		Search,
		RotateCcw,
		Users,
		Building2,
		UserCheck
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedOrgId = $state('ALL');
	let selectedRole = $state('ALL');

	const roleOptions = [
		{ value: 'ALL', label: 'Semua Role' },
		{ value: 'superadmin', label: 'Superadmin' },
		{ value: 'pimpinan', label: 'Pimpinan' },
		{ value: 'kakomlek', label: 'Kakomlek' },
		{ value: 'operatorPusatDanDaerah', label: 'Operator Pusat & Daerah' },
		{ value: 'operatorBinmatDanBekharrah', label: 'Operator Binmat & Bekharrah' },
		{ value: 'kepalaGudang', label: 'Kepala Gudang' }
	];

	const roleLabels: Record<string, string> = {
		superadmin: 'Superadmin',
		pimpinan: 'Pimpinan',
		kakomlek: 'Kakomlek',
		operatorPusatDanDaerah: 'Operator Pusat & Daerah',
		operatorBinmatDanBekharrah: 'Operator Binmat & Bekharrah',
		kepalaGudang: 'Kepala Gudang',
		user: 'User'
	};

	function getRoleBadgeStyle(role: string) {
		switch (role) {
			case 'superadmin':
				return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900';
			case 'pimpinan':
				return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900';
			case 'kakomlek':
				return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900';
			case 'operatorPusatDanDaerah':
				return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900';
			case 'operatorBinmatDanBekharrah':
				return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900';
			case 'kepalaGudang':
				return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900';
			default:
				return 'bg-secondary text-secondary-foreground';
		}
	}

	const selectedOrgLabel = $derived(
		selectedOrgId === 'ALL'
			? `Semua Kesatuan (${data.organizations.length})`
			: data.organizations.find((o) => o.id === selectedOrgId)?.name || 'Pilih Kesatuan'
	);

	const selectedRoleLabel = $derived(
		roleOptions.find((r) => r.value === selectedRole)?.label || 'Pilih Role'
	);

	const filteredUsers = $derived(
		data.users.filter((u) => {
			// Search filter
			const q = searchQuery.toLowerCase().trim();
			const matchesSearch =
				!q ||
				u.name.toLowerCase().includes(q) ||
				u.username.toLowerCase().includes(q) ||
				u.email.toLowerCase().includes(q) ||
				u.organizationName.toLowerCase().includes(q);

			// Org filter (hanya aktif untuk Superadmin)
			const matchesOrg = !data.isSuperAdmin || selectedOrgId === 'ALL' || u.organizationId === selectedOrgId;

			// Role filter
			const matchesRole = selectedRole === 'ALL' || u.role === selectedRole;

			return matchesSearch && matchesOrg && matchesRole;
		})
	);

	const activeUsersCount = $derived(data.users.filter((u) => u.lastLogin !== null).length);

	function resetFilters() {
		searchQuery = '';
		selectedOrgId = 'ALL';
		selectedRole = 'ALL';
	}
</script>

<div class="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
	<!-- Header -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight md:text-3xl">Manajemen Pengguna</h1>
			<p class="text-muted-foreground text-sm md:text-base">
				{#if data.isSuperAdmin}
					Cari dan kelola seluruh akun pengguna di semua kesatuan/organisasi dalam aplikasi.
				{:else}
					Kelola semua pengguna dalam organisasi {data.orgName}.
				{/if}
			</p>
		</div>
	</div>

	{#if data.isSuperAdmin}
	<!-- Superadmin Statistics Cards -->
	<div class="grid gap-4 sm:grid-cols-3">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Total Pengguna</Card.Title>
				<Users class="h-4 w-4 text-primary" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.users.length}</div>
				<p class="text-xs text-muted-foreground mt-1">Terdaftar di seluruh kesatuan</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">Total Kesatuan</Card.Title>
				<Building2 class="h-4 w-4 text-primary" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.organizations.length}</div>
				<p class="text-xs text-muted-foreground mt-1">Organisasi/Satuan terdaftar</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">User Aktif Login</Card.Title>
				<UserCheck class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{activeUsersCount}</div>
				<p class="text-xs text-muted-foreground mt-1">Pernah memiliki sesi login</p>
			</Card.Content>
		</Card.Root>
	</div>
{/if}

<!-- Search & Filters -->
<div class="flex flex-col gap-4 lg:flex-row lg:items-center">
			<!-- Search Input -->
			<div class="relative flex-1">
				<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					placeholder={data.isSuperAdmin ? "Cari nama, username, email, atau kesatuan..." : "Cari nama, username, atau email..."}
					class="pl-9"
					bind:value={searchQuery}
				/>
			</div>

			<!-- Organization Filter (SearchableSelect untuk Superadmin) -->
			{#if data.isSuperAdmin}
				<div class="w-full lg:w-64">
					<SearchableSelect.Root type="single" bind:value={selectedOrgId}>
						<SearchableSelect.Trigger class="w-full truncate">
							<Building2 class="mr-2 h-4 w-4 shrink-0 opacity-50" />
							<span class="truncate">{selectedOrgLabel}</span>
						</SearchableSelect.Trigger>
						<SearchableSelect.Content>
							<SearchableSelect.Item value="ALL" label="Semua Kesatuan">
								Semua Kesatuan ({data.organizations.length})
							</SearchableSelect.Item>
							{#each data.organizations as org (org.id)}
								<SearchableSelect.Item value={org.id} label={org.name}>
									{org.name}
								</SearchableSelect.Item>
							{/each}
						</SearchableSelect.Content>
					</SearchableSelect.Root>
				</div>
			{/if}

			<!-- Role Filter -->
			<div class="w-full lg:w-56">
				<Select.Root type="single" bind:value={selectedRole}>
					<Select.Trigger class="w-full truncate">
						{selectedRoleLabel}
					</Select.Trigger>
					<Select.Content>
						{#each roleOptions as opt (opt.value)}
							<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Reset Filter Button -->
			{#if searchQuery || selectedOrgId !== 'ALL' || selectedRole !== 'ALL'}
				<Button variant="ghost" size="sm" onclick={resetFilters} class="gap-2 text-muted-foreground">
					<RotateCcw class="h-4 w-4" />
					Reset Filter
				</Button>
			{/if}
		</div>

	<!-- Users Table Card -->
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between">
			<div>
				<Card.Title class="text-lg font-semibold">Daftar Pengguna</Card.Title>
				<Card.Description>
					Menampilkan {filteredUsers.length} dari {data.users.length} total pengguna.
				</Card.Description>
			</div>
		</Card.Header>
		<Card.Content class="p-0 overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="pl-6">Pengguna</Table.Head>
						<Table.Head>Email</Table.Head>
						{#if data.isSuperAdmin}
							<Table.Head>Kesatuan / Organisasi</Table.Head>
						{/if}
						<Table.Head>Role</Table.Head>
						<Table.Head>Login Terakhir</Table.Head>
						<Table.Head class="text-right pr-6">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if filteredUsers.length === 0}
						<Table.Row>
							<Table.Cell colspan={data.isSuperAdmin ? 6 : 5} class="py-12 text-center text-muted-foreground">
								<div class="flex flex-col items-center justify-center gap-2">
									<UserRound class="h-8 w-8 text-muted-foreground/50" />
									<p class="font-medium">Tidak ada pengguna yang ditemukan.</p>
									<p class="text-xs">Coba sesuaikan kata kunci atau filter pencarian Anda.</p>
									{#if searchQuery || selectedOrgId !== 'ALL' || selectedRole !== 'ALL'}
										<Button variant="outline" size="sm" onclick={resetFilters} class="mt-2 gap-2">
											<RotateCcw class="h-3.5 w-3.5" />
											Reset Filter
										</Button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each filteredUsers as userItem (userItem.id)}
							<Table.Row>
								<!-- Pengguna -->
								<Table.Cell class="pl-6">
									<div class="flex items-center gap-3">
										<div
											class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted"
										>
											{#if userItem.image}
												<img
													src={userItem.image}
													alt={userItem.name}
													class="h-full w-full object-cover"
												/>
											{:else}
												<UserRound class="h-5 w-5 text-muted-foreground" />
											{/if}
										</div>
										<div class="flex flex-col">
											<div class="flex items-center gap-2">
												<span class="font-medium text-foreground">{userItem.name}</span>
												{#if userItem.isCurrentUser}
													<Badge variant="outline" class="text-[10px] text-primary border-primary/30">
														Anda
													</Badge>
												{/if}
											</div>
											<span class="text-xs text-muted-foreground">@{userItem.username}</span>
										</div>
									</div>
								</Table.Cell>

								<!-- Email -->
								<Table.Cell>
									<div class="flex items-center gap-1.5 text-sm text-muted-foreground">
										<Mail class="h-3.5 w-3.5 shrink-0" />
										<span>{userItem.email}</span>
									</div>
								</Table.Cell>

								<!-- Kesatuan / Organisasi (Khusus Superadmin) -->
								{#if data.isSuperAdmin}
									<Table.Cell>
										<div class="flex flex-col">
											<span class="font-medium text-sm">{userItem.organizationName}</span>
											{#if userItem.organizationSlug}
												<span class="text-xs text-muted-foreground">{userItem.organizationSlug}</span>
											{/if}
										</div>
									</Table.Cell>
								{/if}

								<!-- Role -->
								<Table.Cell>
									<Badge variant="outline" class="text-xs font-semibold px-2.5 py-0.5 border {getRoleBadgeStyle(userItem.role)}">
										{roleLabels[userItem.role] || userItem.role}
									</Badge>
								</Table.Cell>

								<!-- Login Terakhir -->
								<Table.Cell>
									<div class="text-xs text-muted-foreground">
										{#if userItem.lastLogin}
											{new Date(userItem.lastLogin).toLocaleString('id-ID', {
												day: 'numeric',
												month: 'short',
												year: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})}
										{:else}
											<span class="italic opacity-60">Belum pernah login</span>
										{/if}
									</div>
								</Table.Cell>

								<!-- Aksi -->
								<Table.Cell class="text-right pr-6">
									<Button
										variant="outline"
										size="sm"
										href="/{data.orgSlug}/pengaturan/pengguna/{userItem.id}"
										class="gap-1.5"
									>
										<Settings2 class="h-4 w-4" />
										Pengaturan
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
