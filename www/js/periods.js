/* Особые периоды: застолье, поездка, болезнь, диетическая пауза. Чистая логика без DOM. */
const Periods = (function () {
  const TYPES = {
    feast: { n: 'Застолье', icon: '🍽', d: 'Один день без контроля калорий' },
    trip: { n: 'Поездка или отпуск', icon: '🧳', d: 'Норма равна расходу, серия заморожена' },
    sick: { n: 'Болезнь', icon: '🤒', d: 'Без нагрузок и дефицита, серия заморожена' },
    pause: { n: 'Диетическая пауза', icon: '⏸', d: 'Неделя на уровне поддержания веса' }
  };
  const PRI = { sick: 4, feast: 3, trip: 2, pause: 1 };
  const list = D => D.periods || (D.periods = []);
  const live = D => list(D).filter(p => !p.cancelled);
  function at(D, k) {
    let best = null;
    live(D).forEach(p => { if (p.from <= k && k <= p.to && (!best || PRI[p.type] > PRI[best.type])) best = p; });
    return best;
  }
  const preFeast = (D, k) => live(D).find(p => p.type === 'feast' && p.opts && p.opts.pre && k < p.from && k >= addDays(p.from, -3)) || null;
  const compDay = (D, k) => live(D).find(p => p.type === 'feast' && p.opts && p.opts.comp && k > p.to && k <= addDays(p.to, 2)) || null;
  const afterFeast = (D, k) => live(D).find(p => p.type === 'feast' && k === addDays(p.to, 1)) || null;
  /** Вес за эти дни не учитывается в тренде */
  function weightExcluded(D, k) {
    return live(D).some(p => (p.type === 'feast' ? (k >= p.from && k <= addDays(p.to, 3)) : (k > p.to && k <= addDays(p.to, 3))));
  }
  /** Дни, которые не засчитываются и не прерывают серию */
  const neutral = (D, k) => { const p = at(D, k); return !!p && p.type !== 'feast'; };
  /** Норма на день с учётом периода. base — обычная норма (с «днём с запасом»), pl — расчёт Calc.plan */
  function adjust(D, k, base, pl, softGlucose) {
    const p = at(D, k);
    if (p && p.type !== 'feast') return { target: Math.round(pl.tdee / 10) * 10, mode: p.type, period: p };
    if (p) return { target: base, hide: true, mode: 'feast', period: p };
    let t = base, mode = null;
    if (!softGlucose) {
      if (preFeast(D, k)) { t = Math.round(base * 0.95 / 10) * 10; mode = 'pre'; }
      else if (compDay(D, k)) { t = Math.round(base * 0.95 / 10) * 10; mode = 'comp'; }
    }
    t = Math.max(t, Math.min(base, pl.floor));
    return { target: t, mode: mode };
  }
  /** Допустимая нагрузка: full | half | walk | none */
  function training(D, k) {
    const p = at(D, k);
    if (p) return p.type === 'sick' ? 'none' : 'walk';
    if (afterFeast(D, k)) return 'walk';
    if (live(D).find(x => x.type === 'sick' && k > x.to && k <= addDays(x.to, 3))) return 'half';
    const long = live(D).find(x => (x.type === 'trip' || x.type === 'pause') && k > x.to && k <= addDays(x.to, 1) && diffDays(x.to, x.from) > 14);
    if (long) return 'half';
    return 'full';
  }
  function create(D, type, from, to, opts) {
    const p = { id: uid(), type: type, from: from, to: type === 'feast' ? from : to, opts: opts || {}, created: dkey() };
    list(D).push(p); return p;
  }
  function feastsInWeek(D, k) {
    const w = weekStart(k), e = addDays(w, 6);
    return live(D).filter(p => p.type === 'feast' && p.from >= w && p.from <= e).length;
  }
  /** Застолье прошло, а итог ещё не показывали */
  function pendingReview(D, today) {
    return live(D).find(p => p.type === 'feast' && p.to < today && !p.ack && today <= addDays(p.to, 3)) || null;
  }
  function next(D, today) { return live(D).filter(p => p.to >= today).sort((a, b) => a.from < b.from ? -1 : 1)[0] || null; }
  const MSG = {
    feast: ['Не приходите голодным: нормальный завтрак и обед, особенно белок.', 'Начинайте с овощей и белка, потом остальное.', 'Между напитками пейте воду.', 'Алкоголь может взаимодействовать с лекарствами от давления и сахара: уточните у врача или фармацевта.'],
    review: 'Один день не отменяет вашей работы. Даже +2500 ккал сверх нормы — это примерно 0,3 кг жира, остальное вода и соль, они уйдут за 2–5 дней. Возвращайтесь к плану со следующего приёма пищи. Голодать «в отработку» не нужно.'
  };
  return { TYPES, at, preFeast, compDay, afterFeast, weightExcluded, neutral, adjust, training, create, feastsInWeek, pendingReview, next, MSG, live, list };
})();
if (typeof module !== 'undefined') module.exports = Periods;
