import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment, maintenance } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, message } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { maintenanceMutationSchema } from '$lib/schemas/maintenance-mutation-schema';
import { requirePermission } from '$lib/server/auth.utils';

// Format tanggal untuk input datetime-local to ISO for superforms initial data
const formatDateForISO = (date: Date | null): string | undefined => {
	if (!date) return undefined;
	return new Date(date).toISOString();
};

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id, org_slug } = params;

	const maintenanceData = await db.query.maintenance.findFirst({
		where: eq(maintenance.id, id),
		with: {
			equipment: {
				with: {
					item: true
				}
			}
		}
	});

	if (!maintenanceData) {
		throw error(404, { message: 'Jadwal maintenance tidak ditemukan' });
	}

	// Cek izin view/update
	requirePermission('maintenance', 'update', locals, maintenanceData.equipment?.organizationId);

	const technicianList = await db.query.user.findMany({
		columns: { id: true, name: true, email: true },
		orderBy: (user, { asc }) => [asc(user.name)]
	});

	const initialData = {
		...maintenanceData,
		equipmentIds: maintenanceData.equipmentId ? [maintenanceData.equipmentId] : [],
		scheduledDate: formatDateForISO(maintenanceData.scheduledDate)!,
		completionDate: formatDateForISO(maintenanceData.completionDate)
	};

	const form = await superValidate(initialData, yup(maintenanceMutationSchema));

	return {
		form,
		maintenance: maintenanceData,
		technicians: technicianList,
		org_slug
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { id } = params;
		const formData = await request.formData();

		const rawScheduledDate = formData.get('scheduledDate')?.toString();
		const rawCompletionDate = formData.get('completionDate')?.toString();

		if (rawScheduledDate && rawScheduledDate.length === 16) {
			formData.set('scheduledDate', new Date(rawScheduledDate).toISOString());
		}
		if (rawCompletionDate && rawCompletionDate.length === 16) {
			formData.set('completionDate', new Date(rawCompletionDate).toISOString());
		}

		const form = await superValidate(formData, yup(maintenanceMutationSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const data = form.data;

		try {
			await db.transaction(async (tx) => {
				// Cek izin update sebelum transaksi
				const existing = await tx.query.maintenance.findFirst({
					where: eq(maintenance.id, id),
					with: {
						equipment: true
					}
				});

				if (!existing) {
					throw error(404, 'Data pemeliharaan tidak ditemukan');
				}

				requirePermission('maintenance', 'update', locals, existing.equipment?.organizationId);

				const equipmentId = data.equipmentIds[0];

				// Update existing record
				await tx
					.update(maintenance)
					.set({
						maintenanceType: data.maintenanceType as 'PERAWATAN' | 'PERBAIKAN',
						description: data.description,
						status: data.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
						technicianId: data.technicianId || null,
						scheduledDate: new Date(data.scheduledDate),
						completionDate: data.completionDate ? new Date(data.completionDate) : null
					})
					.where(eq(maintenance.id, id));

				// Update status alat
				const newEquipmentStatus = data.status === 'COMPLETED' ? 'READY' : 'MAINTENANCE';
				await tx
					.update(equipment)
					.set({ status: newEquipmentStatus })
					.where(eq(equipment.id, equipmentId));
			});
		} catch (err: any) {
			if (err.status === 403 || err.status === 404) throw err;
			console.error(err);
			return message(form, 'Kesalahan server internal', { status: 500 });
		}

		return message(form, 'Perubahan data pemeliharaan berhasil disimpan');
	}
};
