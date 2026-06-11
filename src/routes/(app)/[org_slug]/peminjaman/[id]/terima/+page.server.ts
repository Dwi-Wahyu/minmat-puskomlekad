import { db } from '$lib/server/db';
import {
	lending,
	lendingItem,
	approval,
	equipment,
	movement,
	auditLog
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createNotification } from '$lib/server/notification';
import { v4 as uuidv4 } from 'uuid';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id, org_slug } = params;
	const { user } = locals;

	if (!user) throw redirect(302, '/');

	const lendingDetail = await db.query.lending.findFirst({
		where: eq(lending.id, id),
		with: {
			organization: true,
			items: {
				with: {
					equipment: { with: { item: true, warehouse: true } }
				}
			}
		}
	});

	if (!lendingDetail) throw redirect(303, `/${org_slug}/peminjaman`);

	// Auth check: only requester side can confirm receive
	const isLender = user.organization.id === lendingDetail.organizationId;
	if (isLender || lendingDetail.status !== 'DALAM_PENGIRIMAN') {
		throw redirect(303, `/${org_slug}/peminjaman/${id}`);
	}

	return {
		lending: lendingDetail,
		org_slug
	};
};

export const actions: Actions = {
	confirmReceive: async ({ request, locals, params }) => {
		const { user } = locals;
		const { org_slug } = params;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const notes = formData.get('notes')?.toString() || '';
		if (!id) return fail(400, { message: 'ID required' });

		try {
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id),
				columns: { requestedBy: true, unit: true, status: true, organizationId: true }
			});

			if (lendingData?.status !== 'DALAM_PENGIRIMAN') {
				return fail(400, { message: 'Status tidak valid untuk konfirmasi penerimaan' });
			}

			await db.transaction(async (tx) => {
				await tx.update(lending).set({ status: 'DIPINJAM' }).where(eq(lending.id, id));

				await tx.insert(approval).values({
					id: uuidv4(),
					referenceType: 'LENDING',
					referenceId: id,
					approvedBy: user.id,
					status: 'APPROVED',
					note: `[DIPINJAM] Penerimaan dikonfirmasi oleh operator: ${user.name}${notes ? '. Catatan: ' + notes : ''}`
				});

				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'CONFIRM_RECEIVE_LENDING',
					tableName: 'lending',
					recordId: id,
					oldValue: JSON.stringify({ status: 'DALAM_PENGIRIMAN' }),
					newValue: JSON.stringify({ status: 'DIPINJAM', confirmedBy: user.id })
				});
			});

			// Notifikasi ke org pemberi (Puskomlekad) bahwa alat sudah diterima
			await createNotification({
				organizationId: lendingData.organizationId!,
				title: 'Alat Dikonfirmasi Diterima',
				body: `Unit ${lendingData.unit} telah mengkonfirmasi penerimaan alat.`,
				priority: 'MEDIUM',
				action: {
					type: 'LENDING_DETAIL',
					resourceId: id,
					webPath: `/${org_slug}/peminjaman/${id}`
				}
			});

			return { success: true, message: 'Penerimaan alat berhasil dikonfirmasi' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal konfirmasi penerimaan' });
		}
	}
};
