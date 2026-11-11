let DATA,tab='summary',deqChapter='all',aiChapter='all',filter='',currentQuizType='ai',deferredInstall=null;
const $=id=>document.getElementById(id);const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDay=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const seedNum=s=>{let h=2166136261;for(const c of s){h=Math.imul(h^c.charCodeAt(0),16777619)}return h>>>0};
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}};
function shuffle(arr,r){let a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const seoulDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const qKey=type=>type==='ai'?`yeonje-v7-allchapters-${type}-${localDay()}`:type==='deq'?`yeonje-v9-deq-35-24ch-${seoulDay()}`:`yeonje-v4-${type}-${localDay()}`;
function getState(type){try{return JSON.parse(localStorage.getItem(qKey(type)))}catch(e){return null}}
function putState(type,state){localStorage.setItem(qKey(type),JSON.stringify(state))}
function allTerms(type){return type==='ai'?DATA.aiTerms:DATA.deq.flatMap(c=>c.terms.map(t=>({...t,chapter:c.number})))}
function createBalancedAiQuestions(session=0,previousTerms=[]){
 const chapters=['1회차','2회차','3회차','4회차','5회차','6회차','7회차'];
 const terms=DATA.aiTerms, r=rng(seedNum(localDay()+'-ai-seven-'+session));
 const already=new Set(previousTerms);const selected=[];const used=new Set();
 function pick(ch,n){
  const pool=shuffle(terms.filter(t=>t.chapter===ch&&!used.has(t.term)),r);
  const ordered=[...pool.filter(t=>!already.has(t.term)),...pool.filter(t=>already.has(t.term))];
  for(const t of ordered.slice(0,n)){selected.push(t);used.add(t.term)}
 }
 chapters.forEach(c=>pick(c,2));
 // Cover every lecture first; remaining six questions go to new / previously unseen terms.
 const rest=shuffle(terms.filter(t=>!used.has(t.term)),r);
 const fresh=[...rest.filter(t=>!already.has(t.term)),...rest.filter(t=>already.has(t.term))];
 selected.push(...fresh.slice(0,20-selected.length));
 const chosen=shuffle(selected,r);
 return chosen.map((t,i)=>{
  const objective=i<15,reverse=objective&&i%4===0;
  const otherPool=shuffle(terms.filter(x=>x.term!==t.term&&x.meaning!==t.meaning),r);
  const wrong=otherPool.filter(x=>x.chapter===t.chapter).slice(0,3);
  if(wrong.length<3)wrong.push(...otherPool.filter(x=>!wrong.some(w=>w.term===x.term)).slice(0,3-wrong.length));
  const opts=objective?shuffle(reverse?[t.meaning,...wrong.map(x=>x.meaning)]:[t.term,...wrong.map(x=>x.term)],r):[];
  return {id:'ai-'+i,type:objective?'mc':'short',question:objective?(reverse?'다음 용어의 올바른 뜻은? 「'+t.term+'」':'다음 설명에 해당하는 용어는? '+t.meaning):'다음 설명에 해당하는 핵심 용어를 쓰세요. '+t.meaning,
   answer:reverse?t.meaning:t.term,options:opts,term:t.term,meaning:t.meaning,example:t.example,chapter:t.chapter,reverse};
 });
}
function createDeqSampleQuestions(session=0,previousTerms=[]){
 // DEQ daily set: 30 four-choice and 5 short answer; every one of 24 chapters is represented.
 const bank=DATA.deqQuizBank, day=seoulDay(), r=rng(seedNum(day+'-deq-35-'+session));
 const avoid=new Set(previousTerms), seen=new Set(JSON.parse(localStorage.getItem('yeonje-deq-35-seen')||'[]'));
 const used=new Set(), selected=[];
 const identity=x=>x.chapter+'|'+x.question;
 function take(items,chapter){
  const pool=shuffle(items.filter(x=>x.chapter===chapter&&!used.has(identity(x))),r);
  pool.sort((a,b)=>Number(avoid.has(a.question))-Number(avoid.has(b.question)) || Number(seen.has(identity(a)))-Number(seen.has(identity(b))));
  const item=pool[0];if(item){used.add(identity(item));selected.push(item);return true}return false;
 }
 const mc=bank.mc.map(x=>({...x,type:'mc'})), short=bank.short.map(x=>({...x,type:'short'}));
 // 1 multiple-choice question for every chapter, then 14 more rotated over chapters.
 for(let c=1;c<=DATA.deq.length;c++)take(mc,c);
 const dateOrd=Math.floor(Date.parse(day+'T00:00:00Z')/86400000);
 for(let i=0;i<30-DATA.deq.length;i++)take(mc,1+(dateOrd+session*3+i)%DATA.deq.length);
 while(selected.filter(x=>x.type==='mc').length<30){
  const candidate=shuffle(mc.filter(x=>!used.has(identity(x))),r)
   .sort((a,b)=>Number(seen.has(identity(a)))-Number(seen.has(identity(b))))[0];
  if(!candidate)break;used.add(identity(candidate));selected.push(candidate);
 }
 // The five written questions rotate across all DEQ chapters over successive days.
 const targets=[];for(let i=0;i<5;i++)targets.push(1+(dateOrd*5+session*5+i)%DATA.deq.length);
 for(const c of targets)take(short,c);
 while(selected.filter(x=>x.type==='short').length<5){
  const candidate=shuffle(short.filter(x=>!used.has(identity(x))),r)
   .sort((a,b)=>Number(seen.has(identity(a)))-Number(seen.has(identity(b))))[0];
  if(!candidate)break;used.add(identity(candidate));selected.push(candidate);
 }
 // Correct alternatives remain attached to their own question when shuffled.
 const sampled=shuffle(selected.filter(x=>x.type==='mc'),r).concat(shuffle(selected.filter(x=>x.type==='short'),r));
 const out=sampled.map((x,i)=>({id:`deq35-${seedNum(identity(x))}`,type:x.type,question:x.question,answer:x.answer,
  options:x.type==='mc'?shuffle(x.options,r):[],term:x.question,meaning:x.meaning,
  example:`${x.chapter}장 · ${x.type==='mc'?'4지선다형':'용어 기입형'} · ${x.sourceType==='sample-style'?'2026 샘플 유형':'핵심 개념 적용'}`,
  chapter:x.chapter,aliases:x.aliases||[],reverse:false}));
 const accumulated=[...seen,...sampled.map(identity)].slice(-650);
 localStorage.setItem('yeonje-deq-35-seen',JSON.stringify(accumulated));
 return out;
}
function createQuestions(type,session=0,previousTerms=[]){if(type==='ai')return createBalancedAiQuestions(session,previousTerms);if(type==='deqpdf')return DATA.deqPdfSample.questions.map(q=>({...q,options:q.options?[...q.options]:[]}));if(type==='deq'&&DATA.deqQuizBank)return createDeqSampleQuestions(session,previousTerms);const terms=allTerms(type),r=rng(seedNum(localDay()+'-'+type+'-'+session)),mixed=shuffle(terms,r),drawn=[...mixed.filter(t=>!previousTerms.includes(t.term)),...mixed.filter(t=>previousTerms.includes(t.term))].slice(0,20);return drawn.map((t,i)=>{const objective=i<15;const reverse=objective&&i%3===0;const others=shuffle(terms.filter(x=>x.term!==t.term),r).slice(0,3);const opts=objective?shuffle(reverse?[t.meaning,...others.map(x=>x.meaning)]:[t.term,...others.map(x=>x.term)],r):[];
return {id:`${type}-${i}`,type:objective?'mc':'short',question:objective?(reverse?`다음 용어의 올바른 뜻은? 「${t.term}」`:`다음 설명에 해당하는 용어는? ${t.meaning}`):`다음 설명에 해당하는 핵심 용어를 쓰세요. ${t.meaning}`,answer:reverse?t.meaning:t.term,options:opts,term:t.term,meaning:t.meaning,example:t.example,chapter:t.chapter||null,reverse};})}
function initialState(type,session=0,previousTerms=[]){return {date:localDay(),session,questions:createQuestions(type,session,previousTerms),queue:Array.from({length:type==='deq'?35:20},(_,i)=>i),position:0,results:{},misses:{},done:false,feedback:null,attempts:0,round:1}}
function restartQuiz(type,mode){
 const old=stateOf(type);
 if(!old.done&&!window.confirm(mode==='same'?'진행 중인 기록을 초기화하고 같은 문제를 다시 풀까요?':'진행 중인 기록을 초기화하고 새 문제를 풀까요?'))return;
 let next=mode==='same'||type==='deqpdf'?{...initialState(type,old.session||0),questions:old.questions}:initialState(type,(old.session||0)+1,old.questions.map(q=>type==='deq'?q.question:q.term));
 putState(type,next);renderQuiz(type);
}
function quizActions(type){return `<div class="quiz-actions"><button type="button" class="quiz-retry" id="retrySame">↻ 다시 도전<small>${type==='deqpdf'?'PDF 원본 20문제':type==='deq'?'오늘 풀었던 동일한 35문제':'오늘 풀었던 동일한 20문제'}</small></button><button type="button" class="quiz-new" id="retryNew">${type==='deqpdf'?'↻ 샘플 처음부터':'✦ 새로운 문제 도전'}<small>${type==='deqpdf'?'PDF 20문제 전체 초기화':type==='deq'?'새로운 35문제 다시 풀기':'새로운 20문제 다시 풀기'}</small></button></div>`}
function quizModeHeader(type){return type==='deq'||type==='deqpdf'?`<div class="quiz-mode-switch"><button type="button" id="modeDaily" class="${type==='deq'?'selected':''}">매일퀴즈 (30+5)</button><button type="button" id="modePdf" class="${type==='deqpdf'?'selected':''}">PDF 샘플 20문제 풀기</button></div>`:''}
function bindQuizMode(type){if(type==='deq'||type==='deqpdf'){$('modeDaily').onclick=()=>renderQuiz('deq');$('modePdf').onclick=()=>renderQuiz('deqpdf')}}
function bindQuizActions(type){$('retrySame').onclick=()=>restartQuiz(type,'same');$('retryNew').onclick=()=>restartQuiz(type,'new')}

function stateOf(type){let s=getState(type);if(!s||!Array.isArray(s.questions)||s.questions.length!==(type==='deq'?35:20)){s=initialState(type);putState(type,s)}return s}
function norm(s){return String(s).toLowerCase().replace(/[\s·.()（）\-_/]/g,'').trim()};
function judge(type,value){let s=stateOf(type);if(s.done||s.feedback)return;const idx=s.queue[s.position],q=s.questions[idx];const ok=norm(value)===norm(q.answer)||(q.type==='short'&&(q.aliases||[]).some(a=>norm(value)===norm(a)))||(!q.reverse&&type==='ai'&&norm(value)===norm(q.term));s.attempts++;s.results[idx]=ok?'correct':'wrong';if(!ok)s.misses[idx]=(s.misses[idx]||0)+1;s.feedback={ok,value,idx};putState(type,s);renderQuiz(type)}
function advance(type){let s=stateOf(type);if(!s.feedback)return;let ix=s.feedback.idx,wasCorrect=s.feedback.ok;s.feedback=null;s.position++;if(s.position>=s.queue.length){const wrong=s.queue.filter(i=>s.results[i]!=='correct');if(!wrong.length)s.done=true;else{s.queue=wrong;s.position=0;s.round++}}putState(type,s);renderQuiz(type)}
function pageHeader(title,subtitle){return `<div class="sectionhead"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div></div>`}
function renderSummary(){let arr=DATA.ai.filter(c=>aiChapter==='all'||c.chapter===aiChapter);$('view').innerHTML=pageHeader('AI-POT 핵심 요약','')+`<div class="toolbar"><select id="aich"><option value="all">전체 회차</option><option value="1회차">1회차</option><option value="2회차">2회차</option><option value="3회차">3회차</option><option value="4회차">4회차</option><option value="5회차">5회차</option><option value="6회차">6회차</option><option value="7회차">7회차</option></select></div><div class="course-grid">`+arr.map((c,i)=>`<article class="card"><span class="tag">${c.chapter} · ${i+1}</span><h3>${escapeHtml(c.title)}</h3><p class="description">${escapeHtml(c.body)}</p><div class="key"><b>시험 포인트</b> · ${escapeHtml(c.key)}</div>${c.source?`<p class="note">${escapeHtml(c.source)}</p>`:""}</article>`).join('')+`</div><p class="note">※ 3·4회차는 첨부 보충정리를 덧붙이고 7회차는 1급 심화(프롬프트 학습법·하이퍼파라미터·고급 AI 활용) 내용을 새로 추가했습니다. 1~7회차 모든 핵심용어가 매일퀴즈 문제은행에 포함되고, 하루 20문제에는 각 회차가 최소 2문제씩 포함됩니다.</p>`;$('aich').value=aiChapter;$('aich').onchange=e=>{aiChapter=e.target.value;renderSummary()}}
function renderTerms(type){
 const isDeq=type==='deq', chapters=DATA.deq;
 let terms=isDeq?chapters.filter(c=>deqChapter==='all'||String(c.number)===String(deqChapter)).flatMap(c=>c.terms.map(t=>({...t,chapter:c.number}))):DATA.aiTerms;
 terms=terms.filter(t=>(t.term+t.meaning+t.example).toLowerCase().includes(filter.toLowerCase()));
 let chapterCount=chapters.length, totalTerms=chapters.reduce((n,c)=>n+c.terms.length,0);
 const study=isDeq?chapters.filter(c=>deqChapter==='all'?c.number>=13:String(c.number)===String(deqChapter)).filter(c=>c.sections):[];
 const lessonHtml=study.length?`<div class="chapter-lesson-head"><h3>📚 첨부 PDF 기반 심화 학습 챕터</h3><p class="description">13~24장 PDF 심화 학습 · 시험 핵심내용과 개념 구분</p></div><div class="course-grid">${study.map(c=>`<article class="card deq-lesson"><span class="tag">DEQ ${c.number}장 · ${escapeHtml(c.source||'')}</span><h3>${escapeHtml(c.title)}</h3>${c.sections.map((section,i)=>`<details class="lesson-item" ${i===0?'open':''}><summary>${i+1}. ${escapeHtml(section.title)}</summary><p class="description">${escapeHtml(section.body)}</p><div class="key"><b>시험 포인트</b> · ${escapeHtml(section.key)}</div></details>`).join('')}</article>`).join('')}</div>`:'';
 $('view').innerHTML=pageHeader(isDeq?'DEQ 디지털 윤리 핵심용어':'AI-POT 핵심단어',isDeq?`${chapterCount}개 챕터 · ${totalTerms}개 핵심용어 · PDF 심화 12개 챕터`:`${DATA.aiTerms.length}개 핵심 단어`)+
 `<div class="toolbar">${isDeq?`<select id="deqch"><option value="all">전체 ${chapterCount}개 챕터</option>${chapters.map(c=>`<option value="${c.number}">${c.number}장 ${escapeHtml(c.title)}</option>`).join('')}</select>`:''}<input id="termsearch" type="search" placeholder="용어 또는 설명 검색" value="${escapeHtml(filter)}"></div>`+
 lessonHtml+`<p class="note">핵심 용어 검색 결과 ${terms.length}개</p><div class="course-grid">`+
 terms.map(t=>`<article class="card"><span class="tag">${isDeq?'DEQ '+t.chapter+'장':'AI-POT'}</span><h3>${escapeHtml(t.term)}</h3><p class="description">${escapeHtml(t.meaning)}</p><div class="example"><b>쉽게 이해하기</b> · ${escapeHtml(t.example)}</div></article>`).join('')+`</div>`;
 if(isDeq){$('deqch').value=deqChapter;$('deqch').onchange=e=>{deqChapter=e.target.value;filter='';renderTerms('deq')}}
 $('termsearch').oninput=e=>{filter=e.target.value;const pos=e.target.selectionStart;renderTerms(type);$('termsearch').focus();$('termsearch').setSelectionRange(pos,pos)};
}
function renderQuiz(type){currentQuizType=type;const s=stateOf(type),label=type==='ai'?'AI-POT':type==='deqpdf'?'DEQ PDF 샘플':'DEQ 디지털 윤리';const correct=Object.values(s.results).filter(x=>x==='correct').length;const total=s.questions.length;let head=pageHeader(type==='deqpdf'?'DEQ 지도사 PDF 샘플 20문제':`${label} 오늘의 퀴즈`,type==='deqpdf'?'첨부 PDF 원문 순서 · 객관식 13문항 + 주관식 7문항 · 별도 연습 기록':`${type==='deq'?seoulDay():localDay()} · ${type==='deq'?'객관식 30문항 + 주관식 5문항':'객관식 15문항 + 주관식 5문항'} · 자정 00:00 자동 교체${type==='ai'?' · 1~7회차 전 범위(각 회차 최소 2문제)':type==='deq'?' · 전체 24장 매일 출제 · 2026 지도사 샘플 유형':''}`)+quizModeHeader(type);if(s.done){$('view').innerHTML=head+quizActions(type)+`<div class="card done"><div class="symbol">🏆</div><h2>${type==='deqpdf'?'PDF 샘플 20문제를 모두 맞혔어요!':`오늘의 ${total}문제를 모두 맞혔어요!`}</h2><p>오답 재도전까지 완료했습니다.</p><div class="gridStats"><div class="stat"><strong>${total}/${total}</strong><small>최종 정답</small></div><div class="stat"><strong>${s.attempts}</strong><small>총 답변 횟수</small></div><div class="stat"><strong>${Object.values(s.misses).reduce((a,b)=>a+b,0)}</strong><small>오답 횟수</small></div></div><p class="hint">재도전 버튼으로 오늘도 계속 연습할 수 있습니다. 자정에는 기본 새 문제로 바뀝니다.</p></div>`;bindQuizActions(type);bindQuizMode(type);return}
const ix=s.queue[s.position],q=s.questions[ix],num=ix+1,feedback=s.feedback;let html=head+quizActions(type)+`<div class="gridStats"><div class="stat"><strong>${correct}/${total}</strong><small>현재 맞힌 문항</small></div><div class="stat"><strong>${s.round===1?'1차':'오답'}</strong><small>진행 단계</small></div><div class="stat"><strong>${Object.values(s.misses).reduce((a,b)=>a+b,0)}</strong><small>오답 누적</small></div></div><div class="progress"><div class="bar" style="width:${Math.round(correct/total*100)}%"></div></div><div class="card"><div class="qmeta"><span>문항 ${num} / ${total} · ${q.type==='mc'?'객관식':'주관식'}${q.chapter?' · '+escapeHtml(q.chapter):''}</span><span>${s.position+1} / ${s.queue.length}${s.round>1?' · 오답 재도전':''}</span></div><div class="question">${escapeHtml(q.question)}</div>`;
if(q.type==='mc')html+=`<div class="choices">${q.options.map((v,i)=>`<button class="choice ${feedback?(norm(v)===norm(q.answer)?'correct':norm(feedback.value)===norm(v)?'wrong':''):''}" data-choice="${i}" ${feedback?'disabled':''}>${i+1}. ${escapeHtml(v)}</button>`).join('')}</div>`;else html+=`<form id="shortform"><input class="shortInput" id="shortAnswer" autocomplete="off" placeholder="핵심 용어를 입력하세요" ${feedback?'disabled':''} value="${feedback?escapeHtml(feedback.value):''}" aria-label="주관식 답"><div class="actions"><button class="primary" ${feedback?'disabled':''} type="submit">정답 확인</button></div></form>`;
if(feedback)html+=`<div class="feedback ${feedback.ok?'':'bad'}"><strong>${feedback.ok?'정답입니다! 🎉':'오답입니다. 오답 재도전에서 다시 나옵니다.'}</strong><div>정답: <b>${escapeHtml(q.answer)}</b></div><div>${escapeHtml(q.meaning)}</div><div>${escapeHtml(q.example)}</div></div><div class="actions"><button id="nextBtn" class="primary">${s.position===s.queue.length-1?'다음 단계':'다음 문제 →'}</button></div>`;
html+=`</div><p class="note">✓ 답을 고르면 바로 채점합니다. 틀린 문제는 현재 회차가 끝난 뒤 다시 나오며, 모든 문제를 맞혀야 완료됩니다. 기록은 이 기기에 저장됩니다.</p>`;$('view').innerHTML=html;
bindQuizActions(type);bindQuizMode(type);if(!feedback){if(q.type==='mc')document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>judge(type,q.options[Number(b.dataset.choice)]));else{$('shortform').onsubmit=e=>{e.preventDefault();let v=$('shortAnswer').value.trim();if(v)judge(type,v)};$('shortAnswer').focus()}}else $('nextBtn').onclick=()=>advance(type)
}
function renderAppendix(){$('view').innerHTML=pageHeader('부록 · 2026년 DEQ 변경사항','2026.03.18 전략 세미나 인쇄본 74쪽 내용 중 출제구조와 학습전략 요약')+`<div class="card"><h3>중요: 자격등급별 출제문항 구성</h3><p class="description">DEQ 지도사·2급·3급의 출제 구조가 다릅니다. 앱의 DEQ 매일퀴즈 35문제(객관식 30·주관식 5)는 학습용 구성으로 실제 등급별 자격시험 문항 수·비율과 일치하지 않습니다.</p></div><div class="course-grid">`+DATA.seminar.map(s=>`<article class="card"><span class="tag">세미나 ${escapeHtml(s.source)}</span><h3>${escapeHtml(s.title)}</h3><p class="description">${escapeHtml(s.text)}</p></article>`).join('')+`</div><div class="card"><h3>시험 직전 집중 암기</h3><p class="description">오정보 / 허위정보 / 악정보 · 현저성 / 조절 실패 / 문제적 결과 · BY / NC / ND / SA · 가명정보 / 익명정보 · AI 환각 / 편향 / 설명가능성 · 반영 / 재진술 / 명료화 · 블룸의 적용(응용)</p><p class="note">이 부록은 첨부된 세미나 자료의 주요 페이지를 근거로 재구성한 학습용 요약입니다. 법령·실제 시험 시행 세부내용은 주관기관 최신 공지를 확인하세요.</p></div>`}
function render(){document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-selected',b.dataset.tab===tab)});if(tab==='summary')renderSummary();if(tab==='terms')renderTerms('ai');if(tab==='deqterms')renderTerms('deq');if(tab==='aiquiz')renderQuiz('ai');if(tab==='deqquiz')renderQuiz('deq');if(tab==='deqsubjective')renderDeqSubjective();if(tab==='appendix')renderAppendix();if(tab==='promptquiz')renderPromptQuiz();if(tab==='mockexam')renderMockExam();$('dateLabel').textContent=`오늘 ${localDay()}`}
let lastDay=localDay(),lastSeoulDay=seoulDay();document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;filter='';render();window.scrollTo({top:0,behavior:'smooth'})}));
$('mockLaunch').addEventListener('click',()=>{tab='mockexam';filter='';render();document.querySelector('[data-tab=mockexam]').scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});window.scrollTo({top:0,behavior:'smooth'})});
fetch('content.json').then(x=>{if(!x.ok)throw Error('학습 자료 로딩 실패');return x.json()}).then(d=>{DATA=d;render();setInterval(()=>{if(localDay()!==lastDay||seoulDay()!==lastSeoulDay){lastDay=localDay();lastSeoulDay=seoulDay();render()}},15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(localDay()!==lastDay||seoulDay()!==lastSeoulDay)){lastDay=localDay();lastSeoulDay=seoulDay();render()}})}).catch(e=>{$('view').innerHTML=`<div class="card"><h3>학습자료를 불러오지 못했습니다.</h3><p>${escapeHtml(e.message)}</p><p>파일을 직접 더블클릭한 경우 브라우저 보안 정책에 따라 데이터가 차단됩니다. HTTPS 웹서버에 올린 뒤 사용하세요.</p></div>`});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('installBtn').hidden=false});$('installBtn').onclick=async()=>{if(deferredInstall){await deferredInstall.prompt();deferredInstall=null;$('installBtn').hidden=true}else alert('브라우저 메뉴에서 ‘홈 화면에 추가’ 또는 ‘앱 설치’를 선택하세요.')};
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
