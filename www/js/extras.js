/* Дополнения 2.0: особые периоды, баннеры, «Чем добить день», итоги недели, диагностика, онлайн, штрихкоды, отмена удаления. */
const APP_VERSION = '2.0.0';
const CHANGELOG = [
  'Особые периоды: застолье, поездка, болезнь и диетическая пауза. Без наказаний и «отработок».',
  'Силовая программа с гантелями, резинками и степпером. Веса подбираются из вашего набора гантелей.',
  'Проверка силы раз в 4 недели и график роста.',
  'Новое «План»: корзина перед неделей, 130 блюд с рецептами, режим «Готовить», учёт вашей техники и мультиварки.',
  'Рецепты и база продуктов обновляются через интернет без переустановки.',
  'Поиск продукта по штрихкоду (Open Food Facts, экспериментально).',
  'Проверка новой версии приложения, диагностика напоминаний, размер шрифта, кнопка «Отменить» после удаления.',
  'Итоги недели и подсказка «Чем добить день».'
];

/* ---------- Отмена удаления ---------- */
function withUndo(label, fn) {
  const pid = Store.db.activeId, snap = JSON.stringify(Store.db.data[pid]);
  fn(); Store.save(); rerender();
  toast(label, 6000, { label: 'Отменить', fn: () => { Store.db.data[pid] = JSON.parse(snap); Store.save(); rerender(); } });
}

/* ---------- Баннеры на экране «Сегодня» ---------- */
function topBanners(P, D, g, di) {
  const db = Store.db, now = Date.now();
  let h = '';
  const f = db.updateMeta.found;
  if (f && (!db.updateMeta.snooze || now > db.updateMeta.snooze)) h += '<div class="banner info"><div><b>Доступна версия ' + esc(String(f.tag).replace(/^v/, '')) + '</b>Перед обновлением сделайте резервную копию.<div class="row mt wrap"><button class="btn sm" data-a="upd-open">Скачать</button><button class="btn ghost sm" data-a="upd-notes">Что нового</button><button class="btn ghost sm" data-a="upd-later">Позже</button></div></div></div>';
  const days = diffDays(dkey(), P.createdAt);
  if (days >= 7 && (!db.lastBackup || diffDays(dkey(), db.lastBackup) > 7)) h += '<div class="banner warn"><div><b>Давно не было резервной копии</b>Данные хранятся только на телефоне.<div class="row mt"><button class="btn sm" data-a="data-export">Сохранить копию</button></div></div></div>';
  const rv = Periods.pendingReview(D, dkey());
  if (rv) h += '<div class="banner info"><div><b>Застолье позади</b>Посмотрите, как вернуться в план без стресса.<div class="row mt"><button class="btn sm" data-a="feast-review" data-id="' + rv.id + '">Что дальше</button></div></div></div>';
  const per = Periods.at(D, dkey());
  if (per && per.type !== 'feast') h += '<div class="banner info"><div><b>' + Periods.TYPES[per.type].icon + ' ' + Periods.TYPES[per.type].n + ' до ' + fmtD(per.to) + '</b>' + Periods.TYPES[per.type].d + '. Норма: ' + fmtN(di.target) + ' ккал (расход).<div class="row mt"><button class="btn ghost sm" data-a="period-end" data-id="' + per.id + '">Завершить сейчас</button></div></div></div>';
  if (di.mode === 'pre') h += '<div class="banner info"><div><b>Подготовка к застолью</b>Норма на 5% ниже обычной, но не ниже безопасного минимума.</div></div>';
  if (di.mode === 'comp') h += '<div class="banner info"><div><b>Мягкая компенсация</b>Норма на 5% ниже обычной. Голодать не нужно.</div></div>';
  const nx = Periods.next(D, dkey());
  if (nx && nx.type === 'feast' && nx.from > dkey() && diffDays(nx.from, dkey()) <= 3) h += '<div class="banner info"><div><b>Скоро застолье (' + fmtD(nx.from) + ')</b>В тот день калории считать не нужно. Не приходите голодным.</div></div>';
  return h;
}
function feastCard(P, D, di, st) {
  return '<div class="card feast"><h3>🍽 Сегодня застолье</h3><div class="small mb">Сегодня без подсчёта калорий. День засчитан в серию автоматически.</div><ul class="small" style="padding-left:18px;margin:0 0 8px">' + Periods.MSG.feast.map(m => '<li class="mb">' + esc(m) + '</li>').join('') + '</ul>' +
    '<div class="row wrap"><button class="btn alt sm" data-a="water" data-ml="250">+250 мл воды</button><button class="btn ghost sm" data-a="food-add" data-slot="' + autoSlot() + '">Записать, что ел</button><button class="btn sm" data-a="feast-review" data-id="' + di.period.id + '">Событие прошло</button></div><div class="tiny muted mt">Выпито сегодня: ' + fmtN(st.water) + ' мл</div></div>';
}

