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

async function main() {
	console.log('Seeding Test Organization: SIM LAB TEST...');

	// Find global superadmin
	const globalSuperadmin = await db.query.user.findFirst({
		where: eq(authSchema.user.username, 'global.superadmin')
	});

	if (!globalSuperadmin) {
		console.error('Error: global.superadmin not found. Run db:seed-superadmin first.');
		process.exit(1);
	}

	const orgName = 'SIM LAB TEST';
	const orgSlug = 'sim-lab-test';

	// Delete existing if any to allow re-runs
	const existingOrg = await db.query.organization.findFirst({
		where: eq(authSchema.organization.slug, orgSlug)
	});

	if (existingOrg) {
		console.log('Cleaning up existing Test Organization...');
		await db.delete(schema.warehouse).where(eq(schema.warehouse.organizationId, existingOrg.id));
		await db.delete(authSchema.member).where(eq(authSchema.member.organizationId, existingOrg.id));
		await db.delete(authSchema.organization).where(eq(authSchema.organization.id, existingOrg.id));
	}

	const testOrg = await auth.api.createOrganization({
		body: {
			name: orgName,
			slug: orgSlug,
			userId: globalSuperadmin.id
		}
	});

	if (!testOrg) {
		console.error('Failed to create Test Organization.');
		process.exit(1);
	}

	console.log(`Organization created: ${testOrg.name}`);

	// Create Warehouse
	const warehouseId = uuidv4();
	await db.insert(schema.warehouse).values({
		id: warehouseId,
		name: `Gudang ${orgName}`,
		location: `Lokasi Uji Coba ${orgName}`,
		organizationId: testOrg.id
	});

	console.log(`Warehouse created: Gudang ${orgName}`);

	const testUsers = [
		{
			role: 'superadmin',
			username: 'superadmin.test',
			name: 'Superadmin Test User'
		},
		{
			role: 'pimpinan',
			username: 'pimpinan.test',
			name: 'Pimpinan Test User'
		},
		{
			role: 'kakomlek',
			username: 'kakomlek.test',
			name: 'Kakomlek Test User'
		},
		{
			role: 'operatorPusatDanDaerah',
			username: 'operator.pusat.test',
			name: 'Operator Pusat Test User'
		},
		{
			role: 'operatorBinmatDanBekharrah',
			username: 'operator.binmat.test',
			name: 'Operator Binmat Test User'
		}
	];

	for (const u of testUsers) {
		const email = `${u.username}@simlab.test`;
		const password = 'password123';

		console.log(`Creating user: ${u.username}...`);

		// Cleanup existing user if any
		const existingUser = await db.query.user.findFirst({
			where: eq(authSchema.user.username, u.username)
		});

		if (existingUser) {
			await db.delete(authSchema.member).where(eq(authSchema.member.userId, existingUser.id));
			await db.delete(authSchema.account).where(eq(authSchema.account.userId, existingUser.id));
			await db.delete(authSchema.session).where(eq(authSchema.session.userId, existingUser.id));
			await db.delete(authSchema.user).where(eq(authSchema.user.id, existingUser.id));
		}

		try {
			const signUpResponse = await auth.api.signUpEmail({
				body: {
					email,
					password,
					name: u.name,
					username: u.username,
					displayUsername: u.name
				}
			});

			if (signUpResponse) {
				await auth.api.addMember({
					body: {
						organizationId: testOrg.id,
						userId: signUpResponse.user.id,
						role: u.role as any
					}
				});
				console.log(`User ${u.username} added to ${orgName} with role ${u.role}`);
			}
		} catch (error) {
			console.error(`Failed to create user ${u.username}:`, error);
		}
	}

	console.log('\nTest Organization seeding complete!');
	console.log(`Organization Slug: ${orgSlug}`);
	console.log('All user passwords: password123');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding failed:', err);
	process.exit(1);
});
