import { db } from '$lib/server/db';
import { item, equipment, warehouse } from '$lib/server/db/schema';
import { organization } from '$lib/server/db/auth.schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { itemCategory } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { invalidateCache } from '$lib/server/redis';

export const load: PageServerLoad = async () => {
	const categories = await db.query.itemCategory.findMany({
		orderBy: [asc(itemCategory.order), asc(itemCategory.name)]
	});
	const parentCategories = categories.filter((c) => !c.parentId);
	return { parentCategories };
};

export const actions: Actions = {
	reload: async ({ params }) => {
		const { org_slug } = params;
		const cacheKey = `report:btk-16:${org_slug}`;
		await invalidateCache(cacheKey);
		return { success: true };
	}
};
