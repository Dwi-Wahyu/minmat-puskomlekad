import { query } from '$app/server';
import { db } from '$lib/server/db';
import { itemCategory, item, equipment } from '$lib/server/db/schema';
import { eq, and, like, sql, or, isNull, inArray } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';
import { getOrSetCache, CacheKeys } from '$lib/server/redis';

const categoryQuerySchema = v.object({
	q: v.optional(v.string(), ''),
	page: v.optional(v.number(), 1),
	limit: v.optional(v.number(), 10)
});

export type SubCategoryData = {
	id: string;
	name: string;
	order: number;
	equipmentCount: number;
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

export const getCategoryData = query(categoryQuerySchema, async (args): Promise<CategoryListData> => {
	requireAuth();

	const { q = '', page = 1, limit = 10 } = args;
	const offset = (page - 1) * limit;

	// Use cache to store computed hierarchy results.
	// Since categories are global, cache key is based on search query, page and limit.
	const cacheKey = `category:list:q_${q}:p_${page}:l_${limit}`;
	const CATEGORY_CACHE_TTL = 86400; // 24 hours

	return getOrSetCache(cacheKey, async () => {
		// 1. Fetch all parent categories matching the filter
		// To support searching subcategories, we find parent categories whose name matches q OR who have subcategories matching q
		let parentFilter = isNull(itemCategory.parentId);
		
		if (q) {
			// Find subcategories matching query first to get their parent IDs
			const matchingSubCats = await db
				.select({ parentId: itemCategory.parentId })
				.from(itemCategory)
				.where(and(
					like(itemCategory.name, `%${q}%`),
					sql`parent_id IS NOT NULL`
				));
			const matchingParentIds = matchingSubCats.map(sc => sc.parentId).filter(Boolean) as string[];

			if (matchingParentIds.length > 0) {
				parentFilter = and(
					isNull(itemCategory.parentId),
					or(
						like(itemCategory.name, `%${q}%`),
						inArray(itemCategory.id, matchingParentIds)
					)
				) as any;
			} else {
				parentFilter = and(
					isNull(itemCategory.parentId),
					like(itemCategory.name, `%${q}%`)
				) as any;
			}
		}

		// Count total parents matching filter
		const countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(itemCategory)
			.where(parentFilter);
		const totalItems = countResult[0]?.count ?? 0;

		// Fetch parent categories paginated
		const parents = await db
			.select()
			.from(itemCategory)
			.where(parentFilter)
			.limit(limit)
			.offset(offset)
			.orderBy(itemCategory.order, itemCategory.name);

		const result: ParentCategoryData[] = [];

		for (const p of parents) {
			// Fetch subcategories
			const subs = await db
				.select()
				.from(itemCategory)
				.where(eq(itemCategory.parentId, p.id))
				.orderBy(itemCategory.order, itemCategory.name);

			// Count equipment for parent itself (if no subcategories)
			let parentEquipCount = 0;
			if (subs.length === 0) {
				const eqResult = await db
					.select({ count: sql<number>`count(*)` })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(eq(item.categoryId, p.id));
				parentEquipCount = eqResult[0]?.count ?? 0;
			}

			const subCategoriesData: SubCategoryData[] = [];
			for (const s of subs) {
				const eqResult = await db
					.select({ count: sql<number>`count(*)` })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(eq(item.categoryId, s.id));
				
				subCategoriesData.push({
					id: s.id,
					name: s.name,
					order: s.order ?? 0,
					equipmentCount: eqResult[0]?.count ?? 0
				});
			}

			result.push({
				id: p.id,
				name: p.name,
				order: p.order ?? 0,
				equipmentCount: parentEquipCount,
				subCategories: subCategoriesData
			});
		}

		return {
			categories: result,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalItems / limit),
				totalItems
			}
		};
	}, CATEGORY_CACHE_TTL);
});
