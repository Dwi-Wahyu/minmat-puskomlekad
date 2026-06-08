// Label mapping untuk enum yang berkaitan dengan Equipment

export const equipmentConditionLabel: Record<string, string> = {
	BAIK: 'Baik',
	RUSAK_RINGAN: 'Rusak Ringan',
	RUSAK_BERAT: 'Rusak Berat'
};

export const equipmentStatusLabel: Record<string, string> = {
	READY: 'Siap Digunakan',
	IN_USE: 'Sedang Digunakan',
	TRANSIT: 'Dalam Perjalanan',
	MAINTENANCE: 'Dalam Perawatan'
};

export const equipmentTypeLabel: Record<string, string> = {
	ALKOMLEK: 'Alkomlek',
	PERNIKA_LEK: 'Perlengkapan Elektronika'
};

export const equipmentStatusColor: Record<string, string> = {
	READY: 'bg-blue-100 text-blue-700',
	IN_USE: 'bg-purple-100 text-purple-700',
	TRANSIT: 'bg-orange-100 text-orange-700',
	MAINTENANCE: 'bg-red-100 text-red-700'
};

export const equipmentConditionColor: Record<string, string> = {
	BAIK: 'bg-green-100 text-green-700 border-green-200',
	RUSAK_RINGAN: 'bg-yellow-100 text-yellow-700 border-yellow-200',
	RUSAK_BERAT: 'bg-red-100 text-red-700 border-red-200'
};
