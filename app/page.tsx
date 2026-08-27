"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type Role = "admin" | "employee" | "customer";
type EmployeeMode = "sales" | "accounting" | "marketing";
type Section =
  | "overview"
  | "customers"
  | "orders"
  | "routes"
  | "collections"
  | "inventory"
  | "marketing"
  | "structure"
  | "shop";

type Product = { id: number; sku: string; name: string; category: string; packSize: string; price: number; cost?: number; unit?: string; stock: number; reorderLevel: number };
type Customer = { id: number; code: string; name: string; route: string; salesRep: string; tier: string; lastOrderAt: string; avgReorderDays: number; expectedValue: number; balance: number; whatsappNumber?: string; address?: string };
type Order = { id: number; orderNumber?: string; customerName: string; source: string; total: number; status: string; createdAt: string };
type Collection = { id: number; customerName: string; amount: number; method: string; createdAt: string };
type PriceListMeta = { version: string; status: string; statusCode?: "draft" | "active"; currency: string; note: string };
type SessionInfo = { userId: string; email: string; displayName: string; role: Role; customerId: number | null; permissions: string[] };
type AuditEntry = { id: number; actorEmail: string; actorRole: Role; action: string; entityType: string; entityId?: string; createdAt: string };
type AppData = { products: Product[]; customers: Customer[]; orders: Order[]; collections: Collection[]; priceList: PriceListMeta; session?: SessionInfo; audits?: AuditEntry[]; meta?: { dataProfile: string; generatedAt: string } };
type GateInfo = { title: string; description: string; requirements: string[]; badge?: string };

const roleOptions: { key: Role; label: string; hint: string }[] = [
  { key: "admin", label: "الإدارة", hint: "الصورة الكاملة" },
  { key: "employee", label: "المندوب والموظف", hint: "التنفيذ اليومي" },
  { key: "customer", label: "العميل", hint: "الطلب والمتابعة" },
];

const navByRole: Record<Role, { key: Section; label: string; icon: string }[]> = {
  admin: [
    { key: "overview", label: "مركز القيادة", icon: "⌂" },
    { key: "customers", label: "العملاء والتوقعات", icon: "◉" },
    { key: "orders", label: "الطلبات والمبيعات", icon: "▣" },
    { key: "routes", label: "خطوط السير", icon: "⌖" },
    { key: "collections", label: "التحصيل والديون", icon: "◫" },
    { key: "inventory", label: "قائمة الأسعار والمخزون", icon: "◇" },
    { key: "marketing", label: "التسويق والنمو", icon: "✦" },
    { key: "structure", label: "هيكل الشركة", icon: "⌘" },
  ],
  employee: [
    { key: "overview", label: "يومي الآن", icon: "⌂" },
    { key: "routes", label: "مساري", icon: "⌖" },
    { key: "customers", label: "عملائي", icon: "◉" },
    { key: "orders", label: "الطلبات", icon: "▣" },
    { key: "collections", label: "التحصيل", icon: "◫" },
    { key: "marketing", label: "مهام التسويق", icon: "✦" },
  ],
  customer: [
    { key: "shop", label: "متجر نبري", icon: "◇" },
    { key: "orders", label: "طلباتي", icon: "▣" },
    { key: "overview", label: "حسابي", icon: "◉" },
  ],
};

const fallbackData: AppData = {
  products: [
    { id: 1, sku: "NAP-QAR-250", name: "القرض", category: "منتجات سودانية", packSize: "250 جرام", price: 65, stock: 48, reorderLevel: 18 },
    { id: 2, sku: "NAP-ONI-150", name: "البصل المجفف", category: "خضروات مجففة", packSize: "150 جرام", price: 40, stock: 32, reorderLevel: 16 },
    { id: 3, sku: "NAP-CHI-100", name: "شطة قبانيت", category: "توابل", packSize: "100 جرام", price: 65, stock: 18, reorderLevel: 20 },
    { id: 4, sku: "NAP-MOL-100", name: "ملوخية مجففة", category: "خضروات مجففة", packSize: "100 جرام", price: 55, stock: 12, reorderLevel: 15 },
    { id: 5, sku: "NAP-WEI-100", name: "ويكة", category: "منتجات سودانية", packSize: "100 جرام", price: 40, stock: 24, reorderLevel: 18 },
    { id: 6, sku: "GLF-SWT-25X25", name: "حلويات قرين لايف", category: "حلويات - سعر الكرتونة", packSize: "25 علبة × 25 قطعة", price: 1900, stock: 12, reorderLevel: 3 },
    { id: 7, sku: "GLF-SES-500-12", name: "زيت سمسم 500 مل", category: "زيوت - سعر الكرتونة", packSize: "12 قارورة", price: 1400, stock: 10, reorderLevel: 3 },
    { id: 8, sku: "GLF-SES-250-12", name: "زيت سمسم 250 مل", category: "زيوت - سعر الكرتونة", packSize: "12 قارورة", price: 840, stock: 10, reorderLevel: 3 },
    { id: 9, sku: "GLF-SES-125-24", name: "زيت سمسم 125 مل", category: "زيوت - سعر الكرتونة", packSize: "24 قارورة", price: 850, stock: 10, reorderLevel: 3 },
  ],
  customers: [
    { id: 1, code: "100001", name: "الفردوس", route: "مدينة بدر", salesRep: "محمد البشري", tier: "A", lastOrderAt: "2026-08-10", avgReorderDays: 12, expectedValue: 2450, balance: 800 },
    { id: 2, code: "100008", name: "اسواق السودان", route: "مدينة نصر", salesRep: "محمد البشري", tier: "A", lastOrderAt: "2026-08-12", avgReorderDays: 10, expectedValue: 3180, balance: 0 },
    { id: 3, code: "100012", name: "ود ابروف", route: "مدينة نصر", salesRep: "محمد البشري", tier: "B", lastOrderAt: "2026-08-03", avgReorderDays: 14, expectedValue: 1800, balance: 500 },
    { id: 4, code: "200004", name: "سنتر امدرمان", route: "حدائق الاهرام", salesRep: "عمرو علاء", tier: "A", lastOrderAt: "2026-08-06", avgReorderDays: 13, expectedValue: 2700, balance: 1800 },
    { id: 5, code: "200012", name: "ابو راس", route: "المهندسين", salesRep: "عمرو علاء", tier: "B", lastOrderAt: "2026-08-08", avgReorderDays: 16, expectedValue: 1700, balance: 0 },
    { id: 6, code: "200018", name: "محلات ابو معاذ", route: "الهرم", salesRep: "عمرو علاء", tier: "B", lastOrderAt: "2026-08-01", avgReorderDays: 15, expectedValue: 1450, balance: 450 },
    { id: 7, code: "100017", name: "الخرطوم 2", route: "مدينة بدر", salesRep: "محمد البشري", tier: "A", lastOrderAt: "2026-08-09", avgReorderDays: 11, expectedValue: 3850, balance: 1500 },
  ],
  orders: [
    { id: 1042, customerName: "اسواق السودان", source: "مندوب", total: 3180, status: "جديد", createdAt: "2026-08-18 09:20" },
    { id: 1041, customerName: "الفردوس", source: "واتساب", total: 2450, status: "قيد التجهيز", createdAt: "2026-08-17 16:40" },
    { id: 1040, customerName: "سنتر امدرمان", source: "مندوب", total: 2700, status: "تم التسليم", createdAt: "2026-08-17 11:10" },
    { id: 1039, customerName: "الخرطوم 2", source: "إعادة طلب", total: 3850, status: "تم التسليم", createdAt: "2026-08-16 13:30" },
  ],
  collections: [
    { id: 1, customerName: "الفردوس", amount: 400, method: "نقدي", createdAt: "2026-08-18 10:00" },
    { id: 2, customerName: "سنتر امدرمان", amount: 1000, method: "تحويل", createdAt: "2026-08-17 15:25" },
    { id: 3, customerName: "الخرطوم 2", amount: 750, method: "نقدي", createdAt: "2026-08-17 12:15" },
  ],
  priceList: {
    version: "NAPRI-DV1-2026-08",
    status: "مسودة تنتظر اعتماد الإدارة",
    statusCode: "draft",
    currency: "ج.م",
    note: "الأسعار نفسها تُستخدم في الإدارة والمندوب ومتجر العميل ويعيد الخادم التحقق منها عند الحفظ.",
  },
};

