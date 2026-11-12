/* =====================================================================
   core.js · 이론 시뮬레이션 화면 엔진 (가장 마지막에 불러옵니다)
   회귀 · 군집 · 연관 분석 세 앱이 똑같은 파일을 씁니다.
   app.js가 APP, STEPS, GROUPS, QUIZ, MISSIONS, VIEWS, ACT, IN, DRAG, CLICK, PICK, FLOW, KEYNOTE를 정의합니다.
   ===================================================================== */
/* ---------- 상태 ---------- */
const S={step:0,tab:'calc',done:new Set(),quiz:{},seen:new Set(),app:APP.init()};
try{const d=JSON.parse(localStorage.getItem(APP.key)||'null');if(d){S.done=new Set((d.done||[]).filter(id=>MISSIONS[id]));S.quiz=d.quiz||{};S.seen=new Set(d.seen||[]);if(d.step>=0&&d.step<STEPS.length)S.step=d.step;if(d.app)S.app={...APP.init(),...d.app}}}catch(e){}
function save(){try{localStorage.setItem(APP.key,JSON.stringify({done:[...S.done],quiz:S.quiz,seen:[...S.seen],step:S.step,app:S.app}))}catch(e){}}
const A=()=>S.app;

/* ---------- 도전 과제 · 연습문제 ---------- */
const MISSION_IDS=Object.keys(MISSIONS);
const QUIZ_N=Object.values(QUIZ).reduce((n,q)=>n+q.items.length,0);
const quizDone=key=>QUIZ[key].items.every((it,n)=>S.quiz[key+n]===it.a);
function checkMissions(){MISSION_IDS.forEach(id=>{if(!S.done.has(id)&&MISSIONS[id].step===S.step){try{if(MISSIONS[id].ok())S.done.add(id)}catch(e){}}})}
VIEWS.missions=()=>{const ms=MISSION_IDS.filter(id=>MISSIONS[id].step===S.step);const n=ms.filter(id=>S.done.has(id)).length;
  return `<section class="card wide mission"><div class="card-h"><p class="eyebrow">도전 과제 · ${n} / ${ms.length}</p><h3>${n===ms.length?'이 단계의 도전 과제를 모두 해결했어요!':'시뮬레이션을 조작하며 아래 과제를 해결해 보세요'}</h3></div><ul>${ms.map(id=>`<li class="${S.done.has(id)?'ok':''}"><i>${S.done.has(id)?'✓':''}</i><span>${MISSIONS[id].t}</span></li>`).join('')}</ul></section>`};
VIEWS.quiz=()=>{const key=STEPS[S.step].quiz,Q=QUIZ[key];
  return card(Q.title,Q.items.map((it,n)=>{const qid=key+n,p=S.quiz[qid],ok=p===it.a;
    return `<div class="quiz-item"><p class="q"><b>${n+1}.</b>${it.q}</p><div class="opts">${it.o.map((o,k)=>`<button type="button" class="opt ${p===k+1?(ok?'right':'wrong'):''}" data-act="quiz" data-q="${qid}" data-v="${k+1}">${CIRC[k]} ${o}</button>`).join('')}</div>${p?`<p class="fb ${ok?'good':'bad'}">${esc(ok?'정답입니다.\n'+it.e:'정답이 아니에요.\n시뮬레이션을 다시 살펴보고 한 번 더 골라 보세요.')}</p>`:''}</div>`}).join(''),
    {cls:'quiz',pre:'<p class="eyebrow">연습문제</p>',sub:Q.intro});
};

