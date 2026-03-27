import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth.utils';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET: List equipment untuk organisasi user saat ini
export const GET: RequestHandler = async ({ locals }) => {
	const { user } = requirePermission(locals, 'inventory', 'view');

	const list = await db.query.equipment.findMany({
		where: eq(equipment.organizationId, user.organization.id),
		with: {
			item: true,
			warehouse: true
		}
	});

	return json(list);
};

// POST: Tambah equipment baru
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = requirePermission(locals, 'inventory', 'create');

	const body = await request.json();

	const newEquipment = await db.insert(equipment).values({
		id: crypto.randomUUID(),
		serialNumber: body.serialNumber,
		brand: body.brand,
		itemId: body.itemId,
		warehouseId: body.warehouseId,
		organizationId: user.organization.id, // Selalu ikat ke organisasi user
		condition: body.condition ?? 'BAIK',
		status: 'READY'
	});

	return json({ success: true, id: newEquipment[0].insertId }, { status: 201 });
};
