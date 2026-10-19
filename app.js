// 喵喵英文拼句學院 — 主程式
// 題庫放在 lessons/ 資料夾：新增單元只要新增一個 JSON 檔，並在 lessons/index.json 加一行。
// 主題代號格式為「單元:主題」（例如 unit05:take），不同單元的同名主題不會互相干擾。

let UNITS = [];      // [{id,title,subtitle,topics:[...]}]
let LESSONS = [];    // 所有主題攤平：{id:'unit05:take', unit, title, items:[[en,zh],...], grammar:[...]}
let currentUnit = null;

const KEY = 'kitten-academy-local-v3';
const OLD_KEY = 'kitten-academy-local-v2';
const LOG_LIMIT = 1000;  // 每位學員最多保留的作答紀錄筆數
const FIX_TO_CLEAR = 2;  // 錯題要「一次就答對」幾次才移出錯題本

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tokens = s => s.trim().split(/\s+/);

// ---------- 資料儲存 ----------
let db = {users: {}, active: null};
function loadDb() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && d.users) { db = d; return; }
    const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
    if (old && old.users) { db = migrateV2(old); save(); }
  } catch (e) {}
}
// 舊版（v2）紀錄只有主題代號（例如 take），一律視為 Unit 05 並轉成新格式
function migrateV2(old) {
  const fix = id => id.includes(':') ? id : 'unit05:' + id;
  for (const u of Object.values(old.users)) {
    const p = {};
    for (const [lid, recs] of Object.entries(u.progress || {})) {
      p[fix(lid)] = recs;
      for (const r of Object.values(recs)) { r.wrongCount = r.wrong ? 1 : 0; r.fix = 0; }
    }
    u.progress = p;
    const b = {};
    for (const lid of Object.keys(u.bonuses || {})) b[fix(lid)] = 0; // 舊紀錄沒有時間，記為 0
    u.bonuses = b;
    u.log = [];
  }
  return old;
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };

const me = () => db.users[db.active];
const topic = () => LESSONS.find(l => l.id === lesson);
const rec = (lid, i) => {
  const u = me();
  u.progress ??= {}; u.progress[lid] ??= {};
  return u.progress[lid][i] ??= {attempts: 0, correct: false, points: 0, wrong: false, wrongCount: 0, fix: 0};
};

// 記錄一次作答。firstTry＝這題這一輪的第一次嘗試（看過正解後重拼的不算）
function markResult(lid, i, ok, firstTry, answerWords) {
  const r = rec(lid, i), u = me();
  if (!ok) { r.wrong = true; r.wrongCount = (r.wrongCount || 0) + 1; r.fix = 0; }
  else if (r.wrong && firstTry) { r.fix = (r.fix || 0) + 1; if (r.fix >= FIX_TO_CLEAR) { r.wrong = false; r.fix = 0; } }
  u.log ??= [];
  u.log.push({t: Date.now(), lid, i, ok, ...(ok ? {} : {ans: answerWords.join(' ')})});
  if (u.log.length > LOG_LIMIT) u.log.splice(0, u.log.length - LOG_LIMIT);
  save();
}
window.markResult = markResult;

// ---------- 積分 ----------
const weekStart = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
function scoreOf(u, since = 0) {
  let s = 0;
  for (const recs of Object.values(u.progress || {}))
    for (const r of Object.values(recs))
      if ((r.pointsAt || 0) >= since || (!since)) s += r.points || 0;
  for (const t of Object.values(u.bonuses || {})) if (!since || (t || 0) >= since) s += 5;
  return s;
}
const total = () => scoreOf(me());
const stats = lid => {
  const l = LESSONS.find(x => x.id === lid), recs = (me()?.progress || {})[lid] || {};
  return {
    done: l.items.filter((_, i) => recs[i]?.correct).length,
    total: l.items.length,
    points: Object.values(recs).reduce((n, r) => n + (r.points || 0), 0),
    complete: l.items.every((_, i) => recs[i]?.correct),
  };
};
const wrongCount = lids => lids.reduce((n, lid) => n + Object.values(me().progress?.[lid] || {}).filter(r => r.wrong).length, 0);

