CREATE TABLE `equipment` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`serial_number` varchar(100),
	`brand` varchar(100),
	`type` enum('ALKOMLEK','PERNIKA_LEK') NOT NULL,
	`category` varchar(100) NOT NULL,
	`condition` enum('BAIK','RUSAK_RINGAN','RUSAK_BERAT') NOT NULL DEFAULT 'BAIK',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`),
	CONSTRAINT `equipment_serial_number_unique` UNIQUE(`serial_number`)
);
--> statement-breakpoint
CREATE TABLE `inventory_stock` (
	`id` varchar(36) NOT NULL,
	`equipment_id` varchar(36),
	`warehouse_id` varchar(36),
	`quantity` int NOT NULL DEFAULT 0,
	`stock_status` enum('KOMUNITY','TRANSITO','BALKIR') NOT NULL,
	CONSTRAINT `inventory_stock_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lending` (
	`id` varchar(36) NOT NULL,
	`equipment_id` varchar(36),
	`purpose` enum('OPERASI_MILITER','LATIHAN_MILITER') NOT NULL,
	`purpose_detail` text,
	`borrower_name` varchar(255) NOT NULL,
	`unit` varchar(100) NOT NULL,
	`departure_date` timestamp NOT NULL,
	`expected_return_date` timestamp NOT NULL,
	`actual_return_date` timestamp,
	`status` enum('DIPINJAM','KEMBALI','TERLAMBAT') NOT NULL DEFAULT 'DIPINJAM',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lending_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance` (
	`id` varchar(36) NOT NULL,
	`equipment_id` varchar(36),
	`maintenance_type` enum('PERAWATAN','PERBAIKAN') NOT NULL,
	`description` text NOT NULL,
	`scheduled_date` timestamp NOT NULL,
	`completion_date` timestamp,
	`status` enum('PENDING','IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'PENDING',
	`technician_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouse` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` text,
	`category` enum('KOMUNITY','TRANSITO','BALKIR') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`organization_id` varchar(36),
	CONSTRAINT `warehouse_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp(3),
	`refresh_token_expires_at` timestamp(3),
	`scope` text,
	`password` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `member` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36),
	`user_id` varchar(36),
	`role` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `member_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`slug` varchar(255),
	`logo` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`metadata` text,
	`parent_id` varchar(36),
	CONSTRAINT `organization_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventory_stock` ADD CONSTRAINT `inventory_stock_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_stock` ADD CONSTRAINT `inventory_stock_warehouse_id_warehouse_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending` ADD CONSTRAINT `lending_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance` ADD CONSTRAINT `maintenance_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance` ADD CONSTRAINT `maintenance_technician_id_user_id_fk` FOREIGN KEY (`technician_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse` ADD CONSTRAINT `warehouse_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member` ADD CONSTRAINT `member_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member` ADD CONSTRAINT `member_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `equipment_type_idx` ON `equipment` (`type`);--> statement-breakpoint
CREATE INDEX `equipment_condition_idx` ON `equipment` (`condition`);--> statement-breakpoint
CREATE INDEX `stock_warehouse_idx` ON `inventory_stock` (`warehouse_id`);--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);