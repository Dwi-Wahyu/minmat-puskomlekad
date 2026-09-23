import { query } from '$app/server';
import { db } from '$lib/server/db';
import { itemCategory, item, equipment, organization } from '$lib/server/db/schema';
import { eq, and, like, sql, or, isNull, isNotNull, inArray } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import { getOrgAndSubordinateIds } from '$lib/server/org.utils';
import * as v from 'valibot';
import { getOrSetCache } from '$lib/server/redis';

const categoryQuerySchema = v.object({
	orgSlug: v.string(),
	q: v.optional(v.string(), ''),
	page: v.optional(v.number(), 1),
	limit: v.optional(v.number(), 10)
});

export type SubCategoryData = {
	id: string;
	name: string;
	order: number;
	equipmentCount: number;
	isVirtual?: boolean;
};

export type ParentCategoryData = {
	id: string;
	name: string;
	order: number;
	equipmentCount: number; // For parent itself if no subcategories
	subCategories: SubCategoryData[];
};

export type CategoryListData = {
	categories: ParentCategoryData[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
};

export const getCategoryData = query(
	categoryQuerySchema,
	async (args): Promise<CategoryListData> => {
		requireAuth();

		const { orgSlug, q = '', page = 1, limit = 10 } = args;
		const offset = (page - 1) * limit;

		// Resolve organization ID from slug
		const org = await db.query.organization.findFirst({
			where: eq(organization.slug, orgSlug)
		});

		if (!org) {
			throw new Error('Organisasi tidak ditemukan');
		}

		const orgId = org.id;
		const orgIds = await getOrgAndSubordinateIds(orgId);

		// Use cache to store computed hierarchy results.
		// Since equipment counts are organization-specific, cache key is scoped by orgId.
		const cacheKey = `category:list:org_${orgId}:q_${q}:p_${page}:l_${limit}`;
		const CATEGORY_CACHE_TTL = 86400; // 24 hours

		return getOrSetCache(
			cacheKey,
			async () => {
				// 1. Fetch all parent categories matching the filter
				// To support searching subcategories, we find parent categories whose name matches q OR who have subcategories matching q
				let parentFilter = isNull(itemCategory.parentId);

				if (q) {
					// Find subcategory IDs that match search
					const matchingSubCatParentIds = await db
						.select({ parentId: itemCategory.parentId })
						.from(itemCategory)
						.where(and(like(itemCategory.name, `%${q}%`), isNotNull(itemCategory.parentId)));

					const parentIdsFromSubs = matchingSubCatParentIds
						.map((sc) => sc.parentId)
						.filter((id): id is string => id !== null);

					if (parentIdsFromSubs.length > 0) {
						parentFilter = and(
							isNull(itemCategory.parentId),
							or(like(itemCategory.name, `%${q}%`), inArray(itemCategory.id, parentIdsFromSubs))
						)!;
					} else {
						parentFilter = and(isNull(itemCategory.parentId), like(itemCategory.name, `%${q}%`))!;
					}
				}

				// 2. Fetch paginated parent categories
				const parentCategories = await db.query.itemCategory.findMany({
					where: parentFilter,
					limit: limit,
					offset: offset,
					orderBy: (itemCategory, { asc }) => [asc(itemCategory.order), asc(itemCategory.name)]
				});

				// Count total matching parent categories
				const totalParentsResult = await db
					.select({ count: sql<number>`count(*)` })
					.from(itemCategory)
					.where(parentFilter);
				const totalParents = totalParentsResult[0]?.count ?? 0;

				// 3. For each parent category, fetch its subcategories and compute equipment counts
				const data: ParentCategoryData[] = [];

				for (const p of parentCategories) {
					// Fetch subcategories of this parent
					const subs = await db.query.itemCategory.findMany({
						where: eq(itemCategory.parentId, p.id),
						orderBy: (itemCategory, { asc }) => [asc(itemCategory.order), asc(itemCategory.name)]
					});

					// Count equipment directly assigned to parent category itself
					const parentEqResult = await db
						.select({ count: sql<number>`count(*)` })
						.from(equipment)
						.innerJoin(item, eq(equipment.itemId, item.id))
						.where(and(eq(item.categoryId, p.id), inArray(equipment.organizationId, orgIds)));
					const parentEquipCount = parentEqResult[0]?.count ?? 0;

					const subCategoriesData: SubCategoryData[] = [];
					for (const s of subs) {
						const eqResult = await db
							.select({ count: sql<number>`count(*)` })
							.from(equipment)
							.innerJoin(item, eq(equipment.itemId, item.id))
							.where(and(eq(item.categoryId, s.id), inArray(equipment.organizationId, orgIds)));

						subCategoriesData.push({
							id: s.id,
							name: s.name,
							order: s.order ?? 0,
							equipmentCount: eqResult[0]?.count ?? 0
						});
					}

					data.push({
						id: p.id,
						name: p.name,
						order: p.order ?? 0,
						equipmentCount: parentEquipCount,
						subCategories: subCategoriesData
					});
				}

				return {
					categories: data,
					pagination: {
						currentPage: page,
						totalPages: Math.ceil(totalParents / limit),
						totalItems: totalParents
					}
				};
			},
			CATEGORY_CACHE_TTL
		);
	}
);
