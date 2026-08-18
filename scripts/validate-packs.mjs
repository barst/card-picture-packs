import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const catalogPath = args.catalog ? resolve(projectDir, args.catalog) : join(projectDir, "catalog.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const locales = ["zh-TW", "zh-CN", "en", "ja"];
const imageIds = new Set();
let imageCount = 0;

if (
  ![1, 2].includes(catalog.schemaVersion) || catalog.packs.length === 0 ||
  (!args.allowPartial && catalog.packs.length !== 52)
) {
  throw new Error("圖庫總索引格式或卡包數量不正確。");
}
if (
  !Number.isInteger(catalog.catalogVersion) || catalog.catalogVersion < 1 ||
  catalog.defaultLocale !== "zh-TW" ||
  JSON.stringify(catalog.supportedLocales) !== JSON.stringify(locales) ||
  typeof catalog.minimumAppVersion !== "string"
) {
  throw new Error("圖庫總索引缺少 App 相容性資訊。");
}

for (const entry of catalog.packs) {
  const thumbnailPath = join(projectDir, entry.thumbnail ?? "");
  if (entry.thumbnail !== `packs/${entry.packId}/v${entry.version}/thumbnail.webp`) {
    throw new Error(`${entry.packId} 的縮圖路徑不符合規則。`);
  }
  if (!existsSync(thumbnailPath)) throw new Error(`找不到圖庫縮圖：${entry.packId}`);
  const thumbnailDimensions = readWebpDimensions(readFileSync(thumbnailPath), `${entry.packId} thumbnail`);
  if (thumbnailDimensions.width !== 240 || thumbnailDimensions.height !== 320) {
    throw new Error(`${entry.packId} 的縮圖尺寸必須是 240×320。`);
  }
  const manifestPath = join(projectDir, entry.manifest);
  const expectedManifestPath = catalog.schemaVersion === 2
    ? `packs/${entry.packId}/v${entry.version}/manifest.json`
    : `packs/${entry.packId}/manifest.json`;
  if (entry.manifest !== expectedManifestPath) {
    throw new Error(`${entry.packId} 的 manifest 路徑不符合規則。`);
  }
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (
    manifest.schemaVersion !== catalog.schemaVersion || manifest.packId !== entry.packId ||
    manifest.version !== entry.version || manifest.price !== entry.price ||
    manifest.images.length !== entry.imageCount
  ) {
    throw new Error(`${entry.packId} 的 manifest 與總索引不一致。`);
  }
  assertLocalized(manifest.title, `${entry.packId} title`);
  assertLocalized(manifest.description, `${entry.packId} description`);
  if (catalog.schemaVersion === 2) {
    validateV2Pack(entry, manifest, manifestBytes);
  }
  for (const image of manifest.images) {
    if (imageIds.has(image.id)) throw new Error(`圖片 ID 重複：${image.id}`);
    imageIds.add(image.id);
    assertLocalized(image.name, `${image.id} name`);
    const expectedImagePrefix = catalog.schemaVersion === 2
      ? `packs/${entry.packId}/v${entry.version}/images/`
      : `packs/${entry.packId}/images/`;
    if (!image.file.startsWith(expectedImagePrefix) || image.file.includes("..")) {
      throw new Error(`圖片路徑不符合規則：${image.file}`);
    }
    const imagePath = join(projectDir, image.file);
    if (!existsSync(imagePath)) throw new Error(`找不到圖片：${image.file}`);
    const bytes = readFileSync(imagePath);
    if (bytes.byteLength !== image.bytes) throw new Error(`圖片大小不符：${image.id}`);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== image.sha256) throw new Error(`圖片雜湊不符：${image.id}`);
    if (catalog.schemaVersion === 2) {
      if (image.mimeType !== "image/webp") throw new Error(`圖片格式不符：${image.id}`);
      if (image.width * 4 !== image.height * 3) throw new Error(`圖片比例不是 3:4：${image.id}`);
      const actual = readWebpDimensions(bytes, image.id);
      if (actual.width !== image.width || actual.height !== image.height) {
        throw new Error(`圖片實際尺寸不符：${image.id}`);
      }
    }
    imageCount += 1;
  }
}

if (!args.allowPartial && imageCount !== 522) throw new Error(`圖片總數不正確：${imageCount}`);
console.log(`Validated ${catalog.packs.length} packs and ${imageCount} localized images.`);

function parseArgs(values) {
  const parsed = { allowPartial: false, catalog: undefined };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--allow-partial") {
      parsed.allowPartial = true;
      continue;
    }
    if (value === "--catalog") {
      const catalog = values[index + 1];
      if (!catalog) throw new Error("--catalog 必須提供路徑。");
      parsed.catalog = catalog;
      index += 1;
      continue;
    }
    throw new Error(`不支援的參數：${value}`);
  }
  return parsed;
}

function assertLocalized(value, field) {
  for (const locale of locales) {
    if (typeof value?.[locale] !== "string" || value[locale].trim().length === 0) {
      throw new Error(`${field} 缺少 ${locale}。`);
    }
  }
}

function validateV2Pack(entry, manifest, bytes) {
  if (
    manifest.defaultLocale !== "zh-TW" ||
    JSON.stringify(manifest.supportedLocales) !== JSON.stringify(locales) ||
    manifest.artwork?.orientation !== "portrait" ||
    manifest.artwork?.aspectRatio !== "3:4"
  ) {
    throw new Error(`${entry.packId} 的 v2 語系或直式規格不正確。`);
  }
  if (!manifest.images.some((image) => image.id === manifest.coverImageId)) {
    throw new Error(`${entry.packId} 的 coverImageId 不存在。`);
  }
  if (entry.manifestBytes !== bytes.byteLength) {
    throw new Error(`${entry.packId} 的 manifest 大小不符。`);
  }
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (entry.manifestSha256 !== digest) {
    throw new Error(`${entry.packId} 的 manifest 雜湊不符。`);
  }
}

function readWebpDimensions(bytes, imageId) {
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error(`圖片不是有效的 WebP：${imageId}`);
  }
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const chunkType = bytes.toString("ascii", offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (chunkType === "VP8X" && dataOffset + 10 <= bytes.length) {
      return {
        width: 1 + bytes.readUIntLE(dataOffset + 4, 3),
        height: 1 + bytes.readUIntLE(dataOffset + 7, 3),
      };
    }
    if (chunkType === "VP8 " && dataOffset + 10 <= bytes.length) {
      return {
        width: bytes.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: bytes.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    }
    if (chunkType === "VP8L" && dataOffset + 5 <= bytes.length && bytes[dataOffset] === 0x2f) {
      const bits = bytes.readUInt32LE(dataOffset + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
      };
    }
    offset = dataOffset + chunkSize + (chunkSize % 2);
  }
  throw new Error(`無法讀取 WebP 尺寸：${imageId}`);
}
