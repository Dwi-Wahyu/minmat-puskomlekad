import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

const redisUrl = env.REDIS_URL || process.env.REDIS_URL || 'redis://redis:6379';

const isBuildTime =
	(typeof process !== 'undefined' && process.env.NODE_ENV === 'test') ||
	(!env.REDIS_URL && typeof window === 'undefined');

// Konfigurasi Redis yang lebih aman untuk production
export const redis = new Redis(redisUrl, {
	maxRetriesPerRequest: 1,
	enableOfflineQueue: false, // Jangan antre perintah jika koneksi mati agar tidak membuat request HTTP menggantung
	connectTimeout: isBuildTime ? 500 : 5000,
	lazyConnect: true,
	reconnectOnError: (err) => {
		const targetError = 'READONLY';
		if (err.message.includes(targetError)) {
			return true;
		}
		return false;
	}
});

redis.on('error', (err) => {
	if (isBuildTime) {
		console.warn('Redis connection deferred during build time.');
	} else {
		console.error('Redis connection error:', err);
	}
});

redis.on('connect', () => {
	console.log('Connected to Redis');
});

/**
 * Utility to get or set cache
 */
export async function getOrSetCache<T>(
	key: string,
	fetchFn: () => Promise<T>,
	ttl = 3600
): Promise<T> {
	try {
		const cachedValue = await redis.get(key);
		if (cachedValue) {
			try {
				console.log(`[Cache Hit] Key: ${key}`);
				return JSON.parse(cachedValue) as T;
			} catch (e) {
				console.error(`Error parsing cache for key ${key}:`, e);
			}
		}
	} catch (err) {
		console.warn(`[Redis Error] Failed to get cache for ${key}:`, err);
		// Lanjut ke fetchFn jika redis error
	}

	console.log(`[Cache Miss] Key: ${key}`);
	const freshData = await fetchFn();

	try {
		if (freshData !== undefined && freshData !== null) {
			await redis.set(key, JSON.stringify(freshData), 'EX', ttl);
		}
	} catch (err) {
		console.warn(`[Redis Error] Failed to set cache for ${key}:`, err);
	}

	return freshData;
}

/**
 * Utility to invalidate cache
 */
export async function invalidateCache(key: string): Promise<void> {
	try {
		console.log(`[Cache Invalidate] Key: ${key}`);
		await redis.del(key);
	} catch (err) {
		console.error(`[Redis Error] Failed to invalidate cache for ${key}:`, err);
	}
}

/**
 * Invalidate semua cache key yang cocok dengan pattern glob.
 * Menggunakan SCAN alih-alih KEYS untuk performa yang lebih baik dan tidak blocking.
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
	try {
		console.log(`[Cache Invalidate Pattern] Pattern: ${pattern}`);
		let cursor = '0';
		const keysToDelete: string[] = [];

		do {
			const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
			cursor = nextCursor;
			keysToDelete.push(...keys);
		} while (cursor !== '0');

		if (keysToDelete.length > 0) {
			await redis.del(...keysToDelete);
			console.log(`[Cache Invalidate Pattern] Deleted ${keysToDelete.length} keys`);
		}
	} catch (err) {
		console.error(`[Redis Error] Failed to invalidate pattern ${pattern}:`, err);
	}
}

/**
 * Konstanta cache key terpusat.
 * Selalu gunakan fungsi ini — jangan hardcode string key di tempat lain.
 */
export const CacheKeys = {
	// Dashboard — include bulan agar auto-expire tiap ganti bulan
	dashboard: (orgId: string) => {
		const now = new Date();
		const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		return `dashboard:${orgId}:${month}`;
	},

	// Notifikasi layout — per user
	notifLayout: (userId: string) => `notif:layout:${userId}`,

	// Daftar alat (equipment list) — per org dan type
	equipmentList: (orgId: string, type: string) => `equipment:list:${orgId}:${type}`,

	// Stok gudang balkir dan komunity — per org
	gudangBalkir: (orgId: string) => `gudang:balkir:${orgId}`,
	gudangKomunity: (orgId: string) => `gudang:komunity:${orgId}`,
	gudangTransito: (orgId: string) => `gudang:transito:${orgId}`,

	// Item list (consumable) — per org
	itemConsumable: (orgId: string) => `item:consumable:${orgId}`,

	// Laporan
	laporanBtk16: (orgSlug: string) => `report:btk-16:${orgSlug}`,
	laporanPernikaLek: (orgSlug: string) => `report:pernika-lek:${orgSlug}`
};

/**
 * TTL standar dalam detik.
 */
export const CacheTTL = {
	NOTIF_LAYOUT: 30, // 30 detik
	DASHBOARD: 120, // 2 menit
	EQUIPMENT_LIST: 300, // 5 menit
	GUDANG: 300, // 5 menit
	ITEM_CONSUMABLE: 300, // 5 menit
	LAPORAN: 3600 // 1 jam
};

/**
 * Invalidasi semua cache yang terkait dengan perubahan equipment atau movement
 * pada suatu organisasi.
 */
export async function invalidateOrgInventoryCache(orgId: string): Promise<void> {
	if (!orgId) return;

	// Kita gunakan Promise.allSettled agar jika satu gagal tidak menghentikan yang lain,
	// meskipun setiap fungsi di atas sudah diproteksi try-catch.
	await Promise.allSettled([
		invalidateCachePattern(`dashboard:${orgId}:*`),
		invalidateCache(CacheKeys.gudangBalkir(orgId)),
		invalidateCache(CacheKeys.gudangKomunity(orgId)),
		invalidateCache(CacheKeys.gudangTransito(orgId)),
		invalidateCachePattern(`equipment:list:${orgId}:*`),
		invalidateCache(CacheKeys.itemConsumable(orgId))
	]);
}

/**
 * Invalidasi cache notifikasi untuk user tertentu.
 */
export async function invalidateNotifCache(userId: string): Promise<void> {
	if (!userId) return;
	await invalidateCache(CacheKeys.notifLayout(userId));
}
