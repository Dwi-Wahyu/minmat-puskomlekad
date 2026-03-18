import { db } from '$lib/server/db';
import { lending, warehouse } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { and, eq, desc } from 'drizzle-orm';

export const load = async ({ locals }) => {
	const detailGudang = await db.query.warehouse.findFirst({
		where: and(
			eq(warehouse.category, 'KOMUNITY'),
			eq(warehouse.organizationId, locals.user.organization.id)
		),
		with: {
			equipments: {
				with: {
					lendings: {
						orderBy: [desc(lending.createdAt)],
						limit: 1
					}
				}
			}
		}
	});

	if (!detailGudang) {
		throw error(404, 'Gudang Tidak Ditemukan');
	}

	return {
		warehouse: detailGudang,
		user: locals.user
	};
};
