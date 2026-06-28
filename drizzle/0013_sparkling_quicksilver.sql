ALTER TABLE `equipment` ADD `movement_classification` enum('BALKIR','KOMUNITY','TRANSITO');
CREATE INDEX `equipment_classification_idx` ON `equipment` (`movement_classification`);