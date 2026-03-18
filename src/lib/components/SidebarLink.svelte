<script lang="ts">
	import { page } from '$app/state';

	let { href, icon, name } = $props<{
		href: string;
		icon: string;
		name: string;
	}>();

	// Cek status aktif secara reaktif
	let isActive = $derived(page.url.pathname === href || page.url.pathname.startsWith(href + '/'));
</script>

<li>
	<a
		{href}
		class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
        {isActive
			? 'bg-white/20 text-yellow-400 shadow-sm'
			: 'opacity-80 hover:translate-x-1 hover:bg-white/10 hover:opacity-100'}"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="opacity-70"
		>
			{@html icon}
		</svg>
		{name}
	</a>
</li>
