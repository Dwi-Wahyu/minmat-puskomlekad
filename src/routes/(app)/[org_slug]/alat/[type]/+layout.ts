import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params }) => {
	const { type } = params;

	const validType = ['ALKOMLEK', 'PERNIKA_LEK'];

	const uppercasedType = type.toUpperCase();

	if (!validType.includes(uppercasedType)) {
		throw error(404, 'Jenis Alat Tidak Ditemukan');
	}

	const typeMapping = {
		ALKOMLEK: {
			title: 'Alkomlek',
			description: 'Alat Komlek',
			path: type
		},
		PERNIKA_LEK: {
			title: 'Alpernika & Lek',
			description: 'Alat pernika dan Lek',
			path: type
		}
	};

	return {
		type: typeMapping[uppercasedType as 'ALKOMLEK' | 'PERNIKA_LEK']
	};
};
