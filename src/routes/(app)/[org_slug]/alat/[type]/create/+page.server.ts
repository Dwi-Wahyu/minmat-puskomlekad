import { db } from '$lib/server/db';
import { equipment, item, warehouse, organization, movement } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { uploadFile } from '$lib/server/storage';
import { invalidateOrgInventoryCache } from '$lib/server/redis';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { equipmentSchema } from '$lib/schemas/equipment-schema';

export const load: PageServerLoad = async ({ params }) => {
	const { org_slug, type } = params;

	const [warehousesResults, orgResults] = await Promise.all([
		db
			.select({ warehouse: warehouse })
			.from(warehouse)
			.innerJoin(organization, eq(warehouse.organizationId, organization.id))
			.where(eq(organization.slug, org_slug)),
		db.select().from(organization).where(eq(organization.slug, org_slug)).limit(1)
	]);

	const form = await superValidate(yup(equipmentSchema));

	return {
		warehouses: warehousesResults.map((w) => w.warehouse),
		org: orgResults[0] || null,
		type,
		form
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { org_slug, type } = params;
		const formData = await request.formData();
		const form = await superValidate(formData, yup(equipmentSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { itemName, serialNumber, brand, warehouseId, condition, status, classification } =
			form.data as {
				itemName: string;
				serialNumber: string | null;
				brand: string | null;
				warehouseId: string | null;
				condition: string;
				status: string;
				classification: string | null;
			};

		// Get the raw form data for the image file
		const imageFile = formData.get('image') as File;

		// Upload image if exists
		const { fileName, error: uploadError } = await uploadFile(imageFile, 'item');
		if (uploadError) {
			return message(form, uploadError, { status: 400 });
		}

		// Map URL type to database equipmentType
		const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

		try {
			const orgResults = await db
				.select()
				.from(organization)
				.where(eq(organization.slug, org_slug))
				.limit(1);

			if (orgResults.length === 0) {
				return message(form, 'Organisasi tidak ditemukan', { status: 404 });
			}
			const org = orgResults[0];

			// Create or Find Item
			let itemId: string;
			const existingItemResults = await db
				.select()
				.from(item)
				.where(and(eq(item.name, itemName), eq(item.equipmentType, equipmentType)))
				.limit(1);

			if (existingItemResults.length > 0) {
				itemId = existingItemResults[0].id;
				// Update image if new image provided
				if (fileName) {
					await db.update(item).set({ imagePath: fileName }).where(eq(item.id, itemId));
				}
			} else {
				itemId = crypto.randomUUID();
				await db.insert(item).values({
					id: itemId,
					name: itemName,
					type: 'ASSET',
					equipmentType: equipmentType,
					baseUnit: 'UNIT',
					imagePath: fileName,
					createdAt: new Date()
				});
			}

			const equipmentId = crypto.randomUUID();
			await db.insert(equipment).values({
				id: equipmentId,
				itemId,
				serialNumber: serialNumber || null,
				brand: brand || null,
				warehouseId: warehouseId || null,
				organizationId: org.id,
				condition: (condition as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT') || 'BAIK',
				status: (status as 'READY' | 'IN_USE' | 'TRANSIT' | 'MAINTENANCE') || 'READY',
				createdAt: new Date()
			});

			// Create movement record if classification is provided
			if (classification) {
				await db.insert(movement).values({
					id: crypto.randomUUID(),
					itemId,
					equipmentId,
					eventType: 'RECEIVE',
					qty: '1.0000',
					classification: classification as 'BALKIR' | 'KOMUNITY' | 'TRANSITO',
					toWarehouseId: warehouseId || null,
					organizationId: org.id,
					picId: locals.user?.id,
					notes: `Penambahan alat baru dengan klasifikasi ${classification}`,
					createdAt: new Date()
				});
			}

			// Invalidate cache
			await invalidateOrgInventoryCache(org.id);

			return message(form, 'Alat berhasil ditambahkan');
		} catch (error: any) {
			console.error(error);

			if (error.cause && error.cause.code === 'ER_DUP_ENTRY') {
				return setError(form, 'serialNumber', 'Serial Number sudah terdaftar');
			}

			// Cara 2: Cek pesan error di error.cause
			if (
				error.cause &&
				error.cause.sqlMessage &&
				error.cause.sqlMessage.includes('Duplicate entry')
			) {
				return setError(form, 'serialNumber', 'Serial Number sudah terdaftar');
			}

			if (error.code === 'ER_DUP_ENTRY') {
				return setError(form, 'serialNumber', 'Serial Number sudah terdaftar');
			}
			return message(form, 'Gagal menambahkan alat', { status: 500 });
		}
	}
};
