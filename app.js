/* =====================================================================
   분류 · k-최근접 이웃(KNN) · 이론 시뮬레이션 + 직접 풀기
   lib.js 다음, ws.js · core.js 앞에서 불러옵니다.
   ===================================================================== */

/* ---------- 데이터 ---------- */
const CLS_F = ['귤', '레몬'], G_F = [2, 3];                       // 과일: 범주 이름, 색 번호
// [표1] 예제 과일 8개 (단맛 점수, 신맛 점수)
const EXP = { pts: [[5, 2], [9, 5], [10, 1], [10, 2], [5, 7], [2, 9], [3, 10], [1, 9]], c: [0, 0, 0, 0, 1, 1, 1, 1], lab: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] };
const EXQ0 = [5, 5];
// 과일 41개 (시드 고정): 귤 20 + 레몬 19 + 주변과 범주가 다른 과일 2개
const FRUIT = (() => {
  const r = rng(11), pts = [], c = [];
  const add = (cx, cy, cl, n) => { for (let t = 0; t < n; t++) { pts.push([+clamp(cx + gauss(r) * 1.25, .5, 10.5).toFixed(1), +clamp(cy + gauss(r) * 1.25, .5, 10.5).toFixed(1)]); c.push(cl); } };
  add(7, 3.3, 0, 20); add(3.3, 7, 1, 19);
  pts.push([7.4, 2.6]); c.push(1); pts.push([2.7, 7.6]); c.push(0);
  return { pts, c, odd: [pts.length - 2, pts.length - 1] };
})();
// 5번: 과일 가게에 새로 들어온 과일 100개 (귤 50 + 레몬 50, 시드 고정)
const FR2 = (() => {
  const r = rng(21), pts = [], c = [], C = [[6.6, 3.6], [3.6, 6.6]];
  for (let j = 0; j < 2; j++) for (let t = 0; t < 50; t++) { pts.push([+clamp(C[j][0] + gauss(r) * 1.6, .5, 10.5).toFixed(1), +clamp(C[j][1] + gauss(r) * 1.6, .5, 10.5).toFixed(1)]); c.push(j); }
  return { pts, c };
})();
function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// 학습 데이터 70개(70%), 테스트 데이터 30개(30%)
const SPLIT = (() => { const idx = shuffle([...FR2.pts.keys()], rng(7)); return { tr: idx.slice(0, 70), te: idx.slice(70) }; })();
const N_TR = SPLIT.tr.length, N_TE = SPLIT.te.length;
const TR_P = SPLIT.tr.map(i => FR2.pts[i]), TR_C = SPLIT.tr.map(i => FR2.c[i]);

/* ---------- KNN 계산 ---------- */
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const nf = (v, d = 2) => String(+(+v).toFixed(d));
// 가까운 순서로 정렬 (거리가 같으면 self(자기 자신) → 앞 번호 먼저)
const neigh = (pts, q, self = -1) => pts.map((p, i) => ({ i, d: dist(p, q) })).sort((a, b) => a.d - b.d || (a.i === self ? -1 : b.i === self ? 1 : a.i - b.i));
// 다수결: 표가 같으면(동점) 동점인 범주 중 가장 가까운 이웃의 범주
function vote(nb, c, k, n) {
  const cnt = Array(n).fill(0); nb.slice(0, k).forEach(o => cnt[c[o.i]]++);
  const mx = Math.max(...cnt), top = cnt.map((v, j) => v === mx ? j : -1).filter(j => j >= 0);
  const win = top.length > 1 ? c[nb.slice(0, k).find(o => top.includes(c[o.i])).i] : top[0];
  return { cnt, win, tie: top.length > 1 };
}
// 5번: k별 학습 · 테스트 정확도 (학습 데이터로만 이웃을 찾음)
const K_MAX = 70;
const ACC = (() => {
  const trN = SPLIT.tr.map((i, t) => neigh(TR_P, FR2.pts[i], t)), teN = SPLIT.te.map(i => neigh(TR_P, FR2.pts[i])), out = [];
  for (let k = 1; k <= K_MAX; k++) {
    out[k] = {
      tr: trN.filter((nb, t) => vote(nb, TR_C, k, 2).win === FR2.c[SPLIT.tr[t]]).length / trN.length,
      te: teN.filter((nb, t) => vote(nb, TR_C, k, 2).win === FR2.c[SPLIT.te[t]]).length / teN.length
    };
  }
  return out;
})();
// 5번 표: 테스트 데이터 10개 (k = 5로 예측, 틀린 것 2개까지 포함)
const TAB_K = 5;
const IR_TAB = (() => {
  const rows = SPLIT.te.map(i => ({ i, real: FR2.c[i], pred: vote(neigh(TR_P, FR2.pts[i]), TR_C, TAB_K, 2).win }));
  const bad = rows.filter(r => r.real !== r.pred).slice(0, 2), good = rows.filter(r => r.real === r.pred);
  const need = 10 - bad.length, step = good.length / need, pick = Array.from({ length: need }, (_, t) => good[Math.floor(t * step + step / 2)]);
  return [...bad, ...pick].sort((a, b) => a.i - b.i);
})();
// 4번: 위치마다 예측되는 범주 (k별로 한 번만 계산)
const BD = {}, BD_ST = .25;
function regions(k) {
  if (BD[k]) return BD[k];
  const rows = [];
  for (let y = 0; y < 11 - 1e-9; y += BD_ST) { const row = []; for (let x = 0; x < 11 - 1e-9; x += BD_ST) row.push(vote(neigh(FRUIT.pts, [x + BD_ST / 2, y + BD_ST / 2]), FRUIT.c, k, 2).win); rows.push(row); }
  return BD[k] = rows;
}

/* ---------- 상태 ---------- */
const APP = {
  key: 'knn-theory-v1',
  init: () => ({ dsel: -1, exq: EXQ0.slice(), exk: 3, frq: [5.5, 5.5], frk: 3, bdk: 1, bdq: [2.9, 7.3], irq: [5, 5], irk: 5, tsel: -1 }),
  resetStep(i) { const d = APP.init(), a = S.app; ({ 2: ['exq', 'dsel'], 3: ['exq', 'exk', 'frq', 'frk'], 4: ['bdk', 'bdq'], 5: ['irq', 'irk', 'tsel'] }[i] || []).forEach(k => a[k] = d[k]); }
};

