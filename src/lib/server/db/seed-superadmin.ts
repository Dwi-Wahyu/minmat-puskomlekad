import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from './schema';
import * as authSchema from './auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, username } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';

import {
	accessControl,
	kakomlek,
	operatorBinmatDanBekharrah,
	operatorPusatDanDaerah,
	pimpinan,
	superadmin
} from '../auth.roles';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

const allAuthRoles = {
	pimpinan,
	superadmin,
	kakomlek,
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
			roles: allAuthRoles
		})
	]
});

async function main() {
	console.log('Memulai seeder superadmin...');

	const superadminUsername = process.env.SUPERADMIN_USERNAME || 'superadmin';
	const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'superadmin123';
	const superadminEmail = `${superadminUsername}@example.com`;

	// Cek apakah user sudah ada
	const existingUser = await db.query.user.findFirst({
		where: eq(authSchema.user.username, superadminUsername)
	});

	let superadminId = '';

	if (existingUser) {
		console.log(`User dengan username '${superadminUsername}' sudah ada. Melewati pembuatan user.`);
		superadminId = existingUser.id;
	} else {
		console.log(`Membuat user superadmin dengan username '${superadminUsername}'...`);
		try {
			const res = await auth.api.signUpEmail({
				body: {
					email: superadminEmail,
					username: superadminUsername,
					displayUsername: 'Administrator Sistem',
					password: superadminPassword,
					name: 'Administrator Sistem'
				}
			});
			superadminId = res.user.id;
			console.log('User superadmin berhasil dibuat.');
		} catch (e: any) {
			console.error('Gagal membuat user superadmin:', e.message || e);
			process.exit(1);
		}
	}

	// Cek apakah organisasi pusat (PUSKOMLEKAD) sudah ada
	let pusatOrg: any = await db.query.organization.findFirst({
		where: eq(authSchema.organization.slug, 'puskomlekad')
	});

	if (!pusatOrg) {
		console.log('Organisasi PUSKOMLEKAD tidak ditemukan. Membuat baru...');
		try {
			pusatOrg = await auth.api.createOrganization({
				body: {
					name: 'PUSKOMLEKAD',
					slug: 'puskomlekad',
					userId: superadminId
				}
			});
			console.log('Organisasi PUSKOMLEKAD berhasil dibuat.');
		} catch (e: any) {
			console.error('Gagal membuat organisasi PUSKOMLEKAD:', e.message || e);
			process.exit(1);
		}
	}

	// Pastikan superadmin adalah member dengan role superadmin di PUSKOMLEKAD
	const existingMember = await db.query.member.findFirst({
		where: (m, { eq, and }) => and(eq(m.userId, superadminId), eq(m.organizationId, pusatOrg!.id))
	});

	if (!existingMember) {
		console.log('Menambahkan superadmin ke organisasi PUSKOMLEKAD...');
		try {
			await auth.api.addMember({
				body: {
					organizationId: pusatOrg!.id,
					userId: superadminId,
					role: 'superadmin' as any
				}
			});
			console.log('Berhasil menambahkan role superadmin.');
		} catch (e: any) {
			console.error('Gagal menambahkan role:', e.message || e);
		}
	} else if (existingMember.role !== 'superadmin') {
		console.log('Memperbarui role user menjadi superadmin...');
		await db.update(authSchema.member)
			.set({ role: 'superadmin' })
			.where(eq(authSchema.member.id, existingMember.id));
		console.log('Role berhasil diperbarui.');
	} else {
		console.log('User sudah menjadi superadmin di PUSKOMLEKAD.');
	}

	console.log('\nSeeding superadmin selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding superadmin gagal:', err);
	process.exit(1);
});
