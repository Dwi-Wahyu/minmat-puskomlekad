import { db } from '$lib/server/db';
import { organization } from '$lib/server/db/schema';
import { eq, ne, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = locals;

	if (!user) {
		throw error(401, 'Silahkan login terlebih dahulu');
	}

	// Cari organisasi induk berdasarkan slug di URL
	const currentOrg = await db.query.organization.findFirst({
		where: eq(organization.slug, user.organization.slug)
	});

	if (!currentOrg) {
		throw error(404, 'Organisasi tidak ditemukan');
	}

	// Ambil semua satuan kecuali satuan sendiri
	const units = await db.query.organization.findMany({
		where: ne(organization.id, currentOrg.id),
		orderBy: (org, { asc }) => [asc(org.name)]
	});

	return {
		units
	};
};
