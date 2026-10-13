'use strict';
// SPEC v1 수치(nijim_list_scroll_ui_20261013/SPEC.md) — 임의 변경 금지
const S = {
  statusH: 54, sheetTop0: 167, delta: 113, headerExpandedH: 54, barH: 44, adH: 22,
  crossfadeFrom: 0.7, snapP: 0.4, snapV: 300, snapMs: 250,
  pullExpand: 40, pullPreviewP: 0.7,
  hideNeedP: 0.5, hideDy: 4, hideMs: 180, showMs: 200, idleShowMs: 300,
  floatOverlap: 135, mapParallax: 0.5,
};
const D = S.delta, LIST0 = S.sheetTop0 + S.headerExpandedH;           // 221
const LIST1 = S.statusH + S.barH + S.adH;                              // 120
const FRAME_H = 852;

// 센터 카드: HTML로 구성(캡처 이미지 잘림 제거). 같은 카드 데이터 반복(더미, 형 허락) — 앞 3장이 AD 섹션
const CARD_H = 345; // 카드 325 + 위아래 간격 20
const CARD = { name: '밸류온피트니스', like: 85, dist: '0.8km', cat: '헬스|PT|G.T|G.X', day: ['9,900', '20,000'], month: ['43,300', '51,700'],
  sale: '11:21:28', ev: '헬스 구독 멤버십, PT 구독 멤버십 출시 기념 이벤트!' };
const CARDS = [true, true, true, false, false, false, false, false].map(ad => [CARD, CARD_H, ad]);
const AD_SECTION_H = CARDS.filter(c => c[2]).reduce((a, c) => a + c[1], 0);
const LIST_H = CARDS.reduce((a, c) => a + c[1], 0);
const CATS = ['전체', '헬스', 'PT', '필라테스', '요가', '수영'];
const SORTS = ['가까운순', '인기순'];

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);

const el = {
  stage: $('stage'), frame: $('frame'), scroller: $('scroller'), list: $('list'), tail: $('tailpad'),
  topCover: $('topCover'), map: $('mapImg'), mapBlock: $('mapBlock'), ex: $('exHeader'),
  adPin: $('adPin'), bar: $('bar'), barHair: $('barHair'), cats: $('cats'), catsIn: $('catsIn'), sorts: $('sorts'),
  fab: $('fab'), seg: $('segToggle'), tabbar: $('tabbar'), tabUnder: $('tabUnder'), toast: $('toast'),
  vNew: $('vNew'), vCur: $('vCur'), curScroller: $('curScroller'), curList: $('curList'),
};

// ---------- 레이아웃(폰=전체화면, PC=가운데 폰 프레임) ----------
let stageH = FRAME_H;
function layout() {
  // iOS 사파리 주소창·툴바 노출에 따라 실제 보이는 높이가 바뀜 → visualViewport 우선
  const vv = window.visualViewport;
  const vw = window.innerWidth, vh = vv ? Math.round(vv.height) : window.innerHeight;
  const phone = vw < 600 || matchMedia('(pointer:coarse)').matches && vw < 820;
  document.body.classList.toggle('phone', phone);
  // 지도 캡처에 상태바 글자가 박혀 있어 실기기에서 실제 상태바와 이중으로 보임 → 글자 지운 사본 사용
  const mapSrc = phone ? 'assets/map_nostatus.jpg' : 'assets/map.jpg';
  document.querySelectorAll('#mapImg,.curMap').forEach(i => { if (!i.src.endsWith(mapSrc)) i.src = mapSrc; });
  let scale;
  if (phone) { scale = vw / 393; stageH = vh / scale; el.frame.style.width = vw + 'px'; el.frame.style.height = vh + 'px'; }
  else { scale = Math.min(1, (vh - 40) / FRAME_H); stageH = FRAME_H; el.frame.style.width = 393 * scale + 'px'; el.frame.style.height = FRAME_H * scale + 'px'; }
  el.stage.style.height = stageH + 'px';
  el.stage.style.transform = `scale(${scale})`;
  const fromBottom = (node, y, h) => { node.style.top = (stageH - (FRAME_H - y)) + 'px'; node.style.height = h + 'px'; };
  fromBottom(el.fab, 706.67, 52); fromBottom(el.seg, 705, 55.67); fromBottom(el.tabbar, 758.33, 98);
  el.tabUnder.style.top = (stageH - (FRAME_H - 758.33 - 49)) + 'px';
  el.tail.style.height = (S.floatOverlap + D + 20) + 'px';
  if (mode === 'new') render();
}

