CREATE TABLE `collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer,
	`customer_name` text NOT NULL,
	`amount` real NOT NULL,
	`method` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_collections_customer_created` ON `collections` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`route` text DEFAULT '' NOT NULL,
	`sales_rep` text DEFAULT '' NOT NULL,
	`tier` text DEFAULT 'B' NOT NULL,
	`last_order_at` text NOT NULL,
	`avg_reorder_days` integer DEFAULT 14 NOT NULL,
	`expected_value` real DEFAULT 0 NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_code_unique` ON `customers` (`code`);--> statement-breakpoint
CREATE INDEX `idx_customers_route` ON `customers` (`route`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_order_items_order` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer,
	`customer_name` text NOT NULL,
	`source` text NOT NULL,
	`total` real NOT NULL,
	`status` text DEFAULT 'جديد' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_orders_customer_created` ON `orders` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_open_status` ON `orders` (`status`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`pack_size` text NOT NULL,
	`price` real NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`reorder_level` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);