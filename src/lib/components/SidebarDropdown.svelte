<script lang="ts">
	import { page } from '$app/state';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { name, icon, children, activePrefix } = $props<{
		name: string;
		icon: string;
		activePrefix: string;
		children: Array<{ name: string; path: string }>;
	}>();

	let isGroupActive = $derived(page.url.pathname.startsWith(activePrefix));
	let isOpen = $state();

	$effect(() => {
		if (isGroupActive) isOpen = true;
	});
</script>

<li>
	<button
		type="button"
		onclick={() => (isOpen = !isOpen)}
		class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-white/10
        {isGroupActive ? 'text-yellow-400' : 'opacity-80'}"
	>
		<div class="flex items-center gap-3">
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
		</div>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="transition-transform duration-300 {isOpen ? 'rotate-180' : ''}"
		>
			<path d="m6 9 6 6 6-6" />
		</svg>
	</button>

	{#if isOpen}
		<ul
			transition:slide={{ duration: 300, easing: cubicOut }}
			class="mt-1 ml-9 space-y-1 overflow-hidden border-l border-white/20 pl-2"
		>
			{#each children as child}
				{@const isChildActive = page.url.pathname === child.path}
				<li>
					<a
						href={child.path}
						class="block rounded-md px-3 py-2 text-xs font-medium transition-colors hover:bg-white/10
                        {isChildActive
							? 'font-bold text-yellow-400 opacity-100'
							: 'opacity-60 hover:opacity-100'}"
					>
						{child.name}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</li>
