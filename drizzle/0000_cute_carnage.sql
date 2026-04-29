-- Migration baseline: semua tabel sudah ada di DB production
-- File ini hanya untuk mencatat state ke __drizzle_migrations
-- Semua CREATE TABLE pakai IF NOT EXISTS, semua FK/INDEX pakai IF NOT EXISTS via procedure

-- ============================================================
-- TABLES (semua sudah ada, IF NOT EXISTS untuk keamanan)
-- ============================================================

CREATE TABLE IF NOT EXISTS `approval` (
	`id` varchar(36) NOT NULL,
	`reference_type` enum('LENDING','DISTRIBUTION','MAINTENANCE'),
	`reference_id` varchar(36),
	`approved_by` varchar(36),
	`status` enum('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approval_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_log` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`action` varchar(50),
	`table_name` varchar(50),
	`record_id` varchar(36),
	`old_value` text,
	`new_value` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `building` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36),
	`code` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` text NOT NULL,
	`type` varchar(255) NOT NULL,
	`area` decimal(12,2) NOT NULL,
	`condition` enum('BAIK','RUSAK') NOT NULL,
	`status` enum('MILIK_TNI','LAINNYA') NOT NULL,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`photo_path` text,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `building_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `distribution` (
	`id` varchar(36) NOT NULL,
	`from_org_id` varchar(36),
	`to_org_id` varchar(36),
	`status` enum('DRAFT','VALIDATED','APPROVED','SHIPPED','RECEIVED') DEFAULT 'DRAFT',
	`requested_by` varchar(36),
	`approved_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distribution_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `distribution_item` (
	`id` varchar(36) NOT NULL,
	`distribution_id` varchar(36) NOT NULL,
	`equipment_id` varchar(36),
	`item_id` varchar(36),
	`quantity` decimal(12,4) NOT NULL DEFAULT '1.0000',
	`unit` varchar(20),
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distribution_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `equipment` (
	`id` varchar(36) NOT NULL,
	`serial_number` varchar(100),
	`brand` varchar(100),
	`warehouse_id` varchar(36),
	`organization_id` varchar(36),
	`item_id` varchar(36) NOT NULL,
	`condition` enum('BAIK','RUSAK_RINGAN','RUSAK_BERAT') NOT NULL DEFAULT 'BAIK',
	`status` enum('READY','IN_USE','TRANSIT','MAINTENANCE') DEFAULT 'READY',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`),
	CONSTRAINT `equipment_serial_number_unique` UNIQUE(`serial_number`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `import_log` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36),
	`user_id` varchar(36),
	`filename` varchar(255) NOT NULL,
	`status` enum('SUCCESS','FAILED','PARTIAL') DEFAULT 'SUCCESS',
	`total_rows` decimal(12,0) DEFAULT '0',
	`success_rows` decimal(12,0) DEFAULT '0',
	`error_rows` decimal(12,0) DEFAULT '0',
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `import_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `item` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('ASSET','CONSUMABLE') NOT NULL,
	`equipment_type` enum('ALKOMLEK','PERNIKA_LEK'),
	`base_unit` varchar(21) NOT NULL,
	`description` text,
	`image_path` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `item_unit_conversion` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`from_unit` varchar(20) NOT NULL,
	`to_unit` varchar(20) NOT NULL,
	`multiplier` decimal(12,4) NOT NULL,
	CONSTRAINT `item_unit_conversion_id` PRIMARY KEY(`id`),
	CONSTRAINT `item_unit_conversion_item_id_from_unit_unique` UNIQUE(`item_id`,`from_unit`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `land` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36),
	`certificate_number` varchar(255) NOT NULL,
	`location` text NOT NULL,
	`area` decimal(12,2) NOT NULL,
	`status` enum('MILIK_TNI','LAINNYA') NOT NULL,
	`usage` varchar(255) NOT NULL,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`photo_path` text,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `land_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `lending` (
	`id` varchar(36) NOT NULL,
	`unit` varchar(100) NOT NULL,
	`purpose` enum('OPERASI','LATIHAN','PERINTAH_LANGSUNG') NOT NULL,
	`status` enum('DRAFT','APPROVED','REJECTED','PERINTAH_LANGSUNG','DIPINJAM','KEMBALI') DEFAULT 'DRAFT',
	`rejected_reason` text,
	`override_reason` text,
	`override_by` varchar(36),
	`requested_by` varchar(36),
	`organization_id` varchar(36),
	`approved_by` varchar(36),
	`attachment_path` text,
	`attachment_name` varchar(255),
	`start_date` timestamp NOT NULL,
	`end_date` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lending_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `lending_item` (
	`id` varchar(36) NOT NULL,
	`lending_id` varchar(36),
	`equipment_id` varchar(36),
	`qty` decimal(12,4) DEFAULT '1.0000',
	CONSTRAINT `lending_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `maintenance` (
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
CREATE TABLE IF NOT EXISTS `movement` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`equipment_id` varchar(36),
	`movement_event_type` enum('RECEIVE','ISSUE','ADJUSTMENT','TRANSFER_OUT','TRANSFER_IN','LOAN_OUT','LOAN_RETURN','DISTRIBUTE_OUT','DISTRIBUTE_IN','MAINTENANCE_IN','MAINTENANCE_OUT') NOT NULL,
	`qty` decimal(12,4) NOT NULL DEFAULT '1.0000',
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
CREATE TABLE IF NOT EXISTS `notification` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`organization_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`notification_priority` enum('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
	`read` boolean NOT NULL DEFAULT false,
	`action` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `report_btk16` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36),
	`period_start` timestamp,
	`period_end` timestamp,
	`item_name` varchar(255),
	`opening_balance` decimal(12,4),
	`incoming` decimal(12,4),
	`outgoing` decimal(12,4),
	`closing_balance` decimal(12,4),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `report_btk16_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `stock` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`warehouse_id` varchar(36),
	`qty` decimal(12,4) NOT NULL DEFAULT '0.0000',
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_unique_idx` UNIQUE(`item_id`,`warehouse_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `unit` (
	`id` varchar(21) NOT NULL,
	`name` varchar(20) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `unit_id` PRIMARY KEY(`id`),
	CONSTRAINT `unit_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
INSERT IGNORE INTO `unit` (`id`, `name`) VALUES
	('unit', 'UNIT'),
	('set', 'SET'),
	('buah', 'BUAH'),
	('paket', 'PAKET'),
	('box', 'BOX'),
	('lot', 'LOT'),
	('meter', 'METER'),
	('cabinet', 'CABINET'),
	('pcs', 'PCS'),
	('roll', 'ROLL');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `warehouse` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`organization_id` varchar(36),
	CONSTRAINT `warehouse_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `account` (
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
CREATE TABLE IF NOT EXISTS `api_key` (
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
CREATE TABLE IF NOT EXISTS `member` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36),
	`user_id` varchar(36),
	`role` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `member_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `organization` (
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
CREATE TABLE IF NOT EXISTS `session` (
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
CREATE TABLE IF NOT EXISTS `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`username` varchar(255) NOT NULL,
	`display_username` varchar(255),
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_username_unique` UNIQUE(`username`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

-- ============================================================
-- FK & INDEX: Pakai stored procedure agar tidak error jika sudah ada
-- ============================================================

DROP PROCEDURE IF EXISTS add_fk_if_not_exists;
--> statement-breakpoint
CREATE PROCEDURE add_fk_if_not_exists(
    IN tbl VARCHAR(64),
    IN constraint_name VARCHAR(64),
    IN fk_sql TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = tbl
        AND CONSTRAINT_NAME = constraint_name
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ) THEN
        SET @sql = fk_sql;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END;
--> statement-breakpoint

DROP PROCEDURE IF EXISTS add_index_if_not_exists;
--> statement-breakpoint
CREATE PROCEDURE add_index_if_not_exists(
    IN tbl VARCHAR(64),
    IN idx_name VARCHAR(64),
    IN idx_sql TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = tbl
        AND INDEX_NAME = idx_name
    ) THEN
        SET @sql = idx_sql;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END;
--> statement-breakpoint

-- Foreign Keys
CALL add_fk_if_not_exists('approval', 'approval_approved_by_user_id_fk', 'ALTER TABLE `approval` ADD CONSTRAINT `approval_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('audit_log', 'audit_log_user_id_user_id_fk', 'ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('building', 'building_organization_id_organization_id_fk', 'ALTER TABLE `building` ADD CONSTRAINT `building_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('distribution', 'distribution_from_org_id_organization_id_fk', 'ALTER TABLE `distribution` ADD CONSTRAINT `distribution_from_org_id_organization_id_fk` FOREIGN KEY (`from_org_id`) REFERENCES `organization`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('distribution', 'distribution_to_org_id_organization_id_fk', 'ALTER TABLE `distribution` ADD CONSTRAINT `distribution_to_org_id_organization_id_fk` FOREIGN KEY (`to_org_id`) REFERENCES `organization`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('distribution', 'distribution_requested_by_user_id_fk', 'ALTER TABLE `distribution` ADD CONSTRAINT `distribution_requested_by_user_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('distribution', 'distribution_approved_by_user_id_fk', 'ALTER TABLE `distribution` ADD CONSTRAINT `distribution_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('distribution_item', 'distribution_item_distribution_id_distribution_id_fk', 'ALTER TABLE `distribution_item` ADD CONSTRAINT `distribution_item_distribution_id_distribution_id_fk` FOREIGN KEY (`distribution_id`) REFERENCES `distribution`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('distribution_item', 'distribution_item_equipment_id_equipment_id_fk', 'ALTER TABLE `distribution_item` ADD CONSTRAINT `distribution_item_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('distribution_item', 'distribution_item_item_id_item_id_fk', 'ALTER TABLE `distribution_item` ADD CONSTRAINT `distribution_item_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('equipment', 'equipment_warehouse_id_warehouse_id_fk', 'ALTER TABLE `equipment` ADD CONSTRAINT `equipment_warehouse_id_warehouse_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('equipment', 'equipment_organization_id_organization_id_fk', 'ALTER TABLE `equipment` ADD CONSTRAINT `equipment_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('equipment', 'equipment_item_id_item_id_fk', 'ALTER TABLE `equipment` ADD CONSTRAINT `equipment_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('import_log', 'import_log_organization_id_organization_id_fk', 'ALTER TABLE `import_log` ADD CONSTRAINT `import_log_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('import_log', 'import_log_user_id_user_id_fk', 'ALTER TABLE `import_log` ADD CONSTRAINT `import_log_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('item', 'item_base_unit_unit_id_fk', 'ALTER TABLE `item` ADD CONSTRAINT `item_base_unit_unit_id_fk` FOREIGN KEY (`base_unit`) REFERENCES `unit`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('item_unit_conversion', 'item_unit_conversion_item_id_item_id_fk', 'ALTER TABLE `item_unit_conversion` ADD CONSTRAINT `item_unit_conversion_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('land', 'land_organization_id_organization_id_fk', 'ALTER TABLE `land` ADD CONSTRAINT `land_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('lending', 'lending_override_by_user_id_fk', 'ALTER TABLE `lending` ADD CONSTRAINT `lending_override_by_user_id_fk` FOREIGN KEY (`override_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('lending', 'lending_requested_by_user_id_fk', 'ALTER TABLE `lending` ADD CONSTRAINT `lending_requested_by_user_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('lending', 'lending_organization_id_organization_id_fk', 'ALTER TABLE `lending` ADD CONSTRAINT `lending_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('lending', 'lending_approved_by_user_id_fk', 'ALTER TABLE `lending` ADD CONSTRAINT `lending_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('lending_item', 'lending_item_lending_id_lending_id_fk', 'ALTER TABLE `lending_item` ADD CONSTRAINT `lending_item_lending_id_lending_id_fk` FOREIGN KEY (`lending_id`) REFERENCES `lending`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('lending_item', 'lending_item_equipment_id_equipment_id_fk', 'ALTER TABLE `lending_item` ADD CONSTRAINT `lending_item_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('maintenance', 'maintenance_equipment_id_equipment_id_fk', 'ALTER TABLE `maintenance` ADD CONSTRAINT `maintenance_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('maintenance', 'maintenance_technician_id_user_id_fk', 'ALTER TABLE `maintenance` ADD CONSTRAINT `maintenance_technician_id_user_id_fk` FOREIGN KEY (`technician_id`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('movement', 'movement_item_id_item_id_fk', 'ALTER TABLE `movement` ADD CONSTRAINT `movement_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('movement', 'movement_equipment_id_equipment_id_fk', 'ALTER TABLE `movement` ADD CONSTRAINT `movement_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('movement', 'movement_from_warehouse_id_warehouse_id_fk', 'ALTER TABLE `movement` ADD CONSTRAINT `movement_from_warehouse_id_warehouse_id_fk` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('movement', 'movement_to_warehouse_id_warehouse_id_fk', 'ALTER TABLE `movement` ADD CONSTRAINT `movement_to_warehouse_id_warehouse_id_fk` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('movement', 'movement_organization_id_organization_id_fk', 'ALTER TABLE `movement` ADD CONSTRAINT `movement_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('movement', 'movement_pic_id_user_id_fk', 'ALTER TABLE `movement` ADD CONSTRAINT `movement_pic_id_user_id_fk` FOREIGN KEY (`pic_id`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('notification', 'notification_user_id_user_id_fk', 'ALTER TABLE `notification` ADD CONSTRAINT `notification_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('notification', 'notification_organization_id_organization_id_fk', 'ALTER TABLE `notification` ADD CONSTRAINT `notification_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('report_btk16', 'report_btk16_organization_id_organization_id_fk', 'ALTER TABLE `report_btk16` ADD CONSTRAINT `report_btk16_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('stock', 'stock_item_id_item_id_fk', 'ALTER TABLE `stock` ADD CONSTRAINT `stock_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('stock', 'stock_warehouse_id_warehouse_id_fk', 'ALTER TABLE `stock` ADD CONSTRAINT `stock_warehouse_id_warehouse_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('warehouse', 'warehouse_organization_id_organization_id_fk', 'ALTER TABLE `warehouse` ADD CONSTRAINT `warehouse_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('account', 'account_user_id_user_id_fk', 'ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('api_key', 'api_key_user_id_user_id_fk', 'ALTER TABLE `api_key` ADD CONSTRAINT `api_key_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('member', 'member_organization_id_organization_id_fk', 'ALTER TABLE `member` ADD CONSTRAINT `member_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('member', 'member_user_id_user_id_fk', 'ALTER TABLE `member` ADD CONSTRAINT `member_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint
CALL add_fk_if_not_exists('session', 'session_user_id_user_id_fk', 'ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
--> statement-breakpoint

-- Indexes
CALL add_index_if_not_exists('equipment', 'equipment_condition_idx', 'CREATE INDEX `equipment_condition_idx` ON `equipment` (`condition`)');
--> statement-breakpoint
CALL add_index_if_not_exists('equipment', 'equipment_item_id_idx', 'CREATE INDEX `equipment_item_id_idx` ON `equipment` (`item_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('item_unit_conversion', 'item_unit_conv_item_idx', 'CREATE INDEX `item_unit_conv_item_idx` ON `item_unit_conversion` (`item_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('movement', 'movement_item_idx', 'CREATE INDEX `movement_item_idx` ON `movement` (`item_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('movement', 'movement_equipment_idx', 'CREATE INDEX `movement_equipment_idx` ON `movement` (`equipment_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('movement', 'movement_from_warehouse_idx', 'CREATE INDEX `movement_from_warehouse_idx` ON `movement` (`from_warehouse_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('movement', 'movement_to_warehouse_idx', 'CREATE INDEX `movement_to_warehouse_idx` ON `movement` (`to_warehouse_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('movement', 'movement_organization_idx', 'CREATE INDEX `movement_organization_idx` ON `movement` (`organization_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('movement', 'movement_reference_idx', 'CREATE INDEX `movement_reference_idx` ON `movement` (`reference_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('notification', 'notification_userId_idx', 'CREATE INDEX `notification_userId_idx` ON `notification` (`user_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('notification', 'notification_organizationId_idx', 'CREATE INDEX `notification_organizationId_idx` ON `notification` (`organization_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('notification', 'notification_read_idx', 'CREATE INDEX `notification_read_idx` ON `notification` (`read`)');
--> statement-breakpoint
CALL add_index_if_not_exists('stock', 'stock_item_idx', 'CREATE INDEX `stock_item_idx` ON `stock` (`item_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('account', 'account_userId_idx', 'CREATE INDEX `account_userId_idx` ON `account` (`user_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('api_key', 'api_key_userId_idx', 'CREATE INDEX `api_key_userId_idx` ON `api_key` (`user_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('session', 'session_userId_idx', 'CREATE INDEX `session_userId_idx` ON `session` (`user_id`)');
--> statement-breakpoint
CALL add_index_if_not_exists('verification', 'verification_identifier_idx', 'CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`)');
--> statement-breakpoint

-- Cleanup procedures
DROP PROCEDURE IF EXISTS add_fk_if_not_exists;
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_index_if_not_exists;