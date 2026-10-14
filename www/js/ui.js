/* UI-помощники: иконки, окна, уведомления на экране, графики, расчётные хелперы */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  plate: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>',
  run: '<circle cx="14.5" cy="4.5" r="2"/><path d="M8 21l2.5-6-2.5-2 2-5 4 1 2.5 3 3 1"/><path d="M10.5 15l3 2 1 4"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 15l4-4 3 3 5-6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  flame: '<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.5 1 2 2 2 0-3-1-5 1-8z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chevl: '<path d="M15 5l-7 7 7 7"/>',
  chevr: '<path d="M9 5l7 7-7 7"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  bell: '<path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 21h4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.5 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>'
};
const ic = (n, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n] + '</svg>';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const val = id => { const e = document.getElementById(id); return e ? e.value : ''; };
const nval = id => num(val(id));

/* Окна (шторки) */
const Sheets = {
  stack: [],
  open(html, o) {
    o = o || {};
    const root = $('#sheets');
    const scrim = document.createElement('div'); scrim.className = 'scrim';
    scrim.innerHTML = '<div class="sheet' + (o.full ? ' full' : '') + (o.sticky ? ' sticky' : '') + '" role="dialog"><div class="hd"><h2>' + esc(o.title || '') + '</h2><button class="iconbtn" data-a="sheet-close" aria-label="Закрыть">' + ic('close') + '</button></div><div class="bd">' + html + '</div></div>';
    scrim.addEventListener('click', e => { if (e.target === scrim && !o.full && !o.sticky) Sheets.close(); });
    root.appendChild(scrim);
    const rec = { el: scrim, onClose: o.onClose };
    Sheets.stack.push(rec);
    if (o.mount) o.mount($('.bd', scrim));
    return $('.bd', scrim);
  },
  close() {
    const r = Sheets.stack.pop(); if (!r) return false;
    r.el.remove(); if (r.onClose) r.onClose();
    if (!Sheets.stack.length && Sheets.onEmpty) Sheets.onEmpty();
    return true;
  },
  closeAll() { while (Sheets.stack.length) Sheets.close(); },
  body() { const r = Sheets.stack[Sheets.stack.length - 1]; return r ? $('.bd', r.el) : null; },
  setTitle(t) { const r = Sheets.stack[Sheets.stack.length - 1]; if (r) $('h2', r.el).textContent = t; }
};
let toastT = null;
function toast(msg, ms) {
  const old = $('.toast'); if (old) old.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('#app').appendChild(t);
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), ms || 2400);
}
function celebrate(emoji, title, text, btn) {
  const c = document.createElement('div'); c.className = 'celebrate';
  c.innerHTML = '<div class="box"><div class="e">' + emoji + '</div><h2 class="mt">' + esc(title) + '</h2><p class="muted">' + esc(text) + '</p><button class="btn block mt" data-a="celebrate-close">' + esc(btn || 'Отлично') + '</button></div>';
  $('#app').appendChild(c);
  if (navigator.vibrate) navigator.vibrate([60, 40, 90]);
}
function beep(f, ms) {
  try { const a = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)()); const o = a.createOscillator(), g = a.createGain(); o.frequency.value = f || 660; g.gain.value = 0.08; o.connect(g); g.connect(a.destination); o.start(); setTimeout(() => o.stop(), ms || 160); } catch (e) { }
}

