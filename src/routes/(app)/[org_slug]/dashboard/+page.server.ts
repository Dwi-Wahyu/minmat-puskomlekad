import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	equipment,
	stock,
	movement,
	warehouse,
	item,
	organization,
	user,
	lending,
	member
} from '$lib/server/db/schema';
import { eq, and, count, sum, gte, desc, sql, inArray, ne } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getOrSetCache, CacheTTL } from '$lib/server/redis';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Ambil ID organisasi berdasarkan slug dari URL - Menggunakan select eksplisit untuk keamanan
	const orgResult = await db
		.select()
		.from(organization)
		.where(eq(organization.slug, params.org_slug))
		.limit(1);

	if (orgResult.length === 0) {
		throw error(404, 'Organization not found');
	}

	const org = orgResult[0];
	const orgId = org.id;

	const OPERATOR_ROLES = ['operatorPusatDanDaerah', 'operatorBinmatDanBekharrah'];
	const isOperator = locals.user?.role && OPERATOR_ROLES.includes(locals.user.role);

	// Dashboard khusus operator — tidak di-cache per org, tapi per user
	if (isOperator) {
		// Ambil mutasi TRANSFER_OUT yang perlu diproses oleh org ini
		const pendingTransferIn = await db
			.select({
				movement: movement,
				equipment: equipment,
				item: item,
				pic: user
			})
			.from(movement)
			.innerJoin(equipment, eq(movement.equipmentId, equipment.id))
			.innerJoin(item, eq(equipment.itemId, item.id))
			.leftJoin(user, eq(movement.picId, user.id))
			.where(
				and(
					eq(movement.eventType, 'TRANSFER_OUT'),
					eq(movement.organizationId, orgId),
					eq(equipment.status, 'TRANSIT'),
					ne(movement.picId, locals.user!.id)
				)
			)
			.limit(10)
			.orderBy(desc(movement.createdAt));

		// Hitung jumlah alat TRANSIT di org ini (perlu konfirmasi)
		const [transitCount] = await db
			.select({ count: count() })
			.from(equipment)
			.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'TRANSIT')));

		// Hitung mutasi bulan ini yang dibuat oleh org ini
		const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
		const [myMovementsCount] = await db
			.select({ count: count() })
			.from(movement)
			.where(and(eq(movement.organizationId, orgId), gte(movement.createdAt, startOfMonth)));

		// Hitung alat kondisi tidak baik
		const [damagedCount] = await db
			.select({ count: count() })
			.from(equipment)
			.where(and(eq(equipment.organizationId, orgId), ne(equipment.condition, 'BAIK')));

		// Cek apakah org ini adalah org induk (Puskomlekad = tidak punya parentId)
		const orgData = await db.query.organization.findFirst({
			where: eq(organization.id, orgId),
			columns: { parentId: true }
		});
		const isPuskomlekad = !orgData?.parentId;
		let pendingLendingActions: {
			lendingId: string;
			unit: string;
			status: string;
			actionLabel: string;
			createdAt: Date;
		}[] = [];

		if (isPuskomlekad) {
			// Operator Puskomlekad perlu aksi pada status APPROVED/PERINTAH_LANGSUNG dan DIKIRIM_KEMBALI
			const pending = await db.query.lending.findMany({
				where: and(
					eq(lending.organizationId, orgId),
					inArray(lending.status, ['APPROVED', 'PERINTAH_LANGSUNG', 'DIKIRIM_KEMBALI'])
				),
				columns: { id: true, unit: true, status: true, createdAt: true },
				limit: 10,
				orderBy: (l, { desc }) => [desc(l.createdAt)]
			});

			pendingLendingActions = pending.map((l) => ({
				lendingId: l.id,
				unit: l.unit,
				status: l.status!,
				actionLabel:
					l.status === 'DIKIRIM_KEMBALI'
						? 'Konfirmasi penerimaan kembali'
						: 'Keluarkan alat dari gudang',
				createdAt: l.createdAt
			}));
		} else {
			// Operator satuan jajaran perlu aksi pada status DALAM_PENGIRIMAN dan DIPINJAM
			// Cari lending yang ditujukan ke org INDUK tapi requestedBy dari org ini
			const members = await db.query.member.findMany({
				where: eq(member.organizationId, orgId),
				columns: { userId: true }
			});
			const memberIds = members.map((m) => m.userId!).filter(Boolean);

			if (memberIds.length > 0) {
				const pending = await db.query.lending.findMany({
					where: and(
						inArray(lending.requestedBy, memberIds),
						inArray(lending.status, ['DALAM_PENGIRIMAN', 'DIPINJAM'])
					),
					columns: { id: true, unit: true, status: true, createdAt: true },
					limit: 10,
					orderBy: (l, { desc }) => [desc(l.createdAt)]
				});

				pendingLendingActions = pending.map((l) => ({
					lendingId: l.id,
					unit: l.unit,
					status: l.status!,
					actionLabel:
						l.status === 'DALAM_PENGIRIMAN'
							? 'Konfirmasi penerimaan alat'
							: 'Kirim kembali ke gudang',
					createdAt: l.createdAt
				}));
			}
		}

		return {
			org_slug: params.org_slug,
			isOperator: true,
			operatorDashboard: {
				pendingTransferIn: pendingTransferIn.map((r) => ({
					movementId: r.movement.id,
					equipmentId: r.equipment.id,
					equipmentType: r.item.equipmentType,
					itemName: r.item.name,
					serialNumber: r.equipment.serialNumber,
					fromWarehouseName: '-', // warehouse info could be added if needed via more joins
					picName: r.pic?.name ?? '-',
					createdAt: r.movement.createdAt
				})),
				transitCount: Number(transitCount?.count) || 0,
				myMovementsThisMonth: Number(myMovementsCount?.count) || 0,
				damagedCount: Number(damagedCount?.count) || 0,
				pendingLendingActions
			}
		};
	}

	// Baca filter dari URL search params
	const period = url.searchParams.get('period') || 'this_month';
	const equipmentType = url.searchParams.get('type') || 'ALL'; // 'ALL' | 'ALKOMLEK' | 'PERNIKA_LEK'

	const cacheKey = `dashboard:${orgId}:${period}:${equipmentType}`;

	return getOrSetCache(
		cacheKey,
		async () => {
			// Hitung date range berdasarkan period
			const now = new Date();
			let startDate: Date;

			switch (period) {
				case '3_months':
					startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
					break;
				case '6_months':
					startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
					break;
				case 'this_year':
					startDate = new Date(now.getFullYear(), 0, 1);
					break;
				case 'this_month':
				default:
					startDate = new Date(now.getFullYear(), now.getMonth(), 1);
					break;
			}

			// Filter tipe alat — null berarti tidak difilter (ALL)
			const equipmentTypeFilter =
				equipmentType !== 'ALL'
					? eq(item.equipmentType, equipmentType as 'ALKOMLEK' | 'PERNIKA_LEK')
					: undefined;

			// Ringkasan Stats (Top Cards)
			const [activeInventoryCount] = await db
				.select({ count: count() })
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(and(eq(equipment.organizationId, orgId), equipmentTypeFilter));

			const [warehouseStockSum] = await db
				.select({ total: sum(stock.qty) })
				.from(stock)
				.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
				.where(eq(warehouse.organizationId, orgId));

			const [damagedItemsCount] = await db
				.select({ count: count() })
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(
					and(
						eq(equipment.organizationId, orgId),
						sql`${equipment.condition} != 'BAIK'`,
						equipmentTypeFilter
					)
				);

			const [monthlyMovementsCount] = await db
				.select({ count: count() })
				.from(movement)
				.where(and(eq(movement.organizationId, orgId), gte(movement.createdAt, startDate)));

			// Transito Stats
			const [transitoIncoming] = await db
				.select({ count: count() })
				.from(movement)
				.where(
					and(
						eq(movement.organizationId, orgId),
						eq(movement.classification, 'TRANSITO'),
						inArray(movement.eventType, ['RECEIVE', 'TRANSFER_IN']),
						gte(movement.createdAt, startDate)
					)
				);

			const [transitoOutgoing] = await db
				.select({ count: count() })
				.from(movement)
				.where(
					and(
						eq(movement.organizationId, orgId),
						eq(movement.classification, 'TRANSITO'),
						inArray(movement.eventType, ['ISSUE', 'TRANSFER_OUT']),
						gte(movement.createdAt, startDate)
					)
				);

			const [transitoPending] = await db
				.select({ count: count() })
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(
					and(
						eq(equipment.organizationId, orgId),
						eq(equipment.status, 'TRANSIT'),
						equipmentTypeFilter
					)
				);

			// Komoditi Stats
			const [komoditiActive] = await db
				.select({ count: count() })
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(
					and(
						eq(equipment.organizationId, orgId),
						eq(equipment.status, 'IN_USE'),
						equipmentTypeFilter
					)
				);

			const [komoditiOutgoing] = await db
				.select({ count: count() })
				.from(movement)
				.where(
					and(
						eq(movement.organizationId, orgId),
						eq(movement.classification, 'KOMUNITY'),
						inArray(movement.eventType, ['ISSUE', 'TRANSFER_OUT', 'DISTRIBUTE_OUT']),
						gte(movement.createdAt, startDate)
					)
				);

			const [komoditiDamaged] = await db
				.select({ count: count() })
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(
					and(
						eq(equipment.organizationId, orgId),
						eq(equipment.status, 'IN_USE'),
						sql`${equipment.condition} != 'BAIK'`,
						equipmentTypeFilter
					)
				);

			// Balkir Stats (Ready Stock/Main Inventory)
			const [balkirTotal] = await db
				.select({ count: count() })
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(
					and(
						eq(equipment.organizationId, orgId),
						eq(equipment.status, 'READY'),
						equipmentTypeFilter
					)
				);

			const [balkirReady] = await db
				.select({ count: count() })
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(
					and(
						eq(equipment.organizationId, orgId),
						eq(equipment.status, 'READY'),
						eq(equipment.condition, 'BAIK'),
						equipmentTypeFilter
					)
				);

			const [balkirDamaged] = await db
				.select({ count: count() })
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(
					and(
						eq(equipment.organizationId, orgId),
						eq(equipment.status, 'READY'),
						sql`${equipment.condition} != 'BAIK'`,
						equipmentTypeFilter
					)
				);

			const [balkirIncoming] = await db
				.select({ count: count() })
				.from(movement)
				.where(
					and(
						eq(movement.organizationId, orgId),
						eq(movement.classification, 'BALKIR'),
						inArray(movement.eventType, ['RECEIVE', 'TRANSFER_IN']),
						gte(movement.createdAt, startDate)
					)
				);

			const [balkirOutgoing] = await db
				.select({ count: count() })
				.from(movement)
				.where(
					and(
						eq(movement.organizationId, orgId),
						eq(movement.classification, 'BALKIR'),
						inArray(movement.eventType, ['ISSUE', 'TRANSFER_OUT']),
						gte(movement.createdAt, startDate)
					)
				);

			// Daftar Alat Terbaru - Menggunakan join eksplisit untuk menghindari LEFT JOIN LATERAL
			const recentEquipmentsResults = await db
				.select({
					equipment: equipment,
					item: item
				})
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(and(eq(equipment.organizationId, orgId), equipmentTypeFilter))
				.limit(5)
				.orderBy(desc(equipment.createdAt));

			return {
				org_slug: params.org_slug,
				activeFilters: {
					period,
					equipmentType
				},
				summary: {
					activeInventory: Number(activeInventoryCount?.count) || 0,
					warehouseStock: Number(warehouseStockSum?.total) || 0,
					damagedItems: Number(damagedItemsCount?.count) || 0,
					monthlyMovements: Number(monthlyMovementsCount?.count) || 0
				},
				transito: {
					incoming: Number(transitoIncoming?.count) || 0,
					outgoing: Number(transitoOutgoing?.count) || 0,
					pending: Number(transitoPending?.count) || 0
				},
				komoditi: {
					active: Number(komoditiActive?.count) || 0,
					outgoing: Number(komoditiOutgoing?.count) || 0,
					damaged: Number(komoditiDamaged?.count) || 0
				},
				balkir: {
					total: Number(balkirTotal?.count) || 0,
					used: Number(komoditiActive?.count) || 0,
					ready: Number(balkirReady?.count) || 0,
					damaged: Number(balkirDamaged?.count) || 0,
					incoming: Number(balkirIncoming?.count) || 0,
					outgoing: Number(balkirOutgoing?.count) || 0
				},
				recentEquipments: recentEquipmentsResults.map((r) => ({
					id: r.equipment.id,
					name: r.item.name,
					brand: r.equipment.brand,
					serialNumber: r.equipment.serialNumber,
					type: r.item.equipmentType,
					condition: r.equipment.condition,
					status: r.equipment.status
				}))
			};
		},
		CacheTTL.DASHBOARD
	);
};
