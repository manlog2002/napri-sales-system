import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

type Role = "admin" | "employee" | "customer";
type OrderItemInput = { productId?: number; quantity?: number };
type SalesPayload = {
  action?: string;
  customerId?: number;
  customerName?: string;
  contactPhone?: string;
  deliveryAddress?: string;
  notes?: string;
  source?: string;
  requestKey?: string;
  items?: OrderItemInput[];
  amount?: number;
  method?: string;
  orderId?: number;
  status?: string;
  product?: { sku?: string; name?: string; category?: string; packSize?: string; price?: number; stock?: number; reorderLevel?: number; unit?: string };
  customer?: { code?: string; name?: string; route?: string; salesRep?: string; tier?: string; whatsappNumber?: string; address?: string };
  productId?: number;
  quantity?: number;
  reason?: string;
  priceListStatus?: "draft" | "active";
  userEmail?: string;
  role?: Role;
  mappedCustomerId?: number | null;
};

type Session = {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
  customerId: number | null;
  salesRep: string | null;
};

const roleActions: Record<Role, string[]> = {
  admin: ["create_order", "record_collection", "update_order_status", "upsert_product", "upsert_customer", "adjust_inventory", "set_price_list_status", "assign_role"],
  employee: ["create_order", "record_collection", "update_order_status"],
  customer: ["create_order"],
};

const clean = (value: unknown, max = 240) => String(value ?? "").trim().slice(0, max);
const jsonError = (error: string, status: number) => Response.json({ error }, { status });