// ---------- 小工具 ----------
function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  if (a.length > 1 && a.every((x, i) => x === i)) [a[0], a[1]] = [a[1], a[0]];
  return a;
}
function party() {
  const c = $('cat'); c.classList.add('party'); setTimeout(() => c?.classList.remove('party'), 2200);
  for (let i = 0; i < 23; i++) {
    const s = document.createElement('span'); s.className = 'sparkle'; s.textContent = ['🌟','💗','✨','🐾','🎉'][i % 5];
    s.style.left = (15 + Math.random() * 70) + 'vw'; s.style.top = (15 + Math.random() * 40) + 'vh';
    s.style.setProperty('--dx', (Math.random() * 240 - 120) + 'px');
    document.body.appendChild(s); setTimeout(() => s.remove(), 1500);
  }
}
// 🔊 用瀏覽器內建語音念英文句子
function speak(text) {
  if (!('speechSynthesis' in window)) { alert('這個瀏覽器不支援語音朗讀'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = 0.9;
  const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith('en'));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}
window.speak = speak;
const speakBtn = text => `<button class="btn secondary speak" type="button" data-say="${esc(text)}">🔊 聽發音</button>`;
function bindSpeak(root = document) { root.querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(b.dataset.say)); }
window.speakBtn = speakBtn; window.bindSpeak = bindSpeak;

// ---------- 頁面 ----------
let lesson = null, index = 0, bank = [], placed = [], status = '', stage = 'home', feedbackInfo = null;
let reviewMode = false, queue = [], tries = 0, grammarSeen = {}, grammarUsed = {};

function updateUnitChip() {
  const u = currentUnit;
  $('unit-chip').textContent = `📗 ${u.title}${u.subtitle ? ' · ' + u.subtitle : ''}`;
  document.title = `喵喵英文拼句學院 · ${u.title}`;
}

function header() {
  const nav = $('tabs');
  nav.innerHTML = db.active ? `<button class="tab ${stage==='home'?'active':''}" data-page="home">🏠 學習首頁</button><button class="tab ${stage==='ranking'?'active':''}" data-page="ranking">🏆 排行榜</button><button class="tab" data-page="logout">👋 切換學員</button>` : '';
  nav.querySelectorAll('button').forEach(b => b.onclick = () => {
    if (b.dataset.page === 'logout') { db.active = null; save(); home(); }
    else if (b.dataset.page === 'ranking') ranking();
    else home();
  });
}

