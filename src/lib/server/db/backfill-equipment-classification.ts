import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from './schema';
import * as authSchema from './auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

const auth = betterAuth({
	baseURL: process.env.ORIGIN,
	secret: process.env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'mysql' })
});

/**
 * Backfill equipment.classification dari movement terakhir per equipmentId.
 * Read-only terhadap tabel movement — hanya menulis ke equipment.classification.
 * Aman dijalankan berkali-kali (idempotent) karena selalu ambil movement TERBARU.
 */
async function main() {
	console.log('🔄 Backfill equipment.classification dari histori movement...');

	// Ambil classification movement terakhir per equipmentId menggunakan window function.
	// MySQL 8+ support ROW_NUMBER(), pastikan versi DB mendukung (cek dengan `SELECT VERSION();`).
	const result = await db.execute(sql`
        UPDATE equipment e
        INNER JOIN (
            SELECT m.equipment_id, m.movement_classification,
                ROW_NUMBER() OVER (PARTITION BY m.equipment_id ORDER BY m.created_at DESC) AS rn
            FROM movement m
            WHERE m.equipment_id IS NOT NULL AND m.movement_classification IS NOT NULL
        ) latest ON latest.equipment_id = e.id AND latest.rn = 1
        SET e.classification = latest.movement_classification
        WHERE e.classification IS NULL
	`);

	console.log('✅ Backfill selesai.', result);

	// Laporkan berapa equipment yang TIDAK terbackfill (tidak punya movement classification sama sekali)
	const [unbackfilled] = await db.execute(sql`
		SELECT COUNT(*) as count FROM equipment WHERE classification IS NULL
	`);
	console.log('⚠️  Equipment tanpa classification setelah backfill:', unbackfilled);

	process.exit(0);
}

main().catch((err) => {
	console.error('❌ Backfill gagal:', err);
	process.exit(1);
});