/* ---------- 그리기 도우미 ---------- */
const FR_AX = { w: 470, h: 430, x: [0, 11], y: [0, 11], xt: [0, 2, 4, 6, 8, 10], yt: [0, 2, 4, 6, 8, 10], xl: '단맛 (점)', yl: '신맛 (점)' };
// 범주마다 모양을 다르게: 0 동그라미, 1 마름모, 2 세모
function mark(P, p, cl, g, o = {}) {
  const x = P.X(p[0]), y = P.Y(p[1]), r = o.r || 6.5, at = `class="pt g${g}${o.hol ? ' hol' : ''}"${o.tip ? ` data-tip="${esc(o.tip)}"` : ''}${o.pick ? ` data-pick="${o.pick}" data-i="${o.i}"` : ''}`;
  if (cl === 0) return `<circle ${at} cx="${x}" cy="${y}" r="${r}"/>`;
  if (cl === 1) { const s = r * 1.3; return `<path ${at} d="M${x} ${y - s}L${x + s} ${y}L${x} ${y + s}L${x - s} ${y}Z"/>`; }
  const s = r * 1.35; return `<path ${at} d="M${x} ${y - s}L${x + s * .9} ${y + s * .65}L${x - s * .9} ${y + s * .65}Z"/>`;
}
const starD = (x, y, R = 12) => { let d = ''; for (let t = 0; t < 10; t++) { const r = t % 2 ? R * .45 : R, a = -Math.PI / 2 + t * Math.PI / 5; d += (t ? 'L' : 'M') + (x + r * Math.cos(a)).toFixed(1) + ' ' + (y + r * Math.sin(a)).toFixed(1); } return d + 'Z'; };
const qstar = (P, q, drag) => `<path class="qstar" d="${starD(P.X(q[0]), P.Y(q[1]))}"${drag ? ` data-drag="${drag}" data-i="0"` : ''} data-tip="새 데이터 ★ (${nf(q[0])}, ${nf(q[1])})"/>`;
const legend = (names, gs, extra = '') => `<div class="chips knn-leg">${names.map((n, j) => `<span class="chip g g${gs[j]}"><i class="sh s${j}"></i>${n}</span>`).join('')}<span class="chip g g0"><svg class="leg-star" viewBox="0 0 24 24" aria-hidden="true"><path d="${starD(12, 12.6, 11)}"/></svg>새 데이터</span>${extra}</div>`;
// 이웃까지 선 + 이웃을 감싸는 원
function nbLines(P, pts, q, nb, k) {
  let s = ''; const R = nb[k - 1].d, rx = Math.abs(P.X(q[0] + R) - P.X(q[0])), ry = Math.abs(P.Y(q[1] + R) - P.Y(q[1]));
  s += `<ellipse class="nb-ring" cx="${P.X(q[0])}" cy="${P.Y(q[1])}" rx="${rx}" ry="${ry}" pointer-events="none"/>`;
  nb.slice(0, k).forEach(o => { const p = pts[o.i]; s += `<line class="dist near" x1="${P.X(q[0])}" y1="${P.Y(q[1])}" x2="${P.X(p[0])}" y2="${P.Y(p[1])}" pointer-events="none"/>`; });
  return s;
}
function voteBox(v, names, gs, k) {
  const tot = sum(v.cnt);
  return `<div class="vote">${v.cnt.map((n, j) => `<div class="vrow g${gs[j]}"><span>${names[j]}</span><div class="vbar"><i style="width:${tot ? n / tot * 100 : 0}%"></i></div><b>${n}</b></div>`).join('')}
    <p class="vres">이웃 ${k}개의 다수결 → 예측: <b class="g${gs[v.win]}">${names[v.win]}</b>${v.tie ? ' <span class="badge warn">동점 · 가장 가까운 이웃의 범주로 정함</span>' : ''}</p></div>`;
}

