import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, eq, isNull } from 'drizzle-orm';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema, mode: 'default' });

/**
 * Data kategori diekstrak persis dari FORMAT_LAPORAN_MATKOMLEK.xlsx, sheet "BENTUK 16".
 * Setiap entri = 1 kategori induk beserta daftar kategori bawahannya (sesuai urutan baris asli).
 */
const categoryData: { name: string; children: string[] }[] = [
	{ name: 'ALKOM RADIO', children: ['RADIO SSB', 'RDO TRC-340', 'RDO YAESU S-600'] },
	{ name: 'RADIO HF/SSB', children: ['RDO PRM-4700 A', 'RDO TR-2400 MK II'] },
	{ name: 'RADIO VHF/FM', children: ['RDO PRC-77', 'RDO PRC-1077'] },
	{ name: 'RADIO HT UHF/FM', children: ['RDO HT CROSCOM', 'HT TETRA'] },
	{ name: 'REPATAER UHF/FHV', children: ['REPEATER MOTOROLA', 'REPEATER ICOM'] },
	{
		name: 'BASE STATION UHF/VHF',
		children: [
			'BASE STATION XiR M8268',
			'BASE STATION ICOM IC F6061D',
			'BASE STATION MOTOROLLA GM-338'
		]
	},
	{ name: 'BMS', children: ['BMS  POSKO', 'BMS PERSONEL', 'BMS  RANPUR'] },
	{ name: 'KOMSAT', children: ['VSAT MANPACK', 'C-BAND MOBILE', 'SOTM (SATELIT ON THE MOVE)'] },
	{
		name: 'PERNIKA',
		children: [
			'JAMMER KENDARAAN',
			'JAMMER TRANSPORTABLE',
			'AIR PATROL',
			'DRONE NANO UAV (BLACK HORNET)'
		]
	},
	{
		name: 'TATA SUARA',
		children: [
			'SOUND SYSTEM KAPTRONIK',
			'SOUND SYSTEM',
			'SOUND SYSTEM RAMSA',
			'SOUND SYSTEM LAPANGAN'
		]
	},
	{ name: 'VIDEOTRONE', children: ['VIDEOTRONE INDOOR', 'VIDEOTRONE OUTDOOR'] },
	{
		name: 'TRO/PABX',
		children: ['TRO 500 MS', 'TRO 300 MS', 'TRO PABX 200 MS TYPE 3300AX', 'TRO SX 200 MITEL']
	},
	{ name: 'TELEPON', children: ['TELEPON SATELIT', 'TELEPON LAPANGAN'] },
	{
		name: 'KENDARAAN KHUSUS',
		children: [
			'MOBIL KOMOB',
			'MOBIL BEKHAR',
			'MOBIL STOM',
			'MOBIL PERNIKA',
			'MOBIL SOUNDSYSTEM',
			'MOBIL JAMMER'
		]
	},
	{ name: 'SUMBER TENAGA', children: ['ACCU', 'POWERSYTEM', 'SOLAR PANEL', 'DAN SETERUSNYA..'] },
	{ name: 'ALAT BENGKEL', children: ['AVO METER', 'TOOLKIT', 'FREQUENSI COUNTER'] },
	{ name: 'TOWER', children: ['TOWER TRIANGEL'] },
	{ name: 'LAIN-LAIN', children: ['KOMPUTER', 'LAPTOP', 'STARLINK'] }
];

/**
 * Cari kategori existing berdasarkan name + parentId (parentId null = kategori induk).
 * Kalau ketemu -> update order (jaga id lama, aman untuk relasi item yang sudah ada).
 * Kalau belum ada -> insert baru.
 * Dengan begini seeder aman dijalankan berkali-kali (idempotent), tidak ada data yang dihapus.
 */
async function upsertCategory(name: string, parentId: string | null, order: number) {
	const existing = await db.query.itemCategory.findFirst({
		where: parentId
			? and(eq(schema.itemCategory.name, name), eq(schema.itemCategory.parentId, parentId))
			: and(eq(schema.itemCategory.name, name), isNull(schema.itemCategory.parentId))
	});

	if (existing) {
		await db
			.update(schema.itemCategory)
			.set({ order })
			.where(eq(schema.itemCategory.id, existing.id));
		return existing.id;
	}

	const id = crypto.randomUUID();
	await db.insert(schema.itemCategory).values({ id, name, parentId, order });
	return id;
}

async function main() {
	console.log('Sedang melakukan seeding kategori (upsert, tidak menghapus data lama)...');

	let parentOrder = 1;
	for (const parent of categoryData) {
		const parentId = await upsertCategory(parent.name, null, parentOrder);
		console.log(`Kategori induk: ${parent.name}`);

		let childOrder = 1;
		for (const childName of parent.children) {
			await upsertCategory(childName, parentId, childOrder);
			console.log(`  - Kategori bawahan: ${childName}`);
			childOrder++;
		}

		parentOrder++;
	}

	console.log('\nSeeding kategori selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding kategori gagal:', err);
	process.exit(1);
});