function home() {
  stage = 'home'; header();
  if (!me()) {
    $('app').innerHTML = `<div class="homecard" style="text-align:center"><h2>🐱 歡迎來到喵喵英文學院！</h2><p>先輸入學員暱稱，就可以開始練習與累積星星。</p></div><div class="login-grid"><label>學員暱稱<input id="nickname" class="input" maxlength="20" autocomplete="nickname" placeholder="例如：小喵、Amy"></label><button class="btn primary" id="enter">🐾 開始學習</button><div class="leader-note">目前是單機體驗版：使用暱稱建立這台裝置上的學習檔案，<strong>不是雲端帳號或密碼登入</strong>，請勿在此輸入密碼。</div></div>`;
    const go = () => { const n = $('nickname').value.trim(); if (!n) { alert('先輸入暱稱喔！'); return; } if (!db.users[n]) db.users[n] = {progress: {}, bonuses: {}, log: []}; db.active = n; save(); home(); };
    $('enter').onclick = go; $('nickname').onkeydown = e => { if (e.key === 'Enter') go(); };
    return;
  }
  const unitLessons = LESSONS.filter(l => l.unit === currentUnit.id);
  const completed = unitLessons.filter(l => stats(l.id).complete).length;
  const wrongs = wrongCount(unitLessons.map(l => l.id));
  const unitPicker = UNITS.length > 1 ? `<div class="searchbox"><label for="unit-pick">📚 選擇單元</label><select class="input" id="unit-pick">${UNITS.map(u => `<option value="${esc(u.id)}" ${u.id===currentUnit.id?'selected':''}>${esc(u.title)}${u.subtitle?' · '+esc(u.subtitle):''}</option>`).join('')}</select></div>` : '';
  $('app').innerHTML = `<h2>🐾 ${esc(db.active)}，歡迎回來！</h2>
    <div class="scoreboard"><div class="scorebox"><b>⭐ ${total()}</b><small>累積積分</small></div><div class="scorebox"><b>${completed} / ${unitLessons.length}</b><small>本單元完成主題</small></div><div class="scorebox"><b>📝 ${wrongs}</b><small>待複習錯題</small></div></div>
    <p class="smallnote">第一次答對 3 分、第二次答對 2 分、第三次以後答對 1 分；每個句子只計分一次。完成一整個主題再加 5 分。錯題在速測或複習中「一次就答對」${FIX_TO_CLEAR} 次後會移出錯題本。</p>
    ${unitPicker}
    <div class="searchbox" id="search-wrap"><label for="searchword">🔎 搜尋單字或例句</label><input class="input" id="searchword" type="search" placeholder="輸入單字，例如：between、take、因為" autocomplete="off"><div class="smallnote" id="search-count"></div></div>
    <div id="lesson-list">${unitLessons.map(l => { const st = stats(l.id); return `<div class="lesson-card"><div><strong>${esc(l.title)}</strong><small>✅ ${st.done}/${st.total} 句 · ⭐ ${st.points} 分${st.complete?' · 已過關 🏅':''}</small></div><button class="btn ${st.complete?'secondary':'primary'}" data-start="${esc(l.id)}">${st.complete?'再次複習':'開始練習 →'}</button></div>`; }).join('')}</div>`;
  document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => start(b.dataset.start));
  if ($('unit-pick')) $('unit-pick').onchange = e => { currentUnit = UNITS.find(u => u.id === e.target.value); try { localStorage.setItem(KEY + ':unit', currentUnit.id); } catch (_) {} updateUnitChip(); home(); };
  const search = $('searchword');
  search.oninput = () => {
    const q = search.value.trim().toLowerCase(); let visible = 0;
    [...document.querySelectorAll('#lesson-list .lesson-card')].forEach((row, i) => {
      const l = unitLessons[i]; const show = !q || l.title.toLowerCase().includes(q) || l.items.some(a => a.join(' ').toLowerCase().includes(q));
      row.classList.toggle('hidden', !show); if (show) visible++;
    });
    $('search-count').textContent = q ? `符合 ${visible} 個單字主題` : '';
  };
  if (window.onHomeRendered) window.onHomeRendered();
}

let rankMode = 'week';
function ranking() {
  stage = 'ranking'; header();
  const since = rankMode === 'week' ? weekStart() : 0;
  const people = Object.entries(db.users).map(([name, u]) => ({name, score: scoreOf(u, since)}))
    .filter(p => rankMode === 'all' || p.score > 0)
    .sort((a, b) => b.score - a.score).slice(0, 10);
  $('app').innerHTML = `<h2>🏆 本裝置積分榜</h2>
    <div class="actions"><button class="btn ${rankMode==='week'?'primary':'secondary'}" data-rank="week">📅 本週</button><button class="btn ${rankMode==='all'?'primary':'secondary'}" data-rank="all">🌟 總積分</button></div>
    <p class="leader-note">${rankMode==='week'?'本週（從星期一開始）新獲得的積分。':'所有累積積分。'}目前只會列出<strong>同一瀏覽器中建立的學員</strong>，雲端排行榜將在下一階段串接。</p>
    ${people.length ? `<table class="ranking"><tr><th>排名</th><th>暱稱</th><th>積分</th></tr>${people.map((u, i) => `<tr><td>${i<3?['🥇','🥈','🥉'][i]:'#'+(i+1)}</td><td>${esc(u.name)}</td><td>⭐ ${u.score}</td></tr>`).join('')}</table>` : '<p class="smallnote">本週還沒有人得分，快去練習搶第一！</p>'}
    <div class="actions"><button class="btn primary" id="gohome">返回學習首頁</button></div>`;
  document.querySelectorAll('[data-rank]').forEach(b => b.onclick = () => { rankMode = b.dataset.rank; ranking(); });
  $('gohome').onclick = home;
}

