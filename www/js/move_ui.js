/* Раздел «Движение»: силовая программа, кардио, проверка силы, инвентарь. */
const SDOW = [['Пн', 1], ['Вт', 2], ['Ср', 3], ['Чт', 4], ['Пт', 5], ['Сб', 6], ['Вс', 0]];
const KINDLBL = { str: 'Силовая', cardio: 'Кардио', rest: 'Отдых', walk: 'Ходьба' };

function moveGate(D) {
  const bm = Calc.bpMode(D.bp, Date.now()), tr = Periods.training(D, dkey());
  let eff = tr;
  if (bm.mode === 'stop') eff = 'none'; else if (bm.mode !== 'ok' && (eff === 'full' || eff === 'half')) eff = 'walk';
  return { bm: bm, tr: tr, eff: eff };
}

VIEWS.move = function (P, D, g) {
  const today = dkey(), inv = Strength.normInv(P.inventory), w = curWeight(P, D), bmi = Calc.bmi(w, P.height);
  const gate = moveGate(D), st = D.strength, plan = Strength.todayPlan(st.start, today, gate.eff);
  const per = Periods.at(D, today), mv = D.moves[today] || [];
  const walkMin = sum(mv.filter(m => m.kind === 'walk'), m => m.min), microDone = mv.filter(m => m.kind === 'micro').length;
  let h = alertsHtml(P, D, g);
  if (per) h += '<div class="banner info"><div><b>' + Periods.TYPES[per.type].icon + ' ' + Periods.TYPES[per.type].n + '</b>' + (per.type === 'sick' ? 'Сегодня без нагрузок. Отдыхайте.' : 'Силовые на паузе. Ходьба и лёгкая мобильность по желанию.') + '</div></div>';
  else if (gate.tr === 'walk') h += '<div class="banner info"><div><b>День мягкого возврата</b>Только ходьба и лёгкая мобильность. Силовые вернутся завтра, без «отработки».</div></div>';
  else if (gate.tr === 'half') h += '<div class="banner info"><div><b>Мягкий вход</b>Объём вдвое меньше обычного.</div></div>';
  const sc = Strength.stepperStatus(inv, w);
  // --- сегодня по плану
  h += '<div class="card"><h3>💪 Сегодня по плану</h3>';
  if (gate.bm.mode === 'stop') h += '<div class="muted">Нагрузки отменены из-за давления. Отдыхайте и перемерьте давление.</div>';
  else if (plan.kind === 'none') h += '<div class="small muted mb">Начните с проверки силы: 10 минут, она нужна, чтобы подобрать веса и уровень отжиманий. Затем программа сама расставит нагрузку.</div><button class="btn block" data-a="test-open">Пройти проверку силы</button>';
  else if (plan.kind === 'str') {
    const list = Strength.planSession(plan.type, inv, plan.wk, st, st.base);
    h += '<div class="row sb"><b style="font-size:19px">Силовая ' + plan.type + '</b><span class="pill ' + (plan.deload ? 'gold' : '') + '">неделя ' + plan.wk + (plan.deload ? ', лёгкая' : '') + '</span></div><div class="small muted mb">' + list.map(x => esc(x.name)).join(' · ') + '</div><div class="small muted mb">≈ ' + Math.round(list.reduce((a, x) => a + x.sets, 0) * (plan.half ? 0.5 : 1) * 2 + 5) + ' минут. Подходов: ' + list[0].sets + (plan.half ? ' (мягкий вход)' : '') + ' на упражнение.</div>' +
      '<button class="btn block" data-a="ss-start" data-type="' + plan.type + '"' + (gate.bm.mode !== 'ok' ? ' disabled' : '') + '>Начать тренировку</button><button class="btn ghost block mt" data-a="ss-start" data-type="' + (plan.type === 'A' ? 'B' : 'A') + '">Сделать вместо этого ' + (plan.type === 'A' ? 'B' : 'A') + '</button>';
  } else if (plan.kind === 'cardio') {
    h += '<div class="row sb"><b style="font-size:19px">Кардио ' + plan.minutes + ' мин</b><span class="pill">неделя ' + plan.wk + '</span></div><div class="small muted mb">' + (sc.ok ? 'Степпер: 1 минута средне / 1 минута легко. Держитесь за опору.' : 'Быстрая ходьба интервалами 1/1 минута.') + '</div>' + (sc.warn ? '<div class="banner warn"><div>' + esc(sc.warn) + '</div></div>' : '') + (!sc.ok && sc.reason === 'unknown' ? '<div class="banner warn"><div>' + esc(sc.msg) + '</div></div>' : '') + (!sc.ok && sc.reason === 'weight' ? '<div class="banner bad"><div>' + esc(sc.msg) + '</div></div>' : '') +
      '<button class="btn block" data-a="cardio-start" data-min="' + plan.minutes + '">Начать</button>';
  } else {
    h += '<div class="muted">' + esc(plan.reason || 'Сегодня день отдыха. Достаточно ходьбы и пары пауз для спины.') + '</div>';
    if (plan.kind === 'rest' && gate.eff === 'full' && gate.bm.mode === 'ok') h += '<div class="small muted mt">Отдых тоже часть программы. Если очень хочется, можно сделать дополнительную тренировку, но лучше не чаще 4 раз в неделю.</div><div class="row mt"><button class="btn ghost sm grow" data-a="ss-start" data-type="A">Силовая A</button><button class="btn ghost sm grow" data-a="ss-start" data-type="B">Силовая B</button></div>';
  }
  h += '<div class="row mt wrap"><button class="btn alt sm" data-a="test-open">Проверка силы</button><button class="btn alt sm" data-a="inv-open">Инвентарь</button></div></div>';
  // --- неделя
  if (st.start) {
    const wk0 = weekStart(today);
    h += '<div class="card"><h3>Неделя ' + plan.wk + '</h3><div class="week7">' + SDOW.map(d => {
      const date = addDays(wk0, d[1] === 0 ? 6 : d[1] - 1), t = Strength.todayPlan(st.start, date, 'full'), did = st.sessions.some(x => x.d === date) || (D.moves[date] || []).some(m => m.kind === 'session' && t.kind === 'cardio');
      return '<div class="' + (date === today ? 'today ' : '') + (did ? 'done' : '') + '">' + d[0] + '<b>' + (t.kind === 'str' ? t.type : t.kind === 'cardio' ? 'К' : '·') + '</b></div>';
    }).join('') + '</div><div class="tiny muted">А/Б — силовые, К — кардио, точка — отдых. Каждая 4-я и 8-я неделя облегчённая.</div></div>';
  }
  // --- ходьба
  if (gate.eff !== 'none' && gate.bm.mode !== 'stop') {
    const prm = Ex.weekParams(Ex.weekNo(P.createdAt, today), bmi), goal = gate.bm.mode === 'light' ? Math.min(10, prm.walk) : prm.walk;
    h += '<div class="card"><h3>Ходьба<span class="sp"></span><span class="small muted num">' + r0(walkMin) + ' / ' + goal + ' мин</span></h3><div class="bar ok"><i style="width:' + clamp(walkMin / goal * 100, 0, 100) + '%"></i></div><div class="small muted mt">Темп, при котором можно разговаривать. Если одышка, идите медленнее.</div><div class="water"><button class="btn alt" data-a="walk" data-m="5">+5 мин</button><button class="btn alt" data-a="walk" data-m="10">+10 мин</button><button class="btn alt" data-a="walk" data-m="20">+20 мин</button></div></div>';
  }
  // --- офисная пауза
  if (gate.bm.mode !== 'stop' && gate.eff !== 'none') h += '<div class="card"><h3>Пауза для спины<span class="sp"></span><span class="small muted num">' + microDone + ' сегодня</span></h3><div class="small muted">1–2 минуты, чтобы размять поясницу и плечи после долгого сидения. Это не тренировка: напоминание можно включить в настройках.</div><button class="btn alt block mt" data-a="run-start" data-kind="micro">Начать паузу</button></div>';
  if (mv.length) h += '<div class="card"><h3>Сегодня сделано</h3><div class="list">' + mv.map(m => '<div class="item"><div class="nm"><b>' + esc(m.name) + '</b><span class="small muted">' + m.t + ' · ' + r1(m.min) + ' мин · ≈ ' + m.kcal + ' ккал</span></div><button class="star" data-a="move-del" data-id="' + m.id + '" aria-label="Удалить">' + ic('trash', 'sm') + '</button></div>').join('') + '</div><div class="tiny muted mt">Сожжённые калории только для информации: к норме еды они не добавляются.</div></div>';
  h += '<div class="card"><h3>Упражнения</h3><div class="list">' + Object.keys(Strength.SX).map(id => { const e = Strength.SX[id]; return '<div class="item" data-a="sx-info" data-id="' + id + '"><div class="nm"><b>' + esc(e.n) + '</b><span class="small muted">' + e.pat + (Strength.usable(id, inv, 99) ? '' : ' · нет инвентаря или ограничение') + '</span></div>' + ic('chevr', 'sm') + '</div>'; }).join('') + '</div></div>';
  h += '<div class="card"><h3>⚠ Остановитесь, если</h3><ul style="padding-left:18px;margin:0">' + Ex.STOP.map(s => '<li class="mb">' + esc(s) + '</li>').join('') + '</ul><div class="small muted">Не задерживайте дыхание: выдох на усилии. При таких признаках прекратите, сядьте, отдохните. Если не проходит, вызовите скорую (103/112).</div></div>';
  return h;
};
act('sx-info', el => { const e = Strength.SX[el.dataset.id]; Sheets.open('<p>' + esc(e.cue) + '</p>' + (e.flags.length ? '<div class="banner warn"><div>Если появилась боль, остановитесь: упражнение можно отключить в «Инвентаре» (колени, спина, плечо).</div></div>' : '') + '<div class="small muted">Рабочий диапазон: ' + (e.reps ? e.reps[0] + '–' + e.reps[1] + ' повторов' : e.time[0] + '–' + e.time[1] + ' секунд') + '</div>', { title: e.n }); });

