import type { PageServerLoad } from './$types';

// Definisi Tipe Data Mock
export type MockEquipment = {
	id: string;
	name: string;
	brand: string | null;
	serialNumber: string | null;
	type: 'ALKOMLEK' | 'PERNIKA_LEK';
	condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';
	// Menyimulasikan data peminjaman terakhir
	lastLending: {
		unit: string;
		status: 'DIPINJAM' | 'KEMBALI';
	} | null;
};

export const load: PageServerLoad = async () => {
	// Data Mock Gudang
	const mockWarehouse = {
		id: 'wh-001',
		name: 'GUDANG UTAMA 1',
		location: 'Lanud Sultan Hasanuddin',
		category: 'KOMUNITY' as const
	};

	// Data Mock Daftar Alat (Disesuaikan dengan schema.ts Anda)
	const mockEquipments: MockEquipment[] = [
		{
			id: 'eq-1',
			name: 'Radio Komunikasi HF Manpack',
			brand: 'Codan NGT SRx',
			serialNumber: 'SN-HF12345678',
			type: 'ALKOMLEK',
			condition: 'BAIK',
			lastLending: null // Tersedia
		},
		{
			id: 'eq-2',
			name: 'Jammer Sinyal Portabel',
			brand: 'D-Tech Solutions',
			serialNumber: 'JAM-882901-X',
			type: 'PERNIKA_LEK',
			condition: 'RUSAK_RINGAN',
			lastLending: { unit: 'SATRAD 223', status: 'DIPINJAM' }
		},
		{
			id: 'eq-3',
			name: 'Transceiver VHF Airband',
			brand: 'Icom IC-A210',
			serialNumber: 'ICOM-VHF-90882',
			type: 'ALKOMLEK',
			condition: 'BAIK',
			lastLending: null // Tersedia
		},
		{
			id: 'eq-4',
			name: 'Spectrum Analyzer',
			brand: 'Rohde & Schwarz',
			serialNumber: 'RS-SA-776100',
			type: 'PERNIKA_LEK',
			condition: 'RUSAK_BERAT',
			lastLending: { unit: 'MABES PUSKOMLEKAD', status: 'DIPINJAM' }
		},
		{
			id: 'eq-5',
			name: 'Antenna HF Dipole',
			brand: 'Generic Military Grade',
			serialNumber: 'ANT-HF-0019',
			type: 'ALKOMLEK',
			condition: 'BAIK',
			lastLending: null // Tersedia
		}
	];

	return {
		warehouse: mockWarehouse,
		equipments: mockEquipments
	};
};
