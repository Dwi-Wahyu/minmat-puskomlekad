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

import { accessControl, kepalaGudang } from '../auth.roles';
import { hashPassword } from 'better-auth/crypto';
import { movementClassificationLabel } from '@/enums/movement-enum';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

const operatorRoles = {
	kepalaGudang
};

export const auth = betterAuth({
	baseURL: process.env.ORIGIN,
	secret: process.env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'mysql' }),
	emailAndPassword: { enabled: true },
	plugins: [
		username({
			maxUsernameLength: 50
		}),
		organization({
			ac: accessControl,
			roles: operatorRoles
		})
	]
});

async function createUser({
	displayUsername,
	name,
	email,
	usernameValue,
	orgId,
	warehouseHeadType
}: {
	email: string;
	name: string;
	usernameValue: string;
	displayUsername: string;
	orgId: string;
	warehouseHeadType?: 'TRANSITO' | 'BALKIR' | 'KOMUNITY' | null;
}) {
	const signUpRes = await auth.api.signUpEmail({
		body: {
			email,
			password: usernameValue, // Password default untuk user baru
			name,
			username: usernameValue,
			displayUsername
		}
	});

	if (signUpRes.user) {
		await auth.api.addMember({
			body: {
				organizationId: orgId,
				userId: signUpRes.user.id,
				role: 'kepalaGudang'
			}
		});

		if (warehouseHeadType) {
			await db
				.update(schema.member)
				.set({ warehouseHeadType })
				.where(
					and(eq(schema.member.userId, signUpRes.user.id), eq(schema.member.organizationId, orgId))
				);
		}

		console.log(`kepala gudang created: ${usernameValue}`);
	}
}

async function updatePassword({
	userId,
	usernameValue
}: {
	usernameValue: string;
	userId: string;
}) {
	console.log(`Update password for existing: ${usernameValue}`);
	try {
		const hashedPassword = await hashPassword(usernameValue);
		await db
			.update(authSchema.account)
			.set({ password: hashedPassword })
			.where(
				and(eq(authSchema.account.userId, userId), eq(authSchema.account.providerId, 'credential'))
			);

		console.log(`Password updated for ${usernameValue} to`);
	} catch (e) {
		console.error(`Gagal update password ${usernameValue}:`, e);
	}
}

async function main() {
	console.log('Sedang melakukan seeding kepala gudang...');

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

		const isParent = org.parentId === null;

		if (!org.slug) {
			break;
		}

		const orgSlug = org.slug.replaceAll('-', '_');

		if (!isParent) {
			const usernameValue = `kepalagudang.${orgSlug}`;
			const email = `kepalagudang.${orgSlug}@gmail.com`;
			const orgNameTitleCase = toTitleCase(org.name);
			const name = `Kepala Gudang`;

			// Cek apakah user sudah ada
			const existingUser = await db.query.user.findFirst({
				where: eq(authSchema.user.username, usernameValue)
			});

			if (existingUser) {
				await updatePassword({
					userId: existingUser.id,
					usernameValue
				});
				continue;
			}

			console.log(usernameValue);

			await createUser({
				displayUsername: name,
				email,
				name,
				usernameValue,
				orgId: org.id,
				warehouseHeadType: null
			});

			continue;
		}

		const movementClassificationEnum = ['BALKIR', 'KOMUNITY', 'TRANSITO'];

		for (const type of movementClassificationEnum) {
			const usernameValue = `kepalagudang.${type.toLowerCase()}.${orgSlug}`;

			const email = `kepalagudang.${type.toLowerCase()}.${orgSlug}@gmail.com`;
			const orgNameTitleCase = toTitleCase(orgSlug);
			const name = `Kepala Gudang ${movementClassificationLabel[type]}`;

			// Cek apakah user sudah ada
			const existingUser = await db.query.user.findFirst({
				where: eq(authSchema.user.username, usernameValue)
			});

			if (existingUser) {
				await updatePassword({
					userId: existingUser.id,
					usernameValue
				});
				continue;
			}

			await createUser({
				displayUsername: name,
				email,
				name,
				usernameValue,
				orgId: org.id,
				warehouseHeadType: type as 'BALKIR' | 'KOMUNITY' | 'TRANSITO' | null | undefined
			});
		}
	}

	console.log('\nSeeding kepala gudang selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding kepala gudang gagal:', err);
	process.exit(1);
});