/* ---------- Кардио ---------- */
function startRun(steps, kind, title) {
  const P = Store.prof(), D = Store.data(), w = curWeight(P, D);
  RUN = { steps: steps, i: 0, phase: 'work', left: steps[0].sec, paused: false, elapsed: 0, kcal: 0, kind: kind, w: w, done: false, timer: null, total: Ex.dur(steps), title: title };
  Sheets.open('<div class="runner" id="runner"></div>', { title: title, full: true, onClose: () => { if (RUN && !RUN.done) finishRun(false); } });
  runDraw(); RUN.timer = setInterval(runTick, 1000); beep(520, 120);
}
act('cardio-start', el => {
  const P = Store.prof(), D = Store.data(), inv = Strength.normInv(P.inventory), sc = Strength.stepperStatus(inv, curWeight(P, D)), min = +el.dataset.min || 20;
  const go = useStep => startRun(Ex.buildCardio(min, useStep), 'cardio', useStep ? 'Степпер' : 'Быстрая ходьба');
  if (sc.ok) { Sheets.open((sc.warn ? '<div class="banner warn"><div>' + esc(sc.warn) + '</div></div>' : '') + '<div class="small muted mb">Держитесь за устойчивую опору (стол, дверной косяк). Нагрузка 6–7 из 10.</div><button class="btn block" data-a="cardio-go" data-s="1" data-min="' + min + '">Степпер</button><button class="btn ghost block mt" data-a="cardio-go" data-s="0" data-min="' + min + '">Ходьба вместо степпера</button>', { title: 'Кардио ' + min + ' мин' }); }
  else { if (sc.reason !== 'none') toast(sc.msg, 5000); go(false); }
});
act('cardio-go', el => { Sheets.close(); const m = +el.dataset.min; startRun(Ex.buildCardio(m, el.dataset.s === '1'), 'cardio', el.dataset.s === '1' ? 'Степпер' : 'Быстрая ходьба'); });

