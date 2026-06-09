import { mysqlEnum } from 'drizzle-orm/mysql-core';

export const lendingStatus = mysqlEnum('status', [
	'DRAFT',
	'APPROVED',
	'REJECTED',
	'PERINTAH_LANGSUNG',
	'DIPINJAM',
	'KEMBALI'
]).default('DRAFT');
