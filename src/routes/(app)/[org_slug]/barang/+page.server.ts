import { db } from '$lib/server/db';
import { item, stock, movement, organization } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { deleteFile } from '$lib/server/storage';
import { invalidateOrgInventoryCache } from '$lib/server/redis';

export const load: PageServerLoad = async ({ params }) => {
	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, params.org_slug)
	});

	if (!org) throw fail(404, { message: 'Organisasi tidak ditemukan' });

	return {
		orgId: org.id,
		org_slug: params.org_slug
	};
};

export const actions: Actions = {
	delete: async ({ request, params }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID is required' });

		try {
			// Get organization for cache invalidation
			const org = await db.query.organization.findFirst({
				where: eq(organization.slug, params.org_slug)
			});

			// Get current item for image deletion
			const currentResult = await db.select().from(item).where(eq(item.id, id)).limit(1);

			if (currentResult.length === 0) return fail(404, { message: 'Barang tidak ditemukan' });
			const current = currentResult[0];

			// Check if item is still used in stock before deleting
			const existingStockResult = await db
				.select()
				.from(stock)
				.where(eq(stock.itemId, id))
				.limit(1);

			if (existingStockResult.length > 0 && Number(existingStockResult[0].qty) > 0) {
				return fail(400, {
					message: 'Barang tidak bisa dihapus karena masih memiliki stok di gudang'
				});
			}

			// Delete image if exists
			if (current.imagePath) {
				deleteFile(current.imagePath, 'item');
			}

			await db.delete(item).where(eq(item.id, id));

			// Invalidate cache
			if (org) {
				await invalidateOrgInventoryCache(org.id);
			}

			return { success: true, message: 'Barang berhasil dihapus' };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Gagal menghapus barang' });
		}
	},

	mutate: async ({ request, locals, params }) => {
		const { user } = locals;
		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;
		const qtyInput = formData.get('qty') as string;
		const type = formData.get('type');
		const notes = formData.get('notes') as string;
		const warehouseId = formData.get('warehouseId') as string;

		if (!itemId || !qtyInput || !warehouseId) {
			return fail(400, { message: 'Data mutasi tidak lengkap (pilih barang, jumlah, dan gudang)' });
		}

		try {
			// Get organization for cache invalidation
			const org = await db.query.organization.findFirst({
				where: eq(organization.slug, params.org_slug)
			});

			const qtyNum = Number(qtyInput);
			const delta = type === 'ISSUE' ? -qtyNum : qtyNum;

			await db.transaction(async (tx) => {
				const orgId = org?.id || user?.organization?.id;

				// 1. Record movement
				await tx.insert(movement).values({
					id: crypto.randomUUID(),
					itemId,
					organizationId: orgId,
					eventType: type || 'ADJUSTMENT',
					qty: qtyNum.toString(),
					fromWarehouseId: type === 'ISSUE' || type === 'ADJUSTMENT' ? warehouseId : null,
					toWarehouseId: type === 'RECEIVE' || type === 'ADJUSTMENT' ? warehouseId : null,
					notes: notes || 'Mutasi manual',
					picId: user?.id,
					createdAt: new Date()
				});

				// 2. Update or Insert Stock
				const existingStock = await tx.query.stock.findFirst({
					where: and(eq(stock.itemId, itemId), eq(stock.warehouseId, warehouseId))
				});

				if (existingStock) {
					const newQty = Number(existingStock.qty) + delta;
					if (newQty < 0) throw new Error('Stok tidak mencukupi untuk pengeluaran ini');

					await tx
						.update(stock)
						.set({ qty: newQty.toFixed(4) })
						.where(eq(stock.id, existingStock.id));
				} else {
					if (delta < 0) throw new Error('Stok awal tidak bisa negatif');
					await tx.insert(stock).values({
						id: crypto.randomUUID(),
						itemId,
						warehouseId,
						qty: delta.toFixed(4)
					});
				}
			});

			// Invalidate cache
			if (org) {
				await invalidateOrgInventoryCache(org.id);
			}

			return { success: true, message: 'Mutasi stok berhasil diperbarui' };
		} catch (error) {
			console.error('Error in mutate action:', error);
			return fail(500, { message: error || 'Gagal mencatat mutasi ke database' });
		}
	}
};