// 開始一個主題：未過關→練習沒答對的句子；已過關→複習模式（全部句子隨機一輪，不計分）
function start(id) {
  lesson = id; grammarSeen = {};
  reviewMode = stats(id).complete;
  queue = reviewMode ? shuffle(topic().items.map((_, i) => i)) : [];
  advance();
}
function advance() {
  const l = topic();
  if (reviewMode) { if (!queue.length) { complete(); return; } index = queue.shift(); }
  else { const todo = l.items.map((_, i) => i).filter(i => !rec(lesson, i).correct); if (!todo.length) { complete(); return; } index = todo[0]; }
  bank = shuffle(tokens(l.items[index][0]).map((_, i) => i)); placed = []; status = ''; tries = 0; stage = 'play'; render();
}
function tile(id, where) {
  const word = tokens(topic().items[index][0])[id];
  return `<button class="tile ${where==='placed'?'placed':''}" draggable="true" data-id="${id}" title="點選或拖曳">${esc(word)}</button>`;
}
function render() {
  stage = 'play'; header();
  const l = topic(), st = stats(lesson), item = l.items[index];
  const progressDone = reviewMode ? l.items.length - queue.length - 1 : st.done;
  $('app').innerHTML = `<div class="statline"><span class="tiny">📖 ${esc(l.title)}${reviewMode?' · 🔁 複習模式（不計分）':''} · 第 ${index+1}/${l.items.length} 句</span><span class="tiny">⭐ ${total()} 分 · ✅ ${reviewMode?'已複習':'已完成'} ${progressDone}/${l.items.length}</span></div>
    <div class="progress"><div style="width:${progressDone / l.items.length * 100}%"></div></div>
    <div class="prompt"><small>看中文，把英文拼出來</small><h2>${esc(item[1])}</h2><p>💡 句號、逗號和英文單字放在一起</p></div>
    <div class="sectionlabel">✏️ 我的句子</div><div class="zone ${placed.length?'':'empty'}" id="answer-zone">${placed.map(i => tile(i, 'placed')).join('')}</div>
    <div class="sectionlabel">🧩 單字磚塊</div><div class="bank" id="bank-zone">${bank.filter(i => !placed.includes(i)).map(i => tile(i, 'bank')).join('')}</div>
    <div class="actions"><button class="btn primary" id="check" ${status || placed.length !== bank.length ? 'disabled' : ''}>✅ 檢查答案</button><button class="btn secondary" id="reset">🔀 重新排列</button><button class="btn secondary" id="back">🏠 回首頁</button></div>
    <div id="feedback"></div><p class="smallnote">${reviewMode ? '複習模式不會再加分，但錯題一樣會被記錄。' : '同一句首次答對才獲得積分，答錯後可以一直練到正確。'}</p>`;
  $('check').onclick = check;
  $('reset').onclick = () => { placed = []; bank = shuffle(tokens(item[0]).map((_, i) => i)); status = ''; render(); };
  $('back').onclick = home;
  document.querySelectorAll('.tile').forEach(t => {
    t.onclick = () => { if (status) return; const n = +t.dataset.id; placed = placed.includes(n) ? placed.filter(v => v !== n) : [...placed, n]; render(); };
    t.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', t.dataset.id));
  });
  for (const z of [$('answer-zone'), $('bank-zone')]) {
    z.ondragover = e => e.preventDefault();
    z.ondrop = e => {
      e.preventDefault(); if (status) return;
      const n = Number(e.dataTransfer.getData('text/plain'));
      if (!Number.isInteger(n) || n < 0 || n >= bank.length) return;
      placed = placed.filter(x => x !== n);
      if (z.id === 'answer-zone') { const target = e.target.closest('.tile'); const at = target ? placed.indexOf(+target.dataset.id) : -1; if (at < 0) placed.push(n); else placed.splice(at, 0, n); }
      render();
    };
  }
  if (status) feedback();
}
function check() {
  if (status || placed.length !== bank.length) return;
  const r = rec(lesson, index), words = tokens(topic().items[index][0]);
  const right = placed.every((id, i) => words[id] === words[i]);
  tries++;
  if (!reviewMode) r.attempts++;
  if (right && !reviewMode && !r.correct) {
    r.points = r.attempts === 1 ? 3 : r.attempts === 2 ? 2 : 1;
    r.correct = true; r.pointsAt = Date.now();
  }
  markResult(lesson, index, right, tries === 1, placed.map(id => words[id]));
  status = right ? 'right' : 'wrong';
  if (right) party();
  render();
}
function feedback() {
  const en = topic().items[index][0], ws = tokens(en), right = status === 'right';
  const aligned = ws.map((w, i) => `<span class="${!right && ws[placed[i]] !== w ? 'bad' : ''}">${esc(w)}</span>`).join(' ');
  $('feedback').innerHTML = right
    ? `<div class="feedback good"><h3>🐱🎉 答對了！太棒了！</h3><div class="answer">${aligned}</div><p>${reviewMode ? '複習完成這一句！' : `這句獲得 ⭐ ${rec(lesson, index).points} 分！`}</p><div class="actions">${speakBtn(en)}<button class="btn mint" id="continue">繼續挑戰下一句 →</button></div></div>`
    : `<div class="feedback"><h3>🐾 有些位置還需要調整，加油！</h3><p>紅色的部分是你這次排錯的位置：</p><div class="answer">${aligned}</div><p class="muted">讀完正確句子，再打亂重新拼一次。</p><div class="actions">${speakBtn(en)}<button class="btn primary" id="repeat">🔁 再試一次</button></div></div>`;
  bindSpeak($('feedback'));
  if (right) {
    $('continue').onclick = () => {
      const done = reviewMode ? topic().items.length - queue.length : stats(lesson).done;
      if (done > 0 && done % 3 === 0 && !grammarSeen[done]) { grammarSeen[done] = true; grammarQuiz(); }
      else advance();
    };
  } else {
    $('repeat').onclick = () => { bank = shuffle(ws.map((_, i) => i)); placed = []; status = ''; render(); };
  }
}
// 文法題：每個主題的題目輪流出，選項順序隨機
function grammarQuiz() {
  const questions = topic().grammar || [];
  if (!questions.length) { advance(); return; }
  stage = 'grammar'; header();
  grammarUsed[lesson] ??= [];
  let pool = questions.map((_, i) => i).filter(i => !grammarUsed[lesson].includes(i));
  if (!pool.length) { grammarUsed[lesson] = []; pool = questions.map((_, i) => i); }
  const qi = pool[Math.floor(Math.random() * pool.length)]; grammarUsed[lesson].push(qi);
  const q = questions[qi], order = shuffle(q.choices.map((_, i) => i));
  $('app').innerHTML = `<div class="statline"><span class="tiny">🌱 文法重點比較 · ${esc(topic().title)}</span><span class="tiny">不計額外積分</span></div>
    <div class="prompt grammar-prompt"><small>穿插練習：選出最正確的答案</small><h2>${esc(q.q)}</h2></div>
    <div class="grammar-options">${order.map(i => `<button class="grammar-option" data-choice="${i}">${esc(q.choices[i])}</button>`).join('')}</div>
    <div id="grammar-feedback"></div><div class="actions"><button class="btn secondary" id="grammar-skip">略過文法題，繼續拼句</button></div>`;
  const buttons = [...document.querySelectorAll('[data-choice]')];
  buttons.forEach(b => b.onclick = () => {
    const good = +b.dataset.choice === q.answer;
    buttons.forEach(x => { x.disabled = true; x.classList.toggle('correct', +x.dataset.choice === q.answer); x.classList.toggle('incorrect', x === b && !good); });
    $('grammar-feedback').innerHTML = `<div class="feedback ${good?'good':''}"><h3>${good?'🐱 文法正確！':'🐾 差一點！記住這個重點'}</h3><p>${esc(q.explain)}</p><button class="btn mint" id="grammar-next">繼續拼句 →</button></div>`;
    $('grammar-next').onclick = advance;
  });
  $('grammar-skip').onclick = advance;
}
function complete() {
  stage = 'complete'; header();
  me().bonuses ??= {};
  const bonus = !reviewMode && !(lesson in me().bonuses);
  if (bonus) { me().bonuses[lesson] = Date.now(); save(); }
  const l = topic(), unitLessons = LESSONS.filter(x => x.unit === l.unit), loc = unitLessons.findIndex(x => x.id === lesson), next = unitLessons[loc + 1];
  const unitTitle = UNITS.find(u => u.id === l.unit).title;
  $('app').innerHTML = `<div class="completion"><div class="completion-cat" aria-label="小貓慶祝">😻🎊</div><h1>${reviewMode ? '複習完成！' : '恭喜單字大過關！'}</h1><h2>${esc(l.title)}</h2>
    <p>${reviewMode ? `${l.items.length} 句全部複習完畢！` : `所有 ${l.items.length} 句都答對了，錯題也已補練完成！`}</p>
    <div class="scoreboard"><div class="scorebox"><b>⭐ ${stats(lesson).points}</b><small>本主題句子積分</small></div><div class="scorebox"><b>${bonus ? '+5' : reviewMode ? '複習' : '已領取'}</b><small>主題完成獎勵</small></div><div class="scorebox"><b>⭐ ${total()}</b><small>總積分</small></div></div>
    <div class="nextcard">${next ? `🐱 休息一下，準備好就去挑戰 <strong>${esc(next.title)}</strong>！` : `🏆 ${esc(unitTitle)} 全部主題練習完成！`}</div>
    <div class="actions"><button class="btn primary" id="next-lesson">${next ? '▶ 進入下一個主題' : '🏠 回到學習首頁'}</button><button class="btn secondary" id="home">學習首頁</button></div></div>`;
  if (!reviewMode) party();
  $('next-lesson').onclick = () => next ? start(next.id) : home();
  $('home').onclick = home;
}

