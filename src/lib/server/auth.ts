import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { organization, admin, username, customSession, bearer } from 'better-auth/plugins';
import {
	accessControl,
	kakomlek,
	operatorBinmatDanBekharrah,
	operatorPusatDanDaerah,
	pimpinan,
	superadmin,
	kepalaGudang
} from './auth.roles';

import * as schema from '$lib/server/db/schema';
import { apiKey } from '@better-auth/api-key';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'mysql', schema }),
	emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24 // 1 day (every 1 day the session expiration is updated)
	},
	advanced: {
		disableOriginCheck: false
	},
	databaseHooks: {
		session: {
			create: {
				after: async (session) => {
					await db.insert(schema.auditLog).values({
						id: crypto.randomUUID(),
						userId: session.userId,
						action: 'LOGIN',
						tableName: 'session',
						recordId: session.id,
						newValue: JSON.stringify({
							ipAddress: session.ipAddress,
							userAgent: session.userAgent
						}),
						createdAt: new Date()
					});
				}
			}
		}
	},
	plugins: [
		admin(),
		username({
			minUsernameLength: 5,
			maxUsernameLength: 50
		}),
		bearer(),
		apiKey(),
		organization({
			ac: accessControl,
			roles: {
				superadmin,
				pimpinan,
				kakomlek,
				operatorPusatDanDaerah,
				operatorBinmatDanBekharrah,
				kepalaGudang
			}
		}),
		customSession(async ({ user, session }) => {
			// Ambil relasi organisasi & role dari DB berdasarkan userId
			const userWithOrgs = await db.query.user.findFirst({
				where: (u, { eq }) => eq(u.id, user.id),
				with: {
					members: {
						with: { organization: true }
					}
				}
			});

			const firstMember = userWithOrgs?.members?.[0];

			return {
				user: {
					...user,
					role: firstMember?.role ?? 'user',
					warehouseHeadType: firstMember?.warehouseHeadType ?? null,
					organization: firstMember?.organization
						? {
								id: firstMember.organization.id,
								parentId: firstMember.organization.parentId,
								slug: firstMember.organization.slug,
								name: firstMember.organization.name,
								displayName: firstMember.organization.displayName ?? null,
								logo: firstMember.organization.logo ?? ''
							}
						: null
				},
				session
			};
		}),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