/* ---------- Особые периоды ---------- */
act('period-new', () => {
  const pr = Store.db.prefs, t = dkey();
  Sheets.open('<label class="f">Что происходит</label><select id="pt" data-c="pt">' + Object.keys(Periods.TYPES).map(k => '<option value="' + k + '">' + Periods.TYPES[k].icon + ' ' + Periods.TYPES[k].n + '</option>').join('') + '</select><div class="small muted mt" id="ptd">' + Periods.TYPES.feast.d + '</div>' +
    '<div class="two"><div><label class="f">С даты</label><input id="pf" type="date" value="' + t + '"></div><div id="ptoW" style="display:none"><label class="f">По дату</label><input id="pto" type="date" value="' + addDays(t, 2) + '"></div></div>' +
    '<div id="pfeast"><label class="row mt" style="gap:12px"><span class="sw"><input type="checkbox" id="ppre"' + (pr.preFeast ? ' checked' : '') + '><i></i></span><span class="grow">Снизить норму на 5% за 3 дня до события<div class="tiny muted">Не ниже безопасного минимума. Отключается при плохом сахаре.</div></span></label>' +
    '<label class="row mt" style="gap:12px"><span class="sw"><input type="checkbox" id="pcomp"' + (pr.comp ? ' checked' : '') + '><i></i></span><span class="grow">Мягкая компенсация после события (−5% на 2 дня)<div class="tiny muted">По умолчанию без компенсации: голодание запускает цикл срывов.</div></span></label></div>' +
    '<button class="btn block mt2" data-a="period-save">Сохранить</button>', { title: 'Событие или поездка' });
});
act('period-save', () => {
  const D = Store.data(), type = val('pt'), from = val('pf') || dkey();
  let to = type === 'feast' ? from : (val('pto') || from);
  if (to < from) return toast('Дата окончания раньше начала');
  if (type === 'sick' && diffDays(to, from) > 14) toast('Больше двух недель болезни: обязательно покажитесь врачу', 4500);
  const wk = Periods.feastsInWeek(D, from) + (type === 'feast' ? 1 : 0);
  const p = Periods.create(D, type, from, to, type === 'feast' ? { pre: $('#ppre').checked, comp: $('#pcomp').checked } : {});
  if (type === 'feast') { Store.db.prefs.preFeast = p.opts.pre; Store.db.prefs.comp = p.opts.comp; const at = new Date(addDays(from, 1) + 'T08:30:00'); if (at > new Date()) { p.nid = 40000 + (hashStr(p.id) % 9000); Notify.oneShot(p.nid, 'Измерьте давление', 'Вчера было застолье: измерьте давление (и сахар, если ведёте).', at); } }
  Store.save(); Sheets.close();
  if (type === 'feast' && wk > 2) Sheets.open('<div class="banner info"><div><b>Это уже ' + wk + '-е застолье на неделе</b>Это нормально время от времени, но если так часто, давайте пересмотрим норму или меню, чтобы план был реалистичным. Без осуждения.</div></div><button class="btn block" data-a="sheet-close">Понятно</button>', { title: 'Заметка' });
  else toast(Periods.TYPES[type].n + ': сохранено'); rerender();
});
act('period-end', el => { const D = Store.data(), p = Periods.list(D).find(x => x.id === el.dataset.id); if (p) { p.to = dkey(); Store.save(); toast('Период завершён'); rerender(); } });
act('period-list', () => {
  const D = Store.data(), l = Periods.live(D).slice().sort((a, b) => a.from < b.from ? 1 : -1);
  Sheets.open(l.length ? '<div class="list">' + l.map(p => '<div class="item"><div class="nm"><b>' + Periods.TYPES[p.type].icon + ' ' + Periods.TYPES[p.type].n + '</b><span class="small muted">' + fmtD(p.from) + (p.to !== p.from ? ' – ' + fmtD(p.to) : '') + '</span></div><button class="chip" data-a="period-cancel" data-id="' + p.id + '">отменить</button></div>').join('') + '</div>' : '<div class="empty">Событий пока нет</div>', { title: 'События и поездки' });
});
act('period-cancel', el => { const D = Store.data(), p = Periods.list(D).find(x => x.id === el.dataset.id); if (p) { p.cancelled = true; if (p.nid) Notify.cancelIds([p.nid]); Store.save(); Sheets.close(); toast('Отменено'); rerender(); } });
act('feast-review', el => {
  const D = Store.data(), p = Periods.list(D).find(x => x.id === el.dataset.id); if (p) { p.ack = true; Store.save(); }
  Sheets.open('<div style="font-size:42px" class="center">🌿</div><p class="mt">' + esc(Periods.MSG.review) + '</p><ul class="small" style="padding-left:18px"><li class="mb">Норма на ближайшие дни не снижается.</li><li class="mb">Пейте воду, выходите на прогулку: без «отработки» тренировками.</li><li class="mb">Утром измерьте давление: соль и алкоголь поднимают его.</li><li class="mb">Вес в ближайшие 3 дня не учитывается в тренде.</li></ul><button class="btn block" data-a="sheet-close">Возвращаемся в план</button>', { title: 'Что дальше' });
  rerender();
});
CHG.pt = v => { const t = Periods.TYPES[v]; const d = $('#ptd'); if (d) d.textContent = t.d; const w = $('#ptoW'); if (w) w.style.display = v === 'feast' ? 'none' : ''; const f = $('#pfeast'); if (f) f.style.display = v === 'feast' ? '' : 'none'; return 'noredraw'; };

