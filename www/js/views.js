/* Экраны и действия. Часть 1: общее состояние, «Сегодня», дневник, выбор продуктов. */
const S = { tab: 'today', date: dkey(), sub: { plan: 'day', prog: 'weight', move: 'main' }, planDate: dkey(), shopWho: 'me', shopScope: 'week' };
const ACT = {}, VIEWS = {};
const act = (name, fn) => { ACT[name] = fn; };
let G_ = null; // последний расчёт Game для текущего рендера

function rerender() { if (typeof render === 'function') render(); }
function afterChange() { rerender(); }

/* ---------- Предупреждения ---------- */
function alertsHtml(P, D, g) {
  let h = '';
  const bm = Calc.bpMode(D.bp, Date.now());
  if (bm.mode === 'stop') h += '<div class="banner bad"><div><b>Нагрузки отменены</b>' + esc(bm.msg) + '</div></div>';
  else if (bm.mode !== 'ok') h += '<div class="banner warn"><div><b>Облегчённый режим</b>' + esc(bm.msg) + '</div></div>';
  const pl = calcPlanFor(P, D);
  if (Calc.gluSoft(D.glu, dkey())) h += '<div class="banner warn"><div><b>Дефицит снижен до безопасного</b>За последние 2 недели был сахар вне нормы. Дефицит ограничен 10%. Не голодайте, питайтесь регулярно. Если такие значения повторяются, покажите журнал врачу (в Настройках есть экспорт).</div></div>';
  if (pl.floored) h += '<div class="banner info"><div><b>Нижний предел калорий</b>Норма не опускается ниже ' + pl.floor + ' ккал: более жёсткий дефицит вреден.</div></div>';
  const sl = Calc.slope(g.ma);
  if (sl != null) {
    const wk = sl * 7 / g.curMA * 100;
    if (wk < -1.2) h += '<div class="banner warn"><div><b>Вес падает быстрее рекомендуемого</b>Больше ~1% в неделю — риск потерять мышцы и сорваться. Добавьте еды до нормы и белка.</div></div>';
    else if (wk > -0.05 && diffDays(dkey(), P.createdAt) >= 21 && g.ma.length >= 4) h += '<div class="banner info"><div><b>Плато — это нормально</b>Вес стоит дольше 2–3 недель. Проверьте записи: масло, соусы, напитки, перекусы. Талия и самочувствие тоже считаются.</div></div>';
  }
  const st = g.stat(dkey());
  const floor = Calc.FLOOR[P.sex];
  if (new Date().getHours() >= 19 && st.n > 0 && st.kcal < floor * 0.6) h += '<div class="banner warn"><div><b>Записано мало</b>Если вы действительно ели так мало, это слишком мало: не голодайте. Если просто не всё записали, добавьте.</div></div>';
  return h;
}

/* ---------- Сегодня ---------- */
VIEWS.today = function (P, D, g) {
  const k = dkey(), st = g.stat(k), pl = calcPlanFor(P, D), target = targetFor(P, D, k);
  const left = target - st.kcal, pct = target ? st.kcal / target : 0, f = target / pl.target;
  const R = 74, C = 2 * Math.PI * R;
  const col = left < 0 ? 'var(--gold)' : 'var(--pri)';
  const ring = '<svg viewBox="0 0 176 176"><circle cx="88" cy="88" r="' + R + '" fill="none" stroke="var(--line)" stroke-width="14"/><circle cx="88" cy="88" r="' + R + '" fill="none" stroke="' + col + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + (C * Math.min(pct, 1)).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg>';
  const mac = (name, v, t, cls) => '<div class="macro"><div class="t"><span>' + name + '</span><span class="num">' + r0(v) + ' / ' + r0(t) + ' г</span></div><div class="bar ' + cls + '"><i style="width:' + clamp(v / t * 100, 0, 100) + '%"></i></div></div>';
  const wl = Math.floor(10 * Math.min(1, st.water / st.goal));
  const drops = '<div class="drops">' + Array.from({ length: 10 }, (_, i) => '<i class="' + (i < wl ? 'f' : '') + '"></i>').join('') + '</div>';
  const habit = (ok, title, sub) => '<div class="habit"><div class="tick ' + (ok ? 'on' : '') + '">' + ic('check') + '</div><div class="grow"><b>' + title + '</b><div class="small muted">' + sub + '</div></div></div>';
  const need = r0(Calc.FLOOR[P.sex] * 0.75);
  let h = alertsHtml(P, D, g);
  h += '<div class="card"><div class="hero"><div class="ringwrap">' + ring + '<div class="ringtxt"><div class="big num">' + fmtN(Math.abs(left)) + '</div><div class="lbl">' + (left >= 0 ? 'ккал осталось' : 'ккал сверх нормы') + '</div></div></div>' +
    '<div><div class="small muted">Съедено</div><div class="b num" style="font-size:22px">' + fmtN(st.kcal) + ' <span class="muted small" style="font-weight:400">из ' + fmtN(target) + '</span></div>' +
    mac('Белки', st.p, pl.protein * f, '') + mac('Жиры', st.f, pl.fat * f, 'gold') + mac('Углеводы', st.c, pl.carbs * f, 'ok') + '</div></div>' +
    (f > 1.01 ? '<div class="small muted mt">Сегодня день с запасом: норма выше на 15%. Недельное среднее не меняется.</div>' : '') +
    '<div class="row mt"><button class="btn grow" data-a="food-add" data-slot="' + autoSlot() + '">' + ic('plus', 'sm') + ' Добавить еду</button><button class="btn alt" data-a="open-diary">Дневник</button></div></div>';

  h += '<div class="card"><h3>' + ic('drop') + ' Вода<span class="sp"></span><span class="small muted num">' + fmtN(st.water) + ' / ' + fmtN(st.goal) + ' мл</span></h3>' + drops +
    '<div class="water"><button class="btn alt" data-a="water" data-ml="200">+200</button><button class="btn alt" data-a="water" data-ml="250">+250</button><button class="btn alt" data-a="water" data-ml="500">+500</button></div>' +
    '<div class="row mt"><button class="btn ghost sm" data-a="water" data-ml="-250">−250</button><button class="btn ghost sm" data-a="water-custom">Свой объём</button><span class="grow"></span></div></div>';

  const ready = st.complete;
  h += '<div class="card"><h3>' + ic('check') + ' Привычки дня<span class="sp"></span>' + (ready ? '<span class="pill ok">день засчитан</span>' : '') + '</h3>' +
    habit(st.food, 'Питание записано', st.food ? fmtN(st.kcal) + ' ккал в дневнике' : 'Запишите еду (не меньше ' + fmtN(need) + ' ккал за день)') +
    habit(st.waterOk, 'Вода', 'Минимум 80% нормы: ' + fmtN(r0(st.goal * 0.8)) + ' мл (сейчас ' + fmtN(st.water) + ')') +
    habit(st.move, 'Движение', 'От 5 минут за день (сейчас ' + r0(st.mins) + ' мин)') +
    '</div>';

  const xpPct = clamp((g.xp - g.lvlFrom) / (g.lvlTo - g.lvlFrom) * 100, 0, 100);
  h += '<div class="card"><div class="row"><div style="font-size:34px;line-height:1">' + (g.streak > 0 ? '🔥' : '🌱') + '</div><div class="grow"><div class="b" style="font-size:20px">' + g.streak + ' ' + plural(g.streak, 'день', 'дня', 'дней') + ' подряд</div><div class="small muted">Заморозка недели: ' + (g.freezeLeft ? 'доступна (один пропуск не сбросит серию)' : 'использована') + '</div></div></div>' +
    '<div class="row sb mt small"><span class="b">Уровень ' + g.level + ': ' + esc(g.title) + '</span><span class="muted num">' + g.xp + ' очков</span></div><div class="bar gold mt"><i style="width:' + xpPct + '%"></i></div></div>';

  h += '<div class="card"><h3>🎲 Челленджи недели</h3>' + g.challenges.map(c => '<div class="mb"><div class="row sb small"><span>' + (c.done ? '✅ ' : '') + esc(c.t) + '</span><span class="muted num">' + c.cur + '/' + c.goal + '</span></div><div class="bar ' + (c.done ? 'ok' : '') + ' mt"><i style="width:' + c.cur / c.goal * 100 + '%"></i></div></div>').join('') + '<div class="tiny muted">За каждый выполненный челлендж +50 очков.</div></div>';

  h += '<div class="card"><h3>Быстрые записи</h3><div class="two"><button class="btn alt" data-a="weight-add">Вес</button><button class="btn alt" data-a="meas-add">Замеры тела</button><button class="btn alt" data-a="bp-add">Давление</button><button class="btn alt" data-a="glu-add">Сахар</button></div></div>';
  h += '<div class="card flat"><div class="small muted">Совет дня</div><div class="mt">' + esc(TIPS[(hashStr(k) % TIPS.length)]) + '</div></div>';
  return h;
};
function autoSlot() { const h = new Date().getHours(); return h < 10 ? 'b' : h < 15 ? 'l' : h < 20 ? 'd' : 's'; }
act('open-diary', () => { S.date = dkey(); go('diary'); });
act('water', el => {
  const D = Store.data(), k = dkey(), ml = +el.dataset.ml, before = D.water[k] || 0;
  D.water[k] = Math.max(0, before + ml); Store.save();
  const goal = Calc.waterGoal(curWeight(Store.prof(), D));
  if (ml > 0 && before < goal * 0.8 && D.water[k] >= goal * 0.8) toast('Вода в норме. Так держать!');
  afterChange();
});
act('water-custom', () => {
  Sheets.open('<label class="f">Сколько мл выпили</label><input id="wml" type="number" inputmode="numeric" placeholder="300"><button class="btn block mt" data-a="water-custom-ok">Добавить</button>', { title: 'Своя порция воды' });
});
act('water-custom-ok', () => { const v = nval('wml'); if (!(v > 0 && v <= 3000)) return toast('Введите объём от 1 до 3000 мл'); Sheets.close(); ACT.water({ dataset: { ml: String(Math.round(v)) } }); });