/* ---------- 그리기 ---------- */
// 문장마다 줄을 바꿔 한 줄에 한 문장씩 보이게 합니다
const br=h=>h.replace(/(다\.|요\.|요\?|요!) +/g,'$1<br>');
const stepDone=i=>{if(APP.stepDone)return APP.stepDone(i);const ms=MISSION_IDS.filter(id=>MISSIONS[id].step===i);return i===0?S.seen.has(0):ms.length?ms.every(id=>S.done.has(id)):STEPS[i].quiz?quizDone(STEPS[i].quiz):S.seen.has(i)};
function renderRail(){
  $('#rail').innerHTML=STEPS.map((s,i)=>`${GROUPS[i]?`<li class="group">${GROUPS[i]}</li>`:''}<li><button type="button" data-act="go" data-step="${i}" class="${stepDone(i)&&i!==S.step?'done':''}" ${i===S.step?'aria-current="step"':''}><span class="num">${stepDone(i)&&i!==S.step?'✓':i===0?'·':i}</span><span>${s.short}</span></button></li>`).join('');
  const qOk=Object.entries(S.quiz).filter(([k,v])=>{const key=k.replace(/\d+$/,''),n=+k.match(/\d+$/)[0];return QUIZ[key]&&QUIZ[key].items[n]&&QUIZ[key].items[n].a===v}).length;
  const tot=MISSION_IDS.length+QUIZ_N,n=S.done.size+qOk,pg=APP.progress?APP.progress():null,pct=pg?pg.pct:Math.round(n/tot*100);
  $('#prog').innerHTML=`<div class="prog-top"><span>${pg?pg.title:'학습 진행률'}</span><b>${pct}%</b></div><div class="bar"><i style="width:${pct}%"></i></div><small>${pg?pg.label:`${MISSION_IDS.length?`도전 과제 ${S.done.size} / ${MISSION_IDS.length} · `:''}연습문제 ${qOk} / ${QUIZ_N}`}</small>
    <div class="tools"><button type="button" class="btn" data-act="step-reset">↺ 이 단계 처음 상태로</button><button type="button" class="btn" data-act="reset">↻ 모두 다시 시작</button></div>`;
}
function renderFlow(){
  $('#flow').innerHTML=FLOW().map(g=>`<li><button type="button" class="stage ${g.steps.includes(S.step)?'on':''}" data-act="go" data-step="${g.steps[0]}"><span class="st-l">${g.l}${g.d?'<i>✓</i>':''}</span><b class="${g.wait?'wait':''}">${g.b}</b><small>${g.s}</small></button></li>`).join('');
}
// 계산 과정 패널: # 주석과 숫자에 색을 입힙니다
function calcHTML(t){return t.split('\n').map(l=>{if(/^\s*#/.test(l))return`<span class="c">${esc(l)}</span>`;return esc(l).replace(/(=|→|≈)/g,'<span class="k">$1</span>').replace(/(^|[^\w.#])(−?\d+(?:\.\d+)?)/g,'$1<span class="n">$2</span>')}).join('\n')}
const asideText=()=>S.tab==='key'?KEYNOTE:(STEPS[S.step].calc?STEPS[S.step].calc():'# 이 단계는 계산 과정이 없습니다.\n# 왼쪽 시뮬레이션을 조작해 보세요.');
function renderAside(){if(!$('#code'))return;$('#code').innerHTML=calcHTML(asideText());$('#code-foot').innerHTML=S.tab==='key'?'단원 전체의 핵심 개념과 공식입니다.':'왼쪽에서 값을 바꾸면 계산 과정이 바로 바뀝니다.'}
function syncInputs(){
  document.querySelectorAll('[data-in]').forEach(el=>{const h=IN[el.dataset.in];if(!h||!h.get)return;const v=h.get();
    if(el.type==='checkbox')el.checked=!!v;else if(el!==document.activeElement||el.type==='range')el.value=v;
    const o=el.closest('label')?.querySelector('output');if(o)o.textContent=h.fmt?h.fmt(v):v});
}
function upd(){
  checkMissions();
  document.querySelectorAll('.slot').forEach(el=>{const f=VIEWS[el.dataset.v];if(f)el.innerHTML=br(f())});
  syncInputs();renderRail();renderFlow();renderAside();save();
}
function renderStep(){
  const i=S.step,s=STEPS[i];S.seen.add(i);
  const hasM=MISSION_IDS.some(id=>MISSIONS[id].step===i);
  $('#main').innerHTML=`<header class="step-h"><p class="eyebrow">${i===0?'먼저 알아보기':`STEP ${i} / ${STEPS.length-1}`}${s.page?` · 교과서 ${s.page}`:''}</p><h2>${s.title}</h2><p class="goal">${br(s.goal)}</p></header>
  <div class="body">
    <div class="left">
      ${s.concept?`<div class="concept">${br(s.concept)}</div>`:''}
      ${hasM?slot('missions'):''}
      <div class="cards">${br(s.render())}${s.quiz?slot('quiz','wide-slot'):''}</div>
      <nav class="pager">${i>0?`<button class="btn" type="button" data-act="go" data-step="${i-1}">← ${STEPS[i-1].short}</button>`:'<span></span>'}${i<STEPS.length-1?`<button class="btn primary" type="button" data-act="go" data-step="${i+1}">${STEPS[i+1].short} →</button>`:'<span></span>'}</nav>
    </div>
  </div>`;
  upd();
  APP.afterRender?.();
}

/* ---------- 이벤트 ---------- */
document.addEventListener('input',e=>{
  const el=e.target,h=IN[el.dataset.in];if(!h)return;
  const v=el.type==='checkbox'?el.checked:el.type==='range'||el.type==='number'?+el.value:el.value;
  h.set(v);const o=el.closest('label')?.querySelector('output');if(o&&h.get)o.textContent=h.fmt?h.fmt(h.get()):h.get();
  if(h.live!==false)upd();
});
document.addEventListener('click',e=>{
  const pk=e.target.closest('[data-pick]');
  if(pk&&PICK[pk.dataset.pick]){if(PICK[pk.dataset.pick](+pk.dataset.i,pk)!==false)upd();return}
  const hit=e.target.closest('[data-click]');
  if(hit&&CLICK[hit.dataset.click]){const svg=hit.closest('svg'),p=dataPt(svg.id,e);if(p&&CLICK[hit.dataset.click](p)!==false)upd();return}
  const b=e.target.closest('button');if(!b)return;
  const act=b.dataset.act;
  if(act==='go'){APP.leave?.();S.step=+b.dataset.step;renderStep();$('.step-h').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
  else if(act==='quiz'){S.quiz[b.dataset.q]=+b.dataset.v;upd()}
  else if(act==='tab'){S.tab=b.dataset.v;b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderAside()}
  else if(act==='reset'){APP.leave?.();S.app=APP.init();S.done.clear();S.quiz={};renderStep()}
  else if(act==='step-reset'){APP.leave?.();APP.resetStep?.(S.step);renderStep()}
  else if(act==='copy'){
    const done=()=>{b.textContent='복사됨';setTimeout(()=>b.textContent='복사',1400)};
    const fallback=()=>{const r=document.createRange();r.selectNodeContents($('#code'));const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='선택됨 → Ctrl+C'};
    try{navigator.clipboard.writeText(asideText()).then(done,fallback)}catch(_){fallback()}
  }
  else if(ACT[act]){if(b.parentElement.matches('.seg[data-tog]'))b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(ACT[act](b.dataset,b)!==false)upd()}
});
// 끌기: data-drag가 붙은 점을 잡으면 DRAG[name](데이터 좌표, i)를 부릅니다
let DRG=null;
document.addEventListener('pointerdown',e=>{const t=e.target.closest('[data-drag]');if(!t)return;const svg=t.closest('svg');DRG={name:t.dataset.drag,i:+t.dataset.i,id:svg.id};e.preventDefault();document.body.classList.add('dragging')});
addEventListener('pointermove',e=>{if(!DRG)return;const p=dataPt(DRG.id,e);if(p&&DRAG[DRG.name]){DRAG[DRG.name](p,DRG.i);upd()}});
addEventListener('pointerup',()=>{if(DRG){DRG=null;document.body.classList.remove('dragging');APP.dragEnd?.();upd()}});
const tip=$('#tip');
document.addEventListener('pointermove',e=>{
  if(DRG){tip.hidden=true;return}
  const t=e.target.closest&&e.target.closest('[data-tip]');
  if(!t){tip.hidden=true;return}
  tip.textContent=t.getAttribute('data-tip');tip.hidden=false;
  const r=tip.getBoundingClientRect();let x=e.clientX+14,y=e.clientY+14;
  if(x+r.width>innerWidth-8)x=e.clientX-r.width-14;if(y+r.height>innerHeight-8)y=e.clientY-r.height-14;
  tip.style.left=Math.max(8,x)+'px';tip.style.top=Math.max(8,y)+'px';
});
document.addEventListener('pointerleave',()=>tip.hidden=true);

renderStep();
