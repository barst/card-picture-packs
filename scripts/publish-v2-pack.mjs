import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectDir = resolve(import.meta.dirname, "..");
const [packId, batchArg] = process.argv.slice(2);
if (!packId || !batchArg) {
  throw new Error("用法：node scripts/publish-v2-pack.mjs <packId> <batchDir>");
}

const batchDir = resolve(batchArg);
const catalogMetadataPath = join(batchDir, "metadata", "catalog", `${packId}.json`);
const metadataPath = existsSync(catalogMetadataPath)
  ? catalogMetadataPath
  : join(batchDir, "metadata", `${packId}.json`);
const metadata = readJson(metadataPath);
const selections = readJson(join(batchDir, "selections", `${packId}.json`));
const legacyCatalog = readJson(join(projectDir, "catalog.json"));
const legacyEntry = legacyCatalog.packs.find((entry) => entry.packId === packId);
if (!legacyEntry) throw new Error(`v1 catalog 找不到 ${packId}。`);
if (metadata.packId !== packId) throw new Error("metadata.packId 不符。");

const version = 2;
const packDir = join(projectDir, "packs", packId, `v${version}`);
const imageDir = join(packDir, "images");
if (existsSync(packDir)) rmSync(packDir, { recursive: true });
mkdirSync(imageDir, { recursive: true });

const images = metadata.images.map((image) => {
  const selected = selections[image.id];
  if (typeof selected !== "string") throw new Error(`缺少 ${image.id} 的選定素材。`);
  const source = resolve(batchDir, selected);
  if (!existsSync(source)) throw new Error(`找不到選定素材：${source}`);
  const output = join(imageDir, `${image.id}.webp`);
  run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", source,
    "-c:v", "libwebp", "-quality", "82", "-compression_level", "6",
    "-preset", "picture", "-lossless", "0", output,
  ]);
  const dimensions = probeDimensions(output);
  if (dimensions.width * 4 !== dimensions.height * 3) {
    throw new Error(`${image.id} 不是 3:4：${dimensions.width}x${dimensions.height}`);
  }
  const bytes = readFileSync(output);
  return {
    id: image.id,
    file: `packs/${packId}/v${version}/images/${basename(output)}`,
    mimeType: "image/webp",
    width: dimensions.width,
    height: dimensions.height,
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
    name: image.name,
  };
});

const manifest = {
  schemaVersion: 2,
  packId,
  version,
  order: legacyEntry.order,
  releasedAt: legacyEntry.releasedAt,
  price: legacyEntry.price,
  defaultLocale: "zh-TW",
  supportedLocales: ["zh-TW", "zh-CN", "en", "ja"],
  title: metadata.title,
  description: metadata.description,
  artwork: { orientation: "portrait", aspectRatio: "3:4" },
  coverImageId: images[0].id,
  images,
};
const manifestPath = join(packDir, "manifest.json");
writeJson(manifestPath, manifest);
const manifestBytes = readFileSync(manifestPath);
const catalogEntry = {
  packId,
  version,
  order: legacyEntry.order,
  releasedAt: legacyEntry.releasedAt,
  price: legacyEntry.price,
  title: metadata.title,
  description: metadata.description,
  cover: images[0].file,
  manifest: `packs/${packId}/v${version}/manifest.json`,
  manifestBytes: manifestBytes.byteLength,
  manifestSha256: sha256(manifestBytes),
  imageCount: images.length,
  downloadBytes: images.reduce((sum, image) => sum + image.bytes, 0),
};
writeJson(join(packDir, "catalog-entry.json"), catalogEntry);
console.log(`${packId} v${version}: ${images.length} 張，${catalogEntry.downloadBytes} bytes`);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} 執行失敗。`);
}

function probeDimensions(path) {
  const result = spawnSync("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height", "-of", "json", path,
  ], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`ffprobe 無法讀取 ${path}。`);
  const stream = JSON.parse(result.stdout).streams?.[0];
  if (!stream || !Number.isInteger(stream.width) || !Number.isInteger(stream.height)) {
    throw new Error(`無法取得圖片尺寸：${path}`);
  }
  return { width: stream.width, height: stream.height };
}
