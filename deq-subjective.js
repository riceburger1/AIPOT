/* DEQ 주관식 106문제: 독립형 학습 탭. 기존 매일퀴즈와 저장 기록을 분리합니다. */
(function(){
'use strict';
let bank=null, loading=null;
const KEY='yeonje-deq-subjective-106-v1';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/\s|[.,;:·()\[\]{}\-_/]/g,'');
function get(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return {}}}
function save(s){localStorage.setItem(KEY,JSON.stringify(s))}
function pool(){return bank.questions}
function shuffled(items){let a=[...items];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function initial(IDs,previous){return {ids:IDs,at:0,round:1,attempts:0,failures:{},resolved:{},revealed:{},lastFeedback:null,seen:[...new Set([...(previous?.seen||[]),...IDs])],setNumber:(previous?.setNumber||0)+1}}
function choose(s){const seen=new Set(s?.seen||[]);const all=shuffled(pool());const fresh=all.filter(q=>!seen.has(q.id));const rest=all.filter(q=>seen.has(q.id));return [...fresh,...rest].slice(0,30).map(q=>q.id)}
function start(mode){let s=get();if(s.ids?.length&&s.at<s.ids.length&&mode!=='first'&&!window.confirm('현재 진행 중인 문제를 중단하고 새로 시작할까요?'))return;
 if(mode==='wrong'){
  const missed=(s.ids||[]).filter(id=>(s.failures?.[id]||0)>0);
  if(!missed.length){alert('이전에 틀린 문제가 없습니다. 먼저 문제를 풀어보세요.');return}
  let out=initial(missed,s);out.kind='wrong';save(out);
 }else if(mode==='same'&&s.ids?.length){let out=initial(s.ids,s);out.kind='same';save(out)}
 else{let out=initial(choose(s),s);out.kind='new';save(out)}
 draw();
}
function hangulInitial(text){
 const lead='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
 return String(text).replace(/[a-zA-Z]+/g,m=>m[0].toUpperCase()+'·'.repeat(Math.max(0,m.length-1))).split('').map(ch=>{let code=ch.charCodeAt(0);if(code>=0xAC00&&code<=0xD7A3)return lead[Math.floor((code-0xAC00)/588)];if(/[a-zA-Z0-9]/.test(ch))return ch;return ch}).join('');
}
function accepted(q,user){let answer=normalize(user);if(!answer)return false;
 if([q.answer,...(q.aliases||[])].some(a=>normalize(a)===answer))return true;
 // 복수 항목은 순서와 구분 부호의 차이를 허용하되, 모든 항목을 입력해야 정답으로 인정합니다.
 const splittable=v=>String(v).split(/[,，]|\s*[\/+]\s*/).map(normalize).filter(Boolean);
 let targets=splittable(q.answer),got=splittable(user);
 if(targets.length>1&&targets.length===got.length&&targets.every(x=>got.includes(x)))return true;
 return false;
}
function current(s){return pool().find(x=>x.id===s.ids?.[s.at])}
function respond(){let s=get(),q=current(s);if(!q||s.lastFeedback?.id===q.id)return;let v=$('deqSubjectAnswer')?.value?.trim();if(!v)return;let ok=accepted(q,v);s.attempts++;
 if(ok){s.resolved[q.id]=true;s.lastFeedback={id:q.id,ok:true,value:v}}else{s.failures[q.id]=(s.failures[q.id]||0)+1;s.lastFeedback={id:q.id,ok:false,value:v}}
 save(s);draw();
}
function reveal(){let s=get(),q=current(s);if(!q)return;s.failures[q.id]=Math.max(1,s.failures[q.id]||0);s.revealed[q.id]=true;s.resolved[q.id]=true;s.lastFeedback={id:q.id,ok:false,revealed:true};save(s);draw()}
function next(){let s=get(),q=current(s);if(!q||!s.resolved?.[q.id])return;s.at++;s.lastFeedback=null;save(s);draw()}
function guide(){return `<div class="card"><h3>학습 방법</h3><p class="description">첨부한 ‘주관식 문제.hwp’의 106문항을 기준으로 구성했습니다. 한 세트에 30문제를 출제합니다. 답이 틀리면 초성 힌트를 표시하며 다시 입력할 수 있습니다. 정답을 맞히면 풀이 설명과 다음 문제 버튼이 나타납니다.</p><p class="note">※ 일부 원본 문항은 정답표나 문제 표현을 다시 확인해야 합니다. ‘원본 대조 필요’ 표시를 참고하세요. 여러 항목을 묻는 문제는 초성이 항목별로 표시됩니다.</p></div>`}
function draw(){if(!bank){$('view').innerHTML='<div class="card">주관식 문제은행을 불러오는 중입니다.</div>';return}
 let s=get();if(!s.ids?.length){$('view').innerHTML=`<div class="sectionhead"><div><h2>DEQ 주관식 30문제 도전</h2><p>전체 ${pool().length}문항 · 1회 30문제 · 오답 초성 힌트 제공</p></div></div>${guide()}<div class="subj-tools"><button class="primary" id="subStart">30문제 시작하기</button></div>`;$('subStart').onclick=()=>start('first');return}
 let solved=s.ids.filter(id=>s.resolved?.[id]).length;
 let actions=`<div class="subj-tools"><button type="button" id="subSame">↻ 동일 문제 재도전</button><button type="button" id="subWrong">✎ 오답만 재도전</button><button type="button" class="new" id="subNew">✦ 새로운 30문제</button></div>`;
 let h=`<div class="sectionhead"><div><h2>DEQ 주관식 30문제 도전</h2><p>문제은행 ${pool().length}개 · 현재 세트 ${s.ids.length}문제 · 정답 입력형</p></div></div>`+actions;
 if(s.at>=s.ids.length){let wrong=(s.ids||[]).filter(id=>(s.failures?.[id]||0)>0).length;
  $('view').innerHTML=h+`<div class="card subj-finish"><div class="symbol">🏆</div><h2>문제풀이 완료!</h2><p>이번 세트 ${s.ids.length}문제를 모두 확인했습니다.</p><div class="gridStats"><div class="stat"><strong>${s.ids.length}</strong><small>풀이 문항</small></div><div class="stat"><strong>${wrong}</strong><small>틀렸던 문항</small></div><div class="stat"><strong>${s.attempts}</strong><small>답안 제출 수</small></div></div><p>틀렸던 문제를 다시 풀거나 새로운 30문제에 도전할 수 있습니다.</p></div>`;bindActions();return;
 }
 let q=current(s),wrong=!!(s.failures?.[q.id]),feedback=s.lastFeedback?.id===q.id?s.lastFeedback:null,passed=!!s.resolved?.[q.id];
 let progress=Math.round(100*solved/s.ids.length),hint=hangulInitial(q.answer);
 let ans=feedback?.revealed?'정답을 확인했습니다. 다음 문제로 이동하거나 이 문제를 다시 풀어 복습할 수 있습니다.':feedback?.ok?'정답입니다! 잘 풀었습니다.':'아쉽지만 아직 정답이 아닙니다. 초성 힌트를 보고 다시 도전하세요.';
 let form=!passed?`<form id="subjForm"><label for="deqSubjectAnswer" class="subj-label">정답 직접 입력</label><input id="deqSubjectAnswer" class="shortInput" type="text" autocomplete="off" autocapitalize="off" placeholder="정답을 입력하세요" aria-label="DEQ 주관식 정답"><button class="primary" type="submit">정답 확인</button></form>`:'';
 let feedbackHtml=wrong||feedback?`<div class="subj-feedback ${feedback?.ok?'good':wrong?'bad':''}" aria-live="polite"><strong>${esc(ans)}</strong>${wrong?`<div class="subj-hint"><span>초성 힌트</span><strong>${esc(hint)}</strong></div>`:''}${passed?`<p><b>정답:</b> ${esc(q.answer)}</p><p class="description">${esc(q.explanation)}</p>${q.notes?.length?`<p class="subj-review">⚠ ${esc(q.notes.join(' '))}</p>`:''}`:''}</div>`:'';
 $('view').innerHTML=h+`<div class="gridStats"><div class="stat"><strong>${solved}/${s.ids.length}</strong><small>완료</small></div><div class="stat"><strong>${s.at+1}</strong><small>현재 순서</small></div><div class="stat"><strong>${Object.values(s.failures||{}).reduce((x,y)=>x+y,0)}</strong><small>틀린 횟수</small></div></div><div class="progress" role="progressbar" aria-valuenow="${solved}" aria-valuemax="${s.ids.length}"><div class="bar" style="width:${progress}%"></div></div><article class="card subj-card"><div class="qmeta"><span>문제 ${s.at+1} / ${s.ids.length} · 원본 ${q.number}번</span><span>${esc(q.chapter)}</span></div><div class="question">${esc(q.question)}</div>${q.reviewNeeded?'<p class="subj-review">※ 이 문제는 원본 정답·표현 대조가 필요할 수 있습니다.</p>':''}${form}${feedbackHtml}<div class="actions">${wrong&&!passed?'<button id="subShow" type="button" class="secondary">정답 보기 (오답으로 기록)</button>':''}${passed?'<button id="subNext" type="button" class="primary">다음 문제 →</button>':''}</div></article><p class="note">정답 판정은 띄어쓰기·일부 영문 표현 차이를 허용합니다. 긴 복수 정답은 원문 표현에 가깝게 적어주세요. 저장은 현재 브라우저에서만 유지됩니다.</p>`;
 bindActions();if($('subjForm')){$('subjForm').onsubmit=e=>{e.preventDefault();respond()};if(feedback?.ok!==true)$('deqSubjectAnswer').focus()}
 if($('subShow'))$('subShow').onclick=reveal;if($('subNext'))$('subNext').onclick=next;
}
function bindActions(){if($('subSame'))$('subSame').onclick=()=>start('same');if($('subWrong'))$('subWrong').onclick=()=>start('wrong');if($('subNew'))$('subNew').onclick=()=>start('new')}
window.renderDeqSubjective=function(){if(bank){draw();return}if(!loading){loading=fetch('deq-subjective-bank.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('문제은행을 불러올 수 없습니다.');return r.json()}).then(d=>{if(d.questions?.length!==106)throw Error('문제은행 문항 수 오류');bank=d}).catch(e=>{$('view').innerHTML=`<div class="card"><h3>파일을 불러오지 못했습니다.</h3><p>${esc(e.message)}</p><p>GitHub에 deq-subjective-bank.json 파일이 함께 업로드되었는지 확인하세요.</p></div>`;throw e})}
 loading.then(()=>{if(document.querySelector('[data-tab="deqsubjective"].active'))draw()}).catch(()=>{});
};
})();
