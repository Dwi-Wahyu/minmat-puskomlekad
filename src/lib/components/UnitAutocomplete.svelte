<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { onClickOutside } from 'runed'; // sudah tersedia via bits-ui deps

	let {
		value = $bindable(''),
		orgSlug,
		name = 'unit',
		id = 'unit',
		placeholder = 'Contoh: Yonif 201, Hubdam, dll.',
		...restProps
	}: {
		value?: string;
		orgSlug: string;
		name?: string;
		id?: string;
		placeholder?: string;
		[key: string]: any;
	} = $props();

	let suggestions: string[] = $state([]);
	let open = $state(false);
	let containerEl: HTMLDivElement | undefined = $state();
	let debounceTimer: ReturnType<typeof setTimeout>;

	async function fetchSuggestions(q: string) {
		try {
			const res = await fetch(`/api/${orgSlug}/lending/units?q=${encodeURIComponent(q)}`);

			suggestions = await res.json();

			console.log('Hasil unit dari API:', $state.snapshot(suggestions));

			open = suggestions.length > 0;
		} catch {
			suggestions = [];
			open = false;
		}
	}

	function handleInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		value = val;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => fetchSuggestions(val), 200);
	}

	function handleFocus() {
		if (value === '') fetchSuggestions('');
	}

	function select(unit: string) {
		value = unit;
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}

	// Tutup saat klik di luar
	$effect(() => {
		if (!containerEl) return;
		const handler = (e: MouseEvent) => {
			if (!containerEl!.contains(e.target as Node)) open = false;
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	});
</script>

<div bind:this={containerEl} class="relative">
	<Input
		{id}
		{name}
		bind:value
		{placeholder}
		oninput={handleInput}
		onfocus={handleFocus}
		onkeydown={handleKeydown}
		autocomplete="off"
		{...restProps}
	/>

	{#if open && suggestions.length > 0}
		<ul
			class="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md"
			role="listbox"
		>
			{#each suggestions as unit}
				<li
					role="option"
					aria-selected={value === unit}
					class="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
					onmousedown={() => select(unit)}
				>
					{unit}
				</li>
			{/each}
		</ul>
	{/if}
</div>
