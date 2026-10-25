/* Упражнения для малоподвижных людей с большим весом: без прыжков, без пола, без нагрузки на спину. */
const Ex = (function () {
  /* mode: sit | stand | wall ; lvl: 1..4 ; met — оценка расхода (МЕТ) ; caution — предупреждение */
  const LIST = [
    { id: 'shoulders', n: 'Круги плечами', mode: 'sit', lvl: 1, sec: 30, met: 1.8, d: 'Сидя ровно. Медленно вращайте плечами вперёд, потом назад. Дышите спокойно.' },
    { id: 'neck', n: 'Наклоны головы', mode: 'sit', lvl: 1, sec: 30, met: 1.5, d: 'Медленно наклоняйте голову к плечу, затем вперёд. Без резких движений и без запрокидывания назад.' },
    { id: 'wrists', n: 'Круги кистями и локтями', mode: 'sit', lvl: 1, sec: 30, met: 1.6, d: 'Вытяните руки, вращайте кистями, потом согните локти и вращайте предплечьями.' },
    { id: 'breath', n: 'Глубокое дыхание', mode: 'sit', lvl: 1, sec: 45, met: 1.3, d: 'Вдох носом на 4 счёта, животом. Выдох ртом на 6 счётов. Плечи расслаблены.' },
    { id: 'twist', n: 'Повороты корпуса сидя', mode: 'sit', lvl: 1, sec: 40, met: 2.0, d: 'Руки на плечах. Плавно поворачивайте корпус вправо-влево, таз остаётся на месте.' },
    { id: 'march_sit', n: 'Марш сидя', mode: 'sit', lvl: 1, sec: 45, met: 2.3, d: 'Сидя на краю стула поочерёдно поднимайте колени, помогая руками.' },
    { id: 'toes_sit', n: 'Подъём носков и пяток сидя', mode: 'sit', lvl: 1, sec: 40, met: 1.8, d: 'Стопы на полу. Поочерёдно поднимайте носки и пятки: так разгоняется кровь в ногах.' },
    { id: 'arms_up', n: 'Потягивание с поднятыми руками', mode: 'sit', lvl: 1, sec: 30, met: 1.8, d: 'Поднимите руки вверх, потянитесь, на выдохе опустите. Спина прямая.' },
    { id: 'glutes', n: 'Сжатие ягодиц сидя', mode: 'sit', lvl: 1, sec: 40, met: 2.0, d: 'Напрягите ягодицы на 3 секунды, расслабьте. Повторяйте в спокойном темпе.' },
    { id: 'bottles_front', n: 'Подъём рук с бутылками', mode: 'sit', lvl: 2, sec: 40, met: 2.8, d: 'В руках бутылки с водой по 0,5 л. Поднимайте руки перед собой до уровня плеч и опускайте.' },
    { id: 'bottles_side', n: 'Разведение рук с бутылками', mode: 'sit', lvl: 2, sec: 40, met: 2.8, d: 'Руки с бутылками в стороны до уровня плеч, медленно вниз.' },
    { id: 'leg_ext', n: 'Выпрямление ног сидя', mode: 'sit', lvl: 2, sec: 40, met: 2.4, d: 'Поочерёдно выпрямляйте ногу вперёд и задержите на 2 секунды. Если колено болит, уменьшите амплитуду.', caution: 'knee' },
    { id: 'wall_arms', n: 'Руки вверх у стены', mode: 'wall', lvl: 2, sec: 40, met: 2.2, d: 'Встаньте спиной к стене. Поднимайте и опускайте прямые руки вдоль стены.' },
    { id: 'march_stand', n: 'Ходьба на месте', mode: 'stand', lvl: 2, sec: 60, met: 3.0, d: 'Стоя возле опоры шагайте на месте в удобном темпе, руки двигаются в такт.' },
    { id: 'heel_toe', n: 'Подъём на носки у опоры', mode: 'stand', lvl: 2, sec: 40, met: 2.8, d: 'Держитесь за спинку стула или стену. Поднимайтесь на носки и плавно опускайтесь.' },
    { id: 'side_bend', n: 'Наклоны в стороны стоя', mode: 'stand', lvl: 2, sec: 40, met: 2.2, d: 'Ноги на ширине плеч. Наклоняйтесь вправо-влево, скользя рукой вдоль бедра.' },
    { id: 'wall_push', n: 'Отжимания от стены', mode: 'wall', lvl: 3, sec: 40, met: 3.3, d: 'Руки на стене на уровне груди. Сгибайте локти, приближая грудь к стене, и отталкивайтесь. Корпус прямой.' },
    { id: 'knee_raise', n: 'Подъём колена стоя у опоры', mode: 'stand', lvl: 3, sec: 45, met: 3.3, d: 'Держась за опору, поочерёдно поднимайте колени до комфортной высоты.' },
    { id: 'sit_stand', n: 'Вставание со стула', mode: 'stand', lvl: 3, sec: 40, met: 3.5, d: 'Сядьте на край устойчивого стула. Встаньте без помощи рук, если сложно — помогайте руками. Садитесь медленно.', caution: 'knee' },
    { id: 'wall_squat', n: 'Полуприсед у стены', mode: 'wall', lvl: 4, sec: 30, met: 3.8, d: 'Спиной к стене, ноги вперёд. Чуть согните колени (не ниже комфортного угла), 3 секунды, выпрямитесь.', caution: 'knee' },
    { id: 'step_touch', n: 'Шаги в стороны', mode: 'stand', lvl: 3, sec: 60, met: 3.5, d: 'Шаг вправо, приставьте ногу, шаг влево. Руки двигаются в такт. Без прыжков.' },
    { id: 'stretch_chest', n: 'Растяжка груди у стены', mode: 'wall', lvl: 1, sec: 30, met: 1.8, d: 'Ладонь на стене, плавно поверните корпус от неё до ощущения мягкого растяжения. Затем другая сторона.' }
  ];
  const BY = {}; LIST.forEach(e => { BY[e.id] = e; });

  const STOP = [
    'Боль или давление в груди, отдающая в руку или челюсть',
    'Головокружение, потемнение в глазах, слабость',
    'Сильная одышка: не можете говорить фразами',
    'Резкая боль в коленях, спине, пояснице',
    'Сердцебиение, которое не проходит через 5 минут отдыха'
  ];

  /** Неделя программы по дате старта: 1.. */
  const weekNo = (start, today) => Math.max(1, Math.floor(diffDays(today, start) / 7) + 1);
  /** Параметры недели: уровень, минуты основной сессии, ходьба */
  function weekParams(wk, bmi) {
    let lvl, min, walk;
    if (wk <= 2) { lvl = 1; min = 6; walk = 10; }
    else if (wk <= 4) { lvl = 2; min = 10; walk = 15; }
    else if (wk <= 8) { lvl = 3; min = 15; walk = 20; }
    else if (wk <= 12) { lvl = 4; min = 20; walk = 30; }
    else { lvl = 4; min = 25; walk = 40; }
    if (bmi >= 40) { lvl = Math.min(lvl, 3); }
    return { lvl, min, walk, sec: bmi >= 40 ? 30 : 40, microPerDay: wk <= 2 ? 3 : 4 };
  }

  /** Собирает сессию на minutes минут: [{ex, sec, rest}] */
  function build(minutes, lvl, mode, secCap) {
    let pool = LIST.filter(e => e.lvl <= lvl && !e.cardio);
    if (mode === 'seated' || mode === 'light') pool = pool.filter(e => e.mode === 'sit' || e.lvl === 1);
    const warm = ['shoulders', 'neck', 'arms_up'].map(id => BY[id]);
    const cool = [BY.breath, BY.stretch_chest];
    const core = pool.filter(e => warm.indexOf(e) < 0 && cool.indexOf(e) < 0);
    const steps = [];
    let total = 0;
    const add = (e, rest) => { const s = Math.min(e.sec, secCap || e.sec); steps.push({ ex: e.id, sec: s, rest: rest }); total += s + rest; };
    warm.forEach(e => add(e, 5));
    const budget = minutes * 60 - cool.reduce((a, e) => a + e.sec + 5, 0);
    let i = 0;
    while (total < budget && core.length && i < 60) { add(core[i % core.length], 15); i++; }
    cool.forEach(e => add(e, 5));
    return steps;
  }
  const dur = steps => steps.reduce((a, s) => a + s.sec + s.rest, 0);

  /** Микро-разминка 1–3 минуты (для напоминаний «встань и разомнись») */
  function micro(seed, mode) {
    const pool = LIST.filter(e => !e.cardio && e.lvl <= 2 && e.id !== 'breath' && (mode === 'ok' || e.mode === 'sit'));
    const rnd = rng(seed + 11);
    const pick = shuffle(pool, rnd).slice(0, 3);
    return pick.map(e => ({ ex: e.id, sec: 40, rest: 5 }));
  }
  const kcal = (met, w, sec) => Math.round(met * w * sec / 3600);
  return { LIST, BY, STOP, weekNo, weekParams, build, dur, micro, kcal };
})();
if (typeof module !== 'undefined') module.exports = Ex;

