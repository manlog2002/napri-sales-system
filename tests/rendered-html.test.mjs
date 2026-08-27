import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Arabic NAPRI Delivery V1 shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ar" dir="rtl">/i);
  assert.match(html, /<title>نبري \| نظام المبيعات والتوزيع<\/title>/i);
  assert.match(html, /مركز قيادة نبري/);
  assert.match(html, /المندوب والموظف/);
  assert.match(html, /إدارة البيانات/);
  assert.match(html, /اعتماد الأسعار/);
  assert.match(html, /NAPRI-DV1-2026-08/);
  assert.match(html, /دخول ChatGPT آمن/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Your site is taking shape/);
});

test("enforces authenticated roles, customer isolation, stock safety, and audit logging", async () => {
  const [page, api, auth, hosting, migration] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/sales/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/chatgpt-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_tearful_thunderball.sql", import.meta.url), "utf8"),
  ]);

  assert.match(hosting, /"d1":\s*"DB"/);
  assert.match(auth, /oai-authenticated-user-id/);
  assert.match(api, /getChatGPTUser/);
  assert.match(api, /const roleActions: Record<Role, string\[]>/);
  assert.match(api, /if \(!can\(session, action\)\)/);
  assert.match(api, /created_by_user_id=\? OR customer_id=\?/);
  assert.match(api, /session\.role === "customer"/);
  assert.match(api, /priceStatus\?\.value !== "active"/);
  assert.match(api, /contactPhone/);
  assert.match(api, /deliveryAddress/);
  assert.match(api, /request_key/);
  assert.match(api, /audit_logs/);
  assert.match(api, /prevent_negative_stock/);
  assert.match(api, /update_order_status/);
  assert.match(api, /upsert_product/);
  assert.match(api, /upsert_customer/);
  assert.match(api, /adjust_inventory/);
  assert.match(api, /assign_role/);
  assert.match(migration, /CREATE TABLE `app_users`/);
  assert.match(migration, /CREATE TABLE `audit_logs`/);
  assert.match(migration, /CREATE TABLE `inventory_movements`/);
  assert.match(migration, /CREATE TRIGGER `prevent_negative_stock`/);
  assert.match(page, /crypto\.randomUUID\(\)/);
  assert.match(page, /تأكيد بيانات التسليم/);
  assert.match(page, /إدارة البيانات الرئيسية/);
  assert.doesNotMatch(page, /new Date\("2026-08-18T00:00:00"\)/);
});

test("keeps production assets and private-delivery documentation inputs present", async () => {
  const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
