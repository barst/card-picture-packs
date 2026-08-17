import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const seedCatalog = readJson(join(projectDir, "v2", "catalog.json"));
const locales = ["zh-TW", "zh-CN", "en", "ja"];
const entries = [];
const missing = [];

for (const seedEntry of [...seedCatalog.packs].sort((left, right) => left.order - right.order)) {
  const entryPath = join(projectDir, "packs", seedEntry.packId, "v2", "catalog-entry.json");
  if (!existsSync(entryPath)) {
    missing.push(seedEntry.packId);
    continue;
  }
  const entry = readJson(entryPath);
  validateEntry(entry, seedEntry);
  entries.push(entry);
}

if (missing.length > 0 && !args.allowPartial) {
  throw new Error(`v2 圖庫尚未完成：缺少 ${missing.length} 組（${missing.join(", ")}）。`);
}

const outputPath = resolve(
  args.output ?? join(projectDir, "v2", args.allowPartial ? "catalog.partial.json" : "catalog.json"),
);
const catalog = {
  schemaVersion: 2,
  catalogVersion: seedCatalog.catalogVersion,
  minimumAppVersion: seedCatalog.minimumAppVersion,
  defaultLocale: seedCatalog.defaultLocale,
  supportedLocales: seedCatalog.supportedLocales,
  updatedAt: new Date().toISOString(),
  assetBaseUrl: process.env.PACK_ASSET_BASE_URL?.trim() || "/picture-packs",
  packs: entries,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`v2 catalog: ${entries.length}/${seedCatalog.packs.length} packs -> ${outputPath}`);
if (missing.length > 0) console.log(`尚缺：${missing.join(", ")}`);

function parseArgs(values) {
  const parsed = { allowPartial: false, output: undefined };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--allow-partial") {
      parsed.allowPartial = true;
      continue;
    }
    if (value === "--output") {
      const output = values[index + 1];
      if (!output) throw new Error("--output 必須提供路徑。");
      parsed.output = output;
      index += 1;
      continue;
    }
    throw new Error(`不支援的參數：${value}`);
  }
  return parsed;
}

function validateEntry(entry, seedEntry) {
  if (
    entry.packId !== seedEntry.packId || entry.version !== seedEntry.version ||
    entry.order !== seedEntry.order || entry.price !== seedEntry.price ||
    entry.releasedAt !== seedEntry.releasedAt
  ) {
    throw new Error(`${seedEntry.packId} 的 catalog entry 與既有穩定識別資料不一致。`);
  }
  if (entry.manifest !== `packs/${entry.packId}/v2/manifest.json`) {
    throw new Error(`${entry.packId} 的 manifest 路徑不正確。`);
  }
  if (!entry.cover?.startsWith(`packs/${entry.packId}/v2/images/`) || !entry.cover.endsWith(".webp")) {
    throw new Error(`${entry.packId} 的 cover 路徑不正確。`);
  }
  if (!Number.isInteger(entry.imageCount) || entry.imageCount <= 0) {
    throw new Error(`${entry.packId} 的圖片數量不正確。`);
  }
  if (!Number.isInteger(entry.downloadBytes) || entry.downloadBytes <= 0) {
    throw new Error(`${entry.packId} 的下載容量不正確。`);
  }
  if (!Number.isInteger(entry.manifestBytes) || entry.manifestBytes <= 0) {
    throw new Error(`${entry.packId} 的 manifestBytes 不正確。`);
  }
  if (!/^[a-f0-9]{64}$/.test(entry.manifestSha256)) {
    throw new Error(`${entry.packId} 的 manifestSha256 不正確。`);
  }
  assertLocalized(entry.title, `${entry.packId} title`);
  assertLocalized(entry.description, `${entry.packId} description`);
}

function assertLocalized(value, field) {
  for (const locale of locales) {
    if (typeof value?.[locale] !== "string" || value[locale].trim().length === 0) {
      throw new Error(`${field} 缺少 ${locale}。`);
    }
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
