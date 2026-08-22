import fs from "node:fs/promises";
import path from "node:path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";

const root = "C:/Users/DELL/Documents/Codex/2026-08-19/referenced-chatgpt-conversation-this-is-an";
const inputDir = path.join(root, "outputs", "حزمة-نبري-البيعية");
const qaRoot = path.join(root, "work", "napri-sales-kit", "pdf-qa");
await fs.mkdir(qaRoot, { recursive: true });

const pdfs = (await fs.readdir(inputDir)).filter((name) => name.endsWith(".pdf")).sort();
for (const name of pdfs) {
  const stem = name.slice(0, -4);
  const outDir = path.join(qaRoot, stem);
  await fs.mkdir(outDir, { recursive: true });
  const data = new Uint8Array(await fs.readFile(path.join(inputDir, name)));
  const task = pdfjsLib.getDocument({ data, useSystemFonts: false, disableFontFace: true });
  const pdf = await task.promise;
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const viewport = page.getViewport({ scale: 1.45 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const outPath = path.join(outDir, `page-${String(pageNo).padStart(2, "0")}.png`);
    await fs.writeFile(outPath, canvas.toBuffer("image/png"));
  }
  console.log(`${name}: ${pdf.numPages} pages`);
}
