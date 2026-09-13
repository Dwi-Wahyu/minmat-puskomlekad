import { db } from '$lib/server/db';
import { equipment, warehouse, organization, itemCategory } from '$lib/server/db/schema';
import { eq, sql, asc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { invalidateOrgInventoryCache } from '$lib/server/redis';

export const load: PageServerLoad = async ({ params }) => {
	const { org_slug, type } = params;

	const org = await db.query.organization.findFirst({
		where: eq(sql`slug`, org_slug)
	});

	if (!org) throw fail(404, { message: 'Organisasi tidak ditemukan' });

	const [warehouses, categories] = await Promise.all([
		db
			.select({ id: warehouse.id, name: warehouse.name })
			.from(warehouse)
			.where(eq(warehouse.organizationId, org.id))
			.orderBy(asc(warehouse.name)),
		db.query.itemCategory.findMany({
			with: { parent: true },
			orderBy: [asc(itemCategory.name)]
		})
	]);

	return {
		type,
		warehouses,
		categories
	};
};

export const actions: Actions = {
	delete: async ({ request, params }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID is required' });

		const org = await db.query.organization.findFirst({
			where: eq(sql`slug`, params.org_slug)
		});

		if (!org) return fail(404, { message: 'Organisasi tidak ditemukan' });

		try {
			await db.delete(equipment).where(eq(equipment.id, id));

			// Invalidate cache
			await invalidateOrgInventoryCache(org.id);

			return { success: true, message: 'Alat berhasil dihapus' };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Gagal menghapus alat' });
		}
	}
};
