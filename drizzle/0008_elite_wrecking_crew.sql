CREATE TABLE `movement` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`equipment_id` varchar(36),
	`movement_event_type` enum('RECEIVE','ISSUE','ADJUSTMENT','TRANSFER_OUT','TRANSFER_IN','LOAN_OUT','LOAN_RETURN','DISTRIBUTE_OUT','DISTRIBUTE_IN','MAINTENANCE_IN','MAINTENANCE_OUT') NOT NULL,
	`qty` int NOT NULL DEFAULT 1,
	`unit` varchar(20),
	`movement_classification` enum('BALKIR','KOMUNITY','TRANSITO'),
	`specific_location_name` varchar(255),
	`from_warehouse_id` varchar(36),
	`to_warehouse_id` varchar(36),
	`organization_id` varchar(36),
	`notes` text,
	`pic_id` varchar(36),
	`movement_reference_type` enum('LENDING','DISTRIBUTION','MAINTENANCE'),
	`reference_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `inventory_movement`;--> statement-breakpoint
DROP TABLE `stock_movement`;--> statement-breakpoint
DROP INDEX `equipment_type_idx` ON `equipment`;--> statement-breakpoint
ALTER TABLE `item` ADD `equipment_type` enum('ALKOMLEK','PERNIKA_LEK');--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_from_warehouse_id_warehouse_id_fk` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_to_warehouse_id_warehouse_id_fk` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_pic_id_user_id_fk` FOREIGN KEY (`pic_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `movement_item_idx` ON `movement` (`item_id`);--> statement-breakpoint
CREATE INDEX `movement_equipment_idx` ON `movement` (`equipment_id`);--> statement-breakpoint
CREATE INDEX `movement_from_warehouse_idx` ON `movement` (`from_warehouse_id`);--> statement-breakpoint
CREATE INDEX `movement_to_warehouse_idx` ON `movement` (`to_warehouse_id`);--> statement-breakpoint
CREATE INDEX `movement_organization_idx` ON `movement` (`organization_id`);--> statement-breakpoint
CREATE INDEX `movement_reference_idx` ON `movement` (`reference_id`);--> statement-breakpoint
CREATE INDEX `equipment_item_id_idx` ON `equipment` (`item_id`);--> statement-breakpoint
ALTER TABLE `equipment` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `equipment` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `equipment` DROP COLUMN `category`;