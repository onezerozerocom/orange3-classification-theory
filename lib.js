/* =====================================================================
   lib.js · 이론 시뮬레이션 공통 도우미 (가장 먼저 불러옵니다)
   회귀 · 군집 · 연관 분석 세 앱이 똑같은 파일을 씁니다.
   ===================================================================== */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sum=a=>a.reduce((s,x)=>s+x,0);
const mean=a=>sum(a)/a.length;
const CIRC='①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮';
// 소수 자리 고정 + 음수 기호를 −로 (−0.00은 0.00으로)
const fx=(v,d=2)=>{let s=(+v).toFixed(d);if(/^-0\.?0*$/.test(s))s=s.slice(1);return s.replace('-','−')};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

/* ---------- 시드 고정 난수 ---------- */
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function gauss(r){let u=0;while(!u)u=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*r())}

/* ---------- 표 · 카드 ---------- */
function gridTable(head,body,o={}){const L=i=>i===0||o.left?'l ':'';return `<div class="tw"><table><thead><tr>${head.map((h,i)=>`<th class="${L(i)}">${h}</th>`).join('')}</tr></thead><tbody>${body.map(r=>`<tr${r.cls?` class="${r.cls}"`:''}>${(r.cells||r).map((c,i)=>typeof c==='object'&&c!==null?`<td class="${L(i)}${c.cls||''}">${c.v}</td>`:`<td class="${L(i)}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function card(title,body,o={}){return `<section class="card ${o.wide===false?'':'wide'} ${o.cls||''}"${o.id?` id="${o.id}"`:''}><div class="card-h">${o.pre||''}<h3>${title}</h3>${o.sub?`<p>${o.sub}</p>`:''}</div>${body}</section>`}
const fact=(l,v,s,cls='')=>`<div class="fact ${cls}"><span>${l}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
const guide=(title,inner)=>`<details class="guide"><summary><span>더 알아보기</span>${title}</summary>${inner}</details>`;
const dl=items=>`<dl>${items.map(([t,d])=>`<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl>`;
const insight=(t,b,mark='✦')=>`<div class="insight"><span>${mark}</span><p><b>${t}</b><br>${b}</p></div>`;
const slot=(v,cls='')=>`<div class="slot ${cls}" data-v="${v}"></div>`;
// 슬라이더: IN[name]의 get/set/fmt로 값과 표시를 맞춥니다
const range=(name,label,min,max,step)=>`<label class="ctl"><span>${label}</span><input type="range" data-in="${name}" min="${min}" max="${max}" step="${step}"><output></output></label>`;
// cur를 ''로 주면 누른 버튼이 선택 상태로 남지 않는 '바로가기' 버튼 묶음이 됩니다
const seg=(act,items,cur)=>`<div class="seg"${cur===''?'':' data-tog'} role="group">${items.map(([v,t])=>`<button type="button" data-act="${act}" data-v="${v}" aria-pressed="${String(cur)===String(v)}">${t}</button>`).join('')}</div>`;
const btn=(act,t,o={})=>`<button type="button" class="btn ${o.cls||''}" data-act="${act}"${o.v!==undefined?` data-v="${o.v}"`:''}${o.dis?' disabled':''}>${t}</button>`;

/* ---------- 차트 틀 ---------- */
function niceStep(span,n){const s0=span/n;const mag=10**Math.floor(Math.log10(s0));const e=s0/mag;return(e>=7.5?10:e>=3.5?5:e>=1.5?2:1)*mag}
function ticks(lo,hi,n=5){if(hi===lo)return[lo];const st=niceStep(hi-lo,n);const out=[];for(let v=Math.ceil(lo/st-1e-9)*st;v<=hi+st*1e-9;v+=st)out.push(+v.toFixed(10));return out}
const tf=v=>{const a=Math.abs(v);return a>=100?String(Math.round(v)):String(+v.toFixed(a>=10?1:2)).replace('-','−')};
const PLOTS={};
// plot({id, w, h, x:[lo,hi], y:[lo,hi], xl, yl, xt, yt, click, label}) → {X, Y, head, end}
function plot(o){
  const w=o.w||520,h=o.h||360,m={l:46,r:14,t:14,b:42,...(o.m||{})},iw=w-m.l-m.r,ih=h-m.t-m.b;
  const [x0,x1]=o.x,[y0,y1]=o.y;
  const P={w,h,m,iw,ih,X:v=>m.l+(v-x0)/(x1-x0)*iw,Y:v=>m.t+ih-(v-y0)/(y1-y0)*ih,iX:p=>x0+(p-m.l)/iw*(x1-x0),iY:p=>y0+(m.t+ih-p)/ih*(y1-y0),x:o.x,y:o.y};
  PLOTS[o.id]=P;
  const xt=Array.isArray(o.xt)?o.xt:ticks(x0,x1,o.xt||6),yt=Array.isArray(o.yt)?o.yt:ticks(y0,y1,o.yt||5);
  let s=`<svg id="${o.id}" class="chart${o.click||o.drag?' interactive':''}" viewBox="0 0 ${w} ${h}"${o.max?` style="max-width:${o.max}px"`:''} role="img" aria-label="${esc(o.label||'그래프')}">`;
  if(o.click)s+=`<rect class="hit" data-click="${o.click}" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}"/>`;
  if(o.grid!==false){yt.forEach(t=>{s+=`<line class="grid" x1="${m.l}" x2="${m.l+iw}" y1="${P.Y(t)}" y2="${P.Y(t)}" pointer-events="none"/>`});xt.forEach(t=>{s+=`<line class="grid" x1="${P.X(t)}" x2="${P.X(t)}" y1="${m.t}" y2="${m.t+ih}" pointer-events="none"/>`})}
  yt.forEach(t=>{s+=`<text class="tick" x="${m.l-6}" y="${P.Y(t)+4}" text-anchor="end">${o.yf?o.yf(t):tf(t)}</text>`});
  xt.forEach(t=>{s+=`<text class="tick" x="${P.X(t)}" y="${m.t+ih+15}" text-anchor="middle">${o.xf?o.xf(t):tf(t)}</text>`});
  s+=`<line class="base" x1="${m.l}" x2="${m.l+iw}" y1="${m.t+ih}" y2="${m.t+ih}"/><line class="base" x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${m.t+ih}"/>`;
  if(o.xl)s+=`<text class="axis-t" x="${m.l+iw/2}" y="${h-6}">${o.xl}</text>`;
  if(o.yl)s+=`<text class="axis-t" transform="translate(13 ${m.t+ih/2}) rotate(-90)">${o.yl}</text>`;
  P.head=s;P.end='<\/svg>';
  return P;
}
// 화면 좌표 → svg 좌표 → 데이터 좌표
function dataPt(id,e){const svg=document.getElementById(id),P=PLOTS[id];if(!svg||!P)return null;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return{x:P.iX(q.x),y:P.iY(q.y),sx:q.x,sy:q.y}}

