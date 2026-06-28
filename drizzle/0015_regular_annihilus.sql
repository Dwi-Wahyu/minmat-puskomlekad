CREATE TABLE `item_category` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`parent_id` varchar(36),
	`order` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `item_category_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `item` ADD `category_id` varchar(36);--> statement-breakpoint
ALTER TABLE `item` ADD CONSTRAINT `item_category_id_item_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `item_category`(`id`) ON DELETE no action ON UPDATE no action;