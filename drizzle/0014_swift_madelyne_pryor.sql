ALTER TABLE `equipment` RENAME COLUMN `movement_classification` TO `classification`;--> statement-breakpoint
DROP INDEX `equipment_classification_idx` ON `equipment`;--> statement-breakpoint
CREATE INDEX `equipment_classification_idx` ON `equipment` (`classification`);