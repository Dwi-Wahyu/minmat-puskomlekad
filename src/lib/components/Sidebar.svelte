<script lang="ts">
	import {
		LayoutDashboard,
		Warehouse,
		FileText,
		Wrench,
		Building2,
		Settings,
		Package,
		X,
		BookText,
		type IconProps
	} from '@lucide/svelte';
	import { page } from '$app/state';
	import SidebarDropdown from './SidebarDropdown.svelte';
	import SidebarLink from './SidebarLink.svelte';
	import { untrack, type Component } from 'svelte';
	import { fade } from 'svelte/transition';
	import { getSidebarState } from './ui/sidebar/context.svelte';

	// Definisikan Interface agar tidak ada error "Property 'role' does not exist"
	interface MenuItem {
		name: string;
		path: string;
		role?: string | string[]; // Dibuat opsional dengan tanda tanya
	}

	interface Menu {
		name: string;
		path: string;
		icon: Component<IconProps>;
		isDropdown: boolean;
		role?: string | string[];
		children: MenuItem[];
	}

	// Definisi props dengan tipe data yang ketat
	let { user } = $props<{
		user: {
			role: string;
			warehouseHeadType?: 'TRANSITO' | 'BALKIR' | 'KOMUNITY' | null;
			organization: {
				slug: string;
				parentId: string | null;
			};
		};
	}>();

	const sidebar = getSidebarState();

	let openDropdown = $state<string | null>(null);

	// Sync openDropdown based on current path ONLY if it's currently null.
	// This ensures we set it on initial load/reload, but allow manual toggles to persist
	// unless the user navigates away.
	$effect(() => {
		const currentPath = page.url.pathname;
		const isSidebarOpen = sidebar.open;

		if (!isSidebarOpen) {
			untrack(() => {
				openDropdown = null;
			});
			return;
		}

		// Temukan menu mana yang sedang aktif berdasarkan URL parent ATAU URL children
		const activeMenu = menus.find(
			(m) =>
				m.isDropdown &&
				(currentPath.startsWith(m.path) ||
					m.children.some((child) => currentPath.startsWith(child.path)))
		);

		untrack(() => {
			if (activeMenu && openDropdown !== activeMenu.name) {
				openDropdown = activeMenu.name;
			}
		});
	});

	// Close sidebar automatically on mobile when route changes
	$effect(() => {
		const _ = page.url.pathname;
		untrack(() => {
			if (typeof window !== 'undefined' && window.innerWidth < 768) {
				sidebar.setOpen(false);
			}
		});
	});

	function getPath(urlPath: string) {
		return `/${user.organization.slug}${urlPath}`;
	}

	/**
	 * Logika Akses:
	 * 1. Jika menu tidak punya role, semua boleh akses.
	 * 2. Jika menu punya role 'parent', hnya boleh diakses jika parentId === null.
	 * 3. Jika menu punya role lain (admin, dll), cek apakah user.role cocok.
	 */
	function hasRole(menuRole: string | string[] | undefined, userRole: string) {
		if (!menuRole) return true;

		const roles = Array.isArray(menuRole) ? menuRole : [menuRole];

		// LOGIKA UTAMA: Cek hak akses 'parent'
		if (roles.includes('parent')) {
			// Jika user punya parentId (artinya dia anak/satker), blokir akses ke menu 'parent'
			if (user.organization.parentId !== null) {
				return false;
			}
		}

		// Cek hak akses 'level2' (hanya untuk organisasi Level 2)
		if (roles.includes('level2')) {
			// Jika user tidak punya parentId (artinya dia Pusat/Level 1), blokir akses ke menu 'level2'
			if (user.organization.parentId === null) {
				return false;
			}
		}

		// Cek role spesifik user (superadmin, kakomlek, dll)
		// Kita filter 'parent' dan 'level2' dari pengecekan role string karena mereka adalah pengecekan struktur org
		const functionalRoles = roles.filter((r) => r !== 'parent' && r !== 'level2');

		// Jika setelah difilter masih ada role lain (seperti 'superadmin')
		if (functionalRoles.length > 0) {
			return functionalRoles.includes(userRole);
		}

		// Jika lolos pengecekan di atas
		return true;
	}

	const rawMenus: Menu[] = [
		{
			name: 'Dashboard',
			path: getPath('/dashboard'),
			icon: LayoutDashboard,
			isDropdown: false,
			children: []
		},
		{
			name: 'Stok Gudang',
			icon: Warehouse,
			isDropdown: true,
			path: getPath('/gudang'),
			children: [
				{ name: 'Gudang Komunity', path: getPath('/stok/komunity') },
				{ name: 'Gudang Transito', path: getPath('/stok/transito') },
				{ name: 'Gudang Balkir', path: getPath('/stok/balkir') }
			]
		},
		{
			name: 'Data Materiil',
			icon: Package,
			path: getPath('/materiil'),
			isDropdown: true,
			children: [
				{ name: 'Alkomlek', path: getPath('/alat/alkomlek') },
				{ name: 'Alpernika & Lek', path: getPath('/alat/alpernika') },
				{ name: 'Barang Habis Pakai', path: getPath('/barang') }
				// { name: 'Import Inventaris', path: getPath('/materiil/import') }
			]
		},
		{
			name: 'Operasional',
			icon: Wrench,
			isDropdown: true,
			path: getPath('/operasional'),
			children: [
				{ name: 'Pemeliharaan', path: getPath('/pemeliharaan') },
				{ name: 'Peminjaman', path: getPath('/peminjaman') },
				{ name: 'Distribusi', path: getPath('/distribusi') }
			]
		},
		{
			name: 'Laporan',
			icon: FileText,
			isDropdown: true,
			path: getPath('/laporan'),
			children: [
				{ name: 'LAP BTK - 16', path: getPath('/laporan/btk-16') },
				{ name: 'LAP PERNIKA & LEK', path: getPath('/laporan/pernika-lek') }
			]
		},
		{
			name: 'Infrastruktur',
			icon: Building2,
			isDropdown: true,
			path: getPath('/fasilitas'),
			role: ['superadmin', 'pimpinan', 'kakomlek'],
			children: [
				{ name: 'Data Tanah', path: getPath('/infrastruktur/tanah') },
				{ name: 'Data Bangunan', path: getPath('/infrastruktur/bangunan') },
				{ name: 'Manajemen Gudang', path: getPath('/infrastruktur/gudang') }
			]
		},
		{
			name: 'Pengaturan',
			icon: Settings,
			isDropdown: true,
			path: getPath('/pengaturan'),
			role: ['superadmin', 'kakomlek', 'owner'],
			children: [
				{
					name: 'Satuan Jajaran',
					path: getPath('/satuan-jajaran'),
					role: ['level2', 'superadmin', 'owner', 'kakomlek']
				},
				{
					name: 'Manajemen Pengguna',
					path: getPath('/pengaturan/pengguna'),
					role: ['superadmin', 'parent', 'owner']
				},
				{ name: 'Audit Log', path: getPath('/audit-log'), role: ['superadmin', 'kakomlek'] }
				// { name: 'Konversi Unit', path: getPath('/konversi-unit') }
			]
		},
		{
			name: 'Guide Book',
			path: getPath('/guide-book'),
			icon: BookText,
			isDropdown: false,
			children: []
		}
	];

	// const menus = $derived(
	// 	rawMenus
	// 		.filter((menu) => hasRole(menu.role, user.role))
	// 		.map((menu) => {
	// 			if (menu.isDropdown) {
	// 				// Filter anak menu berdasarkan role juga
	// 				const filteredChildren = menu.children.filter((child) => hasRole(child.role, user.role));
	// 				return { ...menu, children: filteredChildren };
	// 			}
	// 			return menu;
	// 		})
	// 		// Sembunyikan dropdown jika isinya kosong setelah difilter
	// 		.filter((menu) => !menu.isDropdown || menu.children.length > 0)
	// );

	const menus = $derived(
		rawMenus
			.filter((menu) => hasRole(menu.role, user.role))
			.map((menu) => {
				// LOGIKA DINAMIS KEPALA GUDANG: Bypass dropdown dan arahkan langsung
				if (menu.name === 'Stok Gudang' && user.role === 'kepalaGudang' && user.warehouseHeadType) {
					return {
						...menu,
						isDropdown: false, // Ubah dari dropdown ke single link
						path: getPath(`/stok/${user.warehouseHeadType.toLowerCase()}`),
						children: [] // Kosongkan submenu
					};
				}

				if (menu.isDropdown) {
					// Filter anak menu berdasarkan role juga
					const filteredChildren = menu.children.filter((child) => hasRole(child.role, user.role));
					return { ...menu, children: filteredChildren };
				}
				return menu;
			})
			// Sembunyikan dropdown jika isinya kosong setelah difilter
			.filter((menu) => !menu.isDropdown || menu.children.length > 0)
	);