/* ---------- Дневник ---------- */
VIEWS.diary = function (P, D, g) {
  const k = S.date, st = g.stat(k), pl = calcPlanFor(P, D), target = targetFor(P, D, k);
  const left = target - st.kcal;
  let h = '<div class="datebar"><button class="iconbtn" data-a="date-prev" aria-label="Назад">' + ic('chevl') + '</button><div class="center"><b>' + (k === dkey() ? 'Сегодня' : fmtDW(k)) + '</b>' + (k !== dkey() ? '<div><button class="chip" data-a="date-today">К сегодняшнему дню</button></div>' : '<div class="small muted">' + fmtDW(k) + '</div>') + '</div><button class="iconbtn" data-a="date-next" aria-label="Вперёд">' + ic('chevr') + '</button></div>';
  h += '<div class="card"><div class="row sb"><div><div class="small muted">Съедено</div><div class="b num" style="font-size:26px">' + fmtN(st.kcal) + '</div></div><div class="center"><div class="small muted">Норма</div><div class="b num" style="font-size:26px">' + fmtN(target) + '</div></div><div style="text-align:right"><div class="small muted">' + (left >= 0 ? 'Осталось' : 'Сверх') + '</div><div class="b num" style="font-size:26px;color:' + (left >= 0 ? 'var(--pri)' : 'var(--gold)') + '">' + fmtN(Math.abs(left)) + '</div></div></div>' +
    '<div class="bar mt"><i style="width:' + clamp(st.kcal / target * 100, 0, 100) + '%;background:' + (left < 0 ? 'var(--gold)' : 'var(--pri)') + '"></i></div>' +
    '<div class="row sb small muted mt"><span>Б ' + r0(st.p) + ' г</span><span>Ж ' + r0(st.f) + ' г</span><span>У ' + r0(st.c) + ' г</span></div></div>';
  ['b', 'l', 'd', 's'].forEach(sl => {
    const es = (D.food[k] || []).filter(e => e.slot === sl);
    const tot = sum(es, e => e.k);
    h += '<div class="card"><h3>' + SLOTICON[sl] + ' ' + SLOTNAME[sl] + '<span class="sp"></span><span class="num small muted">' + (es.length ? fmtN(tot) + ' ккал' : '') + '</span></h3>';
    if (es.length) h += '<div class="list">' + es.map(e => '<div class="item" data-a="entry-edit" data-id="' + e.id + '"><div class="nm"><b>' + esc(e.n) + '</b><span class="small muted">' + (e.g ? r0(e.g) + ' г · ' : '') + 'Б' + r0(e.p) + ' Ж' + r0(e.f) + ' У' + r0(e.c) + '</span></div><div class="kc num">' + r0(e.k) + '</div></div>').join('') + '</div>';
    h += '<div class="row mt"><button class="btn alt sm grow" data-a="food-add" data-slot="' + sl + '">' + ic('plus', 'sm') + ' Добавить</button>' +
      (!es.length && (D.food[addDays(k, -1)] || []).some(e => e.slot === sl) ? '<button class="btn ghost sm" data-a="copy-prev" data-slot="' + sl + '">Как вчера</button>' : '') + '</div></div>';
  });
  h += '<button class="btn ghost block" data-a="quick-add">Быстро: только калории без продукта</button>';
  return h;
};
act('date-prev', () => { S.date = addDays(S.date, -1); rerender(); });
act('date-next', () => { if (S.date < dkey()) { S.date = addDays(S.date, 1); rerender(); } });
act('date-today', () => { S.date = dkey(); rerender(); });
act('copy-prev', el => {
  const D = Store.data(), k = S.date, sl = el.dataset.slot;
  const src = (D.food[addDays(k, -1)] || []).filter(e => e.slot === sl);
  D.food[k] = (D.food[k] || []).concat(src.map(e => Object.assign({}, e, { id: uid(), t: nowT() })));
  Store.save(); toast('Скопировано со вчера'); afterChange();
});
act('entry-edit', el => {
  const D = Store.data(), k = S.date, e = (D.food[k] || []).find(x => x.id === el.dataset.id); if (!e) return;
  const body = Sheets.open('<div class="b">' + esc(e.n) + '</div><div class="muted small">' + r0(e.k) + ' ккал · Б' + r0(e.p) + ' Ж' + r0(e.f) + ' У' + r0(e.c) + '</div>' +
    (e.g ? '<label class="f">Масса, г</label><input id="eg" type="number" inputmode="decimal" value="' + r0(e.g) + '">' : '') +
    '<label class="f">Приём пищи</label><select id="es">' + ['b', 'l', 'd', 's'].map(s => '<option value="' + s + '"' + (s === e.slot ? ' selected' : '') + '>' + SLOTNAME[s] + '</option>').join('') + '</select>' +
    '<div class="row mt"><button class="btn grow" data-a="entry-save" data-id="' + e.id + '">Сохранить</button><button class="btn danger" data-a="entry-del" data-id="' + e.id + '">' + ic('trash', 'sm') + '</button></div>', { title: 'Запись' });
});
act('entry-save', el => {
  const D = Store.data(), k = S.date, e = (D.food[k] || []).find(x => x.id === el.dataset.id); if (!e) return;
  if (e.g) { const ng = nval('eg'); if (ng > 0) { const r = ng / e.g; ['k', 'p', 'f', 'c'].forEach(x => { e[x] = e[x] * r; }); e.g = ng; } }
  e.slot = val('es'); Store.save(); Sheets.close(); afterChange();
});
act('entry-del', el => { const D = Store.data(), k = S.date; D.food[k] = (D.food[k] || []).filter(x => x.id !== el.dataset.id); Store.save(); Sheets.close(); afterChange(); });
act('quick-add', () => {
  Sheets.open('<label class="f">Название (необязательно)</label><input id="qn" type="text" placeholder="Обед в кафе">' +
    '<label class="f">Калории, ккал</label><input id="qk" type="number" inputmode="numeric">' +
    '<div class="three"><div><label class="f">Белки, г</label><input id="qp" type="number" inputmode="decimal"></div><div><label class="f">Жиры, г</label><input id="qf" type="number" inputmode="decimal"></div><div><label class="f">Углев., г</label><input id="qc" type="number" inputmode="decimal"></div></div>' +
    '<label class="f">Приём пищи</label><select id="qs">' + ['b', 'l', 'd', 's'].map(s => '<option value="' + s + '"' + (s === autoSlot() ? ' selected' : '') + '>' + SLOTNAME[s] + '</option>').join('') + '</select><button class="btn block mt" data-a="quick-ok">Добавить</button>', { title: 'Быстрая запись' });
});
act('quick-ok', () => {
  const kc = nval('qk'); if (!(kc > 0 && kc < 5000)) return toast('Введите калории');
  addEntry(val('qs'), { n: val('qn') || 'Быстрая запись', cat: 'Быстро' }, null, { k: kc, p: nval('qp') || 0, f: nval('qf') || 0, c: nval('qc') || 0 });
  Sheets.close(); afterChange();
});
const entryDate = () => (S.tab === 'today' ? dkey() : S.date);
function addEntry(slot, f, g, raw, date) {
  const D = Store.data(), k = date || entryDate();
  let e;
  if (raw) e = { k: raw.k, p: raw.p, f: raw.f, c: raw.c };
  else { const m = g / 100; e = { k: f.k * m, p: f.p * m, f: f.f * m, c: f.c * m }; }
  const entry = Object.assign({ id: uid(), slot: slot, n: f.n, g: g, cat: f.cat || '', t: nowT() }, e);
  (D.food[k] = D.food[k] || []).push(entry);
  if (!raw) { D.recent = [f.n].concat(D.recent.filter(x => x !== f.n)).slice(0, 30); }
  Store.save(); return entry;
}

/* ---------- Выбор продукта ---------- */
const allFoods = D => D.customFoods.concat(D.recipes, FOODS);
function foodById(id) { const D = Store.data(); return allFoods(D).find(f => f.id === id); }
function foodByName(n) { const D = Store.data(); return allFoods(D).find(f => f.n === n); }
function openPicker(o) {
  const body = Sheets.open('<input id="fq" type="search" placeholder="Поиск: гречка, борщ, яблоко…" autocomplete="off" enterkeyhint="search">' +
    '<div class="seg" id="ftabs"></div><div id="fres"></div><div class="tiny muted mt">«сухая/сырая» — вес до приготовления, «варёная/запечённая» — готовое блюдо.</div>' +
    '<div class="row mt wrap"><button class="btn alt sm" data-a="custom-food">+ Свой продукт</button><button class="btn alt sm" data-a="recipe-new">+ Свой рецепт</button></div>', { title: o.title || 'Продукты' });
  const ctx = { o: o, tab: 'all', body: body };
  Sheets.stack[Sheets.stack.length - 1].ctx = ctx;
  ctx.fill = function () {
    const D = Store.data(), q = val('fq').trim();
    const tabs = [['all', 'Все'], ['recent', 'Недавние'], ['fav', 'Избранное'], ['mine', 'Мои']];
    $('#ftabs').innerHTML = tabs.map(t => '<button class="' + (ctx.tab === t[0] ? 'on' : '') + '" data-a="ftab" data-t="' + t[0] + '">' + t[1] + '</button>').join('');
    let list;
    if (ctx.tab === 'mine') list = D.recipes.concat(D.customFoods);
    else if (ctx.tab === 'fav') list = D.fav.map(foodByName).filter(Boolean);
    else if (ctx.tab === 'recent') list = D.recent.map(foodByName).filter(Boolean);
    else list = allFoods(D);
    const res = q ? searchFoods(list, q, 60) : (ctx.tab === 'all' ? D.recent.map(foodByName).filter(Boolean).slice(0, 8) : list.slice(0, 60));
    ctx.map = {}; res.forEach(f => { ctx.map[f.id] = f; });
    $('#fres').innerHTML = res.length ? '<div class="list">' + res.map(f => '<div class="item" data-a="pick-food" data-id="' + f.id + '"><div class="nm"><b>' + esc(f.n) + '</b><span class="small muted">' + r0(f.k) + ' ккал/100 г' + (f.ug ? ' · 1 ' + esc(f.ul) + ' ≈ ' + f.ug + ' г' : '') + ' · ' + esc(f.cat) + '</span></div><button class="star ' + (D.fav.indexOf(f.n) >= 0 ? 'on' : '') + '" data-a="fav" data-id="' + f.id + '" aria-label="В избранное">' + ic('star', 'sm') + '</button></div>').join('') + '</div>'
      : '<div class="empty">' + (q ? 'Ничего не найдено. Добавьте как «Свой продукт» (с упаковки) или попробуйте другое слово.' : (ctx.tab === 'all' ? 'Начните вводить название. Здесь появятся недавние продукты.' : 'Пока пусто')) + '</div>';
  };
  ctx.fill();
  $('#fq').addEventListener('input', ctx.fill);
  setTimeout(() => { const q = $('#fq'); if (q) q.focus(); }, 250);
}
function curPicker() { const r = Sheets.stack[Sheets.stack.length - 1]; return r && r.ctx; }
act('ftab', el => { const c = curPicker(); c.tab = el.dataset.t; c.fill(); });
act('fav', (el, ev) => {
  ev.stopPropagation(); const D = Store.data(), c = curPicker(), f = c.map[el.dataset.id]; if (!f) return;
  const i = D.fav.indexOf(f.n); if (i >= 0) D.fav.splice(i, 1); else D.fav.push(f.n); Store.save(); c.fill();
});
act('pick-food', el => {
  const c = curPicker(), f = c.map[el.dataset.id]; if (!f) return;
  c.food = f;
  const def = f.ug || 100;
  const quick = [];
  if (f.ug) [1, 2, 3].forEach(n => quick.push([n * f.ug, n + ' ' + f.ul + ' (' + n * f.ug + ' г)']));
  [50, 100, 150, 200].forEach(n => { if (n !== def) quick.push([n, n + ' г']); });
  c.body.innerHTML = '<div class="b" style="font-size:18px">' + esc(f.n) + '</div><div class="small muted">' + r0(f.k) + ' ккал · Б ' + f.p + ' · Ж ' + f.f + ' · У ' + f.c + ' на 100 г</div>' +
    '<label class="f">Масса, г</label><input id="fg" type="number" inputmode="decimal" value="' + def + '">' +
    '<div class="seg mt">' + quick.map(q => '<button data-a="amt-set" data-g="' + q[0] + '">' + q[1] + '</button>').join('') + '</div>' +
    '<div class="card flat mt center"><div class="b num" style="font-size:28px" id="fkc"></div><div class="small muted" id="fmc"></div></div>' +
    '<div class="row"><button class="btn ghost" data-a="amt-back">Назад</button><button class="btn grow" data-a="amt-ok">Добавить</button></div>';
  const upd = () => { const g = nval('fg') || 0, m = g / 100; $('#fkc').textContent = r0(f.k * m) + ' ккал'; $('#fmc').textContent = 'Б ' + r1(f.p * m) + ' · Ж ' + r1(f.f * m) + ' · У ' + r1(f.c * m); };
  $('#fg').addEventListener('input', upd); upd();
});
act('amt-set', el => { $('#fg').value = el.dataset.g; $('#fg').dispatchEvent(new Event('input')); });
act('amt-back', () => {
  const c = curPicker(); c.body.innerHTML = '<input id="fq" type="search" placeholder="Поиск: гречка, борщ, яблоко…" autocomplete="off"><div class="seg" id="ftabs"></div><div id="fres"></div><div class="row mt wrap"><button class="btn alt sm" data-a="custom-food">+ Свой продукт</button><button class="btn alt sm" data-a="recipe-new">+ Свой рецепт</button></div>';
  c.fill(); $('#fq').addEventListener('input', c.fill);
});
act('amt-ok', () => {
  const c = curPicker(), g = nval('fg');
  if (!(g > 0 && g < 5000)) return toast('Укажите массу в граммах');
  c.o.onPick(c.food, g);
  if (c.o.closeAfter) { Sheets.close(); } else { toast('Добавлено: ' + c.food.n); ACT['amt-back'](); }
  afterChange();
});
act('food-add', el => { const slot = el.dataset.slot; openPicker({ title: 'Добавить: ' + SLOTNAME[slot].toLowerCase(), onPick: (f, g) => addEntry(slot, f, g) }); });

