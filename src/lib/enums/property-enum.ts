// Label mapping untuk enum yang berkaitan dengan Land (Tanah) dan Building (Bangunan)

export const landStatusLabel: Record<string, string> = {
	MILIK_TNI: 'Milik TNI',
	LAINNYA: 'Lainnya'
};

export const buildingConditionLabel: Record<string, string> = {
	BAIK: 'Baik',
	RUSAK: 'Rusak'
};

export const buildingStatusLabel: Record<string, string> = {
	MILIK_TNI: 'Milik TNI',
	LAINNYA: 'Lainnya'
};

export const buildingConditionColors: Record<string, string> = {
	BAIK: 'bg-green-100 text-green-700',
	RUSAK: 'bg-red-100 text-red-700'
};

export const buildingStatusColors: Record<string, string> = {
	MILIK_TNI: 'bg-green-100 text-green-700',
	SEWA: 'bg-yellow-100 text-yellow-700'
};
