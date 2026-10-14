/* Расчёты: калории, макросы, вода, вес, давление, глюкоза. Чистые функции без DOM. */
const Calc = (function () {
  const FLOOR = { m: 1500, f: 1200 };
  const ACT = [
    { k: 1.2, n: 'Сидячий образ жизни' },
    { k: 1.375, n: 'Лёгкая активность (1–3 тренировки в неделю)' },
    { k: 1.55, n: 'Умеренная (3–5 тренировок)' },
    { k: 1.725, n: 'Высокая (ежедневный спорт)' }
  ];
  const bmr = (sex, w, h, age) => 10 * w + 6.25 * h - 5 * age + (sex === 'm' ? 5 : -161);
  const bmi = (w, h) => w / Math.pow(h / 100, 2);
  function refWeight(w, h) { const ideal = 25 * Math.pow(h / 100, 2); return w > ideal ? ideal + 0.25 * (w - ideal) : w; }
  const waterGoal = w => clamp(Math.round(w * 30 / 50) * 50, 1500, 3000);

  /** Главный расчёт плана. p: {sex, age, height, activity, deficitPct}; w — текущий вес. */
  function plan(p, w, opts) {
    opts = opts || {};
    const b = bmr(p.sex, w, p.height, p.age);
    const tdee = b * p.activity;
    let pct = clamp(p.deficitPct == null ? 20 : p.deficitPct, 0, 25);
    if (opts.softDeficit) pct = Math.min(pct, 10);
    const floor = FLOOR[p.sex] || 1200;
    let deficit = Math.min(tdee * pct / 100, 1000);
    let target = tdee - deficit;
    let floored = false;
    if (target < floor) { target = Math.min(floor, tdee); floored = true; }
    target = Math.round(target / 10) * 10;
    deficit = Math.max(0, Math.round(tdee - target));
    const ref = refWeight(w, p.height);
    const protein = Math.round(clamp(1.6 * ref, 0.20 * target / 4, 0.35 * target / 4));
    const fat = Math.round(0.30 * target / 9);
    const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));
    return {
      bmr: Math.round(b), tdee: Math.round(tdee), target, deficit, floor, floored, pct,
      protein, fat, carbs, fiber: Math.round(14 * target / 1000),
      water: waterGoal(w), bmi: r1(bmi(w, p.height)),
      lossKgWeek: r1(deficit * 7 / 7700)
    };
  }

  const stages = start => [5, 10, 15].map(pc => ({ pct: pc, weight: r1(start * (1 - pc / 100)) }));

  /** Скользящее среднее за 7 дней по записям [{d, w}] (отсортированы по дате). */
  function movAvg(ws) {
    return ws.map(e => {
      const from = addDays(e.d, -6);
      const win = ws.filter(x => x.d >= from && x.d <= e.d);
      return { d: e.d, w: r1(win.reduce((s, x) => s + x.w, 0) / win.length) };
    });
  }
  /** Тренд (кг/день) по сглаженному ряду за последние 28 дней; null если данных мало. */
  function slope(ma) {
    if (ma.length < 3) return null;
    const last = ma[ma.length - 1].d;
    const pts = ma.filter(x => diffDays(last, x.d) <= 28);
    if (pts.length < 3 || diffDays(pts[pts.length - 1].d, pts[0].d) < 7) return null;
    const x0 = pts[0].d, xs = pts.map(x => diffDays(x.d, x0)), ys = pts.map(x => x.w);
    const n = pts.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let num_ = 0, den = 0;
    for (let i = 0; i < n; i++) { num_ += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) * (xs[i] - mx); }
    return den ? num_ / den : null;
  }
  function forecast(ma, goal) {
    const s = slope(ma); if (s == null || s >= -0.005) return null;
    const cur = ma[ma.length - 1].w; if (cur <= goal) return { days: 0, date: ma[ma.length - 1].d };
    const days = Math.ceil((cur - goal) / -s);
    if (days > 900) return { far: true };
    return { days, date: addDays(dkey(), days) };
  }

  /* Давление */
  function bpLevel(sys, dia) {
    if (sys >= 180 || dia >= 120) return 3;
    if (sys >= 140 || dia >= 90) return 2;
    if (sys < 90 || dia < 60) return 1;
    if (sys >= 130 || dia >= 85) return 1;
    return 0;
  }
  const bpLabel = l => ['В норме', 'Внимание', 'Повышено', 'Опасно высокое'][l];
  /** Режим нагрузок по последним замерам. */
  function bpMode(list, nowMs) {
    const arr = list.filter(x => x.ts).sort((a, b) => a.ts - b.ts);
    if (!arr.length) return { mode: 'ok' };
    const last = arr[arr.length - 1], age = (nowMs - last.ts) / 3600e3;
    const lv = bpLevel(last.sys, last.dia);
    if (lv === 3 && age < 6) return { mode: 'stop', msg: 'Давление ' + last.sys + '/' + last.dia + ' — опасно высокое. Нагрузки отменены. Сядьте, отдохните и перемерьте через 15 минут. Если есть боль в груди, одышка или сильная головная боль — вызывайте скорую (103/112).' };
    if (arr.length >= 2) {
      const prev = arr[arr.length - 2];
      if (lv >= 2 && bpLevel(prev.sys, prev.dia) >= 2 && age < 24 && (nowMs - prev.ts) / 3600e3 < 24)
        return { mode: 'light', msg: 'Два замера подряд ≥140/90. Сегодня только разминка сидя и спокойная ходьба.' };
    }
    if (last.sys < 90 || last.dia < 60) { if (age < 6) return { mode: 'seated', msg: 'Давление пониженное (' + last.sys + '/' + last.dia + '). Только лёгкие упражнения сидя, вставайте медленно.' }; }
    return { mode: 'ok' };
  }

  /* Глюкоза, ммоль/л. kind: 'fasting' | 'after' */
  function gluLevel(v, kind) {
    if (v < 3.9) return 2;
    if (kind === 'after') return v < 7.8 ? 0 : (v < 11.1 ? 1 : 2);
    return v <= 5.5 ? 0 : (v < 7.0 ? 1 : 2);
  }
  const gluLabel = l => ['В норме', 'Повышено', 'Вне нормы'][l];
  function gluSoft(list, todayKey) {
    const from = addDays(todayKey, -14);
    return list.some(g => g.d >= from && (g.v < 3.9 || (g.kind === 'fasting' && g.v >= 7.0)));
  }

  return { FLOOR, ACT, bmr, bmi, refWeight, waterGoal, plan, stages, movAvg, slope, forecast, bpLevel, bpLabel, bpMode, gluLevel, gluLabel, gluSoft };
})();
if (typeof module !== 'undefined') module.exports = Calc;