/* Свой продукт */
act('custom-food', () => {
  Sheets.open('<label class="f">Название</label><input id="cn" type="text" placeholder="Например: Сырок «Тёма»">' +
    '<div class="small muted mt">Значения на 100 г, как на упаковке</div>' +
    '<div class="two"><div><label class="f">Калории</label><input id="ck" type="number" inputmode="decimal"></div><div><label class="f">Белки, г</label><input id="cp" type="number" inputmode="decimal"></div><div><label class="f">Жиры, г</label><input id="cf" type="number" inputmode="decimal"></div><div><label class="f">Углеводы, г</label><input id="cc" type="number" inputmode="decimal"></div></div>' +
    '<label class="f">Вес одной порции/штуки, г (необязательно)</label><input id="cu" type="number" inputmode="decimal"><button class="btn block mt" data-a="custom-food-ok">Сохранить</button>', { title: 'Свой продукт' });
});
act('custom-food-ok', () => {
  const n = val('cn').trim(), k = nval('ck');
  if (!n) return toast('Введите название'); if (!(k >= 0)) return toast('Введите калории на 100 г');
  const D = Store.data(), u = nval('cu');
  const f = { id: 'c' + uid(), n: n, k: k, p: nval('cp') || 0, f: nval('cf') || 0, c: nval('cc') || 0, cat: 'Мои продукты', q: normQ(n) };
  if (u > 0) { f.ug = u; f.ul = 'шт'; }
  D.customFoods.push(f); Store.save(); Sheets.close();
  const c = curPicker(); if (c && c.fill) c.fill(); toast('Продукт сохранён');
});

/* Свой рецепт */
let RB = null;
act('recipe-new', () => { RB = { n: '', portions: 4, ing: [] }; recipeSheet(); });
function recipeSheet() {
  const tot = RB.ing.reduce((a, x) => ({ g: a.g + x.g, k: a.k + x.f.k * x.g / 100, p: a.p + x.f.p * x.g / 100, f: a.f + x.f.f * x.g / 100, c: a.c + x.f.c * x.g / 100 }), { g: 0, k: 0, p: 0, f: 0, c: 0 });
  const html = '<label class="f">Название блюда</label><input id="rn" type="text" value="' + esc(RB.n) + '" placeholder="Например: Суп мамин">' +
    '<label class="f">Сколько порций получилось</label><input id="rp" type="number" inputmode="numeric" value="' + RB.portions + '">' +
    '<div class="mt b">Ингредиенты</div>' +
    (RB.ing.length ? '<div class="list">' + RB.ing.map((x, i) => '<div class="item"><div class="nm"><b>' + esc(x.f.n) + '</b><span class="small muted">' + r0(x.g) + ' г · ' + r0(x.f.k * x.g / 100) + ' ккал</span></div><button class="star" data-a="rb-del" data-i="' + i + '" aria-label="Убрать">' + ic('trash', 'sm') + '</button></div>').join('') + '</div>' : '<div class="empty small">Пока нет ингредиентов</div>') +
    '<button class="btn alt block mt" data-a="rb-add">' + ic('plus', 'sm') + ' Добавить ингредиент</button>' +
    '<div class="card flat mt"><div class="row sb"><span>Всего</span><b class="num">' + r0(tot.k) + ' ккал</b></div><div class="row sb"><span>На порцию</span><b class="num">' + r0(tot.k / Math.max(1, RB.portions)) + ' ккал</b></div></div>' +
    '<button class="btn block" data-a="rb-save">Сохранить рецепт</button>';
  const top = Sheets.stack[Sheets.stack.length - 1];
  if (top && top.isRecipe) { top.el.querySelector('.bd').innerHTML = html; } else { Sheets.open(html, { title: 'Свой рецепт' }); Sheets.stack[Sheets.stack.length - 1].isRecipe = true; }
}
function rbSync() { if (val('rn') !== undefined && document.getElementById('rn')) { RB.n = val('rn'); RB.portions = Math.max(1, Math.round(nval('rp') || 1)); } }
act('rb-add', () => { rbSync(); openPicker({ title: 'Ингредиент', closeAfter: true, onPick: (f, g) => { RB.ing.push({ f: f, g: g }); setTimeout(recipeSheet, 0); } }); });
act('rb-del', el => { rbSync(); RB.ing.splice(+el.dataset.i, 1); recipeSheet(); });
act('rb-save', () => {
  rbSync(); if (!RB.n.trim()) return toast('Введите название'); if (!RB.ing.length) return toast('Добавьте ингредиенты');
  const t = RB.ing.reduce((a, x) => ({ g: a.g + x.g, k: a.k + x.f.k * x.g / 100, p: a.p + x.f.p * x.g / 100, f: a.f + x.f.f * x.g / 100, c: a.c + x.f.c * x.g / 100 }), { g: 0, k: 0, p: 0, f: 0, c: 0 });
  const per = t.g / RB.portions, m = 100 / t.g;
  const D = Store.data();
  D.recipes.push({ id: 'r' + uid(), n: RB.n.trim(), k: t.k * m, p: t.p * m, f: t.f * m, c: t.c * m, cat: 'Мои рецепты', ug: Math.round(per), ul: 'порция', q: normQ(RB.n) });
  Store.save(); Sheets.close(); toast('Рецепт сохранён. Ищите его во вкладке «Мои»');
  const c = curPicker(); if (c && c.fill) c.fill();
});

/* ---------- План питания ---------- */
const MEALSLOT = { b: 'b', s1: 's', l: 'l', s2: 's', d: 'd' };
function weekPlanFor(P, D, wk) {
  const db = Store.db;
  return MealPlan.genWeek(calcPlanFor(P, D).target, wk, { seed: (db.seeds[wk] || 0), maxCost: db.prefs.budget, reserveDow: db.prefs.reserveDow });
}
function ingLine(n, g) {
  const f = findFood(n); let extra = '';
  if (f && f.ul === 'шт' && f.ug) { const c = g / f.ug; extra = ' (≈ ' + (Math.round(c * 2) / 2) + ' шт)'; }
  return '<li><span>' + esc(n.replace(/ \((сухая|сухой|сухие|сырая|сырой|сырое)\)$/, '')) + '</span><span>' + g + ' г' + extra + '</span></li>';
}
VIEWS.plan = function (P, D, g) {
  const sub = S.sub.plan, wk = weekStart(S.planDate), plan = weekPlanFor(P, D, wk), db = Store.db;
  let h = '<div class="seg">' + [['day', 'День'], ['week', 'Неделя'], ['shop', 'Покупки'], ['basket', 'Корзина']].map(t => '<button class="' + (sub === t[0] ? 'on' : '') + '" data-a="plan-sub" data-s="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
  if (sub === 'day' || sub === 'week' || sub === 'shop') {
    h += '<div class="datebar"><button class="iconbtn" data-a="plan-week" data-d="-7" aria-label="Предыдущая неделя">' + ic('chevl') + '</button><div class="center"><b>' + fmtD(wk) + ' – ' + fmtD(addDays(wk, 6)) + '</b>' + (wk === weekStart(dkey()) ? '<div class="small muted">эта неделя</div>' : '') + '</div><button class="iconbtn" data-a="plan-week" data-d="7" aria-label="Следующая неделя">' + ic('chevr') + '</button></div>';
  }
  if (sub === 'day') {
    h += '<div class="days">' + plan.days.map(d => '<button class="' + (d.date === S.planDate ? 'on ' : '') + (d.date === dkey() ? 'today' : '') + '" data-a="plan-day" data-d="' + d.date + '">' + WD[parseD(d.date).getDay()] + '<b>' + parseD(d.date).getDate() + '</b></button>').join('') + '</div>';
    const day = plan.days.find(d => d.date === S.planDate) || plan.days[0];
    h += '<div class="card"><div class="row sb"><div><div class="small muted">План на день</div><div class="b num" style="font-size:24px">' + fmtN(day.tot.k) + ' ккал</div></div><div style="text-align:right" class="small muted num">Б ' + day.tot.p + ' · Ж ' + day.tot.f + ' · У ' + day.tot.c + (day.factor > 1.01 ? '<div><span class="pill gold">день с запасом</span></div>' : '') + '</div></div></div>';
    day.meals.forEach((m, i) => {
      const sl = MealPlan.SLOTS[i], dish = MealPlan.DISH[m.dishId];
      h += '<div class="card dish"><div class="slotname">' + sl.icon + ' ' + sl.name + ' · ' + m.k + ' ккал</div><h4>' + esc(dish.n) + '</h4><ul>' + m.ing.map(x => ingLine(x[0], x[1])).join('') + '</ul>' +
        '<div class="small muted">Б ' + m.p + ' · Ж ' + m.f + ' · У ' + m.c + '</div>' + (dish.tip ? '<div class="small mt">💡 ' + esc(dish.tip) + '</div>' : '') +
        '<button class="btn alt sm mt" data-a="plan-eat" data-day="' + day.date + '" data-i="' + i + '">В дневник</button></div>';
    });
    h += '<button class="btn ghost block" data-a="plan-reroll">Другое меню на эту неделю</button>';
  } else if (sub === 'week') {
    h += settingsPlanPrefs();
    h += plan.days.map(d => '<div class="card"><div class="row sb"><b>' + WDL[parseD(d.date).getDay()] + ', ' + fmtD(d.date) + '</b><span class="num b">' + d.tot.k + ' ккал</span></div>' + d.meals.map((m, i) => '<div class="small mt"><span class="muted">' + MealPlan.SLOTS[i].name + ':</span> ' + esc(MealPlan.DISH[m.dishId].n) + '</div>').join('') + '<button class="btn alt sm mt" data-a="plan-day-open" data-d="' + d.date + '">Подробно</button></div>').join('');
    h += '<button class="btn ghost block" data-a="plan-reroll">Другое меню на эту неделю</button>';
  } else if (sub === 'shop') {
    const who = S.shopWho, scope = S.shopScope;
    const dates = plan.days.map(d => d.date).filter(d => scope === 'week' || d >= dkey());
    const plans = who === 'all' ? db.profiles.map(p => weekPlanFor(p, Store.data(p.id), wk)) : [plan];
    const sh = MealPlan.shopping(plans, dates, db.prices);
    db.checks = db.checks || {};
    const ck = db.checks[wk + scope + who] || {};
    h += '<div class="card"><div class="two"><div><label class="f">Период</label><select data-c="shopScope"><option value="week"' + (scope === 'week' ? ' selected' : '') + '>Вся неделя</option><option value="rest"' + (scope === 'rest' ? ' selected' : '') + '>С сегодняшнего дня</option></select></div><div><label class="f">Для кого</label><select data-c="shopWho"><option value="me"' + (who === 'me' ? ' selected' : '') + '>Только я</option><option value="all"' + (who === 'all' ? ' selected' : '') + '>Все профили (' + db.profiles.length + ')</option></select></div></div>' +
      '<div class="row sb mt"><span class="muted">Примерная стоимость</span><b class="num" style="font-size:22px">' + fmtN(sh.total) + ' ₽</b></div><div class="tiny muted">Цены ориентировочные. Нажмите на цену, чтобы поставить свою (₽ за кг).</div></div>';
    if (!sh.items.length) h += '<div class="empty">Нет блюд на выбранный период</div>';
    let cat = '';
    sh.items.forEach(it => {
      if (it.cat !== cat) { cat = it.cat; h += '<div class="b mt2 mb small muted">' + esc(cat) + '</div>'; }
      const on = ck[it.n];
      const amount = it.buyG >= 1000 ? (it.buyG / 1000).toFixed(it.buyG % 1000 ? 2 : 0).replace(/\.?0+$/, '') + ' кг' : it.buyG + ' г';
      h += '<div class="chk ' + (on ? 'done' : '') + '"><div class="tick ' + (on ? 'on' : '') + '" data-a="shop-check" data-n="' + esc(it.n) + '" role="checkbox" aria-checked="' + !!on + '">' + ic('check') + '</div><div class="nm grow" data-a="shop-check" data-n="' + esc(it.n) + '"><div>' + esc(it.n.replace(/ \((сухая|сухой|сухие|сырая|сырой|сырое)\)$/, '')) + '</div><div class="small muted">' + amount + (it.pieces ? ' (≈ ' + it.pieces + ' шт)' : '') + '</div></div><button class="chip" data-a="price-edit" data-n="' + esc(it.n) + '">' + it.cost + ' ₽</button></div>';
    });
  } else {
    h += '<div class="card"><h3>🛒 Бюджетная корзина для похудения</h3><div class="small muted">Цены приблизительные, ₽ за кг (если не указано иное). В вашем регионе могут отличаться: поправьте в разделе «Покупки».</div></div>';
    BASKET.forEach(b => { h += '<div class="card"><h3>' + esc(b.grp) + '</h3><div class="small mb">' + esc(b.tip) + '</div><table class="t">' + b.items.map(i => '<tr><td>' + esc(i[0]) + '</td><td style="text-align:right" class="num">~' + i[1] + ' ₽</td></tr>').join('') + '</table></div>'; });
    h += '<div class="card"><h3>Как не переплачивать</h3><ul style="padding-left:18px;margin:0">' + BASKET_RULES.map(r => '<li class="mb">' + esc(r) + '</li>').join('') + '</ul></div>';
  }
  return h;
};
function settingsPlanPrefs() {
  const db = Store.db;
  return '<div class="card"><div class="two"><div><label class="f">День с запасом (+15%)</label><select data-c="reserve"><option value="-1">Нет</option>' + ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, i) => '<option value="' + i + '"' + (db.prefs.reserveDow === i ? ' selected' : '') + '>' + d + '</option>').join('') + '</select></div>' +
    '<div><label class="f">Бюджет блюд</label><select data-c="budget"><option value="1"' + (db.prefs.budget === 1 ? ' selected' : '') + '>Самые дешёвые</option><option value="2"' + (db.prefs.budget === 2 ? ' selected' : '') + '>Недорогие</option><option value="3"' + (db.prefs.budget === 3 ? ' selected' : '') + '>Любые</option></select></div></div><div class="tiny muted mt">День с запасом помогает не срываться в выходные: в остальные дни норма чуть ниже, а среднее за неделю остаётся тем же.</div></div>';
}
act('plan-sub', el => { S.sub.plan = el.dataset.s; rerender(); });
act('plan-day', el => { S.planDate = el.dataset.d; rerender(); });
act('plan-day-open', el => { S.planDate = el.dataset.d; S.sub.plan = 'day'; rerender(); });
act('plan-week', el => { S.planDate = addDays(weekStart(S.planDate), +el.dataset.d); rerender(); });
act('plan-reroll', () => { const wk = weekStart(S.planDate); Store.db.seeds[wk] = (Store.db.seeds[wk] || 0) + 1; Store.save(); rerender(); });
act('plan-eat', el => {
  const P = Store.prof(), D = Store.data(), wk = weekStart(el.dataset.day), plan = weekPlanFor(P, D, wk);
  const day = plan.days.find(d => d.date === el.dataset.day), i = +el.dataset.i, m = day.meals[i], dish = MealPlan.DISH[m.dishId];
  addEntry(MEALSLOT[m.slot], { n: dish.n, cat: 'План' }, m.g, { k: m.k, p: m.p, f: m.f, c: m.c }, day.date);
  toast('Добавлено в дневник: ' + dish.n); rerender();
});
act('shop-check', el => {
  const db = Store.db, wk = weekStart(S.planDate), key = wk + S.shopScope + S.shopWho;
  db.checks = db.checks || {}; db.checks[key] = db.checks[key] || {};
  db.checks[key][el.dataset.n] = !db.checks[key][el.dataset.n]; Store.save(); rerender();
});
act('price-edit', el => {
  const n = el.dataset.n, cur = MealPlan.priceOf(n, Store.db.prices);
  Sheets.open('<div class="b">' + esc(n) + '</div><label class="f">Цена, ₽ за 1 кг</label><input id="pr" type="number" inputmode="numeric" value="' + cur + '"><div class="row mt"><button class="btn ghost" data-a="price-reset" data-n="' + esc(n) + '">Сбросить</button><button class="btn grow" data-a="price-ok" data-n="' + esc(n) + '">Сохранить</button></div>', { title: 'Своя цена' });
});
act('price-ok', el => { const v = nval('pr'); if (!(v >= 0)) return; Store.db.prices[el.dataset.n] = v; Store.save(); Sheets.close(); rerender(); });
act('price-reset', el => { delete Store.db.prices[el.dataset.n]; Store.save(); Sheets.close(); rerender(); });

