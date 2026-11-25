# 喵喵英文拼句學院｜部署邏輯與維護手冊

最後更新：2026-11-25

- 網站：https://kuohappiness.github.io/english-kitten-academy/
- 原始碼：https://github.com/kuohappiness/english-kitten-academy
- 資料庫後台：https://supabase.com/dashboard/project/clhtnlxnlpksyvamstof
- 教材來源：常春藤《高中英文基礎字彙》（全書 25 個 Unit）

---

## 一、整體架構

```
學生的瀏覽器
   │
   ├── GitHub Pages（免費）──── 網頁、程式、題庫 JSON（靜態檔案）
   │
   └── Supabase（免費方案）──── 帳號登入、學習紀錄、排行榜、瀏覽人次
            │
            └── Brevo SMTP（免費，每天 300 封）── 註冊確認信、重設密碼信
```

| 服務 | 用途 | 費用／限制 |
|---|---|---|
| GitHub Pages | 放網站與題庫；推送到 `main` 約 1–2 分鐘自動上線 | 免費；repo 必須公開 |
| Supabase | 帳號、成績、錯題、排行榜、瀏覽人次 | 免費；**閒置約 7 天會自動暫停** |
| Brevo | 寄出註冊確認信、重設密碼信 | 免費每天 300 封；**SMTP 金鑰 90 天沒寄信會失效** |
| GitHub Actions | 檢查題庫格式、每 3 天喚醒資料庫 | 免費；repo 60 天無更新時排程會停 |

## 二、檔案結構

| 檔案 | 作用 |
|---|---|
| `index.html` | 頁面外觀、樣式、頁尾（來源出處、版權聲明、瀏覽人次）。引用的 js 都帶 `?v=數字`，改程式時要遞增以避開瀏覽器快取 |
| `app.js` | 主程式：登入畫面、試玩模式、單元按鈕、拼句練習、文法穿插題、複習模式、計分、排行榜、發音 |
| `quick-quiz.js` | 考前速測（全課綜合／單一主題／只練錯題） |
| `cloud.js` | 與 Supabase 溝通：註冊、登入、忘記密碼、讀寫紀錄；斷線時先暫存、恢復後補送 |
| `config.js` | Supabase 網址與 publishable 公開金鑰（可公開；**絕不可放 secret / service_role key**）。兩個值留空＝單機版 |
| `lessons/index.json` | 單元清單。沒有 `"file"` 的單元顯示為灰色「準備中」 |
| `lessons/unitXX.json` | 各單元題庫（例句＋文法題） |
| `supabase/schema.sql` | 資料表、權限、計分函式、排行榜、瀏覽人次（可重複執行） |
| `supabase/visits.sql` | 瀏覽人次計數器（已包含在 schema.sql） |
| `tools/validate-lessons.js` | 題庫格式檢查工具 |
| `.github/workflows/validate-lessons.yml` | 每次上傳題庫自動檢查格式 |
| `.github/workflows/keep-alive.yml` | 每 3 天呼叫資料庫一次，避免 Supabase 暫停 |
| `LESSONS_GUIDE.md`、`AGENTS.md` | 給 ChatGPT／AI 助理的新增課程規則 |
| `SETUP.md` | Supabase、寄信的初次設定步驟 |

## 三、網站功能邏輯

### 帳號
- **註冊**：暱稱（排行榜顯示，不可重複）＋ Email ＋ 密碼（至少 6 字元）→ 寄確認信 → 點連結後才能登入。
- **忘記密碼**：輸入 Email → 收「重設密碼」信 → 點連結回網站設定新密碼。系統只存加密密碼，無法寄回原密碼。
- **試玩模式**：登入頁「🎮 先試玩看看」，免註冊可完整練習，但紀錄不保存、不上排行榜。
- 新帳號從 0 分開始；早期單機版的暱稱紀錄不會搬上雲端。

### 練習與計分（分數由伺服器計算，學生無法自行改分）
- 每個主題逐句拼句：第一次答對 3 分、第二次 2 分、第三次以後 1 分；每句只計分一次。
- 整個主題完成再加 5 分（伺服器會確認每句都已答對才給）。
- 每答對 3 句穿插一題文法選擇題（不計分，選項順序隨機）。
- **複習模式**：已過關的主題按「再次複習」會全部句子隨機重跑一輪，不加分。
- **錯題本**：答錯即記入；在速測或複習中「一次就答對」2 次才移出。
- 每次作答都存一筆紀錄（含答錯時排出的句子），供老師分析。

### 其他
- **排行榜**：本週（從星期一起算）／總積分，前 10 名，只顯示暱稱。
- **發音**：自動選裝置上最自然的英文語音（iPhone 用 Siri／Samantha，Edge 用 Natural 語音），另有 🐢 慢速。
- **瀏覽人次**：右下角小字，同一個瀏覽分頁只算一次。
- **單元按鈕**：依 `index.json` 順序顯示；網站預設開啟最後一個有內容的單元，並記住學生上次選的單元。

## 四、資料庫（Supabase）

