import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment, maintenance } from '$lib/server/db/schema';
import { v4 as uuidv4 } from 'uuid';
import type { PageServerLoad, Actions } from './$types';
import { eq } from 'drizzle-orm';
import { superValidate, message } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { maintenanceCreateSchema } from '$lib/schemas/maintenance-mutation-schema';
import { requirePermission } from '$lib/server/auth.utils';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { org_slug } = params;
	const { user } = requirePermission('maintenance', 'create', locals);

	const equipmentList = await db.query.equipment.findMany({
		where: eq(equipment.organizationId, user.organization.id),
		columns: { id: true, serialNumber: true },
		with: {
			item: {
				columns: {
					name: true
				}
			}
		}
	});

	// Urutkan berdasarkan nama item
	const sortedEquipment = [...equipmentList].sort((a, b) =>
		(a.item?.name || '').localeCompare(b.item?.name || '')
	);

	const technicianList = await db.query.user.findMany({
		columns: { id: true, name: true, email: true },
		orderBy: (user, { asc }) => [asc(user.name)]
	});

	const form = await superValidate(yup(maintenanceCreateSchema));

	return {
		form,
		equipment: sortedEquipment,
		technicians: technicianList,
		org_slug
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { user } = requirePermission('maintenance', 'create', locals);
		const formData = await request.formData();

		// Convert local datetime to ISO if needed, superforms handles string matching well but datetime-local needs ':00.000Z' appending
		const rawScheduledDate = formData.get('scheduledDate')?.toString();
		const rawCompletionDate = formData.get('completionDate')?.toString();

		if (rawScheduledDate && rawScheduledDate.length === 16) {
			formData.set('scheduledDate', new Date(rawScheduledDate).toISOString());
		}
		if (rawCompletionDate && rawCompletionDate.length === 16) {
			formData.set('completionDate', new Date(rawCompletionDate).toISOString());
		}

		const form = await superValidate(formData, yup(maintenanceCreateSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const data = form.data;

		try {
			await db.transaction(async (tx) => {
				for (const equipmentId of data.equipmentIds) {
					await tx.insert(maintenance).values({
						id: uuidv4(),
						equipmentId,
						maintenanceType: data.maintenanceType as 'PERAWATAN' | 'PERBAIKAN',
						description: data.description,
						status: data.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
						technicianId: data.technicianId || null,
						scheduledDate: new Date(data.scheduledDate),
						completionDate: data.completionDate ? new Date(data.completionDate) : null
					});

					// Update status alat menjadi MAINTENANCE jika belum COMPLETED,
					// atau READY jika status pemeliharaan sudah COMPLETED
					const newEquipmentStatus = data.status === 'COMPLETED' ? 'READY' : 'MAINTENANCE';
					await tx
						.update(equipment)
						.set({ status: newEquipmentStatus })
						.where(eq(equipment.id, equipmentId));
				}
			});
		} catch (err) {
			console.error(err);
			return message(form, 'Kesalahan server internal', { status: 500 });
		}

		return message(form, 'Data pemeliharaan berhasil disimpan');
	}
};
