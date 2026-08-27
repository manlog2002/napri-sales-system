CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_by` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'customer' NOT NULL,
	`customer_id` integer,
	`sales_rep` text,
	`active` integer DEFAULT true NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "app_users_role_check" CHECK("app_users"."role" in ('admin','employee','customer'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_users_user_id_unique` ON `app_users` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `app_users_email_unique` ON `app_users` (`email`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_user_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`details` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_created` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`movement_type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reason` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_inventory_product_created` ON `inventory_movements` (`product_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `collections` ADD `created_by_user_id` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `whatsapp_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `address` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `order_number` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `contact_phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_address` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `created_by_user_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `request_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_number` ON `orders` (`order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_request_key` ON `orders` (`request_key`);--> statement-breakpoint
ALTER TABLE `products` ADD `cost` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `unit` text DEFAULT 'وحدة' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `updated_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE TRIGGER `prevent_negative_stock` BEFORE UPDATE OF `stock` ON `products` WHEN NEW.stock < 0 BEGIN SELECT RAISE(ABORT, 'NEGATIVE_STOCK'); END;--> statement-breakpoint
INSERT OR IGNORE INTO `app_settings` (`key`,`value`) VALUES ('price_list_status','draft');--> statement-breakpoint
INSERT OR IGNORE INTO `app_settings` (`key`,`value`) VALUES ('price_list_version','NAPRI-DV1-2026-08');--> statement-breakpoint
INSERT OR IGNORE INTO `app_settings` (`key`,`value`) VALUES ('data_profile','demo');
