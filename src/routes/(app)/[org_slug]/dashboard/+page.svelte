<script>
	import { Database, Download, Upload, Circle } from '@lucide/svelte';

	// Mock Data
	const stats = [
		{ label: 'Total barang', value: '2,580', sub: 'Item', icon: Database, color: 'bg-emerald-700' },
		{ label: 'Barang Masuk', value: '120', sub: 'Hari Ini', icon: Download, color: 'bg-sky-400' },
		{ label: 'Barang Keluar', value: '85', sub: 'Hari Ini', icon: Upload, color: 'bg-orange-400' }
	];

	const activities = [
		{ title: 'BodyPack Receiver', type: 'Masuk', qty: '30 Unit', color: 'text-sky-400' },
		{ title: 'Repeater Motorolla', type: 'Keluar', qty: '20 Unit', color: 'text-orange-400' },
		{ title: 'Field Telephone', type: 'Rusak', qty: '1 Unit', color: 'text-red-500' }
	];
</script>

<div class="mb-6 flex gap-4">
	<select
		class="w-full max-w-xs rounded-lg bg-white px-4 py-2 text-sm ring-emerald-500 outline-none focus:ring-2"
	>
		<option>Semua Barang</option>
	</select>
	<select
		class="w-full max-w-xs rounded-lg bg-white px-4 py-2 text-sm ring-emerald-500 outline-none focus:ring-2"
	>
		<option>Pilih Kesatuan</option>
	</select>
</div>

<div class="mb-6 grid grid-cols-3 gap-6">
	{#each stats as stat}
		<div class="flex items-start justify-between rounded-xl bg-white p-6 shadow">
			<div>
				<p class="text-sm font-medium tracking-tight text-slate-400 uppercase">{stat.label}</p>
				<h3 class="mt-1 text-2xl font-bold tracking-tight">{stat.value}</h3>
				<p class="mt-0.5 text-xs text-slate-400">{stat.sub}</p>
			</div>
			<div class="{stat.color} rounded-lg p-2.5 text-white">
				<svelte:component this={stat.icon} size={24} />
			</div>
		</div>
	{/each}
</div>

<div class="grid grid-cols-3 gap-6">
	<div class="col-span-2 rounded-xl bg-white p-6 shadow">
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h4 class="font-bold">Grafik Barang Masuk dan Keluar</h4>
				<p class="text-xs text-slate-400">Periode 2026</p>
			</div>
			<div class="flex gap-2">
				<select class="rounded border bg-slate-50 p-1 text-xs"><option>Bulanan</option></select>
				<select class="rounded border bg-slate-50 p-1 text-xs"><option>2026</option></select>
			</div>
		</div>

		<div
			class="flex h-64 w-full items-center justify-center rounded-lg border-2 border-dashed bg-slate-50"
		>
			<p class="text-sm text-slate-400 italic">Area Grafik (Gunakan Chart.js atau LayerChart)</p>
		</div>
	</div>

	<div class="rounded-xl bg-white p-6 shadow">
		<h4 class="mb-6 font-bold">Aktivitas Terakhir</h4>
		<div class="space-y-5">
			{#each activities as act}
				<div class="flex items-center gap-3">
					<div class="{act.color} opacity-80"><Circle size={16} fill="currentColor" /></div>
					<div class="text-sm">
						<span class="font-semibold">{act.title}</span> -
						<span class="text-slate-500">{act.type} ({act.qty})</span>
					</div>
				</div>
			{/each}
			<button class="w-full pt-4 text-right text-xs text-slate-400 hover:underline"
				>Lihat Detail</button
			>
		</div>
	</div>
</div>