/* ---------- Движение ---------- */
let RUN = null;
VIEWS.move = function (P, D, g) {
  const today = dkey(), wk = Ex.weekNo(P.createdAt, today), w = curWeight(P, D), bmi = Calc.bmi(w, P.height);
  const prm = Ex.weekParams(wk, bmi), bm = Calc.bpMode(D.bp, Date.now());
  const mv = D.moves[today] || [];
  const microDone = mv.filter(m => m.kind === 'micro').length;
  const walkMin = sum(mv.filter(m => m.kind === 'walk'), m => m.min);
  let h = alertsHtml(P, D, g);
  h += '<div class="card"><h3>👣 Неделя ' + wk + ' программы</h3><div class="small muted">Нагрузка растёт постепенно, подстраивается под вес и давление. Прыжков, бега и упражнений на полу здесь нет.</div>' +
    '<div class="stat"><div><b>' + prm.min + '</b><span>мин сессия</span></div><div><b>' + prm.walk + '</b><span>мин ходьбы</span></div><div><b>' + prm.microPerDay + '</b><span>мини-разминки</span></div></div></div>';
  if (bm.mode === 'stop') {
    h += '<div class="card"><b>Сегодня без нагрузки.</b><div class="muted small mt">Отдыхайте. Когда давление вернётся в норму, раздел снова откроет упражнения.</div></div>';
  } else {
    const minutes = bm.mode === 'ok' ? prm.min : Math.min(6, prm.min);
    h += '<div class="card"><h3>Основная разминка</h3><div class="small muted">' + minutes + ' минут · ' + (bm.mode === 'ok' ? 'сидя, стоя и у стены' : 'только сидя') + '</div><button class="btn block mt" data-a="run-start" data-kind="main" data-min="' + minutes + '">Начать</button></div>';
    h += '<div class="card"><h3>Мини-разминка<span class="sp"></span><span class="small muted num">' + microDone + ' / ' + prm.microPerDay + '</span></h3><div class="small muted">2–3 минуты прямо за столом. Включите напоминания, чтобы не забывать.</div><button class="btn alt block mt" data-a="run-start" data-kind="micro">Начать</button></div>';
    if (bm.mode === 'ok' || bm.mode === 'light') {
      const goal = bm.mode === 'light' ? Math.min(10, prm.walk) : prm.walk;
      h += '<div class="card"><h3>Ходьба<span class="sp"></span><span class="small muted num">' + r0(walkMin) + ' / ' + goal + ' мин</span></h3><div class="bar ok"><i style="width:' + clamp(walkMin / goal * 100, 0, 100) + '%"></i></div><div class="small muted mt">Темп, при котором можно разговаривать. Если одышка, идите медленнее.</div><div class="water"><button class="btn alt" data-a="walk" data-m="5">+5 мин</button><button class="btn alt" data-a="walk" data-m="10">+10 мин</button><button class="btn alt" data-a="walk" data-m="20">+20 мин</button></div></div>';
    }
  }
  if (mv.length) h += '<div class="card"><h3>Сегодня сделано</h3><div class="list">' + mv.map(m => '<div class="item"><div class="nm"><b>' + esc(m.name) + '</b><span class="small muted">' + m.t + ' · ' + r1(m.min) + ' мин · ≈ ' + m.kcal + ' ккал</span></div><button class="star" data-a="move-del" data-id="' + m.id + '" aria-label="Удалить">' + ic('trash', 'sm') + '</button></div>').join('') + '</div><div class="tiny muted mt">Сожжённые калории только для информации: к норме еды они не добавляются.</div></div>';
  h += '<div class="card"><h3>Упражнения</h3><div class="list">' + Ex.LIST.map(e => '<div class="item" data-a="ex-info" data-id="' + e.id + '"><div class="nm"><b>' + esc(e.n) + '</b><span class="small muted">' + ({ sit: 'сидя', stand: 'стоя', wall: 'у стены' }[e.mode]) + ' · уровень ' + e.lvl + '</span></div>' + ic('chevr', 'sm') + '</div>').join('') + '</div></div>';
  h += '<div class="card"><h3>⚠ Остановитесь, если</h3><ul style="padding-left:18px;margin:0">' + Ex.STOP.map(s => '<li class="mb">' + esc(s) + '</li>').join('') + '</ul><div class="small muted">При таких признаках прекратите нагрузку, сядьте, отдохните. Если не проходит, вызовите скорую (103/112).</div></div>';
  return h;
};
act('ex-info', el => { const e = Ex.BY[el.dataset.id]; Sheets.open('<p>' + esc(e.d) + '</p>' + (e.caution === 'knee' ? '<div class="banner warn"><div>Если появилась боль в коленях, уменьшите амплитуду или пропустите упражнение.</div></div>' : '') + '<div class="small muted">Рекомендуемое время: ' + e.sec + ' секунд</div>', { title: e.n }); });
act('move-del', el => { const D = Store.data(), k = dkey(); D.moves[k] = (D.moves[k] || []).filter(m => m.id !== el.dataset.id); Store.save(); afterChange(); });
function logMove(kind, name, min, kcal) {
  const D = Store.data(), k = dkey();
  (D.moves[k] = D.moves[k] || []).push({ id: uid(), kind: kind, name: name, min: min, kcal: kcal, t: nowT() });
  Store.save();
}
act('walk', el => { const P = Store.prof(), D = Store.data(), m = +el.dataset.m; logMove('walk', 'Ходьба', m, Ex.kcal(2.8, curWeight(P, D), m * 60)); toast('Ходьба записана: ' + m + ' мин'); afterChange(); });
act('run-start', el => {
  const P = Store.prof(), D = Store.data(), bm = Calc.bpMode(D.bp, Date.now());
  const w = curWeight(P, D), wk = Ex.weekNo(P.createdAt, dkey()), prm = Ex.weekParams(wk, Calc.bmi(w, P.height));
  let steps, kind = el.dataset.kind;
  if (kind === 'micro') steps = Ex.micro(hashStr(dkey()) + (D.moves[dkey()] || []).length, bm.mode);
  else steps = Ex.build(+el.dataset.min || prm.min, bm.mode === 'ok' ? prm.lvl : 1, bm.mode, prm.sec);
  RUN = { steps: steps, i: 0, phase: 'work', left: steps[0].sec, paused: false, elapsed: 0, kcal: 0, kind: kind, w: w, done: false, timer: null, total: Ex.dur(steps) };
  Sheets.open('<div class="runner" id="runner"></div>', { title: kind === 'micro' ? 'Мини-разминка' : 'Разминка', full: true, onClose: () => { if (RUN && !RUN.done) finishRun(false); } });
  runDraw(); RUN.timer = setInterval(runTick, 1000); beep(520, 120);
});
function runTick() {
  if (!RUN || RUN.paused) return;
  const st = RUN.steps[RUN.i], ex = Ex.BY[st.ex];
  RUN.left--; RUN.elapsed++; if (RUN.phase === 'work') RUN.kcal += ex.met * RUN.w / 3600;
  if (RUN.left <= 0) runNext(); else runDraw();
}
function runNext() {
  const st = RUN.steps[RUN.i];
  if (RUN.phase === 'work' && st.rest > 0 && RUN.i < RUN.steps.length) { RUN.phase = 'rest'; RUN.left = st.rest; beep(440, 120); }
  else { RUN.i++; if (RUN.i >= RUN.steps.length) return finishRun(true); RUN.phase = 'work'; RUN.left = RUN.steps[RUN.i].sec; beep(760, 160); if (navigator.vibrate) navigator.vibrate(120); }
  runDraw();
}
function runDraw() {
  const el = $('#runner'); if (!el || !RUN) return;
  const st = RUN.steps[RUN.i], ex = Ex.BY[st.ex], nxt = RUN.steps[RUN.i + 1];
  const rest = RUN.phase === 'rest';
  el.innerHTML = '<div class="small muted">Упражнение ' + (RUN.i + 1) + ' из ' + RUN.steps.length + '</div>' +
    '<div class="name">' + (rest ? 'Отдых' : esc(ex.n)) + '</div><div class="tm num">' + Math.floor(RUN.left / 60) + ':' + pad(RUN.left % 60) + '</div>' +
    '<div class="ds">' + (rest ? 'Подышите. Дальше: ' + (nxt ? esc(Ex.BY[nxt.ex].n) : 'финиш') : esc(ex.d)) + '</div>' +
    '<div class="stepdots">' + RUN.steps.map((s, i) => '<i class="' + (i < RUN.i ? 'd' : i === RUN.i ? 'c' : '') + '"></i>').join('') + '</div>' +
    '<div class="row" style="justify-content:center"><button class="btn alt" data-a="run-pause">' + (RUN.paused ? 'Продолжить' : 'Пауза') + '</button><button class="btn ghost" data-a="run-skip">Пропустить</button><button class="btn danger" data-a="run-stop">Закончить</button></div>' +
    '<div class="tiny muted mt2">Если плохо себя чувствуете, нажмите «Закончить» и отдохните.</div>';
}
act('run-pause', () => { if (RUN) { RUN.paused = !RUN.paused; runDraw(); } });
act('run-skip', () => { if (RUN) { RUN.phase = 'work'; RUN.left = 0; runNext(); } });
act('run-stop', () => { Sheets.close(); });
function finishRun(completed) {
  if (!RUN || RUN.done) return; RUN.done = true; clearInterval(RUN.timer);
  const min = RUN.elapsed / 60, kind = RUN.kind, kc = Math.round(RUN.kcal);
  const full = completed; RUN.completed = completed;
  if (RUN.elapsed >= 45) { logMove(kind === 'micro' ? 'micro' : 'session', kind === 'micro' ? 'Мини-разминка' : 'Разминка', r1(min), kc); }
  if (completed) { Sheets.closeAll(); celebrate('💪', 'Разминка выполнена', r1(min) + ' мин · примерно ' + kc + ' ккал. Так держать!', 'Дальше'); }
  RUN = null; afterChange();
}

