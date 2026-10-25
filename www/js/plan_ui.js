/* Раздел «План»: корзина → меню недели → день → блюдо (рецепт, режим «Готовить»). */
const MEALSLOT = { b: 'b', s1: 's', l: 'l', s2: 's', d: 'd' };
const HAVE = n => { const h = Store.db.have; return h[n] !== undefined ? !!h[n] : !!MealPlan.isPantry(n); };

function weekPlanFor(P, D, wk) {
  const db = Store.db, pr = db.prefs, dayTargets = [];
  for (let i = 0; i < 7; i++) dayTargets.push(targetFor(P, D, addDays(wk, i)));
  const plan = MealPlan.genWeek(calcPlanFor(P, D).target, wk, { seed: db.seeds[wk] || 0, maxCost: pr.budget, kit: pr.kit, multiFirst: pr.multiFirst, ban: pr.banned, exclude: pr.exclude, dayTargets: dayTargets });
  const ov = db.overrides[wk] || {};
  Object.keys(ov).forEach(key => { const a = key.split('|'); if (MealPlan.DISH[ov[key]]) MealPlan.replaceMeal(plan, a[0], +a[1], ov[key], pr.kit, pr.multiFirst); });
  return plan;
}
function methodLabel(m) {
  if (!m) return 'Без готовки';
  const T = MealPlan.TECH[m.type] || m.type;
  if (m.type === 'oven' || m.type === 'multicooker') return T + ' · ' + m.timeMin + ' мин · ' + m.tempC + ' °C';
  if (m.type === 'none') return T;
  if (m.type === 'blender') return T + (m.tool === 'chopper' ? ' (чаша-измельчитель)' : m.tool === 'immersion' ? ' (погружной)' : '');
  return T + (m.timeMin ? ' · ' + m.timeMin + ' мин' : '');
}
const ingName = n => n.replace(/ \((сухая|сухой|сухие|сырая|сырой|сырое)\)$/, '');
function ingLine(n, g) {
  const f = findFood(n); let extra = '';
  if (f && f.ul === 'шт' && f.ug) { const c = g / f.ug; extra = ' (≈ ' + (Math.round(c * 2) / 2) + ' шт)'; }
  return '<li><span>' + esc(ingName(n)) + '</span><span>' + g + ' г' + extra + '</span></li>';
}
function techChips(rc) {
  const kit = Store.db.prefs.kit, seen = {};
  return MealPlan.methodsFor(rc, kit).filter(m => seen[m.type] ? false : (seen[m.type] = 1)).map(m => '<span class="tech">' + esc(MealPlan.TECH[m.type]) + '</span>').join('');
}

/* ---------- Экран «План» ---------- */
VIEWS.plan = function (P, D, g) {
  const sub = S.sub.plan, wk = weekStart(S.planDate), db = Store.db;
  let h = '<div class="seg">' + [['shop', 'Корзина'], ['week', 'Меню'], ['day', 'День'], ['rec', 'Рецепты'], ['tips', 'Советы']].map(t => '<button class="' + (sub === t[0] ? 'on' : '') + '" data-a="plan-sub" data-s="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
  if (sub === 'shop' || sub === 'week' || sub === 'day') {
    h += '<div class="datebar"><button class="iconbtn" data-a="plan-week" data-d="-7" aria-label="Предыдущая неделя">' + ic('chevl') + '</button><div class="center"><b>' + fmtD(wk) + ' – ' + fmtD(addDays(wk, 6)) + '</b>' + (wk === weekStart(dkey()) ? '<div class="small muted">эта неделя</div>' : '') + '</div><button class="iconbtn" data-a="plan-week" data-d="7" aria-label="Следующая неделя">' + ic('chevr') + '</button></div>';
  }
  if (sub === 'day') h += planDay(P, D, wk);
  else if (sub === 'week') h += planWeek(P, D, wk);
  else if (sub === 'shop') h += planShop(P, D, wk);
  else if (sub === 'rec') h += recipeBrowser();
  else {
    h += '<div class="card"><h3>🛒 Бюджетная корзина для похудения</h3><div class="small muted">Цены приблизительные, ₽ за кг (если не указано иное). В вашем регионе могут отличаться: поправьте в разделе «Корзина».</div></div>';
    BASKET.forEach(b => { h += '<div class="card"><h3>' + esc(b.grp) + '</h3><div class="small mb">' + esc(b.tip) + '</div><table class="t">' + b.items.map(i => '<tr><td>' + esc(i[0]) + '</td><td style="text-align:right" class="num">~' + i[1] + ' ₽</td></tr>').join('') + '</table></div>'; });
    h += '<div class="card"><h3>Как не переплачивать</h3><ul style="padding-left:18px;margin:0">' + BASKET_RULES.map(r => '<li class="mb">' + esc(r) + '</li>').join('') + '</ul></div>';
  }
  return h;
};

function settingsPlanPrefs() {
  const db = Store.db, pr = db.prefs;
  return '<div class="card"><div class="two"><div><label class="f">День с запасом (+15%)</label><select data-c="reserve"><option value="-1">Нет</option>' + ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, i) => '<option value="' + i + '"' + (pr.reserveDow === i ? ' selected' : '') + '>' + d + '</option>').join('') + '</select></div>' +
    '<div><label class="f">Бюджет блюд</label><select data-c="budget"><option value="1"' + (pr.budget === 1 ? ' selected' : '') + '>Самые дешёвые</option><option value="2"' + (pr.budget === 2 ? ' selected' : '') + '>Недорогие</option><option value="3"' + (pr.budget === 3 ? ' selected' : '') + '>Любые</option></select></div></div>' +
    '<label class="row mt" style="gap:12px"><span class="sw"><input type="checkbox" id="mf" data-c="multiFirst"' + (pr.multiFirst ? ' checked' : '') + '><i></i></span><span class="grow">Готовка в мультиварке<div class="tiny muted">Чаще выбирать блюда для мультиварки (не более половины блюд недели)</div></span></label>' +
    '<button class="btn ghost sm mt" data-a="kitchen-open">Моя кухня и исключения</button><div class="tiny muted mt">День с запасом помогает не срываться в выходные: в остальные дни норма чуть ниже, а среднее за неделю остаётся тем же.</div></div>';
}

