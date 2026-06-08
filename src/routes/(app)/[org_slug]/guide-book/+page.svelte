<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { BookOpen } from '@lucide/svelte';
</script>

<div class="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
	<Card.Root class="pt-6">
		<Card.Content class="space-y-6">
			<div class="relative mx-auto flex h-24 w-24 items-center justify-center">
				<div class="absolute inset-0 animate-ping rounded-full bg-primary/10 opacity-75"></div>
				<div
					class="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary"
				>
					<BookOpen class="size-10" />
				</div>
			</div>

			<div class="space-y-2">
				<h1 class="text-2xl font-bold tracking-tight">Guide Book</h1>
				<p class="text-sm text-muted-foreground">
					Panduan penggunaan sistem MINMAT sedang dalam tahap penyusunan.
				</p>
			</div>
		</Card.Content>
	</Card.Root>
</div>
