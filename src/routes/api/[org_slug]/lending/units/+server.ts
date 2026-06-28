import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { lending } from '$lib/server/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { getOrSetCache, unitsCacheKey, CacheTTL } from '$lib/server/redis';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const org = (locals as any).org;
	const orgId = org?.id;
	if (!orgId) return json([]);

	const q = url.searchParams.get('q')?.trim() ?? '';

	// Ambil SEMUA distinct units dan simpan ke cache
	const allUnits = await getOrSetCache<string[]>(
		await unitsCacheKey(orgId),
		async () => {
			const rows = await db
				.selectDistinct({ unit: lending.unit })
				.from(lending)
				.where(
					and(
						eq(lending.organizationId, orgId),
						isNotNull(lending.unit) // Hindari data null masuk ke cache
					)
				)
				// HAPUS filter like(lending.unit, `%${q}%`) di sini
				.orderBy(lending.unit);

			return rows.map((r) => r.unit).filter(Boolean);
		},
		CacheTTL.LENDING_SUB_ORGANIZATION_UNITS
	);

	// Filter pencarian 'q' dilakukan murni di memori aplikasi
	const filtered = q
		? allUnits.filter((u) => u.toLowerCase().includes(q.toLowerCase())).slice(0, 4)
		: allUnits.slice(0, 4);

	return json(filtered);
};