/* Корзина для подготовки */
function planShop(P, D, wk) {
  const db = Store.db, who = S.shopWho, scope = S.shopScope;
  const plan = weekPlanFor(P, D, wk);
  const dates = plan.days.map(d => d.date).filter(d => scope === 'week' || d >= dkey());
  const plans = who === 'all' ? db.profiles.map(p => p.id === P.id ? plan : weekPlanFor(p, Store.data(p.id), wk)) : [plan];
  const names = MealPlan.shopping(plans, dates, db.prices, {}).items.map(x => x.n);
  const have = {}; names.forEach(n => { have[n] = HAVE(n); });
  const sh = MealPlan.shopping(plans, dates, db.prices, have);
  const ck = (db.checks[wk + scope + who] = db.checks[wk + scope + who] || {});
  const buy = sh.items.filter(x => !x.have && !x.pantry), pantry = sh.items.filter(x => x.pantry && !x.have), home = sh.items.filter(x => x.have);
  const budget = db.prefs.weekBudget || 0;
  let h = '<div class="card"><div class="two"><div><label class="f">Период</label><select data-c="shopScope"><option value="week"' + (scope === 'week' ? ' selected' : '') + '>Вся неделя</option><option value="rest"' + (scope === 'rest' ? ' selected' : '') + '>С сегодняшнего дня</option></select></div><div><label class="f">Для кого</label><select data-c="shopWho"><option value="me"' + (who === 'me' ? ' selected' : '') + '>Только я</option><option value="all"' + (who === 'all' ? ' selected' : '') + '>Все профили (' + db.profiles.length + ')</option></select></div></div>' +
    '<div class="row sb mt"><span class="muted">К оплате (примерно)</span><b class="num" style="font-size:24px">' + fmtN(sh.total) + ' ₽</b></div>' +
    (pantry.length ? '<div class="row sb small muted"><span>Запасы, если нет дома</span><span class="num">' + fmtN(sh.pantryTotal) + ' ₽</span></div>' : '') +
    '<label class="f">Бюджет на неделю, ₽ (необязательно)</label><input type="number" inputmode="numeric" data-c="weekBudget" value="' + (budget || '') + '" placeholder="например, 6000">' +
    '<div class="tiny muted mt">Отметьте «есть дома» у того, что уже в запасе: список и сумма пересчитаются. Нажмите на цену, чтобы поставить свою (₽ за кг).</div></div>';
  if (budget > 0 && sh.total > budget) {
    const sv = MealPlan.savings(buy, db.prices);
    h += '<div class="banner warn"><div><b>Список дороже бюджета на ' + fmtN(sh.total - budget) + ' ₽</b>' + (sv.length ? sv.map(s => esc(ingName(s.from)) + ' → ' + esc(ingName(s.to)) + ' (−' + s.save + ' ₽)').join('<br>') : 'Попробуйте выбрать «Самые дешёвые» блюда в меню.') + '</div></div>';
  } else if (budget > 0) h += '<div class="banner ok"><div><b>В бюджете</b>Остаётся ' + fmtN(budget - sh.total) + ' ₽.</div></div>';
  else { const sv = MealPlan.savings(buy, db.prices); if (sv.length) h += '<div class="card flat"><div class="small b">Как удешевить</div>' + sv.slice(0, 3).map(s => '<div class="small muted">' + esc(ingName(s.from)) + ' → ' + esc(ingName(s.to)) + ' (−' + s.save + ' ₽)</div>').join('') + '</div>'; }
  const row = it => {
    const on = ck[it.n], amount = it.buyG >= 1000 ? (it.buyG / 1000).toFixed(it.buyG % 1000 ? 2 : 0).replace(/\.?0+$/, '') + ' кг' : it.buyG + ' г';
    return '<div class="chk ' + (on ? 'done' : '') + '"><div class="tick ' + (on ? 'on' : '') + '" data-a="shop-check" data-n="' + esc(it.n) + '" role="checkbox" aria-checked="' + !!on + '">' + ic('check') + '</div><div class="nm grow" data-a="shop-check" data-n="' + esc(it.n) + '"><div>' + esc(ingName(it.n)) + '</div><div class="small muted">' + amount + (it.pieces ? ' (≈ ' + it.pieces + ' шт)' : '') + '</div></div><button class="chip" data-a="have-toggle" data-n="' + esc(it.n) + '" aria-label="Есть дома">есть дома</button><button class="chip" data-a="price-edit" data-n="' + esc(it.n) + '">' + it.cost + ' ₽</button></div>';
  };
  if (!sh.items.length) h += '<div class="empty">Нет блюд на выбранный период</div>';
  let aisle = '';
  buy.forEach(it => { if (it.aisle !== aisle) { aisle = it.aisle; h += '<div class="b mt2 mb small muted">' + esc(aisle) + '</div>'; } h += row(it); });
  if (pantry.length) { h += '<div class="b mt2 mb small muted">Запасы: масло, специи, мука (проверьте, что есть)</div>'; pantry.forEach(it => { h += row(it); }); }
  if (home.length) { h += '<div class="b mt2 mb small muted">Уже есть дома</div>' + home.map(it => '<div class="chk done"><div class="nm grow"><div>' + esc(ingName(it.n)) + '</div><div class="small muted">' + (it.buyG >= 1000 ? (it.buyG / 1000) + ' кг' : it.buyG + ' г') + '</div></div><button class="chip" data-a="have-toggle" data-n="' + esc(it.n) + '">вернуть в список</button></div>').join(''); }
  const tasks = MealPlan.prepPlan(plan, dates, db.prefs.kit, db.prefs.multiFirst);
  if (tasks.length) {
    const grp = {}; tasks.forEach(t => { (grp[t.tech] = grp[t.tech] || []).push(t); });
    h += '<div class="card mt2"><h3>👩‍🍳 План готовки на выходной</h3><div class="small muted mb">Что приготовить впрок. Начните с самого долгого: пока оно готовится, занимайтесь остальным.</div>' +
      Object.keys(grp).sort((a, b) => Math.max.apply(null, grp[b].map(x => x.timeMin)) - Math.max.apply(null, grp[a].map(x => x.timeMin))).map(tech => '<div class="mb"><div class="b small">' + esc(MealPlan.TECH[tech]) + '</div>' + grp[tech].map(t => '<div class="small" data-a="recipe-open" data-id="' + t.id + '" style="padding:4px 0;cursor:pointer">▸ ' + esc(t.name) + ' <span class="muted">· ' + t.timeMin + ' мин' + (t.tempC ? ', ' + t.tempC + ' °C' : '') + ', порций на неделю: ' + t.times + '</span></div>').join('') + '</div>').join('') + '</div>';
  }
  return h;
}

