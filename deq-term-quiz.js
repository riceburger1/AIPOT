/* DEQ 24개 챕터 핵심용어만으로 구성한 주관식 학습과 영구 순환 오답노트 */
(function(){
'use strict';
const KEY='yeonje-deq-term-shortanswer-cycle-v1';
const SIZE=30;
let pool=[],byId=new Map();
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const norm=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[\s·.,:;()\[\]{}\-_/+]+/g,'');
const shuffle=a=>{let b=[...a];for(let i=b.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&typeof s==='object')return s}catch{}return {wrong:{},seen:[],main:null,review:null}}
function save(s){localStorage.setItem(KEY,JSON.stringify(s));notify(s)}
function notify(s){const b=document.querySelector('[data-tab="deqwrong"]');if(b)b.textContent='DEQ 오답노트'+(Object.keys(s.wrong||{}).length?' ('+Object.keys(s.wrong).length+')':'')}
function init(chapters){pool=chapters.flatMap(ch=>ch.terms.map((t,i)=>({id:`c${ch.number}-t${i}`,chapter:ch.number,title:ch.title,term:t.term,meaning:t.meaning,example:t.example||''})));byId=new Map(pool.map(q=>[q.id,q]));notify(load())}
function select30(s){const seen=new Set(s.seen||[]),old=s.main?.ids||[];let chosen=[];const chapters=[...new Set(pool.map(x=>x.chapter))];const add=(list)=>{for(const q of shuffle(list)){if(chosen.length>=SIZE)break;if(!chosen.includes(q.id))chosen.push(q.id)}};
// 먼저 24개 챕터에서 각각 한 문제씩 선택하여 전체 학습 범위를 보장
for(const c of shuffle(chapters)){const options=pool.filter(q=>q.chapter===c);const fresh=options.filter(q=>!seen.has(q.id)&&!old.includes(q.id));addOne(fresh.length?fresh:options.filter(q=>!old.includes(q.id)).length?options.filter(q=>!old.includes(q.id)):options)}
function addOne(items){const a=shuffle(items);if(a.length)chosen.push(a[0].id)}
add(pool.filter(q=>!seen.has(q.id)&&!old.includes(q.id)));add(pool.filter(q=>!old.includes(q.id)));add(pool);return shuffle(chosen.slice(0,SIZE))}
function launchMain(mode){const s=load();if(mode==='same'&&s.main?.ids?.length){s.main={ids:[...s.main.ids],at:0,feedback:null,correct:0,missed:0}}else{const ids=select30(s);s.seen=[...new Set([...(s.seen||[]),...ids])];s.main={ids,at:0,feedback:null,correct:0,missed:0}}save(s);drawMain()}
function current(session){return session?.ids?.[session.at]&&byId.get(session.ids[session.at])}
// 입력의 공백·기호 차이 및 병기된 영문 약어를 처리한다. 핵심 용어 자체는 보존한다.
function aliases(term){
  const raw=String(term).trim();
  const a=new Set([raw]);
  // '증강현실(AR)' → '증강현실' 또는 'AR'도 정답
  for(const m of raw.matchAll(/\(([^)]+)\)/g)){
    const inside=m[1].trim();
    const outside=raw.replace(m[0],'').trim();
    if(outside)a.add(outside);
    if(inside.length>=2 && !/^(예|구분|설명|참고)/.test(inside))a.add(inside);
  }
  if(raw.includes('/'))raw.split('/').forEach(v=>v.trim()&&a.add(v.trim()));
  // 단순 띄어쓰기 외에 널리 쓰이는 같은 개념의 국문 표기만 추가
  const variants={
    '탈억제 효과':['온라인 탈억제 효과'],
    '집단 지성':['집단지성'],
    '집단 극화':['집단극화'],
    '기밀성':['비밀성'],
    '무결성':['완전성'],
    '인포데믹스':['인포데믹'],
    '스마트폰 과의존':['스마트폰과의존'],
    '디지털 워터마킹':['워터마킹'],
    '포렌식 마킹':['포렌식마킹'],
    '2차적저작물작성권':['2차적 저작물 작성권'],
    '사물인터넷':['IoT'],
    '증강현실(AR)':['증강현실','AR'],
    '확장현실(XR)':['확장현실','XR'],
    '정보보호 관리체계':['ISMS'],
    '분산서비스거부공격':['DDoS','분산서비스거부공격'],
    '디지털 리터러시':['디지털문해력'],
    '딥페이크':['Deepfake'],
    '블랙리스트':['차단목록'],
    '화이트리스트':['허용목록']
  };
  (variants[raw]||[]).forEach(v=>a.add(v));
  return [...a].filter(Boolean);
}
function isCorrect(q,answer){
  const u=norm(answer);
  return !!u&&aliases(q.term).some(x=>norm(x)===u);
}
function head(title,desc){return `<div class="sectionhead"><div><h2>${esc(title)}</h2><p>${esc(desc)}</p></div></div>`}
function tools(){const n=Object.keys(load().wrong||{}).length;return `<div class="termquiz-tools"><button id="tqStart" type="button">✦ 새로운 30문제 도전</button><button id="tqSame" type="button">↻ 동일 30문제 다시 풀기</button><button id="tqToWrong" type="button">✎ 오답노트 열기 (${n})</button></div>`}
function bindTools(){if($('tqStart'))$('tqStart').onclick=()=>launchMain('new');if($('tqSame'))$('tqSame').onclick=()=>launchMain('same');if($('tqToWrong'))$('tqToWrong').onclick=()=>document.querySelector('[data-tab="deqwrong"]').click()}
function drawMain(){const s=load();if(!pool.length){$('view').innerHTML='<div class="card">핵심용어 자료를 불러오는 중입니다.</div>';return}let h=head('DEQ 핵심용어 주관식 퀴즈',`1~24장 핵심용어 ${pool.length}개 · 1회 ${SIZE}문제 · 오답은 오답노트에 저장`)+tools();
if(!s.main?.ids?.length){$('view').innerHTML=h+`<div class="card"><h3>핵심정리 용어만으로 공부하기</h3><p>24개 챕터에서 각 1문제 이상 출제하고 나머지 문제를 추가하여 매회 30문제를 풉니다. 설명을 읽고 핵심 용어를 직접 입력하세요.</p><p><b>틀려도 현재 문제를 다시 풀지 않습니다.</b> 정답과 설명을 확인하고 다음 문제로 넘어가며, 틀린 문제는 별도의 오답노트에 계속 남습니다.</p><p class="note">오답노트에서는 정답을 맞힌 문제만 삭제합니다. 오답이 다시 발생하면 동일한 방식으로 추가됩니다. 학습기록은 현재 브라우저에 보관됩니다.</p></div>`;bindTools();return}
const v=s.main,q=current(v);if(!q){$('view').innerHTML=h+`<div class="card done"><h2>30문제 도전 완료</h2><div class="gridStats"><div class="stat"><strong>${v.correct}</strong><small>정답</small></div><div class="stat"><strong>${v.missed}</strong><small>오답</small></div><div class="stat"><strong>${Object.keys(s.wrong||{}).length}</strong><small>오답노트 누적</small></div></div><p>틀린 문제는 현재 퀴즈에서 반복하지 않습니다. 오답노트에서 다시 풀고, 정답을 맞히면 목록에서 자동 삭제됩니다.</p><button type="button" id="tqFinishWrong" class="primary">오답노트 풀기 →</button></div>`;bindTools();$('tqFinishWrong').onclick=()=>document.querySelector('[data-tab="deqwrong"]').click();return}
const answered=!!v.feedback;h+=`<div class="gridStats"><div class="stat"><strong>${v.at+1}/${v.ids.length}</strong><small>현재 문항</small></div><div class="stat"><strong>${v.correct}</strong><small>정답</small></div><div class="stat"><strong>${Object.keys(s.wrong||{}).length}</strong><small>오답노트</small></div></div><div class="progress"><div class="bar" style="width:${Math.round(v.at/v.ids.length*100)}%"></div></div><article class="card termquiz-card"><div class="qmeta"><span>${q.chapter}장 · ${esc(q.title)}</span><span>${v.at+1} / ${v.ids.length}</span></div><div class="question">다음 설명에 해당하는 핵심 용어를 쓰시오.</div><p class="termquiz-definition">${esc(q.meaning)}</p>`;
if(!answered)h+=`<form id="tqForm"><label for="tqAnswer">정답 입력</label><input id="tqAnswer" type="text" class="shortInput" autocomplete="off" placeholder="핵심 용어를 입력하세요" required><button class="primary">정답 확인</button></form>`;
else h+=`<div class="termquiz-feedback ${v.feedback.ok?'correct':'incorrect'}"><strong>${v.feedback.ok?'정답입니다!':'오답입니다. 오답노트에 저장했습니다.'}</strong><p>정답: <b>${esc(q.term)}</b></p><p>${esc(q.meaning)}</p>${q.example?`<p><b>예시</b> · ${esc(q.example)}</p>`:''}</div><button id="tqNext" class="primary">${v.at===v.ids.length-1?'결과 확인':'다음 문제 →'}</button>`;
h+='</article><p class="note">기존 DEQ 매일퀴즈, DEQ 주관식 106문제 탭과는 별도로 학습기록을 저장합니다.</p>';$('view').innerHTML=h;bindTools();if($('tqForm')){$('tqForm').onsubmit=e=>{e.preventDefault();const answer=$('tqAnswer').value;const state=load(),ss=state.main,qq=current(ss);if(ss.feedback||!answer.trim()||!qq)return;const ok=isCorrect(qq,answer);ss.feedback={ok,answer};if(ok)ss.correct++;else{ss.missed++;state.wrong[qq.id]={count:(state.wrong[qq.id]?.count||0)+1,updated:Date.now()}}save(state);drawMain()};$('tqAnswer').focus()}if($('tqNext'))$('tqNext').onclick=()=>{const st=load();if(!st.main.feedback)return;st.main.at++;st.main.feedback=null;save(st);drawMain()}}
function wrongIds(s){return Object.keys(s.wrong||{}).filter(id=>byId.has(id))}
function launchReview(){const s=load();s.review={ids:shuffle(wrongIds(s)),at:0,feedback:null,correct:0,missed:0};save(s);drawReview()}
function drawReview(){const s=load(),n=wrongIds(s).length;let h=head('DEQ 오답노트',`핵심용어 주관식에서 틀린 문제 ${n}개 · 정답을 맞히면 자동 삭제 · 틀리면 계속 보관`);
if(!n && !s.review?.feedback){s.review=null;save(s);$('view').innerHTML=h+`<div class="card done"><div class="symbol">🎉</div><h2>오답노트가 비었습니다!</h2><p>오답노트에 남은 문제가 없습니다. 새로운 핵심용어 주관식 문제를 풀다가 틀리면 이곳에 다시 저장됩니다.</p><button class="primary" id="tqGoMain">새로운 30문제 풀기</button></div>`;$('tqGoMain').onclick=()=>document.querySelector('[data-tab="deqtermquiz"]').click();return}
if(!s.review?.ids?.length){$('view').innerHTML=h+`<div class="card"><h3>남아 있는 오답 ${n}문제</h3><p>오답노트에서 정답을 맞히면 목록에서 즉시 삭제합니다. 또 틀리면 삭제되지 않고 다음 복습 때 다시 나옵니다.</p><p>오답이 여러 번 누적되더라도 같은 문제는 한 건으로 관리합니다.</p><button class="primary" id="tqReviewStart">오답 ${n}문제 풀기</button></div>`;$('tqReviewStart').onclick=launchReview;return}
let v=s.review;while(v.at<v.ids.length&&!s.wrong[v.ids[v.at]]&&!v.feedback){v.at++;v.feedback=null}if(v.at>=v.ids.length){save(s);$('view').innerHTML=h+`<div class="card done"><h2>이번 오답 복습 완료</h2><div class="gridStats"><div class="stat"><strong>${v.correct}</strong><small>정답으로 삭제</small></div><div class="stat"><strong>${v.missed}</strong><small>복습 중 오답</small></div><div class="stat"><strong>${n}</strong><small>남은 오답</small></div></div><p>틀린 문제는 오답노트에 남아 있습니다. 다시 도전하면 재출제됩니다.</p><button class="primary" id="tqReviewAgain">남은 오답 다시 풀기</button></div>`;$('tqReviewAgain').onclick=launchReview;return}
const q=current(v),answered=!!v.feedback;h+=`<div class="gridStats"><div class="stat"><strong>${v.at+1}/${v.ids.length}</strong><small>이번 복습</small></div><div class="stat"><strong>${v.correct}</strong><small>정답으로 삭제</small></div><div class="stat"><strong>${n}</strong><small>남은 오답</small></div></div><div class="card termquiz-card"><div class="qmeta"><span>오답 복습 · ${q.chapter}장</span><span>누적 오답 ${s.wrong[q.id]?.count||1}회</span></div><div class="question">설명에 맞는 핵심 용어를 입력하세요.</div><p class="termquiz-definition">${esc(q.meaning)}</p>`;
if(!answered)h+=`<form id="tqReviewForm" novalidate><label for="tqReviewAnswer">정답 입력</label><input id="tqReviewAnswer" type="text" class="shortInput" autocomplete="off" inputmode="text" placeholder="기억나는 용어를 입력하세요"><button id="tqReviewCheck" type="submit" class="primary">정답 확인</button></form><p id="tqReviewError" role="alert" class="termquiz-error" hidden></p>`;
else h+=`<div class="termquiz-feedback ${v.feedback.ok?'correct':'incorrect'}" role="status" aria-live="polite"><strong>${v.feedback.ok?'정답입니다. 오답노트에서 삭제했습니다!':'오답입니다. 아래 정답을 확인하고 다시 도전하세요. 이 문제는 오답노트에 남아 있습니다.'}</strong><p>내가 입력한 답: <b>${esc(v.feedback.answer||'')}</b></p><p>정답: <b>${esc(q.term)}</b></p><p>${esc(q.meaning)}</p>${q.example?`<p><b>예시</b> · ${esc(q.example)}</p>`:''}</div><div class="termquiz-review-actions">${v.feedback.ok?'':`<button type="button" id="tqReviewRetry" class="primary">↻ 같은 문제 다시 풀기</button>`}<button type="button" id="tqReviewNext" class="secondary">${v.at===v.ids.length-1?'복습 결과 보기':'다음 오답 →'}</button></div>`;
h+='</div><p class="note">오답노트는 브라우저에 저장됩니다. 오답노트에서 맞힌 문제만 삭제하므로, 일반 퀴즈를 새로 시작해도 남은 오답은 유지됩니다.</p>';$('view').innerHTML=h;
if($('tqReviewForm')){
  const form=$('tqReviewForm'), input=$('tqReviewAnswer'),button=$('tqReviewCheck');
  let processing=false;
  const checkAnswer=e=>{
    if(e)e.preventDefault();
    if(processing)return;
    const answer=String(input.value||'').trim();
    const er=$('tqReviewError');
    if(!answer){if(er){er.textContent='답을 입력한 다음 정답 확인을 눌러주세요.';er.hidden=false;}input.focus();return;}
    processing=true;
    if(button){button.disabled=true;button.textContent='채점 중…';}
    try{
      const state=load(),ss=state.review;
      if(!ss?.ids?.length)throw new Error('오답 문제를 찾지 못했습니다. 다시 시작해주세요.');
      const qq=current(ss);
      if(!qq)throw new Error('현재 문제를 찾을 수 없습니다. 다시 시작해주세요.');
      const ok=isCorrect(qq,answer);
      ss.feedback={ok,answer};
      if(ok){delete state.wrong[qq.id];ss.correct=(ss.correct||0)+1;}
      else{state.wrong[qq.id]={count:(state.wrong[qq.id]?.count||0)+1,updated:Date.now()};ss.missed=(ss.missed||0)+1;}
      save(state);
      drawReview();
    }catch(error){
      console.error('DEQ 오답노트 채점 실패:',error);
      if(er){er.hidden=false;er.textContent='채점 오류: '+error.message;}
      processing=false;
      if(button){button.disabled=false;button.textContent='정답 확인';}
    }
  };
  form.addEventListener('submit',checkAnswer);
  input.focus();
}
if($('tqReviewRetry'))$('tqReviewRetry').onclick=()=>{const st=load();if(!st.review?.feedback||st.review.feedback.ok)return;st.review.feedback=null;save(st);drawReview()};
if($('tqReviewNext'))$('tqReviewNext').onclick=()=>{const st=load();if(!st.review.feedback)return;st.review.at++;st.review.feedback=null;save(st);drawReview()}}
window.DEQTermQuiz={init,main:drawMain,wrong:drawReview};
})();
