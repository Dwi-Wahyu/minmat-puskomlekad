import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const EXCEL_PATH = path.resolve(process.cwd(), 'data-asli/MERDEKA.xlsx');
const OUTPUT_DIR = path.resolve(process.cwd(), 'src/lib/server/db/csv/merdeka');

if (!fs.existsSync(EXCEL_PATH)) {
	console.error(`❌ File Excel tidak ditemukan: ${EXCEL_PATH}`);
	process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('════════════════════════════════════════════════════');
console.log('  📑 EKSTRAKSI DATA MERDEKA.xlsx KE FILE CSV');
console.log('════════════════════════════════════════════════════');
console.log(`  File Excel : ${EXCEL_PATH}`);
console.log(`  Output CSV : ${OUTPUT_DIR}`);

const wb = XLSX.readFile(EXCEL_PATH);
const sheetName = wb.SheetNames.find((s) => s.trim() === 'NOMINATIF');
if (!sheetName) {
	console.error('❌ Sheet NOMINATIF tidak ditemukan di dalam workbook!');
	process.exit(1);
}

const ws = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as (string | number | null | undefined)[][];

const slugify = (name: string) =>
	name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');

const toCsvRow = (arr: (string | number | null | undefined)[]): string =>
	arr
		.map((v) => {
			if (v === null || v === undefined) return '';
			const str = String(v).trim();
			if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
				return `"${str.replace(/"/g, '""')}"`;
			}
			return str;
		})
		.join(',');

const VALID_UNITS = new Set([
	'PCS',
	'BOX',
	'METER',
	'LOT',
	'BUAH',
	'ROLL',
	'UNIT',
	'SET',
	'PAKET',
	'CABINET'
]);

const L0_MAP: Record<string, { name: string; slug: string }> = {
	I: { name: 'KOMLEKDAM XIII/MERDEKA', slug: 'komlekdam-xiii-merdeka' },
	II: { name: 'KOREM 131/SANTIAGO', slug: 'korem-131-santiago' },
	III: { name: 'KOREM 133/NANI WARTABONE', slug: 'korem-133-nani-wartabone' },
	IV: { name: 'BRIGIF-22/OTAMANASA', slug: 'brigif-22-otamanasa' },
	V: { name: 'SATPUR/BANPUR KODAM XIII/MDK', slug: 'satpur-banpur-merdeka' }
};

let currentL0: { name: string; slug: string } | null = null;
let currentL1: { name: string; slug: string } | null = null;
let currentCat = 'ALKOM RDO';

const satuanList: { level: 'L0' | 'L1'; name: string; slug: string; parentSlug: string }[] = [];
const satuanSet = new Set<string>();

const categoriesSet = new Set<string>();
const itemsList: any[] = [];
const equipmentList: any[] = [];
const movementList: any[] = [];

function setL1(name: string) {
	let cleanName = name.trim().replace(/\r?\n|\r/g, ' ');
	if (cleanName === 'DENKOMLEMREM 133') cleanName = 'DENKOMLEKREM 133';
	if (cleanName === 'POMDAM XIIII/MDK') cleanName = 'POMDAM XIII/MDK';

	const slug = slugify(cleanName);
	currentL1 = { name: cleanName, slug };

	if (!satuanSet.has(slug) && currentL0) {
		satuanSet.add(slug);
		satuanList.push({
			level: 'L1',
			name: cleanName,
			slug,
			parentSlug: currentL0.slug
		});
	}
}

let eqCounter = 1;
let itmCounter = 1;
let movCounter = 1;