/* Меню недели */
function planWeek(P, D, wk) {
  const plan = weekPlanFor(P, D, wk), db = Store.db;
  let h = settingsPlanPrefs();
  const mt = plan.meta || {};
  h += '<div class="card flat small muted">Способы за неделю: ' + (mt.methods || []).map(m => MealPlan.TECH[m]).join(', ') + ' · рыба: ' + (mt.fishDays || 0) + ' дн. · бобовые: ' + (mt.legumeDays || 0) + ' дн. · мультиварка: ' + Math.round((mt.multiShare || 0) * 100) + '% основных блюд</div>';
  h += plan.days.map(d => {
    const di = dayInfo(P, D, d.date), per = Periods.at(D, d.date);
    return '<div class="card"><div class="row sb"><b>' + WDL[parseD(d.date).getDay()] + ', ' + fmtD(d.date) + '</b><span class="num b">' + (di.hide ? 'застолье' : d.tot.k + ' ккал') + '</span></div>' + (per ? '<div class="pill gold mt">' + Periods.TYPES[per.type].icon + ' ' + Periods.TYPES[per.type].n + '</div>' : '') +
      (di.hide ? '' : d.meals.map((m, i) => '<div class="small mt" data-a="recipe-open" data-id="' + m.dishId + '" data-date="' + d.date + '" data-idx="' + i + '" style="cursor:pointer"><span class="muted">' + MealPlan.SLOTS[i].name + ':</span> ' + esc(MealPlan.DISH[m.dishId].n) + ' <span class="tech">' + esc(MealPlan.TECH[m.method] || '') + '</span></div>').join('')) +
      '<button class="btn alt sm mt" data-a="plan-day-open" data-d="' + d.date + '">Подробно</button></div>';
  }).join('');
  h += '<button class="btn ghost block" data-a="plan-reroll">Другое меню на эту неделю</button>';
  return h;
}

