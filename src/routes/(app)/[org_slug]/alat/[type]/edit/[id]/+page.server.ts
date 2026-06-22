import { db } from '$lib/server/db';
import { equipment, item, warehouse, organization } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail, error } from '@sveltejs/kit';
import { uploadFile, deleteFile } from '$lib/server/storage';
import { invalidateOrgInventoryCache } from '$lib/server/redis';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { equipmentSchema } from '$lib/schemas/equipment-schema';

export const load: PageServerLoad = async ({ params }) => {
	const { org_slug, id } = params;

	const [warehousesResults, currentEquipmentResults] = await Promise.all([
		db
			.select({ warehouse: warehouse })
			.from(warehouse)
			.innerJoin(organization, eq(warehouse.organizationId, organization.id))
			.where(eq(organization.slug, org_slug)),
		db
			.select({
				equipment: equipment,
				item: item
			})
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.where(eq(equipment.id, id))
			.limit(1)
	]);

	if (currentEquipmentResults.length === 0) {
		throw error(404, 'Alat tidak ditemukan');
	}

	const currentEquipment = {
		...currentEquipmentResults[0].equipment,
		item: currentEquipmentResults[0].item
	};

	const form = await superValidate(
		{
			itemName: currentEquipment.item.name,
			serialNumber: currentEquipment.serialNumber ?? undefined,
			brand: currentEquipment.brand ?? undefined,
			warehouseId: currentEquipment.warehouseId ?? undefined,
			condition: currentEquipment.condition,
			status: currentEquipment.status ?? undefined
		},
		yup(equipmentSchema)
	);

	return {
		warehouses: warehousesResults.map((w) => w.warehouse),
		equipment: currentEquipment,
		type: params.type,
		form
	};
};

export const actions: Actions = {
	default: async ({ request, params }: any) => {
		const { id, type } = params;
		const formData = await request.formData();
		const form = await superValidate(formData, yup(equipmentSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { itemName, serialNumber, brand, warehouseId, condition, status } = form.data as {
			itemName: string;
			serialNumber: string | null;
			brand: string | null;
			warehouseId: string | null;
			condition: string;
			status: string;
		};

		const finalStatus = condition === 'RUSAK_TOTAL' ? 'DISPOSED' : status;

		// Map URL type to database equipmentType
		const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

		try {
			// Menggunakan select eksplisit alih-alih db.query
			const currentResults = await db
				.select({
					equipment: equipment,
					item: item
				})
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(eq(equipment.id, id))
				.limit(1);

			if (currentResults.length === 0) {
				return message(form, 'Alat tidak ditemukan', { status: 404 });
			}
			const current = currentResults[0];

			// Get the raw form data for the image file
			const imageFile = formData.get('image') as File;

			let imagePath = current.item.imagePath;

			// Upload new image if exists
			if (imageFile && imageFile.size > 0) {
				const { fileName: newFileName, error: uploadError } = await uploadFile(imageFile, 'item');
				if (uploadError) {
					return message(form, uploadError, { status: 400 });
				}

				// Delete old image if new one is uploaded
				if (current.item.imagePath) {
					deleteFile(current.item.imagePath, 'item');
				}
				imagePath = newFileName;
			}

			// Find or Create Item (Jika Nama Berubah)
			let itemId: string;
			const existingItemResults = await db
				.select()
				.from(item)
				.where(and(eq(item.name, itemName), eq(item.equipmentType, equipmentType)))
				.limit(1);

			if (existingItemResults.length > 0) {
				itemId = existingItemResults[0].id;
				// Update existing item's image if new one uploaded
				if (imageFile && imageFile.size > 0) {
					await db.update(item).set({ imagePath: imagePath }).where(eq(item.id, itemId));
				}
			} else {
				itemId = crypto.randomUUID();
				await db.insert(item).values({
					id: itemId,
					name: itemName,
					type: 'ASSET',
					equipmentType: equipmentType,
					baseUnit: 'UNIT',
					imagePath: imagePath,
					createdAt: new Date()
				});
			}

			await db
				.update(equipment)
				.set({
					itemId,
					serialNumber: serialNumber || null,
					brand: brand || null,
					warehouseId: warehouseId || null,
					condition: (condition as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT') || 'BAIK',
					status:
						(finalStatus as 'READY' | 'IN_USE' | 'TRANSIT' | 'MAINTENANCE' | 'DISPOSED') || 'READY',
					updatedAt: new Date()
				})
				.where(eq(equipment.id, id));

			// Invalidate cache
			await invalidateOrgInventoryCache(current.equipment.organizationId!);

			return message(form, 'Data alat berhasil diperbarui');
		} catch (error: any) {
			console.error(error);
			if (error.code === 'ER_DUP_ENTRY') {
				return setError(form, 'serialNumber', 'Serial Number sudah terdaftar');
			}
			return message(form, 'Gagal memperbarui data alat', { status: 500 });
		}
	}
};
