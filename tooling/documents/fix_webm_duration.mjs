import fs from "node:fs/promises";
import path from "node:path";

const root = "C:/Users/DELL/Documents/Codex/2026-08-19/referenced-chatgpt-conversation-this-is-an";
const outDir = path.join(root, "outputs", "حزمة-نبري-البيعية");
const backupDir = path.join(root, "work", "napri-sales-kit", "video-raw");
await fs.mkdir(backupDir, { recursive: true });

function findBytes(buffer, pattern, start = 0) {
  outer: for (let i = start; i <= buffer.length - pattern.length; i += 1) {
    for (let j = 0; j < pattern.length; j += 1) if (buffer[i + j] !== pattern[j]) continue outer;
    return i;
  }
  return -1;
}

function readVint(buffer, offset) {
  const first = buffer[offset];
  let mask = 0x80;
  let length = 1;
  while (length <= 8 && (first & mask) === 0) {
    mask >>= 1;
    length += 1;
  }
  if (length > 8) throw new Error("Invalid EBML vint");
  let value = BigInt(first & (mask - 1));
  for (let i = 1; i < length; i += 1) value = (value << 8n) | BigInt(buffer[offset + i]);
  const unknownValue = (1n << BigInt(7 * length)) - 1n;
  return { length, value, unknown: value === unknownValue };
}

function writeVint(value, length) {
  const v = BigInt(value);
  const max = (1n << BigInt(7 * length)) - 1n;
  if (v >= max) throw new Error(`Value ${v} does not fit EBML vint length ${length}`);
  const out = Buffer.alloc(length);
  let temp = v;
  for (let i = length - 1; i >= 0; i -= 1) {
    out[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }
  out[0] |= 1 << (8 - length);
  return out;
}

function durationElement(durationMs) {
  const out = Buffer.alloc(11);
  out[0] = 0x44;
  out[1] = 0x89;
  out[2] = 0x88;
  out.writeDoubleBE(durationMs, 3);
  return out;
}

async function fix(name, durationMs) {
  const file = path.join(outDir, name);
  const original = Buffer.from(await fs.readFile(file));
  await fs.writeFile(path.join(backupDir, name), original);
  const infoId = Buffer.from([0x15, 0x49, 0xa9, 0x66]);
  const infoAt = findBytes(original, infoId);
  if (infoAt < 0) throw new Error(`Info element not found in ${name}`);
  const sizeAt = infoAt + infoId.length;
  const infoSize = readVint(original, sizeAt);
  if (infoSize.unknown) throw new Error(`Unknown Info size in ${name}`);
  const contentStart = sizeAt + infoSize.length;
  const contentEnd = contentStart + Number(infoSize.value);
  const existingDuration = findBytes(original, Buffer.from([0x44, 0x89]), contentStart);
  if (existingDuration >= 0 && existingDuration < contentEnd) {
    console.log(`${name}: duration already present`);
    return;
  }
  const dur = durationElement(durationMs);
  const newInfoSize = infoSize.value + BigInt(dur.length);
  const newSizeBytes = writeVint(newInfoSize, infoSize.length);
  const fixed = Buffer.concat([
    original.subarray(0, sizeAt),
    newSizeBytes,
    original.subarray(contentStart, contentEnd),
    dur,
    original.subarray(contentEnd),
  ]);
  await fs.writeFile(file, fixed);
  console.log(`${name}: added ${durationMs} ms duration`);
}

await fix("05-فيديو-تعريفي-لنظام-نبري.webm", 28000);
await fix("06-فيديو-طريقة-إرسال-طلب-العميل.webm", 20000);