// ---------- 啟動：讀取題庫 ----------
async function boot() {
  try {
    const idx = await (await fetch('lessons/index.json', {cache: 'no-cache'})).json();
    UNITS = await Promise.all(idx.units.map(async u => {
      const d = await (await fetch('lessons/' + u.file, {cache: 'no-cache'})).json();
      return {id: u.id, title: u.title, subtitle: u.subtitle, topics: d.topics};
    }));
  } catch (e) {
    $('app').innerHTML = `<div class="feedback"><h3>🙀 題庫載入失敗</h3><p>請確認網路連線後重新整理。若是直接雙擊開啟檔案，請改用網址（GitHub Pages）或本機伺服器開啟。</p></div>`;
    return;
  }
  LESSONS = UNITS.flatMap(u => u.topics.map(t => ({
    id: u.id + ':' + t.id, unit: u.id, title: t.title,
    items: t.items.map(x => [x.en, x.zh]), grammar: t.grammar || [],
  })));
  let saved = null; try { saved = localStorage.getItem(KEY + ':unit'); } catch (_) {}
  currentUnit = UNITS.find(u => u.id === saved) || UNITS[UNITS.length - 1];
  window.LESSONS = LESSONS; window.UNITS = UNITS;
  loadDb(); updateUnitChip(); home();
}
window.getCurrentUnit = () => currentUnit;
boot();
