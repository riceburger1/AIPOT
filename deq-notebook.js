/* DEQ Notebook quiz - original questions/answers from user's DEQ 노트북 문제.hwp */
(()=>{'use strict';
 const KEY='yeonje-deq-notebook-v1',BANK_URL='deq-notebook-bank.json';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normalize=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[^a-z0-9가-힣]/g,'');
 let bank=null,loading=null,session=null,selected=[],draft='',graded=null;
 function save(){try{localStorage.setItem(KEY,JSON.stringify(session))}catch(e){console.warn('노트북 학습기록 저장 실패',e)}}
 function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&d.version===1&&Array.isArray(d.queue)&&Array.isArray(d.wrong)&&Number.isInteger(d.index))return d}catch(e){}return null}
 function newSession(){session={version:1,phase:'all',queue:bank.questions.map(q=>q.id),index:0,wrong:[],firstCorrect:0,firstWrong:0,retryRounds:0,history:{},finished:false};save();selected=[];draft='';graded=null}
 function qNow(){return bank.questions.find(q=>q.id===session.queue[session.index])}
 function isCorrect(q){
  if(q.type==='single'||q.type==='multi')return selected.length===q.answer.length&&selected.every(x=>q.answer.includes(x));
  let v=normalize(draft);if(!v)return false;
  if(q.keywords&&q.keywords.length>1)return q.keywords.every(k=>v.includes(normalize(k)));
  const a=q.answerText||'';const variants=[a,...(q.keywords||[])];
  if(/온톨로지/.test(a))variants.push('온톨로지','ontology');
  if(/DigComp/i.test(a))variants.push('디그컴프','digcomp');
  if(/고위험/.test(a))variants.push('고위험','고위험사용자군');
  if(/다음 해 1월 1일/.test(a))variants.push('다음해1월1일','이듬해1월1일','사망한다음해1월1일');
  if(/HTTPS/.test(a))variants.push('https','https://');
  if(/무결성/.test(a))variants.push('무결성','integrity');
  if(/옵트인/.test(a))variants.push('옵트인','optin');
  return variants.some(x=>normalize(x)===v);
 }
 function mark(){let q=qNow();if(!q||graded)return;graded={ok:isCorrect(q),input:q.type==='short'?draft:selected.slice()};
   session.history[q.id]={correct:graded.ok,at:Date.now(),phase:session.phase};
   if(!graded.ok&&!session.wrong.includes(q.id))session.wrong.push(q.id);
   if(graded.ok&&session.phase==='retry')session.wrong=session.wrong.filter(id=>id!==q.id);
   if(session.phase==='all'){if(graded.ok)session.firstCorrect++;else session.firstWrong++;}
   save();draw();
 }
 function next(){if(!graded)return;session.index++;selected=[];draft='';graded=null;
  if(session.index>=session.queue.length)session.finished=true;
  save();draw();
 }
 function startRetry(){if(!session.wrong.length)return;session.phase='retry';session.queue=session.wrong.slice();session.index=0;session.retryRounds++;session.finished=false;selected=[];draft='';graded=null;save();draw();}
 const controls=q=>q.type==='short'?`<form id="nb-answer" class="nb-answer"><label for="nb-input">정답 직접 입력</label><input id="nb-input" autocomplete="off" placeholder="답을 입력하세요" value="${esc(draft)}" ${graded?'disabled':''} /><button type="submit" class="nb-primary" ${graded?'disabled':''}>정답 확인</button></form>`:
 `<div class="nb-choices">${q.options.map((o,i)=>`<button type="button" class="nb-option ${selected.includes(i)?'selected':''}" data-choice="${i}" ${graded?'disabled':''}><span class="nb-option-letter">${q.type==='multi'?(selected.includes(i)?'☑':'☐'):'ABCD'[i]+'.'}</span><span>${esc(o.text)}</span></button>`).join('')}</div>${!graded?`<button class="nb-primary" id="nb-submit" ${selected.length?'':'disabled'}>정답 확인</button>`:''}`;
 function feedback(q){if(!graded)return '';
  let rows=q.type==='short'?`<div class="nb-explain"><b>정답</b><p>${esc(q.answerText)}</p><b>해설</b><p>${esc(q.explanation||'원문 정답을 확인하세요.')}</p></div>`:
  `<div class="nb-explain"><b>정답: ${q.answer.map(i=>'ABCD'[i]).join(', ')}</b><p>${q.type==='multi'?'정답인 보기들을 모두 선택해야 정답입니다.':''}</p>${q.options.map((o,i)=>`<div class="nb-explain-item"><b>${'ABCD'[i]}. ${o.correct?'옳은 보기':'옳지 않은 보기'} ${selected.includes(i)?'· 내가 선택한 보기':''}</b><div>${esc(o.text)}</div><p>${esc(o.explanation)}</p></div>`).join('')}</div>`;
  return `<section class="nb-feedback" aria-live="polite"><h3 class="${graded.ok?'nb-green':'nb-red'}">${graded.ok?'✓ 정답입니다!':'✕ 오답입니다. 정답과 해설을 확인하세요.'}</h3>${rows}<p class="nb-note">${!graded.ok?'이 문제는 오답 목록에 저장되어 전체 문제를 푼 후 다시 출제됩니다.':'해설을 확인하고 다음 문제로 진행하세요.'}</p><button type="button" class="nb-primary" id="nb-next">${session.index===session.queue.length-1?'이번 회차 결과 보기':'다음 문제'}</button></section>`;
 }
 function draw(){let root=document.getElementById('view');if(!root||!bank)return;
  if(!session)newSession();
  if(session.finished){let retry=session.phase==='retry';root.innerHTML=`<div class="nb-shell"><p class="nb-kicker">DEQ 노트북 문제</p><h2>${retry?'오답 재도전 결과':'전체 문제 풀이 완료'}</h2><div class="nb-score"><strong>${retry?session.queue.length:bank.questions.length}문제 완료</strong><span>첫 도전 정답 ${session.firstCorrect}문제 · 남은 오답 ${session.wrong.length}문제</span></div>${session.wrong.length?`<p>오답 ${session.wrong.length}문제가 남았습니다. 틀린 문제만 다시 풀고, 맞힌 문제는 다음 오답 회차에서 제외됩니다.</p><button id="nb-retry" class="nb-primary">오답 ${session.wrong.length}문제 다시 풀기</button>`:'<p class="nb-green">모든 문제와 오답 복습을 완료했습니다.</p>'}<button id="nb-reset" class="nb-secondary">전체 ${bank.questions.length}문제 처음부터 다시 풀기</button></div>`;bind();return}
  let q=qNow();if(!q){session.finished=true;save();draw();return}
  let total=session.queue.length,idx=session.index;
  root.innerHTML=`<div class="nb-shell"><p class="nb-kicker">DEQ 노트북 문제 · 원문 문제은행 ${bank.questions.length}문항</p><div class="nb-header"><h2>${session.phase==='retry'?'오답 다시 풀기':'전체 문제 풀기'}</h2><span class="nb-count">${idx+1} / ${total}</span></div><div class="nb-bar"><div style="width:${(idx/total)*100}%"></div></div><div class="nb-mini"><span>${q.type==='single'?'하나만 선택':q.type==='multi'?'해당되는 항목 모두 선택':'단답형 직접 입력'}</span><span>오답 ${session.wrong.length}개</span></div><div class="nb-question"><h3>[문제 ${String(idx+1).padStart(2,'0')}] ${esc(q.question)}</h3>${controls(q)}${feedback(q)}</div><div class="nb-footer"><button id="nb-reset" class="nb-text-btn">처음부터 다시 시작</button><span>결과는 이 기기에 저장됩니다.</span></div></div>`;bind();
 }
 function bind(){document.querySelectorAll('[data-choice]').forEach(el=>el.onclick=()=>{if(graded)return;let n=Number(el.dataset.choice),q=qNow();selected=q.type==='single'?[n]:selected.includes(n)?selected.filter(x=>x!==n):[...selected,n];draw()});
  const submit=document.getElementById('nb-submit');if(submit)submit.onclick=mark;
  const form=document.getElementById('nb-answer');if(form){const input=document.getElementById('nb-input');input?.addEventListener('input',e=>{draft=e.target.value});form.onsubmit=e=>{e.preventDefault();mark()}}
  const nextBtn=document.getElementById('nb-next');if(nextBtn)nextBtn.onclick=next;
  const retry=document.getElementById('nb-retry');if(retry)retry.onclick=startRetry;
  const reset=document.getElementById('nb-reset');if(reset)reset.onclick=()=>{if(confirm('DEQ 노트북 문제 진행 기록을 초기화하고 처음부터 다시 풀까요?')){newSession();draw()}};
 }
 async function render(){const root=document.getElementById('view');if(!root)return;root.innerHTML='<div class="nb-shell">DEQ 노트북 문제은행 불러오는 중…</div>';
  try{if(!bank){loading=loading||fetch(BANK_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('문제은행 HTTP '+r.status);return r.json()}).then(v=>{if(!Array.isArray(v.questions)||!v.questions.length)throw Error('문항이 없습니다');bank=v;});await loading;}session=load();if(session&&(session.queue.some(id=>!bank.questions.some(q=>q.id===id))||session.wrong.some(id=>!bank.questions.some(q=>q.id===id))))session=null;draw()}catch(e){root.innerHTML='<div class="nb-shell"><h2>문제은행을 불러오지 못했습니다.</h2><p>'+esc(e.message)+'</p><button id="nb-reload" class="nb-primary">다시 시도</button></div>';document.getElementById('nb-reload').onclick=()=>{loading=null;render()}}}
 window.DEQNotebook={render};
})();
