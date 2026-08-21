import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  route: text("route").notNull().default(""),
  salesRep: text("sales_rep").notNull().default(""),
  tier: text("tier").notNull().default("B"),
  lastOrderAt: text("last_order_at").notNull(),
  avgReorderDays: integer("avg_reorder_days").notNull().default(14),
  expectedValue: real("expected_value").notNull().default(0),
  balance: real("balance").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_customers_route").on(table.route)]);

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  packSize: text("pack_size").notNull(),
  price: real("price").notNull(),
  stock: integer("stock").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  source: text("source").notNull(),
  total: real("total").notNull(),
  status: text("status").notNull().default("جديد"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_orders_customer_created").on(table.customerId, table.createdAt), index("idx_orders_open_status").on(table.status)]);

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
}, (table) => [index("idx_order_items_order").on(table.orderId)]);

export const collections = sqliteTable("collections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  amount: real("amount").notNull(),
  method: text("method").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_collections_customer_created").on(table.customerId, table.createdAt)]);