/* ---------- «Чем добить день» ---------- */
function finisherCard(P, D, g, di, st) {
  if (di.hide || new Date().getHours() < 16) return '';
  const rem = di.target - st.kcal; if (rem < 150) return '';
  const pl = calcPlanFor(P, D), remP = Math.max(0, pl.protein * (di.target / pl.target) - st.p);
  const cand = [];
  D.recent.slice(0, 20).forEach(n => { const f = foodByName(n); if (!f) return; const gr = f.ug ? Math.min(f.ug, 250) : 100, k = f.k * gr / 100; if (k >= 60 && k <= rem) cand.push({ kind: 'f', n: f.n, g: gr, k: k, p: f.p * gr / 100, label: f.n + ' · ' + gr + ' г' }); });
  MealPlan.DISHES.filter(r => r.m === 's' && MealPlan.usable(r, Store.db.prefs.kit) && !Store.db.prefs.banned.includes(r.id)).forEach(r => { const m = MealPlan.macro(r.ing); if (m.k >= 80 && m.k <= rem) cand.push({ kind: 'r', id: r.id, n: r.n, k: m.k, p: m.p, label: r.n }); });
  cand.sort((a, b) => remP > 15 ? (b.p / b.k - a.p / a.k) : (Math.abs(rem * 0.5 - a.k) - Math.abs(rem * 0.5 - b.k)));
  const top = cand.slice(0, 3);
  return '<div class="card"><h3>🌙 Чем добить день</h3><div class="small muted mb">Осталось ' + fmtN(rem) + ' ккал' + (remP > 10 ? ' и около ' + r0(remP) + ' г белка' : '') + '. Не голодайте: недоедание тормозит прогресс.</div>' +
    (top.length ? '<div class="list">' + top.map(c => '<div class="item" data-a="' + (c.kind === 'f' ? 'fin-add' : 'fin-add-r') + '" data-n="' + esc(c.n) + '" data-g="' + (c.g || 0) + '" data-id="' + (c.id || '') + '"><div class="nm"><b>' + esc(c.label) + '</b><span class="small muted">' + r0(c.k) + ' ккал · белок ' + r0(c.p) + ' г</span></div>' + ic('plus', 'sm') + '</div>').join('') + '</div>' : '<div class="small">Подойдёт творог, кефир, яйцо или горсть орехов.</div>') + '</div>';
}
act('fin-add', el => { const f = foodByName(el.dataset.n); if (!f) return; addEntry('s', f, +el.dataset.g, null, dkey()); toast('Добавлено: ' + f.n); rerender(); });
act('fin-add-r', el => { const rc = MealPlan.DISH[el.dataset.id]; if (!rc) return; const m = MealPlan.macro(rc.ing); addEntry('s', { n: rc.n, cat: 'План' }, m.g, { k: m.k, p: m.p, f: m.f, c: m.c }, dkey()); toast('Добавлено: ' + rc.n); rerender(); });

