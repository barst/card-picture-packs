# Gemini 圖庫製作指令模板

這份文字可直接貼給 Gemini。使用前先取代所有 `<...>` 欄位。

## Gemini 從哪裡取得規範

### 本機 Gemini CLI／可讀取本機檔案的 Agent

請 Gemini 完整讀取：

```text
D:\PublicProjects\card-picture-packs\docs\pack-generation-spec.md
```

### Gemini 網頁版

將下列檔案拖入 Gemini 對話：

```text
D:\PublicProjects\card-picture-packs\docs\pack-generation-spec.md
```

規範推送至 GitHub 後，也可提供公開網址：

```text
https://github.com/barst/card-picture-packs/blob/main/docs/pack-generation-spec.md
```

Gemini 網頁版不能直接寫入本機磁碟。請讓它逐張輸出圖片與 JSON，下載後再依本文件的路徑放置。

## 原始成果放置位置

建立一個不放入公開 GitHub 的私人工作批次：

```text
D:\GameDev2026\projects\card_picture_puzzle\imagegen-batches\_incoming\<YYYY-MM-DD>-<pack-id>\
├─ raw\
│  └─ <pack-id>\
│     ├─ <image-id>-v1.png
│     └─ ...
├─ metadata\
│  └─ catalog\
│     └─ <pack-id>.json
├─ selections\
│  └─ <pack-id>.json
└─ qa\
   └─ <pack-id>-2x3-2x2-contact-sheet.png
```

範例：

```text
D:\GameDev2026\projects\card_picture_puzzle\imagegen-batches\_incoming\2026-08-19-world-breakfasts\raw\world-breakfasts\world-breakfasts-01-taiwan-v1.png
```

原始生圖建議先保存 PNG，避免重複壓縮。只有通過 QA 的選定圖片，才由發布工具轉成 WebP 並放入：

```text
D:\PublicProjects\card-picture-packs\packs\<pack-id>\v<version>\images\
```

Gemini 不得直接修改 `D:\PublicProjects\card-picture-packs\packs\`，也不得自行覆蓋已發布版本。

## 可直接貼給 Gemini 的完整指令

```text
你正在協助製作《拾光拼圖》的新圖庫。

一、先讀規範
完整讀取以下規範，不可只看摘要：
D:\PublicProjects\card-picture-packs\docs\pack-generation-spec.md

若你無法讀取本機檔案，我會把該 Markdown 檔上傳給你；收到後先確認你已理解以下硬性條件：
1. 圖片為直式 3:4，正式尺寸 1086×1448 px。
2. 遊戲會取中央 2:3，再切成固定 2×2 四片。
3. 每一片在 240×360 手機縮圖中都要有可辨識輪廓、材質或大色塊。
4. 可出現符合場景、內容正確的短環境文字，例如「鹹酥雞」「祭典」「入口」或地標原有標示；不得有假字、錯字、品牌、商標、Logo、人物姓名、個資、浮水印或簽名。
5. 不得有多餘肢體、融合手指、錯誤動物結構、錯誤車輪、斷裂建築或不合理物件。
6. 每張以一個大型主體為核心，最多一至兩個低存在感陪襯；避免細碎雜亂。
7. 圖庫名稱、圖庫介紹及每張圖片名稱均須提供繁中、簡中、英文、日文。

二、本次圖庫資料
packId：<pack-id>
圖庫主題：<主題>
預計張數：<10>
共同畫風：<寫實攝影／油畫／溫馨插畫／其他>
目標玩家感受：<描述>
必須出現的題材：
1. <題材一>
2. <題材二>
3. <題材三>
4. <題材四>
5. <題材五>
6. <題材六>
7. <題材七>
8. <題材八>
9. <題材九>
10. <題材十>

packId 命名規則：
- 使用 2–5 個描述主題的英文單字，以小寫 kebab-case 命名。
- 優先表達地域、風格、對象或題材，例如 world-street-food。
- 不使用 pack-01、new、final、v2、年份、品牌、人物姓名或無意義數字。
- 若我尚未指定 packId，先提出三個候選名稱及各自命名理由，不可自行定案。
- 定案前必須在正式 catalog 與 imagegen-batches 查重；名稱不同但主題高度重複也要主動提醒。

三、先企劃，後生圖
不要立刻生成圖片。先交付以下企劃表供我確認：
- packId
- 四語圖庫 title
- 四語圖庫 description
- 每張圖片的 image.id
- 每張圖片的四語 name
- 每張構圖中的單一主要主體
- 最多一至兩個陪襯
- 四個拼片各自保留的辨識線索
- 主色與其他九張的區別
- 可能發生的生成瑕疵與預防方式

