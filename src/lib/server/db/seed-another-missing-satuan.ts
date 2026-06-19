import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from './schema';
import * as authSchema from './auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { v4 as uuidv4 } from 'uuid';

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

const daftarSatuanTambahan = ['KOMLEKDAM JAYA', 'DENMA MABESAD'];

async function main() {
	console.log('Sedang melakukan seeding tambahan...');

	// Ambil PUSKOMLEKAD yang sudah ada sebagai parent
	const puskomlekadOrg = await db.query.organization.findFirst({
		where: eq(authSchema.organization.slug, 'puskomlekad')
	});

	if (!puskomlekadOrg) {
		console.error(
			'Organisasi PUSKOMLEKAD tidak ditemukan. Pastikan seed utama sudah dijalankan terlebih dahulu.'
		);
		process.exit(1);
	}

	// Ambil global superadmin yang sudah ada
	const globalSuperadmin = await db.query.user.findFirst({
		where: eq(authSchema.user.username, 'global.superadmin')
	});

	if (!globalSuperadmin) {
		console.error(
			'User global.superadmin tidak ditemukan. Pastikan seed utama sudah dijalankan terlebih dahulu.'
		);
		process.exit(1);
	}

	const globalSuperadminId = globalSuperadmin.id;

	const newOrganizations: { id: string; name: string; users: any[] }[] = [];

	for (const namaSatuan of daftarSatuanTambahan) {
		const slug = namaSatuan.toLowerCase().replace(/\s+/g, '-');

		// Cek apakah org sudah ada agar tidak duplikat
		const existing = await db.query.organization.findFirst({
			where: eq(authSchema.organization.slug, slug)
		});

		if (existing) {
			console.log(`Organisasi ${namaSatuan} sudah ada, dilewati.`);
			continue;
		}

		const orgBaru = await auth.api.createOrganization({
			body: { name: namaSatuan, slug, userId: globalSuperadminId }
		});

		if (!orgBaru) {
			console.error(`Gagal membuat organisasi: ${namaSatuan}`);
			continue;
		}

		// Set parentId ke PUSKOMLEKAD
		await db
			.update(authSchema.organization)
			.set({ parentId: puskomlekadOrg.id })
			.where(eq(authSchema.organization.id, orgBaru.id));

		// Buat warehouse untuk organisasi baru
		const orgWarehouseId = uuidv4();
		await db.insert(schema.warehouse).values({
			id: orgWarehouseId,
			name: `Gudang Matbek ${namaSatuan}`,
			location: `Markas ${namaSatuan}`,
			organizationId: orgBaru.id
		});

		newOrganizations.push({ ...orgBaru, users: [] });
		console.log(`Berhasil membuat organisasi: ${orgBaru.name}`);
	}

	// Seed user kakomlek untuk setiap organisasi baru
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

	for (const org of newOrganizations) {
		console.log(`\n--- Seeding user untuk ${org.name} ---`);

		const roleName = 'kakomlek';
		const cleanOrgName = org.name.toLowerCase().replace(/\s+/g, '_');
		const userUsername = `${roleName}.${cleanOrgName}`;
		const email = `${roleName}_${cleanOrgName}@gmail.com`;
		const roleLabel = formatRoleLabel(roleName);
		const orgNameTitleCase = toTitleCase(org.name);
		const name = `${roleLabel} ${orgNameTitleCase}`;

		try {
			await auth.api.signUpEmail({
				body: {
					email,
					password: roleName,
					name,
					username: userUsername,
					displayUsername: name
				}
			});

			const userRec = await db.query.user.findFirst({
				where: eq(authSchema.user.username, userUsername)
			});

			if (userRec) {
				await auth.api.addMember({
					body: { organizationId: org.id, userId: userRec.id, role: roleName as any }
				});
				org.users.push({ id: userRec.id, role: roleName });
				console.log(`Berhasil membuat user: ${userUsername}`);
			}
		} catch (e) {
			console.error(`Gagal membuat user ${userUsername}:`, e);
		}
	}

	console.log('\nSeeding tambahan selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding tambahan gagal:', err);
	process.exit(1);
});
