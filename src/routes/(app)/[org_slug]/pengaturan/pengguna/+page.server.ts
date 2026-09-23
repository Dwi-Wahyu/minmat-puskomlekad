import { db } from '$lib/server/db';
import { member } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const currentUser = locals.user;

	if (!currentUser) {
		throw redirect(302, '/');
	}

	const isSuperAdmin = currentUser.role === 'superadmin';
	const orgId = currentUser.organization?.id;

	if (!isSuperAdmin && !orgId) {
		throw error(400, 'Organisasi tidak ditemukan pada sesi Anda.');
	}

	let allUsers: any[] = [];
	let allOrganizations: any[] = [];

	if (isSuperAdmin) {
		// Superadmin: Ambil semua organisasi & seluruh pengguna di semua kesatuan
		allOrganizations = await db.query.organization.findMany({
			orderBy: (org, { asc }) => [asc(org.name)]
		});

		allUsers = await db.query.user.findMany({
			orderBy: (u, { asc }) => [asc(u.name)],
			with: {
				members: {
					with: {
						organization: true
					}
				},
				sessions: {
					orderBy: (s, { desc }) => [desc(s.createdAt)],
					limit: 1
				}
			}
		});
	} else {
		// Non-Superadmin: Ambil HANYA pengguna yang tergabung dalam kesatuan yang sama
		const members = await db.query.member.findMany({
			where: eq(member.organizationId, orgId!),
			with: {
				user: {
					with: {
						sessions: {
							orderBy: (s, { desc }) => [desc(s.createdAt)],
							limit: 1
						}
					}
				},
				organization: true
			}
		});

		allUsers = members
			.filter((m) => m.user !== null)
			.map((m) => ({
				...m.user,
				members: [m],
				sessions: m.user?.sessions || []
			}));
	}

	const formattedUsers = allUsers.map((u) => {
		const primaryMember = u.members?.[0] || null;
		return {
			id: u.id,
			name: u.name,
			username: u.username,
			displayUsername: u.displayUsername,
			email: u.email,
			image: u.image,
			createdAt: u.createdAt,
			role: primaryMember?.role || 'user',
			warehouseHeadType: primaryMember?.warehouseHeadType || null,
			organizationId: primaryMember?.organizationId || null,
			organizationName: primaryMember?.organization?.name || currentUser.organization?.name || 'Tanpa Kesatuan',
			organizationSlug: primaryMember?.organization?.slug || null,
			lastLogin: u.sessions?.[0]?.createdAt || null,
			isCurrentUser: u.id === currentUser.id
		};
	});

	return {
		users: formattedUsers,
		organizations: allOrganizations.map((o) => ({
			id: o.id,
			name: o.name,
			slug: o.slug,
			displayName: o.displayName
		})),
		currentUser,
		isSuperAdmin,
		orgSlug: params.org_slug,
		orgName: currentUser.organization?.name || 'Organisasi Anda'
	};
};
