// 考前速測模組：本機版本，等雲端帳號上線後可再同步紀錄
(function(){
 let quiz=null, selected=[], phase='';
 const randomize=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const safe=s=>esc(s);
 function pool(id,wrong){
   return (id==='all'?LESSONS:LESSONS.filter(l=>l.id===id)).flatMap(l=>
     l.items.map((item,i)=>({id:l.id,i,title:l.title,item}))
       .filter(q=>!wrong||!!me().progress?.[q.id]?.[q.i]?.wrong));
 }
 function open(){
   let dlg=document.getElementById('quiz-dialog');
   if(!dlg){dlg=document.createElement('dialog');dlg.id='quiz-dialog';dlg.className='quiz-dialog';document.body.appendChild(dlg)}
   dlg.innerHTML='<h2>⚡ 考前速測</h2><p>選擇課別和題數，組成自己的考前練習卷。</p>'+
   '<label for="quiz-lesson">選第幾課</label><select class="input" id="quiz-lesson">'+
   '<option value="all">Unit 05 全課綜合（30 個單字主題）</option>'+
   LESSONS.map(l=>'<option value="'+safe(l.id)+'">'+safe(l.title)+'</option>').join('')+'</select>'+
   '<label for="quiz-count">題數</label><select class="input" id="quiz-count">'+
   [5,10,20,30,50].map(n=>'<option value="'+n+'" '+(n===10?'selected':'')+'>'+n+' 題</option>').join('')+
   '<option value="all">全部題目</option></select>'+
   '<p class="smallnote" id="quiz-avail"></p><div class="actions">'+
   '<button class="btn primary" id="quiz-mixed">🎯 綜合自我考核</button>'+
   '<button class="btn mint" id="quiz-review">🐾 錯題練習</button>'+
   '<button class="btn secondary" id="quiz-close">取消</button></div>';
   const update=()=>{let id=document.getElementById('quiz-lesson').value;
     document.getElementById('quiz-avail').textContent='目前可選 '+pool(id,false).length+
     ' 題；已記錄錯題 '+pool(id,true).length+' 題。'};
   document.getElementById('quiz-lesson').onchange=update;update();
   document.getElementById('quiz-close').onclick=()=>dlg.close();
   document.getElementById('quiz-mixed').onclick=()=>launch(false);
   document.getElementById('quiz-review').onclick=()=>launch(true);
   dlg.showModal();
 }
 function launch(wrong){
   let id=document.getElementById('quiz-lesson').value,available=pool(id,wrong),n=document.getElementById('quiz-count').value;
   if(!available.length){alert(wrong?'目前沒有錯題紀錄。請先完成一般練習，錯題就會自動收集。':'沒有符合的練習題。');return}
   let count=n==='all'?available.length:Math.min(+n,available.length);
   quiz={questions:randomize(available).slice(0,count),at:0,first:0,answer:[],attempt:0,mode:wrong?'錯題練習':'綜合自我考核',failed:0};
   document.getElementById('quiz-dialog').close();next();
 }
 function next(){
   if(quiz.at>=quiz.questions.length){finish();return}
   quiz.attempt=0;quiz.answer=[];quiz.failed=0;selected=randomize(tokens(quiz.questions[quiz.at].item[0]).map((_,i)=>i));phase='asking';draw();
 }
 function currentWords(){return tokens(quiz.questions[quiz.at].item[0])}
 function tile(id){return '<button type="button" class="tile" draggable="true" data-qid="'+id+'">'+safe(currentWords()[id])+'</button>'}
 function draw(){
   phase='asking';stage='quiz';header();
   let q=quiz.questions[quiz.at],p=quiz.at/quiz.questions.length*100;
   document.getElementById('app').innerHTML=
    '<div class="statline"><strong>⚡ '+quiz.mode+' · '+safe(q.title)+'</strong><span>第 '+(quiz.at+1)+' / '+quiz.questions.length+' 題</span></div>'+
    '<div class="progress"><div style="width:'+p+'%"></div></div>'+
    '<div class="prompt"><small>看中文排列英文句子</small><h2>'+safe(q.item[1])+'</h2></div>'+
    '<div class="sectionlabel">✏️ 我的句子</div><div class="zone '+(quiz.answer.length?'':'empty')+'" id="q-answer">'+
      quiz.answer.map(tile).join('')+'</div>'+
    '<div class="sectionlabel">🧩 單字磚塊</div><div class="bank" id="q-bank">'+
      selected.filter(i=>!quiz.answer.includes(i)).map(tile).join('')+'</div>'+
    '<div class="actions"><button class="btn primary" id="q-check" '+(quiz.answer.length!==selected.length?'disabled':'')+'>✅ 檢查答案</button>'+
    '<button class="btn secondary" id="q-shuffle">🔀 重排</button><button class="btn secondary" id="q-exit">🏠 結束速測</button></div>'+
    '<div id="q-feedback"></div><p class="smallnote">速測不影響一般闖關積分；錯題可再次練習。</p>';
   document.getElementById('q-check').onclick=check;
   document.getElementById('q-shuffle').onclick=()=>{quiz.answer=[];selected=randomize(currentWords().map((_,i)=>i));draw()};
   document.getElementById('q-exit').onclick=()=>{if(confirm('確定結束此次速測嗎？')){quiz=null;home()}};
   document.querySelectorAll('[data-qid]').forEach(t=>{
     t.onclick=()=>{let id=+t.dataset.qid;quiz.answer=quiz.answer.includes(id)?quiz.answer.filter(x=>x!==id):[...quiz.answer,id];draw()};
     t.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',t.dataset.qid));
   });
   for(let z of [document.getElementById('q-answer'),document.getElementById('q-bank')]){
     z.ondragover=e=>e.preventDefault();
     z.ondrop=e=>{e.preventDefault();let id=Number(e.dataTransfer.getData('text/plain'));if(!selected.includes(id))return;
       quiz.answer=quiz.answer.filter(x=>x!==id);
       if(z.id==='q-answer'){let target=e.target.closest('[data-qid]'),at=target?quiz.answer.indexOf(+target.dataset.qid):-1;
         if(at<0)quiz.answer.push(id);else quiz.answer.splice(at,0,id)}
       draw();
     };
   }
 }
 function check(){
   if(quiz.answer.length!==selected.length)return;
   let words=currentWords(),good=quiz.answer.every((id,i)=>words[id]===words[i]);
   quiz.attempt++;phase='feedback';
   document.querySelectorAll('[data-qid],#q-check,#q-shuffle').forEach(x=>x.disabled=true);
   if(!good){quiz.failed++;const q=quiz.questions[quiz.at];rec(q.id,q.i).wrong=true;save();}
   let answer=words.map((w,i)=>'<span class="'+(!good&&words[quiz.answer[i]]!==w?'bad':'')+'">'+safe(w)+'</span>').join(' ');
   document.getElementById('q-feedback').innerHTML='<div class="feedback '+(good?'good':'')+'"><h3>'+
      (good?'🐱🎉 答對了！':'🐾 再看一次正確句子')+'</h3><div class="answer">'+answer+
      '</div><p>'+(good?'繼續挑戰下一題！':'紅色標示需要修正的位置；這題要重新拼對才能繼續。')+'</p>'+
      '<button class="btn '+(good?'mint':'primary')+'" id="q-next">'+(good?'下一題 →':'🔁 再試一次')+'</button></div>';
   if(good)party();
   document.getElementById('q-next').onclick=()=>{
      if(good){if(quiz.attempt===1)quiz.first++;quiz.at++;next()}
      else{quiz.answer=[];selected=randomize(words.map((_,i)=>i));draw()}
   };
 }
 function finish(){
   stage='quiz-end';header();const n=quiz.questions.length,pct=Math.round(100*quiz.first/n);
   document.getElementById('app').innerHTML=
   '<div class="quiz-finish"><div class="completion-cat">😻🎊</div><h1>考前速測完成！</h1><p>'+quiz.mode+'</p>'+
   '<div class="scoreboard"><div class="scorebox"><b>'+pct+'%</b><small>首次答對率</small></div>'+
   '<div class="scorebox"><b>'+quiz.first+' / '+n+'</b><small>首次答對題數</small></div>'+
   '<div class="scorebox"><b>'+(n-quiz.first)+'</b><small>需要重試的題數</small></div></div>'+
   '<p class="quiz-info">所有題目已練習至答對。速測不重複計算闖關積分。</p>'+
   '<div class="actions"><button class="btn primary" id="q-again">⚡ 再測一回</button>'+
   '<button class="btn secondary" id="q-home">🏠 回首頁</button></div></div>';
   party();document.getElementById('q-again').onclick=()=>{quiz=null;home();open()};
   document.getElementById('q-home').onclick=()=>{quiz=null;home()};
 }
 const originalHome=home;
 home=function(){quiz=null;originalHome();if(!me())return;let search=document.querySelector('.searchbox');if(!search)return;
   let box=document.createElement('div');box.className='homecard';box.innerHTML=
    '<h2>⚡ 考前速測</h2><p>挑選課別、題數，隨機出一份綜合考卷，也能集中補練錯題。</p>'+
    '<button class="btn primary" id="q-open">設定測驗 →</button>';search.parentNode.insertBefore(box,search);
   document.getElementById('q-open').onclick=open;
 };
 if(me())home();
})();
