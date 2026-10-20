#!/usr/bin/env node
// 題庫檢查工具：node tools/validate-lessons.js
// 檢查 lessons/index.json 與各單元 JSON 的格式。有錯誤時結束碼為 1（GitHub Actions 會顯示紅色 ✗）。
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'lessons');
const errors = [], warnings = [];
const err = (where, msg) => errors.push(`✗ ${where}：${msg}`);
const warn = (where, msg) => warnings.push(`⚠ ${where}：${msg}`);

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); }
  catch (e) { err(file, '無法讀取或不是合法的 JSON（' + e.message + '）'); return null; }
}

const idx = readJson('index.json');
if (idx) {
  if (!Array.isArray(idx.units) || !idx.units.length) err('index.json', '需要有 "units" 陣列');
  const unitIds = new Set();
  let total = 0;
  for (const [n, u] of (idx.units || []).entries()) {
    const w = `index.json 第 ${n + 1} 個單元`;
    if (!/^unit\d{2}$/.test(u.id || '')) err(w, `id 必須是 unit + 兩位數字，例如 unit07（目前是 "${u.id}"）`);
    if (unitIds.has(u.id)) err(w, `id "${u.id}" 重複`);
    unitIds.add(u.id);
    if (!u.title) err(w, '缺少 title');
    if (!u.file) continue; // 沒有 file＝「準備中」的單元
    if (u.file !== u.id + '.json') warn(w, `建議檔名為 ${u.id}.json（目前是 ${u.file}）`);
    if (!fs.existsSync(path.join(dir, u.file))) { err(w, `找不到檔案 lessons/${u.file}`); continue; }
    const d = readJson(u.file);
    if (!d) continue;
    if (d.id && d.id !== u.id) err(u.file, `檔案內的 id "${d.id}" 和 index.json 的 "${u.id}" 不一致`);
    if (!Array.isArray(d.topics) || !d.topics.length) { err(u.file, '需要有至少一個 topics'); continue; }
    const topicIds = new Set();
    for (const [ti, t] of d.topics.entries()) {
      const tw = `${u.file} 主題 #${ti + 1}（${t.title || t.id || '?'}）`;
      if (!/^[a-z0-9-]+$/.test(t.id || '')) err(tw, `id 只能用小寫英文、數字、減號（目前是 "${t.id}"）`);
      if (topicIds.has(t.id)) err(tw, `主題 id "${t.id}" 在同一單元重複`);
      topicIds.add(t.id);
      if (!t.title) err(tw, '缺少 title');
      if (!Array.isArray(t.items) || !t.items.length) { err(tw, '需要至少一個例句 items'); continue; }
      for (const [ii, it] of t.items.entries()) {
        const iw = `${tw} 例句 #${ii + 1}`;
        if (typeof it.en !== 'string' || !it.en.trim()) { err(iw, '缺少英文 en'); continue; }
        if (typeof it.zh !== 'string' || !it.zh.trim()) err(iw, '缺少中文 zh');
        if (it.en !== it.en.trim() || /\s{2,}/.test(it.en)) err(iw, `英文前後或中間有多餘空白："${it.en}"`);
        const words = it.en.trim().split(/\s+/).length;
        if (words < 2) err(iw, '英文至少要有 2 個字才能拼句');
        if (words > 25) warn(iw, `句子有 ${words} 個字，對學生可能太長`);
        if (/[一-鿿]/.test(it.en)) err(iw, '英文句子裡出現中文字');
        total++;
      }
      for (const [gi, g] of (t.grammar || []).entries()) {
        const gw = `${tw} 文法題 #${gi + 1}`;
        if (!g.q) err(gw, '缺少題目 q');
        if (!Array.isArray(g.choices) || g.choices.length < 2) { err(gw, 'choices 至少要 2 個選項'); continue; }
        if (!Number.isInteger(g.answer) || g.answer < 0 || g.answer >= g.choices.length) err(gw, `answer 必須是 0 到 ${g.choices.length - 1} 之間的整數（正確選項的位置，從 0 開始）`);
        if (new Set(g.choices).size !== g.choices.length) err(gw, '選項有重複');
        if (!g.explain) warn(gw, '建議加上解說 explain');
      }
      if (!(t.grammar || []).length) warn(tw, '沒有文法題（可選，但建議每個主題 2–3 題）');
    }
  }
  if (!errors.length) console.log(`題庫共 ${unitIds.size} 個單元、${total} 個例句。`);
}

warnings.forEach(w => console.log(w));
if (errors.length) {
  errors.forEach(e => console.log(e));
  console.log(`\n共 ${errors.length} 個錯誤，請修正後再上傳。`);
  process.exit(1);
}
console.log('✓ 題庫格式正確');