const ICON = {
  sub: '<svg width="17" height="13" viewBox="0 0 20 15"><rect width="20" height="15" rx="3.5" fill="#fff"/><path d="M6.6 4.9c-1.5 0-2.6 1.1-2.6 2.6s1.1 2.6 2.6 2.6c1.5 0 2.3-1.3 3.4-2.6 1.1-1.3 1.9-2.6 3.4-2.6 1.5 0 2.6 1.1 2.6 2.6s-1.1 2.6-2.6 2.6c-1.5 0-2.3-1.3-3.4-2.6S8.1 4.9 6.6 4.9z" fill="none" stroke="#FE0A70" stroke-width="1.9"/></svg>',
  clock: '<svg width="15" height="15" viewBox="0 0 17 17" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="9.3" r="6"/><path d="M8.5 6.3v3.2l2 1.4M2.2 3.6 4.4 1.7M14.8 3.6l-2.2-1.9"/></svg>',
  heart: '<svg width="13" height="11.4" viewBox="0 0 24 21"><path d="M12 21 2.6 11.6A6 6 0 0 1 11.1 3.1L12 4l.9-.9a6 6 0 0 1 8.5 8.5z" fill="#F2316B"/></svg>',
  dist: '<svg width="13" height="13" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="#E4E4E6"/><path d="M4 8h8M5.8 6.2 4 8l1.8 1.8M10.2 6.2 12 8l-1.8 1.8" fill="none" stroke="#9A9A9F" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const cardHTML = c => `<div class="cardWrap"><div class="card">
  <div class="ph"><img class="m" src="assets/photo_main.jpg" alt="" draggable="false"><div class="s"><img src="assets/photo_sub1.jpg" alt="" draggable="false"><img src="assets/photo_sub2.jpg" alt="" draggable="false"></div></div>
  <div class="band">${ICON.sub}<span>구독멤버십</span><span class="plus">+</span>${ICON.clock}<span>타임세일 ${c.sale}</span></div>
  <div class="r1"><span class="nm">${c.name}</span><span class="lk">${ICON.heart}${c.like}</span><span class="dist">${ICON.dist}${c.dist}</span></div>
  <div class="ct">${c.cat}</div>
  <div class="pr"><div><span class="k">하루</span><b>${c.day[0]}</b><span class="w">원</span><s>${c.day[1]}원</s></div><div><span class="k">한달</span><b>${c.month[0]}</b><span class="w">원</span><s>${c.month[1]}원</s></div></div>
  <div class="ev"><em>이벤트</em><i></i>${c.ev}</div>
</div></div>`;
function buildList(node) {
  node.innerHTML = CARDS.map(([c]) => cardHTML(c)).join('');
}
buildList(el.list); buildList(el.curList);

// ---------- 칩(펼침·접힘 공통 상태 — SPEC §3.5) ----------
const state = { cat: 0, sort: 0 };
function renderChips() {
  el.catsIn.innerHTML = CATS.map((t, i) => `<button class="cat${i === state.cat ? ' sel' : ''}" data-cat="${i}">${t}</button>`).join('');
  el.sorts.innerHTML = SORTS.map((t, i) => `<button class="sort${i === state.sort ? ' sel' : ''}" data-sort="${i}">${t}</button>`).join('');
  const sortW = el.sorts.getBoundingClientRect().width / currentScale();
  el.cats.style.width = (393 - 12 - sortW - 6 - 48) + 'px';
}
const currentScale = () => el.stage.getBoundingClientRect().width / 393;
el.bar.addEventListener('click', e => {
  const c = e.target.closest('[data-cat]'), s = e.target.closest('[data-sort]');
  if (!c && !s) return;
  if (c) state.cat = +c.dataset.cat; else state.sort = +s.dataset.sort;
  renderChips();
  resultsChanged();
});
function scrollSelectedChipIntoView() {
  const b = el.catsIn.querySelector('.sel'); if (!b) return;
  const l = b.offsetLeft, r = l + b.offsetWidth, vl = el.cats.scrollLeft, vr = vl + el.cats.clientWidth - 24;
  if (l < vl) el.cats.scrollLeft = l; else if (r > vr) el.cats.scrollLeft = r - el.cats.clientWidth + 24;
}

// ---------- 접힘 모델 ----------
// anchor: H = clamp(s - a, 0, Δ) — 위로 스크롤하면 헤더가 먼저 소비(§3.1). 펼친 뒤 리스트 위치 유지 위해 a(앵커) 사용.
// sticky: 완전히 접힌 상태. 아래로 스크롤해도 펼쳐지지 않고, 리스트 맨 위에서 더 당겨야(40pt) 펼침(§3.4-2).
let mode = 'new';
let m = { kind: 'anchor', a: 0 };
let anim = null, touching = false, touchStartS = 0, holdTop = false, lastRelease = { t: 0, v: 0 };
let samples = [], prevS = 0, accUp = 0, accDown = 0, idleTimer = 0, showTimer = 0;
let wheelActive = false, wheelTimer = 0, wheelStartS = 0;

const sNow = () => el.scroller.scrollTop;
const qOf = p => clamp((p - S.crossfadeFrom) / (1 - S.crossfadeFrom), 0, 1);
// 헤더 높이 54→66 보간(p 0.7→1)으로 리스트 시작점 점프 없음(§3.2): 167+54−113 = 108 → 120
const listStart = H => S.sheetTop0 - H + S.headerExpandedH + (LIST1 - S.statusH - S.headerExpandedH) * qOf(H / D);

function compute(s) {
  if (m.kind === 'anchor') {
    const H = clamp(s - m.a, 0, D);
    return { H, listY: listStart(H) - (s - H) };
  }
  const L = s - D, pull = Math.max(0, -L);
  const p = 1 - (1 - S.pullPreviewP) * Math.min(pull / S.pullExpand, 1);
  return { H: p * D, listY: LIST1 - L, pull };
}

function render(over) {
  const s = sNow();
  const { H, listY } = over || compute(s);
  const p = H / D, q = qOf(p), sheetTop = S.sheetTop0 - H;
  el.list.style.transform = `translateY(${listY - (LIST0 - s)}px)`;
  el.map.style.transform = `translateY(${-S.mapParallax * D * p}px)`;
  el.map.style.opacity = 1 - p;
  el.mapBlock.style.height = sheetTop + 'px';
  el.mapBlock.style.pointerEvents = p >= 0.5 ? 'none' : 'auto';
  el.ex.style.transform = `translateY(${-H}px)`;
  el.ex.style.opacity = 1 - q;
  el.ex.style.visibility = q >= 1 ? 'hidden' : 'visible';
  const clipTop = q >= 1 ? S.statusH + S.barH : listStart(H) - S.adH * q;
  el.topCover.style.height = clipTop + 'px';
  el.bar.style.opacity = q;
  el.bar.classList.toggle('on', q > 0.95);
  const adBottom = listY + AD_SECTION_H;
  const adY = Math.min(S.statusH + S.barH, adBottom - S.adH);
  el.adPin.style.transform = `translateY(${adY - (S.statusH + S.barH)}px)`;
  el.adPin.style.opacity = q;
  el.barHair.style.opacity = adY < S.statusH + S.barH - S.adH + 1 ? 1 : 0;
  return { p, listY };
}

// ---------- 플로팅 숨김/복귀(§4) ----------
function setFloating(show) {
  el.fab.classList.toggle('hide', !show); el.seg.classList.toggle('hide', !show);
}
function scheduleShow() { clearTimeout(showTimer); showTimer = setTimeout(() => setFloating(true), S.idleShowMs); }

// ---------- 애니메이션(250ms easeOut, 터치로 인터럽트) ----------
function animateTo(target, done) {
  cancelAnim();
  const s0 = sNow(), c0 = compute(s0);
  const from = { s: s0, H: c0.H, listY: c0.listY };
  const t0 = performance.now();
  el.scroller.style.overflowY = 'hidden';  // iOS 관성 스크롤 정지
  const step = now => {
    const t = Math.min(1, (now - t0) / S.snapMs), e = easeOut(t);
    const s = lerp(from.s, target.s, e);
    el.scroller.scrollTop = s; prevS = sNow();
    animH = lerp(from.H, target.H, e);
    render({ H: animH, listY: lerp(from.listY, target.listY, e) });
    if (t < 1) anim = requestAnimationFrame(step);
    else { anim = null; el.scroller.style.overflowY = ''; el.scroller.scrollTop = target.s; prevS = sNow(); done(); render(); }
  };
  anim = requestAnimationFrame(step);
}
let animH = 0;
function cancelAnim() {
  if (!anim) return;
  cancelAnimationFrame(anim); anim = null; el.scroller.style.overflowY = '';
  // 중간에 손가락이 닿으면 그 자리의 헤더 진행도를 그대로 이어받음(§3.3 인터럽트)
  const s = sNow();
  m = animH >= D - 0.5 && s >= D ? { kind: 'sticky' } : { kind: 'anchor', a: s - animH };
  prevS = s; render();
}

function expand(keepL) {
  const s = sNow(), c = compute(s);
  const L = keepL ? Math.max(0, c.H >= D - 0.5 || m.kind === 'sticky' ? s - D : s - c.H) : 0;
  animateTo({ s: L, H: 0, listY: LIST0 - L }, () => { m = { kind: 'anchor', a: L }; });
  clearTimeout(showTimer); setFloating(true);
}
function collapse() {
  const s = sNow(), c = compute(s), L = Math.max(0, s - c.H);
  animateTo({ s: L + D, H: D, listY: LIST1 - L }, () => { m = { kind: 'sticky' }; scrollSelectedChipIntoView(); });
}
function latchSticky() { if (m.kind !== 'sticky') { m = { kind: 'sticky' }; scrollSelectedChipIntoView(); } }

function velocity() {
  const now = performance.now();
  const rec = samples.filter(x => now - x.t < 100);
  if (rec.length < 2) return 0;
  const a = rec[0], b = rec[rec.length - 1];
  return b.t > a.t ? (b.s - a.s) / (b.t - a.t) * 1000 : 0;
}

function onIdle() {
  if (anim || touching) return;
  const s = sNow(), c = compute(s);
  if (m.kind === 'anchor') {
    if (c.H >= D) return latchSticky();
    if (c.H <= 0) return;
    const recent = performance.now() - lastRelease.t < 1500;
    const v = recent ? lastRelease.v : 0;
    const toCollapse = v >= S.snapV ? true : v <= -S.snapV ? false : c.H / D >= S.snapP;
    toCollapse ? collapse() : expand(true);
  } else if (c.pull > 0) {
    c.pull >= S.pullExpand && wheelStartS <= D + 1 ? expand(false) : bounceBack();
  }
}
function bounceBack() {
  animateTo({ s: D, H: D, listY: LIST1 }, () => { m = { kind: 'sticky' }; });
}

el.scroller.addEventListener('scroll', () => {
  if (anim) return;
  const s = sNow(), dy = s - prevS; prevS = s;
  samples.push({ t: performance.now(), s }); if (samples.length > 20) samples.shift();
  const pullAllowed = touching ? touchStartS <= D + 1 : wheelActive && wheelStartS <= D + 1;
  if (m.kind === 'sticky' && s < D && !pullAllowed) {
    // 리스트 중간에서 내려오다 맨 위에 닿으면 거기서 멈춤. 당겨서 펼침은 맨 위에서 새로 당길 때만(§3.4-2)
    el.scroller.style.overflowY = 'hidden'; el.scroller.scrollTop = D; prevS = D;
    if (touching) holdTop = true; else requestAnimationFrame(() => { el.scroller.style.overflowY = ''; });
  }
  if (m.kind === 'anchor' && !touching && compute(sNow()).H >= D) latchSticky();
  const { p, listY } = render();
  if (dy > 0) { accUp += dy; accDown = 0; } else if (dy < 0) { accDown -= dy; accUp = 0; }
  const atEnd = listY + LIST_H <= stageH - S.floatOverlap + 1;
  if (atEnd || p < S.hideNeedP) { setFloating(true); }
  else if (accUp >= S.hideDy && (m.kind === 'sticky' || p >= S.hideNeedP)) { setFloating(false); accUp = 0; }
  else if (accDown >= S.hideDy) { setFloating(true); accDown = 0; }
  scheduleShow();
  clearTimeout(idleTimer); idleTimer = setTimeout(onIdle, 120);
}, { passive: true });

function pointerDown() {
  touching = true; touchStartS = sNow(); wheelStartS = Infinity;
  if (anim) cancelAnim();
}
function pointerUp() {
  touching = false;
  if (holdTop) { holdTop = false; el.scroller.style.overflowY = ''; }
  lastRelease = { t: performance.now(), v: velocity() };
  const c = compute(sNow());
  if (m.kind === 'sticky' && c.pull > 0) {
    if (c.pull >= S.pullExpand) return expand(false);
    return bounceBack();
  }
  clearTimeout(idleTimer); idleTimer = setTimeout(onIdle, 120);
}
el.scroller.addEventListener('touchstart', pointerDown, { passive: true });
el.scroller.addEventListener('touchend', pointerUp, { passive: true });
el.scroller.addEventListener('touchcancel', pointerUp, { passive: true });

// PC: 마우스로 끌기 = 손가락 스크롤 흉내(관성은 짧게)
let drag = null;
el.scroller.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse' || e.button !== 0) return;
  pointerDown(); drag = { y: e.clientY, s: sNow() };
  el.scroller.setPointerCapture(e.pointerId);
});
el.scroller.addEventListener('pointermove', e => {
  if (!drag) return;
  el.scroller.scrollTop = drag.s - (e.clientY - drag.y) / currentScale();
});
const endDrag = () => {
  if (!drag) return; drag = null;
  const v = velocity(); pointerUp();
  if (anim || Math.abs(v) < 200 || (m.kind === 'sticky' && sNow() < D)) return;
  let vel = v / 1000, last = performance.now();
  const glide = now => {
    if (touching || anim) return;
    const dt = now - last; last = now; vel *= Math.pow(0.995, dt);
    const before = sNow(); el.scroller.scrollTop = before + vel * dt;
    if (Math.abs(vel) > 0.02 && sNow() !== before && !(m.kind === 'sticky' && sNow() <= D)) requestAnimationFrame(glide);
  };
  requestAnimationFrame(glide);
};
el.scroller.addEventListener('pointerup', endDrag);
el.scroller.addEventListener('pointercancel', endDrag);

function onWheel() {
  if (!wheelActive) { wheelStartS = sNow(); if (anim) cancelAnim(); }
  wheelActive = true; clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => { wheelActive = false; onIdle(); }, 180);
}
el.scroller.addEventListener('wheel', onWheel, { passive: true });
el.mapBlock.addEventListener('wheel', e => { onWheel(); el.scroller.scrollTop += e.deltaY; }, { passive: true });

// ---------- 버튼 ----------
let toastTimer = 0;
function toast(msg) {
  el.toast.textContent = msg; el.toast.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.toast.classList.remove('on'), 1600);
}
$('mapBtn').addEventListener('click', () => expand(true));
el.fab.addEventListener('click', () => {
  if (mode === 'new' && compute(sNow()).H > 0) { expand(true); setTimeout(() => toast('지도보기 실행(현행 지도 모드 — 프로토타입 생략)'), S.snapMs); }
  else toast('지도보기 실행(현행 지도 모드 — 프로토타입 생략)');
});
document.querySelectorAll('[data-toast]').forEach(b => b.addEventListener('click', () => toast(b.dataset.toast)));
el.mapBlock.addEventListener('click', () => toast('지도·주소·카테고리 조작은 프로토타입에서 생략'));

function resultsChanged() {
  // §7: 접힘 상태 유지, 리스트만 맨 위로(새 결과 첫 카드가 헤더 바로 아래)
  cancelAnim();
  if (m.kind === 'sticky') el.scroller.scrollTop = D; else { el.scroller.scrollTop = 0; m = { kind: 'anchor', a: 0 }; }
  prevS = sNow(); render();
  el.list.classList.add('refresh'); requestAnimationFrame(() => requestAnimationFrame(() => el.list.classList.remove('refresh')));
}

// ---------- 현행/개선안 토글 ----------
const switchBtns = document.querySelectorAll('#modeSwitch button');
function setMode(next) {
  mode = next;
  el.vNew.hidden = next !== 'new'; el.vCur.hidden = next !== 'cur';
  switchBtns.forEach(b => b.classList.toggle('on', b.dataset.mode === next));
  setFloating(true);
  history.replaceState(null, '', next === 'cur' ? '#current' : '#new');
  if (next === 'new') { renderChips(); render(); }
}
switchBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

window.addEventListener('resize', layout);
window.visualViewport && window.visualViewport.addEventListener('resize', layout);
setMode(location.hash === '#current' ? 'cur' : 'new');
layout();
document.fonts && document.fonts.ready.then(() => mode === 'new' && renderChips());

// 검증용 훅(화면 캡처 스크립트에서만 사용)
window.__proto = { S, compute: () => compute(sNow()), state: () => ({ kind: m.kind, s: sNow(), stageH }) };
