import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
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
} from '../../auth.roles';

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

	const parentOrgName = 'TEST PARENT ORG';
	const parentOrgSlug = 'test-parent-org';
	const orgName = 'SIM LAB TEST';
	const orgSlug = 'sim-lab-test';

	// 1. Ensure Parent Org exists
	let parentOrg = await db.query.organization.findFirst({
		where: eq(authSchema.organization.slug, parentOrgSlug)
	});

	if (!parentOrg) {
		console.log(`Creating parent org: ${parentOrgName}...`);
		const parentOrgResponse = await auth.api.createOrganization({
			body: {
				name: parentOrgName,
				slug: parentOrgSlug,
				userId: globalSuperadmin.id
			}
		});
		parentOrg = parentOrgResponse as any;
		if (!parentOrg) {
			console.error('Failed to create Test Parent Organization.');
			process.exit(1);
		}
	}

	// 2. Handle child organization
	const existingOrg = await db.query.organization.findFirst({
		where: eq(authSchema.organization.slug, orgSlug)
	});

	if (existingOrg) {
		console.log(`Test Organization exists. Linking to ${parentOrgSlug}...`);
		await db
			.update(authSchema.organization)
			.set({ parentId: parentOrg.id })
			.where(eq(authSchema.organization.id, existingOrg.id));
		console.log('parentId updated successfully.');
		// process.exit(0); // Removed to allow user seeding
	}

	let testOrg: any = existingOrg;
	if (!testOrg) {
		testOrg = await auth.api.createOrganization({
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
	}

	// Set parentId to Test Parent
	await db
		.update(authSchema.organization)
		.set({ parentId: parentOrg.id })
		.where(eq(authSchema.organization.id, testOrg.id));
	console.log(`Set parentId to ${parentOrgSlug}.`);

	// Create users for both orgs
	const orgsToSeed = [
		{
			id: parentOrg.id,
			name: parentOrgName,
			slug: parentOrgSlug,
			prefix: 'parent'
		},
		{
			id: testOrg.id,
			name: orgName,
			slug: orgSlug,
			prefix: 'test'
		}
	];

	const userRoles = [
		{ role: 'superadmin', suffix: 'superadmin' },
		{ role: 'pimpinan', suffix: 'pimpinan' },
		{ role: 'kakomlek', suffix: 'kakomlek' },
		{ role: 'operatorPusatDanDaerah', suffix: 'operator.pusat' },
		{ role: 'operatorBinmatDanBekharrah', suffix: 'operator.binmat' }
	];

	for (const org of orgsToSeed) {
		console.log(`\nSeeding users for ${org.name}...`);
		for (const r of userRoles) {
			const username = `${r.suffix}.${org.prefix}`;
			const name = `${r.role.charAt(0).toUpperCase() + r.role.slice(1)} ${org.name} User`;
			const email = `${username}@simlab.test`;
			const password = 'password123';

			console.log(`Creating user: ${username}...`);

			// Check existing
			const existingUser = await db.query.user.findFirst({
				where: eq(authSchema.user.username, username)
			});

			let userId: string;

			if (!existingUser) {
				try {
					const signUpResponse = await auth.api.signUpEmail({
						body: {
							email,
							password,
							name,
							username,
							displayUsername: name
						}
					});

					if (!signUpResponse) {
						console.error(`Failed to sign up user ${username}`);
						continue;
					}
					userId = signUpResponse.user.id;
				} catch (error) {
					console.error(`Failed to create user ${username}:`, error);
					continue;
				}
			} else {
				console.log(`User ${username} already exists. Updating membership...`);
				userId = existingUser.id;
			}

			// Ensure membership
			const existingMember = await db.query.member.findFirst({
				where: eq(authSchema.member.userId, userId)
			});

			if (!existingMember) {
				await auth.api.addMember({
					body: {
						organizationId: org.id,
						userId: userId,
						role: r.role as any
					}
				});
				console.log(`User ${username} added to ${org.name} as ${r.role}`);
			} else {
				// Update role if changed
				await db
					.update(authSchema.member)
					.set({ role: r.role, organizationId: org.id })
					.where(eq(authSchema.member.userId, userId));
				console.log(`User ${username} membership updated.`);
			}
		}
	}

	// Create Warehouse for Child Org
	const warehouseId = uuidv4();
	await db.insert(schema.warehouse).values({
		id: warehouseId,
		name: `Gudang ${orgName}`,
		location: `Lokasi Uji Coba ${orgName}`,
		organizationId: testOrg.id
	});

	console.log(`Warehouse created: Gudang ${orgName}`);

	console.log('\nTest Organization seeding complete!');
	console.log(`Parent Org Slug: ${parentOrgSlug}`);
	console.log(`Child Org Slug: ${orgSlug}`);
	console.log('All user passwords: password123');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding failed:', err);
	process.exit(1);
});
