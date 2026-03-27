ALTER TABLE `lending` MODIFY COLUMN `status` enum('DRAFT','APPROVED','REJECTED','PERINTAH_LANGSUNG','DIPINJAM','KEMBALI') DEFAULT 'DRAFT';--> statement-breakpoint
ALTER TABLE `lending` ADD `override_reason` text;--> statement-breakpoint
ALTER TABLE `lending` ADD `override_by` varchar(36);--> statement-breakpoint
ALTER TABLE `lending` ADD CONSTRAINT `lending_override_by_user_id_fk` FOREIGN KEY (`override_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;