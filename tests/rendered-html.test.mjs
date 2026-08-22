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

test("server-renders the Arabic NAPRI operating system", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ar" dir="rtl">/i);
  assert.match(html, /<title>نبري \| نظام المبيعات والتوزيع<\/title>/i);
  assert.match(html, /مركز قيادة نبري/);
  assert.match(html, /المندوب والموظف/);
  assert.match(html, /واجهة العميل|العميل/);
  assert.match(html, /119 كود عميل/);
  assert.match(html, /126 حركة بيع/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Your site is taking shape/);
});

test("uses durable D1 storage and excludes contact fields from the demo API", async () => {
  const [page, layout, api, hosting, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/sales/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(hosting, /"d1":\s*"DB"/);
  assert.match(api, /CREATE TABLE IF NOT EXISTS customers/);
  assert.match(api, /create_order/);
  assert.match(api, /record_collection/);
  assert.match(api, /update_order_status/);
  assert.match(api, /NAPRI-P1-2026-08/);
  assert.doesNotMatch(api, /phone|mobile|address|رقم التلفون|رقم الموبايل/i);
  assert.match(page, /type Role = "admin" \| "employee" \| "customer"/);
  assert.match(page, /توقع الاستهلاك/);
  assert.match(page, /هيكل الشركة/);
  assert.match(page, /قائمة الأسعار الموحّدة/);
  assert.match(page, /تعذر حفظ الطلب. لم تُسجل العملية/);
  assert.doesNotMatch(page, /id: Date\.now\(\), customerName, source, total/);
  assert.match(layout, /twitter:\s*\{ card: "summary_large_image"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