/* День */
function planDay(P, D, wk) {
  const plan = weekPlanFor(P, D, wk), db = Store.db;
  let h = '<div class="days">' + plan.days.map(d => '<button class="' + (d.date === S.planDate ? 'on ' : '') + (d.date === dkey() ? 'today' : '') + '" data-a="plan-day" data-d="' + d.date + '">' + WD[parseD(d.date).getDay()] + '<b>' + parseD(d.date).getDate() + '</b></button>').join('') + '</div>';
  const day = plan.days.find(d => d.date === S.planDate) || plan.days[0], di = dayInfo(P, D, day.date);
  if (di.hide) return h + '<div class="card feast"><h3>🍽 Застолье</h3><div class="small">В этот день план питания не нужен. Наслаждайтесь.</div><ul class="small" style="padding-left:18px">' + Periods.MSG.feast.map(m => '<li class="mb">' + esc(m) + '</li>').join('') + '</ul></div>';
  const per = Periods.at(D, day.date);
  if (per) h += '<div class="banner info"><div><b>' + Periods.TYPES[per.type].icon + ' ' + Periods.TYPES[per.type].n + '</b>Норма в этот период равна расходу: ' + day.target + ' ккал. Блюда те же, порции больше.</div></div>';
  if (di.mode === 'pre' || di.mode === 'comp') h += '<div class="banner info"><div><b>Норма на 5% ниже</b>' + (di.mode === 'pre' ? 'Это мягкая подготовка к застолью. Ниже безопасного минимума норма не опускается.' : 'Мягкая компенсация после застолья. Её можно отключить в настройках события.') + '</div></div>';
  h += '<div class="card"><div class="row sb"><div><div class="small muted">План на день</div><div class="b num" style="font-size:24px">' + fmtN(day.tot.k) + ' ккал</div></div><div style="text-align:right" class="small muted num">Б ' + day.tot.p + ' · Ж ' + day.tot.f + ' · У ' + day.tot.c + (day.factor > 1.01 ? '<div><span class="pill gold">день с запасом</span></div>' : '') + '</div></div></div>';
  day.meals.forEach((m, i) => {
    const sl = MealPlan.SLOTS[i], rc = MealPlan.DISH[m.dishId], me = MealPlan.methodsFor(rc, db.prefs.kit).find(x => x.type === m.method);
    h += '<div class="card dish"><div class="slotname">' + sl.icon + ' ' + sl.name + ' · ' + m.k + ' ккал</div><h4>' + esc(rc.n) + '</h4><div class="small muted mb">' + esc(methodLabel(me)) + (rc.activeMin ? ' · активно ' + rc.activeMin + ' мин' : '') + '</div><ul>' + m.ing.map(x => ingLine(x[0], x[1])).join('') + '</ul>' +
      '<div class="small muted">Б ' + m.p + ' · Ж ' + m.f + ' · У ' + m.c + '</div><div class="row mt wrap"><button class="btn sm" data-a="recipe-open" data-id="' + m.dishId + '" data-date="' + day.date + '" data-idx="' + i + '">Рецепт</button><button class="btn alt sm" data-a="plan-eat" data-day="' + day.date + '" data-i="' + i + '">В дневник</button><button class="btn ghost sm" data-a="plan-swap" data-day="' + day.date + '" data-i="' + i + '">Заменить</button></div></div>';
  });
  h += '<button class="btn ghost block" data-a="plan-reroll">Другое меню на эту неделю</button>';
  return h;
}