for (let i = 9; i < rows.length; i++) {
	const r = rows[i];
	if (!r || r.length === 0) continue;

	const col0 = r[0] !== undefined && r[0] !== null ? String(r[0]).trim() : '';
	const col1 = r[1] !== undefined && r[1] !== null ? String(r[1]).trim() : '';
	const col2 = r[2] !== undefined && r[2] !== null ? String(r[2]).trim() : '';
	const col3 = r[3] !== undefined && r[3] !== null ? String(r[3]).trim() : '';
	const col4 = r[4] !== undefined && r[4] !== null ? String(r[4]).trim() : '';
	const col5 = r[5] !== undefined && r[5] !== null ? String(r[5]).trim() : '';
	const col6 = r[6] !== undefined && r[6] !== null ? String(r[6]).trim() : '';
	const col7 = r[7] !== undefined && r[7] !== null ? String(r[7]).trim() : '';
	const col8 = Number(r[8]) || 0;
	const col9 = Number(r[9]) || 0;
	const col10 = Number(r[10]) || 0;
	const col11 = Number(r[11]) || 0;
	const col12 = r[12] !== undefined && r[12] !== null ? String(r[12]).trim() : '';
	const col13 = r[13] !== undefined && r[13] !== null ? String(r[13]).trim() : '';

	// 1. Check L0 (Roman numerals)
	if (L0_MAP[col0]) {
		currentL0 = L0_MAP[col0];
		currentL1 = null;
		if (!satuanSet.has(currentL0.slug)) {
			satuanSet.add(currentL0.slug);
			satuanList.push({
				level: 'L0',
				name: currentL0.name,
				slug: currentL0.slug,
				parentSlug: 'merdeka'
			});
		}
		continue;
	}

	// 2. Check L1 Satuan header row
	if (/^[A-Z]$/.test(col0) && !col2) {
		if (col4 && !['ALKOM RDO', 'ALKOM SALURAN'].includes(col4.toUpperCase())) {
			setL1(col4);
		} else {
			// Satuan name on previous row
			for (let prevIdx = i - 1; prevIdx >= Math.max(0, i - 4); prevIdx--) {
				const pr = rows[prevIdx];
				if (pr && pr[4] && String(pr[4]).trim()) {
					setL1(String(pr[4]).trim());
					break;
				}
			}
		}
		if (col4 && ['ALKOM RDO', 'ALKOM SALURAN'].includes(col4.toUpperCase())) {
			currentCat = col4.trim().toUpperCase();
			categoriesSet.add(currentCat);
		}
		continue;
	}

	// 3. Category header
	if (/^\d+$/.test(col1) && col4 && !col2) {
		currentCat = col4.trim().toUpperCase();
		categoriesSet.add(currentCat);
		continue;
	}

	// 4. Materiil summary row
	if (col2 && col4) {
		let rawUnit = col6 ? col6.trim().toUpperCase() : 'UNIT';
		if (!VALID_UNITS.has(rawUnit)) {
			rawUnit = 'UNIT';
		}

		const itemId = `MDK-ITM-${String(itmCounter++).padStart(5, '0')}`;
		const itemName = col4.trim().replace(/\r?\n|\r/g, ' ');
		const brand = col5 ? col5.trim().replace(/\r?\n|\r/g, ' ') : '';
		const equipmentType = currentCat.includes('PERNIKA') ? 'PERNIKA_LEK' : 'ALKOMLEK';

		itemsList.push({
			id: itemId,
			name: itemName,
			type: 'ASSET',
			baseUnit: rawUnit,
			category: currentCat,
			description: brand ? `Merk/Type: ${brand}` : '',
			equipmentType,
			createdAt: new Date().toISOString()
		});

		// Check if followed by serial rows
		const serialRows: any[] = [];
		let j = i + 1;
		while (j < rows.length) {
			const nr = rows[j];
			if (!nr || nr.length === 0) {
				j++;
				continue;
			}
			const ncol0 = nr[0] !== undefined && nr[0] !== null ? String(nr[0]).trim() : '';
			const ncol1 = nr[1] !== undefined && nr[1] !== null ? String(nr[1]).trim() : '';
			const ncol2 = nr[2] !== undefined && nr[2] !== null ? String(nr[2]).trim() : '';
			const ncol4 = nr[4] !== undefined && nr[4] !== null ? String(nr[4]).trim() : '';
			const ncol7 = nr[7] !== undefined && nr[7] !== null ? String(nr[7]).trim() : '';

			// Stop if next item or next satuan
			if (ncol2 || L0_MAP[ncol0] || (/^[A-Z]$/.test(ncol0) && ncol4)) {
				break;
			}

			// Check if this is a serial row
			if (/^\d+\)/.test(ncol1) || (ncol7 && ncol7 !== '-' && ncol7 !== 'NIHIL')) {
				serialRows.push({
					rowIdx: j,
					noUrut: ncol1,
					serial: ncol7,
					b: Number(nr[9]) || 0,
					rr: Number(nr[10]) || 0,
					rb: Number(nr[11]) || 0,
					location: nr[12] ? String(nr[12]).trim() : col12,
					ket: nr[13] ? String(nr[13]).trim() : col13
				});
			}
			j++;
		}

		const satuanSlug = currentL1 ? currentL1.slug : currentL0 ? currentL0.slug : 'merdeka';

		if (serialRows.length > 0) {
			for (const sr of serialRows) {
				const eqId = `MDK-EQP-${String(eqCounter++).padStart(5, '0')}`;
				let cond = 'BAIK';
				if (sr.rb > 0) cond = 'RUSAK_BERAT';
				else if (sr.rr > 0) cond = 'RUSAK_RINGAN';

				let sn = sr.serial ? sr.serial.trim() : '';
				if (
					[
						'-',
						'NIHIL',
						'TIDAK ADA',
						'TIDAKADA',
						'0',
						'TNS',
						'NO. SERI',
						'TANPA NO SERI',
						'TANPA NO. SERI'
					].includes(sn.toUpperCase())
				) {
					sn = '';
				}

				equipmentList.push({
					id: eqId,
					itemId,
					serialNumber: sn,
					brand,
					condition: cond,
					status: 'READY',
					satuanSlug,
					location: sr.location || '',
					createdAt: new Date().toISOString()
				});

				movementList.push({
					id: `MDK-MOV-${String(movCounter++).padStart(5, '0')}`,
					itemId,
					equipmentId: eqId,
					eventType: 'RECEIVE',
					qty: 1,
					unit: rawUnit,
					classification: 'KOMUNITY',
					satuanSlug,
					location: sr.location || '',
					notes: sr.ket || '',
					createdAt: new Date().toISOString()
				});
			}
		} else {
			// Non-serialized item
			const count = col8 > 0 ? col8 : 1;
			let cond = 'BAIK';
			if (col11 > 0) cond = 'RUSAK_BERAT';
			else if (col10 > 0) cond = 'RUSAK_RINGAN';

			let sn = col7 ? col7.trim() : '';
			if (
				[
					'-',
					'NIHIL',
					'TIDAK ADA',
					'TIDAKADA',
					'0',
					'TNS',
					'NO. SERI',
					'TANPA NO SERI',
					'TANPA NO. SERI'
				].includes(sn.toUpperCase())
			) {
				sn = '';
			}

			for (let k = 0; k < count; k++) {
				const eqId = `MDK-EQP-${String(eqCounter++).padStart(5, '0')}`;
				equipmentList.push({
					id: eqId,
					itemId,
					serialNumber: k === 0 ? sn : '',
					brand,
					condition: cond,
					status: 'READY',
					satuanSlug,
					location: col12 || '',
					createdAt: new Date().toISOString()
				});

				movementList.push({
					id: `MDK-MOV-${String(movCounter++).padStart(5, '0')}`,
					itemId,
					equipmentId: eqId,
					eventType: 'RECEIVE',
					qty: 1,
					unit: rawUnit,
					classification: 'KOMUNITY',
					satuanSlug,
					location: col12 || '',
					notes: col13 || '',
					createdAt: new Date().toISOString()
				});
			}
		}
	}
}

