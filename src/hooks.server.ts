import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		const userWithOrgs = await db.query.user.findFirst({
			where: (user, { eq }) => eq(user.id, session.user.id),
			with: {
				members: {
					with: {
						organization: true
					}
				}
			}
		});

		// Pastikan user dan keanggotaan organisasi ditemukan
		if (userWithOrgs && userWithOrgs.members?.length > 0) {
			const firstMember = userWithOrgs.members[0];

			if (!firstMember) return svelteKitHandler({ event, resolve, auth, building });

			if (!firstMember.organization) return svelteKitHandler({ event, resolve, auth, building });

			event.locals.user = {
				...session.user,
				role: firstMember.role,
				organization: {
					id: firstMember.organization.id,
					parentId: firstMember.organization.parentId,
					logo: firstMember.organization.logo ?? '',
					slug: firstMember.organization.slug,
					name: firstMember.organization.name
				}
			};

			event.locals.session = session.session;
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