/* ---------- Итоги недели ---------- */
act('weekly-open', () => {
  const P = Store.prof(), D = Store.data(), g = Game.compute(P, D), today = dkey(), wk = weekStart(today);
  const days = []; for (let k = wk; k <= today; k = addDays(k, 1)) days.push(g.stat(k));
  const withFood = days.filter(s => s.food), avg = withFood.length ? r0(sum(withFood, s => s.kcal) / withFood.length) : 0;
  const waterDays = days.filter(s => s.waterOk).length, moveDays = days.filter(s => s.move).length, n = days.length;
  const str = D.strength.sessions.filter(s => s.d >= wk).length;
  const ma = g.ma, before = ma.filter(m => m.d < wk).slice(-1)[0], now = ma[ma.length - 1];
  const dw = before && now ? r1(now.w - before.w) : null;
  const bp = D.bp.filter(b => b.d >= wk), bpAvg = bp.length ? r0(sum(bp, b => b.sys) / bp.length) + '/' + r0(sum(bp, b => b.dia) / bp.length) : '—';
  const per = days.filter(s => s.feast).length;
  let goal;
  if (waterDays < Math.min(5, n)) goal = 'Вода: нормы 5 дней из 7. Поставьте напоминание каждые 90 минут.';
  else if (withFood.length < Math.min(5, n)) goal = 'Дневник: записывайте еду хотя бы в 5 днях из 7.';
  else if (moveDays < Math.min(5, n)) goal = 'Движение: хотя бы по 10 минут ходьбы 5 дней.';
  else if (str < 2 && D.strength.start) goal = 'Силовые: две-три тренировки за неделю.';
  else goal = 'Всё стабильно. Цель недели: сохранить ритм и лечь спать на 30 минут раньше.';
  Sheets.open('<div class="stat"><div><b class="num">' + (avg ? fmtN(avg) : '—') + '</b><span>средние ккал</span></div><div><b class="num">' + waterDays + '/' + n + '</b><span>дней воды</span></div><div><b class="num">' + moveDays + '/' + n + '</b><span>дней движения</span></div></div>' +
    '<div class="stat"><div><b class="num">' + (dw == null ? '—' : (dw > 0 ? '+' : '') + String(dw).replace('.', ',')) + '</b><span>тренд веса, кг</span></div><div><b class="num">' + str + '</b><span>силовых</span></div><div><b class="num">' + bpAvg + '</b><span>давление</span></div></div>' +
    (per ? '<div class="small muted mb">Застолий на неделе: ' + per + '. Они не мешают итогу.</div>' : '') + '<div class="banner info"><div><b>Цель на следующую неделю</b>' + esc(goal) + '</div></div><div class="small muted">Серия: ' + g.streak + ' ' + plural(g.streak, 'день', 'дня', 'дней') + ' · уровень ' + g.level + '.</div>', { title: 'Итоги недели' });
});

