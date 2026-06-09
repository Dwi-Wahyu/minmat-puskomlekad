// Label mapping untuk enum yang berkaitan dengan Movement (Pergerakan Barang)

// import type { PackagePlus } from "@lucide/svelte";

export const movementEventTypeLabel: Record<string, string> = {
	RECEIVE: 'Penerimaan',
	ISSUE: 'Pengeluaran',
	ADJUSTMENT: 'Penyesuaian Stok',
	TRANSFER_OUT: 'Transfer Keluar',
	TRANSFER_IN: 'Transfer Masuk',
	LOAN_OUT: 'Peminjaman',
	LOAN_RETURN: 'Pengembalian Pinjaman',
	DISTRIBUTE_OUT: 'Distribusi Keluar',
	DISTRIBUTE_IN: 'Distribusi Masuk',
	MAINTENANCE_IN: 'Masuk Perawatan',
	MAINTENANCE_OUT: 'Selesai Perawatan'
};

export const movementClassificationLabel: Record<string, string> = {
	BALKIR: 'Balkir',
	KOMUNITY: 'Komunity',
	TRANSITO: 'Transito'
};

export const movementReferenceTypeLabel: Record<string, string> = {
	LENDING: 'Peminjaman',
	DISTRIBUTION: 'Distribusi',
	MAINTENANCE: 'Perawatan / Perbaikan'
};

export const movementEventTypeColor: Record<string, string> = {
	RECEIVE:
		'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
	ISSUE:
		'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
	TRANSFER_OUT:
		'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
	TRANSFER_IN:
		'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
	ADJUSTMENT:
		'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
};

export const movementEventTypeIcon: Record<string, string> = {
	RECEIVE: 'PackagePlus',
	ISSUE: 'PackageMinus',
	ADJUSTMENT: 'Settings2',
	TRANSFER_OUT: 'ArrowUpRight',
	TRANSFER_IN: 'ArrowDownLeft',
	LOAN_OUT: 'HandHelping',
	LOAN_RETURN: 'RotateCcw',
	DISTRIBUTE_OUT: 'Truck',
	DISTRIBUTE_IN: 'PackageCheck',
	MAINTENANCE_IN: 'Wrench',
	MAINTENANCE_OUT: 'ShieldCheck'
};

// export const iconEventType = {
// 	RECEIVE: <PackagePlus />,
// 	ISSUE: <PackageMinus />,
// 	ADJUSTMENT: <Settings2 />,
// 	TRANSFER_OUT: 'ArrowUpRight',
// 	TRANSFER_IN: 'ArrowDownLeft',
// 	LOAN_OUT: 'HandHelping',
// 	LOAN_RETURN: 'RotateCcw',
// 	DISTRIBUTE_OUT: 'Truck',
// 	DISTRIBUTE_IN: 'PackageCheck',
// 	MAINTENANCE_IN: 'Wrench',
// 	MAINTENANCE_OUT: 'ShieldCheck'
// };