/* ---------- 화면 조각 ---------- */
const VIEWS = {};
const EX_TABLE = gridTable(['과일', ...EXP.lab, '★'], [['<b>단맛 (점)</b>', ...EXP.pts.map(p => p[0]), { v: EXQ0[0], cls: 'c-hl' }], ['<b>신맛 (점)</b>', ...EXP.pts.map(p => p[1]), { v: EXQ0[1], cls: 'c-hl' }], ['<b>범주</b>', ...EXP.c.map(c => CLS_F[c]), { v: '?', cls: 'c-hl' }]]);
// 예제 그래프 (★ 고정, 선 없음)
VIEWS.ex0 = () => {
  const P = plot({ id: 'p-ex0', ...FR_AX, w: 420, h: 390, xt: 12, yt: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], label: '예제 과일 8개와 새 과일 ★' }); let s = P.head;
  EXP.pts.forEach((p, i) => { s += mark(P, p, EXP.c[i], G_F[EXP.c[i]], { tip: `${EXP.lab[i]} (${p[0]}, ${p[1]}) · ${CLS_F[EXP.c[i]]}` }) + `<text class="lbl-b" x="${P.X(p[0]) + 9}" y="${P.Y(p[1]) - 7}" pointer-events="none">${EXP.lab[i]}</text>`; });
  s += qstar(P, EXQ0);
  return `<figure class="ws-fig">${s + P.end}<figcaption>[그림1] 예제 과일 8개와 새 과일 ★(5, 5)</figcaption></figure>${legend(CLS_F, G_F)}`;
};
// 2번: 점을 누르면 ★과의 단맛 차이 · 신맛 차이 (거리는 보여 주지 않음)
const sgn = v => String(v).replace('-', '−');
VIEWS.diff = () => {
  const j = A().dsel, q = EXQ0, P = plot({ id: 'p-dif', ...FR_AX, w: 440, h: 410, xt: 12, yt: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], label: '점을 눌러 ★과의 차이 알아보기' }); let s = P.head;
  if (j >= 0) {
    const p = EXP.pts[j], X = P.X, Y = P.Y, dx = q[0] - p[0], dy = q[1] - p[1];
    s += `<line class="dist" x1="${X(q[0])}" y1="${Y(q[1])}" x2="${X(p[0])}" y2="${Y(p[1])}" pointer-events="none"/>`;
    const qx = X(q[0]), qy = Y(q[1]), px = X(p[0]), py = Y(p[1]), mx = (qx + px) / 2, my = (qy + py) / 2;
    // 차이 값: 가로 선은 위쪽(세로 선이 위로 가면 아래쪽), 세로 선은 바깥쪽
    if (dx) s += `<line class="leg-x" x1="${qx}" y1="${qy}" x2="${px}" y2="${qy}" pointer-events="none"/><text class="lbl dlab lx" x="${mx}" y="${qy + (dy > 0 ? 20 : -9)}" text-anchor="middle" pointer-events="none">${sgn(dx)}</text>`;
    if (dy) s += `<line class="leg-y" x1="${px}" y1="${qy}" x2="${px}" y2="${py}" pointer-events="none"/><text class="lbl dlab ly" x="${px + (dx > 0 ? -10 : 10)}" y="${my + 5}" text-anchor="${dx > 0 ? 'end' : 'start'}" pointer-events="none">${sgn(dy)}</text>`;
    // d = ?: 두 선이 만나는 모서리의 반대쪽 (한 줄로 겹치면 차이 값의 반대편)
    let lx, ly, an = 'middle';
    if (!dy) { lx = mx; ly = qy + 22; }
    else if (!dx) { lx = qx - 10; ly = my + 5; an = 'end'; }
    else { const vx = mx - px, vy = my - qy, n = Math.hypot(vx, vy) || 1; lx = mx + vx / n * 18; ly = my + vy / n * 18 + 5; an = vx > 0 ? 'start' : 'end'; }
    s += `<text class="lbl dlab" x="${lx}" y="${ly}" text-anchor="${an}" pointer-events="none">d = ?</text>`;
  }
  EXP.pts.forEach((p, i) => { s += mark(P, p, EXP.c[i], G_F[EXP.c[i]], { r: i === j ? 8.5 : 6.5, pick: 'dsel', i, tip: `${EXP.lab[i]} (${p[0]}, ${p[1]}) · 눌러 보기` }) + `<text class="lbl-b" x="${P.X(p[0]) + 10}" y="${P.Y(p[1]) - 8}" pointer-events="none">${EXP.lab[i]}</text>`; if (i === j) s += `<circle class="sel-ring" cx="${P.X(p[0])}" cy="${P.Y(p[1])}" r="13" pointer-events="none"/>`; });
  s += qstar(P, q);
  let side;
  if (j < 0) side = `<p class="note">그래프에서 과일 점을 하나 눌러 보세요.<br>★(5, 5)과 그 과일의 단맛 차이와 신맛 차이를 알려 줍니다.</p>`;
  else {
    const p = EXP.pts[j];
    side = `${fact('고른 과일', `${EXP.lab[j]} (${p[0]}, ${p[1]})`, '★ = (a₁, a₂), 고른 과일 = (b₁, b₂)')}
      <div class="dif-box"><p><span>단맛 차이</span><b>a₁ − b₁ = ${q[0]} − ${p[0]} = ${sgn(q[0] - p[0])}</b></p><p><span>신맛 차이</span><b>a₂ − b₂ = ${q[1]} − ${p[1]} = ${sgn(q[1] - p[1])}</b></p></div>
      <p class="hint">거리 d는 이 두 차이를 공식에 넣어 직접 계산해 보세요.<br>다른 점을 누르면 바뀌고, 같은 점을 한 번 더 누르면 지워집니다.</p>`;
  }
  return `<div class="sim2"><div>${s + P.end}${legend(CLS_F, G_F)}</div><div>${side}</div></div>`;
};
// 2번 확인: ★에서 각 과일까지의 거리
VIEWS.exdist = () => {
  const q = A().exq, P = plot({ id: 'p-exd', ...FR_AX, xt: 12, yt: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], click: 'exq', label: '★에서 각 과일까지의 거리' }); let s = P.head;
  EXP.pts.forEach(p => { s += `<line class="dist" x1="${P.X(q[0])}" y1="${P.Y(q[1])}" x2="${P.X(p[0])}" y2="${P.Y(p[1])}" pointer-events="none"/>`; });
  EXP.pts.forEach((p, i) => { const mx = (P.X(p[0]) + P.X(q[0])) / 2, my = (P.Y(p[1]) + P.Y(q[1])) / 2; s += `<text class="lbl dlab" x="${mx}" y="${my - 3}" text-anchor="middle" pointer-events="none">${nf(dist(p, q))}</text>`; });
  EXP.pts.forEach((p, i) => { s += mark(P, p, EXP.c[i], G_F[EXP.c[i]], { tip: `${EXP.lab[i]} (${p[0]}, ${p[1]}) · ${CLS_F[EXP.c[i]]}` }) + `<text class="lbl-b" x="${P.X(p[0]) + 9}" y="${P.Y(p[1]) - 7}" pointer-events="none">${EXP.lab[i]}</text>`; });
  s += qstar(P, q, 'exq');
  const rows = EXP.pts.map((p, i) => [EXP.lab[i], `|${q[0]} − ${p[0]}| = ${nf(Math.abs(q[0] - p[0]))}`, `|${q[1]} − ${p[1]}| = ${nf(Math.abs(q[1] - p[1]))}`, `<b>${nf(dist(p, q))}</b>`]);
  return `<div class="sim2"><div>${s + P.end}${legend(CLS_F, G_F)}</div><div>${fact('새 데이터 ★', `(${nf(q[0])}, ${nf(q[1])})`, '★을 끌거나 그래프를 눌러 옮길 수 있어요.')}${gridTable(['과일', '단맛 차이', '신맛 차이', '거리'], rows)}</div></div>`;
};
// 3번 확인: 예제로 KNN
VIEWS.exknn = () => {
  const a = A(), q = a.exq, k = a.exk, nb = neigh(EXP.pts, q), v = vote(nb, EXP.c, k, 2);
  const P = plot({ id: 'p-exk', ...FR_AX, xt: 12, yt: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], click: 'exq', label: '예제로 KNN 해 보기' }); let s = P.head + nbLines(P, EXP.pts, q, nb, k);
  const rank = {}; nb.forEach((o, r) => rank[o.i] = r + 1);
  EXP.pts.forEach((p, i) => { s += mark(P, p, EXP.c[i], G_F[EXP.c[i]], { hol: rank[i] > k, tip: `${EXP.lab[i]} · ${CLS_F[EXP.c[i]]} · 거리 ${nf(dist(p, q))}` }) + `<text class="lbl-b" x="${P.X(p[0]) + 9}" y="${P.Y(p[1]) - 7}" pointer-events="none">${EXP.lab[i]}${rank[i] <= k ? `<tspan class="rk"> ${rank[i]}</tspan>` : ''}</text>`; });
  s += qstar(P, q, 'exq');
  return `<div class="sim2"><div>${s + P.end}${legend(CLS_F, G_F)}</div><div>${voteBox(v, CLS_F, G_F, k)}${gridTable(['순위', '과일', '거리', '범주'], nb.map((o, r) => ({ cls: r < k ? 'sel' : '', cells: [r + 1, EXP.lab[o.i], nf(o.d), CLS_F[EXP.c[o.i]]] })))}</div></div>`;
};
// 3번 직접 해 보기: 과일 41개
VIEWS.fr = () => {
  const a = A(), q = a.frq, k = a.frk, nb = neigh(FRUIT.pts, q), v = vote(nb, FRUIT.c, k, 2), inN = new Set(nb.slice(0, k).map(o => o.i));
  const P = plot({ id: 'p-fr', ...FR_AX, click: 'frq', label: '과일 41개로 KNN 해 보기' }); let s = P.head + nbLines(P, FRUIT.pts, q, nb, k);
  FRUIT.pts.forEach((p, i) => { s += mark(P, p, FRUIT.c[i], G_F[FRUIT.c[i]], { r: inN.has(i) ? 7 : 5.5, hol: !inN.has(i), tip: `(${p[0]}, ${p[1]}) · ${CLS_F[FRUIT.c[i]]}` }); });
  s += qstar(P, q, 'frq');
  return `<div class="sim2"><div>${s + P.end}${legend(CLS_F, G_F)}</div><div>${fact('새 과일 ★', `(${nf(q[0], 1)}, ${nf(q[1], 1)})`, '단맛, 신맛')}${voteBox(v, CLS_F, G_F, k)}<p class="hint">채워진 점이 ★과 가장 가까운 이웃 ${k}개입니다.</p></div></div>`;
};
// 4번: 분류 경계
VIEWS.bd = () => {
  const k = A().bdk, R = regions(k), P = plot({ id: 'p-bd', ...FR_AX, w: 520, h: 470, grid: false, click: 'bdq', label: `k = ${k}일 때 위치마다 예측되는 범주` }); let s = P.head;
  R.forEach((row, yi) => { let x0 = 0; for (let xi = 1; xi <= row.length; xi++) if (xi === row.length || row[xi] !== row[x0]) { const X0 = P.X(x0 * BD_ST), X1 = P.X(xi * BD_ST), Y1 = P.Y((yi + 1) * BD_ST), Y0 = P.Y(yi * BD_ST); s += `<rect class="reg g${G_F[row[x0]]}" x="${X0}" y="${Y1}" width="${X1 - X0}" height="${Y0 - Y1}" shape-rendering="crispEdges" pointer-events="none"/>`; x0 = xi; } });
  s += `<line class="base" x1="${P.m.l}" x2="${P.m.l + P.iw}" y1="${P.m.t + P.ih}" y2="${P.m.t + P.ih}"/><line class="base" x1="${P.m.l}" x2="${P.m.l}" y1="${P.m.t}" y2="${P.m.t + P.ih}"/>`;
  FRUIT.pts.forEach((p, i) => { s += mark(P, p, FRUIT.c[i], G_F[FRUIT.c[i]], { r: 5.5, tip: `(${p[0]}, ${p[1]}) · ${CLS_F[FRUIT.c[i]]}` }); if (FRUIT.odd.includes(i)) s += `<circle class="sel-ring" cx="${P.X(p[0])}" cy="${P.Y(p[1])}" r="12" pointer-events="none"/>`; });
  const q = A().bdq, nb = neigh(FRUIT.pts, q), v = vote(nb, FRUIT.c, k, 2);
  if (k < FRUIT.pts.length) s += nbLines(P, FRUIT.pts, q, nb, k).replace(/class="dist near"/g, 'class="dist near thin"');
  s += qstar(P, q, 'bdq');
  const cnt = [0, 0]; R.flat().forEach(c => cnt[c]++); const tot = cnt[0] + cnt[1];
  return `<div class="sim2"><div>${s + P.end}${legend(CLS_F, G_F, '<span class="chip g g0"><i class="sh rg">◯</i>주변과 범주가 다른 과일</span>')}</div><div>
    ${fact('★의 위치', `(${nf(q[0], 1)}, ${nf(q[1], 1)})`, '★을 끌거나 그래프를 눌러 옮겨 보세요.')}
    ${voteBox(v, CLS_F, G_F, k)}
    <p class="hint">★이 있는 자리의 색 = ★의 예측 범주입니다.<br>★을 색이 바뀌는 곳 너머로 옮기면 예측도 바뀌어요.</p>
    <div class="facts">${fact('k', k, k % 2 ? '홀수' : '짝수')}${CLS_F.map((n, j) => fact(`${n} 영역`, `${Math.round(cnt[j] / tot * 100)}%`, '그래프 넓이 중')).join('')}</div></div></div>`;
};
// 5번: 과일 100개 (채워진 점 = 학습, 속이 빈 점 = 테스트)
VIEWS.ir = () => {
  const a = A(), q = a.irq, k = a.irk, nb = neigh(TR_P, q), v = vote(nb, TR_C, k, 2), inN = new Set(nb.slice(0, k).map(o => o.i));
  const P = plot({ id: 'p-ir', ...FR_AX, click: 'irq', label: '과일 100개로 KNN 해 보기' }); let s = P.head + nbLines(P, TR_P, q, nb, k);
  SPLIT.te.forEach(i => { const p = FR2.pts[i]; s += mark(P, p, FR2.c[i], G_F[FR2.c[i]], { r: 5, hol: true, tip: `테스트 · (${p[0]}, ${p[1]}) · ${CLS_F[FR2.c[i]]}` }).replace('class="pt', 'class="pt te'); });
  TR_P.forEach((p, t) => { s += mark(P, p, TR_C[t], G_F[TR_C[t]], { r: inN.has(t) ? 7 : 5, tip: `학습 · (${p[0]}, ${p[1]}) · ${CLS_F[TR_C[t]]}` }); });
  s += qstar(P, q, 'irq');
  return `<div class="sim2"><div>${s + P.end}${legend(CLS_F, G_F, '<span class="chip g g0"><i class="sh ho">○</i>속이 빈 점 = 테스트 데이터</span>')}</div><div>${fact('새 과일 ★', `(${nf(q[0], 1)}, ${nf(q[1], 1)})`, '단맛, 신맛')}${voteBox(v, CLS_F, G_F, k)}<p class="hint">이웃은 <b>학습 데이터</b>(채워진 점) ${N_TR}개에서만 찾습니다.</p></div></div>`;
};
// 5번 표의 과일 10개: 번호를 누르면 가장 가까운 학습 데이터 TAB_K개와 다수결을 보여 줌
VIEWS.t10 = () => {
  const j = A().tsel, P = plot({ id: 'p-t10', ...FR_AX, w: 440, h: 410, label: '테스트 과일 10개와 가장 가까운 이웃' }); let s = P.head;
  TR_P.forEach((p, t) => { s += mark(P, p, TR_C[t], G_F[TR_C[t]], { r: 4.5, tip: `학습 · (${p[0]}, ${p[1]}) · ${CLS_F[TR_C[t]]}` }).replace('class="pt', 'class="pt dim'); });
  let side = `<p class="note">그래프의 번호(①~⑩)를 누르면, 그 과일과 가장 가까운 학습 데이터 ${TAB_K}개를 선으로 이어 줍니다.</p>`;
  if (j >= 0) {
    const r = IR_TAB[j], q = FR2.pts[r.i], nb = neigh(TR_P, q), v = vote(nb, TR_C, TAB_K, 2);
    s += nbLines(P, TR_P, q, nb, TAB_K);
    nb.slice(0, TAB_K).forEach(o => { const p = TR_P[o.i]; s += mark(P, p, TR_C[o.i], G_F[TR_C[o.i]], { r: 6, tip: `이웃 · (${p[0]}, ${p[1]}) · ${CLS_F[TR_C[o.i]]}` }); });
    side = `${fact('고른 과일', `${CIRC[j]} (${q[0]}, ${q[1]})`, `실제 범주: ${CLS_F[r.real]}`)}${voteBox(v, CLS_F, G_F, TAB_K)}<p class="hint">같은 번호를 한 번 더 누르면 지워집니다.</p>`;
  }
  IR_TAB.forEach((r, t) => { const q = FR2.pts[r.i]; s += mark(P, q, r.real, G_F[r.real], { r: t === j ? 9 : 7.5, hol: true, pick: 'tsel', i: t, tip: `${CIRC[t]} (${q[0]}, ${q[1]}) · 실제 ${CLS_F[r.real]} · 눌러 보기` }) + `<text class="lbl-b" x="${P.X(q[0]) + 9}" y="${P.Y(q[1]) - 8}" pointer-events="none">${CIRC[t]}</text>`; });
  return `${s + P.end}<div class="chips knn-leg"><span class="chip g g2"><i class="sh s0"></i>귤</span><span class="chip g g3"><i class="sh s1"></i>레몬</span><span class="chip g g0">작은 점 = 학습 데이터</span><span class="chip g g0">번호 = 테스트 과일</span></div>${side}`;
};
VIEWS.acc = () => {
  const k = A().irk, P = plot({ id: 'p-acc', w: 560, h: 300, max: 640, m: { l: 60 }, x: [0, K_MAX + 1], y: [.3, 1.01], xt: [1, 10, 20, 30, 40, 50, 60, 70], yt: [.4, .6, .8, 1], yf: v => Math.round(v * 100) + '%', xl: 'k (이웃의 수)', yl: '정확도', click: 'irk', label: 'k에 따른 정확도' }); let s = P.head;
  const line = key => 'M' + Array.from({ length: K_MAX }, (_, t) => `${P.X(t + 1).toFixed(1)} ${P.Y(Math.max(.3, ACC[t + 1][key])).toFixed(1)}`).join('L');
  s += `<line class="kline" x1="${P.X(k)}" x2="${P.X(k)}" y1="${P.m.t}" y2="${P.m.t + P.ih}" pointer-events="none"/>`;
  s += `<path class="acc-tr" d="${line('tr')}" pointer-events="none"/><path class="acc-te" d="${line('te')}" pointer-events="none"/>`;
  for (let t = 1; t <= K_MAX; t++) s += `<circle class="acc-dot tr" cx="${P.X(t)}" cy="${P.Y(Math.max(.3, ACC[t].tr))}" r="2.5" data-tip="k = ${t} · 학습 ${fx(ACC[t].tr * 100, 1)}%"/><circle class="acc-dot te" cx="${P.X(t)}" cy="${P.Y(Math.max(.3, ACC[t].te))}" r="2.5" data-tip="k = ${t} · 테스트 ${fx(ACC[t].te * 100, 1)}%"/>`;
  return `<div class="sim2 acc-row"><div>${s + P.end}<div class="chips knn-leg"><span class="chip"><i class="ln tr"></i>학습 데이터 정확도</span><span class="chip"><i class="ln te"></i>테스트 데이터 정확도</span></div></div>
    <div><div class="facts acc-facts">${fact('k', k)}${fact('학습 데이터 정확도', fx(ACC[k].tr * 100, 1) + '%', `${Math.round(ACC[k].tr * N_TR)} / ${N_TR}개`)}${fact('테스트 데이터 정확도', fx(ACC[k].te * 100, 1) + '%', `${Math.round(ACC[k].te * N_TE)} / ${N_TE}개`)}</div><p class="hint">그래프를 누르면 그 k로 바뀝니다.</p></div></div>`;
};

