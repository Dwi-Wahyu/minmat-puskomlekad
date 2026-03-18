DROP TABLE `inventory_stock`;--> statement-breakpoint
ALTER TABLE `equipment` ADD `warehouse_id` varchar(36);--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_warehouse_id_warehouse_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;