/* Каталог рецептов */
const RF = { meal: '', tech: '', quick: false, q: '' };
function recipeBrowser() {
  const pr = Store.db.prefs, kit = pr.kit;
  let list = MealPlan.DISHES.filter(r => !pr.banned.includes(r.id) && MealPlan.usable(r, kit));
  if (RF.meal) list = list.filter(r => r.m === RF.meal);
  if (RF.tech) list = list.filter(r => MealPlan.methodsFor(r, kit).some(m => m.type === RF.tech));
  if (RF.quick) list = list.filter(r => (r.activeMin || 99) <= 20);
  if (RF.q) list = list.filter(r => normQ(r.n).indexOf(normQ(RF.q)) >= 0);
  const chip = (cls, a, v, t) => '<button class="chip ' + (cls ? 'on' : '') + '" data-a="' + a + '" data-v="' + v + '">' + t + '</button>';
  let h = '<div class="card"><input type="search" id="rq" placeholder="Поиск блюда" value="' + esc(RF.q) + '" data-c="recq">' +
    '<div class="chips mt">' + [['', 'Все'], ['b', 'Завтрак'], ['l', 'Обед'], ['d', 'Ужин'], ['s', 'Перекус']].map(x => chip(RF.meal === x[0], 'rf-meal', x[0], x[1])).join('') + '</div>' +
    '<div class="chips mt">' + [['', 'Любая техника'], ['multicooker', 'Мультиварка'], ['oven', 'Духовка'], ['stove', 'Плита'], ['blender', 'Блендер'], ['toaster', 'Тостер']].map(x => chip(RF.tech === x[0], 'rf-tech', x[0], x[1])).join('') + chip(RF.quick, 'rf-quick', '1', '≤ 20 мин') + '</div></div>';
  h += '<div class="small muted mb">Найдено: ' + list.length + '</div><div class="list">' + list.slice(0, 80).map(r => '<div class="item" data-a="recipe-open" data-id="' + r.id + '"><div class="nm"><b>' + esc(r.n) + '</b><span class="small muted">' + ({ b: 'завтрак', l: 'обед', d: 'ужин', s: 'перекус' }[r.m]) + ' · ' + MealPlan.macro(r.ing).k + ' ккал/порция · ' + (r.activeMin || '?') + ' мин активно</span><div>' + techChips(r) + '</div></div>' + ic('chevr', 'sm') + '</div>').join('') + '</div>';
  return h;
}
act('rf-meal', el => { RF.meal = el.dataset.v; rerender(); });
act('rf-tech', el => { RF.tech = el.dataset.v; rerender(); });
act('rf-quick', () => { RF.quick = !RF.quick; rerender(); });

/* ---------- Действия плана ---------- */
act('plan-sub', el => { S.sub.plan = el.dataset.s; rerender(); });
act('plan-day', el => { S.planDate = el.dataset.d; rerender(); });
act('plan-day-open', el => { S.planDate = el.dataset.d; S.sub.plan = 'day'; rerender(); });
act('plan-week', el => { S.planDate = addDays(weekStart(S.planDate), +el.dataset.d); rerender(); });
act('plan-reroll', () => { const wk = weekStart(S.planDate); Store.db.seeds[wk] = (Store.db.seeds[wk] || 0) + 1; delete Store.db.overrides[wk]; Store.save(); rerender(); });
act('plan-eat', el => {
  const P = Store.prof(), D = Store.data(), wk = weekStart(el.dataset.day), plan = weekPlanFor(P, D, wk);
  const day = plan.days.find(d => d.date === el.dataset.day), i = +el.dataset.i, m = day.meals[i], dish = MealPlan.DISH[m.dishId];
  addEntry(MEALSLOT[m.slot], { n: dish.n, cat: 'План' }, m.g, { k: m.k, p: m.p, f: m.f, c: m.c }, day.date);
  toast('Добавлено в дневник: ' + dish.n); rerender();
});
act('plan-swap', el => {
  const P = Store.prof(), D = Store.data(), db = Store.db, i = +el.dataset.i, date = el.dataset.day, sl = MealPlan.SLOTS[i];
  const day = weekPlanFor(P, D, weekStart(date)).days.find(d => d.date === date), kcal = sl.share * day.target;
  const list = MealPlan.DISHES.filter(r => r.m === sl.pool && !db.prefs.banned.includes(r.id) && MealPlan.usable(r, db.prefs.kit) && r.id !== day.meals[i].dishId);
  Sheets.open('<div class="small muted mb">Выберите, что приготовить вместо:</div><div class="list">' + list.map(r => { const sc = MealPlan.scaleDish(r, kcal); return '<div class="item" data-a="plan-swap-ok" data-day="' + date + '" data-i="' + i + '" data-id="' + r.id + '"><div class="nm"><b>' + esc(r.n) + '</b><span class="small muted">' + sc.k + ' ккал · ' + (r.activeMin || '?') + ' мин активно</span><div>' + techChips(r) + '</div></div></div>'; }).join('') + '</div>', { title: 'Заменить блюдо' });
});
act('plan-swap-ok', el => {
  const wk = weekStart(el.dataset.day), db = Store.db; db.overrides[wk] = db.overrides[wk] || {}; db.overrides[wk][el.dataset.day + '|' + el.dataset.i] = el.dataset.id; Store.save(); Sheets.closeAll(); toast('Блюдо заменено'); rerender();
});
act('shop-check', el => { const db = Store.db, key = weekStart(S.planDate) + S.shopScope + S.shopWho; db.checks[key] = db.checks[key] || {}; db.checks[key][el.dataset.n] = !db.checks[key][el.dataset.n]; Store.save(); rerender(); });
act('have-toggle', (el, ev) => { ev.stopPropagation(); const db = Store.db, n = el.dataset.n; db.have[n] = !HAVE(n); Store.save(); rerender(); });
act('price-edit', (el, ev) => {
  ev.stopPropagation(); const n = el.dataset.n, cur = MealPlan.priceOf(n, Store.db.prices);
  Sheets.open('<div class="b">' + esc(n) + '</div><label class="f">Цена, ₽ за 1 кг</label><input id="pr" type="number" inputmode="numeric" value="' + cur + '"><div class="row mt"><button class="btn ghost" data-a="price-reset" data-n="' + esc(n) + '">Сбросить</button><button class="btn grow" data-a="price-ok" data-n="' + esc(n) + '">Сохранить</button></div>', { title: 'Своя цена' });
});
act('price-ok', el => { const v = nval('pr'); if (!(v >= 0)) return; Store.db.prices[el.dataset.n] = v; Store.save(); Sheets.close(); rerender(); });
act('price-reset', el => { delete Store.db.prices[el.dataset.n]; Store.save(); Sheets.close(); rerender(); });

