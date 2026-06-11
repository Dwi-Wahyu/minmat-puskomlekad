import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { organization } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { requireRole } from '$lib/server/auth.utils';
import { uploadFile, deleteFile } from '$lib/server/storage';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Hanya superadmin yang boleh edit organisasi
	requireRole('superadmin', locals);

	const { id } = params;

	const targetOrg = await db.query.organization.findFirst({
		where: eq(organization.id, id)
	});

	if (!targetOrg) throw error(404, 'Satuan tidak ditemukan');

	return {
		targetOrg
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		requireRole('superadmin', locals);

		const { id } = params;
		const formData = await request.formData();

		const name = formData.get('name') as string;
		const displayName = formData.get('displayName') as string | null;
		const slug = formData.get('slug') as string;
		const logo = formData.get('logo') as File | null;

		const finalDisplayName = displayName && displayName.trim() !== '' ? displayName.trim() : null;

		if (!name || !slug) {
			return fail(400, { message: 'Nama dan Slug wajib diisi' });
		}

		try {
			const targetOrg = await db.query.organization.findFirst({
				where: eq(organization.id, id)
			});

			if (!targetOrg) {
				return fail(404, { message: 'Organisasi tidak ditemukan' });
			}

			let newLogoPath = targetOrg.logo;

			// Handle logo upload if provided
			if (logo && logo.size > 0) {
				const uploadResult = await uploadFile(
					logo,
					'organization',
					['.png', '.jpg', '.jpeg', '.svg', '.webp'],
					5 * 1024 * 1024
				);

				if (uploadResult.error) {
					return fail(400, { message: uploadResult.error });
				}

				if (uploadResult.fileName) {
					// Delete old logo if it exists
					if (targetOrg.logo) {
						deleteFile(targetOrg.logo, 'organization');
					}
					newLogoPath = uploadResult.fileName;
				}
			}

			await db
				.update(organization)
				.set({
					name,
					displayName: finalDisplayName,
					slug,
					logo: newLogoPath
				})
				.where(eq(organization.id, id));
		} catch (e: any) {
			console.error('Error updating organization:', e);
			return fail(500, { message: 'Gagal memperbarui data satuan' });
		}

		throw redirect(303, `/satuan-jajaran/${id}`);
	}
};
