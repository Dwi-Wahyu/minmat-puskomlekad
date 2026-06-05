<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/toast';
	import { ModeWatcher } from 'mode-watcher';

	const MW = ModeWatcher as any;

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<MW track={false} />
<Toaster />

{@render children()}
