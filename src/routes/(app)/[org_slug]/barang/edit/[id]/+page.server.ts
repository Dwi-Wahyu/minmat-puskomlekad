import { db } from '$lib/server/db';
import { item, organization } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { uploadFile, deleteFile } from '$lib/server/storage';
import { invalidateOrgInventoryCache } from '$lib/server/redis';
import { message, superValidate } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { itemSchema } from '$lib/schemas/item-schema';

export const load: PageServerLoad = async ({ params }) => {
	const dataResults = await db
		.select()
		.from(item)
		.where(and(eq(item.id, params.id), eq(item.type, 'CONSUMABLE')))
		.limit(1);

	if (dataResults.length === 0) throw error(404, 'Barang tidak ditemukan');

	const consumable = dataResults[0];

	const form = await superValidate(
		{
			name: consumable.name,
			baseUnit: consumable.baseUnit as any,
			description: consumable.description
		},
		yup(itemSchema)
	);

	return { consumable, org_slug: params.org_slug, form };
};

export const actions: Actions = {
	default: async ({ request, params }: any) => {
		const { org_slug, id } = params;
		const formData = await request.formData();
		const form = await superValidate(formData, yup(itemSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { name, baseUnit, description } = form.data as {
			name: string;
			baseUnit: 'PCS' | 'BOX' | 'METER' | 'ROLL' | 'UNIT';
			description: string | null;
		};

		const image = formData.get('image') as File;

		try {
			const currentResults = await db.select().from(item).where(eq(item.id, id)).limit(1);

			if (currentResults.length === 0) {
				return message(form, 'Barang tidak ditemukan', { status: 404 });
			}
			const current = currentResults[0];

			let imagePath = current.imagePath;

			if (image && image.size > 0) {
				const uploadResult = await uploadFile(image, 'item');
				if (uploadResult.error) {
					return message(form, uploadResult.error, { status: 400 });
				}

				// Delete old image if exists
				if (current.imagePath) {
					deleteFile(current.imagePath, 'item');
				}

				imagePath = uploadResult.fileName;
			}

			await db
				.update(item)
				.set({
					name,
					baseUnit,
					description,
					imagePath
				})
				.where(eq(item.id, id));

			// Invalidate cache
			const org = await db.query.organization.findFirst({
				where: eq(organization.slug, org_slug)
			});

			if (org) {
				await invalidateOrgInventoryCache(org.id);
			}

			return message(form, 'Data barang berhasil diperbarui');
		} catch (err) {
			console.error('Error updating item:', err);
			return message(form, 'Gagal memperbarui data barang', { status: 500 });
		}
	}
};
