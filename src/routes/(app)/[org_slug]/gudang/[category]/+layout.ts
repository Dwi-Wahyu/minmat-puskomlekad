import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params }) => {
	const { category } = params;

	const validCategory = ['KOMUNITY', 'TRANSITO', 'BALKIR'];

	const uppercased = category.toUpperCase();

	if (!validCategory.includes(uppercased)) {
		throw error(404, 'Jenis Alat Tidak Ditemukan');
	}

	const mapping = {
		KOMUNITY: {
			title: 'Gudang Komunity',
			description: '',
			path: category
		},
		BALKIR: {
			title: 'Gudang Balkir',
			description: '',
			path: category
		},
		TRANSITO: {
			title: 'Gudang Transito',
			description: '',
			path: category
		}
	};

	return {
		category: mapping[(uppercased as 'KOMUNITY', 'TRANSITO', 'BALKIR')]
	};
};