</script>

{#if sidebar.open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
		onclick={() => sidebar.setOpen(false)}
	></div>
{/if}

<aside
	class="fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-xl transition-all duration-300 ease-in-out md:relative md:translate-x-0"
	class:w-64={sidebar.open}
	class:w-0={!sidebar.open}
	class:-translate-x-full={!sidebar.open}
	class:translate-x-0={sidebar.open}
	class:md:w-64={sidebar.open}
	class:md:w-[70px]={!sidebar.open}
>
	<div class="p-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<img
					src="/logo.svg"
					width={sidebar.open ? 40 : 20}
					height={sidebar.open ? 40 : 20}
					alt=""
					class="shrink-0"
				/>

				<div
					class="transition-opacity duration-300"
					class:opacity-0={!sidebar.open}
					class:pointer-events-none={!sidebar.open}
				>
					<h1 class="text-xl leading-tight font-bold whitespace-nowrap text-sidebar-primary">
						MINMAT
					</h1>
					<p class="-mt-1 text-xs leading-tight font-bold whitespace-nowrap uppercase opacity-80">
						MATKOMLEK
					</p>
				</div>
			</div>

			<!-- Tombol Close (Hanya muncul di mobile jika sidebar terbuka) -->
			{#if sidebar.open}
				<button
					type="button"
					onclick={() => sidebar.setOpen(false)}
					class="rounded-lg p-2 text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden"
					aria-label="Close Sidebar"
				>
					<X size={20} />
				</button>
			{/if}
		</div>
	</div>

	<nav class="flex-1 overflow-x-hidden overflow-y-auto px-4">
		<ul class="space-y-1">
			{#each menus as menu (menu.name)}
				{#if menu.isDropdown}
					<SidebarDropdown
						name={sidebar.open ? menu.name : ''}
						icon={menu.icon}
						activePrefix={menu.path}
						children={menu.children}
						isOpen={openDropdown === menu.name}
						onToggle={(open) => {
							if (open) openDropdown = menu.name;
							else openDropdown = null;
						}}
					/>
				{:else}
					<SidebarLink href={menu.path} icon={menu.icon} name={sidebar.open ? menu.name : ''} />
				{/if}
			{/each}
		</ul>
	</nav>
</aside>
