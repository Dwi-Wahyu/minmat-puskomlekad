import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, member } from '$lib/server/db/schema';
import { eq, or, desc, and, like, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, params }) => {
	const { user: currentUser } = locals;

	if (!currentUser || !currentUser.organization) {
		throw error(401, 'Unauthorized');
	}

	const searchQuery = url.searchParams.get('q') || '';
	const statusFilter = url.searchParams.get('status') || 'ALL';

	// Dapatkan semua user ID yang berada di organisasi yang sama dengan currentUser
	const orgUserIdsSubquery = db
		.select({ id: member.userId })
		.from(member)
		.where(eq(member.organizationId, currentUser.organization.id));

	// Query peminjaman dimana:
	// Jika INDUK (parentId null): Hanya tampilkan pengajuan MASUK (organizationId = org ini)
	// Jika BUKAN INDUK: Tampilkan pengajuan MASUK dan KELUAR (requestedBy anggota org ini)

	const isInduk = currentUser.organization.parentId === null;

	const filters = isInduk
		? [eq(lending.organizationId, currentUser.organization.id)]
		: [
				or(
					eq(lending.organizationId, currentUser.organization.id),
					inArray(lending.requestedBy, orgUserIdsSubquery)
				)
			];

	if (statusFilter !== 'ALL') {
		filters.push(eq(lending.status, statusFilter as any));
	}

	if (searchQuery) {
		filters.push(like(lending.unit, `%${searchQuery}%`));
	}

	const data = await db.query.lending.findMany({
		where: and(...filters),
		with: {
			organization: true,
			requestedByUser: {
				columns: { name: true }
			}
		},
		orderBy: [desc(lending.createdAt)]
	});

	return {
		lendingList: data,
		filters: { q: searchQuery, status: statusFilter },
		isInduk,
		org_slug: params.org_slug
	};
};
