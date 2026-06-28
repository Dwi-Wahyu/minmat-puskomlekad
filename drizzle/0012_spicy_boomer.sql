ALTER TABLE `audit_log` DROP FOREIGN KEY `audit_log_user_id_user_id_fk`;
--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;