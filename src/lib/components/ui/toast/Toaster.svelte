<script lang="ts">
	import { toast } from './toast.svelte';
	import { fly, fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { CheckCircle2, AlertCircle, Info, XCircle, X } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	const icons = {
		success: CheckCircle2,
		error: XCircle,
		info: Info,
		warning: AlertCircle
	};

	const colors = {
		success: 'border-success/20 bg-success/10 text-success',
		error: 'border-destructive/20 bg-destructive/10 text-destructive',
		info: 'border-primary/20 bg-primary/10 text-primary',
		warning: 'border-primary/20 bg-primary/10 text-primary' // Warning uses primary for now as per design system
	};
</script>

<div class="fixed bottom-0 right-0 z-[100] flex w-full flex-col gap-2 p-4 sm:max-w-[400px]">
	{#each toast.toasts as t (t.id)}
		{@const Icon = icons[t.type]}
		<div
			in:fly={{ y: 20, duration: 300 }}
			out:fade={{ duration: 200 }}
			class={cn(
				'flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md',
				colors[t.type]
			)}
		>
			<div class="mt-0.5 shrink-0">
				<Icon size={20} />
			</div>
			<div class="flex-1 space-y-1">
				<h4 class="text-sm font-bold leading-none">{t.title}</h4>
				{#if t.description}
					<p class="text-xs opacity-90">{t.description}</p>
				{/if}
			</div>
			<button
				onclick={() => toast.remove(t.id)}
				class="mt-0.5 shrink-0 opacity-50 transition-opacity hover:opacity-100"
			>
				<X size={16} />
			</button>
		</div>
	{/each}
</div>
