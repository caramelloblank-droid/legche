/* Привычки, серии, очки, достижения, челленджи. Всё считается из данных заново: нельзя «накрутить» и ничего не рассинхронизируется. */
const Game = (function () {
  const TITLES = ['Новичок', 'Первые шаги', 'Набираю ход', 'Появилась привычка', 'Стабильность', 'Уверенный ход', 'Лёгкая походка', 'Мастер привычек', 'Железная воля', 'Легенда'];
  const lvlOf = xp => Math.max(1, Math.floor((1 + Math.sqrt(1 + 4 * xp / 50)) / 2));
  const thr = n => 50 * n * (n - 1);

  function weightAt(P, D, k) {
    let w = P.startWeight;
    for (const e of D.weight) { if (e.d <= k) w = e.w; else break; }
    return w;
  }
  function sortData(D) { D.weight.sort((a, b) => a.d < b.d ? -1 : 1); }

  function dayStat(P, D, k) {
    const fe = D.food[k] || [], mv = D.moves[k] || [];
    let kcal = 0, p = 0, f = 0, c = 0;
    fe.forEach(e => { kcal += e.k; p += e.p; f += e.f; c += e.c; });
    const w = weightAt(P, D, k), goal = Calc.waterGoal(w), water = D.water[k] || 0;
    const mins = mv.reduce((a, m) => a + (m.min || 0), 0);
    const floor = Calc.FLOOR[P.sex] || 1200;
    const food = fe.length >= 1 && kcal >= floor * 0.75;
    const waterOk = water >= goal * 0.8, move = mins >= 5;
    const per = typeof Periods !== 'undefined' ? Periods.at(D, k) : null;
    const feast = !!per && per.type === 'feast', neutral = !!per && per.type !== 'feast';
    return { k, kcal, p, f, c, n: fe.length, water, goal, waterOk, mins, move, food, complete: feast || (food && waterOk && move), moves: mv.length, feast, neutral };
  }

  function streakInfo(P, D, today, stat) {
    let streak = 0; const used = {};
    if (stat(today).complete) streak++;
    let k = addDays(today, -1);
    while (k >= P.createdAt) {
      if (stat(k).complete) streak++;
      else if (stat(k).neutral) { /* поездка, болезнь, пауза: день не засчитывается и не прерывает серию */ }
      else { const wk = weekStart(k); if (!used[wk]) used[wk] = 1; else break; }
      k = addDays(k, -1);
    }
    return { streak, freezeLeft: !used[weekStart(today)] };
  }

  const CH = [
    { id: 'water5', t: 'Вода в норме 5 дней', goal: 5, f: (ds) => ds.filter(s => s.waterOk).length },
    { id: 'move5', t: 'Движение 5 дней (от 5 минут)', goal: 5, f: ds => ds.filter(s => s.move).length },
    { id: 'log7', t: 'Дневник питания все 7 дней', goal: 7, f: ds => ds.filter(s => s.food).length },
    { id: 'dinner20', t: 'Ужин до 20:00, 4 дня', goal: 4, f: (ds, D) => ds.filter(s => { const d = (D.food[s.k] || []).filter(e => e.slot === 'd'); return d.length && d.every(e => !e.t || e.t <= '20:00'); }).length },
    { id: 'bp3', t: 'Измерить давление 3 дня', goal: 3, f: (ds, D) => new Set(D.bp.filter(b => ds.some(s => s.k === b.d)).map(b => b.d)).size },
    { id: 'weigh2', t: 'Взвеситься 2 раза за неделю', goal: 2, f: (ds, D) => D.weight.filter(w => ds.some(s => s.k === w.d)).length },
    { id: 'protein4', t: 'Белок ≥ 90% нормы, 4 дня', goal: 4, f: (ds, D, P) => ds.filter(s => s.food && s.p >= 0.9 * Calc.plan(P, weightAt(P, D, s.k)).protein).length },
    { id: 'nosweet4', t: 'Без сладкого 4 дня', goal: 4, f: (ds, D) => ds.filter(s => s.food && !(D.food[s.k] || []).some(e => e.cat === 'Сладкое')).length },
    { id: 'str3', t: '3 силовые тренировки за неделю', goal: 3, f: (ds, D) => (D.strength ? D.strength.sessions : []).filter(x => ds.some(s => s.k === x.d)).length },
    { id: 'move3x', t: 'Две разминки в день, 3 дня', goal: 3, f: ds => ds.filter(s => s.moves >= 2).length }
  ];
  function weekChallenges(P, D, wk, stat) {
    const ids = shuffle(CH, rng(hashStr('ch' + wk))).slice(0, 3);
    const days = []; for (let i = 0; i < 7; i++) days.push(stat(addDays(wk, i)));
    return ids.map(c => { const cur = c.f(days, D, P); return { id: c.id, t: c.t, goal: c.goal, cur: Math.min(cur, c.goal), done: cur >= c.goal }; });
  }

  const ACH = [
    { id: 'first_food', i: '🍽', n: 'Первая запись', d: 'Записать первый приём пищи', c: x => x.entries >= 1 },
    { id: 'log100', i: '📒', n: '100 записей', d: '100 записей в дневнике питания', c: x => x.entries >= 100 },
    { id: 'streak3', i: '🔥', n: 'Серия 3 дня', d: 'Три дня с выполненными привычками', c: x => x.best >= 3 },
    { id: 'streak7', i: '🔥', n: 'Серия 7 дней', d: 'Неделя подряд', c: x => x.best >= 7 },
    { id: 'streak14', i: '🔥', n: 'Серия 14 дней', d: 'Две недели подряд', c: x => x.best >= 14 },
    { id: 'streak30', i: '🏅', n: 'Серия 30 дней', d: 'Месяц подряд', c: x => x.best >= 30 },
    { id: 'streak60', i: '🏆', n: 'Серия 60 дней', d: 'Два месяца подряд', c: x => x.best >= 60 },
    { id: 'water7', i: '💧', n: '7 дней воды', d: 'Норма воды выполнена 7 раз', c: x => x.waterDays >= 7 },
    { id: 'water30', i: '🌊', n: '30 дней воды', d: 'Норма воды выполнена 30 раз', c: x => x.waterDays >= 30 },
    { id: 'move10', i: '👟', n: '10 тренировок', d: '10 дней с движением от 5 минут', c: x => x.moveDays >= 10 },
    { id: 'move50', i: '🚶', n: '50 дней движения', d: '50 дней с движением от 5 минут', c: x => x.moveDays >= 50 },
    { id: 'perfect', i: '⭐', n: 'Идеальная неделя', d: 'Все 7 дней недели с выполненными привычками', c: x => x.perfectWeek },
    { id: 'loss2', i: '⬇', n: 'Минус 2 кг', d: 'Сглаженный вес снизился на 2 кг', c: x => x.loss >= 2 },
    { id: 'loss5', i: '⬇', n: 'Минус 5 кг', d: 'Сглаженный вес снизился на 5 кг', c: x => x.loss >= 5 },
    { id: 'loss10', i: '⬇', n: 'Минус 10 кг', d: 'Сглаженный вес снизился на 10 кг', c: x => x.loss >= 10 },
    { id: 'loss20', i: '⬇', n: 'Минус 20 кг', d: 'Сглаженный вес снизился на 20 кг', c: x => x.loss >= 20 },
    { id: 'pct5', i: '🎯', n: 'Этап −5%', d: 'Потеряно 5% стартового веса', c: x => x.lossPct >= 5 },
    { id: 'pct10', i: '🎯', n: 'Этап −10%', d: 'Потеряно 10% стартового веса', c: x => x.lossPct >= 10 },
    { id: 'pct15', i: '🎯', n: 'Этап −15%', d: 'Потеряно 15% стартового веса', c: x => x.lossPct >= 15 },
    { id: 'waist3', i: '📏', n: 'Талия −3 см', d: 'Талия уменьшилась на 3 см', c: x => x.waistDrop >= 3 },
    { id: 'waist5', i: '📏', n: 'Талия −5 см', d: 'Талия уменьшилась на 5 см', c: x => x.waistDrop >= 5 },
    { id: 'waist10', i: '📏', n: 'Талия −10 см', d: 'Талия уменьшилась на 10 см', c: x => x.waistDrop >= 10 },
    { id: 'bp_green', i: '❤', n: 'Давление в норме 2 недели', d: 'Не менее 5 замеров за 14 дней, все в зелёной зоне', c: x => x.bpGreen },
    { id: 'glu_green', i: '🩸', n: 'Сахар в норме 2 недели', d: 'Не менее 5 замеров за 14 дней, все в зелёной зоне', c: x => x.gluGreen },
    { id: 'str_test', i: '🧪', n: 'Первая проверка силы', d: 'Пройти стартовую проверку силы', c: x => x.tests >= 1 },
    { id: 'str10', i: '🏋', n: '10 силовых', d: 'Провести 10 силовых тренировок', c: x => x.strSessions >= 10 },
    { id: 'str30', i: '🏋', n: '30 силовых', d: 'Провести 30 силовых тренировок', c: x => x.strSessions >= 30 },
    { id: 'sts5', i: '🪑', n: 'Вставание со стула +5', d: 'Улучшить результат теста «вставание со стула» на 5 раз', c: x => x.stsGain >= 5 },
    { id: 'ch1', i: '🎲', n: 'Первый челлендж', d: 'Выполнить недельный челлендж', c: x => x.chDone >= 1 },
    { id: 'ch10', i: '🎖', n: '10 челленджей', d: 'Выполнить 10 недельных челленджей', c: x => x.chDone >= 10 }
  ];

  const cache = {};
  function compute(P, D, today) {
    today = today || dkey();
    const ck = P.id + '|' + today;
    if (cache[ck] && cache[ck].rev === Store.rev) return cache[ck].v;
    sortData(D);
    const statCache = {};
    const stat = k => statCache[k] || (statCache[k] = dayStat(P, D, k));
    const start = P.createdAt <= today ? P.createdAt : today;
    // дни с данными раньше даты создания тоже учитываем
    const firstData = Object.keys(D.food).concat(Object.keys(D.water), Object.keys(D.moves)).sort()[0];
    const from = firstData && firstData < start ? firstData : start;
    const days = []; for (let k = from; k <= today; k = addDays(k, 1)) days.push(k);
    let xp = 0, waterDays = 0, moveDays = 0, entries = 0, perfectWeek = false, chDone = 0;
    const wset = new Set(D.weight.map(w => w.d)), bset = new Set(D.bp.map(w => w.d)), gset = new Set(D.glu.map(w => w.d));
    const doneDates = [];
    days.forEach(k => {
      const s = stat(k);
      entries += s.n;
      if (s.waterOk) waterDays++;
      if (s.move) moveDays++;
      if (s.complete) doneDates.push(k);
      xp += Math.min(s.n, 4) * 5 + (s.waterOk ? 20 : 0) + Math.min(s.moves, 3) * 10 + (wset.has(k) ? 15 : 0) + (bset.has(k) ? 10 : 0) + (gset.has(k) ? 10 : 0) + (s.complete ? 30 : 0);
    });
    const ds = new Set(doneDates);
    for (let wk = weekStart(from); wk <= weekStart(today); wk = addDays(wk, 7)) {
      let all = true; for (let i = 0; i < 7; i++) if (!ds.has(addDays(wk, i))) all = false;
      if (all) perfectWeek = true;
      chDone += weekChallenges(P, D, wk, stat).filter(c => c.done).length;
    }
    const si = streakInfo(P, D, today, stat);
    if (si.streak > (D.best || 0)) D.best = si.streak;
    // вес
    const wUse = typeof Periods !== 'undefined' ? D.weight.filter(w => !Periods.weightExcluded(D, w.d)) : D.weight;
    const ma = Calc.movAvg(wUse.length ? wUse : D.weight);
    const curMA = ma.length ? ma[ma.length - 1].w : P.startWeight;
    const loss = Math.max(0, r1(P.startWeight - curMA));
    const lossPct = P.startWeight ? Math.max(0, r1(loss / P.startWeight * 100)) : 0;
    const waists = D.meas.filter(m => m.waist).sort((a, b) => a.d < b.d ? -1 : 1);
    const waistDrop = waists.length > 1 ? Math.max(0, r1(waists[0].waist - waists[waists.length - 1].waist)) : 0;
    const from14 = addDays(today, -14);
    const bp14 = D.bp.filter(b => b.d >= from14), gl14 = D.glu.filter(g => g.d >= from14);
    const bpGreen = bp14.length >= 5 && bp14.every(b => Calc.bpLevel(b.sys, b.dia) === 0);
    const gluGreen = gl14.length >= 5 && gl14.every(g => Calc.gluLevel(g.v, g.kind) === 0);
    const st_ = D.strength || { sessions: [], tests: [] };
    const tsts = st_.tests.slice().sort((a, b) => a.d < b.d ? -1 : 1);
    const stsGain = tsts.length > 1 ? (tsts[tsts.length - 1].sts || 0) - (tsts[0].sts || 0) : 0;
    const x = { tests: st_.tests.length, strSessions: st_.sessions.length, stsGain, entries, best: D.best || 0, waterDays, moveDays, perfectWeek, loss, lossPct, waistDrop, bpGreen, gluGreen, chDone };
    const unlocked = ACH.filter(a => a.c(x));
    const newly = [];
    unlocked.forEach(a => { if (!D.ach[a.id]) { D.ach[a.id] = today; newly.push(a); } });
    const msNew = [];
    [5, 10, 15].forEach(pc => { if (lossPct >= pc && !D.ms[pc]) { D.ms[pc] = today; msNew.push(pc); } });
    if (P.goalWeight && curMA <= P.goalWeight && !D.ms.goal) { D.ms.goal = today; msNew.push('goal'); }
    xp += Object.keys(D.ach).length * 50 + chDone * 50;
    const level = lvlOf(xp);
    const v = {
      stat, today, xp, level, title: TITLES[Math.min(level - 1, TITLES.length - 1)], lvlFrom: thr(level), lvlTo: thr(level + 1),
      streak: si.streak, freezeLeft: si.freezeLeft, best: D.best, doneDates, ma, curMA, loss, lossPct, waistDrop,
      unlocked, newly, msNew, challenges: weekChallenges(P, D, weekStart(today), stat), chDone, waterDays, moveDays, entries
    };
    cache[ck] = { rev: Store.rev, v: v };
    if (newly.length || msNew.length) { Store.save(); cache[ck] = { rev: Store.rev, v: v }; }
    return v;
  }

  function snapshot(P, D) {
    const g = compute(P, D);
    return { v: 1, name: P.name, start: P.startWeight, cur: g.curMA, pct: g.lossPct, streak: g.streak, xp: g.xp, level: g.level, done: g.doneDates.slice(-90), d: dkey() };
  }
  /** Совместная серия: подряд дней (от сегодня/вчера), когда выполнили оба */
  function jointStreak(a, b, today) {
    const A = new Set(a), B = new Set(b);
    let k = A.has(today) && B.has(today) ? today : addDays(today, -1), n = 0;
    while (A.has(k) && B.has(k)) { n++; k = addDays(k, -1); }
    return n;
  }
  return { ACH, CH, TITLES, compute, dayStat, weightAt, snapshot, jointStreak, thr };
})();
