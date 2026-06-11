<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Download } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<div class="flex h-[calc(100vh-4rem)] flex-col gap-4 p-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Buku Panduan</h1>
				<p class="text-sm text-muted-foreground">Panduan penggunaan sistem MINMAT.</p>
			</div>
		</div>
		<Button href="/guidebook-minmat.pdf" download="guidebook-minmat.pdf" variant="default">
			<Download />
			Unduh PDF
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
