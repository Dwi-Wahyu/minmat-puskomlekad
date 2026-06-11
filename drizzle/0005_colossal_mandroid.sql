ALTER TABLE `distribution_item` DROP FOREIGN KEY `distribution_item_equipment_id_equipment_id_fk`;
--> statement-breakpoint
ALTER TABLE `distribution_item` MODIFY COLUMN `item_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `distribution_item` DROP COLUMN `equipment_id`;