/* ---- Кардио и офисные паузы (добавлено в 2.0) ---- */
Ex.LIST.push(
  { id: 'walk_slow', n: 'Ходьба в спокойном темпе', mode: 'stand', lvl: 1, sec: 60, met: 2.8, cardio: true, d: 'Идите легко, так чтобы свободно разговаривать.' },
  { id: 'walk_fast', n: 'Быстрая ходьба', mode: 'stand', lvl: 2, sec: 60, met: 4.3, cardio: true, d: 'Темп, при котором можно говорить, но петь уже не получится.' },
  { id: 'step_lo', n: 'Степпер: лёгкий темп', mode: 'stand', lvl: 1, sec: 60, met: 3.5, cardio: true, d: 'Держитесь за устойчивую опору. Педали ходят плавно, без рывков, нагрузка 3–4 из 10.' },
  { id: 'step_hi', n: 'Степпер: средний темп', mode: 'stand', lvl: 2, sec: 60, met: 5.0, cardio: true, d: 'Держитесь за опору. Нагрузка 6–7 из 10: дыхание учащается, но говорить можете.' }
);
Ex.LIST.forEach(e => { if (!e.cardio) e.office = true; });
Ex.LIST.forEach(e => { Ex.BY[e.id] = e; });
/** Кардио-сессия: разминка, интервалы 1/1, заминка. useStepper=false — только ходьба */
Ex.buildCardio = function (minutes, useStepper) {
  const hi = useStepper ? 'step_hi' : 'walk_fast', lo = useStepper ? 'step_lo' : 'walk_slow';
  const steps = [{ ex: lo, sec: 180, rest: 0 }];
  let left = minutes * 60 - 180 - 120;
  while (left >= 120) { steps.push({ ex: hi, sec: 60, rest: 0 }, { ex: lo, sec: 60, rest: 0 }); left -= 120; }
  steps.push({ ex: lo, sec: 120, rest: 0 });
  return steps;
};
