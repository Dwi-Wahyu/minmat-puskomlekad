ALTER TABLE `lending` MODIFY COLUMN `status` enum('DRAFT','APPROVED','REJECTED','PERINTAH_LANGSUNG','DIPINJAM','KEMBALI','DALAM_PERJALANAN','DIKIRIM_KEMBALI') DEFAULT 'DRAFT';--> statement-breakpoint
ALTER TABLE `lending_item` DROP COLUMN `qty`;--> statement-breakpoint
ALTER TABLE `movement` DROP COLUMN `condition_at_arrival`;