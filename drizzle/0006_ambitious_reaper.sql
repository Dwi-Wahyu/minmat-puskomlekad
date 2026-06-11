CREATE TABLE `distribution_consumable` (
	`id` varchar(36) NOT NULL,
	`distribution_id` varchar(36) NOT NULL,
	`item_id` varchar(36) NOT NULL,
	`quantity` decimal(12,4) NOT NULL DEFAULT '1.0000',
	`unit` varchar(20),
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distribution_consumable_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `distribution_equipment` (
	`id` varchar(36) NOT NULL,
	`distribution_id` varchar(36) NOT NULL,
	`equipment_id` varchar(36) NOT NULL,
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distribution_equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `distribution_item`;--> statement-breakpoint
ALTER TABLE `distribution_consumable` ADD CONSTRAINT `distribution_consumable_distribution_id_distribution_id_fk` FOREIGN KEY (`distribution_id`) REFERENCES `distribution`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `distribution_consumable` ADD CONSTRAINT `distribution_consumable_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `distribution_equipment` ADD CONSTRAINT `distribution_equipment_distribution_id_distribution_id_fk` FOREIGN KEY (`distribution_id`) REFERENCES `distribution`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `distribution_equipment` ADD CONSTRAINT `distribution_equipment_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;