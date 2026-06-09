import { db } from '$lib/server/db';
import { equipment } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { invalidateOrgInventoryCache } from '$lib/server/redis';

export const load: PageServerLoad = async ({ params }) => {
	const { org_slug, type } = params;

	const org = await db.query.organization.findFirst({
		where: eq(sql`slug`, org_slug)
	});

	if (!org) throw fail(404, { message: 'Organisasi tidak ditemukan' });

	return {
		type
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
