CREATE TABLE `api_key` (
	`id` varchar(36) NOT NULL,
	`key` varchar(255) NOT NULL,
	`name` text,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	`expires_at` timestamp(3),
	`last_used_at` timestamp(3),
	CONSTRAINT `api_key_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_key_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `api_key` ADD CONSTRAINT `api_key_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `api_key_userId_idx` ON `api_key` (`user_id`);