# 雲端帳號設定步驟

網站本身繼續放在 GitHub Pages；帳號、成績、排行榜存在 **Supabase**（免費方案），註冊確認信與重設密碼信透過你的 **Gmail** 寄出。全部免費。

`config.js` 還沒填之前，網站維持單機版，不會影響目前的使用者。

---

## 一、建立 Supabase 專案

1. 到 https://supabase.com 用 GitHub 帳號登入 → **New project**
2. 名稱填 `english-kitten-academy`，Region 選 **Northeast Asia (Tokyo)** 或 **Singapore**（離台灣近）
3. Database Password 隨便設一組強密碼（網站用不到，但請自己記下來）
4. 等 1–2 分鐘專案建立完成

## 二、建立資料表

1. 左側選單 **SQL Editor** → **New query**
2. 把 repo 裡 `supabase/schema.sql` 的內容整份貼上 → 按 **Run**
3. 看到 `Success. No rows returned` 就完成了

## 三、設定網站網址（信件連結才會導回網站）

左側 **Authentication** → **URL Configuration**：

- **Site URL**：`https://kuohappiness.github.io/english-kitten-academy/`
- **Redirect URLs** → Add URL：`https://kuohappiness.github.io/english-kitten-academy/**`

## 四、用 Gmail 寄信

Supabase 內建的寄信只能寄給專案管理者自己，所以要接 Gmail 才能寄給學生。

**1. 產生 Gmail 應用程式密碼**（需要先開啟 Google 帳戶的兩步驟驗證）

- 到 https://myaccount.google.com/apppasswords
- 名稱填 `Supabase` → 建立 → 會顯示一組 16 個字母的密碼，**複製下來**（只會顯示一次）

**2. 填到 Supabase**：**Authentication** → **Emails** → **SMTP Settings** → 開啟 **Enable Custom SMTP**

| 欄位 | 填入 |
|---|---|
| Sender email | 你的 Gmail 地址 |
| Sender name | 喵喵英文拼句學院 |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | 你的 Gmail 地址 |
| Password | 剛剛的 16 字應用程式密碼（不含空格） |

**3. 提高寄信上限**：**Authentication** → **Rate Limits** → 「Rate limit for sending emails」改成 `100`（預設每小時 30 封，全班同時註冊可能不夠）。Gmail 本身每天約可寄 500 封。

## 五、信件改成中文（建議）

**Authentication** → **Emails** → **Templates**：

**Confirm signup**
- Subject：`【喵喵英文】請確認你的 Email`
- Body：
```html
<h2>🐱 歡迎加入喵喵英文拼句學院！</h2>
<p>請點下面的連結完成註冊，之後就可以用 Email 和密碼登入：</p>
<p><a href="{{ .ConfirmationURL }}">✅ 確認我的 Email</a></p>
<p>如果你沒有註冊過，請忽略這封信。</p>
```

**Reset Password**
- Subject：`【喵喵英文】重設密碼`
- Body：
```html
<h2>🔑 重設喵喵英文的密碼</h2>
<p>請點下面的連結設定新密碼：</p>
<p><a href="{{ .ConfirmationURL }}">設定新密碼</a></p>
<p>如果不是你本人要求的，請忽略這封信，原本的密碼不會改變。</p>
```

## 六、把金鑰填進網站

1. 左側 **Project Settings** → **API**（或 **Data API**）
2. 複製 **Project URL** 和 **anon public** key（⚠️ 不是 `service_role`）
3. 填進 repo 的 `config.js`：

```js
window.CLOUD_CONFIG = {
  url: 'https://xxxxxxxx.supabase.co',
  anonKey: 'eyJhbGciOi...',
};
```

anon key 本來就是給網頁公開使用的，資料安全由資料庫權限保護（學生只能讀自己的紀錄，分數由伺服器計算）。

---

## 注意事項

- **免費專案閒置 7 天會自動暫停**：期間沒人登入，Supabase 會暫停專案（資料不會刪），到後台按 **Restore** 即可恢復。學期中有人在用就不會發生。
- **看學生作答紀錄**：後台 **Table Editor** → `attempts` 表，可以看到每一次作答與答錯時排出的句子；`progress` 表是每一句的狀態。
- **學生忘記 Email**：後台 **Authentication** → **Users** 可以查到所有帳號。
- **刪除帳號**：在 **Authentication** → **Users** 刪除，該學生的紀錄會一併刪除。
- 單機版時期的舊紀錄不會自動搬到雲端，學生註冊後從 0 分開始。
