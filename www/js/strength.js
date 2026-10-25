/* Силовая подготовка: инвентарь, подбор весов, недельная программа, прогрессия. Чистая логика без DOM. */
const Strength = (function () {
  const defInv = () => ({
    db: { min: 2, max: 10, step: 1 }, band: 'no', stepper: { have: true, limit: null, levels: 8 },
    floorOk: false, limits: { knee: false, back: false, shoulder: false }
  });
  function normInv(inv) {
    const d = defInv(); inv = inv || {};
    return { db: Object.assign(d.db, inv.db || {}), band: inv.band || d.band, stepper: Object.assign(d.stepper, inv.stepper || {}), floorOk: !!inv.floorOk, limits: Object.assign(d.limits, inv.limits || {}) };
  }
  function weights(inv) {
    const d = normInv(inv).db, out = [];
    if (!(d.step > 0)) return [d.min];
    for (let w = d.min; w <= d.max + 1e-6 && out.length < 200; w = Math.round((w + d.step) * 100) / 100) out.push(w);
    return out.length ? out : [d.min];
  }
  function snap(inv, target) {
    const ws = weights(inv); let best = ws[0];
    ws.forEach(w => { if (Math.abs(w - target) < Math.abs(best - target)) best = w; });
    return { w: best, low: target < ws[0] * 0.8, high: target > ws[ws.length - 1] * 1.15 };
  }
  const step = (inv, w, dir) => { const ws = weights(inv); let i = 0; ws.forEach((x, j) => { if (Math.abs(x - w) < Math.abs(ws[i] - w)) i = j; }); const j = i + dir; return j >= 0 && j < ws.length ? ws[j] : null; };

  /* kind: db — гантели; bwdb — свой вес или гантель; dbtime — гантели на время; level — уровень опоры; band — резинка 1–5; bw — свой вес; time — удержание */
  const SX = {
    goblet: { n: 'Присед с гантелью у груди до стула', pat: 'ноги', eq: ['db', 'chair'], coef: 1.0, reps: [8, 12], flags: ['knee'], alt: 'sit_stand', kind: 'db', cue: 'Гантель у груди двумя руками. Сядьте на край стула, коснитесь его и встаньте. Колени смотрят туда же, куда носки. Выдох при вставании, не задерживайте дыхание.' },
    sit_stand: { n: 'Вставание со стула', pat: 'ноги', eq: ['chair'], coef: 0, reps: [8, 15], flags: ['knee'], alt: null, kind: 'bw', cue: 'Сядьте на край устойчивого стула, ноги на ширине плеч. Вставайте без рывка, садитесь медленно (3 секунды).' },
    rdl: { n: 'Румынская тяга с гантелями', pat: 'тяга ногами', eq: ['db'], coef: 1.0, reps: [8, 12], flags: ['back'], alt: 'bridge', kind: 'db', cue: 'Гантели у бёдер. Таз назад, спина ровная, колени чуть согнуты. Гантели скользят вдоль ног до середины голени, затем встаньте, сжимая ягодицы.' },
    bridge: { n: 'Ягодичный мост (спина на диване)', pat: 'ягодицы', eq: ['sofa'], coef: 0.8, reps: [10, 15], flags: [], alt: null, kind: 'bwdb', cue: 'Лопатки на краю дивана, стопы на полу. Поднимите таз до прямой линии плечи–колени, задержка 1 секунда, медленно вниз.' },
    calf: { n: 'Подъёмы на носки у стены', pat: 'икры', eq: ['wall'], coef: 0, reps: [12, 20], flags: [], alt: null, kind: 'bw', cue: 'Держитесь за стену. Поднимайтесь на носки и медленно опускайтесь.' },
    press_sofa: { n: 'Жим гантелей лёжа (на диване)', pat: 'жим', eq: ['db', 'sofa'], coef: 0.5, reps: [8, 12], flags: ['shoulder'], alt: 'pushup', kind: 'db', cue: 'Лягте на диван, гантели у груди. Выжимайте вверх, не блокируя локти. Выдох при жиме.' },
    pushup: { n: 'Отжимания от опоры', pat: 'жим', eq: ['wall'], kind: 'level', levels: ['от стены', 'от столешницы', 'от стола', 'от низкой опоры'], reps: [8, 15], flags: ['shoulder'], alt: null, cue: 'Руки чуть шире плеч, корпус ровный. Опускайтесь до касания грудью опоры, выдох при отталкивании. Станет легко — переходите на опору ниже.' },
    row: { n: 'Тяга гантели в наклоне с упором', pat: 'тяга', eq: ['db', 'table'], coef: 0.6, reps: [8, 12], flags: ['back'], alt: 'band_row', kind: 'db', cue: 'Одна рука на столе, спина ровная. Тяните гантель к поясу, локоть вдоль корпуса. Выдох при тяге.' },
    band_row: { n: 'Тяга резинки сидя', pat: 'тяга', eq: ['band'], reps: [10, 15], flags: [], alt: 'row', kind: 'band', cue: 'Резинка зацеплена за опору или ноги. Тяните к поясу, сводя лопатки. Плечи вниз.' },
    curl: { n: 'Сгибания на бицепс', pat: 'руки', eq: ['db'], coef: 0.3, reps: [8, 12], flags: [], alt: null, kind: 'db', cue: 'Локти прижаты к корпусу. Поднимайте без раскачки, опускайте 2–3 секунды.' },
    triceps: { n: 'Разгибания на трицепс из-за головы', pat: 'руки', eq: ['db'], coef: 0.3, reps: [8, 12], flags: ['shoulder'], alt: null, kind: 'db', cue: 'Сидя, одна гантель двумя руками за головой. Локти вверх, выпрямляйте руки.' },
    lateral: { n: 'Махи гантелями в стороны', pat: 'плечи', eq: ['db'], coef: 0.15, reps: [10, 15], flags: ['shoulder'], alt: null, kind: 'db', cue: 'Лёгкие гантели. Поднимайте в стороны до уровня плеч, локти слегка согнуты.' },
    pallof: { n: 'Паллоф-жим с резинкой', pat: 'корпус', eq: ['band'], reps: [8, 12], flags: [], alt: 'chop_db', kind: 'band', cue: 'Резинка закреплена сбоку на уровне груди. Выжимайте руки вперёд и не давайте корпусу повернуться. Дышите ровно.' },
    chop_db: { n: '«Дровосек» с гантелью', pat: 'корпус', eq: ['db'], coef: 0.3, reps: [8, 12], flags: ['back'], alt: null, kind: 'db', cue: 'Гантель двумя руками. По диагонали сверху вниз, поворачивая корпус и стопы. Выдох при движении вниз.' },
    chop_band: { n: '«Дровосек» с резинкой', pat: 'корпус', eq: ['band'], reps: [8, 12], flags: ['back'], alt: 'chop_db', kind: 'band', cue: 'Резинка закреплена сверху. Тяните по диагонали вниз, поворачивая корпус.' },
    farmer: { n: 'Прогулка фермера', pat: 'хват, корпус', eq: ['db'], coef: 0.8, time: [30, 45], flags: [], alt: null, kind: 'dbtime', cue: 'Гантели в опущенных руках, плечи вниз. Идите ровно 30–45 секунд, корпус не заваливайте.' },
    kneeup: { n: 'Подъём колен в упоре на столешницу', pat: 'пресс', eq: ['table'], reps: [8, 15], flags: [], alt: null, kind: 'bw', cue: 'Упритесь руками в устойчивую столешницу, поочерёдно подтягивайте колени к груди.' },
    plank: { n: 'Наклонная планка от стола', pat: 'корпус', eq: ['table'], time: [15, 30], flags: ['shoulder'], alt: null, kind: 'time', cue: 'Руки на столе, тело — прямая линия. До 30 секунд, дыхание ровное.' },
    crunch: { n: 'Скручивания полулёжа на диване', pat: 'пресс', eq: ['sofa'], reps: [8, 15], flags: ['back'], minWeek: 8, alt: null, kind: 'bw', cue: 'Спина на диване под углом, руки скрещены на груди. Поднимайте плечи, поясница прижата. Выдох на подъёме, шея расслаблена.' }
  };
  const TEMPLATE = { A: ['goblet', 'press_sofa', 'row', 'bridge', 'pallof'], B: ['rdl', 'pushup', 'band_row', 'calf', 'chop_band', 'farmer'] };
  const EXTRA = { A: ['curl'], B: ['kneeup'] };
  const NEEDS = (inv) => ({ db: true, chair: true, table: true, sofa: true, wall: true, band: inv.band === 'yes', floor: !!inv.floorOk });

  function usable(id, inv, wk) {
    const ex = SX[id]; if (!ex) return false;
    inv = normInv(inv); const n = NEEDS(inv);
    if (!ex.eq.every(e => n[e])) return false;
    if (ex.flags.some(f => inv.limits[f])) return false;
    if (ex.minWeek && wk < ex.minWeek) return false;
    return true;
  }
  function resolve(id, inv, wk) {
    let cur = id, guard = 0;
    while (cur && guard++ < 5) { if (usable(cur, inv, wk)) return cur; cur = SX[cur] ? SX[cur].alt : null; }
    return null;
  }
  /* Неделя программы, блок из 8 недель, разгрузочные недели 4 и 8 */
  const weekNo = (start, today) => Math.max(1, Math.floor(diffDays(today, start) / 7) + 1);
  const blockPos = wk => ((wk - 1) % 8) + 1;
  const isDeload = wk => { const b = blockPos(wk); return b === 4 || b === 8; };
  function setsFor(wk) { const b = blockPos(wk); if (isDeload(wk)) return 2; if (wk <= 2) return 2; if (b === 3 && wk <= 8) return 3; return 3; }
  function cardioMin(wk) { return { 1: 20, 2: 20, 3: 25, 4: 20, 5: 30, 6: 35, 7: 40, 8: 25 }[blockPos(wk)]; }

  function lastRecord(hist, id) {
    const ss = (hist && hist.sessions) || [];
    for (let i = ss.length - 1; i >= 0; i--) { const e = (ss[i].exs || []).find(x => x.id === id && x.sets && x.sets.length); if (e) return e; }
    return null;
  }
  /** Подбор нагрузки на упражнение: вес / уровень опоры / уровень резинки */
  function prescribe(id, inv, wk, hist, base) {
    inv = normInv(inv); base = base || {};
    const ex = SX[id], rec = lastRecord(hist, id);
    const o = { id: id, name: ex.n, kind: ex.kind, sets: setsFor(wk), reps: ex.reps || null, time: ex.time || null, cue: ex.cue, pat: ex.pat, w: null, hint: '' };
    if (isDeload(wk)) o.hint = 'Лёгкая неделя: вес не повышайте, держите запас 3–4 повтора.';
    const top = ex.reps ? ex.reps[1] : 0, bot = ex.reps ? ex.reps[0] : 0;
    if (ex.kind === 'db' || ex.kind === 'dbtime' || ex.kind === 'bwdb') {
      if (rec) {
        const lastW = Math.max.apply(null, rec.sets.map(s => s.w || 0));
        const doneAll = ex.kind === 'dbtime' ? rec.sets.every(s => (s.r || 0) >= (ex.time ? ex.time[1] : 0)) : rec.sets.every(s => s.r >= top && (s.rir == null || s.rir >= 2));
        const fail = ex.kind !== 'dbtime' && rec.sets.some(s => s.r < bot);
        if (doneAll && !isDeload(wk)) { const n = lastW === 0 ? weights(inv)[0] : step(inv, lastW, 1); o.w = n != null ? n : lastW; if (n == null) o.hint = 'Максимальный вес из вашего набора: добавьте паузу 2 секунды внизу и работайте до 15 повторов.'; else o.hint = 'В прошлый раз всё получилось: вес повышен.'; }
        else if (fail) { const n = step(inv, lastW, -1); o.w = n != null ? n : (ex.kind === 'bwdb' ? 0 : lastW); o.hint = 'В прошлый раз было тяжело: вес снижен.'; }
        else o.w = lastW;
      } else if (ex.kind === 'bwdb') o.w = 0;
      else if (base.goblet) { const s = snap(inv, base.goblet * ex.coef); o.w = s.w; if (s.low) o.hint = 'Вес слишком тяжёл для лёгкой гантели: делайте медленно (3 секунды вниз).'; if (s.high) o.hint = 'Гантелей не хватает: делайте с паузой 2 секунды внизу, до 15 повторов.'; }
      else { o.w = weights(inv)[0]; o.hint = 'Подберите вес сами: последние 2–3 повтора должны быть трудными, но с запасом.'; }
    } else if (ex.kind === 'level') {
      let lv = rec ? (rec.level != null ? rec.level : 0) : (base.pushLevel || 0);
      if (rec) {
        if (rec.sets.every(s => s.r >= top) && lv < ex.levels.length - 1 && !isDeload(wk)) { lv++; o.hint = 'Опора ниже: станет тяжелее.'; }
        else if (rec.sets.some(s => s.r < bot) && lv > 0) { lv--; o.hint = 'Опора выше: чтобы техника была чистой.'; }
      }
      o.level = lv; o.levelName = ex.levels[lv];
    } else if (ex.kind === 'band') {
      let lv = rec && rec.band ? rec.band : 2;
      if (rec) { if (rec.sets.every(s => s.r >= top) && lv < 5 && !isDeload(wk)) lv++; else if (rec.sets.some(s => s.r < bot) && lv > 1) lv--; }
      o.band = lv;
    }
    return o;
  }
  function planSession(type, inv, wk, hist, base) {
    const ids = TEMPLATE[type].slice(); if (wk >= 5) EXTRA[type].forEach(x => ids.push(x));
    if (usable('crunch', inv, wk) && wk >= 8 && type === 'A') ids.push('crunch');
    const out = [];
    ids.forEach(id => { const r = resolve(id, inv, wk); if (r && !out.some(x => x.id === r)) out.push(prescribe(r, inv, wk, hist, base)); });
    return out;
  }
  const TYPE_BY_DOW = { 1: 'str', 2: 'cardio', 3: 'str', 4: 'rest', 5: 'str', 6: 'cardio', 0: 'rest' };
  /** Что по плану на дату */
  function todayPlan(start, k, training) {
    if (!start) return { kind: 'none', wk: 1, reason: 'Начните с проверки силы' };
    const wk = weekNo(start, k), dow = parseD(k).getDay();
    let kind = TYPE_BY_DOW[dow];
    if (training === 'none') return { kind: 'rest', wk, deload: isDeload(wk), reason: 'Сегодня без нагрузок' };
    if (training === 'walk' && kind !== 'rest') return { kind: 'walk', wk, deload: isDeload(wk), reason: 'Сегодня только ходьба и лёгкая мобильность' };
    const out = { kind: kind, wk: wk, deload: isDeload(wk), half: training === 'half' };
    if (kind === 'str') { const idx = { 1: 0, 3: 1, 5: 2 }[dow]; out.type = ((wk - 1) * 3 + idx) % 2 === 0 ? 'A' : 'B'; }
    if (kind === 'cardio') out.minutes = Math.round(cardioMin(wk) * (training === 'half' ? 0.5 : 1));
    return out;
  }
  function stepperStatus(inv, weight) {
    inv = normInv(inv); const s = inv.stepper;
    if (!s.have) return { ok: false, reason: 'none', msg: 'Степпер не отмечен в инвентаре.' };
    if (!(s.limit > 0)) return { ok: false, reason: 'unknown', msg: 'Укажите допустимый вес пользователя из паспорта степпера (в инвентаре). Пока без этого степпер отключён.' };
    if (s.limit < weight) return { ok: false, reason: 'weight', msg: 'Допустимый вес степпера (' + s.limit + ' кг) меньше вашего. Для безопасности он отключён: используйте ходьбу.' };
    if (s.limit < weight * 1.1) return { ok: true, warn: 'Запас по допустимому весу степпера меньше 10%: занимайтесь аккуратно, без рывков.' };
    return { ok: true };
  }
  const kcal = (min, w) => Math.round(3.5 * w * min / 60);
  return { SX, TEMPLATE, defInv, normInv, weights, snap, step, usable, resolve, weekNo, blockPos, isDeload, setsFor, cardioMin, prescribe, planSession, todayPlan, stepperStatus, kcal, lastRecord };
})();
if (typeof module !== 'undefined') module.exports = Strength;