| 資料表 | 內容 |
|---|---|
| `profiles` | 學員暱稱 |
| `progress` | 每一句的狀態：作答次數、是否答對、得分、是否在錯題本 |
| `bonuses` | 主題完成獎勵 |
| `attempts` | 每一次作答紀錄（老師看常錯句子用） |
| `site_stats` | 瀏覽人次 |

- 學生只能**讀**自己的資料；所有寫入都透過伺服器函式（`record_attempt`、`claim_bonus`），排行榜透過 `leaderboard` 函式只回傳暱稱與分數。
- 紀錄是用「單元:主題 id ＋ 第幾句」記的（例如 `unit07:stand` 第 3 句），所以**已上線的主題 id 不可改、例句不可刪或調換順序**，只能修錯字或在最後新增。

後台常用操作：
- 看作答紀錄：**Table Editor** → `attempts`
- 查學生帳號／忘記用哪個 Email：**Authentication** → **Users**
- 刪除帳號（紀錄一併刪除）：**Authentication** → **Users**

## 五、新增一課的流程

1. 拍下課本該單元所有頁面。
2. 交給 Claude 或 ChatGPT（依 `LESSONS_GUIDE.md`）產生 `lessons/unitXX.json`：
   - 例句逐字照抄課本（含「＝」同義句，中文後加註提示，例如「（用 put up with）」）
   - 不收星號生字補充（不是完整句子）
   - 小字號的衍生字併入主題，標題如「07 husband / wife / child」
   - 每主題 3 題文法題，正確答案放第一個、`answer: 0`
3. 在 `lessons/index.json` 補上該單元的 `"file"` 與頁碼。
4. 執行 `node tools/validate-lessons.js`，出現「✓ 題庫格式正確」才上傳。
5. 推送到 `main`；**Actions** 分頁綠色 ✓＝通過，約 1–2 分鐘後網站上線。

### 目前進度

| 單元 | 頁碼 | 主題數 | 例句數 | 狀態 |
|---|---|---|---|---|
| Unit 05 | p.38–47 | 30 | 146 | 已上線 |
| Unit 06 | p.48–58 | 29 | 159 | 已上線 |
| Unit 07 | p.59–68 | 26 | 140 | 已上線 |
| Unit 08 | — | — | — | 準備中（待補照片） |
| Unit 09 | p.78–87 | 28 | 140 | 已上線 |
| Unit 10–25 | — | — | — | 尚未建立 |

待確認：Unit 09「19 draw」第 3 句照片為 *Paul drew a stool in the fireplace.*，需對照課本確認原文。

## 六、常見問題排除

| 狀況 | 原因 | 處理 |
|---|---|---|
| **所有電腦都無法登入／連線** | Supabase 免費專案閒置被暫停 | 登入後台 → 按 **Resume project**（不要按 Upgrade to Pro），等 2–5 分鐘。資料不會遺失，暫停後約 1 年內都能恢復 |
| 學生收不到確認信／重設信 | Brevo SMTP 金鑰 90 天沒寄信失效；或信被歸到垃圾郵件 | 請學生看垃圾郵件匣；仍無則到 Brevo 重新產生 SMTP 金鑰（Standard、No expiry），貼到 Supabase **Authentication → Emails → SMTP Settings → Password** |
| 新課程沒出現 | GitHub Pages 還在部署，或題庫格式錯誤 | 看 repo 的 **Actions** 分頁；紅色 ✗ 點進去看錯誤行 |
| 手機看到舊版畫面 | 瀏覽器快取 | 重新整理；改程式時記得遞增 `index.html` 中的 `?v=` 版本號 |
| GitHub 寄信說「保持資料庫連線」失敗 | 資料庫已被暫停 | 同第一列，按 Resume project |
| 排程停止 | repo 60 天沒有任何更新 | 隨便上傳一次更新，或在 Actions 分頁重新啟用 |

## 七、Supabase 與寄信設定摘要

詳細步驟見 `SETUP.md`。

- **URL Configuration**：Site URL `https://kuohappiness.github.io/english-kitten-academy/`；Redirect URLs 加 `https://kuohappiness.github.io/english-kitten-academy/**`
- **SMTP（Brevo）**：Host `smtp-relay.brevo.com`、Port `587`、Username 填 Brevo SMTP 頁面的 Login（`xxxx@smtp-brevo.com`）、Password 填 SMTP 金鑰、Sender 為已在 Brevo 驗證的 Gmail
- **Rate Limits**：寄信上限調為每小時 100 封
- **Email Templates**：確認信、重設密碼信已改為中文範本
- **安全**：SMTP 金鑰、資料庫密碼、secret key 不要貼到任何對話或檔案中；只有 Project URL 和 publishable key 可以公開

## 八、版權

- 頁尾已標示：「來源出處：常春藤 高中英文基礎字彙」「本站僅供教學練習，例句版權屬常春藤所有，請支持正版教材」。
- 非商業＋註明出處不等於取得授權；整課收錄並公開在網路上仍有風險。
- 降低風險的做法：寫信向常春藤取得同意；或保留單字、改寫成原創例句；或改為登入後才能看到題目、題庫移入資料庫。收到出版社通知應立即下架。
