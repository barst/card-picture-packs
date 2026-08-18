import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const projectDir = resolve(import.meta.dirname, "..");

test("正式 v2 索引包含全部直式四語圖庫", () => {
  const catalog = JSON.parse(readFileSync(join(projectDir, "v2", "catalog.json"), "utf8"));
  assert.equal(catalog.schemaVersion, 2);
  assert.equal(catalog.minimumAppVersion, "0.9.0-alpha.0");
  assert.equal(catalog.assetBaseUrl, "/picture-packs");
  assert.equal(catalog.packs.length, 52);
  assert.equal(catalog.packs.reduce((total, entry) => total + entry.imageCount, 0), 522);
  assert.deepEqual(catalog.packs.map((entry) => entry.order),
    [...catalog.packs].map((entry) => entry.order).sort((left, right) => left - right));
  for (const entry of catalog.packs) {
    assert.equal(entry.version, 2);
    assert.match(entry.manifest, new RegExp(`^packs/${entry.packId}/v2/manifest\\.json$`));
    assert.equal(entry.thumbnail, `packs/${entry.packId}/v2/thumbnail.webp`);
    assert.match(entry.manifestSha256, /^[a-f0-9]{64}$/);
  }
});

test("遷移期間只建立明確標示的 v2 部分索引", () => {
  const temporaryDir = mkdtempSync(join(tmpdir(), "picture-pack-v2-catalog-"));
  const outputPath = join(temporaryDir, "catalog.partial.json");
  try {
    execFileSync(process.execPath, [
      join(projectDir, "scripts", "build-v2-catalog.mjs"),
      "--allow-partial",
      "--output",
      outputPath,
    ], { cwd: projectDir, stdio: "pipe" });

    const catalog = JSON.parse(readFileSync(outputPath, "utf8"));
    const availableEntries = catalog.packs.length;
    assert.equal(catalog.schemaVersion, 2);
    assert.equal(catalog.minimumAppVersion, "0.9.0-alpha.0");
    assert.equal(catalog.assetBaseUrl, "/picture-packs");
    assert.ok(availableEntries > 0 && availableEntries <= 52);
    assert.deepEqual(catalog.packs.map((entry) => entry.order),
      [...catalog.packs].map((entry) => entry.order).sort((left, right) => left - right));
    for (const entry of catalog.packs) {
      assert.equal(entry.version, 2);
      assert.match(entry.manifest, new RegExp(`^packs/${entry.packId}/v2/manifest\\.json$`));
      assert.equal(entry.thumbnail, `packs/${entry.packId}/v2/thumbnail.webp`);
      assert.match(entry.manifestSha256, /^[a-f0-9]{64}$/);
    }
  } finally {
    rmSync(temporaryDir, { recursive: true, force: true });
  }
});

test("獨立發佈可用環境變數寫入絕對資產網址", () => {
  const temporaryDir = mkdtempSync(join(tmpdir(), "picture-pack-v2-public-catalog-"));
  const outputPath = join(temporaryDir, "catalog.json");
  try {
    execFileSync(process.execPath, [
      join(projectDir, "scripts", "build-v2-catalog.mjs"),
      "--output",
      outputPath,
    ], {
      cwd: projectDir,
      env: {
        ...process.env,
        PACK_ASSET_BASE_URL: "https://example.github.io/card-picture-packs",
      },
      stdio: "pipe",
    });

    const catalog = JSON.parse(readFileSync(outputPath, "utf8"));
    assert.equal(catalog.assetBaseUrl, "https://example.github.io/card-picture-packs");
  } finally {
    rmSync(temporaryDir, { recursive: true, force: true });
  }
});
