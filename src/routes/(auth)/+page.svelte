<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="relative flex min-h-screen items-center justify-start bg-gray-100 p-16">
	<div class="absolute inset-0 z-0 bg-[url('/backgrounds/login.jpg')] bg-cover bg-center"></div>

	<div class="relative z-10 flex w-full max-w-md flex-col items-center">
		<div class="mb-8 self-start px-4 text-gray-200">
			<div class="flex items-center gap-2">
				<img src="/logo-tni-ad.png" width="35" height="35" alt="" />

				<div class="leading-tight">
					<h2 class="text-xl font-bold tracking-widest">MINMAT</h2>
					<p class="tracking-[0.3em]">MATKOMLEK</p>
				</div>
			</div>
		</div>

		<div class="w-full rounded-4xl bg-white/95 p-10 shadow-2xl backdrop-blur-sm">
			<div class="mb-8 text-center">
				<h1 class="text-3xl font-semibold text-gray-900">Selamat Datang</h1>
				<p class="mt-2 text-sm text-gray-500">Masukkan NIP dan Password</p>
			</div>

			<form method="post" action="?/signInEmail" use:enhance class="space-y-6">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-500">Username</label>
					<input
						type="email"
						id="email"
						name="email"
						placeholder="Jonathan_Reichert07"
						class="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 transition focus:border-gray-400 focus:ring-0 focus:outline-none"
						required
					/>
				</div>

				<div>
					<div class="flex items-center justify-between">
						<label for="password" class="block text-sm font-medium text-gray-500">Password</label>
					</div>
					<input
						type="password"
						id="password"
						name="password"
						placeholder="************"
						class="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 transition focus:border-gray-400 focus:ring-0 focus:outline-none"
						required
					/>
				</div>

				{#if form?.message}
					<p class="text-center text-sm text-red-500">{form.message}</p>
				{/if}

				<button
					type="submit"
					class="w-full rounded-lg bg-[#3a3f4b] py-4 font-semibold text-white transition hover:bg-gray-700 active:scale-[0.98]"
				>
					Sign in
				</button>
			</form>
		</div>

		<a
			href="/forgot-password"
			class="mt-4 text-sm font-semibold text-gray-200 underline underline-offset-4"
			>Lupa Password?</a
		>
	</div>
</div>
