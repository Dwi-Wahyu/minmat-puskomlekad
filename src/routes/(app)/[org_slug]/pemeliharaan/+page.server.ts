import { fail, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { maintenance, organization, equipment } from '$lib/server/db/schema';
import { eq, desc, inArray, and, gte, lte } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { requirePermission } from '$lib/server/auth.utils';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	requirePermission('maintenance', 'view', locals);
	const { org_slug } = params;
	const equipmentIds = url.searchParams.get('equipmentIds')?.split(',').filter(Boolean) || [];
	const startDate = url.searchParams.get('start');
	const endDate = url.searchParams.get('end');

	// Ambil ID organisasi berdasarkan slug dari URL
	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, org_slug)
	});

	if (!org) {
		throw error(404, 'Organization not found');
	}

	// Build query filters
	const filters = [];
	if (equipmentIds.length > 0) {
		filters.push(inArray(maintenance.equipmentId, equipmentIds));
	}
	if (startDate) {
		filters.push(gte(maintenance.scheduledDate, new Date(startDate)));
	}
	if (endDate) {
		const end = new Date(endDate);
		end.setHours(23, 59, 59, 999);
		filters.push(lte(maintenance.scheduledDate, end));
	}

	// PERUBAHAN: dua query dijalankan paralel, tidak di-await, dikembalikan sebagai Promise
	const dataPromise = Promise.all([
		db.query.maintenance.findMany({
			where: filters.length > 0 ? and(...filters) : undefined,
			with: {
				equipment: {
					with: {
						item: true
					}
				}
			},
			orderBy: [desc(maintenance.scheduledDate)]
		}),
		db.query.equipment.findMany({
			where: eq(equipment.organizationId, org.id),
			with: {
				item: true
			}
		})
	]).then(([maintenanceList, equipmentList]) => ({
		maintenance: maintenanceList.filter((m) => m.equipment?.organizationId === org.id),
		equipment: equipmentList
	}));

	return {
		dataPromise,
		org_slug: org_slug,
		filters: {
			equipmentIds,
			start: startDate,
			end: endDate
		},
		isOperator: ['operatorBinmatDanBekharrah', 'operatorPusatDanDaerah'].includes(locals.user.role)
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { message: 'ID tidak ditemukan' });
		}

		try {
			// Cek apakah data ada sebelum dihapus
			const existing = await db.query.maintenance.findFirst({
				where: eq(maintenance.id, id),
				with: {
					equipment: true
				}
			});

			if (!existing) {
				return fail(404, { message: 'Data pemeliharaan tidak ditemukan' });
			}

			// Cek izin hapus dengan targetOrgId dari alat yang dipelihara
			requirePermission('maintenance', 'delete', locals, existing.equipment?.organizationId);

			await db.delete(maintenance).where(eq(maintenance.id, id));
		} catch (err: any) {
			if (err.status === 403) throw err;
			console.error('Error deleting maintenance:', err);
			return fail(500, { message: 'Kesalahan server internal saat menghapus data' });
		}

		return { success: true, message: 'Data berhasil dihapus' };
	}
};
