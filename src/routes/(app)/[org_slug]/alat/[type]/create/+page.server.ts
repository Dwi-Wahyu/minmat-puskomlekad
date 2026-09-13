import { db } from '$lib/server/db';
import {
	equipment,
	item,
	warehouse,
	organization,
	movement,
	itemCategory,
	equipmentComponent
} from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { uploadFile } from '$lib/server/storage';
import { invalidateOrgInventoryCache } from '$lib/server/redis';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { equipmentSchema } from '$lib/schemas/equipment-schema';

export const load: PageServerLoad = async ({ params }) => {
	const { org_slug, type } = params;

	const [warehousesResults, orgResults, categories] = await Promise.all([
		db
			.select({ warehouse: warehouse })
			.from(warehouse)
			.innerJoin(organization, eq(warehouse.organizationId, organization.id))
			.where(eq(organization.slug, org_slug)),
		db.select().from(organization).where(eq(organization.slug, org_slug)).limit(1),
		db.query.itemCategory.findMany({
			with: { parent: true }
		})
	]);

	const form = await superValidate(yup(equipmentSchema));

	return {
		warehouses: warehousesResults.map((w) => w.warehouse),
		org: orgResults[0] || null,
		type,
		categories,
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

		const {
			itemName,
			baseUnit,
			isSet,
			serialNumber,
			brand,
			warehouseId,
			condition,
			status,
			classification,
			categoryId,
			newCategoryName,
			parentCategoryId,
			categoryMode,
			components
		} = form.data as {
			itemName: string;
			baseUnit?: string;
			isSet?: boolean;
			serialNumber: string | null;
			brand: string | null;
			warehouseId: string | null;
			condition: string;
			status: string;
			classification: string | null;
			categoryId: string | null;
			newCategoryName: string | null;
			parentCategoryId: string | null;
			categoryMode: 'select' | 'new';
			components?: Array<{
				id?: string;
				name: string;
				serialNumber?: string | null;
				brand?: string | null;
				condition?: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'RUSAK_TOTAL';
				isRequired?: boolean;
			}>;
		};

		// Parse components: use form.data.components if present, or parse from formData
		let finalComponents =
			Array.isArray(components) && components.length > 0 ? [...components] : [];

		if (finalComponents.length === 0) {
			const parsedComps: Array<{
				id?: string;
				name: string;
				condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'RUSAK_TOTAL';
				brand?: string | null;
				isRequired?: boolean;
			}> = [];
			for (const [key, value] of formData.entries()) {
				const match = key.match(/^components\[(\d+)\]\.(id|name|condition|brand)$/);
				if (match) {
					const index = parseInt(match[1], 10);
					const field = match[2];
					if (!parsedComps[index]) {
						parsedComps[index] = { name: '', condition: 'BAIK', brand: null, isRequired: true };
					}
					if (field === 'id') parsedComps[index].id = value.toString();
					else if (field === 'name') parsedComps[index].name = value.toString();
					else if (field === 'condition') parsedComps[index].condition = value.toString() as any;
					else if (field === 'brand') parsedComps[index].brand = value.toString();
				}
			}
			finalComponents = parsedComps.filter((c) => c && c.name && c.name.trim());
		}

		const isSetBool =
			isSet === true ||
			String(isSet) === 'true' ||
			formData.get('isSet') === 'true' ||
			finalComponents.length > 0;

		// Get the raw form data for the image file
		const imageFile = (formData.get('image') as File) || (form.data.image as File);

		// Upload image if exists
		const { fileName, error: uploadError } = await uploadFile(imageFile, 'item');
		if (uploadError) {
			return message(form, uploadError, { status: 400 });
		}

		// Map URL type to database equipmentType
		const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

		try {
			const result = await db.transaction(async (tx) => {
				const orgResults = await tx
					.select()
					.from(organization)
					.where(eq(organization.slug, org_slug))
					.limit(1);

				if (orgResults.length === 0) {
					throw new Error('Organisasi tidak ditemukan');
				}
				const org = orgResults[0];

				// Handle dynamic category on-the-fly
				let finalCategoryId: string | null = categoryId;

				if (categoryMode === 'new' && newCategoryName) {
					// Check if category already exists
					const existingCat = await tx.query.itemCategory.findFirst({
						where: eq(itemCategory.name, newCategoryName)
					});

					if (existingCat) {
						finalCategoryId = existingCat.id;
					} else {
						finalCategoryId = crypto.randomUUID();
						await tx.insert(itemCategory).values({
							id: finalCategoryId,
							name: newCategoryName,
							parentId: parentCategoryId || null,
							order: 0,
							createdAt: new Date()
						});
					}
				}

				// Create or Find Item
				let itemId: string;
				const existingItemResults = await tx
					.select()
					.from(item)
					.where(and(eq(item.name, itemName), eq(item.equipmentType, equipmentType)))
					.limit(1);

				const finalBaseUnit = isSetBool ? 'SET' : (baseUnit || 'UNIT');

				if (existingItemResults.length > 0) {
					itemId = existingItemResults[0].id;
					// Update image or categoryId or baseUnit if new details provided
					const updateData: any = {};
					if (fileName) updateData.imagePath = fileName;
					if (finalCategoryId) updateData.categoryId = finalCategoryId;
					if (isSetBool) updateData.baseUnit = 'SET';

					if (Object.keys(updateData).length > 0) {
						await tx.update(item).set(updateData).where(eq(item.id, itemId));
					}
				} else {
					itemId = crypto.randomUUID();
					await tx.insert(item).values({
						id: itemId,
						name: itemName,
						type: 'ASSET',
						equipmentType: equipmentType,
						baseUnit: finalBaseUnit,
						categoryId: finalCategoryId,
						imagePath: fileName,
						createdAt: new Date()
					});
				}

				const equipmentId = crypto.randomUUID();
				await tx.insert(equipment).values({
					id: equipmentId,
					itemId,
					isSet: isSetBool,
					serialNumber: serialNumber || null,
					brand: brand || null,
					warehouseId: warehouseId || null,
					organizationId: org.id,
					condition: (condition as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'RUSAK_TOTAL') || 'BAIK',
					status: (status as 'READY' | 'IN_USE' | 'TRANSIT' | 'MAINTENANCE' | 'DISPOSED') || 'READY',
					createdAt: new Date()
				});

				// Insert components if isSet is true
				if (isSetBool && Array.isArray(finalComponents)) {
					for (const comp of finalComponents) {
						if (comp && comp.name && comp.name.trim()) {
							await tx.insert(equipmentComponent).values({
								id: comp.id || crypto.randomUUID(),
								equipmentId,
								name: comp.name.trim(),
								brand: comp.brand ? comp.brand.trim() : null,
								condition: comp.condition || 'BAIK',
								isRequired: comp.isRequired ?? true,
								createdAt: new Date()
							});
						}
					}
				}

				// Create movement record if classification is provided
				if (classification) {
					await tx.insert(movement).values({
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

					await tx
						.update(equipment)
						.set({
							classification: classification as 'BALKIR' | 'KOMUNITY' | 'TRANSITO'
						})
						.where(eq(equipment.id, equipmentId));
				}

				return org.id;
			});

			// Invalidate cache
			await invalidateOrgInventoryCache(result);

			return message(form, 'Alat berhasil ditambahkan');
		} catch (error: any) {
			console.error(error);

			if (error.cause && error.cause.code === 'ER_DUP_ENTRY') {
				return setError(form, 'serialNumber', 'Serial Number sudah terdaftar');
			}

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
			return message(form, error.message || 'Gagal menambahkan alat', { status: 500 });
		}
	}
};