// ─── TULIS KE FILE CSV ─────────────────────────────────────────────────────────

// 1. satuan.csv
const satuanHeader = 'level,name,slug,parentSlug';
const satuanContent = [
	satuanHeader,
	...satuanList.map((s) => toCsvRow([s.level, s.name, s.slug, s.parentSlug]))
].join('\n');
fs.writeFileSync(path.join(OUTPUT_DIR, 'satuan.csv'), satuanContent, 'utf-8');
console.log(`✅ satuan.csv berhasil dibuat (${satuanList.length} baris)`);

// 2. categories.csv
const categoriesHeader = 'name';
const categoriesContent = [
	categoriesHeader,
	...Array.from(categoriesSet)
		.sort()
		.map((c) => toCsvRow([c]))
].join('\n');
fs.writeFileSync(path.join(OUTPUT_DIR, 'categories.csv'), categoriesContent, 'utf-8');
console.log(`✅ categories.csv berhasil dibuat (${categoriesSet.size} baris)`);

// 3. items.csv
const itemsHeader = 'id,name,type,baseUnit,category,description,equipmentType,createdAt';
const itemsContent = [
	itemsHeader,
	...itemsList.map((it) =>
		toCsvRow([
			it.id,
			it.name,
			it.type,
			it.baseUnit,
			it.category,
			it.description,
			it.equipmentType,
			it.createdAt
		])
	)
].join('\n');
fs.writeFileSync(path.join(OUTPUT_DIR, 'items.csv'), itemsContent, 'utf-8');
console.log(`✅ items.csv berhasil dibuat (${itemsList.length} baris)`);

// 4. equipment.csv
const equipmentHeader = 'id,itemId,serialNumber,brand,condition,status,satuanSlug,location,createdAt';
const equipmentContent = [
	equipmentHeader,
	...equipmentList.map((eq) =>
		toCsvRow([
			eq.id,
			eq.itemId,
			eq.serialNumber,
			eq.brand,
			eq.condition,
			eq.status,
			eq.satuanSlug,
			eq.location,
			eq.createdAt
		])
	)
].join('\n');
fs.writeFileSync(path.join(OUTPUT_DIR, 'equipment.csv'), equipmentContent, 'utf-8');
console.log(`✅ equipment.csv berhasil dibuat (${equipmentList.length} baris)`);

// 5. movement_receive.csv
const movementHeader =
	'id,itemId,equipmentId,eventType,qty,unit,classification,satuanSlug,location,notes,createdAt';
const movementContent = [
	movementHeader,
	...movementList.map((mv) =>
		toCsvRow([
			mv.id,
			mv.itemId,
			mv.equipmentId,
			mv.eventType,
			mv.qty,
			mv.unit,
			mv.classification,
			mv.satuanSlug,
			mv.location,
			mv.notes,
			mv.createdAt
		])
	)
].join('\n');
fs.writeFileSync(path.join(OUTPUT_DIR, 'movement_receive.csv'), movementContent, 'utf-8');
console.log(`✅ movement_receive.csv berhasil dibuat (${movementList.length} baris)`);

console.log('\n🎉 Seluruh 5 file CSV MERDEKA berhasil diekstrak dengan sukses!');
