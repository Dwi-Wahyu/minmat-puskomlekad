import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from './schema';
import * as authSchema from './auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, username } from 'better-auth/plugins';
import { and, eq } from 'drizzle-orm';

import { accessControl, operatorBinmatDanBekharrah, operatorPusatDanDaerah } from '../auth.roles';
import { hashPassword } from 'better-auth/crypto';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

const operatorRoles = {
	operatorPusatDanDaerah,
	operatorBinmatDanBekharrah
};

export const auth = betterAuth({
	baseURL: process.env.ORIGIN,
	secret: process.env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'mysql' }),
	emailAndPassword: { enabled: true },
	plugins: [
		username(),
		organization({
			ac: accessControl,
			roles: operatorRoles
		})
	]
});

async function main() {
	console.log('Sedang melakukan seeding operator...');

	const orgs = await db.query.organization.findMany();

	if (orgs.length === 0) {
		console.error('Tidak ada organisasi ditemukan. Jalankan seed.ts terlebih dahulu.');
		process.exit(1);
	}

	for (const org of orgs) {
		console.log(`\n--- Seeding operators for ${org.name} ---`);

		const toTitleCase = (str: string) =>
			str
				.toLowerCase()
				.split(' ')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');

		const formatRoleLabel = (role: string) => {
			const result = role.replace(/([A-Z])/g, ' $1');
			return result.charAt(0).toUpperCase() + result.slice(1);
		};

		const usernameMapping: Record<string, string> = {
			operatorPusatDanDaerah: 'operatorpd',
			operatorBinmatDanBekharrah: 'operatorbb'
		};

		for (const roleName of Object.keys(operatorRoles)) {
			const shortRoleName = usernameMapping[roleName] || roleName;
			const orgSlug = (org.slug || org.name.toLowerCase().replace(/\s+/g, '_')).replace(/-/g, '_');
			const usernameValue = `${shortRoleName}.${orgSlug}`;
			const email = `${shortRoleName}_${orgSlug}@gmail.com`;
			const roleLabel = formatRoleLabel(roleName);
			const orgNameTitleCase = toTitleCase(org.name);
			const name = `${roleLabel} ${orgNameTitleCase}`;

			// Cek apakah user sudah ada
			const existingUser = await db.query.user.findFirst({
				where: eq(authSchema.user.username, usernameValue)
			});

			if (existingUser) {
				console.log(`Update password for existing operator: ${usernameValue}`);
				try {
					const hashedPassword = await hashPassword(shortRoleName);
					await db
						.update(authSchema.account)
						.set({ password: hashedPassword })
						.where(
							and(
								eq(authSchema.account.userId, existingUser.id),
								eq(authSchema.account.providerId, 'credential')
							)
						);
					console.log(`Password updated for ${usernameValue} to ${shortRoleName} (Direct DB)`);
				} catch (e) {
					console.error(`Gagal update password ${usernameValue}:`, e);
				}
				continue;
			}

			try {
				const signUpRes = await auth.api.signUpEmail({
					body: {
						email,
						password: usernameValue, // Password default untuk user baru
						name,
						username: usernameValue,
						displayUsername: name
					}
				});

				if (signUpRes.user) {
					await auth.api.addMember({
						body: {
							organizationId: org.id,
							userId: signUpRes.user.id,
							role: roleName as 'operatorPusatDanDaerah' | 'operatorBinmatDanBekharrah'
						}
					});
					console.log(`Operator created: ${usernameValue} [${roleName}]`);
				}
			} catch (e) {
				console.error(`Gagal membuat operator ${usernameValue}:`, e);
			}
		}
	}

	console.log('\nSeeding operator selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding operator gagal:', err);
	process.exit(1);
});
