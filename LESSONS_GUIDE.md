# 新增課程指南（給 ChatGPT / AI 助理與維護者）

這份文件說明如何把新的單元（Unit）加進「喵喵英文拼句學院」。**新增課程只需要改 `lessons/` 資料夾裡的 JSON 檔，不要修改任何 `.js`、`.html` 或 `supabase/` 檔案。**

教材來源：常春藤《高中英文基礎字彙》，全書 25 個 Unit。

---

## 一、要改哪些檔案

新增 Unit 07 為例：

1. **新增** `lessons/unit07.json`（題目內容，格式見下方）
2. **修改** `lessons/index.json`，在 `units` 陣列裡把該單元那一行補上 `"file"`：

```json
{"id": "unit07", "title": "Unit 07", "subtitle": "課本 p.56–65", "file": "unit07.json"}
```

- 沒有 `"file"` 的單元，網頁上會顯示「Unit 07 · 準備中」的灰色按鈕
- 單元依 `index.json` 裡的順序顯示，請按 Unit 編號排列
- 網站預設會開啟「最後一個有內容的單元」

## 二、單元檔格式（`lessons/unitXX.json`）

```json
{
 "id": "unit07",
 "title": "Unit 07",
 "subtitle": "課本 p.56–65",
 "topics": [
  {
   "id": "make",
   "title": "01 make",
   "items": [
    {"en": "My mom made a cake for me.", "zh": "我媽媽為我做了一個蛋糕。"},
    {"en": "The joke made everyone laugh.", "zh": "這個笑話讓大家都笑了。"}
   ],
   "grammar": [
    {
     "q": "make + 受詞 + 原形動詞 表示？",
     "choices": ["使某人做某事", "為某人做某物", "被迫做某事"],
     "answer": 0,
     "explain": "make sb + V（原形）＝使某人做某事。"
    }
   ]
  }
 ]
}
```

（上面的例句只是格式示範，實際內容請依課本。）

### 欄位規則

| 欄位 | 規則 |
|---|---|
| `id`（單元） | `unit` + 兩位數字，例如 `unit07`，要和檔名、`index.json` 一致 |
| `topics[].id` | 主題代號，**只能用小寫英文、數字、減號**，例如 `make`、`look-for`。同一單元內不可重複。**上線後不要再改**，否則學生在該主題的紀錄會消失 |
| `topics[].title` | 顯示名稱，慣例為「兩位編號 + 空格 + 單字」，例如 `01 make`、`12 like` |
| `items[].en` | 英文例句。學生會把它**依空白切成單字磚塊**來拼，所以：標點黏在單字上（`wife.`、`Yes,`）；前後不留空白、中間不要連續空白；至少 2 個字，建議 25 字以內 |
| `items[].zh` | 中文翻譯（學生看這句拼英文）。同一句有兩種說法時可加註，例如 `（縮寫句）` |
| `grammar` | 文法選擇題，每個主題建議 2–3 題；學生每答對 3 句會穿插一題 |
| `grammar[].answer` | **正確選項在 `choices` 裡的位置，從 0 開始**。網頁會自動打亂選項順序，所以習慣上把正確答案放第一個、`answer` 填 `0` |
| `grammar[].explain` | 答完後顯示的解說，一兩句即可 |

### 內容注意事項

- 例句請**照課本原文**，不要自行改寫或創作
- 英文的撇號可以用 `’` 或 `'`，網頁都能正確顯示與發音
- 不要修改**已經上線的**例句順序或刪除例句：學生的紀錄是用「主題 id + 第幾句」記的。要修正錯字可以直接改；要新增例句請加在該主題的最後面
- 檔案必須是 UTF-8 編碼的合法 JSON（字串用雙引號、最後一項後面不能有逗號）

## 三、上傳前檢查

在 repo 根目錄執行：

```
node tools/validate-lessons.js
```

看到 `✓ 題庫格式正確` 才上傳。推上 GitHub 後也會自動執行同一個檢查（repo 頁面的 **Actions** 分頁，綠色 ✓＝通過、紅色 ✗＝有錯，點進去可以看是哪一行）。

## 四、上線

推送到 `main` 分支後，GitHub Pages 約 1–2 分鐘內自動更新，不需要其他步驟。

## 給 AI 助理的工作清單

收到「新增 Unit XX」的課本內容時：

1. 依上面格式建立 `lessons/unitXX.json`，例句逐字照抄課本
2. 為每個主題寫 2–3 題文法選擇題（正確答案放第一個、`answer: 0`）
3. 在 `lessons/index.json` 把 `unitXX` 那一行補上 `"file": "unitXX.json"` 和頁碼 `subtitle`；若該單元還不在清單內，依編號順序插入
4. 執行 `node tools/validate-lessons.js`，修正所有錯誤
5. 只提交 `lessons/` 底下的變更，commit 訊息例如 `Add Unit 07 lessons`
