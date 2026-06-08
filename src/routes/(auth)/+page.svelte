<script lang="ts">
	import { enhance, applyAction } from '$app/forms';
	import { toast } from '$lib/components/ui/toast';
	import Button from '@/components/ui/button/button.svelte';
	import { Download, Loader2 } from '@lucide/svelte';

	let isLoading = $state(false);

	function handleSignIn() {
		isLoading = true;
		return async ({ result }: { result: any }) => {
			if (result?.type === 'redirect') {
				toast.success('Login Berhasil', 'Selamat datang kembali di sistem MINMAT.');
			} else if (result?.type === 'failure') {
				toast.error(
					'Login Gagal',
					(result?.data as any)?.message || 'Periksa kembali email dan password Anda.'
				);
			}

			isLoading = false;
			// Menjalankan aksi bawaan SvelteKit (termasuk redirect)
			await applyAction(result);
		};
	}
</script>

<div class="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-6">
	<div class="absolute inset-0 z-0 opacity-20">
		<div
			class="absolute inset-0 bg-[url('/backgrounds/login-background.webp')] bg-cover bg-center"
		></div>
		<div class="absolute inset-0 bg-linear-to-b from-primary/10 to-background"></div>
	</div>

	<div class="relative z-10 w-full max-w-112.5">
		<div
			class="overflow-hidden rounded-2xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-xl md:p-6"
		>
			<div class="mb-8 flex flex-col items-center text-center">
				<div class="mb-4 h-24 w-auto">
					<img
						src="/logo.svg"
						class="h-full w-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
						alt="Cighra Apta Logo"
					/>
				</div>
				<h1 class="text-2xl font-extrabold tracking-wider text-foreground uppercase">
					Puskomlekad Office
				</h1>
				<p class="mt-1 text-xs font-medium tracking-[0.2em] text-primary uppercase">
					Minmat Matkomlek
				</p>
			</div>

			<form method="post" action="?/signIn" use:enhance={handleSignIn} class="space-y-5">
				<div class="space-y-2">
					<label for="username" class="text-sm font-semibold text-muted-foreground">
						Username
					</label>
					<div class="relative mt-1">
						<input
							id="username"
							name="username"
							type="text"
							placeholder="Masukkan username"
							class="w-full rounded-lg border border-input bg-muted/50 px-4 py-3 text-sm text-foreground placeholder-muted-foreground transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
							required
						/>
					</div>
				</div>

				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<label for="password" class="text-sm font-semibold text-muted-foreground">
							Kata Sandi
						</label>
					</div>
					<div class="relative">
						<input
							type="password"
							id="password"
							name="password"
							placeholder="••••••••"
							class="w-full rounded-lg border border-input bg-muted/50 px-4 py-3 text-sm text-foreground placeholder-muted-foreground transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
							required
						/>
					</div>
				</div>

				<div class="flex items-center justify-between px-1">
					<label class="flex cursor-pointer items-center space-x-2">
						<input
							type="checkbox"
							class="rounded border-input bg-muted text-primary focus:ring-primary/20"
						/>
						<span class="text-xs text-muted-foreground">Ingat saya</span>
					</label>
					<a href="#forgot" class="text-xs font-medium text-primary hover:text-primary/80"
						>Lupa kata sandi?</a
					>
				</div>

				<button
					type="submit"
					disabled={isLoading}
					class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] active:scale-[0.98] disabled:opacity-70"
				>
					{#if isLoading}
						<Loader2 class="size-4 animate-spin" />
						<span>Mohon Tunggu...</span>
					{:else}
						Masuk
					{/if}
				</button>
			</form>

			<Button size="sm" variant="link" href="/builds/mobile-v0.1.apk" class="mt-4 w-full">
				<Download />
				Unduh Aplikasi
			</Button>
		</div>

		<p class="mt-4 text-center text-xs text-muted-foreground uppercase">
			PT Skytel Indo &copy; 2026 PUSKOMLEKAD.
		</p>
	</div>
</div>

<style>
	/* Custom focus ring untuk input */
	input:focus {
		box-shadow: 0 0 0 4px var(--ring);
	}
</style>