/* Простой линейный график. series: [{pts:[[dateKey,value]], color, dash, dots}] */
function lineChart(o) {
  const W = 340, H = o.h || 170, L = 38, R = 8, T = 10, B = 22;
  const all = []; o.series.forEach(s => s.pts.forEach(p => all.push(p)));
  if (!all.length) return '<div class="empty small">Пока нет данных для графика</div>';
  const xs = all.map(p => parseD(p[0]).getTime()), ys = all.map(p => p[1]);
  let x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs); if (x1 === x0) { x0 -= 864e5 * 3; x1 += 864e5 * 3; }
  let y0 = o.yMin != null ? o.yMin : Math.min.apply(null, ys), y1 = o.yMax != null ? o.yMax : Math.max.apply(null, ys);
  if (o.yMin == null || o.yMax == null) { const pd = Math.max((y1 - y0) * 0.15, 0.5); if (o.yMin == null) y0 -= pd; if (o.yMax == null) y1 += pd; }
  const X = t => L + (t - x0) / (x1 - x0) * (W - L - R), Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  let g = '';
  if (o.bands) o.bands.forEach(b => { const a = Y(clamp(b.to, y0, y1)), c = Y(clamp(b.from, y0, y1)); if (c > a) g += '<rect x="' + L + '" y="' + a + '" width="' + (W - L - R) + '" height="' + (c - a) + '" fill="' + b.color + '" opacity=".16"/>'; });
  for (let i = 0; i <= 3; i++) { const v = y0 + (y1 - y0) * i / 3, y = Y(v); g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)" stroke-width="1"/><text x="' + (L - 5) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10.5" fill="var(--muted)">' + ((o.dec || (y1 - y0) < 6) ? v.toFixed(o.dec || 1) : Math.round(v)) + '</text>'; }
  g += '<text x="' + L + '" y="' + (H - 5) + '" font-size="10.5" fill="var(--muted)">' + fmtD(dkey(new Date(x0))) + '</text><text x="' + (W - R) + '" y="' + (H - 5) + '" text-anchor="end" font-size="10.5" fill="var(--muted)">' + fmtD(dkey(new Date(x1))) + '</text>';
  o.series.forEach(s => {
    const P = s.pts.map(p => [X(parseD(p[0]).getTime()), Y(p[1])]);
    if (P.length > 1) g += '<path d="' + P.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('') + '" fill="none" stroke="' + s.color + '" stroke-width="' + (s.w || 2.4) + '" stroke-linejoin="round" stroke-linecap="round"' + (s.dash ? ' stroke-dasharray="' + s.dash + '"' : '') + '/>';
    if (s.dots !== false && P.length < 70) P.forEach(p => { g += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (s.r || 3) + '" fill="' + s.color + '"/>'; });
  });
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'График') + '">' + g + '</svg>';
}

/* Расчётные хелперы поверх профиля */
const dowIdx = k => (parseD(k).getDay() + 6) % 7;
function calcPlanFor(P, D) { return Calc.plan(P, P.calcWeight || P.startWeight, { softDeficit: Calc.gluSoft(D.glu, dkey()) }); }
function targetFor(P, D, k) {
  const pl = calcPlanFor(P, D), r = Store.db.prefs.reserveDow;
  if (r == null || r < 0) return pl.target;
  const f = dowIdx(k) === r ? 1.15 : (7 - 1.15) / 6;
  return Math.round(pl.target * f / 10) * 10;
}
function curWeight(P, D) { return D.weight.length ? D.weight[D.weight.length - 1].w : P.startWeight; }
function sum(arr, f) { return arr.reduce((a, x) => a + f(x), 0); }
const SLOTNAME = { b: 'Завтрак', l: 'Обед', d: 'Ужин', s: 'Перекус' };
const SLOTICON = { b: '☀', l: '◑', d: '☾', s: '◔' };

/* Подсказки дня */
const TIPS = [
  'Стакан воды перед едой помогает съесть меньше и точнее понять, голодны ли вы.',
  'Сон меньше 7 часов повышает аппетит. Ранний отбой — тоже часть плана.',
  'Белок в каждом приёме пищи (яйца, творог, курица, рыба, бобовые) дольше сохраняет сытость.',
  'Вес колеблется на 1–2 кг в течение недели из-за воды и соли. Смотрите на тренд, а не на одно число.',
  'Тарелка: половина — овощи, четверть — белок, четверть — гарнир.',
  'Ешьте медленно: сигнал сытости доходит до мозга минут за 15–20.',
  'Сладкие напитки — самые «незаметные» калории. Замените на воду, чай или кофе без сахара.',
  'Покупайте продукты по списку и не ходите в магазин голодными.',
  'Срыв — это один приём пищи, а не конец плана. Следующий приём возвращайте по плану.',
  'Ходьба 10 минут после еды помогает сахару в крови и настроению.',
  'Ложка масла — 120 ккал. Измеряйте масло, а не наливайте на глаз.',
  'Готовьте на 2–3 дня: когда еда готова, реже тянет заказать доставку.',
  'Талия и самочувствие часто улучшаются раньше, чем вес. Замеряйте раз в 2 недели.',
  'Если вес стоит 2–3 недели, проверьте записи: соусы, масло, перекусы и напитки.',
  'Не ложитесь сразу после ужина: прогулка 10 минут улучшает сон и пищеварение.',
  'Не нужно есть «чистое». Нужно есть по плану, в основном знакомую еду.',
  'Вставайте и разминайтесь каждые 60–90 минут: это снижает усталость и скованность.'
];