/* ---------- 입력 · 동작 ---------- */
const IN = {
  frk: { get: () => A().frk, set: v => A().frk = v },
  bdk: { get: () => A().bdk, set: v => A().bdk = v },
  irk: { get: () => A().irk, set: v => A().irk = v }
};
const ACT = {
  exk: d => { A().exk = +d.v; },
  exq0: () => { A().exq = EXQ0.slice(); },
  bdk: d => { A().bdk = +d.v; }
};
const r5 = v => Math.round(v * 2) / 2, r1 = v => Math.round(v * 10) / 10;
const DRAG = {
  exq: p => { A().exq = [clamp(r5(p.x), 0, 11), clamp(r5(p.y), 0, 11)]; },
  frq: p => { A().frq = [clamp(r1(p.x), 0, 11), clamp(r1(p.y), 0, 11)]; },
  bdq: p => { A().bdq = [clamp(r1(p.x), 0, 11), clamp(r1(p.y), 0, 11)]; },
  irq: p => { A().irq = [clamp(r1(p.x), 0, 11), clamp(r1(p.y), 0, 11)]; }
};
const CLICK = { exq: DRAG.exq, frq: DRAG.frq, bdq: DRAG.bdq, irq: DRAG.irq, irk: p => { A().irk = clamp(Math.round(p.x), 1, K_MAX); } };
const PICK = { dsel: i => { A().dsel = A().dsel === i ? -1 : i; }, tsel: i => { A().tsel = A().tsel === i ? -1 : i; } };
const MISSIONS = {}, QUIZ = {};

