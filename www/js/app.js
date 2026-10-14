/* Запуск приложения, навигация, события */
const TABS = [['today', 'Сегодня', 'home'], ['diary', 'Дневник', 'book'], ['plan', 'План', 'plate'], ['move', 'Движение', 'run'], ['prog', 'Прогресс', 'chart']];
const TITLE = { today: 'Сегодня', diary: 'Дневник питания', plan: 'План питания', move: 'Движение', prog: 'Прогресс' };
let lastDay = dkey();

function go(tab, sub) { S.tab = tab; if (sub) { if (tab === 'prog') S.sub.prog = sub; if (tab === 'plan') S.sub.plan = sub; } const m = $('#main'); render(true); if (m) m.scrollTop = 0; }
function checkRebase(P, D, g) {
  if (D.weight.length > 1 && Math.abs(g.curMA - (P.calcWeight || P.startWeight)) >= 3) {
    P.calcWeight = g.curMA; Store.save();
    toast('Вес изменился: норма пересчитана — ' + fmtN(calcPlanFor(P, D).target) + ' ккал', 4000);
  }
}
const PENDING = { newly: [], msNew: [] };
function announce(g) {
  if (g) { g.newly.forEach(a => PENDING.newly.push(a)); g.msNew.forEach(m => PENDING.msNew.push(m)); g.newly = []; g.msNew = []; }
  if (Sheets.stack.length || $('.celebrate')) return;
  if (!PENDING.newly.length && !PENDING.msNew.length) return;
  const D = Store.data();
  if (PENDING.msNew.length) {
    const k = String(PENDING.msNew[PENDING.msNew.length - 1]);
    const rw = D.rewards[k];
    const name = k === 'goal' ? 'Вы достигли цели!' : 'Этап −' + k + '% пройден!';
    celebrate('🎉', name, 'Это результат ваших привычек.' + (rw ? ' Ваш приз: ' + rw : ' Задайте себе приз в разделе «Прогресс → Награды».'), 'Ура');
  } else {
    const a = PENDING.newly.slice(0, 3);
    celebrate(a[0].i, 'Новое достижение', a.map(x => x.n).join(', ') + (PENDING.newly.length > 3 ? ' и ещё ' + (PENDING.newly.length - 3) : ''), 'Отлично');
  }
  PENDING.newly = []; PENDING.msNew = [];
}
Sheets.onEmpty = () => setTimeout(() => announce(null), 60);
function render(keepTop) {
  const P = Store.prof();
  const main = $('#main'), top = main.scrollTop;
  if (!P) { $('#top').innerHTML = '<div class="ttl"><b>Легче</b></div>'; main.innerHTML = ''; $('#tabs').innerHTML = ''; if (!Sheets.stack.length) openOnboarding(true); return; }
  const D = Store.data();
  G_ = Game.compute(P, D);
  checkRebase(P, D, G_);
  $('#top').innerHTML = '<div class="ttl"><b>' + TITLE[S.tab] + '</b><span>' + (S.tab === 'today' ? WDL[new Date().getDay()] + ', ' + fmtD(dkey()) : esc(P.name)) + '</span></div>' +
    (G_.streak > 0 ? '<span class="chip gold" aria-label="Серия дней">🔥 ' + G_.streak + '</span>' : '') +
    '<button class="chip" data-a="profiles" aria-label="Профили">' + ic('heart', 'sm') + esc(P.name) + '</button><button class="iconbtn" data-a="settings" aria-label="Настройки">' + ic('gear') + '</button>';
  $('#tabs').innerHTML = TABS.map(t => '<button class="' + (S.tab === t[0] ? 'on' : '') + '" data-a="tab" data-t="' + t[0] + '" aria-label="' + t[1] + '">' + ic(t[2]) + t[1] + '</button>').join('');
  main.innerHTML = VIEWS[S.tab](P, D, G_);
  main.scrollTop = keepTop ? 0 : top;
  announce(G_);
}
act('tab', el => go(el.dataset.t));
act('sheet-close', () => Sheets.close());
act('celebrate-close', () => { const c = $('.celebrate'); if (c) c.remove(); setTimeout(() => announce(null), 60); });
const CHG = {
  shopScope: v => { S.shopScope = v; },
  shopWho: v => { S.shopWho = v; },
  reserve: v => { Store.db.prefs.reserveDow = +v; Store.save(); },
  budget: v => { Store.db.prefs.budget = +v; Store.save(); }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const f = ACT[el.dataset.a]; if (f) f(el, e);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-c]'); if (!el) return;
  const f = CHG[el.dataset.c]; if (f) { f(el.value); if (Sheets.stack.length) { const body = Sheets.body(); } rerender(); }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const t = dkey(); if (t !== lastDay) { if (S.date === lastDay) S.date = t; if (S.planDate === lastDay) S.planDate = t; lastDay = t; }
  if (Store.prof() && !Sheets.stack.length) render();
});

function handleBack() {
  const c = $('.celebrate'); if (c) { c.remove(); return; }
  if (Sheets.stack.length) { Sheets.close(); return; }
  if (S.tab !== 'today') { go('today'); return; }
  const A = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (A && A.exitApp) A.exitApp();
}
function initNative() {
  const A = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (A && A.addListener) { A.addListener('backButton', handleBack); }
  Notify.onTap(g => {
    Sheets.closeAll();
    if (g === 'water') go('today'); else if (g === 'move') go('move'); else if (g === 'diary') go('diary');
    else if (g === 'weight') go('prog', 'weight'); else if (g === 'bp') go('prog', 'bp'); else if (g === 'glu') go('prog', 'glu');
    else if (g === 'settings') openSettings();
  });
}
function boot() {
  Store.load();
  initNative();
  render();
  if (Notify.isNative() && Store.db.notif.on) applyNotif(true);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
}
window.addEventListener('DOMContentLoaded', boot);