async function ensureColumn(table: string, column: string, definition: string) {
  const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  if (!info.results.some((item) => item.name === column)) {
    await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

async function ensureDatabase() {
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, route TEXT NOT NULL DEFAULT '', sales_rep TEXT NOT NULL DEFAULT '', tier TEXT NOT NULL DEFAULT 'B', last_order_at TEXT NOT NULL, avg_reorder_days INTEGER NOT NULL DEFAULT 14, expected_value REAL NOT NULL DEFAULT 0, balance REAL NOT NULL DEFAULT 0, whatsapp_number TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL, pack_size TEXT NOT NULL, price REAL NOT NULL, cost REAL NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT 'وحدة', stock INTEGER NOT NULL DEFAULT 0, reorder_level INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT, customer_id INTEGER REFERENCES customers(id), customer_name TEXT NOT NULL, contact_phone TEXT NOT NULL DEFAULT '', delivery_address TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', source TEXT NOT NULL, total REAL NOT NULL, status TEXT NOT NULL DEFAULT 'جديد', created_by_user_id TEXT, request_key TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id), product_name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price REAL NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS collections (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER REFERENCES customers(id), customer_name TEXT NOT NULL, amount REAL NOT NULL, method TEXT NOT NULL, created_by_user_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS app_users (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('admin','employee','customer')), customer_id INTEGER REFERENCES customers(id), sales_rep TEXT, active INTEGER NOT NULL DEFAULT 1, last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_by TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT NOT NULL, actor_email TEXT NOT NULL, actor_role TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS inventory_movements (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id), movement_type TEXT NOT NULL, quantity INTEGER NOT NULL, reason TEXT NOT NULL, actor_user_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
  ]);

  await ensureColumn("customers", "whatsapp_number", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("customers", "address", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("customers", "active", "INTEGER NOT NULL DEFAULT 1");
  await ensureColumn("products", "cost", "REAL NOT NULL DEFAULT 0");
  await ensureColumn("products", "unit", "TEXT NOT NULL DEFAULT 'وحدة'");
  await ensureColumn("products", "updated_at", "TEXT");
  await ensureColumn("orders", "order_number", "TEXT");
  await ensureColumn("orders", "contact_phone", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("orders", "delivery_address", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("orders", "notes", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("orders", "created_by_user_id", "TEXT");
  await ensureColumn("orders", "request_key", "TEXT");
  await ensureColumn("collections", "created_by_user_id", "TEXT");

  await db.batch([
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_customers_route ON customers(route)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_open_status ON orders(status) WHERE status != 'تم التسليم'`),
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number) WHERE order_number IS NOT NULL`),
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_request_key ON orders(request_key) WHERE request_key IS NOT NULL`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_collections_customer_created ON collections(customer_id, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_inventory_product_created ON inventory_movements(product_id, created_at DESC)`),
    db.prepare(`CREATE TRIGGER IF NOT EXISTS prevent_negative_stock BEFORE UPDATE OF stock ON products WHEN NEW.stock < 0 BEGIN SELECT RAISE(ABORT, 'NEGATIVE_STOCK'); END`),
    db.prepare(`INSERT OR IGNORE INTO app_settings (key,value) VALUES ('price_list_status','draft')`),
    db.prepare(`INSERT OR IGNORE INTO app_settings (key,value) VALUES ('price_list_version','NAPRI-DV1-2026-08')`),
    db.prepare(`INSERT OR IGNORE INTO app_settings (key,value) VALUES ('data_profile','demo')`),
  ]);

  const customerCount = await db.prepare("SELECT COUNT(*) AS count FROM customers").first<{ count: number }>();
  const productCount = await db.prepare("SELECT COUNT(*) AS count FROM products").first<{ count: number }>();
  if (!customerCount?.count) {
    const seeds = [
      ["100001", "الفردوس", "مدينة بدر", "محمد البشري", "A", "2026-08-10", 12, 2450, 800],
      ["100008", "اسواق السودان", "مدينة نصر", "محمد البشري", "A", "2026-08-12", 10, 3180, 0],
      ["100012", "ود ابروف", "مدينة نصر", "محمد البشري", "B", "2026-08-03", 14, 1800, 500],
      ["200004", "سنتر امدرمان", "حدائق الاهرام", "عمرو علاء", "A", "2026-08-06", 13, 2700, 1800],
      ["200012", "ابو راس", "المهندسين", "عمرو علاء", "B", "2026-08-08", 16, 1700, 0],
      ["200018", "محلات ابو معاذ", "الهرم", "عمرو علاء", "B", "2026-08-01", 15, 1450, 450],
      ["100017", "الخرطوم 2", "مدينة بدر", "محمد البشري", "A", "2026-08-09", 11, 3850, 1500],
    ];
    await db.batch(seeds.map((row) => db.prepare(`INSERT INTO customers (code,name,route,sales_rep,tier,last_order_at,avg_reorder_days,expected_value,balance) VALUES (?,?,?,?,?,?,?,?,?)`).bind(...row)));
  }
  if (!productCount?.count) {
    const seeds = [
      ["NAP-QAR-250", "القرض", "منتجات سودانية", "250 جرام", 65, 48, 18],
      ["NAP-ONI-150", "البصل المجفف", "خضروات مجففة", "150 جرام", 40, 32, 16],
      ["NAP-CHI-100", "شطة قبانيت", "توابل", "100 جرام", 65, 18, 20],
      ["NAP-MOL-100", "ملوخية مجففة", "خضروات مجففة", "100 جرام", 55, 12, 15],
      ["NAP-WEI-100", "ويكة", "منتجات سودانية", "100 جرام", 40, 24, 18],
      ["GLF-SWT-25X25", "حلويات قرين لايف", "حلويات - سعر الكرتونة", "25 علبة × 25 قطعة", 1900, 12, 3],
      ["GLF-SES-500-12", "زيت سمسم 500 مل", "زيوت - سعر الكرتونة", "12 قارورة", 1400, 10, 3],
      ["GLF-SES-250-12", "زيت سمسم 250 مل", "زيوت - سعر الكرتونة", "12 قارورة", 840, 10, 3],
      ["GLF-SES-125-24", "زيت سمسم 125 مل", "زيوت - سعر الكرتونة", "24 قارورة", 850, 10, 3],
    ];
    await db.batch(seeds.map((row) => db.prepare(`INSERT INTO products (sku,name,category,pack_size,price,stock,reorder_level) VALUES (?,?,?,?,?,?,?)`).bind(...row)));
  }
}

async function resolveSession(): Promise<Session | null> {
  const identity = await getChatGPTUser();
  if (!identity) return null;
  const db = env.DB;
  const count = await db.prepare("SELECT COUNT(*) AS count FROM app_users").first<{ count: number }>();
  if (!count?.count) {
    await db.prepare(`INSERT OR IGNORE INTO app_users (user_id,email,display_name,role) VALUES (?,?,?,'admin')`).bind(identity.userId, identity.email.toLowerCase(), identity.displayName).run();
    await db.prepare(`INSERT INTO audit_logs (actor_user_id,actor_email,actor_role,action,entity_type,entity_id,details) VALUES (?,?,?,'bootstrap_admin','app_user',?,'{"source":"first_private_owner"}')`).bind(identity.userId, identity.email, "admin", identity.userId).run();
  }
  const row = await db.prepare(`SELECT user_id AS userId,email,display_name AS displayName,role,customer_id AS customerId,sales_rep AS salesRep,active FROM app_users WHERE user_id=? OR lower(email)=lower(?) LIMIT 1`).bind(identity.userId, identity.email).first<Session & { active: number }>();
  if (!row?.active) return null;
  await db.prepare("UPDATE app_users SET user_id=?,email=?,display_name=?,last_seen_at=CURRENT_TIMESTAMP WHERE id=(SELECT id FROM app_users WHERE user_id=? OR lower(email)=lower(?) LIMIT 1)").bind(identity.userId, identity.email.toLowerCase(), identity.displayName, identity.userId, identity.email).run();
  return { userId: identity.userId, email: identity.email, displayName: identity.displayName, role: row.role, customerId: row.customerId ?? null, salesRep: row.salesRep ?? null };
}

function can(session: Session, action: string) {
  return roleActions[session.role].includes(action);
}

function audit(session: Session, action: string, entityType: string, entityId: string | number | null, details: Record<string, unknown> = {}) {
  return env.DB.prepare(`INSERT INTO audit_logs (actor_user_id,actor_email,actor_role,action,entity_type,entity_id,details) VALUES (?,?,?,?,?,?,?)`).bind(session.userId, session.email, session.role, action, entityType, entityId === null ? null : String(entityId), JSON.stringify(details));
}

export async function GET() {
  try {
    await ensureDatabase();
    const session = await resolveSession();
    if (!session) return jsonError("يلزم تسجيل الدخول بحساب مصرح له", 401);
    const db = env.DB;
    const products = await db.prepare(`SELECT id,sku,name,category,pack_size AS packSize,price,cost,unit,stock,reorder_level AS reorderLevel FROM products WHERE active=1 ORDER BY id`).all();
    const priceRows = await db.prepare(`SELECT key,value FROM app_settings WHERE key IN ('price_list_status','price_list_version','data_profile')`).all<{ key: string; value: string }>();
    const settings = Object.fromEntries(priceRows.results.map((item) => [item.key, item.value]));

    let customers;
    let orders;
    let collections;
    if (session.role === "customer") {
      customers = session.customerId
        ? await db.prepare(`SELECT id,code,name,route,sales_rep AS salesRep,tier,last_order_at AS lastOrderAt,avg_reorder_days AS avgReorderDays,expected_value AS expectedValue,balance,whatsapp_number AS whatsappNumber,address FROM customers WHERE id=? AND active=1`).bind(session.customerId).all()
        : { results: [] };
      orders = await db.prepare(`SELECT id,order_number AS orderNumber,customer_name AS customerName,source,total,status,created_at AS createdAt FROM orders WHERE created_by_user_id=? OR customer_id=? ORDER BY created_at DESC,id DESC LIMIT 50`).bind(session.userId, session.customerId).all();
      collections = session.customerId
        ? await db.prepare(`SELECT id,customer_name AS customerName,amount,method,created_at AS createdAt FROM collections WHERE customer_id=? ORDER BY created_at DESC,id DESC LIMIT 50`).bind(session.customerId).all()
        : { results: [] };
    } else {
      const customerFilter = session.role === "employee" && session.salesRep ? "WHERE active=1 AND sales_rep=?" : "WHERE active=1";
      const customerQuery = `SELECT id,code,name,route,sales_rep AS salesRep,tier,last_order_at AS lastOrderAt,avg_reorder_days AS avgReorderDays,expected_value AS expectedValue,balance,whatsapp_number AS whatsappNumber,address FROM customers ${customerFilter} ORDER BY tier,name`;
      customers = session.role === "employee" && session.salesRep ? await db.prepare(customerQuery).bind(session.salesRep).all() : await db.prepare(customerQuery).all();
      if (session.role === "employee" && session.salesRep) {
        orders = await db.prepare(`SELECT o.id,o.order_number AS orderNumber,o.customer_name AS customerName,o.source,o.total,o.status,o.created_at AS createdAt FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE c.sales_rep=? OR o.created_by_user_id=? ORDER BY o.created_at DESC,o.id DESC LIMIT 100`).bind(session.salesRep, session.userId).all();
        collections = await db.prepare(`SELECT x.id,x.customer_name AS customerName,x.amount,x.method,x.created_at AS createdAt FROM collections x LEFT JOIN customers c ON c.id=x.customer_id WHERE c.sales_rep=? OR x.created_by_user_id=? ORDER BY x.created_at DESC,x.id DESC LIMIT 100`).bind(session.salesRep, session.userId).all();
      } else {
        orders = await db.prepare(`SELECT id,order_number AS orderNumber,customer_name AS customerName,source,total,status,created_at AS createdAt FROM orders ORDER BY created_at DESC,id DESC LIMIT 100`).all();
        collections = await db.prepare(`SELECT id,customer_name AS customerName,amount,method,created_at AS createdAt FROM collections ORDER BY created_at DESC,id DESC LIMIT 100`).all();
      }
    }
    const audits = session.role === "admin"
      ? await db.prepare(`SELECT id,actor_email AS actorEmail,actor_role AS actorRole,action,entity_type AS entityType,entity_id AS entityId,created_at AS createdAt FROM audit_logs ORDER BY created_at DESC,id DESC LIMIT 25`).all()
      : { results: [] };

    return Response.json({
      session: { ...session, permissions: roleActions[session.role] },
      products: products.results,
      customers: customers.results,
      orders: orders.results,
      collections: collections.results,
      audits: audits.results,
      meta: { dataProfile: settings.data_profile ?? "demo", generatedAt: new Date().toISOString() },
      priceList: {
        version: settings.price_list_version ?? "NAPRI-DV1-2026-08",
        statusCode: settings.price_list_status ?? "draft",
        status: settings.price_list_status === "active" ? "نشطة ومعتمدة" : "مسودة تنتظر اعتماد الإدارة",
        currency: "ج.م",
        note: "السعر والمخزون يعاد التحقق منهما داخل الخادم قبل تسجيل أي طلب.",
      },
    });
  } catch {
    return jsonError("تعذر فتح قاعدة البيانات بأمان", 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const session = await resolveSession();
    if (!session) return jsonError("يلزم تسجيل الدخول بحساب مصرح له", 401);
    const payload = await request.json() as SalesPayload;
    const action = clean(payload.action, 40);
    if (!can(session, action)) return jsonError("ليست لديك صلاحية لتنفيذ هذا الإجراء", 403);
    const db = env.DB;

    if (action === "create_order") {
      const priceStatus = await db.prepare(`SELECT value FROM app_settings WHERE key='price_list_status'`).first<{ value: string }>();
      if (session.role === "customer" && priceStatus?.value !== "active") return jsonError("قائمة الأسعار لم تعتمد للبيع الخارجي بعد", 409);
      const requestKey = clean(payload.requestKey, 80) || crypto.randomUUID();
      const duplicate = await db.prepare(`SELECT id,order_number AS orderNumber,customer_name AS customerName,source,total,status,created_at AS createdAt FROM orders WHERE request_key=?`).bind(requestKey).first<Record<string, unknown>>();
      if (duplicate) return Response.json({ order: duplicate, idempotent: true });

      let customerId = Number(payload.customerId) || null;
      let customerName = clean(payload.customerName, 120);
      if (session.role === "customer" && session.customerId) customerId = session.customerId;
      const customer = customerId
        ? await db.prepare("SELECT id,name,whatsapp_number AS whatsappNumber,address,sales_rep AS salesRep FROM customers WHERE id=? AND active=1").bind(customerId).first<{ id: number; name: string; whatsappNumber: string; address: string; salesRep: string }>()
        : session.role !== "customer" && customerName ? await db.prepare("SELECT id,name,whatsapp_number AS whatsappNumber,address,sales_rep AS salesRep FROM customers WHERE name=? AND active=1 LIMIT 1").bind(customerName).first<{ id: number; name: string; whatsappNumber: string; address: string; salesRep: string }>() : null;
      if (session.role === "employee" && session.salesRep && customer?.salesRep !== session.salesRep) return jsonError("هذا العميل خارج قائمة المندوب المصرح بها", 403);
      if (customer) { customerId = customer.id; customerName = customer.name; }
      if (!customerName) return jsonError("اسم العميل مطلوب", 400);
      const contactPhone = clean(payload.contactPhone, 40) || customer?.whatsappNumber || "";
      const deliveryAddress = clean(payload.deliveryAddress, 300) || customer?.address || "";
      if (session.role === "customer" && (!contactPhone || !deliveryAddress)) return jsonError("رقم التواصل وعنوان التسليم مطلوبان", 400);

      const requestedItems = (payload.items ?? []).slice(0, 50).filter((item) => Number(item.productId) > 0 && Number(item.quantity) > 0);
      if (!requestedItems.length) return jsonError("الطلب لا يحتوي منتجات", 400);
      const verified: { id: number; name: string; price: number; stock: number; quantity: number }[] = [];
      for (const item of requestedItems) {
        const product = await db.prepare("SELECT id,name,price,stock FROM products WHERE id=? AND active=1").bind(Number(item.productId)).first<{ id: number; name: string; price: number; stock: number }>();
        if (!product) return jsonError("أحد المنتجات غير متاح", 409);
        const quantity = Math.floor(Number(item.quantity));
        if (quantity > Number(product.stock)) return jsonError(`الكمية المتاحة من ${product.name} هي ${product.stock}`, 409);
        verified.push({ ...product, price: Number(product.price), stock: Number(product.stock), quantity });
      }
      const total = verified.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const keyPart = requestKey.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase() || crypto.randomUUID().slice(0, 8).toUpperCase();
      const orderNumber = `NAP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${keyPart}`;
      const source = session.role === "customer" ? "بوابة العميل" : clean(payload.source, 80) || "إدخال داخلي";
      const statements = [
        db.prepare(`INSERT INTO orders (order_number,customer_id,customer_name,contact_phone,delivery_address,notes,source,total,status,created_by_user_id,request_key) VALUES (?,?,?,?,?,?,?,?, 'جديد',?,?)`).bind(orderNumber, customerId, customerName, contactPhone, deliveryAddress, clean(payload.notes, 500), source, total, session.userId, requestKey),
        ...verified.flatMap((item) => [
          db.prepare(`INSERT INTO order_items (order_id,product_id,product_name,quantity,unit_price) SELECT id,?,?,?,? FROM orders WHERE request_key=?`).bind(item.id, item.name, item.quantity, item.price, requestKey),
          db.prepare("UPDATE products SET stock=stock-?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(item.quantity, item.id),
          db.prepare(`INSERT INTO inventory_movements (product_id,movement_type,quantity,reason,actor_user_id) VALUES (?,'sale',?,?,?)`).bind(item.id, -item.quantity, orderNumber, session.userId),
        ]),
        audit(session, "create_order", "order", orderNumber, { total, customerName, itemCount: verified.length }),
      ];
      if (customerId) statements.push(db.prepare("UPDATE customers SET last_order_at=date('now') WHERE id=?").bind(customerId));
      try {
        await db.batch(statements);
      } catch {
        return jsonError("تغير المخزون أثناء الحفظ؛ راجع الكميات وأعد المحاولة", 409);
      }
      const inserted = await db.prepare(`SELECT id,order_number AS orderNumber,customer_name AS customerName,source,total,status,created_at AS createdAt FROM orders WHERE request_key=?`).bind(requestKey).first<Record<string, unknown>>();
      return Response.json({ order: inserted }, { status: 201 });
    }

    if (action === "record_collection") {
      const customerId = Number(payload.customerId);
      const amount = Number(payload.amount);
      if (!(customerId > 0) || !(amount > 0)) return jsonError("العميل والمبلغ مطلوبان", 400);
      const customer = await db.prepare("SELECT id,name,balance,sales_rep AS salesRep FROM customers WHERE id=? AND active=1").bind(customerId).first<{ id: number; name: string; balance: number; salesRep: string }>();
      if (!customer) return jsonError("العميل غير موجود", 404);
      if (session.role === "employee" && session.salesRep && customer.salesRep !== session.salesRep) return jsonError("هذا العميل خارج قائمة المندوب المصرح بها", 403);
      if (Number(customer.balance) <= 0 || amount > Number(customer.balance)) return jsonError("المبلغ يتجاوز الرصيد المستحق", 409);
      await db.batch([
        db.prepare("INSERT INTO collections (customer_id,customer_name,amount,method,created_by_user_id) VALUES (?,?,?,?,?)").bind(customer.id, customer.name, amount, clean(payload.method, 40) || "نقدي", session.userId),
        db.prepare("UPDATE customers SET balance=balance-? WHERE id=?").bind(amount, customer.id),
        audit(session, "record_collection", "customer", customer.id, { amount, method: clean(payload.method, 40) || "نقدي" }),
      ]);
      const collection = await db.prepare(`SELECT id,customer_name AS customerName,amount,method,created_at AS createdAt FROM collections WHERE customer_id=? ORDER BY id DESC LIMIT 1`).bind(customer.id).first<Record<string, unknown>>();
      return Response.json({ collection }, { status: 201 });
    }

    if (action === "update_order_status") {
      const orderId = Number(payload.orderId);
      const status = clean(payload.status, 40);
      const allowedStatuses = ["جديد", "قيد التجهيز", "جاهز للتسليم", "تم التسليم"];
      if (!(orderId > 0) || !allowedStatuses.includes(status)) return jsonError("حالة الطلب غير صحيحة", 400);
      const current = await db.prepare("SELECT o.status,o.created_by_user_id AS createdByUserId,c.sales_rep AS salesRep FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.id=?").bind(orderId).first<{ status: string; createdByUserId: string | null; salesRep: string | null }>();
      if (!current) return jsonError("الطلب غير موجود", 404);
      if (session.role === "employee" && session.salesRep && current.salesRep !== session.salesRep && current.createdByUserId !== session.userId) return jsonError("هذا الطلب خارج قائمة المندوب المصرح بها", 403);
      const currentIndex = allowedStatuses.indexOf(current.status);
      const nextIndex = allowedStatuses.indexOf(status);
      if (nextIndex < currentIndex || nextIndex > currentIndex + 1) return jsonError("يجب تحديث الحالة بالتسلسل ولا يمكن التراجع", 409);
      await db.batch([
        db.prepare("UPDATE orders SET status=? WHERE id=?").bind(status, orderId),
        audit(session, "update_order_status", "order", orderId, { from: current.status, to: status }),
      ]);
      const order = await db.prepare(`SELECT id,order_number AS orderNumber,customer_name AS customerName,source,total,status,created_at AS createdAt FROM orders WHERE id=?`).bind(orderId).first<Record<string, unknown>>();
      return Response.json({ order });
    }

    if (action === "upsert_product") {
      const product = payload.product ?? {};
      const sku = clean(product.sku, 60).toUpperCase();
      const name = clean(product.name, 120);
      const price = Number(product.price);
      if (!sku || !name || !(price >= 0)) return jsonError("كود المنتج واسمه وسعره مطلوبة", 400);
      await db.prepare(`INSERT INTO products (sku,name,category,pack_size,price,stock,reorder_level,unit) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(sku) DO UPDATE SET name=excluded.name,category=excluded.category,pack_size=excluded.pack_size,price=excluded.price,reorder_level=excluded.reorder_level,unit=excluded.unit,active=1,updated_at=CURRENT_TIMESTAMP`).bind(sku, name, clean(product.category, 100), clean(product.packSize, 80), price, Math.max(0, Math.floor(Number(product.stock) || 0)), Math.max(0, Math.floor(Number(product.reorderLevel) || 0)), clean(product.unit, 30) || "وحدة").run();
      const saved = await db.prepare("SELECT id FROM products WHERE sku=?").bind(sku).first<{ id: number }>();
      await audit(session, "upsert_product", "product", saved?.id ?? sku, { sku, name, price }).run();
      return Response.json({ ok: true, id: saved?.id });
    }

    if (action === "upsert_customer") {
      const customer = payload.customer ?? {};
      const code = clean(customer.code, 40);
      const name = clean(customer.name, 120);
      if (!code || !name) return jsonError("كود العميل واسمه مطلوبان", 400);
      const tier = clean(customer.tier, 1);
      await db.prepare(`INSERT INTO customers (code,name,route,sales_rep,tier,last_order_at,whatsapp_number,address) VALUES (?,?,?,?,?,date('now'),?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name,route=excluded.route,sales_rep=excluded.sales_rep,tier=excluded.tier,whatsapp_number=excluded.whatsapp_number,address=excluded.address,active=1`).bind(code, name, clean(customer.route, 100), clean(customer.salesRep, 100), ["A", "B", "C"].includes(tier) ? tier : "B", clean(customer.whatsappNumber, 40), clean(customer.address, 300)).run();
      const saved = await db.prepare("SELECT id FROM customers WHERE code=?").bind(code).first<{ id: number }>();
      await audit(session, "upsert_customer", "customer", saved?.id ?? code, { code, name }).run();
      return Response.json({ ok: true, id: saved?.id });
    }

    if (action === "adjust_inventory") {
      const productId = Number(payload.productId);
      const quantity = Math.trunc(Number(payload.quantity));
      const reason = clean(payload.reason, 160);
      if (!(productId > 0) || !quantity || !reason) return jsonError("المنتج والكمية والسبب مطلوبة", 400);
      try {
        await db.batch([
          db.prepare("UPDATE products SET stock=stock+?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(quantity, productId),
          db.prepare(`INSERT INTO inventory_movements (product_id,movement_type,quantity,reason,actor_user_id) VALUES (?,'adjustment',?,?,?)`).bind(productId, quantity, reason, session.userId),
          audit(session, "adjust_inventory", "product", productId, { quantity, reason }),
        ]);
      } catch {
        return jsonError("التعديل سيجعل المخزون سالبًا", 409);
      }
      return Response.json({ ok: true });
    }

    if (action === "set_price_list_status") {
      const status = payload.priceListStatus;
      if (status !== "draft" && status !== "active") return jsonError("حالة القائمة غير صحيحة", 400);
      await db.batch([
        db.prepare(`INSERT INTO app_settings (key,value,updated_by,updated_at) VALUES ('price_list_status',?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`).bind(status, session.userId),
        audit(session, "set_price_list_status", "price_list", "NAPRI-DV1-2026-08", { status }),
      ]);
      return Response.json({ ok: true, status });
    }

    if (action === "assign_role") {
      const email = clean(payload.userEmail, 160).toLowerCase();
      const role = payload.role;
      if (!email || !role || !["admin", "employee", "customer"].includes(role)) return jsonError("البريد والدور مطلوبان", 400);
      const mappedCustomerId = payload.mappedCustomerId ? Number(payload.mappedCustomerId) : null;
      await db.prepare(`INSERT INTO app_users (user_id,email,display_name,role,customer_id) VALUES (?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role,customer_id=excluded.customer_id,active=1`).bind(`pending:${email}`, email, email, role, mappedCustomerId).run();
      await audit(session, "assign_role", "app_user", email, { role, mappedCustomerId }).run();
      return Response.json({ ok: true });
    }

    return jsonError("إجراء غير معروف", 400);
  } catch {
    return jsonError("تعذر حفظ العملية بأمان", 500);
  }
}