/* ---------- Прогресс ---------- */
VIEWS.prog = function (P, D, g) {
  const sub = S.sub.prog;
  const tabs = [['weight', 'Вес'], ['body', 'Тело'], ['bp', 'Давление'], ['glu', 'Сахар'], ['rew', 'Награды'], ['pair', 'Пара']];
  let h = '<div class="seg">' + tabs.map(t => '<button class="' + (sub === t[0] ? 'on' : '') + '" data-a="prog-sub" data-s="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
  h += ({ weight: progWeight, body: progBody, bp: progBp, glu: progGlu, rew: progRew, pair: progPair }[sub])(P, D, g);
  return h;
};
act('prog-sub', el => { S.sub.prog = el.dataset.s; rerender(); });

function progWeight(P, D, g) {
  const cur = g.curMA, raw = D.weight.length ? D.weight[D.weight.length - 1].w : P.startWeight;
  const goal = P.goalWeight || r1(P.startWeight * 0.85);
  const sl = Calc.slope(g.ma), fc = Calc.forecast(g.ma, goal);
  const wk = sl != null ? r1(sl * 7) : null;
  let h = '<div class="card"><div class="stat"><div><b class="num">' + r1(cur) + '</b><span>вес (тренд), кг</span></div><div><b class="num">−' + g.loss + '</b><span>кг от старта</span></div><div><b class="num">' + g.lossPct + '%</b><span>от стартового</span></div></div>' +
    '<div class="small muted">Тренд — среднее за 7 дней: оно не прыгает из-за воды и соли. Последнее взвешивание: ' + r1(raw) + ' кг.</div>' +
    '<button class="btn block mt" data-a="weight-add">Записать вес</button></div>';
  h += '<div class="card"><h3>График</h3>' + lineChart({ series: [{ pts: D.weight.map(e => [e.d, e.w]), color: 'var(--line)', w: 0, r: 3.2 }, { pts: g.ma.map(e => [e.d, e.w]), color: 'var(--pri)', dots: g.ma.length < 20 }], dec: 0, label: 'График веса' }) +
    '<div class="legend"><span><i style="background:var(--line)"></i>взвешивания</span><span><i style="background:var(--pri)"></i>тренд (7 дней)</span></div></div>';
  h += '<div class="card"><h3>Темп и прогноз</h3><table class="t"><tr><td>Цель</td><td class="num" style="text-align:right"><b>' + goal + ' кг</b> <button class="chip" data-a="goal-edit">изменить</button></td></tr>' +
    '<tr><td>Осталось до цели</td><td class="num" style="text-align:right">' + Math.max(0, r1(cur - goal)) + ' кг</td></tr>' +
    '<tr><td>Темп за неделю</td><td class="num" style="text-align:right">' + (wk == null ? 'нужно больше данных' : (wk > 0 ? '+' : '') + wk + ' кг') + '</td></tr>' +
    '<tr><td>Ожидаемая дата цели</td><td class="num" style="text-align:right">' + (fc ? (fc.far ? 'очень далеко: ориентируйтесь на этапы' : fmtD(fc.date)) : '—') + '</td></tr></table>' +
    '<div class="tiny muted mt">Безопасный темп — 0,5–1% веса в неделю. Быстрее не нужно и вредно.</div></div>';
  const st = Calc.stages(P.startWeight);
  h += '<div class="card"><h3>Этапы</h3>' + st.map(s => { const ok = g.lossPct >= s.pct; const part = clamp((P.startWeight - cur) / (P.startWeight - s.weight) * 100, 0, 100); return '<div class="mb"><div class="row sb small"><span>' + (ok ? '✅ ' : '') + '−' + s.pct + '% → ' + s.weight + ' кг</span><span class="muted">' + (ok ? D.ms[s.pct] ? fmtD(D.ms[s.pct]) : '' : r0(part) + '%') + '</span></div><div class="bar ' + (ok ? 'ok' : '') + ' mt"><i style="width:' + part + '%"></i></div></div>'; }).join('') + '</div>';
  h += '<div class="card"><h3>История</h3>' + (D.weight.length ? '<div class="list">' + D.weight.slice().reverse().slice(0, 30).map(e => '<div class="item"><div class="nm"><b class="num">' + r1(e.w) + ' кг</b><span class="small muted">' + fmtDW(e.d) + '</span></div><button class="star" data-a="weight-del" data-d="' + e.d + '" aria-label="Удалить">' + ic('trash', 'sm') + '</button></div>').join('') + '</div>' : '<div class="empty">Пока нет записей</div>') + '</div>';
  return h;
}
act('weight-add', () => {
  const P = Store.prof(), D = Store.data();
  Sheets.open('<label class="f">Вес, кг</label><input id="wv" type="number" inputmode="decimal" step="0.1" value="' + r1(curWeight(P, D)) + '"><label class="f">Дата</label><input id="wd" type="date" max="' + dkey() + '" value="' + dkey() + '"><button class="btn block mt" data-a="weight-ok">Сохранить</button><div class="tiny muted mt">Взвешивайтесь утром, после туалета, до еды, в одних условиях.</div>', { title: 'Вес' });
});
act('weight-ok', () => {
  const w = nval('wv'), d = val('wd') || dkey();
  if (!(w >= 30 && w <= 400)) return toast('Проверьте вес');
  const D = Store.data(); D.weight = D.weight.filter(e => e.d !== d); D.weight.push({ d: d, w: r1(w) }); D.weight.sort((a, b) => a.d < b.d ? -1 : 1);
  Store.save(); Sheets.close(); toast('Вес записан'); afterChange();
});
act('weight-del', el => { const D = Store.data(); D.weight = D.weight.filter(e => e.d !== el.dataset.d); if (!D.weight.length) D.weight.push({ d: Store.prof().createdAt, w: Store.prof().startWeight }); Store.save(); afterChange(); });
act('goal-edit', () => {
  const P = Store.prof();
  Sheets.open('<label class="f">Целевой вес, кг</label><input id="gw" type="number" inputmode="decimal" value="' + (P.goalWeight || '') + '"><div class="tiny muted mt">Хорошая стратегия: сначала −5%, потом −10%, потом −15% от стартового веса и только потом решать про следующую цель.</div><button class="btn block mt" data-a="goal-ok">Сохранить</button>', { title: 'Цель' });
});
act('goal-ok', () => { const v = nval('gw'); if (!(v >= 35 && v < 400)) return toast('Проверьте вес'); Store.prof().goalWeight = v; Store.save(); Sheets.close(); afterChange(); });

function progBody(P, D, g) {
  const ms = D.meas.slice().sort((a, b) => a.d < b.d ? -1 : 1), last = ms[ms.length - 1];
  const wl = last && last.waist ? last.waist / P.height : null;
  let h = '<div class="card"><button class="btn block" data-a="meas-add">Записать замеры</button><div class="small muted mt">Замеряйте раз в 2 недели утром: талия — на уровне пупка, бёдра — по самой широкой части. Талия часто уменьшается раньше, чем вес.</div></div>';
  if (wl) h += '<div class="card"><div class="row sb"><span>Талия / рост</span><b class="num">' + wl.toFixed(2) + '</b></div><div class="bar ' + (wl < 0.5 ? 'ok' : wl < 0.6 ? 'gold' : 'bad') + ' mt"><i style="width:' + clamp((1 - (wl - 0.4) / 0.4) * 100, 5, 100) + '%"></i></div><div class="tiny muted mt">Цель — меньше 0,5 (талия меньше половины роста). Показатель считается по вашей последней записи.</div></div>';
  h += '<div class="card"><h3>Талия и бёдра, см</h3>' + lineChart({ series: [{ pts: ms.filter(m => m.waist).map(m => [m.d, m.waist]), color: 'var(--pri)' }, { pts: ms.filter(m => m.hips).map(m => [m.d, m.hips]), color: 'var(--gold)' }], dec: 0, label: 'График замеров' }) + '<div class="legend"><span><i style="background:var(--pri)"></i>талия</span><span><i style="background:var(--gold)"></i>бёдра</span></div></div>';
  h += '<div class="card"><h3>История</h3>' + (ms.length ? '<div class="list">' + ms.slice().reverse().map(m => '<div class="item"><div class="nm"><b>' + fmtDW(m.d) + '</b><span class="small muted">' + (m.waist ? 'талия ' + m.waist : '') + (m.hips ? ' · бёдра ' + m.hips : '') + (m.chest ? ' · грудь ' + m.chest : '') + '</span></div><button class="star" data-a="meas-del" data-d="' + m.d + '">' + ic('trash', 'sm') + '</button></div>').join('') + '</div>' : '<div class="empty">Пока нет замеров</div>') + '</div>';
  return h;
}
act('meas-add', () => {
  const D = Store.data(), l = D.meas.slice().sort((a, b) => a.d < b.d ? -1 : 1).pop() || {};
  Sheets.open('<div class="three"><div><label class="f">Талия, см</label><input id="mw" type="number" inputmode="decimal" value="' + (l.waist || '') + '"></div><div><label class="f">Бёдра, см</label><input id="mh" type="number" inputmode="decimal" value="' + (l.hips || '') + '"></div><div><label class="f">Грудь, см</label><input id="mc" type="number" inputmode="decimal" value="' + (l.chest || '') + '"></div></div><label class="f">Дата</label><input id="md" type="date" max="' + dkey() + '" value="' + dkey() + '"><button class="btn block mt" data-a="meas-ok">Сохранить</button>', { title: 'Замеры' });
});
act('meas-ok', () => {
  const w = nval('mw'), hp = nval('mh'), c = nval('mc'), d = val('md') || dkey();
  if (!(w > 0 || hp > 0 || c > 0)) return toast('Введите хотя бы один замер');
  const D = Store.data(); D.meas = D.meas.filter(m => m.d !== d); D.meas.push({ d: d, waist: w > 0 ? w : null, hips: hp > 0 ? hp : null, chest: c > 0 ? c : null });
  Store.save(); Sheets.close(); toast('Замеры сохранены'); afterChange();
});
act('meas-del', el => { const D = Store.data(); D.meas = D.meas.filter(m => m.d !== el.dataset.d); Store.save(); afterChange(); });

const LVLCLS = ['ok', 'warn', 'bad', 'bad'];
function progBp(P, D) {
  const l = D.bp.slice().sort((a, b) => a.ts - b.ts), last7 = l.filter(x => x.d >= addDays(dkey(), -7));
  const avg = last7.length ? { s: r0(sum(last7, x => x.sys) / last7.length), d: r0(sum(last7, x => x.dia) / last7.length), p: r0(sum(last7, x => x.pulse || 0) / Math.max(1, last7.filter(x => x.pulse).length)) } : null;
  let h = alertsHtml(P, D, G_).split('</div></div>').filter(x => /Нагрузки|Облегчённый/.test(x)).map(x => x + '</div></div>').join('');
  h += '<div class="card"><button class="btn block" data-a="bp-add">Записать давление</button>' + (avg ? '<div class="stat"><div><b class="num">' + avg.s + '/' + avg.d + '</b><span>среднее за 7 дней</span></div><div><b class="num">' + (avg.p || '—') + '</b><span>пульс</span></div><div><b class="num">' + last7.length + '</b><span>замеров</span></div></div>' : '') + '</div>';
  h += '<div class="card"><h3>График</h3>' + lineChart({ series: [{ pts: l.map(x => [x.d, x.sys]), color: 'var(--bad)' }, { pts: l.map(x => [x.d, x.dia]), color: 'var(--pri)' }], bands: [{ from: 0, to: 130, color: '#2C9A68' }, { from: 130, to: 140, color: '#E9A23B' }, { from: 140, to: 260, color: '#CF4258' }], yMin: 50, yMax: 200, label: 'График давления' }) + '<div class="legend"><span><i style="background:var(--bad)"></i>верхнее</span><span><i style="background:var(--pri)"></i>нижнее</span></div></div>';
  h += '<div class="card"><h3>Как читать зоны</h3><div class="small"><span class="pill ok">В норме</span> ниже 130/85<br><span class="pill warn" style="margin-top:6px">Внимание</span> 130–139 или 85–89, а также ниже 90/60<br><span class="pill bad" style="margin-top:6px">Повышено</span> 140/90 и выше<br><span class="pill bad" style="margin-top:6px">Опасно</span> 180/120 и выше</div><div class="small muted mt">Два замера подряд ≥140/90 включают облегчённый режим нагрузок. Приложение не ставит диагнозов: это ориентир для вашего решения.</div></div>';
  h += '<div class="card"><h3>История</h3>' + (l.length ? '<div class="list">' + l.slice().reverse().slice(0, 40).map(x => { const lv = Calc.bpLevel(x.sys, x.dia); return '<div class="item"><div class="nm"><b class="num">' + x.sys + '/' + x.dia + (x.pulse ? ' · ' + x.pulse + ' уд/мин' : '') + '</b><span class="small muted">' + fmtD(x.d) + ', ' + x.time + '</span></div><span class="pill ' + LVLCLS[lv] + '">' + Calc.bpLabel(lv) + '</span><button class="star" data-a="bp-del" data-id="' + x.id + '">' + ic('trash', 'sm') + '</button></div>'; }).join('') + '</div>' : '<div class="empty">Пока нет замеров</div>') + '</div>';
  return h;
}
act('bp-add', () => {
  Sheets.open('<div class="three"><div><label class="f">Верхнее</label><input id="bs" type="number" inputmode="numeric" placeholder="120"></div><div><label class="f">Нижнее</label><input id="bd" type="number" inputmode="numeric" placeholder="80"></div><div><label class="f">Пульс</label><input id="bpu" type="number" inputmode="numeric" placeholder="72"></div></div><div class="two"><div><label class="f">Дата</label><input id="bdt" type="date" max="' + dkey() + '" value="' + dkey() + '"></div><div><label class="f">Время</label><input id="btm" type="time" value="' + nowT() + '"></div></div><button class="btn block mt" data-a="bp-ok">Сохранить</button><div class="tiny muted mt">Перед замером посидите 5 минут спокойно, рука на уровне сердца.</div>', { title: 'Давление' });
});
act('bp-ok', () => {
  const s = nval('bs'), d = nval('bd'), p = nval('bpu'), dt = val('bdt') || dkey(), tm = val('btm') || nowT();
  if (!(s >= 60 && s <= 260 && d >= 30 && d <= 160 && s > d)) return toast('Проверьте значения');
  const D = Store.data(), ts = new Date(dt + 'T' + tm).getTime();
  D.bp.push({ id: uid(), d: dt, time: tm, ts: ts, sys: r0(s), dia: r0(d), pulse: p > 0 ? r0(p) : null });
  D.bp.sort((a, b) => a.ts - b.ts); Store.save(); Sheets.close();
  const lv = Calc.bpLevel(s, d);
  const msg = [
    ['✅ Отлично', 'Давление в норме. Нагрузки по плану.'],
    ['⚠ Внимание', 'Значение вне идеального диапазона. Если оно повторяется, следите за солью, сном и стрессом. Перемерьте позже в покое.'],
    ['⚠ Повышено', 'Посидите 5–10 минут и перемерьте. Если второй замер тоже ≥140/90, сегодня только лёгкая разминка сидя и спокойная ходьба.'],
    ['🚨 Опасно высокое', 'Нагрузки отменены. Сядьте, отдохните и перемерьте через 15 минут. Если есть боль в груди, одышка, сильная головная боль или слабость, вызывайте скорую (103/112).']
  ][lv];
  if (lv >= 1) Sheets.open('<div class="banner ' + ['ok', 'warn', 'bad', 'bad'][lv] + '"><div><b>' + msg[0] + '</b>' + s + '/' + d + '. ' + esc(msg[1]) + '</div></div><button class="btn block" data-a="sheet-close">Понятно</button>', { title: 'Результат' });
  else toast('Давление ' + s + '/' + d + ': в норме');
  afterChange();
});
act('bp-del', el => { const D = Store.data(); D.bp = D.bp.filter(x => x.id !== el.dataset.id); Store.save(); afterChange(); });

function progGlu(P, D) {
  const l = D.glu.slice().sort((a, b) => a.ts - b.ts);
  const f = l.filter(x => x.kind === 'fasting'), a = l.filter(x => x.kind === 'after');
  let h = '<div class="card"><button class="btn block" data-a="glu-add">Записать сахар</button><div class="small muted mt">Натощак — после 8 часов без еды. После еды — через 2 часа после начала приёма пищи.</div></div>';
  h += '<div class="card"><h3>График, ммоль/л</h3>' + lineChart({ series: [{ pts: f.map(x => [x.d, x.v]), color: 'var(--pri)' }, { pts: a.map(x => [x.d, x.v]), color: 'var(--gold)' }], bands: [{ from: 3.9, to: 5.5, color: '#2C9A68' }, { from: 7, to: 20, color: '#CF4258' }], yMin: 3, yMax: 12, dec: 1, label: 'График сахара' }) + '<div class="legend"><span><i style="background:var(--pri)"></i>натощак</span><span><i style="background:var(--gold)"></i>через 2 часа</span></div></div>';
  h += '<div class="card"><h3>Как читать зоны</h3><div class="small">Натощак: <span class="pill ok">3,9–5,5</span> <span class="pill warn">5,6–6,9</span> <span class="pill bad">от 7,0</span><br><div class="mt">Через 2 часа после еды: <span class="pill ok">до 7,7</span> <span class="pill warn">7,8–11,0</span> <span class="pill bad">от 11,1</span></div><div class="mt">Ниже 3,9: <span class="pill bad">низкий сахар</span> — съешьте 15–20 г быстрых углеводов (сок, сахар) и перемерьте через 15 минут.</div></div><div class="small muted mt">Если натощак ≥ 7,0 или ниже 3,9, приложение автоматически снижает дефицит калорий до 10%. Это ориентир, а не диагноз.</div></div>';
  h += '<div class="card"><h3>История</h3>' + (l.length ? '<div class="list">' + l.slice().reverse().slice(0, 40).map(x => { const lv = Calc.gluLevel(x.v, x.kind); return '<div class="item"><div class="nm"><b class="num">' + x.v.toString().replace('.', ',') + ' ммоль/л</b><span class="small muted">' + fmtD(x.d) + ', ' + x.time + ' · ' + (x.kind === 'fasting' ? 'натощак' : 'через 2 часа') + '</span></div><span class="pill ' + ['ok', 'warn', 'bad'][lv] + '">' + Calc.gluLabel(lv) + '</span><button class="star" data-a="glu-del" data-id="' + x.id + '">' + ic('trash', 'sm') + '</button></div>'; }).join('') + '</div>' : '<div class="empty">Пока нет замеров</div>') + '</div>';
  return h;
}
act('glu-add', () => {
  Sheets.open('<label class="f">Глюкоза, ммоль/л</label><input id="gv" type="number" inputmode="decimal" step="0.1" placeholder="5,2"><label class="f">Когда измеряли</label><select id="gk"><option value="fasting">Натощак</option><option value="after">Через 2 часа после еды</option></select><div class="two"><div><label class="f">Дата</label><input id="gdt" type="date" max="' + dkey() + '" value="' + dkey() + '"></div><div><label class="f">Время</label><input id="gtm" type="time" value="' + nowT() + '"></div></div><button class="btn block mt" data-a="glu-ok">Сохранить</button>', { title: 'Сахар' });
});
act('glu-ok', () => {
  const v = nval('gv'), kind = val('gk'), dt = val('gdt') || dkey(), tm = val('gtm') || nowT();
  if (!(v >= 1 && v <= 40)) return toast('Проверьте значение');
  const D = Store.data(); D.glu.push({ id: uid(), d: dt, time: tm, ts: new Date(dt + 'T' + tm).getTime(), kind: kind, v: r1(v) });
  D.glu.sort((a, b) => a.ts - b.ts); Store.save(); Sheets.close();
  const lv = Calc.gluLevel(v, kind);
  if (v < 3.9) Sheets.open('<div class="banner bad"><div><b>Низкий сахар</b>Съешьте 15–20 г быстрых углеводов (стакан сока, 3–4 кусочка сахара) и перемерьте через 15 минут. Если самочувствие плохое, обратитесь за помощью.</div></div><button class="btn block" data-a="sheet-close">Понятно</button>', { title: 'Результат' });
  else if (lv === 2) Sheets.open('<div class="banner bad"><div><b>Сахар выше нормы</b>' + String(v).replace('.', ',') + ' ммоль/л. Не голодайте и не режьте калории резче: приложение ограничило дефицит до 10%. Если значения повторяются, покажите журнал врачу.</div></div><button class="btn block" data-a="sheet-close">Понятно</button>', { title: 'Результат' });
  else toast(lv === 0 ? 'Сахар в норме' : 'Сахар чуть выше идеального');
  afterChange();
});
act('glu-del', el => { const D = Store.data(); D.glu = D.glu.filter(x => x.id !== el.dataset.id); Store.save(); afterChange(); });

/* Награды */
const REW = [['5', 'Этап −5% веса'], ['10', 'Этап −10% веса'], ['15', 'Этап −15% веса'], ['goal', 'Достижение цели'], ['streak7', 'Серия 7 дней'], ['streak30', 'Серия 30 дней']];
function rewUnlocked(k, D, g) { return k === 'streak7' ? g.best >= 7 : k === 'streak30' ? g.best >= 30 : !!D.ms[k]; }
function progRew(P, D, g) {
  const xpPct = clamp((g.xp - g.lvlFrom) / (g.lvlTo - g.lvlFrom) * 100, 0, 100);
  let h = '<div class="card"><div class="row sb"><div><div class="small muted">Уровень ' + g.level + '</div><div class="b" style="font-size:20px">' + esc(g.title) + '</div></div><div class="b num" style="font-size:24px">' + g.xp + '<span class="small muted"> очков</span></div></div><div class="bar gold mt"><i style="width:' + xpPct + '%"></i></div><div class="tiny muted mt">До следующего уровня: ' + (g.lvlTo - g.xp) + ' очков. Очки дают за привычки (запись еды, вода, движение, замеры), а не за скорость похудения. За недоедание очки не начисляются.</div></div>';
  h += '<div class="card"><h3>🎁 Мои награды за этапы</h3><div class="small muted mb">Придумайте приз себе: кино, поход, новая вещь. Приз откроется, когда вы дойдёте до этапа.</div>' + REW.map(r => {
    const txt = D.rewards[r[0]], open = rewUnlocked(r[0], D, g);
    return '<div class="rew ' + (open && txt ? 'open' : '') + '"><div class="row sb"><b>' + r[1] + '</b>' + (open ? '<span class="pill gold">достигнуто</span>' : '<span class="pill">впереди</span>') + '</div><div class="mt ' + (txt && !open ? 'blur' : '') + '">' + (txt ? esc(txt) : '<span class="muted">Приз не задан</span>') + '</div><button class="btn ghost sm mt" data-a="rew-edit" data-k="' + r[0] + '">' + (txt ? 'Изменить' : 'Задать приз') + '</button></div>';
  }).join('') + '</div>';
  h += '<div class="card"><h3>Достижения (' + g.unlocked.length + ' из ' + Game.ACH.length + ')</h3><div class="ach">' + Game.ACH.map(a => { const on = !!D.ach[a.id]; return '<div class="a ' + (on ? 'on' : 'lock') + '" data-a="ach-info" data-id="' + a.id + '"><span class="e">' + a.i + '</span><b>' + esc(a.n) + '</b></div>'; }).join('') + '</div></div>';
  return h;
}
act('rew-edit', el => {
  const D = Store.data(), k = el.dataset.k, r = REW.find(x => x[0] === k);
  Sheets.open('<label class="f">Ваш приз за: ' + r[1].toLowerCase() + '</label><textarea id="rt" rows="3" placeholder="Например: поход в кино с любимым попкорном (одна порция)">' + esc(D.rewards[k] || '') + '</textarea><button class="btn block mt" data-a="rew-ok" data-k="' + k + '">Сохранить</button>', { title: 'Приз' });
});
act('rew-ok', el => { const D = Store.data(); D.rewards[el.dataset.k] = val('rt').trim(); Store.save(); Sheets.close(); rerender(); });
act('ach-info', el => { const a = Game.ACH.find(x => x.id === el.dataset.id), D = Store.data(); toast(a.n + ': ' + a.d + (D.ach[a.id] ? ' ✓ ' + fmtD(D.ach[a.id]) : '')); });

/* Пара */
function progPair(P, D, g) {
  const db = Store.db;
  const rows = db.profiles.map(p => { const d = Store.data(p.id), s = Game.snapshot(p, d); s.local = true; s.id = p.id; return s; });
  const partners = (db.partners || []).map(x => Object.assign({ local: false }, x));
  const all = rows.concat(partners).sort((a, b) => b.pct - a.pct);
  let h = '<div class="card"><h3>👫 Режим пары</h3><div class="small muted">Сравнение идёт по <b>процентам</b> потери веса, а не по килограммам: веса разные, а результат честный. Цель — поддерживать друг друга.</div></div>';
  h += '<div class="card"><h3>Таблица</h3><table class="t"><tr><th></th><th>Потеряно</th><th>Серия</th><th>Очки</th></tr>' + all.map((s, i) => '<tr><td>' + (i === 0 && all.length > 1 && s.pct > 0 ? '🏅 ' : '') + '<b>' + esc(s.name) + '</b>' + (!s.local ? '<div class="tiny muted">от ' + fmtD(s.d) + '</div>' : '') + '</td><td class="num">' + s.pct + '%</td><td class="num">' + s.streak + '</td><td class="num">' + s.xp + '</td></tr>').join('') + '</table></div>';
  if (all.length >= 2) {
    const a = all[0], b = all[1], today = dkey();
    const js = Game.jointStreak(a.local ? Game.compute(db.profiles.find(p => p.id === a.id), Store.data(a.id)).doneDates : a.done, b.local ? Game.compute(db.profiles.find(p => p.id === b.id), Store.data(b.id)).doneDates : b.done, today);
    h += '<div class="card"><h3>🤝 Общий челлендж</h3><div class="row sb small"><span>Вместе 30 дней подряд: ' + esc(a.name) + ' и ' + esc(b.name) + '</span><b class="num">' + js + '/30</b></div><div class="bar ' + (js >= 30 ? 'ok' : 'gold') + ' mt"><i style="width:' + clamp(js / 30 * 100, 0, 100) + '%"></i></div><div class="tiny muted mt">Дни, когда оба выполнили привычки. Данные партнёра обновляются при обмене кодами.</div></div>';
  }
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(Game.snapshot(P, D)))));
  h += '<div class="card"><h3>Если у партнёра свой телефон</h3><div class="small muted mb">Данные хранятся только на телефоне, поэтому обмен идёт кодом. Отправьте свой код партнёру в любом мессенджере и вставьте его код ниже.</div><label class="f">Мой код</label><textarea id="mycode" rows="3" readonly>' + code + '</textarea><button class="btn alt sm mt" data-a="code-copy">Скопировать мой код</button><label class="f mt2">Код партнёра</label><textarea id="pcode" rows="3" placeholder="Вставьте код"></textarea><button class="btn sm mt" data-a="code-add">Добавить партнёра</button></div>';
  if (partners.length) h += '<div class="card"><h3>Партнёры</h3>' + partners.map(p => '<div class="row sb"><span>' + esc(p.name) + '</span><button class="btn ghost sm" data-a="code-del" data-n="' + esc(p.name) + '">Убрать</button></div>').join('') + '</div>';
  return h;
}
act('code-copy', () => { const t = $('#mycode'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } toast('Код скопирован'); });
act('code-add', () => {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(val('pcode').trim()))));
    if (!o || o.v !== 1 || !o.name) throw 0;
    const db = Store.db; db.partners = (db.partners || []).filter(x => x.name !== o.name); db.partners.push(o); Store.save(); toast('Партнёр добавлен: ' + o.name); rerender();
  } catch (e) { toast('Не удалось прочитать код'); }
});
act('code-del', el => { const db = Store.db; db.partners = db.partners.filter(x => x.name !== el.dataset.n); Store.save(); rerender(); });

