import { env } from "cloudflare:workers";

type OrderItemInput = { productId?: number; quantity?: number };

async function ensureDatabase() {
  const db = env.DB;
  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, route TEXT NOT NULL DEFAULT '', sales_rep TEXT NOT NULL DEFAULT '', tier TEXT NOT NULL DEFAULT 'B', last_order_at TEXT NOT NULL, avg_reorder_days INTEGER NOT NULL DEFAULT 14, expected_value REAL NOT NULL DEFAULT 0, balance REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL, pack_size TEXT NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL DEFAULT 0, reorder_level INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER REFERENCES customers(id), customer_name TEXT NOT NULL, source TEXT NOT NULL, total REAL NOT NULL, status TEXT NOT NULL DEFAULT 'جديد', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id), product_name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price REAL NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS collections (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER REFERENCES customers(id), customer_name TEXT NOT NULL, amount REAL NOT NULL, method TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_route ON customers(route)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_open_status ON orders(status) WHERE status != 'تم التسليم'`,
    `CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_collections_customer_created ON collections(customer_id, created_at)`,
  ];
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));

  const customerSeeds = [
    ["100001","الفردوس","مدينة بدر","محمد البشري","A","2026-08-10",12,2450,800],
    ["100008","اسواق السودان","مدينة نصر","محمد البشري","A","2026-08-12",10,3180,0],
    ["100012","ود ابروف","مدينة نصر","محمد البشري","B","2026-08-03",14,1800,500],
    ["200004","سنتر امدرمان","حدائق الاهرام","عمرو علاء","A","2026-08-06",13,2700,1800],
    ["200012","ابو راس","المهندسين","عمرو علاء","B","2026-08-08",16,1700,0],
    ["200018","محلات ابو معاذ","الهرم","عمرو علاء","B","2026-08-01",15,1450,450],
    ["100017","الخرطوم 2","مدينة بدر","محمد البشري","A","2026-08-09",11,3850,1500]
  ];
  const productSeeds = [
    ["NAP-QAR-250","القرض","منتجات سودانية","250 جرام",65,48,18],
    ["NAP-ONI-150","البصل المجفف","خضروات مجففة","150 جرام",40,32,16],
    ["NAP-CHI-100","شطة قبانيت","توابل","100 جرام",65,18,20],
    ["NAP-MOL-100","ملوخية مجففة","خضروات مجففة","100 جرام",55,12,15],
    ["NAP-WEI-100","ويكة","منتجات سودانية","100 جرام",40,24,18],
    ["GLF-SWT-25X25","حلويات قرين لايف","حلويات - سعر الكرتونة","25 علبة × 25 قطعة",1900,12,3],
    ["GLF-SES-500-12","زيت سمسم 500 مل","زيوت - سعر الكرتونة","12 قارورة",1400,10,3],
    ["GLF-SES-250-12","زيت سمسم 250 مل","زيوت - سعر الكرتونة","12 قارورة",840,10,3],
    ["GLF-SES-125-24","زيت سمسم 125 مل","زيوت - سعر الكرتونة","24 قارورة",850,10,3]
  ];
  await db.prepare(`UPDATE products SET sku='NAP-ONI-150' WHERE sku='NAP-ONI-100' AND NOT EXISTS (SELECT 1 FROM products WHERE sku='NAP-ONI-150')`).run();
  await db.batch([
    ...customerSeeds.map((row) => db.prepare(`INSERT OR IGNORE INTO customers (code,name,route,sales_rep,tier,last_order_at,avg_reorder_days,expected_value,balance) VALUES (?,?,?,?,?,?,?,?,?)`).bind(...row)),
    ...productSeeds.map((row) => db.prepare(`INSERT INTO products (sku,name,category,pack_size,price,stock,reorder_level) VALUES (?,?,?,?,?,?,?) ON CONFLICT(sku) DO UPDATE SET name=excluded.name,category=excluded.category,pack_size=excluded.pack_size,price=excluded.price,reorder_level=excluded.reorder_level,active=1`).bind(...row)),
  ]);

  const orderCount = await db.prepare("SELECT COUNT(*) AS count FROM orders").first<{ count: number }>();
  if (!orderCount?.count) {
    await db.batch([
      db.prepare("INSERT INTO orders (customer_id,customer_name,source,total,status,created_at) VALUES ((SELECT id FROM customers WHERE code='100008'),'اسواق السودان','مندوب',3180,'جديد','2026-08-18 09:20')"),
      db.prepare("INSERT INTO orders (customer_id,customer_name,source,total,status,created_at) VALUES ((SELECT id FROM customers WHERE code='100001'),'الفردوس','واتساب',2450,'قيد التجهيز','2026-08-17 16:40')"),
      db.prepare("INSERT INTO orders (customer_id,customer_name,source,total,status,created_at) VALUES ((SELECT id FROM customers WHERE code='200004'),'سنتر امدرمان','مندوب',2700,'تم التسليم','2026-08-17 11:10')"),
      db.prepare("INSERT INTO orders (customer_id,customer_name,source,total,status,created_at) VALUES ((SELECT id FROM customers WHERE code='100017'),'الخرطوم 2','إعادة طلب',3850,'تم التسليم','2026-08-16 13:30')"),
      db.prepare("INSERT INTO collections (customer_id,customer_name,amount,method,created_at) VALUES ((SELECT id FROM customers WHERE code='100001'),'الفردوس',400,'نقدي','2026-08-18 10:00')"),
      db.prepare("INSERT INTO collections (customer_id,customer_name,amount,method,created_at) VALUES ((SELECT id FROM customers WHERE code='200004'),'سنتر امدرمان',1000,'تحويل','2026-08-17 15:25')"),
      db.prepare("INSERT INTO collections (customer_id,customer_name,amount,method,created_at) VALUES ((SELECT id FROM customers WHERE code='100017'),'الخرطوم 2',750,'نقدي','2026-08-17 12:15')"),
    ]);
  }
}

export async function GET() {
  try {
    await ensureDatabase();
    const db = env.DB;
    const [products, customers, orders, collections] = await Promise.all([
      db.prepare(`SELECT id,sku,name,category,pack_size AS packSize,price,stock,reorder_level AS reorderLevel FROM products WHERE active=1 ORDER BY id`).all(),
      db.prepare(`SELECT id,code,name,route,sales_rep AS salesRep,tier,last_order_at AS lastOrderAt,avg_reorder_days AS avgReorderDays,expected_value AS expectedValue,balance FROM customers ORDER BY tier,name`).all(),
      db.prepare(`SELECT id,customer_name AS customerName,source,total,status,created_at AS createdAt FROM orders ORDER BY created_at DESC,id DESC LIMIT 50`).all(),
      db.prepare(`SELECT id,customer_name AS customerName,amount,method,created_at AS createdAt FROM collections ORDER BY created_at DESC,id DESC LIMIT 50`).all(),
    ]);
    return Response.json({
      products: products.results,
      customers: customers.results,
      orders: orders.results,
      collections: collections.results,
      priceList: {
        version: "NAPRI-P1-2026-08",
        status: "مسودة اعتماد الإدارة",
        currency: "ج.م",
        note: "الأسعار نفسها تُستخدم في الإدارة والمندوب ومتجر العميل ويعيد الخادم التحقق منها عند الحفظ.",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر فتح قاعدة البيانات" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const payload = await request.json() as { action?: string; customerName?: string; source?: string; items?: OrderItemInput[]; amount?: number; method?: string; orderId?: number; status?: string };
    const db = env.DB;
    const customerName = payload.customerName?.trim() || "عميل غير مسمى";
    const customer = await db.prepare("SELECT id FROM customers WHERE name=? LIMIT 1").bind(customerName).first<{ id: number }>();

    if (payload.action === "create_order") {
      const requestedItems = (payload.items ?? []).filter((item) => Number(item.productId) > 0 && Number(item.quantity) > 0);
      if (!requestedItems.length) return Response.json({ error: "الطلب لا يحتوي منتجات" }, { status: 400 });
      const verified: { id: number; name: string; price: number; quantity: number }[] = [];
      for (const item of requestedItems) {
        const product = await db.prepare("SELECT id,name,price,stock FROM products WHERE id=? AND active=1").bind(Number(item.productId)).first<{ id: number; name: string; price: number; stock: number }>();
        if (!product) continue;
        verified.push({ id: product.id, name: product.name, price: Number(product.price), quantity: Math.min(Number(item.quantity), Math.max(0, Number(product.stock))) });
      }
      const usable = verified.filter((item) => item.quantity > 0);
      const total = usable.reduce((sum, item) => sum + item.price * item.quantity, 0);
      if (!total) return Response.json({ error: "لا توجد كمية متاحة" }, { status: 400 });
      const inserted = await db.prepare("INSERT INTO orders (customer_id,customer_name,source,total,status) VALUES (?,?,?,?, 'جديد') RETURNING id,customer_name AS customerName,source,total,status,created_at AS createdAt").bind(customer?.id ?? null, customerName, payload.source ?? "إدخال داخلي", total).first<Record<string, unknown>>();
      const orderId = Number(inserted?.id);
      await db.batch(usable.flatMap((item) => [
        db.prepare("INSERT INTO order_items (order_id,product_id,product_name,quantity,unit_price) VALUES (?,?,?,?,?)").bind(orderId,item.id,item.name,item.quantity,item.price),
        db.prepare("UPDATE products SET stock=MAX(0,stock-?) WHERE id=?").bind(item.quantity,item.id),
      ]));
      return Response.json({ order: inserted }, { status: 201 });
    }

    if (payload.action === "record_collection") {
      const amount = Number(payload.amount);
      if (!(amount > 0)) return Response.json({ error: "المبلغ غير صحيح" }, { status: 400 });
      const collection = await db.prepare("INSERT INTO collections (customer_id,customer_name,amount,method) VALUES (?,?,?,?) RETURNING id,customer_name AS customerName,amount,method,created_at AS createdAt").bind(customer?.id ?? null, customerName, amount, payload.method ?? "نقدي").first<Record<string, unknown>>();
      if (customer?.id) await db.prepare("UPDATE customers SET balance=MAX(0,balance-?) WHERE id=?").bind(amount, customer.id).run();
      return Response.json({ collection }, { status: 201 });
    }

    if (payload.action === "update_order_status") {
      const orderId = Number(payload.orderId);
      const allowedStatuses = ["جديد", "قيد التجهيز", "جاهز للتسليم", "تم التسليم"];
      if (!(orderId > 0) || !allowedStatuses.includes(payload.status ?? "")) return Response.json({ error: "حالة الطلب غير صحيحة" }, { status: 400 });
      const order = await db.prepare("UPDATE orders SET status=? WHERE id=? RETURNING id,customer_name AS customerName,source,total,status,created_at AS createdAt").bind(payload.status, orderId).first<Record<string, unknown>>();
      if (!order) return Response.json({ error: "الطلب غير موجود" }, { status: 404 });
      return Response.json({ order });
    }

    return Response.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر حفظ العملية" }, { status: 500 });
  }
}