/* ---------- 문항 목록 [키, 이름, 단계] ---------- */
const SIT = [
  '메일의 내용을 보고 스팸 메일인지 정상 메일인지 판단한다.',
  '하루 공부 시간으로 시험 점수가 몇 점일지 예측한다.',
  '정답이 없는 고객의 구매 기록만 보고 구매 습관이 비슷한 고객끼리 묶는다.',
  '꽃잎의 길이와 너비로 붓꽃의 품종을 맞힌다.',
  '그날의 기온으로 아이스크림 판매량이 몇 개일지 예측한다.'
];
const MC = [
  ['k-최근접 이웃(KNN) 알고리즘에 대한 설명으로 옳은 것은?', ['정답이 없는 데이터를 비슷한 것끼리 묶는다.', '새 데이터와 가장 가까운 k개 이웃의 범주 중 가장 많은 범주로 분류한다.', '중심점을 군집의 평균 위치로 옮기는 과정을 반복한다.', '데이터를 가장 잘 나타내는 직선을 찾아 수치를 예측한다.', 'k는 클수록 항상 정확하다.']],
  ['두 점 P(1, 1)과 Q(4, 5) 사이의 유클리디언 거리는?', ['3', '4', '5', '7', '25']],
  ['새 데이터와 가까운 순서대로 이웃 5개의 범주가 [귤, 레몬, 레몬, 귤, 레몬]이다.<br>k = 1, k = 3일 때의 예측을 차례대로 나타낸 것은?', ['귤, 귤', '귤, 레몬', '레몬, 귤', '레몬, 레몬']],
  ['k를 너무 작게(예를 들어 k = 1) 정했을 때 생길 수 있는 문제로 알맞은 것은?', ['주변과 범주가 다른 데이터 하나에도 예측이 쉽게 바뀐다.', '모든 위치가 개수가 많은 범주로만 예측된다.', '거리를 계산할 수 없다.', '학습 데이터가 필요 없어진다.']],
  ['테스트 데이터 20개 중 17개의 범주를 맞혔을 때 정확도는?', ['17%', '80%', '85%', '90%', '3%']]
];
const OX5 = (k, lab) => pick(k, ['O', 'X'], lab);
function FIELDS() {
  return [
    ['s1_a', '1-빈칸 (정답)', 1], ['s1_b', '1-빈칸 (분류가 예측하는 것)', 1], ['s1_c', '1-빈칸 (수치를 예측)', 1],
    ...SIT.map((t, i) => ['sit' + (i + 1), `1-▣ 상황 ${CIRC[i]}`, 1]),
    ['s1_g', '1-생각 열기 (★의 범주)', 1], ['s1_gw', '1-생각 열기 (까닭)', 1],
    ...EXP.lab.map(l => ['d' + l, `2-▣ ★과 ${l} 사이의 거리`, 2]), ['s2_near', '2-▣ ★과 가장 가까운 과일', 2],
    ['s3_a', '3-빈칸 (가장 ○○ k개)', 3], ['s3_b', '3-빈칸 (가장 많은)', 3], ['s3_c', '3-빈칸 (○○○ 방식)', 3],
    ...[1, 2, 3, 4, 5].map(r => ['r' + r, `3-▣ ${r}번째로 가까운 과일`, 3]),
    ...[1, 3, 5].map(k => [['k' + k + 't', `3-▣ k=${k} 귤 수`, 3], ['k' + k + 'l', `3-▣ k=${k} 레몬 수`, 3], ['k' + k + 'p', `3-▣ k=${k} 예측`, 3]]).flat(),
    ['s3_even', '3-▣ k = 2일 때 생기는 문제', 3],
    ['s4_q1p', '4-▣ k = 1일 때 ★의 예측', 4], ['s4_q2', '4-▣ k = 41일 때 예측', 4], ['s4_q3', '4-▣ k = 41일 때 까닭', 4],
    ['s4_a', '4-빈칸 (k가 작으면)', 4], ['s4_b', '4-빈칸 (k가 크면)', 4], ['s4_c', '4-빈칸 (동점을 피하려면)', 4],
    ['s5_a', '5-빈칸 (학습에 쓰는 데이터)', 5], ['s5_b', '5-빈칸 (평가에 쓰는 데이터)', 5], ['s5_c', '5-빈칸 (정확도 분모)', 5],
    ...IR_TAB.map((r, t) => ['t' + (t + 1), `5-▣ 과일 ${CIRC[t]} O/X`, 5]), ['s5_n', '5-▣ 맞힌 수', 5], ['s5_acc', '5-▣ 정확도', 5],
    ['s5_q2', '5-▣ 테스트 데이터로 평가하는 까닭', 5], ['s5_best', '5-▣ 고른 k', 5], ['s5_why', '5-▣ k를 고른 까닭', 5],
    ...MC.map((m, i) => ['mc' + (i + 1), `6-[${i + 1}]`, 6])
  ];
}
const SEC_NAMES = { 1: '1. 분류의 개념', 2: '2. 거리 재기', 3: '3. k-최근접 이웃', 4: '4. k 정하기', 5: '5. 모델 평가', 6: '6. 종합 연습문제' };

