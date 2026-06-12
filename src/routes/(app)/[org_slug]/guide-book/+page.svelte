<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Maximize2, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	let isFullScreen = $state(false);
</script>

<div class="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 md:gap-6 md:p-6">
	<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center md:gap-0">
		<div class="flex items-center gap-3">
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Buku Panduan</h1>
				<p class="text-sm text-muted-foreground">Panduan penggunaan sistem MINMAT.</p>
			</div>
		</div>
		<Button variant="outline" onclick={() => (isFullScreen = true)} class="gap-2">
			<Maximize2 class="size-4" />
			Layar Penuh
		</Button>
	</div>

	<Card.Root class="flex-1 overflow-hidden">
		<iframe
			src="/guidebook-minmat.pdf"
			class="h-full w-full border-none"
			title="Buku Panduan MINMAT"
		></iframe>
	</Card.Root>
</div>

{#if isFullScreen}
	<div class="fixed inset-0 z-100 flex flex-col bg-black/80 p-4 backdrop-blur-sm">
		<div class="mb-4 flex justify-end">
			<Button
				variant="ghost"
				size="icon"
				class="rounded-full bg-white/10 text-white hover:bg-white/20"
				onclick={() => (isFullScreen = false)}
			>
				<X class="size-6" />
			</Button>
		</div>
		<div class="flex-1 overflow-hidden rounded-xl bg-white shadow-2xl">
			<iframe
				src="/guidebook-minmat.pdf"
				class="h-full w-full border-none"
				title="Buku Panduan MINMAT Fullscreen"
			></iframe>
		</div>
	</div>
{/if}
