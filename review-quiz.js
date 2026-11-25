// 總複習選擇題模組：題庫在 lessons/review/（例如 unit01-03.json），每組約 20 題，四選一
// 成績只存在這台裝置（localStorage），不影響闖關積分與排行榜
(function(){
 const FILES = ['review/unit01-03.json'];
 let sets = null, run = null;
 const shuffleArr = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
 const storeKey = () => 'kitten-academy-review:' + (db.active || '訪客');
 const loadBest = () => { try { return JSON.parse(localStorage.getItem(storeKey()) || '{}'); } catch (_) { return {}; } };
 const saveBest = (key, score, n) => {
   if (guest) return;
   try { const b = loadBest(); if (!b[key] || score > b[key].score) { b[key] = {score, n, at: Date.now()}; localStorage.setItem(storeKey(), JSON.stringify(b)); } } catch (_) {}
 };
 async function load() {
   if (sets) return sets;
   sets = (await Promise.all(FILES.map(async f => { try { return await (await fetch('lessons/' + f, {cache: 'no-cache'})).json(); } catch (_) { return null; } }))).filter(Boolean);
   return sets;
 }
 // 挖空題答完後把答案填回句子
 const filled = q => q.q.replace('____', q.choices[q.answer]);

 function card(set) {
   const best = loadBest();
   return `<div class="homecard"><h2>📝 ${esc(set.title)}</h2><p>${esc(set.subtitle || '')}，共 ${set.groups.reduce((s, g) => s + g.questions.length, 0)} 題。選一組開始作答吧！</p>
     <div class="unit-buttons" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">${set.groups.map(g => { const b = best[set.id + ':' + g.id];
       return `<button class="btn ${b ? 'secondary' : 'primary'}" data-review="${esc(set.id)}" data-group="${esc(g.id)}" style="white-space:nowrap;padding:12px 10px">${esc(g.title)}${b ? ` · 最佳 ${b.score}/${b.n}` : ''}</button>`; }).join('')}</div>
     <p class="smallnote">總複習成績只記在這台裝置上，不影響闖關積分。</p></div>`;
 }
 function start(set, group, only) {
   const qs = only || group.questions;
   run = {set, group, list: shuffleArr(qs), at: 0, right: 0, wrong: [], retry: !!only};
   ask();
 }
 function ask() {
   stage = 'review'; header();
   const q = run.list[run.at], order = shuffleArr(q.choices.map((_, i) => i));
   $('app').innerHTML = `<div class="statline"><strong>📝 ${esc(run.set.title)} · ${esc(run.group.title)}${run.retry ? '（錯題重做）' : ''}</strong><span>第 ${run.at + 1} / ${run.list.length} 題</span></div>
     <div class="progress"><div style="width:${run.at / run.list.length * 100}%"></div></div>
     <div class="prompt grammar-prompt"><small>${q.type === 'cloze' ? '課本例句：選出空格中最適合的字' : '進階題：選出最正確的答案'}</small><h2>${esc(q.q)}</h2></div>
     <div class="grammar-options">${order.map(i => `<button class="grammar-option" data-choice="${i}">${esc(q.choices[i])}</button>`).join('')}</div>
     <div id="review-feedback"></div>
     <div class="actions"><button class="btn secondary" id="review-exit">🏠 結束測驗</button></div>`;
   const buttons = [...document.querySelectorAll('[data-choice]')];
   buttons.forEach(b => b.onclick = () => {
     const good = +b.dataset.choice === q.answer;
     buttons.forEach(x => { x.disabled = true; x.classList.toggle('correct', +x.dataset.choice === q.answer); x.classList.toggle('incorrect', x === b && !good); });
     if (good) { run.right++; party(); } else run.wrong.push(q);
     const sentence = q.type === 'cloze' ? filled(q) : '';
     $('review-feedback').innerHTML = `<div class="feedback ${good ? 'good' : ''}"><h3>${good ? '🐱🎉 答對了！' : '🐾 差一點！正確答案是「' + esc(q.choices[q.answer]) + '」'}</h3>
       ${sentence ? `<div class="answer">${esc(sentence)}</div><p>${esc(q.zh || '')}</p>` : ''}
       <p class="muted">${esc(q.explain || '')}</p>
       <div class="actions">${sentence ? speakBtn(sentence) : ''}<button class="btn mint" id="review-next">${run.at + 1 < run.list.length ? '下一題 →' : '看成績 →'}</button></div></div>`;
     bindSpeak($('review-feedback'));
     $('review-next').onclick = () => { run.at++; run.at < run.list.length ? ask() : finish(); };
   });
   $('review-exit').onclick = () => { if (confirm('確定結束這次測驗嗎？')) { run = null; home(); } };
 }
 function finish() {
   stage = 'review-end'; header();
   const n = run.list.length, pct = Math.round(100 * run.right / n);
   if (!run.retry) saveBest(run.set.id + ':' + run.group.id, run.right, n);
   const wrong = run.wrong;
   $('app').innerHTML = `<div class="quiz-finish"><div class="completion-cat">${pct >= 80 ? '😻🎊' : '🐱📚'}</div><h1>${esc(run.group.title)} 完成！</h1><p>${esc(run.set.title)}${run.retry ? '（錯題重做）' : ''}</p>
     <div class="scoreboard"><div class="scorebox"><b>${pct}%</b><small>答對率</small></div><div class="scorebox"><b>${run.right} / ${n}</b><small>答對題數</small></div><div class="scorebox"><b>${wrong.length}</b><small>答錯題數</small></div></div>
     ${wrong.length ? `<div class="quiz-info" style="text-align:left"><strong>答錯的題目</strong>${wrong.map(q => `<p>• ${esc(q.type === 'cloze' ? filled(q) : q.q)}<br><span class="muted">答案：${esc(q.choices[q.answer])}</span></p>`).join('')}</div>` : '<p class="quiz-info">全部答對，太厲害了！</p>'}
     <div class="actions">${wrong.length ? '<button class="btn primary" id="review-wrong">🐾 重做答錯的題目</button>' : ''}<button class="btn ${wrong.length ? 'secondary' : 'primary'}" id="review-again">🔁 整組再做一次</button><button class="btn secondary" id="review-home">🏠 回首頁</button></div></div>`;
   if (pct >= 80) party();
   const {set, group} = run;
   if ($('review-wrong')) $('review-wrong').onclick = () => start(set, group, wrong);
   $('review-again').onclick = () => start(set, group);
   $('review-home').onclick = () => { run = null; home(); };
 }
 const previous = window.onHomeRendered;
 window.onHomeRendered = function() {
   if (previous) previous();
   run = null;
   load().then(list => {
     const search = $('search-wrap');
     if (!search || stage !== 'home' || $('review-box') || !list.length) return;
     const box = document.createElement('div'); box.id = 'review-box';
     box.innerHTML = list.map(card).join('');
     search.parentNode.insertBefore(box, search);
     box.querySelectorAll('[data-review]').forEach(b => b.onclick = () => {
       const set = list.find(s => s.id === b.dataset.review), group = set.groups.find(g => g.id === b.dataset.group);
       start(set, group);
     });
   });
 };
})();