/* ---------- Профиль, настройки, данные ---------- */
const ACTLBL = Calc.ACT;
function profileForm(P, isNew) {
  P = P || { name: '', sex: 'm', age: '', height: '', weight: '', activity: 1.2, deficitPct: 20, goalWeight: '' };
  return '<label class="f">Имя</label><input id="pn" type="text" value="' + esc(P.name) + '" placeholder="Как вас зовут">' +
    '<div class="two"><div><label class="f">Пол</label><select id="px"><option value="m"' + (P.sex === 'm' ? ' selected' : '') + '>Мужской</option><option value="f"' + (P.sex === 'f' ? ' selected' : '') + '>Женский</option></select></div><div><label class="f">Возраст, лет</label><input id="pa" type="number" inputmode="numeric" value="' + P.age + '"></div>' +
    '<div><label class="f">Рост, см</label><input id="ph" type="number" inputmode="numeric" value="' + P.height + '"></div>' + (isNew ? '<div><label class="f">Вес сейчас, кг</label><input id="pw" type="number" inputmode="decimal" value="' + P.weight + '"></div>' : '<div><label class="f">Целевой вес, кг</label><input id="pg" type="number" inputmode="decimal" value="' + (P.goalWeight || '') + '"></div>') + '</div>' +
    '<label class="f">Образ жизни</label><select id="pac">' + ACTLBL.map(a => '<option value="' + a.k + '"' + (P.activity === a.k ? ' selected' : '') + '>' + a.n + '</option>').join('') + '</select>' +
    '<label class="f">Дефицит калорий: <b id="pdv">' + P.deficitPct + '%</b> от нормы (рекомендуем 15–20%)</label><input id="pd" type="range" min="10" max="25" step="1" value="' + P.deficitPct + '" style="width:100%" oninput="document.getElementById(\'pdv\').textContent=this.value+\'%\'">' +
    (isNew ? '<label class="f">Целевой вес, кг (необязательно)</label><input id="pg" type="number" inputmode="decimal" placeholder="по умолчанию −15% от текущего">' : '');
}
function readProfile(isNew) {
  const p = { name: val('pn').trim(), sex: val('px'), age: nval('pa'), height: nval('ph'), activity: +val('pac'), deficitPct: +val('pd') };
  if (!p.name) return toast('Введите имя'), null;
  if (!(p.age >= 14 && p.age <= 95)) return toast('Возраст от 14 до 95 лет'), null;
  if (!(p.height >= 120 && p.height <= 230)) return toast('Рост от 120 до 230 см'), null;
  if (isNew) { p.weight = nval('pw'); if (!(p.weight >= 40 && p.weight <= 400)) return toast('Проверьте вес'), null; }
  const gw = nval('pg'); if (gw > 0) p.goalWeight = gw;
  return p;
}
function openOnboarding(first) {
  Sheets.open((first ? '<div class="banner info"><div><b>Добро пожаловать в «Легче»</b>Заполните данные: приложение рассчитает норму калорий, воды и белка. Все данные хранятся только на вашем телефоне.</div></div>' : '') + profileForm(null, true) +
    '<div class="tiny muted mt">Дефицит не опустит калории ниже безопасного минимума (1500 ккал для мужчин, 1200 для женщин). Расчёт — ориентир: следите за самочувствием.</div><button class="btn block mt" data-a="onb-ok" data-first="' + (first ? 1 : 0) + '">Рассчитать и начать</button>', { title: first ? 'Знакомство' : 'Новый профиль', full: !!first, sticky: true });
}
act('onb-ok', el => {
  const p = readProfile(true); if (!p) return;
  if (!p.goalWeight) p.goalWeight = Math.round(p.weight * 0.85);
  Store.addProfile(p); Sheets.closeAll(); S.tab = 'today'; rerender();
  const pl = calcPlanFor(Store.prof(), Store.data());
  Sheets.open('<div class="center"><div style="font-size:44px">🎯</div><h2 class="mt">Ваша норма</h2></div><div class="stat"><div><b class="num">' + fmtN(pl.target) + '</b><span>ккал в день</span></div><div><b class="num">' + pl.protein + '</b><span>г белка</span></div><div><b class="num">' + fmtN(pl.water) + '</b><span>мл воды</span></div></div><p class="small muted">Расход в покое ' + fmtN(pl.bmr) + ' ккал, с учётом активности ' + fmtN(pl.tdee) + ' ккал. Дефицит ' + pl.deficit + ' ккал в день даёт примерно ' + String(pl.lossKgWeek).replace('.', ',') + ' кг в неделю. Это безопасный темп.</p><button class="btn block" data-a="notif-offer">Настроить напоминания</button><button class="btn ghost block mt" data-a="sheet-close">Позже</button>', { title: 'Готово' });
});
act('notif-offer', () => { Sheets.closeAll(); openSettings('notif'); });
act('profiles', () => {
  const db = Store.db;
  Sheets.open('<div class="list">' + db.profiles.map(p => '<div class="item" data-a="profile-switch" data-id="' + p.id + '"><div class="nm"><b>' + esc(p.name) + (p.id === db.activeId ? ' ✓' : '') + '</b><span class="small muted">' + (p.sex === 'm' ? 'муж' : 'жен') + ', ' + p.age + ' лет, ' + p.height + ' см</span></div>' + ic('chevr', 'sm') + '</div>').join('') + '</div><button class="btn alt block mt" data-a="profile-new">' + ic('plus', 'sm') + ' Добавить профиль (пара)</button>', { title: 'Профили' });
});
act('profile-switch', el => { Store.db.activeId = el.dataset.id; Store.save(); Sheets.closeAll(); S.date = dkey(); rerender(); });
act('profile-new', () => { Sheets.closeAll(); openOnboarding(false); });
act('profile-del', el => {
  const p = Store.db.profiles.find(x => x.id === el.dataset.id);
  if (!confirm('Удалить профиль «' + p.name + '» со всеми данными? Это нельзя отменить.')) return;
  Store.removeProfile(el.dataset.id); Sheets.closeAll(); if (!Store.prof()) { rerender(); } else rerender();
});