/* ---------- 0단계 그림: 기계 학습의 종류 ---------- */
const ML_TREE = `<figure class="ml-tree" aria-label="기계 학습의 종류">
  <div class="mt-root">기계 학습</div>
  <div class="mt-kids">
    <div class="mt-box sup"><b>지도 학습</b><small>정답(레이블)이 있는 데이터로 학습</small>
      <div class="mt-leaf"><span><b>분류</b><small>범주를 예측<br>예) 스팸 / 정상</small></span><span><b>회귀</b><small>수치를 예측<br>예) 시험 점수</small></span></div></div>
    <div class="mt-box uns"><b>비지도 학습</b><small>정답이 없는 데이터에서 규칙을 찾음</small>
      <div class="mt-leaf"><span><b>군집 분석</b><small>비슷한 것끼리 묶기</small></span><span><b>연관 분석</b><small>함께 일어나는 규칙 찾기</small></span></div></div>
  </div>
  <figcaption>이번 단원에서 배울 <b>분류</b>는 지도 학습에 속합니다.</figcaption></figure>`;

/* ---------- 3번: 2번에서 내가 구한 거리 (학생이 쓴 값만, 정답은 보여 주지 않음) ---------- */
function myDistRef() {
  const v = l => { const t = String((typeof WSA !== 'undefined' && WSA['d' + l]) ?? '').trim(); return t ? esc(t) : '<span class="muted-dash">—</span>'; };
  const empty = EXP.lab.filter(l => !String(WSA['d' + l] ?? '').trim()).length;
  const P = plot({ id: 'p-ref', ...FR_AX, w: 380, h: 350, xt: [0, 2, 4, 6, 8, 10], label: '예제 과일 8개와 새 과일 ★' }); let s = P.head;
  EXP.pts.forEach((p, i) => { s += mark(P, p, EXP.c[i], G_F[EXP.c[i]], { tip: `${EXP.lab[i]} (${p[0]}, ${p[1]}) · ${CLS_F[EXP.c[i]]}` }) + `<text class="lbl-b" x="${P.X(p[0]) + 9}" y="${P.Y(p[1]) - 7}" pointer-events="none">${EXP.lab[i]}</text>`; });
  s += qstar(P, EXQ0);
  return `<div class="ws-sim"><p class="ws-q" style="margin-top:0">2번에서 내가 구한 거리</p><div class="sim2 ref"><div>${s + P.end}${legend(CLS_F, G_F)}</div><div>
    ${tbl(['과일', '(단맛, 신맛)', '범주', '★까지의 거리'], EXP.pts.map((p, i) => [EXP.lab[i], `(${p[0]}, ${p[1]})`, CLS_F[EXP.c[i]], `<b>${v(EXP.lab[i])}</b>`]), { cls: 't1' })}
    ${empty ? `<p class="hint">아직 2번에서 쓰지 않은 거리가 ${empty}개 있어요. <button type="button" class="btn" data-act="go" data-step="2">← 2번으로 가기</button></p>` : '<p class="hint">2번에서 쓴 값이 그대로 보여요. 고치려면 2번으로 돌아가세요.</p>'}</div></div></div>`;
}

