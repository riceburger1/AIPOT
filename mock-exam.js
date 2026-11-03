/* AI-POT 1·2급 실전 모의고사: 학습용 창작 문항, 기기별 저장 */
let MOCK_BANK=null;
const MOCK_KEY='yeonje-aipot-mock-v2-exam400';
const mkDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const mkLoad=()=>{try{return JSON.parse(localStorage.getItem(MOCK_KEY))}catch{return null}};
const mkSave=s=>localStorage.setItem(MOCK_KEY,JSON.stringify(s));
const mkNorm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s\-_().·/]/g,'');
function mkShuffle(items,random){let a=[...items];for(let i=a.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function mkMake(session,prev){const date=mkDate(),r=rng(seedNum('aipot-mock-'+date+'-'+session));let pick=(bank,n,history)=>{let mixed=mkShuffle(bank,r),fresh=mixed.filter(x=>!history.includes(x.id));return [...fresh,...mixed.filter(x=>history.includes(x.id))].slice(0,n)};
const chosenMC=pick(MOCK_BANK.mc,10,prev),chosenShort=pick(MOCK_BANK.short,10,prev);
const questions=[...chosenMC.map(q=>({...q,kind:'mc',options:mkShuffle(q.choices,r)})),...chosenShort.map(q=>({...q,kind:'short'}))];
return {date,session,questions,seenIds:[...new Set([...prev,...questions.map(q=>q.id)])],queue:questions.map((_,i)=>i),position:0,feedback:null,misses:{},results:{},round:1,done:false,attempts:0,firstAnswers:{}}}
function mkState(){let s=mkLoad();if(!s||s.date!==mkDate()){s=mkMake(0,[]);mkSave(s)}return s}
function mkReset(mode){const old=mkState();if(!old.done&&!confirm('진행 중인 답변 기록을 초기화하고 다시 시작할까요?'))return;let s;
if(mode==='same')s={...mkMake(old.session,[]),questions:old.questions};
else if(mode==='wrong'){const misses=Object.keys(old.misses).map(Number);if(!misses.length){alert('틀린 문제가 없습니다.');return} s={...mkMake(old.session,[]),questions:old.questions,queue:misses,round:2};}
else s=mkMake(old.session+1,old.seenIds||old.questions.map(q=>q.id));
mkSave(s);renderMockExam()}
function mkAnswer(value){let s=mkState();if(s.done||s.feedback)return;let index=s.queue[s.position],q=s.questions[index],ok=q.kind==='mc'?value===q.answer:[q.answer,...(q.aliases||[])].some(x=>mkNorm(x)===mkNorm(value));s.feedback={index,value,ok};s.attempts++;if(!(index in s.firstAnswers))s.firstAnswers[index]=ok;if(!ok)s.misses[index]=(s.misses[index]||0)+1;s.results[index]=ok?'correct':'wrong';mkSave(s);renderMockExam()}
function mkNext(){let s=mkState();if(!s.feedback)return;s.feedback=null;s.position++;if(s.position>=s.queue.length){const errors=s.queue.filter(i=>s.results[i]!=='correct');if(errors.length){s.queue=errors;s.position=0;s.round++}else{s.done=true}}mkSave(s);renderMockExam()}
function mkEsc(x){return escapeHtml(x)}
function renderMockExam(){if(!MOCK_BANK){$('view').innerHTML='<div class="card">문제은행을 불러오는 중입니다.</div>';return}const s=mkState(),hits=Object.values(s.results).filter(v=>v==='correct').length;let bar=`<div class="mock-brief"><span>오늘: ${mkEsc(s.date)}</span><span>객관식 10 · 단답형 10 · 400문항 문제은행</span><span>AI-POT 1·2급 통합 연습</span></div><div class="mock-toolbar"><button id="mkSame">↻ 다시 도전 <small>동일 20문제</small></button><button id="mkWrong">✎ 오답만 다시 도전 <small>${Object.keys(s.misses).length}문제</small></button><button id="mkNew">✦ 새로운 문제 도전 <small>새로운 20문제</small></button></div>`;
let out=pageHeader('AI-POT 실전 모의고사','LLM · 고급 프롬프트 · RAG · AI 윤리 · 환각 · 별도 학습 기록')+bar;
if(s.done){let first=Object.values(s.firstAnswers).filter(Boolean).length;out+=`<div class="card done"><div class="symbol">🏆</div><h2>20문제 학습 완료!</h2><p>최초 정답 ${first}/20 · 총 응답 ${s.attempts}회 · 오답 시도 ${Object.values(s.misses).reduce((x,y)=>x+y,0)}회</p><p>같은 날에도 다시 도전하거나 새로운 문제를 풀 수 있습니다.</p></div>`;}
else{let index=s.queue[s.position],q=s.questions[index],fb=s.feedback,correct=mkEsc(q.answer);out+=`<div class="gridStats"><div class="stat"><strong>${hits}/20</strong><small>현재 정답</small></div><div class="stat"><strong>${s.round===1?'1차':s.round+'차'}</strong><small>풀이 단계</small></div><div class="stat"><strong>${Object.values(s.misses).reduce((a,b)=>a+b,0)}</strong><small>오답 횟수</small></div></div><div class="progress"><div class="bar" style="width:${hits*5}%"></div></div><div class="card"><div class="qmeta"><span>문제 ${index+1}/20 · ${q.kind==='mc'?'객관식':'단답형'} · ${s.round===1?'첫 풀이':'오답 재도전'}</span></div><h3>[문제 ${String(index+1).padStart(2,'0')}] (${q.kind==='mc'?'객관식':'단답형'}) ${mkEsc(q.question)}</h3>`;
if(q.kind==='mc')out+=`<div class="choices">${q.options.map((v,i)=>`<button class="choice ${fb?(v===q.answer?'correct':v===fb.value?'wrong':''):''}" data-mkchoice="${i}" ${fb?'disabled':''}>${'①②③④'[i]} ${mkEsc(v)}</button>`).join('')}</div>`;
else out+=`<form id="mkForm"><input class="shortInput" id="mkInput" autocomplete="off" placeholder="정답 용어를 입력하세요" ${fb?'disabled':''} value="${fb?mkEsc(fb.value):''}"><div class="actions"><button class="primary" ${fb?'disabled':''}>정답 확인</button></div></form>`;
if(fb){out+=`<div class="feedback ${fb.ok?'':'bad'}"><strong>${fb.ok?'정답입니다!':'오답입니다. 해당 문제는 다시 출제됩니다.'}</strong><div><b>[정답]</b> ${q.kind==='mc'?('①②③④'[q.options.indexOf(q.answer)]+'번 · '):''}<b>${correct}</b></div><div class="mock-explain"><b>[해설]</b> ${mkEsc(q.explain)}</div></div><div class="actions"><button class="primary" id="mkNext">다음 문제 →</button></div>`}
out+='</div><p class="note">정답을 확인한 뒤 다음 문제로 이동합니다. 오답은 해당 세트 종료 후 반복 출제되며, 매일 한국시간 00:00에 기본 세트가 바뀝니다. 기록은 이 기기에만 저장됩니다.</p>'}
$('view').innerHTML=out;
$('mkSame').onclick=()=>mkReset('same');$('mkWrong').onclick=()=>mkReset('wrong');$('mkNew').onclick=()=>mkReset('new');
if(!s.done){const q=s.questions[s.queue[s.position]];if(s.feedback){$('mkNext').onclick=mkNext}else if(q.kind==='mc'){document.querySelectorAll('[data-mkchoice]').forEach(b=>b.onclick=()=>mkAnswer(q.options[Number(b.dataset.mkchoice)]))}else{$('mkForm').onsubmit=e=>{e.preventDefault();const v=$('mkInput').value.trim();if(v)mkAnswer(v)};$('mkInput').focus()}}
}
fetch('./mock-bank.json').then(r=>{if(!r.ok)throw Error('모의고사 문제은행 응답 오류');return r.json()}).then(d=>{MOCK_BANK=d;if(typeof tab!=='undefined'&&tab==='mockexam')renderMockExam()}).catch(err=>{if(typeof tab!=='undefined'&&tab==='mockexam')$('view').innerHTML=`<div class="card">모의고사를 불러오지 못했습니다: ${mkEsc(err.message)}</div>`});
