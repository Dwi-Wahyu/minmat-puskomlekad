import { eq, inArray, and } from 'drizzle-orm';
import { db } from '../../db'; // Sesuaikan dengan instance konfigurasi Drizzle Anda
import {
	organization,
	warehouse,
	equipment,
	stock,
	item,
	movement,
	lendingItem,
	distributionEquipment
} from '../schema';

export async function clearDenmaMabesadInventory() {
	await db.transaction(async (tx) => {
		// 1. Dapatkan ID Organisasi "DENMA MABESAD"
		const targetOrg = await tx.query.organization.findFirst({
			where: eq(organization.name, 'DENMA MABESAD')
		});

		if (!targetOrg) {
			console.error('Organisasi DENMA MABESAD tidak ditemukan.');
			return;
		}

		const orgId = targetOrg.id;

		// 2. Kumpulkan semua Equipment milik organisasi tersebut
		const orgEquipments = await tx.query.equipment.findMany({
			where: eq(equipment.organizationId, orgId)
		});

		const equipmentIds = orgEquipments.map((e) => e.id);

		// Hapus data di tabel anak yang memiliki foreign key ke equipmentId tanpa onDelete: 'cascade'
		if (equipmentIds.length > 0) {
			await tx.delete(movement).where(inArray(movement.equipmentId, equipmentIds));
			await tx.delete(lendingItem).where(inArray(lendingItem.equipmentId, equipmentIds));
			await tx
				.delete(distributionEquipment)
				.where(inArray(distributionEquipment.equipmentId, equipmentIds));

			// 3. Hapus data utama di tabel Equipment (Alat)
			await tx.delete(equipment).where(eq(equipment.organizationId, orgId));
		}

		// 4. Kumpulkan ID Gudang (Warehouse) milik organisasi untuk menghapus Stock
		const orgWarehouses = await tx.query.warehouse.findMany({
			where: eq(warehouse.organizationId, orgId)
		});

		const warehouseIds = orgWarehouses.map((w) => w.id);

		if (warehouseIds.length > 0) {
			// Dapatkan ID Item yang berjenis CONSUMABLE
			const consumableItems = await tx.query.item.findMany({
				where: eq(item.type, 'CONSUMABLE')
			});

			const consumableItemIds = consumableItems.map((i) => i.id);

			// 5. Hapus Stock consumables di gudang-gudang terkait
			if (consumableItemIds.length > 0) {
				await tx
					.delete(stock)
					.where(
						and(inArray(stock.warehouseId, warehouseIds), inArray(stock.itemId, consumableItemIds))
					);
			}
		}

		console.log('Seluruh data inventaris alat dan consumables DENMA MABESAD berhasil dihapus.');
	});
}
