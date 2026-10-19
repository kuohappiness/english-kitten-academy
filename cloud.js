// 雲端模組：帳號（註冊／登入／忘記密碼）與學習紀錄同步，使用 Supabase。
// config.js 沒填設定時 Cloud.enabled = false，網站維持單機版。
window.Cloud = (function () {
  const cfg = window.CLOUD_CONFIG || {};
  const configured = !!(cfg.url && cfg.anonKey);
  const enabled = configured;
  let sb = null, recovery = false;
  // Supabase 讀取連結後會清掉網址，所以一載入就先記下是不是從「重設密碼」信件點進來的
  const fromRecoveryLink = /type=recovery/.test(location.hash + location.search);

  // Supabase 英文錯誤訊息 → 中文
  function zh(err) {
    const m = (err && (err.message || err.error_description || String(err))) || '';
    const map = [
      [/invalid login credentials/i, 'Email 或密碼不正確。'],
      [/email not confirmed/i, '這個 Email 還沒完成驗證，請先到信箱點確認連結。'],
      [/already registered|already exists/i, '這個 Email 已經註冊過了，請直接登入或使用「忘記密碼」。'],
      [/password should be at least|weak password/i, '密碼太短，至少需要 6 個字元。'],
      [/rate limit|too many/i, '寄信次數太頻繁，請稍等幾分鐘再試。'],
      [/invalid email|unable to validate email/i, 'Email 格式不正確。'],
      [/same.*password|different from the old/i, '新密碼不能和舊密碼一樣。'],
      [/database error saving new user/i, '這個暱稱可能已經有人使用，請換一個。'],
      [/failed to fetch|network/i, '無法連線，請檢查網路後再試。'],
    ];
    for (const [re, t] of map) if (re.test(m)) return t;
    return '發生錯誤：' + m;
  }
  const must = ({data, error}) => { if (error) throw new Error(zh(error)); return data; };
  const siteUrl = () => location.origin + location.pathname;

  async function init(onChange) {
    if (!enabled) return null;
    if (!window.supabase) throw new Error('雲端元件載入失敗，請檢查網路後重新整理。');
    sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { recovery = true; onChange && onChange('recovery'); }
    });
    const {data} = await sb.auth.getSession();
    // 從重設密碼信件連結回來時，網址會帶 type=recovery
    if (fromRecoveryLink && data.session) recovery = true;
    return data.session;
  }

  async function signUp(email, password, nickname) {
    const free = must(await sb.rpc('nickname_available', {p_nickname: nickname}));
    if (!free) throw new Error('這個暱稱已經有人使用，請換一個。');
    const data = must(await sb.auth.signUp({email, password, options: {data: {nickname}, emailRedirectTo: siteUrl()}}));
    // 已註冊過的 Email，Supabase 會回傳沒有身分資料的使用者
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
      throw new Error('這個 Email 已經註冊過了，請直接登入或使用「忘記密碼」。');
    return {needsConfirm: !data.session};
  }
  async function signIn(email, password) { return must(await sb.auth.signInWithPassword({email, password})).session; }
  async function signOut() { await flush(); setPending([]); await sb.auth.signOut(); }
  async function sendReset(email) { must(await sb.auth.resetPasswordForEmail(email, {redirectTo: siteUrl()})); }
  async function resendConfirm(email) { must(await sb.auth.resend({type: 'signup', email, options: {emailRedirectTo: siteUrl()}})); }
  async function updatePassword(password) {
    must(await sb.auth.updateUser({password}));
    recovery = false;
    history.replaceState(null, '', siteUrl());
  }

  // 讀取目前學員的全部紀錄，整理成和單機版相同的格式
  async function loadUser() {
    const {data: {user}} = await sb.auth.getUser();
    if (!user) return null;
    const prof = must(await sb.from('profiles').select('nickname').eq('id', user.id).maybeSingle());
    const progress = {}, bonuses = {};
    for (let from = 0; ; from += 1000) {   // 分頁讀取，避免一次超過上限
      const rows = must(await sb.from('progress').select('*').range(from, from + 999));
      for (const r of rows) {
        (progress[r.lid] ??= {})[r.item] = {
          attempts: r.attempts, correct: r.correct, points: r.points,
          pointsAt: r.points_at ? Date.parse(r.points_at) : 0,
          wrong: r.wrong, wrongCount: r.wrong_count, fix: r.fix,
        };
      }
      if (rows.length < 1000) break;
    }
    for (const b of must(await sb.from('bonuses').select('lid,at'))) bonuses[b.lid] = Date.parse(b.at);
    return {nickname: prof?.nickname || user.email.split('@')[0], email: user.email, progress, bonuses, log: []};
  }

  // 寫入失敗時先排隊，下次成功連線再補送，避免網路不穩時紀錄遺失
  const PENDING = 'kitten-cloud-pending';
  const pending = () => { try { return JSON.parse(localStorage.getItem(PENDING) || '[]'); } catch (e) { return []; } };
  const setPending = q => { try { localStorage.setItem(PENDING, JSON.stringify(q)); } catch (e) {} };
  let flushing = false;
  async function flush() {
    if (flushing || !sb) return; flushing = true;
    try {
      let q = pending();
      while (q.length) {
        const {fn, args} = q[0];
        const {error} = await sb.rpc(fn, args);
        if (error && /failed to fetch|network/i.test(error.message)) break; // 還沒連上網，下次再送
        q.shift(); setPending(q);
      }
    } finally { flushing = false; }
  }
  function send(fn, args) { const q = pending(); q.push({fn, args}); setPending(q); return flush(); }

  const recordAttempt = (lid, item, ok, first, answer, scoring) =>
    send('record_attempt', {p_lid: lid, p_item: item, p_ok: ok, p_first: first, p_answer: answer || '', p_scoring: !!scoring});
  const claimBonus = (lid, total) => send('claim_bonus', {p_lid: lid, p_total: total});
  async function leaderboard(since) {
    await flush();
    return must(await sb.rpc('leaderboard', {p_since: since ? new Date(since).toISOString() : null}));
  }
  window.addEventListener('online', () => flush());

  return {enabled, init, signUp, signIn, signOut, sendReset, resendConfirm, updatePassword, loadUser,
          recordAttempt, claimBonus, leaderboard, flush, get recovery() { return recovery; }};
})();