/* ---------- Диагностика напоминаний и онлайн ---------- */
act('diag-open', async () => {
  Sheets.open('<div class="empty">Проверяем…</div>', { title: 'Диагностика' });
  const d = await Notify.diag(), n = Store.db.notif, body = Sheets.body(); if (!body) return;
  const row = (a, b, ok) => '<tr><td>' + a + '</td><td style="text-align:right"><span class="pill ' + (ok === true ? 'ok' : ok === false ? 'bad' : '') + '">' + b + '</span></td></tr>';
  body.innerHTML = '<table class="t">' + row('Приложение установлено (APK)', d.native ? 'да' : 'нет, браузер', d.native) + row('Напоминания включены в настройках', n.on ? 'да' : 'нет', n.on) +
    row('Разрешение на уведомления', d.perm || '—', d.perm === 'granted') + row('Точные будильники', d.exact || 'неизвестно', d.exact === 'granted' ? true : d.exact ? false : null) +
    row('Уведомлений в расписании', d.pending == null ? '—' : d.pending, d.pending > 0 ? true : (n.on ? false : null)) + row('Ближайшее', d.next ? esc(d.next.title) + ', ' + fmtD(dkey(d.next.t)) + ' ' + pad(d.next.t.getHours()) + ':' + pad(d.next.t.getMinutes()) : '—', null) + '</table>' +
    '<div class="small muted mt">Если уведомления не приходят: Настройки телефона → Приложения → Легче → Батарея → «Без ограничений», включите «Автозапуск» (Xiaomi, Realme, Huawei), разрешите «Будильники и напоминания», выключите режим «Не беспокоить».</div>' +
    '<div class="row mt wrap"><button class="btn" data-a="notif-test">Тест уведомления</button><button class="btn ghost" data-a="notif-exact">Точные будильники</button></div>' +
    '<div class="b mt2">Версии</div><table class="t"><tr><td>Приложение</td><td class="num" style="text-align:right">' + esc(await Updater.version()) + '</td></tr><tr><td>База продуктов</td><td class="num" style="text-align:right">v' + Content.state.foods.version + ' (' + Content.state.foods.src + ')</td></tr><tr><td>Рецепты</td><td class="num" style="text-align:right">v' + Content.state.recipes.version + ' (' + Content.state.recipes.src + ')</td></tr><tr><td>Штрихкоды</td><td class="num" style="text-align:right">найдено ' + Store.db.scanStats.hits + ' из ' + Store.db.scanStats.tries + '</td></tr></table>' + (Content.state.err ? '<div class="banner warn"><div>Последняя ошибка обновления: ' + esc(Content.state.err) + '</div></div>' : '');
});
function extraSettingsHtml() {
  const pr = Store.db.prefs, m = Store.db.contentMeta;
  return '<div class="card"><h3>🧭 События и поездки</h3><div class="small muted mb">Застолье, поездка, болезнь, диетическая пауза: приложение подстраивает норму, нагрузки и серию.</div><div class="row wrap"><button class="btn alt sm" data-a="period-new">Добавить</button><button class="btn ghost sm" data-a="period-list">Список</button></div></div>' +
    '<div class="card"><h3>🏋 Инвентарь и кухня</h3><div class="row wrap"><button class="btn alt sm" data-a="inv-open">Гантели, резинки, степпер</button><button class="btn alt sm" data-a="kitchen-open">Моя кухня</button></div></div>' +
    '<div class="card"><h3>🌐 Онлайн-функции</h3><label class="row" style="gap:12px"><span class="sw"><input type="checkbox" id="onl" data-c="online"' + (pr.online ? ' checked' : '') + '><i></i></span><span class="grow">Обновления и штрихкоды<div class="tiny muted">Данные о здоровье в сеть не уходят. Без интернета всё работает.</div></span></label>' +
    '<div class="small muted mt">Рецепты: v' + Content.state.recipes.version + ' (' + Content.state.recipes.src + ') · Продукты: v' + Content.state.foods.version + ' (' + Content.state.foods.src + ')' + (m.checked ? ' · проверка ' + fmtD(dkey(new Date(m.checked))) : '') + '</div>' +
    '<div class="row mt wrap"><button class="btn alt sm" data-a="content-check">Обновить рецепты и продукты</button><button class="btn alt sm" data-a="update-check">Проверить версию приложения</button></div><button class="btn ghost sm mt" data-a="content-reset">Вернуться к встроенным данным</button></div>' +
    '<div class="card"><h3>🔤 Оформление и диагностика</h3><label class="f">Размер текста</label><select data-c="font"><option value="100"' + (pr.font === 100 ? ' selected' : '') + '>Обычный</option><option value="112"' + (pr.font === 112 ? ' selected' : '') + '>Крупнее</option><option value="125"' + (pr.font === 125 ? ' selected' : '') + '>Очень крупно</option></select><button class="btn ghost sm mt" data-a="diag-open">Диагностика напоминаний</button></div>';
}
act('content-check', async () => {
  toast('Проверяем обновления…'); const r = await Content.checkRemote(true);
  if (r.error) toast('Не удалось обновить: ' + r.error, 5000); else if (r.skipped === 'off') toast('Онлайн-функции выключены'); else if (r.skipped === 'old-app') toast('Нужна версия приложения ' + r.need + ' или выше', 5000);
  else if (r.updated && r.updated.length) { toast('Обновлено: ' + r.updated.map(x => ({ foods: 'продукты', recipes: 'рецепты', tips: 'советы' }[x])).join(', ')); rerender(); }
  else toast('У вас самые свежие рецепты и продукты');
});
act('update-check', async () => { toast('Проверяем…'); const f = await Updater.check(true); if (f) { rerender(); Sheets.open('<p>Вышла версия <b>' + esc(f.tag) + '</b>.</p><div class="small muted" style="white-space:pre-wrap">' + esc(f.notes) + '</div><button class="btn block mt" data-a="upd-open">Открыть страницу скачивания</button>', { title: 'Новая версия' }); } else toast('У вас последняя версия'); });
act('content-reset', async () => { if (!confirm('Вернуть встроенные рецепты и продукты? Ваши продукты и рецепты останутся.')) return; await Content.reset(); toast('Использованы встроенные данные'); rerender(); });
act('upd-open', () => { const f = Store.db.updateMeta.found; if (f) Updater.open(f.url || f.apk); });
act('upd-later', () => { Store.db.updateMeta.snooze = Date.now() + 3 * 86400e3; Store.save(); rerender(); });
act('upd-notes', () => { const f = Store.db.updateMeta.found; if (f) Sheets.open('<div class="small" style="white-space:pre-wrap">' + esc(f.notes || 'Описание не указано') + '</div>', { title: 'Что нового в ' + f.tag }); });
function whatsNew() {
  const db = Store.db; if (db.seenVersion === APP_VERSION || !db.profiles.length) return;
  db.seenVersion = APP_VERSION; Store.save();
  Sheets.open('<ul style="padding-left:18px;margin:0">' + CHANGELOG.map(c => '<li class="mb">' + esc(c) + '</li>').join('') + '</ul><div class="small muted mt">Сделайте резервную копию: Настройки → Данные. Ваши данные из версии 1 сохранены.</div><button class="btn block mt" data-a="sheet-close">Понятно</button>', { title: 'Что нового в 2.0' });
}

