// 雲端設定：填入 Supabase 專案的網址與 anon public key 後，網站就會改用雲端帳號。
// 兩個值都留空＝單機版（資料只存在這台裝置）。
// anon key 是設計給網頁公開使用的，放在這裡是安全的；請「不要」放 service_role key。
window.CLOUD_CONFIG = {
  url: '',
  anonKey: '',
};
