import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  whatsappNumber: text("whatsapp_number").notNull().default(""),
  address: text("address").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_customers_route").on(table.route)]);

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  packSize: text("pack_size").notNull(),
  price: real("price").notNull(),
  cost: real("cost").notNull().default(0),
  unit: text("unit").notNull().default("وحدة"),
  stock: integer("stock").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number"),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  contactPhone: text("contact_phone").notNull().default(""),
  deliveryAddress: text("delivery_address").notNull().default(""),
  notes: text("notes").notNull().default(""),
  source: text("source").notNull(),
  total: real("total").notNull(),
  status: text("status").notNull().default("جديد"),
  createdByUserId: text("created_by_user_id"),
  requestKey: text("request_key"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_orders_customer_created").on(table.customerId, table.createdAt),
  index("idx_orders_open_status").on(table.status),
  uniqueIndex("idx_orders_number").on(table.orderNumber),
  uniqueIndex("idx_orders_request_key").on(table.requestKey),
]);

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
  createdByUserId: text("created_by_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_collections_customer_created").on(table.customerId, table.createdAt)]);

export const appUsers = sqliteTable("app_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("customer"),
  customerId: integer("customer_id").references(() => customers.id),
  salesRep: text("sales_rep"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [check("app_users_role_check", sql`${table.role} in ('admin','employee','customer')`)]);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorUserId: text("actor_user_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: text("details").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_audit_created").on(table.createdAt)]);

export const inventoryMovements = sqliteTable("inventory_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id),
  movementType: text("movement_type").notNull(),
  quantity: integer("quantity").notNull(),
  reason: text("reason").notNull(),
  actorUserId: text("actor_user_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_inventory_product_created").on(table.productId, table.createdAt)]);
