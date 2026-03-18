import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { organization } from 'better-auth/plugins';
import {
	accessControl,
	kakomlek,
	operatorBinmatDanBekharrah,
	operatorPusatDanDaerah,
	pimpinan,
	superadmin
} from './auth.roles';

import * as schema from '$lib/server/db/schema';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'mysql', schema }),
	emailAndPassword: { enabled: true },
	plugins: [
		organization({
			ac: accessControl,
			roles: {
				superadmin,
				pimpinan,
				kakomlek,
				operatorPusatDanDaerah,
				operatorBinmatDanBekharrah
			}
		}),
		sveltekitCookies(getRequestEvent)
	] // make sure this is the last plugin in the array
});