/* Моя кухня */
const KIT_ITEMS = [['oven', 'Духовка'], ['multi', 'Мультиварка (Polaris PMC 0517 Expert, 5 л)'], ['immersion', 'Погружной блендер'], ['chopper', 'Чаша-измельчитель'], ['toaster', 'Тостер'], ['micro', 'Микроволновка']];
act('kitchen-open', () => {
  const pr = Store.db.prefs;
  Sheets.open('<div class="small muted mb">Блюда подбираются только из доступной техники. Плита есть всегда.</div>' +
    KIT_ITEMS.map(k => '<label class="row mb" style="gap:12px"><span class="sw"><input type="checkbox" class="kit" value="' + k[0] + '"' + (pr.kit[k[0]] ? ' checked' : '') + '><i></i></span><span class="grow">' + k[1] + '</span></label>').join('') +
    '<label class="f mt2">Не ем (через запятую: рыба, грибы, творог…)</label><input id="exc" type="text" value="' + esc((pr.exclude || []).join(', ')) + '" placeholder="например: грибы, баклажан">' +
    (pr.banned.length ? '<div class="b mt2 small">Скрытые блюда</div>' + pr.banned.map(id => MealPlan.DISH[id] ? '<div class="row sb small mb"><span>' + esc(MealPlan.DISH[id].n) + '</span><button class="chip" data-a="unban" data-id="' + id + '">вернуть</button></div>' : '').join('') : '') +
    '<button class="btn block mt2" data-a="kitchen-save">Сохранить</button>', { title: 'Моя кухня' });
});
act('kitchen-save', () => {
  const pr = Store.db.prefs; $$('.kit').forEach(c => { pr.kit[c.value] = c.checked; });
  pr.exclude = val('exc').split(',').map(x => x.trim()).filter(Boolean);
  Store.save(); Sheets.close(); toast('Сохранено. Меню пересчитано'); rerender();
});
act('unban', el => { const pr = Store.db.prefs; pr.banned = pr.banned.filter(x => x !== el.dataset.id); Store.save(); Sheets.close(); rerender(); });

/* ---------- Таймеры ---------- */
const Timers = {
  list: [], tick: null,
  add(label, sec) {
    this.list.push({ id: uid(), label: label, left: sec });
    if (!this.tick) this.tick = setInterval(() => this.step(), 1000);
    this.draw(); if (navigator.vibrate) navigator.vibrate(30);
  },
  step() {
    this.list.forEach(t => { t.left--; });
    const done = this.list.filter(t => t.left <= 0);
    done.forEach(t => { beep(880, 300); if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]); toast('Таймер: ' + t.label + ' — готово', 6000); });
    this.list = this.list.filter(t => t.left > 0);
    if (!this.list.length) { clearInterval(this.tick); this.tick = null; }
    this.draw();
  },
  draw() {
    let box = $('#timers');
    if (!box) { box = document.createElement('div'); box.id = 'timers'; box.className = 'timers'; $('#app').appendChild(box); }
    box.innerHTML = this.list.map(t => '<button class="timerpill" data-a="timer-del" data-id="' + t.id + '">⏱ ' + esc(t.label) + ' · ' + Math.floor(t.left / 60) + ':' + pad(t.left % 60) + '</button>').join('');
  }
};
act('timer-del', el => { Timers.list = Timers.list.filter(t => t.id !== el.dataset.id); Timers.draw(); });
function stepMinutes(txt) { const m = String(txt).match(/(\d+)(?:\s*[–-]\s*(\d+))?\s*(?:мин|минут)/i); return m ? +(m[2] || m[1]) : 0; }