四、生圖規則
企劃經我確認後，才逐張生成，不要一次產生十宮格或拼貼圖。
每張圖：
- 輸出 1086×1448 或可無拉伸裁成 1086×1448 的精確 3:4 圖片。
- 主要主體完整位於中央 2:3 安全區；左右約 5.6% 可能被裁除。
- 主體輪廓跨越至少兩個拼片，但臉、眼睛、手掌與關鍵工具不可剛好被中線切開。
- 背景簡潔，以景深、大色塊、天空、牆面或地景襯托主體。
- 若場景不需要文字，不要額外生成招牌或標籤。
- 若攤位、祭典、公共場所或地標需要文字，只能使用經確認正確的短環境文字；文字只作為場景線索，不可成為主要焦點。
- 絕對不要生成品牌、註冊商標、Logo、商品包裝、人物姓名、簽名、電話、地址、QR Code、車牌或其他個資。
- 每張完成後放大逐字檢查；任何假字、錯字、缺筆、隨機字母或語意不通都要修正或重生。
- 每完成一張先自我檢查，再進行下一張。

五、檔名與放置位置
原始 PNG 檔名：<image-id>-v1.png
輸出資料夾：
D:\GameDev2026\projects\card_picture_puzzle\imagegen-batches\_incoming\<YYYY-MM-DD>-<pack-id>\raw\<pack-id>\

若某張修正，依序使用 -v2、-v3，不覆蓋舊候選圖。

六、metadata
完成圖片後建立：
D:\GameDev2026\projects\card_picture_puzzle\imagegen-batches\_incoming\<YYYY-MM-DD>-<pack-id>\metadata\catalog\<pack-id>.json

JSON 必須包含：
{
  "packId": "<pack-id>",
  "title": {
    "zh-TW": "...",
    "zh-CN": "...",
    "en": "...",
    "ja": "..."
  },
  "description": {
    "zh-TW": "...",
    "zh-CN": "...",
    "en": "...",
    "ja": "..."
  },
  "images": [
    {
      "id": "<image-id>",
      "name": {
        "zh-TW": "...",
        "zh-CN": "...",
        "en": "...",
        "ja": "..."
      }
    }
  ]
}

四語須自然表達同一畫面，不得把 Prompt、版本號或畫風參數寫入玩家可見名稱。

七、選定檔案
人工確認每張最終版本後建立：
D:\GameDev2026\projects\card_picture_puzzle\imagegen-batches\_incoming\<YYYY-MM-DD>-<pack-id>\selections\<pack-id>.json

格式為 image.id 對應相對路徑，例如：
{
  "<image-id>": "raw/<pack-id>/<image-id>-v2.png"
}

八、完成條件
只有以下項目全部成立才可回報完成：
- 張數、image.id 與 metadata 順序一致。
- 所有選定圖精確為 1086×1448。
- 中央 2:3／2×2 手機拼片 QA 通過。
- 四語 title、description、name 全部存在且不重複。
- 必要環境文字已逐字確認正確，且無假字、品牌、商標、Logo、人物姓名、個資、浮水印與明顯生成瑕疵。
- 不直接寫入公開 packs 目錄，不執行 Git commit 或 push。
```

## 人工接手後的發布指令

Gemini 完成且人工 QA 通過後，先確認 `<pack-id>` 是否已存在於
`D:\PublicProjects\card-picture-packs\catalog.json`。現行發布工具可直接重製既有
pack；全新 pack 必須先由維護者建立 `order`、`releasedAt`、`price` 與版本資料，
不可讓 Gemini 自行猜測售價或排序。

確認 catalog 已有該 pack 後，在 PowerShell 執行：

```powershell
Set-Location D:\PublicProjects\card-picture-packs

node scripts/publish-v2-pack.mjs `
  <pack-id> `
  D:\GameDev2026\projects\card_picture_puzzle\imagegen-batches\_incoming\<YYYY-MM-DD>-<pack-id>

python scripts/generate-thumbnails.py
npm run v2:catalog
npm test
npm run v2:validate
npm run build
```

注意：現行 `publish-v2-pack.mjs` 以 v2 為發布目標，而且會重建該 pack 的 v2
資料夾。若該圖庫的 v2 已經公開，不可直接執行或覆蓋；應先由維護者將發布工具
與 catalog 升級為下一版目錄，再發布修正版。