/* ---------- Силовая тренировка ---------- */
let SS = null;
act('ss-start', el => {
  const P = Store.prof(), D = Store.data(), gate = moveGate(D);
  if (gate.bm.mode !== 'ok') return toast('Сейчас силовые недоступны из-за давления');
  const type = el.dataset.type, wk = Strength.weekNo(D.strength.start || dkey(), dkey());
  const plan = Strength.todayPlan(D.strength.start, dkey(), gate.eff), half = plan.half;
  let list = Strength.planSession(type, P.inventory, wk, D.strength, D.strength.base);
  if (half) list.forEach(x => { x.sets = Math.max(1, x.sets - 1); });
  SS = { type: type, wk: wk, list: list, i: 0, setIdx: 0, sets: {}, cur: null, phase: 'check', felt: null, t0: Date.now(), rest: null, timer: null, warmDone: false };
  Sheets.open('<div id="ssroot"></div>', { title: 'Силовая ' + type, full: true, onClose: () => { ssStop(); } });
  ssDraw();
});
function ssStop() {
  if (!SS) return; clearInterval(SS.timer); const s = SS; SS = null;
  const did = Object.keys(s.sets).filter(id => s.sets[id].length);
  if (did.length) ssSave(s);
}
function ssSave(s) {
  const P = Store.prof(), D = Store.data(), inv = Strength.normInv(P.inventory), min = Math.max(1, Math.round((Date.now() - s.t0) / 60000));
  const exs = s.list.filter(x => s.sets[x.id] && s.sets[x.id].length).map(x => { const o = { id: x.id, sets: s.sets[x.id] }; if (x.kind === 'level') o.level = x.level; if (x.kind === 'band') o.band = x.band; return o; });
  const first = !D.strength.start; if (first) D.strength.start = dkey();
  D.strength.sessions.push({ id: uid(), d: dkey(), type: s.type, wk: s.wk, min: min, felt: s.felt, exs: exs });
  logMove('strength', 'Силовая ' + s.type, min, Strength.kcal(min, curWeight(P, D)));
  Store.save(); setTimeout(() => { toast('Тренировка записана: ' + min + ' мин'); rerender(); }, 100);
}
function ssCur() { const ex = SS.list[SS.i]; if (!SS.cur || SS.cur.id !== ex.id) { const prev = (SS.sets[ex.id] || []).slice(-1)[0]; SS.cur = { id: ex.id, w: prev ? prev.w : ex.w, level: ex.level, band: ex.band, r: prev ? prev.r : (ex.time ? ex.time[0] : ex.reps[0] + 2), rir: 2 }; } return SS.cur; }
function ssDraw() {
  const root = $('#ssroot'); if (!root || !SS) return;
  const P = Store.prof();
  if (SS.phase === 'check') {
    root.innerHTML = '<div class="b" style="font-size:20px">Как самочувствие?</div><div class="small muted mb">Честный ответ определяет нагрузку. Последние замеры давления: перед силовой желательно мерить, если прошло больше 6 часов.</div>' +
      '<button class="btn block mb" data-a="ss-felt" data-v="good">Хорошо</button><button class="btn alt block mb" data-a="ss-felt" data-v="meh">Так себе: объём меньше</button><button class="btn danger block mb" data-a="ss-felt" data-v="bad">Плохо: сегодня только ходьба</button>';
    return;
  }
  if (SS.phase === 'warm') {
    const ids = ['shoulders', 'twist', 'arms_up', 'heel_toe'];
    root.innerHTML = '<div class="b" style="font-size:20px">Разминка 3 минуты</div><div class="small muted mb">Не пропускайте: суставы и давление скажут спасибо.</div><div class="card flat">' + ids.map(id => '<div class="step"><div class="n">•</div><div class="grow"><b>' + esc(Ex.BY[id].n) + '</b><div class="small muted">' + esc(Ex.BY[id].d) + '</div></div></div>').join('') + '</div><button class="btn block mt" data-a="ss-warm-done">Разминка выполнена</button>';
    return;
  }
  if (SS.phase === 'rest') {
    const nx = SS.list[SS.i];
    root.innerHTML = '<div class="small muted center">Отдых</div><div class="resttimer num">' + Math.floor(SS.rest / 60) + ':' + pad(SS.rest % 60) + '</div><div class="center small muted mb">Дальше: ' + esc(nx.name) + ', подход ' + (SS.setIdx + 1) + ' из ' + nx.sets + '</div><button class="btn block" data-a="ss-rest-skip">Пропустить отдых</button><button class="btn ghost block mt" data-a="ss-finish">Закончить тренировку</button>';
    return;
  }
  const ex = SS.list[SS.i], c = ssCur(), sx = Strength.SX[ex.id], done = SS.sets[ex.id] || [], isTime = !!ex.time;
  const wLabel = ex.kind === 'level' ? ex.levels && ex.levels[c.level] || sx.levels[c.level] : ex.kind === 'band' ? 'усилие ' + c.band + ' из 5' : (ex.kind === 'db' || ex.kind === 'bwdb' || ex.kind === 'dbtime') ? (c.w ? c.w + ' кг' : 'свой вес') : 'свой вес';
  const wCtl = ['db', 'bwdb', 'dbtime', 'level', 'band'].indexOf(ex.kind) >= 0;
  root.innerHTML = '<div class="small muted">Упражнение ' + (SS.i + 1) + ' из ' + SS.list.length + ' · подход ' + (SS.setIdx + 1) + ' из ' + ex.sets + '</div>' +
    '<div class="b" style="font-size:22px;margin:6px 0">' + esc(ex.name) + '</div>' +
    '<div class="small muted mb">Цель: ' + (isTime ? ex.time[0] + '–' + ex.time[1] + ' сек' : ex.reps[0] + '–' + ex.reps[1] + ' повторов') + ' · запас 2–3 повтора. Выдох на усилии.</div>' +
    '<div class="card flat small">' + esc(ex.cue) + (ex.hint ? '<div class="mt b">' + esc(ex.hint) + '</div>' : '') + '</div>' +
    (wCtl ? '<div class="small muted center mt">' + (ex.kind === 'level' ? 'Опора' : ex.kind === 'band' ? 'Резинка' : 'Вес гантели') + '</div><div class="stepper"><button class="btn alt" data-a="ss-w" data-d="-1">−</button><div class="v" style="font-size:22px">' + esc(wLabel) + '</div><button class="btn alt" data-a="ss-w" data-d="1">+</button></div>' : '') +
    '<div class="small muted center">' + (isTime ? 'Секунд' : 'Повторов') + '</div><div class="stepper"><button class="btn alt" data-a="ss-r" data-d="-1">−</button><div class="v">' + c.r + '</div><button class="btn alt" data-a="ss-r" data-d="1">+</button></div>' +
    '<div class="small muted center mb">Сколько повторов ещё могли бы сделать</div><div class="rirrow">' + [[0, '0'], [1, '1'], [2, '2'], [3, '3+']].map(x => '<button class="' + (c.rir === x[0] ? 'on' : '') + '" data-a="ss-rir" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
    (done.length ? '<div class="setchips">' + done.map((s, i) => '<span>' + (i + 1) + ': ' + (s.w ? s.w + ' кг × ' : '') + s.r + '</span>').join('') + '</div>' : '') +
    '<button class="btn block mt" data-a="ss-set">Подход выполнен</button><div class="row mt wrap"><button class="btn ghost sm" data-a="ss-pain">Больно</button><button class="btn ghost sm" data-a="ss-skip">Пропустить</button><button class="btn ghost sm" data-a="ss-finish">Закончить</button></div>';
}
act('ss-felt', el => {
  const v = el.dataset.v;
  if (v === 'bad') { SS.felt = v; Sheets.close(); toast('Сегодня только ходьба и лёгкая мобильность. Силовая подождёт.', 4500); return; }
  SS.felt = v; if (v === 'meh') SS.list.forEach(x => { x.sets = Math.max(1, x.sets - 1); });
  SS.phase = 'warm'; ssDraw();
});
act('ss-warm-done', () => { SS.phase = 'ex'; ssDraw(); });
act('ss-w', el => {
  const ex = SS.list[SS.i], c = ssCur(), d = +el.dataset.d, P = Store.prof(), inv = Strength.normInv(P.inventory), sx = Strength.SX[ex.id];
  if (ex.kind === 'level') c.level = clamp(c.level + d, 0, sx.levels.length - 1);
  else if (ex.kind === 'band') c.band = clamp(c.band + d, 1, 5);
  else { const cur = c.w || 0; if (cur === 0 && d > 0) c.w = Strength.weights(inv)[0]; else if (cur === Strength.weights(inv)[0] && d < 0 && ex.kind !== 'db' && ex.kind !== 'dbtime') c.w = 0; else { const n = Strength.step(inv, cur, d); if (n != null) c.w = n; } }
  ssDraw();
});
act('ss-r', el => { const c = ssCur(), ex = SS.list[SS.i], st = ex.time ? 5 : 1; c.r = clamp(c.r + +el.dataset.d * st, 1, 99); ssDraw(); });
act('ss-rir', el => { ssCur().rir = +el.dataset.v; ssDraw(); });
act('ss-set', () => {
  const ex = SS.list[SS.i], c = ssCur();
  (SS.sets[ex.id] = SS.sets[ex.id] || []).push({ w: c.w || 0, r: c.r, rir: c.rir });
  if (SS.sets[ex.id].length >= ex.sets) { SS.i++; SS.setIdx = 0; SS.cur = null; if (SS.i >= SS.list.length) return ssFinishScreen(); }
  else SS.setIdx = SS.sets[ex.id].length;
  ssRest(75);
});
function ssRest(sec) {
  SS.phase = 'rest'; SS.rest = sec; clearInterval(SS.timer);
  SS.timer = setInterval(() => { if (!SS) return; SS.rest--; if (SS.rest <= 0) { clearInterval(SS.timer); beep(780, 250); if (navigator.vibrate) navigator.vibrate([150, 80, 150]); SS.phase = 'ex'; } ssDraw(); }, 1000);
  ssDraw();
}
act('ss-rest-skip', () => { clearInterval(SS.timer); SS.phase = 'ex'; ssDraw(); });
act('ss-skip', () => { SS.i++; SS.setIdx = 0; SS.cur = null; if (SS.i >= SS.list.length) return ssFinishScreen(); ssDraw(); });
act('ss-pain', () => {
  const ex = SS.list[SS.i], sx = Strength.SX[ex.id], fl = sx.flags[0], nm = { knee: 'колени', back: 'спина', shoulder: 'плечо' }[fl];
  Sheets.open('<div class="small muted mb">Остановите упражнение. Острая боль в суставе или спине — повод не продолжать.</div><button class="btn block" data-a="ss-pain-skip">Пропустить упражнение</button>' + (fl ? '<button class="btn ghost block mt" data-a="ss-pain-limit" data-f="' + fl + '">Пропустить и больше не предлагать упражнения, нагружающие: ' + nm + '</button>' : ''), { title: 'Больно' });
});
act('ss-pain-skip', () => { Sheets.close(); ACT['ss-skip'](); });
act('ss-pain-limit', el => { const P = Store.prof(); P.inventory = Strength.normInv(P.inventory); P.inventory.limits[el.dataset.f] = true; Store.save(); Sheets.close(); toast('Ограничение сохранено, его можно снять в «Инвентаре»'); ACT['ss-skip'](); });
act('ss-finish', () => { if (!SS) return; Sheets.close(); });
function ssFinishScreen() {
  clearInterval(SS.timer); const s = SS; const total = Object.keys(s.sets).reduce((a, id) => a + s.sets[id].length, 0);
  SS = null; ssSave(s); Sheets.closeAll();
  celebrate('🏋', 'Тренировка выполнена', total + ' подходов. Следующая тренировка по плану. Отдыхайте, пейте воду.', 'Отлично');
}

/* ---------- Проверка силы ---------- */
act('test-open', () => {
  const P = Store.prof(), inv = Strength.normInv(P.inventory), ws = Strength.weights(inv), sx = Strength.SX.pushup;
  Sheets.open('<div class="small muted mb">Не на максимум: цель — понять уровень. Отдыхайте между пунктами 2 минуты. Если плохо себя чувствуете, отложите.</div>' +
    '<div class="card flat"><b>1. Вставание со стула за 30 секунд</b><div class="small muted">Устойчивый стул, руки скрещены на груди. Считайте полные вставания.</div><div class="row mt"><button class="btn alt" data-a="sts-timer">Запустить 30 секунд</button><div class="grow center b" id="stsT" style="font-size:24px"></div></div><label class="f">Результат, раз</label><input id="t1" type="number" inputmode="numeric"></div>' +
    '<div class="card flat"><b>2. Отжимания от опоры</b><div class="small muted">Выберите опору, на которой можете сделать 8–15 повторов с хорошей техникой.</div><label class="f">Опора</label><select id="t2l">' + sx.levels.map((l, i) => '<option value="' + i + '">' + l + '</option>').join('') + '</select><label class="f">Сколько повторов получилось</label><input id="t2" type="number" inputmode="numeric"></div>' +
    '<div class="card flat"><b>3. Присед с гантелью у груди до стула</b><div class="small muted">Выберите вес, с которым получилось 12 повторов, сохраняя запас 3 повтора.</div><label class="f">Вес гантели, кг</label><select id="t3">' + ws.map(w => '<option value="' + w + '">' + w + '</option>').join('') + '</select></div>' +
    '<button class="btn block" data-a="test-save">Сохранить результаты</button>', { title: 'Проверка силы' });
});
let stsTm = null;
act('sts-timer', () => {
  clearInterval(stsTm); let left = 30; const el = () => $('#stsT'); if (el()) el().textContent = left; beep(520, 150);
  stsTm = setInterval(() => { left--; if (el()) el().textContent = left > 0 ? left : 'Стоп!'; if (left <= 0) { clearInterval(stsTm); beep(880, 400); if (navigator.vibrate) navigator.vibrate([300, 100, 300]); } }, 1000);
});
act('test-save', () => {
  clearInterval(stsTm);
  const sts = nval('t1'), lv = +val('t2l'), pr = nval('t2'), gb = nval('t3');
  if (!(sts >= 0 && sts <= 60)) return toast('Введите результат вставания со стула');
  if (!(pr >= 0 && pr <= 60)) return toast('Введите число отжиманий');
  const D = Store.data(), t = { id: uid(), d: dkey(), sts: sts, pushLevel: lv, pushReps: pr, goblet: gb };
  D.strength.tests.push(t);
  D.strength.base = { goblet: gb, pushLevel: pr >= 12 ? Math.min(lv + 1, 3) : (pr < 6 ? Math.max(lv - 1, 0) : lv) };
  if (!D.strength.start) D.strength.start = weekStart(dkey());
  Store.save(); Sheets.close(); toast('Результаты сохранены. Программа настроена.'); rerender();
});

/* ---------- Инвентарь ---------- */
act('inv-open', () => {
  const P = Store.prof(), inv = Strength.normInv(P.inventory), D = Store.data(), sc = Strength.stepperStatus(inv, curWeight(P, D));
  Sheets.open('<div class="b">Гантели (сборные)</div><div class="three"><div><label class="f">Минимум, кг</label><input id="i1" type="number" inputmode="decimal" step="0.5" value="' + inv.db.min + '"></div><div><label class="f">Максимум, кг</label><input id="i2" type="number" inputmode="decimal" step="0.5" value="' + inv.db.max + '"></div><div><label class="f">Шаг, кг</label><input id="i3" type="number" inputmode="decimal" step="0.25" value="' + inv.db.step + '"></div></div>' +
    '<div class="tiny muted">Вес одной гантели. Программа расставит веса только из этого набора.</div>' +
    '<div class="b mt2">Резинки</div><select id="ib"><option value="no"' + (inv.band === 'no' ? ' selected' : '') + '>Нет</option><option value="ordered"' + (inv.band === 'ordered' ? ' selected' : '') + '>Заказаны</option><option value="yes"' + (inv.band === 'yes' ? ' selected' : '') + '>Есть (трубчатые с ручками, петля, якорь)</option></select>' +
    '<div class="tiny muted">Пока резинок нет, их упражнения заменены упражнениями с гантелями.</div>' +
    '<div class="b mt2">Степпер (гидравлический, две педали)</div><label class="row mb" style="gap:12px"><span class="sw"><input type="checkbox" id="is0"' + (inv.stepper.have ? ' checked' : '') + '><i></i></span><span>Есть степпер</span></label><div class="two"><div><label class="f">Допустимый вес пользователя, кг (из паспорта)</label><input id="is1" type="number" inputmode="numeric" value="' + (inv.stepper.limit || '') + '"></div><div><label class="f">Уровней сложности</label><input id="is2" type="number" inputmode="numeric" value="' + inv.stepper.levels + '"></div></div>' +
    (sc.ok ? '' : '<div class="banner ' + (sc.reason === 'weight' ? 'bad' : 'warn') + '"><div>' + esc(sc.msg) + '</div></div>') + (sc.warn ? '<div class="banner warn"><div>' + esc(sc.warn) + '</div></div>' : '') +
    '<div class="b mt2">Дом и тело</div><label class="row mb" style="gap:12px"><span class="sw"><input type="checkbox" id="if"' + (inv.floorOk ? ' checked' : '') + '><i></i></span><span class="grow">Легко встаю с пола (упражнения на полу)</span></label>' +
    '<div class="small muted mb">Отключить упражнения, нагружающие:</div>' + [['knee', 'колени'], ['back', 'поясницу'], ['shoulder', 'плечи']].map(l => '<label class="row mb" style="gap:12px"><span class="sw"><input type="checkbox" class="il" value="' + l[0] + '"' + (inv.limits[l[0]] ? ' checked' : '') + '><i></i></span><span>' + l[1] + '</span></label>').join('') +
    '<button class="btn block mt2" data-a="inv-save">Сохранить</button>', { title: 'Инвентарь' });
});
act('inv-save', () => {
  const P = Store.prof(), mn = nval('i1'), mx = nval('i2'), st = nval('i3');
  if (!(mn > 0 && mx >= mn && st > 0)) return toast('Проверьте вес гантелей: минимум, максимум и шаг');
  const lim = {}; $$('.il').forEach(c => { lim[c.value] = c.checked; });
  P.inventory = Strength.normInv({ db: { min: mn, max: mx, step: st }, band: val('ib'), stepper: { have: $('#is0').checked, limit: nval('is1') > 0 ? nval('is1') : null, levels: nval('is2') > 0 ? nval('is2') : 8 }, floorOk: $('#if').checked, limits: lim });
  Store.save(); Sheets.close(); toast('Инвентарь сохранён. Нагрузка пересчитана.'); rerender();
});

/* ---------- Прогресс: сила ---------- */
function progPower(P, D) {
  const st = D.strength, tests = st.tests.slice().sort((a, b) => a.d < b.d ? -1 : 1);
  let h = '<div class="card"><div class="stat"><div><b class="num">' + st.sessions.length + '</b><span>силовых</span></div><div><b class="num">' + (tests.length ? tests[tests.length - 1].sts : '—') + '</b><span>вставаний за 30 с</span></div><div><b class="num">' + (tests.length > 1 ? (tests[tests.length - 1].sts - tests[0].sts >= 0 ? '+' : '') + (tests[tests.length - 1].sts - tests[0].sts) : '—') + '</b><span>к первому тесту</span></div></div><button class="btn block" data-a="test-open">Пройти проверку силы</button><div class="tiny muted mt">Повторяйте раз в 4 недели: вы увидите рост силы, даже когда вес на весах стоит.</div></div>';
  if (tests.length) h += '<div class="card"><h3>Вставание со стула за 30 секунд</h3>' + lineChart({ series: [{ pts: tests.map(t => [t.d, t.sts]), color: 'var(--pri)' }], dec: 0, label: 'График теста' }) + '</div>';
  const best = {};
  st.sessions.forEach(s => (s.exs || []).forEach(e => { e.sets.forEach(x => { const b = best[e.id]; if (x.w > 0 && (!b || x.w > b.w || (x.w === b.w && x.r > b.r))) best[e.id] = { w: x.w, r: x.r, d: s.d }; }); }));
  const ids = Object.keys(best);
  h += '<div class="card"><h3>Рекорды</h3>' + (ids.length ? '<table class="t">' + ids.map(id => '<tr><td>' + esc(Strength.SX[id] ? Strength.SX[id].n : id) + '</td><td class="num" style="text-align:right"><b>' + best[id].w + ' кг × ' + best[id].r + '</b><div class="tiny muted">' + fmtD(best[id].d) + '</div></td></tr>').join('') + '</table>' : '<div class="empty small">Рекорды появятся после первых силовых</div>') + '</div>';
  h += '<div class="card"><h3>История тренировок</h3>' + (st.sessions.length ? '<div class="list">' + st.sessions.slice().reverse().slice(0, 20).map(s => '<div class="item"><div class="nm"><b>Силовая ' + s.type + ' · ' + s.min + ' мин</b><span class="small muted">' + fmtDW(s.d) + ' · неделя ' + s.wk + '</span></div></div>').join('') + '</div>' : '<div class="empty small">Пока нет тренировок</div>') + '</div>';
  return h;
}