function dowChecks(sel) { return '<div class="dowrow">' + [1, 2, 3, 4, 5, 6, 0].map(d => '<label><input type="checkbox" class="nd" value="' + d + '"' + (sel.indexOf(d) >= 0 ? ' checked' : '') + '><span>' + WD[d] + '</span></label>').join('') + '</div>'; }
function sw(id, on) { return '<label class="sw"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><i></i></label>'; }
function dowSel(id, v) { return '<select id="' + id + '">' + [1, 2, 3, 4, 5, 6, 0].map(d => '<option value="' + d + '"' + (v === d ? ' selected' : '') + '>' + WDL[d] + '</option>').join('') + '</select>'; }
function openSettings(focus) {
  const P = Store.prof(), D = Store.data(), n = Store.db.notif, pl = calcPlanFor(P, D);
  const native = Notify.isNative();
  const html = '<div class="card"><h3>👤 Профиль</h3>' + profileForm(P, false) + '<button class="btn block mt" data-a="profile-save">Сохранить профиль</button>' +
    '<div class="card flat mt"><table class="t"><tr><td>Расход в покое</td><td class="num" style="text-align:right">' + fmtN(pl.bmr) + ' ккал</td></tr><tr><td>С учётом образа жизни</td><td class="num" style="text-align:right">' + fmtN(pl.tdee) + ' ккал</td></tr><tr><td>Норма в день</td><td class="num" style="text-align:right"><b>' + fmtN(pl.target) + ' ккал</b></td></tr><tr><td>Дефицит</td><td class="num" style="text-align:right">' + pl.deficit + ' ккал (' + r0(pl.deficit / pl.tdee * 100) + '%)</td></tr><tr><td>Белки / жиры / углеводы</td><td class="num" style="text-align:right">' + pl.protein + ' / ' + pl.fat + ' / ' + pl.carbs + ' г</td></tr><tr><td>Вода</td><td class="num" style="text-align:right">' + fmtN(pl.water) + ' мл</td></tr><tr><td>Индекс массы тела</td><td class="num" style="text-align:right">' + Calc.bmi(curWeight(P, D), P.height).toFixed(1) + '</td></tr></table><div class="tiny muted mt">Норма пересчитывается автоматически, когда тренд веса меняется на 3 кг. Формула Миффлина — Сан Жеора.</div></div></div>' +
    '<div class="card" id="notifcard"><h3>' + ic('bell') + ' Напоминания</h3>' + (native ? '' : '<div class="banner warn"><div>В браузере напоминания не работают. Они включаются в установленном приложении (APK).</div></div>') +
    '<div class="row sb"><span>Включить напоминания</span>' + sw('nOn', n.on) + '</div>' +
    '<label class="f">Рабочие дни</label>' + dowChecks(n.days) +
    '<div class="two"><div><label class="f">Начало дня</label><input id="nWs" type="time" value="' + n.workStart + '"></div><div><label class="f">Конец дня</label><input id="nWe" type="time" value="' + n.workEnd + '"></div><div><label class="f">Обед с</label><input id="nLf" type="time" value="' + n.lunchFrom + '"></div><div><label class="f">Обед до</label><input id="nLt" type="time" value="' + n.lunchTo + '"></div></div>' +
    '<div class="two"><div><label class="f">Размяться каждые</label><select id="nMv">' + [45, 60, 90, 120].map(v => '<option value="' + v + '"' + (n.moveEvery === v ? ' selected' : '') + '>' + v + ' мин</option>').join('') + '</select></div><div><label class="f">Пить воду каждые</label><select id="nWt">' + [60, 90, 120].map(v => '<option value="' + v + '"' + (n.waterEvery === v ? ' selected' : '') + '>' + v + ' мин</option>').join('') + '</select></div></div>' +
    '<div class="row sb mt2"><span>Взвешивание раз в неделю</span>' + sw('nWon', n.weigh.on) + '</div><div class="two"><div>' + dowSel('nWd', n.weigh.dow) + '</div><div><input id="nWtm" type="time" value="' + n.weigh.time + '"></div></div>' +
    '<div class="row sb mt2"><span>Измерить давление (2 раза в день)</span>' + sw('nBon', n.bp.on) + '</div><div class="two"><div><input id="nB1" type="time" value="' + n.bp.times[0] + '"></div><div><input id="nB2" type="time" value="' + n.bp.times[1] + '"></div></div>' +
    '<div class="row sb mt2"><span>Измерить сахар натощак</span>' + sw('nGon', n.glu.on) + '</div><div><input id="nGt" type="time" value="' + n.glu.time + '"></div>' +
    '<div class="row sb mt2"><span>Запись дневника вечером</span>' + sw('nDon', n.diary.on) + '</div><div><input id="nDt" type="time" value="' + n.diary.time + '"></div>' +
    '<div class="row sb mt2"><span>Напомнить о резервной копии</span>' + sw('nKon', n.backup.on) + '</div><div class="two"><div>' + dowSel('nKd', n.backup.dow) + '</div><div><input id="nKt" type="time" value="' + n.backup.time + '"></div></div>' +
    '<button class="btn block mt2" data-a="notif-save">Сохранить и применить</button><div class="row mt"><button class="btn ghost grow" data-a="notif-test">Тест уведомления</button>' + (native ? '<button class="btn ghost grow" data-a="notif-exact">Точные будильники</button>' : '') + '</div>' +
    '<div class="small muted mt">Если уведомления приходят с задержкой или не приходят: в настройках телефона откройте «Приложения → Легче → Батарея» и выберите «Без ограничений», затем разрешите «Автозапуск» (на Xiaomi, Huawei, Samsung, Realme это отдельный пункт).</div></div>' +
    '<div class="card"><h3>🍽 Питание</h3>' + settingsPlanPrefs() + '</div>' +
    '<div class="card"><h3>👥 Профили</h3>' + Store.db.profiles.map(p => '<div class="row sb mb"><span>' + esc(p.name) + (p.id === Store.db.activeId ? ' (активный)' : '') + '</span><button class="btn danger sm" data-a="profile-del" data-id="' + p.id + '">Удалить</button></div>').join('') + '<button class="btn alt block" data-a="profile-new">Добавить профиль</button></div>' +
    '<div class="card"><h3>💾 Данные</h3><div class="small muted mb">Данные хранятся только на этом телефоне. Делайте копию раз в неделю и перед обновлением приложения.</div><button class="btn block" data-a="data-export">Сохранить копию (файл)</button><div class="two mt"><button class="btn ghost" data-a="data-copy">Копировать текстом</button><label class="btn ghost" style="cursor:pointer">Загрузить из файла<input id="impf" type="file" accept=".json,application/json" style="display:none"></label></div><button class="btn danger block mt" data-a="data-reset">Удалить все данные</button></div>' +
    '<div class="card flat small muted"><b>Важно.</b> «Легче» — помощник по учёту и мотивации, а не медицинское изделие. Расчёты ориентировочные. Тонометр и глюкометр дают данные для подсказок, но не заменяют консультацию врача. При боли в груди, сильной одышке, обмороке, давлении от 180/120 или сахаре ниже 3,9 с плохим самочувствием обращайтесь за помощью (103/112).<br><br>Версия 1.0 · Все данные локальные · Интернет не нужен.</div>';
  const body = Sheets.open(html, { title: 'Настройки', full: true });
  $('#impf', body).addEventListener('change', ev => {
    const f = ev.target.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { if (!confirm('Заменить текущие данные данными из файла?')) return; try { Store.importJson(String(r.result)); Sheets.closeAll(); toast('Данные загружены'); rerender(); applyNotif(true); } catch (e) { toast('Не удалось прочитать файл'); } };
    r.readAsText(f);
  });
  if (focus === 'notif') setTimeout(() => { const c = $('#notifcard'); if (c) c.scrollIntoView(); }, 50);
}
act('settings', () => openSettings());
act('profile-save', () => {
  const p = readProfile(false); if (!p) return; const P = Store.prof();
  Object.assign(P, { name: p.name, sex: p.sex, age: p.age, height: p.height, activity: p.activity, deficitPct: p.deficitPct }); if (p.goalWeight) P.goalWeight = p.goalWeight;
  Store.save(); toast('Профиль сохранён'); Sheets.closeAll(); rerender(); openSettings();
});
function readNotif() {
  const n = Store.db.notif;
  n.on = $('#nOn').checked; n.days = $$('.nd').filter(x => x.checked).map(x => +x.value);
  n.workStart = val('nWs'); n.workEnd = val('nWe'); n.lunchFrom = val('nLf'); n.lunchTo = val('nLt');
  n.moveEvery = +val('nMv'); n.waterEvery = +val('nWt');
  n.weigh = { on: $('#nWon').checked, dow: +val('nWd'), time: val('nWtm') };
  n.bp = { on: $('#nBon').checked, times: [val('nB1'), val('nB2')] };
  n.glu = { on: $('#nGon').checked, time: val('nGt') };
  n.diary = { on: $('#nDon').checked, time: val('nDt') };
  n.backup = { on: $('#nKon').checked, dow: +val('nKd'), time: val('nKt') };
  return n;
}
async function applyNotif(silent) {
  const r = await Notify.apply(Store.db.notif);
  if (silent) return r;
  if (r.ok) toast(Store.db.notif.on ? 'Напоминания включены: ' + r.count + ' уведомлений в расписании' : 'Напоминания выключены');
  else if (r.reason === 'web') toast('Напоминания работают в установленном приложении (APK)');
  else if (r.reason === 'perm') toast('Разрешите уведомления для «Легче» в настройках телефона', 4000);
  else toast('Не удалось настроить напоминания: ' + (r.msg || ''), 4000);
  return r;
}
act('notif-save', () => { readNotif(); if (!Store.db.notif.days.length && Store.db.notif.on) return toast('Выберите хотя бы один день'); Store.save(); applyNotif(false); });
act('notif-test', async () => { const r = await Notify.test(); toast(r.ok ? (Notify.isNative() ? 'Тест придёт через 4 секунды' : 'Тест отправлен') : r.reason === 'perm' ? 'Разрешите уведомления в настройках телефона' : r.reason === 'web' ? 'Тест работает в установленном приложении' : 'Ошибка: ' + (r.msg || '')); });
act('notif-exact', async () => {
  const s = await Notify.exactStatus();
  if (s === 'granted') toast('Точные будильники разрешены'); else { toast('Включите «Будильники и напоминания» для приложения'); Notify.openExact(); }
});
act('data-export', async () => {
  const txt = Store.exportJson(), name = 'legche-' + dkey() + '.json', C = window.Capacitor && window.Capacitor.Plugins;
  try {
    if (Notify.isNative() && C && C.Filesystem && C.Share) {
      await C.Filesystem.writeFile({ path: name, data: txt, directory: 'CACHE', encoding: 'utf8' });
      const u = await C.Filesystem.getUri({ path: name, directory: 'CACHE' });
      await C.Share.share({ title: 'Резервная копия «Легче»', url: u.uri, dialogTitle: 'Сохранить копию' });
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    }
  } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast('Не удалось сохранить файл. Используйте «Копировать текстом»'); }
});
act('data-copy', () => { const t = Store.exportJson(); try { navigator.clipboard.writeText(t).then(() => toast('Скопировано. Вставьте в заметки или мессенджер'), () => toast('Не удалось скопировать')); } catch (e) { toast('Не удалось скопировать'); } });
act('data-reset', () => { if (confirm('Удалить ВСЕ данные приложения? Сделайте копию заранее.') && confirm('Точно удалить? Отменить нельзя.')) { Store.reset(); Sheets.closeAll(); applyNotif(true); rerender(); } });