/* ---------- Штрихкоды ---------- */
act('barcode-open', async () => {
  const st = Store.db.scanStats, cam = await Barcode.cameraAvailable();
  Sheets.open((cam ? '<button class="btn block mb" data-a="barcode-scan">Сканировать камерой</button>' : '') + '<label class="f">Или введите цифры штрихкода</label><input id="bc" type="text" inputmode="numeric" placeholder="4601234567890"><button class="btn alt block mt" data-a="barcode-find">Найти</button>' +
    '<div class="small muted mt">Продукт ищется сначала в вашей памяти (работает без интернета), затем в Open Food Facts. Данные нужно сверить с упаковкой. Найдено ' + st.hits + ' из ' + st.tries + ' запросов.</div>', { title: 'Штрихкод' });
});
act('barcode-scan', async () => {
  try { const c = await Barcode.scan(); if (c) { const i = $('#bc'); if (i) i.value = c; ACT['barcode-find'](); } else toast('Штрихкод не распознан'); }
  catch (e) { toast('Камера недоступна: ' + String(e && e.message || e) + '. Введите цифры вручную.', 5000); }
});
act('barcode-find', async () => {
  const code = Barcode.clean(val('bc')); if (code.length < 8) return toast('Введите не менее 8 цифр');
  toast('Ищем…'); const r = await Barcode.lookup(code);
  if (r.food) { Sheets.close(); const c = curPicker(); if (c && c.fill) { const q = $('#fq'); if (q) q.value = r.food.n; c.tab = 'all'; c.fill(); } toast((r.cached ? 'Из вашей памяти: ' : 'Найдено: ') + r.food.n + '. Выберите порцию', 4000); return; }
  window.__cf_once = { n: r.partial ? r.partial.n : '', barcode: code, p: r.partial ? r.partial.p : '', f: r.partial ? r.partial.f : '', c: r.partial ? r.partial.c : '' };
  Sheets.close();
  toast(r.error ? 'Нет связи. Введите данные с упаковки, продукт сохранится.' : r.partial ? 'В базе нет калорийности. Введите с упаковки.' : 'Продукт не найден. Введите данные с упаковки: в следующий раз он найдётся сам.', 5000);
  ACT['custom-food']();
});