const routeSignals = [
  { name: "مدينة نصر", movements: 26, share: 100, day: "السبت والثلاثاء", owner: "محمد البشري" },
  { name: "فيصل", movements: 17, share: 65, day: "الأحد والأربعاء", owner: "عمرو علاء" },
  { name: "المهندسين", movements: 12, share: 46, day: "الخميس", owner: "عمرو علاء" },
  { name: "عابدين", movements: 10, share: 38, day: "الاثنين", owner: "حسب التوزيع" },
  { name: "بدر / مدينة بدر", movements: 13, share: 50, day: "السبت", owner: "محمد البشري" },
];

const money = (value: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(value) + " ج.م";
const shortDate = (value: string) => new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(new Date(value.replace(" ", "T")));

function SectionTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="section-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "dark" }) {
  return <span className={"badge " + tone}>{children}</span>;
}

function PriceListBar({ meta, onOpen }: { meta: PriceListMeta; onOpen?: () => void }) {
  return <div className="price-list-bar"><div><span>قائمة الأسعار الموحّدة</span><strong>{meta.version}</strong><small>{meta.note}</small></div><Badge tone="warn">{meta.status}</Badge>{onOpen && <button type="button" onClick={onOpen}>فتح القائمة ←</button>}</div>;
}

export default function Home() {
  const [role, setRole] = useState<Role>("admin");
  const [sessionRole, setSessionRole] = useState<Role>("admin");
  const [section, setSection] = useState<Section>("overview");
  const [employeeMode, setEmployeeMode] = useState<EmployeeMode>("sales");
  const [data, setData] = useState<AppData>(fallbackData);
  const [dataMode, setDataMode] = useState("جارٍ ربط قاعدة البيانات");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [orderOpen, setOrderOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [adminToolsOpen, setAdminToolsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [gate, setGate] = useState<GateInfo | null>(null);
  const [completedStops, setCompletedStops] = useState<string[]>(["اسواق السودان"]);
  const [quickOrderSku, setQuickOrderSku] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSku = params.get("sku")?.trim() ?? "";
    const timer = window.setTimeout(() => {
      if (params.get("role") === "customer" || requestedSku) {
        setRole("customer");
        setSection("shop");
      }
      if (requestedSku) setQuickOrderSku(requestedSku);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetch("/api/sales")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "تعذر فتح النظام");
        return payload as AppData;
      })
      .then((payload) => {
        setData({ ...payload, priceList: payload.priceList ?? fallbackData.priceList });
        const assignedRole = payload.session?.role ?? "customer";
        setSessionRole(assignedRole);
        if (assignedRole !== "admin") {
          setRole(assignedRole);
          setSection(assignedRole === "customer" ? "shop" : "overview");
        }
        setDataMode(`جلسة ${roleOptions.find((item) => item.key === assignedRole)?.label ?? assignedRole} آمنة`);
      })
      .catch(() => setDataMode("تعذر التحقق من جلسة الدخول"));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!quickOrderSku) return;
    const product = data.products.find((item) => item.sku === quickOrderSku);
    if (!product) return;
    const timer = window.setTimeout(() => {
      setCart((current) => current[product.id] ? current : { ...current, [product.id]: 1 });
      document.getElementById(`product-${product.sku}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [data.products, quickOrderSku]);

  const changeRole = (nextRole: Role) => {
    if (sessionRole !== "admin" && nextRole !== sessionRole) return;
    setRole(nextRole);
    setSection(nextRole === "customer" ? "shop" : "overview");
  };

  const cartTotal = useMemo(() => data.products.reduce((sum, product) => sum + product.price * (cart[product.id] ?? 0), 0), [cart, data.products]);
  const outstanding = data.customers.reduce((sum, customer) => sum + customer.balance, 0);
  const orderSales = data.orders.reduce((sum, order) => sum + order.total, 0);
  const forecastRows = useMemo(() => data.customers.map((customer) => {
    const last = new Date(customer.lastOrderAt + "T00:00:00");
    const next = new Date(last);
    next.setDate(next.getDate() + customer.avgReorderDays);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.ceil((next.getTime() - today.getTime()) / 86400000);
    const confidence = Math.max(58, Math.min(94, 92 - Math.abs(days) * 3));
    return { ...customer, next, days, confidence };
  }).sort((a, b) => a.days - b.days), [data.customers]);

  const submitOrder = async (customerName: string, source: string, items: { productId: number; quantity: number }[], details: { contactPhone?: string; deliveryAddress?: string; notes?: string } = {}) => {
    if (!items.length) { setToast("أضف منتجًا واحدًا على الأقل"); return; }
    try {
      const response = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_order", customerName, source, items, requestKey: crypto.randomUUID(), ...details }) });
      const responsePayload = await response.json();
      if (!response.ok) throw new Error(responsePayload.error ?? "تعذر حفظ الطلب");
      const payload = responsePayload;
      setData((current) => ({ ...current, orders: [payload.order, ...current.orders], products: current.products.map((product) => ({ ...product, stock: Math.max(0, product.stock - (items.find((item) => item.productId === product.id)?.quantity ?? 0)) })) }));
    } catch (error) {
      setToast(error instanceof Error ? error.message : "تعذر حفظ الطلب. لم تُسجل العملية، أعد المحاولة.");
      return;
    }
    setCart({}); setOrderOpen(false); setCheckoutOpen(false); setToast("تم تسجيل الطلب بنجاح");
  };

  const setPriceListStatus = async (priceListStatus: "draft" | "active") => {
    try {
      const response = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_price_list_status", priceListStatus }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر تحديث القائمة");
      setData((current) => ({ ...current, priceList: { ...current.priceList, statusCode: priceListStatus, status: priceListStatus === "active" ? "نشطة ومعتمدة" : "مسودة تنتظر اعتماد الإدارة" } }));
      setToast(priceListStatus === "active" ? "تم اعتماد قائمة الأسعار للبيع" : "أعيدت قائمة الأسعار إلى المسودة");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "تعذر تحديث قائمة الأسعار");
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const response = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_order_status", orderId, status }) });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      setData((current) => ({ ...current, orders: current.orders.map((order) => order.id === orderId ? payload.order : order) }));
      setToast("تم تحديث حالة الطلب");
    } catch {
      setToast("تعذر تحديث الطلب. لم تُحفظ أي تغييرات.");
    }
  };

  const showDeferred = (title: string, description: string, requirements: string[]) => setGate({ title, description, requirements, badge: "مؤجل بعد التدشين" });

  return (
    <main className="app-shell" dir="rtl">
      <header className="topbar">
        <button className="brand-lockup" type="button" onClick={() => { setRole("admin"); setSection("overview"); }}>
          <div className="brand-mark">ن</div>
          <div><strong>نبري</strong><span>شركة نبري للتعبئة والتغليف</span></div>
        </button>
        <div className="role-switch" aria-label="اختيار الواجهة">
          {roleOptions.map((item) => <button key={item.key} type="button" disabled={sessionRole !== "admin" && item.key !== sessionRole} className={role === item.key ? "active" : ""} onClick={() => changeRole(item.key)}><strong>{item.label}</strong><small>{sessionRole === "admin" ? item.hint : item.key === sessionRole ? "صلاحيتك الفعلية" : "غير مصرح"}</small></button>)}
        </div>
        <div className="top-actions">{sessionRole === "admin" && <button className="admin-tools-button" type="button" onClick={() => setAdminToolsOpen(true)}>إدارة البيانات</button>}{sessionRole === "admin" && <button className="price-approval-button" type="button" onClick={() => setPriceListStatus(data.priceList.statusCode === "active" ? "draft" : "active")}>{data.priceList.statusCode === "active" ? "إيقاف الأسعار" : "اعتماد الأسعار"}</button>}<button className="icon-button" aria-label="التنبيهات" onClick={() => setGate({ title: "تنبيهات التشغيل", description: "ثلاث إشارات تحتاج مراجعة في Delivery V1.", requirements: [`${data.products.filter((product) => product.stock <= product.reorderLevel).length} منتجات تحت حد الأمان`, `${data.customers.filter((customer) => customer.balance > 0).length} عملاء لديهم رصيد`, `${forecastRows.filter((row) => row.days <= 4).length} فرص إعادة طلب قريبة`], badge: "نشط الآن" })}>●<span>3</span></button><div className="status-pill"><i /> {dataMode}</div></div>
      </header>

      <section className="dashboard">
        <aside className="sidebar">
          <div><p className="eyebrow">واجهة {roleOptions.find((item) => item.key === role)?.label}</p><nav>{navByRole[role].map((item) => <button key={item.key} className={"nav-item " + (section === item.key ? "selected" : "")} onClick={() => setSection(item.key)}><span>{item.label}</span><b>{item.icon}</b></button>)}</nav></div>
          <div className="sidebar-bottom">
            <div className="import-note"><span>ملف البيانات الحالي</span><strong>{data.customers.length} عملاء نشطين</strong><small>{data.orders.length} طلبات ظاهرة · {data.meta?.dataProfile === "production" ? "بيانات تشغيل معتمدة" : "بيانات تجريبية"}</small></div>
            <div className="profile-chip"><div>{data.session?.displayName?.slice(0,1) ?? "ن"}</div><span><strong>{data.session?.displayName ?? "مستخدم نبري"}</strong><small>{roleOptions.find((item) => item.key === sessionRole)?.label} · دخول ChatGPT آمن</small></span><a aria-label="تسجيل الخروج" href="/signout-with-chatgpt?return_to=%2F">خروج</a></div>
          </div>
        </aside>

        <div className="content">
          <nav className="mobile-nav" aria-label="أقسام الواجهة">{navByRole[role].map((item)=><button key={item.key} type="button" className={section===item.key?"selected":""} onClick={()=>setSection(item.key)}><b>{item.icon}</b><span>{item.label}</span></button>)}</nav>
          {role === "admin" && <AdminView section={section} data={data} forecastRows={forecastRows} outstanding={outstanding} orderSales={orderSales} search={search} setSearch={setSearch} setSection={setSection} openOrder={() => setOrderOpen(true)} openCollection={() => setCollectionOpen(true)} updateOrderStatus={updateOrderStatus} showDeferred={showDeferred} />}
          {role === "employee" && <EmployeeView section={section} mode={employeeMode} setMode={setEmployeeMode} data={data} forecastRows={forecastRows} completedStops={completedStops} toggleStop={(name) => setCompletedStops((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])} openOrder={() => setOrderOpen(true)} openCollection={() => setCollectionOpen(true)} updateOrderStatus={updateOrderStatus} showDeferred={showDeferred} />}
          {role === "customer" && <CustomerView section={section} data={data} cart={cart} setCart={setCart} cartTotal={cartTotal} quickOrderSku={quickOrderSku} submit={() => setCheckoutOpen(true)} showDeferred={showDeferred} />}
        </div>
      </section>

      {orderOpen && <OrderModal data={data} close={() => setOrderOpen(false)} submit={submitOrder} />}
      {collectionOpen && <CollectionModal data={data} close={() => setCollectionOpen(false)} done={(collection) => { setData((current) => ({ ...current, collections: [collection, ...current.collections], customers: current.customers.map((customer) => customer.name === collection.customerName ? { ...customer, balance: Math.max(0, customer.balance - collection.amount) } : customer) })); setCollectionOpen(false); setToast("تم تسجيل التحصيل"); }} />}
      {checkoutOpen && <CheckoutModal data={data} close={() => setCheckoutOpen(false)} submit={(customerName, details) => submitOrder(customerName, "بوابة العميل", Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([productId, quantity]) => ({ productId: Number(productId), quantity })), details)} />}
      {adminToolsOpen && <AdminToolsModal data={data} close={() => setAdminToolsOpen(false)} saved={() => { setAdminToolsOpen(false); setToast("تم الحفظ في سجل التشغيل"); window.location.reload(); }} />}
      {gate && <GateModal info={gate} close={() => setGate(null)} />}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}

function AdminView({ section, data, forecastRows, outstanding, orderSales, search, setSearch, setSection, openOrder, openCollection, updateOrderStatus, showDeferred }: { section: Section; data: AppData; forecastRows: (Customer & { next: Date; days: number; confidence: number })[]; outstanding: number; orderSales: number; search: string; setSearch: (value: string) => void; setSection: (section: Section) => void; openOrder: () => void; openCollection: () => void; updateOrderStatus: (orderId:number,status:string)=>void; showDeferred: (title:string,description:string,requirements:string[])=>void }) {
  const todayLabel = new Intl.DateTimeFormat("ar-EG", { dateStyle: "full" }).format(new Date());
  if (section === "customers") return <CustomersView rows={forecastRows} search={search} setSearch={setSearch} openOrder={openOrder} />;
  if (section === "orders") return <OrdersView orders={data.orders} openOrder={openOrder} updateOrderStatus={updateOrderStatus} canUpdate />;
  if (section === "routes") return <RoutesView showDeferred={showDeferred} />;
  if (section === "collections") return <CollectionsView data={data} outstanding={outstanding} openCollection={openCollection} />;
  if (section === "inventory") return <InventoryView products={data.products} priceList={data.priceList} />;
  if (section === "marketing") return <MarketingView showDeferred={showDeferred} />;
  if (section === "structure") return <StructureView />;

  return <>
    <SectionTitle eyebrow={`غرفة الإدارة · ${todayLabel}`} title="مركز قيادة نبري" description="صورة واحدة للمبيعات والعملاء والتحصيل والمخزون، مع تحويل البيانات القديمة إلى قرارات قابلة للتنفيذ." action={<button className="primary-action" onClick={openOrder}>+ طلب جديد</button>} />
    <PriceListBar meta={data.priceList} onOpen={() => setSection("inventory")} />
    <div className="notice-strip"><div><b>بيانات مرجعية تاريخية</b><span>شركة دان اسبايسز · 3 نوفمبر إلى 8 ديسمبر 2024 · لا تمثل مبيعات نبري الحالية</span></div><button onClick={() => setSection("customers")}>مراجعة الاستيراد ←</button></div>
    <div className="kpi-grid">
      <article className="kpi-card accent"><span>مبيعات الطلبات الحالية</span><strong>{money(orderSales)}</strong><small>نسخة التشغيل التجريبية</small></article>
      <article className="kpi-card"><span>رصيد مطلوب تحصيله</span><strong>{money(outstanding)}</strong><small>{data.customers.filter((customer) => customer.balance > 0).length} عملاء لديهم رصيد</small></article>
      <article className="kpi-card"><span>فرص إعادة الطلب</span><strong>{forecastRows.filter((row) => row.days <= 4).length}</strong><small>خلال الأيام الأربعة القادمة</small></article>
      <article className="kpi-card warning"><span>منتجات تحت حد الأمان</span><strong>{data.products.filter((product) => product.stock <= product.reorderLevel).length}</strong><small>تحتاج قرار توريد أو تعبئة</small></article>
    </div>
    <div className="main-grid">
      <article className="panel sales-panel"><div className="panel-heading"><div><span>المبيعات التاريخية المستخرجة</span><h2>134,935 ج.م خلال 36 يومًا</h2></div><Badge tone="good">نقدي 83%</Badge></div><div className="bar-chart">{[36,52,42,68,63,79,57,86,74,92,65,82].map((height, index) => <i key={index} style={{ height: height + "%" }}><span>{["3ن","6ن","9ن","12ن","15ن","18ن","21ن","24ن","27ن","30ن","3د","8د"][index]}</span></i>)}</div><div className="chart-footer"><span><b className="dot green" />توريد نقدي: 112,025 ج.م</span><span><b className="dot gold" />مديونيات: 22,910 ج.م</span></div></article>
      <article className="panel prediction-panel"><div className="panel-heading"><div><span>محرك إعادة الطلب</span><h2>الفرص الأقرب</h2></div><div className="ai-badge">ذكاء نبري</div></div>{forecastRows.slice(0, 3).map((row) => <button className="prediction-item" key={row.id} onClick={() => setSection("customers")}><div className="customer-avatar">{row.name.slice(0,1)}</div><div><strong>{row.name}</strong><small>{row.days < 0 ? "متأخر عن الموعد " + Math.abs(row.days) + " يوم" : "متوقع خلال " + row.days + " أيام"} · {money(row.expectedValue)}</small></div><b>{row.confidence}%</b></button>)}</article>
    </div>
    <div className="lower-grid">
      <article className="panel route-panel"><div className="panel-heading"><div><span>خطة التغطية</span><h2>مسار الغد المقترح</h2></div><button className="text-button" onClick={() => setSection("routes")}>كل المسارات</button></div><div className="route-line"><div className="route-stop done"><b>1</b><span>مدينة نصر<small>8 عملاء · طلبات متوقعة 7,450 ج.م</small></span></div><div className="route-stop current"><b>2</b><span>المهندسين<small>4 عملاء · 2 تحصيل + 2 إعادة طلب</small></span></div><div className="route-stop"><b>3</b><span>فيصل<small>6 عملاء · متابعة مخزون الرف</small></span></div></div></article>
      <article className="panel decision-panel"><div className="panel-heading"><div><span>إدارة الإدارة</span><h2>قرارات هذا الأسبوع</h2></div><Badge tone="dark">شخصان الآن</Badge></div><ul className="decision-list"><li><b>غسان</b><span>اعتماد كمية التعبئة وحد إعادة الطلب</span><small>قبل الأربعاء</small></li><li><b>أنت</b><span>تشغيل كتالوج واتساب وتجربة الطلب الرقمي</span><small>قيد التنفيذ</small></li><li><b>مشترك</b><span>اختيار أول 20 عميلًا لإطلاق نبري</span><small>قرار إداري</small></li></ul><button className="secondary-action" onClick={() => setSection("structure")}>فتح هيكل التشغيل</button></article>
    </div>
  </>;
}

function CustomersView({ rows, search, setSearch, openOrder }: { rows: (Customer & { next: Date; days: number; confidence: number })[]; search: string; setSearch: (value: string) => void; openOrder: () => void }) {
  const filtered = rows.filter((row) => [row.name, row.code, row.route, row.salesRep].some((value) => value.includes(search)));
  return <><SectionTitle eyebrow="CRM وتوقع الاستهلاك" title="العملاء الذين يحتاجون اتصالًا الآن" description="التوقع = تاريخ آخر طلب + متوسط دورة إعادة الشراء. يرتفع مستوى الثقة كلما زاد انتظام تاريخ العميل." action={<button className="primary-action" onClick={openOrder}>+ طلب لعميل</button>} /><div className="toolbar"><label className="search-box">⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الكود أو المنطقة..." /></label><div className="filter-pills"><Badge tone="warn">متأخر {rows.filter((row) => row.days < 0).length}</Badge><Badge tone="good">هذا الأسبوع {rows.filter((row) => row.days >= 0 && row.days <= 7).length}</Badge></div></div><div className="table-card"><table><thead><tr><th>العميل</th><th>خط السير</th><th>السجل التاريخي</th><th>موعد الطلب المتوقع</th><th>القيمة المتوقعة</th><th>الرصيد</th><th>الثقة</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><div className="customer-cell"><div>{row.name.slice(0,1)}</div><span><strong>{row.name}</strong><small>{row.code}</small></span></div></td><td><strong>{row.route}</strong><small className="block">{row.salesRep}</small></td><td>كل {row.avgReorderDays} يومًا</td><td><Badge tone={row.days < 0 ? "warn" : "good"}>{row.days < 0 ? "متأخر " + Math.abs(row.days) + " يوم" : shortDate(row.next.toISOString())}</Badge></td><td>{money(row.expectedValue)}</td><td className={row.balance > 0 ? "negative" : ""}>{money(row.balance)}</td><td><div className="confidence"><i style={{ width: row.confidence + "%" }} />{row.confidence}%</div></td></tr>)}</tbody></table></div><div className="quality-grid"><article className="quality-card"><b>119</b><span>كود عميل فريد</span><small>من 126 حركة بيع قابلة للاستخراج</small></article><article className="quality-card warn"><b>3</b><span>أكواد مرتبطة بأسماء مختلفة</span><small>تحتاج اعتماد الاسم الرئيسي</small></article><article className="quality-card warn"><b>6+</b><span>تهجئات مكررة للمناطق</span><small>مثل حدائق الأهرام والشروق</small></article><article className="quality-card danger"><b>!</b><span>مراجع دائرية في Excel</span><small>D701 وC701 وC815 وD815 وD817</small></article></div></>;
}

function OrdersView({ orders, openOrder, updateOrderStatus, canUpdate = false }: { orders: Order[]; openOrder: () => void; updateOrderStatus?: (orderId:number,status:string)=>void; canUpdate?: boolean }) {
  const statuses = ["جديد", "قيد التجهيز", "جاهز للتسليم", "تم التسليم"];
  return <><SectionTitle eyebrow="المبيعات والوفاء" title="الطلبات من كل القنوات" description="الطلب من المندوب أو بوابة العميل يصل إلى قائمة واحدة، ويُسعّر من قائمة نبري الموحّدة ثم يمر بالتجهيز والتسليم." action={<button className="primary-action" onClick={openOrder}>+ إنشاء طلب</button>} /><div className="stage-grid">{statuses.map((label,index) => <article className={"stage-card " + ["lime","gold","blue","green"][index]} key={label}><span>{label}</span><strong>{orders.filter((order)=>order.status===label).length}</strong><small>طلب</small></article>)}</div><div className="table-card"><table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>القناة</th><th>التاريخ</th><th>القيمة</th><th>الحالة</th></tr></thead><tbody>{orders.map((order) => { const currentIndex=statuses.indexOf(order.status); return <tr key={order.id}><td>{order.orderNumber ?? `#${order.id}`}</td><td><strong>{order.customerName}</strong></td><td>{order.source}</td><td>{shortDate(order.createdAt)}</td><td>{money(order.total)}</td><td>{canUpdate ? <select className="status-select" aria-label={`حالة الطلب ${order.id}`} value={order.status} onChange={(event)=>updateOrderStatus?.(order.id,event.target.value)}>{statuses.map((status,index)=><option key={status} disabled={index < currentIndex || index > currentIndex + 1}>{status}</option>)}</select> : <Badge tone={order.status === "تم التسليم" ? "good" : order.status === "جديد" ? "warn" : "neutral"}>{order.status}</Badge>}</td></tr>})}</tbody></table></div></>;
}

function RoutesView({ showDeferred }: { showDeferred: (title:string,description:string,requirements:string[])=>void }) {
  const routeGate = (name?: string) => showDeferred(name ? `المسار الذكي: ${name}` : "إنشاء يوم توزيع", "في المرحلة الأولى تظهر الأولويات التاريخية ويستطيع المندوب إكمال الزيارات. التخطيط الآلي التفصيلي مؤجل حتى تصبح بيانات الموقع موثوقة.", ["عنوان كامل لكل عميل", "إحداثيات GPS", "وقت الزيارة المفضل", "المندوب والسيارة المتاحان"]);
  return <><SectionTitle eyebrow="تغطية القاهرة" title="خطوط السير المبنية على كثافة العملاء" description="ترتيب أولي من السجل التاريخي. يستطيع المندوب تنفيذ القائمة الآن، أما المسار الجغرافي الآلي فينتظر بيانات العناوين." action={<button className="primary-action" onClick={()=>routeGate()}>+ يوم توزيع</button>} /><div className="route-layout"><article className="map-card"><div className="map-grid" /><div className="map-route r1" /><div className="map-route r2" />{[["مدينة نصر","24%","58%"],["فيصل","64%","73%"],["المهندسين","54%","34%"],["بدر","12%","26%"],["عابدين","41%","52%"]].map(([name,left,top],index) => <button key={name} className={"map-pin p" + index} style={{ left, top }} onClick={()=>routeGate(name)}><i>{index+1}</i><span>{name}</span></button>)}<div className="map-legend">خريطة تشغيل تقريبية · اضغط على المنطقة لمعرفة متطلبات التفعيل</div></article><article className="panel route-rank"><div className="panel-heading"><div><span>كثافة الحركات التاريخية</span><h2>أولوية التغطية</h2></div></div>{routeSignals.map((route,index) => <div className="rank-row" key={route.name}><b>{index+1}</b><div><strong>{route.name}</strong><small>{route.day} · {route.owner}</small><i><em style={{ width: route.share + "%" }} /></i></div><span>{route.movements}</span></div>)}</article></div><div className="workflow"><div><b>1</b><span><strong>قبل الخروج</strong><small>توقع الطلب + الرصيد + المخزون المطلوب</small></span></div><i>←</i><div><b>2</b><span><strong>أثناء الزيارة</strong><small>طلب، تحصيل، إتمام الزيارة</small></span></div><i>←</i><div><b>3</b><span><strong>بعد الجولة</strong><small>تسوية النقدية وتحديث التوقع</small></span></div></div></>;
}

function CollectionsView({ data, outstanding, openCollection }: { data: AppData; outstanding: number; openCollection: () => void }) {
  return <><SectionTitle eyebrow="الذمم والتحصيل" title="كل جنيه له حالة واضحة" description="فصل الفاتورة عن التحصيل يمنع المراجع الدائرية الموجودة في ملف Excel ويصنع سجلًا قابلًا للمراجعة." action={<button className="primary-action" onClick={openCollection}>+ تسجيل تحصيل</button>} /><div className="kpi-grid compact"><article className="kpi-card accent"><span>إجمالي الرصيد الحالي</span><strong>{money(outstanding)}</strong><small>من العملاء التجريبيين</small></article><article className="kpi-card"><span>تحصيلات مسجلة</span><strong>{money(data.collections.reduce((sum,item)=>sum+item.amount,0))}</strong><small>{data.collections.length} حركات</small></article><article className="kpi-card"><span>أعلى رصيد</span><strong>{money(Math.max(...data.customers.map((c)=>c.balance)))}</strong><small>{data.customers.sort((a,b)=>b.balance-a.balance)[0]?.name}</small></article><article className="kpi-card warning"><span>حسابات للمراجعة</span><strong>{data.customers.filter((c)=>c.balance>1000).length}</strong><small>رصيد أكبر من 1,000 ج.م</small></article></div><div className="two-column"><div className="table-card"><table><thead><tr><th>العميل</th><th>الرصيد</th><th>خط السير</th><th>الأولوية</th></tr></thead><tbody>{[...data.customers].sort((a,b)=>b.balance-a.balance).map((customer)=><tr key={customer.id}><td><strong>{customer.name}</strong><small className="block">{customer.code}</small></td><td className={customer.balance ? "negative":""}>{money(customer.balance)}</td><td>{customer.route}</td><td><Badge tone={customer.balance>1000?"warn":"neutral"}>{customer.balance>1000?"اتصال اليوم":"متابعة"}</Badge></td></tr>)}</tbody></table></div><article className="panel"><div className="panel-heading"><div><span>آخر الحركات</span><h2>سجل التحصيل</h2></div></div>{data.collections.map((item)=><div className="collection-row" key={item.id}><div>↙</div><span><strong>{item.customerName}</strong><small>{item.method} · {shortDate(item.createdAt)}</small></span><b>{money(item.amount)}</b></div>)}</article></div></>;
}

function InventoryView({ products, priceList }: { products: Product[]; priceList: PriceListMeta }) {
  return <><SectionTitle eyebrow="Product Master" title="قائمة الأسعار والمخزون" description="كل منتج له SKU وعبوة وسعر ورصيد. السعر الظاهر هنا هو نفسه الذي يراه المندوب والعميل ويستخدمه الخادم عند حفظ الطلب." action={<button className="primary-action" onClick={()=>document.querySelector<HTMLButtonElement>(".admin-tools-button")?.click()}>+ منتج أو تسوية</button>} /><PriceListBar meta={priceList} /><div className="product-grid">{products.map((product)=><article className="inventory-card" key={product.id}><div className={"product-glyph g"+product.id}>{product.name.slice(0,1)}</div><div className="inventory-head"><span>{product.category}</span><Badge tone={product.stock<=product.reorderLevel?"warn":"good"}>{product.stock<=product.reorderLevel?"تحت الأمان":"متوفر"}</Badge></div><h2>{product.name}</h2><p>{product.packSize} · {product.sku}</p><div className="stock-meter"><i style={{width:Math.min(100,(product.stock/(Math.max(1,product.reorderLevel)*3))*100)+"%"}} /></div><div className="inventory-foot"><span><small>المخزون</small><b>{product.stock} {product.unit??"وحدة"}</b></span><span><small>السعر</small><b>{money(product.price)}</b></span></div><a className="card-link" href={`/?role=customer&sku=${encodeURIComponent(product.sku)}`}>معاينة رابط العميل ←</a></article>)}</div><div className="source-note">القائمة تبدأ «مسودة» وتتحول إلى «نشطة» فقط بقرار الإدارة؛ الطلب الخارجي يتوقف تلقائيًا أثناء المسودة.</div></>;
}

function MarketingView({ showDeferred }: { showDeferred: (title:string,description:string,requirements:string[])=>void }) {
  const requirements = ["اعتماد الهوية والرسائل", "ربط WhatsApp Business الرسمي", "موافقة على الجمهور والميزانية", "سياسة موافقات قبل الإرسال"];
  return <><SectionTitle eyebrow="بعد تثبيت المبيعات" title="التسويق والأتمتة مؤجلان بقرار المرحلة الأولى" description="يحافظ النظام الآن على الطلب والسعر والتحصيل. لن يرسل رسائل أو يطلق حملات قبل اكتمال عناصر التحكم." action={<button className="primary-action" onClick={()=>showDeferred("إطلاق حملة", "الحملات ليست ضمن تدشين المرحلة الأولى.", requirements)}>متطلبات التفعيل</button>} /><div className="deferred-grid"><article className="deferred-card"><Badge tone="warn">مؤجل</Badge><h2>حملات التسويق</h2><p>ستفتح بعد اعتماد الجمهور والعروض والميزانية.</p><button onClick={()=>showDeferred("حملات التسويق", "لا توجد حملة منشورة أو رسالة مرسلة في هذه النسخة.", requirements)}>ما المطلوب؟</button></article><article className="deferred-card"><Badge tone="warn">مؤجل</Badge><h2>رسائل إعادة الطلب</h2><p>التوقع موجود، أما الإرسال التلقائي فيحتاج مراجعة بشرية وربطًا رسميًا.</p><button onClick={()=>showDeferred("رسائل إعادة الطلب", "لن يرسل النظام أي رسالة خارجية تلقائيًا في الموقع المؤقت.", requirements)}>ما المطلوب؟</button></article></div></>;
}

function StructureView() {
  const departments = [["المبيعات والتوزيع","غسان حاليًا","العملاء، التسعير، الجولات، التحصيل"],["العمليات والمخزون","غسان حاليًا","الموردون، التعبئة، الجودة، الجرد"],["التجارة والتسويق","أنت حاليًا","المتجر، المحتوى، واتساب، الحملات"],["المالية والبيانات","مشترك","التكلفة، التدفق النقدي، التقارير، الأتمتة"]];
  return <><SectionTitle eyebrow="إدارة الإدارة وإدارة الإدارات" title="شركة من شخصين تعمل كأنها منظومة" description="لا نخلق مناصب وهمية؛ نفصل المسؤوليات والقرارات الآن، ثم نحول كل صندوق إلى وظيفة عند التوظيف." /><div className="org-root"><div className="org-company"><div className="brand-mark">ن</div><span><strong>شركة نبري</strong><small>الملكية والقرار الاستراتيجي</small></span></div><div className="org-founders"><article><div className="person-avatar">غ</div><span><Badge tone="dark">المالك والمدير العام</Badge><h2>غسان جيلاني</h2><p>الموردون · المنتجات · العلاقات التجارية · اعتماد الإنفاق والتحصيل</p></span></article><article><div className="person-avatar alt">أ</div><span><Badge tone="good">النمو والتحول الرقمي</Badge><h2>أنت</h2><p>النظام · البيانات · التجارة الإلكترونية · التسويق · الأتمتة والمتابعة</p></span></article></div></div><div className="department-grid">{departments.map((item,index)=><article key={item[0]}><b>0{index+1}</b><h3>{item[0]}</h3><Badge tone={item[1]==="مشترك"?"warn":"neutral"}>{item[1]}</Badge><p>{item[2]}</p></article>)}</div><div className="governance-grid"><article className="panel"><div className="panel-heading"><div><span>مصفوفة القرار</span><h2>من يقرر ماذا؟</h2></div></div><div className="approval-row"><span>تسعير جديد</span><b>غسان يعتمد · أنت توثق</b></div><div className="approval-row"><span>شراء مخزون</span><b>غسان يعتمد</b></div><div className="approval-row"><span>حملة تسويق</span><b>أنت تنفذ · سقف مالي معتمد</b></div><div className="approval-row"><span>خصم استثنائي</span><b>موافقة مشتركة</b></div><div className="approval-row"><span>توظيف أو عقد</span><b>موافقة مشتركة</b></div></article><article className="panel hiring-card"><div className="panel-heading"><div><span>ترتيب التوظيف</span><h2>متى نضيف شخصًا؟</h2></div></div><ol><li><b>مندوب مبيعات وتحصيل</b><span>عند ثبات 25+ زيارة أسبوعية</span></li><li><b>مسؤول تشغيل ومخزون</b><span>عند تجاوز 20 SKU أو دورتين تعبئة شهريًا</span></li><li><b>محاسب جزئي</b><span>عند زيادة الفواتير الآجلة والتسويات</span></li><li><b>تسويق وخدمة عملاء</b><span>عند ثبات 15+ طلبًا مباشرًا أسبوعيًا</span></li></ol></article></div></>;
}

function EmployeeView({ section, mode, setMode, data, forecastRows, completedStops, toggleStop, openOrder, openCollection, updateOrderStatus, showDeferred }: { section: Section; mode: EmployeeMode; setMode: (mode: EmployeeMode) => void; data: AppData; forecastRows: (Customer & { days: number })[]; completedStops: string[]; toggleStop: (name: string) => void; openOrder: () => void; openCollection: () => void; updateOrderStatus: (orderId:number,status:string)=>void; showDeferred: (title:string,description:string,requirements:string[])=>void }) {
  const modeLabels: { key: EmployeeMode; label: string }[] = [{key:"sales",label:"المندوب"},{key:"accounting",label:"المحاسب"},{key:"marketing",label:"التسويق"}];
  if (section === "orders") return <OrdersView orders={data.orders} openOrder={openOrder} updateOrderStatus={updateOrderStatus} canUpdate />;
  if (section === "routes") return <FieldRoute data={data} completedStops={completedStops} toggleStop={toggleStop} openOrder={openOrder} openCollection={openCollection} showDeferred={showDeferred} />;
  if (section === "customers") return <CustomersView rows={forecastRows as (Customer & {next:Date;days:number;confidence:number})[]} search="" setSearch={()=>{}} openOrder={openOrder} />;
  if (section === "collections") return <CollectionsView data={data} outstanding={data.customers.reduce((s,c)=>s+c.balance,0)} openCollection={openCollection} />;
  if (section === "marketing") return <MarketingView showDeferred={showDeferred} />;
  return <><SectionTitle eyebrow="مساحة التنفيذ اليومي" title="ما المطلوب منك الآن؟" description="اختر طبيعة العمل؛ نفس البيانات تظهر بصورة تناسب المهمة." action={<div className="mode-switch">{modeLabels.map((item)=><button key={item.key} className={mode===item.key?"active":""} onClick={()=>setMode(item.key)}>{item.label}</button>)}</div>} />{mode==="sales" && <FieldRoute data={data} completedStops={completedStops} toggleStop={toggleStop} openOrder={openOrder} openCollection={openCollection} showDeferred={showDeferred} compact />}{mode==="accounting" && <CollectionsView data={data} outstanding={data.customers.reduce((s,c)=>s+c.balance,0)} openCollection={openCollection} />}{mode==="marketing" && <MarketingView showDeferred={showDeferred} />}</>;
}

function FieldRoute({ data, completedStops, toggleStop, openOrder, openCollection, showDeferred, compact=false }: { data: AppData; completedStops: string[]; toggleStop: (name: string) => void; openOrder: () => void; openCollection: () => void; showDeferred: (title:string,description:string,requirements:string[])=>void; compact?: boolean }) {
  const stops = data.customers.slice(0, compact ? 5 : 7);
  return <div className="field-layout"><article className="panel field-summary"><div className="field-head"><div><span>مسار اليوم</span><h2>مدينة نصر ← المهندسين</h2><p>9 زيارات · 3 تحصيلات · 5 طلبات متوقعة</p></div><div className="progress-ring"><b>{completedStops.length}/{stops.length}</b><span>اكتمل</span></div></div><div className="field-actions"><button onClick={openOrder}>+ طلب</button><button onClick={openCollection}>+ تحصيل</button><button onClick={()=>showDeferred("ملاحظات العميل", "تسجيل الطلب والتحصيل متاحان الآن. الملاحظات ستفتح بعد تحديد أنواعها ومسؤولية مراجعتها.", ["أنواع ملاحظات معتمدة", "سياسة خصوصية", "مسؤول متابعة", "صلاحيات العرض والتعديل"])}>ملاحظة عميل</button></div></article><article className="visit-list">{stops.map((customer,index)=>{const done=completedStops.includes(customer.name);return <div className={"visit-card "+(done?"complete":"")} key={customer.id}><button className="check-stop" onClick={()=>toggleStop(customer.name)} aria-label={`إتمام زيارة ${customer.name}`}>{done?"✓":index+1}</button><div><strong>{customer.name}</strong><small>{customer.route} · كود {customer.code}</small><span>{customer.balance>0?"تحصيل "+money(customer.balance):"طلب متوقع "+money(customer.expectedValue)}</span></div><div className="visit-actions"><button onClick={openOrder}>طلب</button><button onClick={openCollection}>تحصيل</button></div></div>})}</article></div>;
}

function CustomerView({ section, data, cart, setCart, cartTotal, quickOrderSku, submit, showDeferred }: { section: Section; data: AppData; cart: Record<number,number>; setCart: (cart: Record<number,number>) => void; cartTotal: number; quickOrderSku: string; submit: () => void; showDeferred: (title:string,description:string,requirements:string[])=>void }) {
  if (section === "orders") return <><SectionTitle eyebrow="حساب العميل الخاص" title="طلباتي" description="تعرض هذه الصفحة الطلبات المرتبطة بحساب العميل الحالي فقط، من التسجيل حتى التسليم." /><div className="customer-orders">{data.orders.slice(0,20).map((order)=><article key={order.id}><div><span>{order.orderNumber ?? `طلب #${order.id}`}</span><h2>{money(order.total)}</h2><small>{shortDate(order.createdAt)} · {order.source}</small></div><Badge tone={order.status==="تم التسليم"?"good":"warn"}>{order.status}</Badge></article>)}</div></>;
  if (section === "overview") return <><SectionTitle eyebrow="ملف العميل" title="مرحبًا بك في نبري" description="الحساب محمي بدخول ChatGPT، ولا يعرض إلا السجل المرتبط به." /><div className="account-placeholder"><div className="person-avatar alt">{data.session?.displayName?.slice(0,1)??"ع"}</div><h2>{data.customers[0]?.name??data.session?.displayName??"حساب عميل"}</h2><p>{data.customers[0] ? `كود ${data.customers[0].code} · الرصيد ${money(data.customers[0].balance)}` : "لم تربط الإدارة هذا الحساب بسجل عميل بعد؛ يمكن إرسال طلب جديد ببيانات التسليم."}</p><button className="secondary-action" onClick={()=>showDeferred("إدارة بيانات الحساب", "تغيير الربط والدور من صلاحيات الإدارة فقط ويسجل في سجل التدقيق.", ["البريد المعتمد", "ربط سجل العميل", "مراجعة عنوان التسليم", "اعتماد شروط الدفع"])}>بيانات الربط المطلوبة</button></div></>;
  return <><section className="shop-hero"><div><Badge tone="dark">منتجات سودانية أصيلة</Badge><h1>مذاق البيت،<br/>بتقديم نبري.</h1><p>اختر من قائمة الأسعار الموحّدة، راجع الكميات، ثم أرسل الطلب ليظهر فورًا لدى الإدارة والمندوب.</p>{quickOrderSku && <p className="catalog-entry-note">✓ تم فتح المنتج المحدد من كتالوج نبري وإضافته إلى السلة.</p>}</div><div className="shop-mark">ن<span>NAPRI</span></div></section><PriceListBar meta={data.priceList} /><div className="shop-layout"><div className="catalog-grid">{data.products.map((product)=><article id={`product-${product.sku}`} className={"catalog-card "+(product.sku===quickOrderSku?"catalog-card-selected":"")} key={product.id}><div className={"catalog-visual g"+product.id}><span>{product.name.slice(0,1)}</span><small>NAPRI</small></div><Badge tone={product.stock<=product.reorderLevel?"warn":"good"}>{product.stock>0?"متوفر":"غير متوفر"}</Badge><h2>{product.name}</h2><p>{product.packSize} · {product.category}</p><div><strong>{money(product.price)}</strong><div className="quantity-control"><button aria-label={`إنقاص ${product.name}`} onClick={()=>setCart({...cart,[product.id]:Math.max(0,(cart[product.id]??0)-1)})}>−</button><span>{cart[product.id]??0}</span><button aria-label={`زيادة ${product.name}`} disabled={product.stock<=0 || (cart[product.id]??0)>=product.stock} onClick={()=>setCart({...cart,[product.id]:Math.min(product.stock,(cart[product.id]??0)+1)})}>+</button></div></div></article>)}</div><aside className="cart-card"><span>سلة الطلب</span><h2>{Object.values(cart).reduce((s,n)=>s+n,0)} وحدات</h2>{data.products.filter((p)=>cart[p.id]).map((product)=><div className="cart-line" key={product.id}><span>{product.name} × {cart[product.id]}</span><b>{money(product.price*cart[product.id])}</b></div>)}<div className="cart-total"><span>الإجمالي من القائمة الحالية</span><strong>{money(cartTotal)}</strong></div><button disabled={!cartTotal} onClick={submit}>إرسال الطلب للتأكيد</button><small>يعيد النظام التحقق من السعر والمخزون قبل التسجيل.</small></aside></div></>;
}

function OrderModal({ data, close, submit }: { data: AppData; close: () => void; submit: (customerName:string,source:string,items:{productId:number;quantity:number}[])=>void }) {
  const [customer, setCustomer] = useState(data.customers[0]?.name ?? ""); const [items,setItems]=useState<Record<number,number>>({});
  const total=data.products.reduce((sum,p)=>sum+p.price*(items[p.id]??0),0);
  return <div className="modal-backdrop"><form className="modal" onSubmit={(e)=>{e.preventDefault();submit(customer,"إدخال داخلي",Object.entries(items).filter(([,q])=>q>0).map(([id,q])=>({productId:Number(id),quantity:q})));}}><div className="modal-head"><div><span>طلب مبيعات · {data.priceList.version}</span><h2>إنشاء طلب جديد</h2></div><button type="button" onClick={close} aria-label="إغلاق">×</button></div><label>العميل<select value={customer} onChange={(e)=>setCustomer(e.target.value)}>{data.customers.map((c)=><option key={c.id}>{c.name}</option>)}</select></label><div className="modal-products">{data.products.map((p)=><div key={p.id}><span><strong>{p.name}</strong><small>{p.packSize} · {money(p.price)} · متاح {p.stock}</small></span><div className="quantity-control"><button aria-label={`إنقاص ${p.name}`} type="button" onClick={()=>setItems({...items,[p.id]:Math.max(0,(items[p.id]??0)-1)})}>−</button><b>{items[p.id]??0}</b><button aria-label={`زيادة ${p.name}`} type="button" disabled={(items[p.id]??0)>=p.stock} onClick={()=>setItems({...items,[p.id]:Math.min(p.stock,(items[p.id]??0)+1)})}>+</button></div></div>)}</div><div className="modal-total"><span>قيمة الطلب من القائمة الموحّدة</span><strong>{money(total)}</strong></div><button className="primary-action" type="submit" disabled={!total}>حفظ الطلب</button></form></div>;
}

function CollectionModal({ data, close, done }: { data: AppData; close:()=>void; done:(collection:Collection)=>void }) {
  const [customerId,setCustomerId]=useState(data.customers.find((item)=>item.balance>0)?.id??data.customers[0]?.id??0); const [amount,setAmount]=useState(""); const [method,setMethod]=useState("نقدي"); const [error,setError]=useState("");
  const selected=data.customers.find((item)=>item.id===customerId);
  const submit=async(e:FormEvent)=>{e.preventDefault();const value=Number(amount);if(!value)return;setError("");try{const response=await fetch("/api/sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"record_collection",customerId,amount:value,method})});const payload=await response.json();if(!response.ok)throw new Error(payload.error??"تعذر حفظ التحصيل");done(payload.collection);}catch(error){setError(error instanceof Error?error.message:"تعذر حفظ التحصيل. لم تُسجل العملية.");}};
  return <div className="modal-backdrop"><form className="modal small" onSubmit={submit}><div className="modal-head"><div><span>الخزينة</span><h2>تسجيل تحصيل</h2></div><button type="button" onClick={close} aria-label="إغلاق">×</button></div><label>العميل<select value={customerId} onChange={(e)=>setCustomerId(Number(e.target.value))}>{data.customers.map((c)=><option key={c.id} value={c.id}>{c.name} · رصيد {money(c.balance)}</option>)}</select></label><label>المبلغ<input type="number" min="1" max={selected?.balance??undefined} value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="0" /></label><label>طريقة الدفع<select value={method} onChange={(e)=>setMethod(e.target.value)}><option>نقدي</option><option>تحويل بنكي</option><option>محفظة إلكترونية</option></select></label>{error&&<p className="form-error">{error}</p>}<button className="primary-action" type="submit" disabled={!Number(amount)||!customerId}>حفظ التحصيل</button></form></div>;
}

function CheckoutModal({ data, close, submit }: { data: AppData; close:()=>void; submit:(customerName:string,details:{contactPhone:string;deliveryAddress:string;notes:string})=>void }) {
  const mappedCustomer=data.customers[0];
  const [customerName,setCustomerName]=useState(mappedCustomer?.name??"");
  const [contactPhone,setContactPhone]=useState(mappedCustomer?.whatsappNumber??"");
  const [deliveryAddress,setDeliveryAddress]=useState(mappedCustomer?.address??"");
  const [notes,setNotes]=useState("");
  const approved=data.priceList.statusCode==="active";
  return <div className="modal-backdrop"><form className="modal small" onSubmit={(event)=>{event.preventDefault();if(approved)submit(customerName,{contactPhone,deliveryAddress,notes});}}><div className="modal-head"><div><span>تأكيد بيانات التسليم</span><h2>إرسال الطلب إلى نبري</h2></div><button type="button" onClick={close} aria-label="إغلاق">×</button></div><label>اسم العميل أو المنشأة<input required value={customerName} onChange={(event)=>setCustomerName(event.target.value)} /></label><label>رقم التواصل / واتساب<input required inputMode="tel" value={contactPhone} onChange={(event)=>setContactPhone(event.target.value)} /></label><label>عنوان التسليم<textarea required rows={3} value={deliveryAddress} onChange={(event)=>setDeliveryAddress(event.target.value)} /></label><label>ملاحظات اختيارية<textarea rows={2} value={notes} onChange={(event)=>setNotes(event.target.value)} /></label>{!approved&&<p className="form-error">الطلب الخارجي متوقف حتى تعتمد الإدارة قائمة الأسعار الحالية.</p>}<button className="primary-action" type="submit" disabled={!approved||!customerName.trim()||!contactPhone.trim()||!deliveryAddress.trim()}>تأكيد وإرسال الطلب</button></form></div>;
}

function AdminToolsModal({ data, close, saved }: { data: AppData; close:()=>void; saved:()=>void }) {
  const [mode,setMode]=useState<"product"|"customer"|"inventory"|"access"|"audit">("product");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [product,setProduct]=useState({sku:"",name:"",category:"",packSize:"",price:"",stock:"0",reorderLevel:"0",unit:"وحدة"});
  const [customer,setCustomer]=useState({code:"",name:"",route:"",salesRep:"",tier:"B",whatsappNumber:"",address:""});
  const [inventory,setInventory]=useState({productId:String(data.products[0]?.id??""),quantity:"",reason:""});
  const [access,setAccess]=useState({userEmail:"",role:"employee" as Role,mappedCustomerId:""});
  const send=async(payload:Record<string,unknown>)=>{setBusy(true);setError("");try{const response=await fetch("/api/sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result.error??"تعذر الحفظ");saved();}catch(reason){setError(reason instanceof Error?reason.message:"تعذر الحفظ");setBusy(false);}};
  const submit=(event:FormEvent)=>{event.preventDefault();if(mode==="product")void send({action:"upsert_product",product:{...product,price:Number(product.price),stock:Number(product.stock),reorderLevel:Number(product.reorderLevel)}});if(mode==="customer")void send({action:"upsert_customer",customer});if(mode==="inventory")void send({action:"adjust_inventory",productId:Number(inventory.productId),quantity:Number(inventory.quantity),reason:inventory.reason});if(mode==="access")void send({action:"assign_role",userEmail:access.userEmail,role:access.role,mappedCustomerId:access.mappedCustomerId?Number(access.mappedCustomerId):null});};
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}><div className="modal-head"><div><span>صلاحيات الإدارة · كل تغيير مسجل</span><h2>إدارة البيانات الرئيسية</h2></div><button type="button" onClick={close} aria-label="إغلاق">×</button></div><div className="admin-tool-tabs"><button type="button" className={mode==="product"?"active":""} onClick={()=>setMode("product")}>منتج</button><button type="button" className={mode==="customer"?"active":""} onClick={()=>setMode("customer")}>عميل</button><button type="button" className={mode==="inventory"?"active":""} onClick={()=>setMode("inventory")}>المخزون</button><button type="button" className={mode==="access"?"active":""} onClick={()=>setMode("access")}>الصلاحيات</button><button type="button" className={mode==="audit"?"active":""} onClick={()=>setMode("audit")}>السجل</button></div>{mode==="product"&&<div className="admin-form-grid"><label>SKU<input required value={product.sku} onChange={(e)=>setProduct({...product,sku:e.target.value})} /></label><label>اسم المنتج<input required value={product.name} onChange={(e)=>setProduct({...product,name:e.target.value})} /></label><label>الفئة<input required value={product.category} onChange={(e)=>setProduct({...product,category:e.target.value})} /></label><label>العبوة<input required value={product.packSize} onChange={(e)=>setProduct({...product,packSize:e.target.value})} /></label><label>السعر<input required type="number" min="0" step="0.01" value={product.price} onChange={(e)=>setProduct({...product,price:e.target.value})} /></label><label>رصيد افتتاحي<input type="number" min="0" value={product.stock} onChange={(e)=>setProduct({...product,stock:e.target.value})} /></label><label>حد إعادة الطلب<input type="number" min="0" value={product.reorderLevel} onChange={(e)=>setProduct({...product,reorderLevel:e.target.value})} /></label><label>الوحدة<input value={product.unit} onChange={(e)=>setProduct({...product,unit:e.target.value})} /></label></div>}{mode==="customer"&&<div className="admin-form-grid"><label>كود العميل<input required value={customer.code} onChange={(e)=>setCustomer({...customer,code:e.target.value})} /></label><label>اسم العميل<input required value={customer.name} onChange={(e)=>setCustomer({...customer,name:e.target.value})} /></label><label>المنطقة / المسار<input value={customer.route} onChange={(e)=>setCustomer({...customer,route:e.target.value})} /></label><label>المندوب<input value={customer.salesRep} onChange={(e)=>setCustomer({...customer,salesRep:e.target.value})} /></label><label>التصنيف<select value={customer.tier} onChange={(e)=>setCustomer({...customer,tier:e.target.value})}><option>A</option><option>B</option><option>C</option></select></label><label>واتساب<input inputMode="tel" value={customer.whatsappNumber} onChange={(e)=>setCustomer({...customer,whatsappNumber:e.target.value})} /></label><label className="wide">العنوان<textarea rows={2} value={customer.address} onChange={(e)=>setCustomer({...customer,address:e.target.value})} /></label></div>}{mode==="inventory"&&<div className="admin-form-grid"><label className="wide">المنتج<select value={inventory.productId} onChange={(e)=>setInventory({...inventory,productId:e.target.value})}>{data.products.map((item)=><option key={item.id} value={item.id}>{item.sku} · {item.name} · رصيد {item.stock}</option>)}</select></label><label>التعديل (+ إضافة / − صرف)<input required type="number" value={inventory.quantity} onChange={(e)=>setInventory({...inventory,quantity:e.target.value})} /></label><label>السبب<input required value={inventory.reason} onChange={(e)=>setInventory({...inventory,reason:e.target.value})} /></label></div>}{mode==="access"&&<div className="admin-form-grid"><label className="wide">بريد المستخدم<input required type="email" value={access.userEmail} onChange={(e)=>setAccess({...access,userEmail:e.target.value})} /></label><label>الدور<select value={access.role} onChange={(e)=>setAccess({...access,role:e.target.value as Role})}><option value="employee">موظف / مندوب</option><option value="customer">عميل</option><option value="admin">إدارة</option></select></label><label>ربط سجل العميل<select value={access.mappedCustomerId} onChange={(e)=>setAccess({...access,mappedCustomerId:e.target.value})}><option value="">بدون ربط</option>{data.customers.map((item)=><option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label></div>}{mode==="audit"&&<div className="audit-list">{data.audits?.length ? data.audits.map((item)=><div key={item.id}><span><strong>{item.action}</strong><small>{item.actorEmail} · {item.entityType} {item.entityId??""}</small></span><time>{shortDate(item.createdAt)}</time></div>) : <p>لا توجد حركات تدقيق بعد.</p>}</div>}{error&&<p className="form-error">{error}</p>}{mode!=="audit"&&<button className="primary-action" type="submit" disabled={busy}>{busy?"جارٍ الحفظ...":"حفظ التغيير"}</button>}</form></div>;
}

function GateModal({ info, close }: { info: GateInfo; close: () => void }) {
  return <div className="modal-backdrop"><section className="modal small gate-modal" role="dialog" aria-modal="true" aria-label={info.title}><div className="modal-head"><div>{info.badge&&<span>{info.badge}</span>}<h2>{info.title}</h2></div><button type="button" onClick={close} aria-label="إغلاق">×</button></div><p>{info.description}</p><h3>المتاح أو المطلوب</h3><ul>{info.requirements.map((item)=><li key={item}><span>✓</span>{item}</li>)}</ul><button className="primary-action" type="button" onClick={close}>فهمت</button></section></div>;
}
