# 拾光拼圖獨立圖庫

本專案是與遊戲程式分離的公開圖庫發佈單位。只保存可交付的 WebP、catalog、
manifest、Schema、驗證及發佈腳本；原始生成圖、Prompt、淘汰稿與 QA 工作檔另存私人素材庫。
Web 與 App 沿用相同 catalog／manifest，按套組下載並離線保存。
Alpha 0.9 的直式圖片、四語 metadata 與整包下載契約見
[`Alpha 0.9 直式圖庫與遊戲遷移規格`](https://github.com/barst/GameDev2026/blob/main/projects/card_picture_puzzle/docs/alpha-0.9-portrait-migration.md)。

## 檔案結構

- `v2/catalog.json`：所有 0.9 圖庫的輕量索引、版本、售價、封面與下載容量。
- `packs/<pack-id>/v2/manifest.json`：單一圖庫的四語名稱、介紹、圖片清單、檔案大小與 SHA-256。
- `packs/<pack-id>/v2/images/`：3:4 直式 WebP 圖片；不與遊戲 JavaScript 綑綁。
- `schemas/`：供 Web、iOS、Android 共用的 JSON Schema 契約。

四語欄位固定使用 `zh-TW`、`zh-CN`、`en`、`ja`。既有 `packId` 與
`image.id` 是玩家進度的穩定識別碼，不可因翻譯或改檔名而變動。

`catalog.json` 與 manifest 的 `price` 只供 UI 預覽；實際售價、是否免費與購買
結果以伺服器 API 為準。App 不可自行扣款後視為購買成功。

## 驗證

```powershell
npm test
npm run build
```

驗證程序會檢查 catalog、52 組 manifest、522 張圖片、四語欄位、3:4 實際尺寸、
檔案大小與 SHA-256。任何一項不一致都會讓建置失敗。

若由獨立網域或 GitHub Pages 發佈，先寫入絕對資產根網址：

```powershell
$env:PACK_ASSET_BASE_URL = "https://barst.github.io/card-picture-packs"
npm run v2:catalog
npm test
npm run build
```

遊戲端以 `VITE_PACK_CATALOG_URL` 指向
`https://barst.github.io/card-picture-packs/v2/catalog.json`。前五組免費包另由遊戲
建置時內嵌，不會因 catalog 網路延遲而阻塞首頁。

## 更新流程

1. 在對應圖庫加入圖片並更新 manifest。
2. 增加圖庫版本號，更新 `catalog.json` 的版本、張數與下載容量。
3. 執行測試與驗證後，再由 Portal 建置流程發佈。
4. 已下載的 App 依版本號更新；未下載的圖庫只讀取 catalog，不預先抓取圖片。
