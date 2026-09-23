import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

async function main() {
	const merdekaUsername = process.env.MERDEKA_KAKOMLEK_USERNAME;
	const merdekaPassword = process.env.MERDEKA_KAKOMLEK_PASSWORD;

	if (!merdekaPassword) {
		console.error('❌ Error: MERDEKA_USERNAME_PASSWORD tidak ditemukan di file .env');
		process.exit(1);
	}

	console.log(`Mencari user dengan username: '${merdekaUsername}'...`);
	const merdekaUser = await db.query.user.findFirst({
		where: eq(authSchema.user.username, merdekaUsername)
	});

	if (!merdekaUser) {
		console.error(`❌ Error: User dengan username '${merdekaUsername}' tidak ditemukan.`);
		process.exit(1);
	}

	console.log(`User '${merdekaUsername}' ditemukan (ID: ${merdekaUser.id}). Mengubah password...`);
	const hashedMerdekaPassword = await hashPassword(merdekaPassword);

	await db
		.update(authSchema.account)
		.set({ password: hashedMerdekaPassword })
		.where(
			and(
				eq(authSchema.account.userId, merdekaUser.id),
				eq(authSchema.account.providerId, 'credential')
			)
		);

	console.log(`✅ Berhasil: Password user '${merdekaUsername}' diubah menggunakan MERDEKA_USERNAME_PASSWORD.`);
	process.exit(0);
}

main().catch((err) => {
	console.error('❌ Terjadi kesalahan saat mengubah password merdeka:', err);
	process.exit(1);
});
