import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userOrg = locals.user.organization;
	if (!userOrg?.id) {
		throw error(401, 'Unauthorized');
	}

	return {};
};
