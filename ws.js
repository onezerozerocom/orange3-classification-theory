/* =====================================================================
   ws.js · 문제 칸 · 저장하기 (app.js 다음, core.js 앞에서 불러옵니다)
   문항 목록(FIELDS · SEC_NAMES)은 app.js에 있습니다.
   ===================================================================== */

/* ---------- 답 ('저장하기'를 누르면 이 브라우저에 저장, 다음에 열면 이어서) ---------- */
const WS_KEY = 'knn-theory-ws-answers-v1';
let WSA = {}, savedAt = null;
try { const d = JSON.parse(localStorage.getItem(WS_KEY) || 'null'); if (d && d.a) { WSA = d.a; savedAt = d.at || null; } } catch (e) {}
let savedSnap = JSON.stringify(WSA);

/* ---------- 입력 칸 만들기 ---------- */
const bl = (k, w = 6, lab = '빈칸') => `<span class="ws-bl">(<input class="ws-in" data-k="${k}" style="width:${w}em" aria-label="${lab}" autocomplete="off">)</span>`;
const ti = (k, lab = '칸', cls = '') => `<input class="ws-in ws-cell ${cls}" data-k="${k}" aria-label="${lab}" autocomplete="off">`;
const pick = (k, opts, lab = '') => `<span class="ws-pick" role="radiogroup"${lab ? ` aria-label="${lab}"` : ''}>${opts.map(o => `<label><input type="radio" name="${k}" data-k="${k}" value="${o}"><span>${o}</span></label>`).join('')}</span>`;
const ox = (k, v, lab) => `<label class="ws-o"><input type="radio" name="${k}" data-k="${k}" value="${v}" aria-label="${lab}"><span>○</span></label>`;
const ta = (k, rows = 3, lab = '답') => `<textarea class="ws-ta" data-k="${k}" rows="${rows}" aria-label="${lab}"></textarea>`;
const tbl = (head, rows, o = {}) => `<div class="tw"><table class="ws-t${o.cls ? ' ' + o.cls : ''}"><thead><tr>${head.map((h, i) => `<th class="${i === 0 ? 'l' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i === 0 ? 'l' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const wsCard = (title, body) => `<section class="card wide ws"><div class="card-h"><h3 class="ws-h">${title}</h3></div>${body}</section>`;
const q = t => `<p class="ws-q">▣ ${t}</p>`;
const L = t => `<p class="ws-l">${t}</p>`;
const after = (t, inner) => `<details class="guide ws-after"><summary><span>확인</span>${t}</summary>${inner}</details>`;

/* ---------- 단계 완료 · 진행률 · 위쪽 흐름 ---------- */
const filled = k => String(WSA[k] ?? '').trim() !== '';
const secFields = s => FIELDS().filter(f => f[2] === s);
APP.stepDone = i => i === 0 ? S.seen.has(0) : secFields(i).every(f => filled(f[0]));
APP.progress = () => {
  const F = FIELDS(), n = F.filter(f => filled(f[0])).length;
  return { title: '풀이 진행률', pct: Math.round(n / F.length * 100), label: `작성한 칸 ${n} / ${F.length}` };
};
function FLOW() {
  return Object.keys(SEC_NAMES).map(st => {
    st = +st; const fs = secFields(st), n = fs.filter(f => filled(f[0])).length;
    return { steps: st === 1 ? [1, 0] : [st], l: SEC_NAMES[st].replace(/^\d+\.\s*/, ''), b: `${n} / ${fs.length}`, s: `${st}번`, d: n === fs.length, wait: n === 0 };
  });
}

/* ---------- 입력 채우기 ---------- */
function wsFill() {
  document.querySelectorAll('[data-k]').forEach(el => {
    const v = WSA[el.dataset.k];
    if (el.type === 'radio') el.checked = v === el.value;
    else if (el !== document.activeElement) el.value = v ?? '';
  });
  const ll = $('#leftList');
  if (ll) {
    const left = Object.keys(SEC_NAMES).map(s => [s, secFields(+s).filter(f => !filled(f[0])).length]).filter(([, n]) => n);
    ll.innerHTML = left.length ? `<p class="note">아직 비어 있는 칸: ${left.map(([s, n]) => `${SEC_NAMES[s]} <b>${n}칸</b>`).join(', ')}</p>` : '<p class="note">모든 칸을 채웠어요.</p>';
  }
}
APP.afterRender = () => { wsFill(); showSaved(); };
document.addEventListener('input', e => {
  const el = e.target.closest('[data-k]');
  if (!el) return;
  if (el.type === 'radio') { if (el.checked) WSA[el.dataset.k] = el.value; }
  else WSA[el.dataset.k] = el.value;
  renderRail(); renderFlow(); showSaved();
  if ($('#leftList')) wsFill();
});

/* ---------- 저장하기 (이 브라우저에만 저장) ---------- */
function showSaved(msg, cls) {
  const dirty = JSON.stringify(WSA) !== savedSnap;
  const t = savedAt ? new Date(savedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const fab = $('#saveBtn'), m2 = $('#saveMsg2');
  if (fab) { fab.textContent = dirty ? '저장하기' : savedAt ? '✓ 저장됨' : '저장하기'; fab.className = 'fab-btn' + (dirty ? (savedAt ? ' warn' : '') : savedAt ? ' ok' : ''); }
  const text = msg || (dirty ? (savedAt ? `${t}에 저장한 뒤 고친 내용이 있어요.` : '아직 저장하지 않았어요.') : savedAt ? `✓ ${t}에 저장했어요.` : '');
  const c = cls || (dirty ? 'warn' : 'ok');
  if (m2) { m2.textContent = text; m2.className = 'ws-msg ' + c; }
  return { text, c };
}
let fabTimer = null;
function flash(t, cls = '') { const el = $('#fabMsg'); el.textContent = t; el.className = 'fab-msg ' + cls; clearTimeout(fabTimer); fabTimer = setTimeout(() => { el.textContent = ''; }, cls === 'warn' ? 6000 : 3000); }
function saveAll() {
  try {
    const at = Date.now();
    localStorage.setItem(WS_KEY, JSON.stringify({ at, a: WSA }));
    savedAt = at; savedSnap = JSON.stringify(WSA);
    const r = showSaved(); flash('✓ 이 브라우저에 저장했어요.', 'ok'); return r;
  } catch (e) { flash('저장하지 못했어요. 브라우저 설정에서 사이트 데이터 저장을 허용했는지 확인해 주세요.', 'warn'); showSaved('저장하지 못했어요.', 'warn'); }
}
document.addEventListener('click', e => { if (e.target.closest('#saveBtn, #saveBtn2')) saveAll(); });
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveAll(); } });
let clearArmed = null;
document.addEventListener('click', e => {
  const b = e.target.closest('#clearBtn'); if (!b) return;
  if (!clearArmed) { b.textContent = '정말 지울까요? 한 번 더 누르기'; b.classList.add('arm'); clearArmed = setTimeout(() => { clearArmed = null; b.textContent = '저장한 답 지우기'; b.classList.remove('arm'); }, 3000); return; }
  clearTimeout(clearArmed); clearArmed = null;
  try { localStorage.removeItem(WS_KEY); } catch (err) {}
  WSA = {}; savedAt = null; savedSnap = JSON.stringify(WSA);
  renderStep(); flash('저장한 답을 지웠어요.', 'ok');
});
// 저장하지 않은 답이 있으면 탭을 닫기 전에 한 번 묻기
window.addEventListener('beforeunload', e => { if (JSON.stringify(WSA) !== savedSnap) { e.preventDefault(); e.returnValue = ''; } });