/* ---------- Страница блюда ---------- */
let RP = null;
function recipeCtx(el) { return el.dataset.date ? { date: el.dataset.date, idx: +el.dataset.idx } : null; }
act('recipe-open', (el) => {
  const rc = MealPlan.DISH[el.dataset.id]; if (!rc) return;
  const ctx = recipeCtx(el), kit = Store.db.prefs.kit, ms = MealPlan.methodsFor(rc, kit);
  let mi = 0;
  if (ctx) { const P = Store.prof(), D = Store.data(), plan = weekPlanFor(P, D, weekStart(ctx.date)), day = plan.days.find(d => d.date === ctx.date); if (day) { const mt = day.meals[ctx.idx].method; const j = ms.findIndex(m => m.type === mt); if (j >= 0) mi = j; } }
  RP = { id: rc.id, ctx: ctx, mi: mi, batch: 2 };
  Sheets.open('<div id="rcp"></div>', { title: rc.n, full: true, onClose: () => { RP = null; } });
  drawRecipe();
});
function drawRecipe() {
  const root = $('#rcp'); if (!root || !RP) return;
  const rc = MealPlan.DISH[RP.id], db = Store.db, kit = db.prefs.kit, ms = MealPlan.methodsFor(rc, kit), m = ms[RP.mi] || ms[0] || { type: 'none', steps: [] };
  const profs = db.profiles, P = Store.prof();
  // порции: по плану или базовая
  const portions = profs.map(p => {
    const Dp = Store.data(p.id);
    if (RP.ctx) {
      const kc = MealPlan.SLOTS[RP.ctx.idx].share * targetFor(p, Dp, RP.ctx.date);
      return { name: p.name, me: p.id === P.id, sc: MealPlan.scaleDish(rc, kc) };
    }
    return { name: p.name, me: p.id === P.id, sc: MealPlan.scaleDish(rc, MealPlan.macro(rc.ing).k) };
  });
  const mine = portions.find(x => x.me) || portions[0], names = rc.ing.map(x => x[0]);
  const total = names.map((n, i) => portions.reduce((s, x) => s + x.sc.ing[i][1], 0) * RP.batch);
  let h = '<div class="row wrap mb"><span class="pill ok">' + ({ b: 'Завтрак', l: 'Обед', d: 'Ужин', s: 'Перекус' }[rc.m]) + '</span>' + (rc.activeMin ? '<span class="pill">активно ' + rc.activeMin + ' мин</span>' : '') + (rc.totalMin ? '<span class="pill">всего ' + rc.totalMin + ' мин</span>' : '') + (rc.keep ? '<span class="pill">' + esc(rc.keep) + '</span>' : '') + '</div>';
  if (ms.length > 1) h += '<div class="seg">' + ms.map((x, i) => '<button class="' + (i === RP.mi ? 'on' : '') + '" data-a="rp-method" data-i="' + i + '">' + esc(MealPlan.TECH[x.type]) + '</button>').join('') + '</div>';
  h += '<div class="card"><div class="b">' + esc(methodLabel(m)) + '</div>' + (m.type === 'multicooker' ? '<table class="t mt"><tr><td>Время</td><td class="num">' + m.timeMin + ' мин</td></tr><tr><td>Температура</td><td class="num">' + m.tempC + ' °C</td></tr><tr><td>Заполнение чаши</td><td>' + esc(m.fill || '') + '</td></tr><tr><td>Отложенный старт</td><td>' + (m.delayStart ? 'можно (до 24 ч)' : 'не рекомендуется') + '</td></tr></table><div class="tiny muted mt">Выберите на панели подходящую программу сами: ориентируйтесь на время и температуру.</div>' : m.type === 'oven' ? '<table class="t mt"><tr><td>Время</td><td class="num">' + m.timeMin + ' мин</td></tr><tr><td>Температура</td><td class="num">' + m.tempC + ' °C</td></tr></table>' : '') + '</div>';
  h += '<div class="card"><h3>Ингредиенты</h3><div class="small muted mb">Граммы в сыром или сухом виде (как покупаете).</div><table class="t"><tr><th></th>' + portions.map(x => '<th class="num">' + esc(x.name) + '</th>').join('') + (portions.length > 1 ? '<th class="num">Вместе</th>' : '') + '</tr>' +
    names.map((n, i) => '<tr><td>' + esc(ingName(n)) + '</td>' + portions.map(x => '<td class="num">' + x.sc.ing[i][1] + '</td>').join('') + (portions.length > 1 ? '<td class="num">' + portions.reduce((s, x) => s + x.sc.ing[i][1], 0) + '</td>' : '') + '</tr>').join('') + '</table>' +
    '<div class="small muted mt">Порция: ' + mine.sc.k + ' ккал · Б ' + mine.sc.p + ' · Ж ' + mine.sc.f + ' · У ' + mine.sc.c + '</div>' +
    '<div class="stepper"><button class="btn alt" data-a="rp-batch" data-d="-1" aria-label="Меньше">−</button><div class="v">' + RP.batch + '</div><button class="btn alt" data-a="rp-batch" data-d="1" aria-label="Больше">+</button></div><div class="center small muted">приёма(ов) готовим сразу: всего ' + names.map((n, i) => ingName(n) + ' ' + r0(total[i]) + ' г').slice(0, 6).join(', ') + (names.length > 6 ? '…' : '') + '</div></div>';
  h += '<div class="card"><h3>Приготовление</h3>' + m.steps.map((s, i) => { const mn = stepMinutes(s); return '<div class="step"><div class="n">' + (i + 1) + '</div><div class="grow">' + esc(s) + (mn ? '<div><button class="chip mt" data-a="rp-timer" data-min="' + mn + '" data-label="' + esc(rc.n.slice(0, 22)) + '">⏱ таймер ' + mn + ' мин</button></div>' : '') + '</div></div>'; }).join('') + '<button class="btn block mt" data-a="cook-start">Готовить по шагам</button></div>';
  if (rc.tip) h += '<div class="banner info"><div>💡 ' + esc(rc.tip) + '</div></div>';
  h += '<div class="row wrap">' + (RP.ctx ? '<button class="btn alt" data-a="rp-eat">В дневник</button><button class="btn ghost" data-a="rp-swap">Заменить</button>' : '') + '<button class="btn ghost" data-a="rp-ban">Не предлагать</button></div>';
  root.innerHTML = h;
}
act('rp-method', el => { RP.mi = +el.dataset.i; drawRecipe(); });
act('rp-batch', el => { RP.batch = clamp(RP.batch + +el.dataset.d, 1, 8); drawRecipe(); });
act('rp-timer', el => { Timers.add(el.dataset.label, +el.dataset.min * 60); toast('Таймер запущен: ' + el.dataset.min + ' мин'); });
act('rp-eat', () => { const c = RP.ctx; Sheets.close(); ACT['plan-eat']({ dataset: { day: c.date, i: String(c.idx) } }); });
act('rp-swap', () => { const c = RP.ctx; Sheets.close(); ACT['plan-swap']({ dataset: { day: c.date, i: String(c.idx) } }); });
act('rp-ban', () => { const pr = Store.db.prefs, id = RP.id; if (!pr.banned.includes(id)) pr.banned.push(id); Store.save(); Sheets.close(); toast('Блюдо скрыто. Вернуть можно в «Моя кухня»'); rerender(); });

