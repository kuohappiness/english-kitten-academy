// 大家說英語分頁：題庫在 lessons/letstalk/（例如 lt02-photos.json）
// 每課有「重點提醒」投影片＋學習單（字母選項填空、圈選題）。成績只存在這台裝置，不影響闖關積分。
(function(){
 const FILES = ['letstalk/lt02-photos.json'];
 const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
 let lessons = null;
 const css = document.createElement('style');
 css.textContent = `.lt-bank{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin:10px 0 16px}
@media(min-width:700px){.lt-bank{position:sticky;top:0;z-index:2;background:#fffffff2;padding:8px 0;margin:6px 0 10px;box-shadow:0 6px 8px -8px #765c4560}}
.lt-bank div{background:#fdf6e8;border:2px solid #efdcb6;border-radius:12px;padding:7px 10px;font-weight:800;color:#644f40}.lt-bank b{color:#c0703a;margin-right:8px}
.lt-text{font-size:18px;line-height:2.3;color:#4b3b31}.lt-line{margin:2px 0}.lt-who{font-weight:900;color:#81675b;margin-right:6px}
.lt-label{font-weight:900;color:#3d8b74;margin:16px 0 2px}.lt-note{font-style:italic;color:#8d7567;font-weight:400;margin-left:6px}
.lt-blank{display:inline-flex;align-items:center;gap:3px;white-space:nowrap;max-width:100%}.lt-blank select{max-width:min(240px,70vw)}.lt-blank em{font-style:normal;font-size:13px;color:#a48b6d;font-weight:900}
.lt-blank select{padding:3px 6px;border:2px solid #f1d7c0;border-bottom:3px solid #d6a97b;border-radius:9px;background:#fff9e9;color:#674e40;font-weight:900;font-size:16px}
.lt-blank.ok select{border-color:#39aa73;background:#d9f9e5}.lt-blank.no select{border-color:#e05a6b;background:#ffe5e9}
.lt-fix{font-size:14px;color:#c52d40;font-weight:900}.lt-exp{font-size:13px;color:#8d7567;font-weight:700}
.lt-sec{border-top:2px dashed #f2e1d2;padding-top:12px;margin-top:20px}.lt-sec h3{color:#63493f;margin:6px 0}
.lt-chart{display:grid;gap:5px;margin:8px 0 14px}.lt-bar{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:800;color:#644f40}
.lt-bar span{flex:0 0 190px}.lt-bar i{display:block;height:16px;border-radius:8px;background:linear-gradient(90deg,#ffb782,#ff9a6b)}
.lt-slide{min-height:300px}.lt-slide h2{color:#63493f;margin:4px 0 14px}.lt-slide li{margin:8px 0;line-height:1.7;font-size:17px}
.lt-ex{background:#f2faf7;border-radius:14px;padding:10px 14px;margin:12px 0}.lt-ex p{margin:6px 0;font-weight:800;color:#3c5f53;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.lt-say{border:0;background:#fff;border-radius:50%;width:34px;height:34px;box-shadow:0 2px 0 #b5dfc7;flex:0 0 auto}.lt-ex p{flex-wrap:nowrap!important}
.lt-tip{background:#fff7e5;border:1px solid #f3daab;border-radius:14px;padding:10px 14px;font-weight:800;color:#8a5a2b}
.lt-stars{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 12px;font-size:14px;font-weight:800;color:#8d7567}
.lt-star{border:2px solid #f1d7c0;background:#fff;border-radius:20px;padding:5px 10px;font-weight:900;color:#82645a;font-size:13px}.lt-star.on{background:#ffe3c9;border-color:#ffab75;color:#633d24}
.lt-card{border:2px solid #f3e3d6;border-radius:18px;padding:12px 16px;margin:12px 0}.lt-card h3{margin:4px 0 8px;color:#63493f}.lt-card.done{opacity:.45}
.lt-dots{display:flex;gap:5px;justify-content:center;margin:14px 0 4px}.lt-dots i{width:9px;height:9px;border-radius:50%;background:#f0e0d2}.lt-dots i.on{background:#ffab75}
@media(max-width:550px){.lt-text{font-size:16px}.lt-bar span{flex-basis:130px;font-size:12px}}`;
 document.head.appendChild(css);

 const storeKey = () => 'kitten-academy-letstalk:' + (db.active || '訪客');
 const loadBest = () => { try { return JSON.parse(localStorage.getItem(storeKey()) || '{}'); } catch (_) { return {}; } };
 const saveBest = (id, right, n) => {
   if (guest) return;
   try { const b = loadBest(); if (!b[id] || right > b[id].right) { b[id] = {right, n, at: Date.now()}; localStorage.setItem(storeKey(), JSON.stringify(b)); } } catch (_) {}
 };
 // 重點提醒熟悉度（1 熟練、2 普通、3 不熟悉）與學習單最近一次錯題；訪客只存在這次瀏覽
 const mem = {};
 const getJ = k => { if (guest) return mem[k] || {}; try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch (_) { return {}; } };
 const setJ = (k, v) => { if (guest) { mem[k] = v; return; } try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
 const starKey = () => 'kitten-academy-letstalk-stars:' + (db.active || '訪客');
 const wrongKey = () => 'kitten-academy-letstalk-wrong:' + (db.active || '訪客');
 const starsOf = l => getJ(starKey())[l.id] || {};
 const setStar = (l, i, v) => { const all = getJ(starKey()); all[l.id] = Object.assign(all[l.id] || {}, {[i]: v}); setJ(starKey(), all); };
 const wrongOf = l => getJ(wrongKey())[l.id] || [];
 const sprintCount = l => Object.values(starsOf(l)).filter(v => v >= 2).length + wrongOf(l).length;
 const LEVELS = [[1, '⭐', '熟練'], [2, '⭐⭐', '普通'], [3, '⭐⭐⭐', '不熟悉']];
 const starRow = (l, i) => { const cur = starsOf(l)[i];
   return `<div class="lt-stars"><span>我的熟悉度：</span>${LEVELS.map(([v, st, name]) => `<button type="button" class="lt-star ${cur === v ? 'on' : ''}" data-star="${v}" data-slide="${i}">${st} ${name}</button>`).join('')}</div>`; };
 function bindStars(l, after) {
   document.querySelectorAll('[data-star]').forEach(b => b.onclick = () => {
     setStar(l, +b.dataset.slide, +b.dataset.star);
     b.parentNode.querySelectorAll('.lt-star').forEach(x => x.classList.toggle('on', x === b));
     if (after) after(b);
   });
 }
 function slideBody(s) {
   return `<ul>${(s.points || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul>
     ${s.examples ? `<div class="lt-ex">${s.examples.map(e => `<p><button class="lt-say" type="button" data-say="${esc(e)}" aria-label="聽發音">🔊</button><span>${esc(e)}</span></p>`).join('')}</div>` : ''}
     ${s.tip ? `<div class="lt-tip">💡 ${esc(s.tip)}</div>` : ''}`;
 }
 async function load() {
   if (lessons) return lessons;
   lessons = (await Promise.all(FILES.map(async f => { try { return await (await fetch('lessons/' + f, {cache: 'no-cache'})).json(); } catch (_) { return null; } }))).filter(Boolean);
   return lessons;
 }
 const blanksOf = l => l.sections.reduce((n, s) => n + Object.keys(s.answers).length, 0);
 const pts = (right, n) => Math.round(right * 100 / n * 10) / 10;

 // 分頁按鈕：包住 app.js 的 header()
 const origHeader = header;
 header = function() {
   origHeader();
   const nav = $('tabs');
   if (!db.active || !nav.firstChild) return;
   const b = document.createElement('button');
   b.className = 'tab' + (String(stage).startsWith('lt') ? ' active' : '');
   b.textContent = '🗣️ 大家說英語';
   b.onclick = ltHome;
   nav.insertBefore(b, nav.children[1] || null);
 };

 async function ltHome() {
   stage = 'lt-home'; header();
   $('app').innerHTML = '<p class="smallnote">🐾 載入中…</p>';
   const list = await load(), best = loadBest();
   if (stage !== 'lt-home') return;
   $('app').innerHTML = `<div class="homecard"><h2>🗣️ 大家說英語</h2><p>每一課先看「重點提醒」並幫每頁標上熟悉度，再寫學習單。標成「普通」「不熟悉」的重點和學習單答錯的題目，會集中到「🔥 考前衝刺」。學習單成績只記在這台裝置上，不影響闖關積分。</p></div>
     ${list.length ? list.map(l => { const b = best[l.id], n = blanksOf(l);
       return `<div class="lesson-row"><div><strong>${esc(l.title)}</strong><br><small>${esc(l.subtitle || '')} · 學習單 ${n} 格${b ? ` · 最佳 ${pts(b.right, b.n)} 分` : ''}</small></div>
       <div class="actions" style="margin:0"><button class="btn mint" data-slides="${esc(l.id)}">📖 重點提醒</button><button class="btn primary" data-sheet="${esc(l.id)}">✍️ 學習單</button>${sprintCount(l) ? `<button class="btn secondary" data-sprint="${esc(l.id)}">🔥 考前衝刺（${sprintCount(l)}）</button>` : ''}</div></div>`; }).join('') : '<p class="smallnote">課程準備中。</p>'}
     <p class="smallnote">課文內容出自《大家說英語》（空中英語教室），本站僅供教學練習，請支持正版教材。</p>`;
   const find = id => list.find(l => l.id === id);
   document.querySelectorAll('[data-slides]').forEach(b => b.onclick = () => slides(find(b.dataset.slides), 0));
   document.querySelectorAll('[data-sheet]').forEach(b => b.onclick = () => sheet(find(b.dataset.sheet)));
   document.querySelectorAll('[data-sprint]').forEach(b => b.onclick = () => sprint(find(b.dataset.sprint)));
 }

 // 考前衝刺：不熟悉 → 普通 的重點提醒，加上學習單最近一次答錯的格子
 function sprint(l) {
   stage = 'lt-sprint'; header();
   const stars = starsOf(l), wrong = wrongOf(l);
   const picks = l.slides.map((s, i) => [s, i, stars[i]]).filter(x => x[2] >= 2).sort((a, b) => b[2] - a[2] || a[1] - b[1]);
   $('app').innerHTML = `<div class="statline"><strong>🔥 ${esc(l.title)} · 考前衝刺</strong><span>${picks.length} 個重點 · ${wrong.length} 題錯題</span></div>
     <p class="smallnote">練熟了就把熟悉度改成「⭐ 熟練」，下次就不會出現在這裡。學習單重寫後，錯題會換成最新一次的結果。</p>
     ${picks.length ? `<div class="sectionlabel">📖 還不熟的重點</div>${picks.map(([s, i]) => `<div class="lt-card"><h3>${esc(s.title)}</h3>${starRow(l, i)}${slideBody(s)}</div>`).join('')}` : ''}
     ${wrong.length ? `<div class="sectionlabel">✍️ 學習單錯題（最近一次）</div><div class="lt-card">${wrong.map(w => `<div class="lt-ex" style="margin:8px 0"><b>${esc(w.num)}.</b> ${esc(w.text)}${w.opts ? `<br><span class="lt-exp">（${esc(w.opts)}）</span>` : ''}<details><summary class="lt-exp" style="cursor:pointer">先想想，再點這裡看答案</summary><span class="lt-fix">答案：${esc(w.ans)}</span>${w.exp ? ` <span class="lt-exp">（${esc(w.exp)}）</span>` : ''}</details></div>`).join('')}</div>` : ''}
     ${picks.length || wrong.length ? '' : '<p class="quiz-info">目前沒有需要衝刺的項目，太棒了！</p>'}
     <div class="actions"><button class="btn primary" id="lt-sheet">✍️ 再寫一次學習單</button><button class="btn secondary" id="lt-back">🗣️ 回課程列表</button></div>`;
   bindSpeak($('app'));
   bindStars(l, b => b.closest('.lt-card').classList.toggle('done', b.dataset.star === '1'));
   $('lt-sheet').onclick = () => sheet(l);
   $('lt-back').onclick = ltHome;
 }

 function slides(l, i) {
   stage = 'lt-slides'; header();
   const s = l.slides[i], n = l.slides.length;
   $('app').innerHTML = `<div class="statline"><strong>📖 ${esc(l.title)} · 重點提醒</strong><span>${i + 1} / ${n}</span></div>
     <div class="lt-slide"><h2>${esc(s.title)}</h2>${starRow(l, i)}${slideBody(s)}</div>
     <div class="lt-dots">${l.slides.map((_, k) => `<i class="${k === i ? 'on' : ''}" title="${esc(['未標記', '熟練', '普通', '不熟悉'][starsOf(l)[k] || 0])}"></i>`).join('')}</div>
     <div class="actions"><button class="btn secondary" id="lt-prev" ${i ? '' : 'disabled'}>← 上一頁</button>
     ${i + 1 < n ? '<button class="btn primary" id="lt-next">下一頁 →</button>' : '<button class="btn primary" id="lt-go">✍️ 開始寫學習單</button>'}
     <button class="btn secondary" id="lt-back">🗣️ 回課程列表</button></div>`;
   bindSpeak($('app')); bindStars(l);
   $('lt-prev').onclick = () => slides(l, i - 1);
   if ($('lt-next')) $('lt-next').onclick = () => slides(l, i + 1);
   if ($('lt-go')) $('lt-go').onclick = () => sheet(l);
   $('lt-back').onclick = ltHome;
 }

 // {{n}} → 字母下拉選單（或圈選題的選項）
 function lineHtml(sec, text) {
   return esc(text).replace(/\{\{(\d+)\}\}/g, (_, num) => {
     const opts = sec.options && sec.options[num]
       ? sec.options[num].map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')
       : sec.bank.map((w, k) => `<option value="${LETTERS[k]}">${LETTERS[k]}  ${esc(w)}</option>`).join('');
     return `<span class="lt-blank" data-num="${num}" data-sec="${esc(sec.id)}"><em>${num}.</em><select aria-label="第 ${num} 格"><option value="">－</option>${opts}</select><span class="lt-fix"></span></span>`;
   });
 }
 function sheet(l) {
   stage = 'lt-sheet'; header();
   const n = blanksOf(l);
   $('app').innerHTML = `<div class="statline"><strong>✍️ ${esc(l.title)} · 學習單</strong><span>共 ${n} 格，每格 ${pts(1, n)} 分</span></div>
     <p class="smallnote">點空格就會列出這一大題的所有選項（字母＋單字），不用再往上找單字框；「圈選」題直接選正確的形式。每個字母只用一次。</p>
     ${l.sections.map(sec => `<div class="lt-sec"><h3>${esc(sec.title)}</h3>
       ${sec.chart ? `<div class="lt-chart">${sec.chart.map(([k, v]) => `<div class="lt-bar"><span>${esc(k)}</span><i style="width:${v * 2.5}%"></i>${v}%</div>`).join('')}</div>` : ''}
       <div class="lt-bank">${sec.bank.map((w, k) => `<div><b>${LETTERS[k]}</b>${esc(w)}</div>`).join('')}</div>
       <div class="lt-text">${sec.lines.map(ln => ln.label
         ? `<div class="lt-label">${esc(ln.label)}${ln.note ? `<span class="lt-note">${esc(ln.note)}</span>` : ''}</div>`
         : `<div class="lt-line">${ln.who ? `<span class="lt-who">${esc(ln.who)}:</span>` : ''}${lineHtml(sec, ln.text)}</div>`).join('')}</div></div>`).join('')}
     <div id="lt-result"></div>
     <div class="actions"><button class="btn primary" id="lt-submit">📮 交卷</button><button class="btn secondary" id="lt-back">🗣️ 回課程列表</button></div>`;
   $('lt-back').onclick = () => { if (!document.querySelector('.lt-blank select[disabled]') && [...document.querySelectorAll('.lt-blank select')].some(s => s.value) && !confirm('還沒交卷，確定離開嗎？')) return; ltHome(); };
   $('lt-submit').onclick = () => grade(l);
 }
 function grade(l) {
   const blanks = [...document.querySelectorAll('.lt-blank')];
   const empty = blanks.filter(b => !b.querySelector('select').value).length;
   if (empty && !confirm(`還有 ${empty} 格沒填，確定要交卷嗎？`)) return;
   let right = 0; const wrong = [];
   blanks.forEach(b => {
     const sec = l.sections.find(s => s.id === b.dataset.sec), num = b.dataset.num, ans = sec.answers[num], sel = b.querySelector('select');
     const ok = sel.value === ans; if (ok) right++;
     sel.disabled = true; b.classList.add(ok ? 'ok' : 'no');
     const word = sec.options && sec.options[num] ? ans : `${ans} ${sec.bank[LETTERS.indexOf(ans)]}`;
     const exp = sec.explain && sec.explain[num];
     if (!ok) {
       const ln = sec.lines.find(x => (x.text || '').includes('{{' + num + '}}'));
       const text = ln.text.replace('{{' + num + '}}', '【 ? 】').replace(/\{\{\d+\}\}/g, '____');
       wrong.push({num, text: (ln.who ? ln.who + ': ' : '') + text, ans: word, exp: exp || '', opts: sec.options && sec.options[num] ? sec.options[num].join(' / ') : ''});
     }
     b.querySelector('.lt-fix').innerHTML = (ok ? '' : ` → ${esc(word)}`) + (exp ? ` <span class="lt-exp">（${esc(exp)}）</span>` : '');
   });
   const n = blanks.length, score = pts(right, n);
   saveBest(l.id, right, n);
   const all = getJ(wrongKey()); all[l.id] = wrong; setJ(wrongKey(), all);
   if (score >= 80) party();
   $('lt-result').innerHTML = `<div class="feedback ${score >= 80 ? 'good' : ''}"><h3>${score >= 80 ? '😻🎉' : '🐱📚'} 得分 ${score} 分（答對 ${right} / ${n} 格）</h3><p class="muted">紅色的格子後面是正確答案和說明。${wrong.length ? '答錯的題目已放進「🔥 考前衝刺」。' : ''}</p></div>`;
   $('lt-submit').outerHTML = '<button class="btn primary" id="lt-again">🔁 重寫一次</button>' + (wrong.length ? '<button class="btn mint" id="lt-tosprint">🔥 考前衝刺</button>' : '');
   if ($('lt-tosprint')) $('lt-tosprint').onclick = () => sprint(l);
   $('lt-again').onclick = () => sheet(l);
   $('lt-result').scrollIntoView({behavior: 'smooth', block: 'center'});
 }
 window.ltHome = ltHome;
})();