/* ---------- 단계 ---------- */
const STEPS = [
  {
    title: '분류 모델 미리 보기', short: '먼저 알아보기',
    goal: '기계 학습이 지도 학습과 비지도 학습으로 나뉜다는 것을 알아보고, 이 앱에서 어떤 활동을 하게 되는지 살펴보세요.',
    concept: '',
    render: () => card('기계 학습은 두 갈래로 나뉜다',
      `<p class="note">컴퓨터가 데이터에서 규칙을 스스로 찾아 학습하는 것을 <b>기계 학습</b>이라고 한다.&nbsp;기계 학습은 학습에 쓰는 데이터에 <b>정답이 있는지</b>에 따라 크게 두 가지로 나뉜다.</p>${ML_TREE}
      ${dl([['지도 학습', '문제와 정답이 함께 있는 데이터로 학습한 뒤, 새 데이터의 정답을 예측한다.&nbsp;선생님이 정답을 알려 주며 가르치는 것과 비슷하다.'], ['비지도 학습', '정답 없이 데이터만 보고 비슷한 것끼리 묶거나 숨은 규칙을 찾는다.&nbsp;군집 분석, 연관 분석이 여기에 속한다.']])}`) +
      card('이 앱에서 할 일',
        `<p class="note">과일 가게에 귤과 레몬이 섞여 들어왔다.&nbsp;과일마다 단맛 점수와 신맛 점수를 재고, 어떤 과일인지 적어 두었더니 [표1]과 같았다.&nbsp;그런데 이름표가 떨어진 과일 ★이 하나 있다.&nbsp;★의 단맛은 5점, 신맛은 5점이다.&nbsp;★은 귤일까, 레몬일까?</p>${EX_TABLE}<p class="ws-cap">[표1] 예제 과일 8개 (단위: 점)</p>`) +
      card('단계별 순서', `<ol class="proc">${[[1, '분류의 개념', '1번'], [2, '거리 재기', '2번'], [3, 'k-최근접 이웃', '3번'], [4, 'k 정하기', '4번'], [5, '모델 평가', '5번'], [6, '종합 연습', '6번']].map(([to, t, s]) => `<li><button type="button" data-act="go" data-step="${to}"><b>${t}</b><small>${s}</small></button></li>`).join('')}</ol><p class="note">각 단계의 시뮬레이션을 살펴보면서 빈칸과 질문에 직접 답을 써 보세요. <b>저장하기</b>를 누르면 이 브라우저에 저장되어, 다음에 다시 열어도 이어서 풀 수 있습니다.</p>`, { sub: '단계를 누르면 해당 단계로 이동합니다.' })
  },
  {
    title: '분류의 개념', short: '분류의 개념',
    goal: '지도 학습에 속하는 분류와 회귀의 차이를 알아보고, 상황에 알맞은 방법을 골라 봅니다.',
    concept: '',
    render: () => wsCard('1. 분류의 개념',
      L(`- 분류(Classification): 학습 데이터에 적힌 ${bl('s1_a', 5)}을 보고 학습한 뒤, 새 데이터가 어느 ${bl('s1_b', 5)}에 속하는지 예측하는 방법`) +
      L(`- 분류와 같은 지도 학습이지만, 범주가 아니라 점수·판매량처럼 수치를 예측하는 방법을 ${bl('s1_c', 5)}라고 한다.`) +
      q('다음 상황에 알맞은 방법에 ○표 해 보자.') +
      tbl(['상황', '분류', '회귀', '군집 분석'], SIT.map((t, i) => [`${CIRC[i]} ${t}`, ox('sit' + (i + 1), '분류', `${CIRC[i]} 분류`), ox('sit' + (i + 1), '회귀', `${CIRC[i]} 회귀`), ox('sit' + (i + 1), '군집', `${CIRC[i]} 군집 분석`)]), { cls: 'ox' }) +
      q('[생각 열기] [그림1]을 보고, 새 과일 ★이 무엇일지 골라 보자.&nbsp;그렇게 생각한 까닭도 써 보자.') +
      VIEWS.ex0() +
      `<div class="ws-row">${L('★은')}${pick('s1_g', ['귤', '레몬'], '★의 범주')}${L('일 것 같다.')}</div>` + ta('s1_gw', 2, '까닭'))
  },
  {
    title: '거리 재기', short: '거리 재기',
    goal: '새 데이터 ★과 각 과일이 얼마나 가까운지 거리로 계산해 봅니다.',
    concept: '',
    render: () => wsCard('2. 거리 재기',
      L('- 두 데이터가 얼마나 비슷한지는 두 점 사이의 <b>거리</b>로 나타낼 수 있다.&nbsp;거리가 가까울수록 두 데이터는 비슷하다.') +
      L('- 두 점 (a₁, a₂), (b₁, b₂) 사이의 유클리디언 거리') +
      `<p class="ws-formula math"><math display="block"><mi>d</mi><mo>=</mo><msqrt><msup><mrow><mo>(</mo><msub><mi>a</mi><mn>1</mn></msub><mo>−</mo><msub><mi>b</mi><mn>1</mn></msub><mo>)</mo></mrow><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><msub><mi>a</mi><mn>2</mn></msub><mo>−</mo><msub><mi>b</mi><mn>2</mn></msub><mo>)</mo></mrow><mn>2</mn></msup></msqrt></math></p>` +
      `<div class="ws-sim"><p class="ws-q" style="margin-top:0">차이 계산기 · 점을 눌러 보세요</p>${slot('diff')}</div>` +
      q('★(5, 5)과 [표1]의 각 과일 사이의 거리를 구해 보자.&nbsp;(나누어떨어지지 않으면 소수 둘째 자리까지)') +
      tbl(['과일', '(단맛, 신맛)', '범주', '★까지의 거리'], EXP.pts.map((p, i) => [EXP.lab[i], `(${p[0]}, ${p[1]})`, CLS_F[EXP.c[i]], ti('d' + EXP.lab[i], `${EXP.lab[i]}까지의 거리`)]), { cls: 't1' }) +
      `<div class="ws-row">${q('★과 가장 가까운 과일은?')}${ti('s2_near', '가장 가까운 과일', 'ws-short')}</div>` +
      after('계산한 다음 펼쳐서 확인해 보세요', `<div class="ctls">${btn('exq0', '★을 (5, 5)로')}</div>${slot('exdist')}`))
  },
  {
    title: 'k-최근접 이웃 (KNN)', short: 'k-최근접 이웃',
    goal: '가까운 이웃 k개의 다수결로 새 데이터의 범주를 정하는 방법을 알아보고, k에 따라 결과가 어떻게 달라지는지 살펴봅니다.',
    concept: '',
    render: () => wsCard('3. k-최근접 이웃 (KNN)',
      L(`- k-최근접 이웃(K-Nearest Neighbors, KNN): 새 데이터와 거리가 가장 ${bl('s3_a', 5)} k개의 데이터(이웃)를 찾고, 그 이웃들 중 가장 ${bl('s3_b', 4)} 범주로 새 데이터를 분류하는 방법`) +
      L(`- 이웃들이 한 표씩 던져 가장 표를 많이 받은 범주로 정하므로 ${bl('s3_c', 5)} 방식이라고 할 수 있다.`) +
      q('2번에서 구한 거리를 보고, ★과 가까운 순서대로 과일을 5개 써 보자.') +
      myDistRef() +
      tbl(['순위', '1', '2', '3', '4', '5'], [['과일', ...[1, 2, 3, 4, 5].map(r => ti('r' + r, `${r}번째로 가까운 과일`))]], { cls: 'act' }) +
      q('k를 1, 3, 5로 바꾸어 가며 ★을 분류해 보자.') +
      tbl(['k', '이웃 중 귤의 수', '이웃 중 레몬의 수', '★의 예측 범주'], [1, 3, 5].map(k => [`k = ${k}`, ti(`k${k}t`, `k=${k} 귤 수`), ti(`k${k}l`, `k=${k} 레몬 수`), pick(`k${k}p`, ['귤', '레몬'], `k=${k} 예측`)]), { cls: 'act' }) +
      q('k = 2로 정하면 어떤 문제가 생길 수 있을지 써 보자.') + ta('s3_even', 2, 'k = 2일 때 생기는 문제') +
      after('표를 채운 다음 펼쳐서 확인해 보세요', `<div class="ctls"><span class="hint">k</span>${seg('exk', [1, 2, 3, 4, 5, 6, 7].map(v => [v, v]), A().exk)}${btn('exq0', '★을 (5, 5)로')}</div>${slot('exknn')}`)) +
      card('직접 해 보기 · 과일 41개', `<div class="ctls">${range('frk', 'k (이웃의 수)', 1, 15, 1)}</div>${slot('fr')}`, { sub: '★을 끌거나 그래프를 눌러 새 과일의 위치를 바꾸어 보세요. k를 바꾸면 예측이 어떻게 달라지는지 살펴보세요.' })
  },
  {
    title: 'k 정하기', short: 'k 정하기',
    goal: 'k가 너무 작거나 너무 크면 어떤 문제가 생기는지 분류 경계로 살펴봅니다. 알맞은 k를 고르는 방법은 5번에서 배웁니다.',
    concept: '',
    render: () => card('색칠된 그래프는 무엇일까?',
      `<p class="note">3번에서는 새 과일 ★ <b>한 개</b>를 KNN으로 분류했다.&nbsp;이번에는 ★을 그래프의 <b>모든 위치</b>에 하나씩 놓아 보고, 예측된 범주의 색으로 그 자리를 칠해 보자.&nbsp;그러면 아래처럼 ‘이 위치에 과일이 오면 귤, 저 위치에 오면 레몬’이라는 지도가 생긴다.&nbsp;두 색이 만나는 선을 <b>분류 경계</b>라고 한다.</p>
      <ol class="proc">${[[1, 'k = 1', '동그라미 친 두 과일 주변 보기'], [15, 'k = 15', '경계 모양이 어떻게 바뀌나?'], [41, 'k = 41', '과일 41개 전체가 이웃이면?']].map(([v, t, s2]) => `<li><button type="button" data-act="bdk" data-v="${v}"><b>${t}</b><small>${s2}</small></button></li>`).join('')}</ol>
      <p class="hint">위 단추를 차례대로 눌러 보거나 아래 슬라이더로 k를 바꾸면서 지도가 어떻게 달라지는지 살펴보세요.</p>`) +
      card('k에 따라 달라지는 분류 경계', `<div class="ctls">${range('bdk', 'k (이웃의 수)', 1, 41, 1)}<span class="hint">바로가기</span>${seg('bdk', [[1, 'k = 1'], [5, 'k = 5'], [15, 'k = 15'], [41, 'k = 41']], '')}</div>${slot('bd')}`, { sub: '3번의 과일 41개입니다. 주황색 자리에 과일이 오면 귤, 초록색 자리에 오면 레몬으로 예측됩니다.' }) +
      wsCard('4. k 정하기',
        `<div class="ws-row">${q('k = 1이면 ★과 가장 가까운 이웃 1개만 보고 범주를 정한다.&nbsp;★을 레몬들 사이에 있는 동그라미 친 귤 바로 옆에 놓으면')}${pick('s4_q1p', ['귤', '레몬'], 'k = 1일 때 ★의 예측')}${L('(으)로 예측된다.')}</div>` +
        `<div class="ws-row">${q('k = 41일 때, 새 과일은 어디에 있든')}${pick('s4_q2', ['귤', '레몬'], 'k = 41일 때 예측')}${L('(으)로 예측된다.')}</div>` +
        q('k = 41일 때 그렇게 되는 까닭을 써 보자.&nbsp;(과일은 모두 41개, 귤 21개, 레몬 20개)') + ta('s4_q3', 2, 'k = 41일 때 까닭') +
        L(`- k가 너무 작으면 주변과 범주가 다른 ${bl('s4_a', 6)} 데이터 하나에도 예측이 쉽게 바뀐다.`) +
        L(`- k가 너무 크면 가까운 이웃이 아니라 데이터 전체의 다수결이 되어, 개수가 ${bl('s4_b', 4)} 범주로만 예측된다.`) +
        L(`- 범주가 두 개일 때는 표가 똑같이 나뉘는 동점을 피하려고 k를 ${bl('s4_c', 4)}로 정하는 경우가 많다.`) +
        L('- 그렇다면 알맞은 k는 어떻게 고를까?&nbsp;5번에서 알아보자.'))
  },
  {
    title: '모델 평가', short: '모델 평가',
    goal: '데이터를 학습 데이터와 테스트 데이터로 나누어 KNN이 얼마나 잘 맞히는지 정확도로 평가하고, 정확도를 보고 알맞은 k를 골라 봅니다.',
    concept: '',
    render: () => wsCard('5. 모델 평가',
      L(`- 과일 가게에 귤 50개, 레몬 50개가 새로 들어왔다.&nbsp;이 과일 ${N_TR + N_TE}개로 KNN이 범주를 얼마나 잘 맞히는지 평가해 보자.`) +
      L(`- 데이터를 둘로 나누어 ${N_TR}개(70%)는 KNN이 이웃을 찾는 ${bl('s5_a', 5)} 데이터로 쓰고, 나머지 ${N_TE}개(30%)는 범주를 가려 두고 처음 보는 과일처럼 맞혀 보는 ${bl('s5_b', 5)} 데이터로 쓴다.`) +
      `<p class="ws-formula sm">정확도(%) = 맞힌 개수 ÷ ${bl('s5_c', 6)} × 100</p>` +
      q(`k = ${TAB_K}로 테스트 데이터 중 과일 10개의 범주를 예측했다.&nbsp;맞혔으면 O, 틀렸으면 X를 고르고 정확도를 구해 보자.`) +
      `<div class="t10">${tbl(['과일', '단맛 (점)', '신맛 (점)', '실제 범주', '예측 범주', 'O / X'], IR_TAB.map((r, t) => [CIRC[t], FR2.pts[r.i][0], FR2.pts[r.i][1], CLS_F[r.real], CLS_F[r.pred], OX5('t' + (t + 1), `${CIRC[t]} O/X`)]), { cls: 't1 tx' })}<div class="ws-sim"><p class="ws-q" style="margin-top:0">왜 그렇게 예측했을까? · 번호를 눌러 보세요</p>${slot('t10')}</div></div>` +
      `<div class="ws-row">${L('맞힌 개수')}${ti('s5_n', '맞힌 개수', 'ws-short')}${L('개 · 정확도')}${ti('s5_acc', '정확도', 'ws-short')}${L('%')}</div>`) +
      card(`과일 ${N_TR + N_TE}개로 KNN 해 보기`, `<div class="ctls">${range('irk', 'k (이웃의 수)', 1, K_MAX, 1)}</div>${slot('ir')}`, { sub: '★을 끌거나 그래프를 눌러 새 과일의 위치를 바꾸어 보세요. 속이 빈 점(테스트 데이터)은 이웃으로 쓰지 않습니다.' }) +
      card('k에 따른 정확도', slot('acc'), { sub: `k를 1부터 ${K_MAX}까지 바꾸며 학습 데이터 ${N_TR}개와 테스트 데이터 ${N_TE}개를 각각 예측해 맞힌 비율입니다. 점에 마우스를 올리면 정확도가 보여요.` }) +
      wsCard('5. 모델 평가 (이어서)',
        q('k를 정할 때 학습 데이터 정확도가 아니라 테스트 데이터 정확도를 보아야 하는 까닭을 써 보자.') + ta('s5_q2', 3, '테스트 데이터로 평가하는 까닭') +
        q('[알맞은 k 고르기] 위 그래프를 보고 알맞은 k를 하나 골라 보자.') +
        `<div class="ws-row">${L('내가 고른 k')}${ti('s5_best', '내가 고른 k', 'ws-short')}</div>` +
        q('그 k를 고른 까닭을 써 보자.&nbsp;(테스트 데이터 정확도, 4번에서 알아본 k가 너무 작을 때와 너무 클 때의 문제, 동점을 함께 생각해 보자.)') + ta('s5_why', 3, 'k를 고른 까닭') +
        guide('단위가 다른 속성의 거리', `<p>속성마다 값의 범위가 크게 다르면(예를 들어 키는 150~190cm, 시력은 0.1~2.0) 거리를 잴 때 범위가 넓은 속성이 거리에 훨씬 큰 영향을 줍니다.&nbsp;그래서 실제로는 속성마다 값의 범위를 0~1처럼 똑같이 맞추는 <b>정규화</b>를 한 다음 KNN을 하는 경우가 많습니다.</p>`))
  },
  {
    title: '종합 연습', short: '종합 연습',
    goal: '앞에서 배운 내용을 객관식으로 확인하고, 답을 저장합니다.',
    concept: '',
    render: () => wsCard('6. 종합 연습문제',
      MC.map(([t, os], i) => `<div class="ws-mc"><p class="ws-q">[${i + 1}] ${t}</p><div class="ws-mc-o" role="radiogroup" aria-label="${i + 1}번 답">${os.map((o, k) => `<label><input type="radio" name="mc${i + 1}" data-k="mc${i + 1}" value="${k + 1}"><span>${CIRC[k]} ${o}</span></label>`).join('')}</div></div>`).join('')) +
      `<section class="card wide ws-submit"><div class="card-h"><p class="eyebrow ws-eye">저장</p><h3>답 저장하기</h3><p>답은 <b>저장하기</b>를 눌러야 이 브라우저에 저장됩니다.&nbsp;다음에 같은 컴퓨터·같은 브라우저로 열면 저장한 답이 그대로 나옵니다.</p></div>
        <div class="ws-left" id="leftList"></div>
        <div class="ws-row"><button type="button" class="btn primary" id="saveBtn2">저장하기</button><button type="button" class="btn danger" id="clearBtn">저장한 답 지우기</button><span class="ws-msg" id="saveMsg2" aria-live="polite"></span></div></section>`
  }
];
const GROUPS = { 0: '시작', 1: '분류 · KNN', 6: '정리' };
const KEYNOTE = '';