/* Режим «Готовить» */
let CK = null, wakeLock = null;
act('cook-start', () => {
  const rc = MealPlan.DISH[RP.id], ms = MealPlan.methodsFor(rc, Store.db.prefs.kit), m = ms[RP.mi] || ms[0];
  CK = { name: rc.n, steps: m.steps, i: 0, m: m };
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { wakeLock = w; }, () => { }); } catch (e) { }
  Sheets.open('<div id="cook"></div>', { title: 'Готовим', full: true, onClose: () => { CK = null; try { if (wakeLock) wakeLock.release(); } catch (e) { } wakeLock = null; } });
  drawCook();
});
function drawCook() {
  const el = $('#cook'); if (!el || !CK) return;
  const s = CK.steps[CK.i], mn = stepMinutes(s), last = CK.i === CK.steps.length - 1;
  el.innerHTML = '<div class="small muted">' + esc(CK.name) + ' · шаг ' + (CK.i + 1) + ' из ' + CK.steps.length + '</div>' +
    '<div class="bar mt"><i style="width:' + (CK.i + 1) / CK.steps.length * 100 + '%"></i></div>' +
    '<div style="font-size:24px;line-height:1.35;margin:22px 0;font-weight:500">' + esc(s) + '</div>' +
    (mn ? '<button class="btn alt block mb" data-a="rp-timer" data-min="' + mn + '" data-label="' + esc(CK.name.slice(0, 22)) + '">⏱ Запустить таймер ' + mn + ' мин</button>' : '') +
    '<div class="row"><button class="btn ghost grow" data-a="cook-nav" data-d="-1"' + (CK.i === 0 ? ' disabled' : '') + '>Назад</button><button class="btn grow" data-a="cook-nav" data-d="1">' + (last ? 'Готово!' : 'Дальше') + '</button></div>';
}
act('cook-nav', el => { const d = +el.dataset.d; if (d > 0 && CK.i === CK.steps.length - 1) { Sheets.close(); celebrate('🍳', 'Приятного аппетита!', 'Блюдо готово. Не забудьте записать его в дневник.', 'Спасибо'); return; } CK.i = clamp(CK.i + d, 0, CK.steps.length - 1); drawCook(); });
