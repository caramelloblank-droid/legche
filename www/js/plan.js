/* План питания: рецепты из content/recipes.json, учёт кухонной техники, правила разнообразия, корзина и цены. */
const MealPlan = (function () {
  const SLOTS = [
    { id: 'b', name: 'Завтрак', pool: 'b', share: 0.25, icon: '☀' },
    { id: 's1', name: 'Перекус', pool: 's', share: 0.10, icon: '◔' },
    { id: 'l', name: 'Обед', pool: 'l', share: 0.30, icon: '◑' },
    { id: 's2', name: 'Перекус', pool: 's', share: 0.10, icon: '◔' },
    { id: 'd', name: 'Ужин', pool: 'd', share: 0.25, icon: '☾' }
  ];
  const TECH = { stove: 'Плита', oven: 'Духовка', multicooker: 'Мультиварка', blender: 'Блендер', toaster: 'Тостер', microwave: 'Микроволновка', none: 'Без готовки' };
  const defKit = () => ({ stove: true, oven: true, multi: true, chopper: true, immersion: true, toaster: true, micro: false });
  let RECIPES = [], BYID = {};

  const roundG = g => Math.max(5, Math.round(g / 5) * 5);
  function macro(ing) {
    let k = 0, p = 0, f = 0, c = 0, g = 0;
    ing.forEach(([n, gr]) => { const x = findFood(n); if (!x) return; const m = gr / 100; k += x.k * m; p += x.p * m; f += x.f * m; c += x.c * m; g += gr; });
    return { k: r0(k), p: r0(p), f: r0(f), c: r0(c), g };
  }
  function setRecipes(list) {
    RECIPES = list.map(x => Object.assign({}, x, { m: x.meal, c: x.cost, n: x.name, ing: x.ingredients, tip: x.tips || '', tags: x.tags || [], methods: x.methods || [] }));
    BYID = {}; RECIPES.forEach(r => { BYID[r.id] = r; });
  }
  /* Доступность способа приготовления при данной технике */
  function toolOk(t, kit) {
    if (t === 'stove') return kit.stove !== false;
    if (t === 'oven') return !!kit.oven;
    if (t === 'multicooker') return !!kit.multi;
    if (t === 'toaster') return !!kit.toaster;
    if (t === 'microwave') return !!kit.micro;
    if (t === 'blender') return !!(kit.chopper || kit.immersion);
    return true;
  }
  function methodOk(m, kit) {
    if (m.type === 'blender') { if (m.tool === 'chopper' ? !kit.chopper : m.tool === 'immersion' ? !kit.immersion : !(kit.chopper || kit.immersion)) return false; }
    else if (!toolOk(m.type, kit)) return false;
    return (m.also || []).every(a => toolOk(a, kit));
  }
  const methodsFor = (rec, kit) => rec.methods.filter(m => methodOk(m, kit || defKit()));
  const usable = (rec, kit) => methodsFor(rec, kit).length > 0;
  function defMethod(rec, kit, multiFirst) {
    const ms = methodsFor(rec, kit);
    if (!ms.length) return null;
    if (multiFirst) { const m = ms.find(x => x.type === 'multicooker'); if (m) return m; }
    return ms.find(x => x.type !== 'multicooker') || ms[0];
  }

  function scaleDish(dish, kcal) {
    const base = macro(dish.ing).k;
    const fct = clamp(kcal / base, 0.5, 2.5);
    const ing = dish.ing.map(([n, g]) => [n, roundG(g * fct)]);
    return Object.assign({ dishId: dish.id, ing }, macro(ing));
  }

  /** Неделя. o: {seed, maxCost, kit, multiFirst, ban[], exclude[], dayTargets[7], reserveDow} */
  function genWeek(target, weekKey, o) {
    o = o || {};
    const rnd = rng(hashStr(weekKey) + (o.seed || 0) * 7919);
    const kit = o.kit || defKit(), maxCost = o.maxCost || 3, ban = new Set(o.ban || []);
    const exc = (o.exclude || []).map(normQ).filter(Boolean);
    const okFn = (r, mc) => r.c <= mc && !ban.has(r.id) && usable(r, kit) && !r.ing.some(([n]) => exc.some(e => normQ(n).indexOf(e) >= 0));
    const pools = {};
    ['b', 'l', 'd', 's'].forEach(mt => {
      let p = RECIPES.filter(r => r.m === mt && okFn(r, maxCost));
      if (p.length < 6) p = RECIPES.filter(r => r.m === mt && okFn(r, 3));
      if (p.length < 2) p = RECIPES.filter(r => r.m === mt && !ban.has(r.id));
      pools[mt] = p;
    });
    const multiM = r => methodsFor(r, kit).find(m => m.type === 'multicooker');
    const otherM = r => methodsFor(r, kit).find(m => m.type !== 'multicooker');
    const order = arr => arr.map(r => [rnd() - (o.multiFirst && multiM(r) ? 0.4 : 0), r]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const sh = {}; ['b', 'l', 'd', 's'].forEach(mt => { sh[mt] = order(pools[mt]); });
    const bP = sh.b.slice(0, 3), lP = sh.l.slice(0, 4), dP = sh.d.slice(0, 4);
    const s1P = sh.s.slice(0, 3), s2P = sh.s.slice(3, 6).length ? sh.s.slice(3, 6) : sh.s.slice(0, 3);
    const tagDays = tag => { let n = 0; for (let i = 0; i < 7; i++) if ([lP[i % lP.length], dP[i % dP.length]].some(r => r.tags.indexOf(tag) >= 0)) n++; return n; };
    const has = (r, tag) => r.tags.indexOf(tag) >= 0;
    /* заменить в одном из списков блюдо без тега на блюдо с тегом (или наоборот) */
    function forceTag(tag, wantMore) {
      const prot = tag === 'fish' ? 'legume' : 'fish';
      for (const [lst, pool] of [[dP, sh.d], [lP, sh.l]]) {
        for (let i = 0; i < lst.length; i++) {
          if (wantMore ? has(lst[i], tag) : !has(lst[i], tag)) continue;
          const before = tagDays(prot), old = lst[i];
          const cand = pool.filter(r => lst.indexOf(r) < 0 && (wantMore ? has(r, tag) : !has(r, tag)));
          for (const c of cand) {
            lst[i] = c;
            if (tagDays(prot) >= Math.min(2, before) && (prot !== 'legume' || tagDays('legume') <= 3 || before > 3)) return true;
          }
          lst[i] = old;
        }
      }
      return false;
    }
    let g = 0;
    while (tagDays('fish') < 2 && g++ < 4) if (!forceTag('fish', true)) break;
    g = 0; while (tagDays('legume') < 2 && g++ < 4) if (!forceTag('legume', true)) break;
    g = 0; while (tagDays('legume') > 3 && g++ < 4) if (!forceTag('legume', false)) break;
    /* назначение способов: мультиварка не больше 50% (с приоритетом) или 25% (без него) основных блюд */
    const main = bP.concat(lP, dP);
    const cap = o.multiFirst ? Math.floor(main.length / 2) : Math.floor(main.length / 4);
    const assign = {};
    let used = 0;
    main.forEach(r => { if (!otherM(r)) { assign[r.id] = multiM(r); used++; } });
    main.filter(r => !assign[r.id] && multiM(r)).sort((a, b) => multiM(b).timeMin - multiM(a).timeMin).forEach(r => { if (used < cap) { assign[r.id] = multiM(r); used++; } });
    main.forEach(r => { if (!assign[r.id]) assign[r.id] = otherM(r) || multiM(r); });
    /* минимум 3 разных способа за неделю */
    const types = () => new Set(main.map(r => assign[r.id].type));
    g = 0;
    while (types().size < 3 && g++ < 6) {
      const have = types(); let done = false;
      for (const r of main) { const alt = methodsFor(r, kit).find(m => !have.has(m.type) && (m.type !== 'multicooker' || used < cap)); if (alt) { if (assign[r.id].type === 'multicooker') used--; if (alt.type === 'multicooker') used++; assign[r.id] = alt; done = true; break; } }
      if (!done) break;
    }
    /* если способов всё ещё мало, заменить один из ужинов/обедов блюдом с недостающим способом */
    g = 0;
    while (types().size < 3 && g++ < 3) {
      const have = types(); let done = false;
      for (const [lst, pool] of [[dP, sh.d], [lP, sh.l], [bP, sh.b]]) {
        for (let i = lst.length - 1; i >= 0 && !done; i--) {
          if (has(lst[i], 'fish') && tagDays('fish') <= 2) continue;
          if (has(lst[i], 'legume') && tagDays('legume') <= 2) continue;
          const cand = pool.find(r => lst.indexOf(r) < 0 && methodsFor(r, kit).some(m => !have.has(m.type) && m.type !== 'multicooker'));
          if (cand) { delete assign[lst[i].id]; if (assign[lst[i].id]) used--; lst[i] = cand; assign[cand.id] = methodsFor(cand, kit).find(m => !have.has(m.type) && m.type !== 'multicooker'); main.length = 0; bP.concat(lP, dP).forEach(x => main.push(x)); main.forEach(x => { if (!assign[x.id]) assign[x.id] = otherM(x) || multiM(x); }); done = true; }
        }
        if (done) break;
      }
      if (!done) break;
    }
    const dm = r => assign[r.id] || otherM(r) || multiM(r) || null;
    const res = { weekKey, days: [], meta: {} };
    const reserve = o.reserveDow != null && o.reserveDow >= 0;
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekKey, i);
      const factor = reserve ? (i === o.reserveDow ? 1.15 : (7 - 1.15) / 6) : 1;
      const dayTarget = o.dayTargets ? o.dayTargets[i] : Math.round(target * factor / 10) * 10;
      const src = { b: bP[i % bP.length], s1: s1P[i % s1P.length], l: lP[i % lP.length], s2: s2P[i % s2P.length], d: dP[i % dP.length] };
      const meals = SLOTS.map(sl => { const rc = src[sl.id]; const m = dm(rc) || otherM(rc) || null; return Object.assign({ slot: sl.id, method: m ? m.type : 'none' }, scaleDish(rc, dayTarget * sl.share)); });
      const tot = meals.reduce((a, m) => ({ k: a.k + m.k, p: a.p + m.p, f: a.f + m.f, c: a.c + m.c }), { k: 0, p: 0, f: 0, c: 0 });
      res.days.push({ date, factor: dayTarget / Math.max(1, target), target: dayTarget, meals, tot });
    }
    res.meta = { multiShare: main.filter(r => assign[r.id] && assign[r.id].type === 'multicooker').length / main.length, fishDays: tagDays('fish'), legumeDays: tagDays('legume'), methods: Array.from(types()) };
    return res;
  }
  /** Подменить блюдо в готовом плане (пользователь выбрал другое) */
  function replaceMeal(plan, date, slotIdx, recipeId, kit, multiFirst) {
    const day = plan.days.find(d => d.date === date); if (!day) return;
    const rc = BYID[recipeId]; if (!rc) return;
    const old = day.meals[slotIdx], m = defMethod(rc, kit || defKit(), multiFirst);
    const kcal = SLOTS[slotIdx].share * day.target;
    day.meals[slotIdx] = Object.assign({ slot: old.slot, method: m ? m.type : 'none' }, scaleDish(rc, kcal));
    day.tot = day.meals.reduce((a, x) => ({ k: a.k + x.k, p: a.p + x.p, f: a.f + x.f, c: a.c + x.c }), { k: 0, p: 0, f: 0, c: 0 });
  }

  /* ---------- Цены и корзина ---------- */
  const PRICE = {
    'Гречка (сухая)': 140, 'Рис белый (сухой)': 110, 'Рис бурый (сухой)': 160, 'Овсяные хлопья (сухие)': 90, 'Пшено (сухое)': 80, 'Перловка (сухая)': 70, 'Макароны (сухие)': 100, 'Манка (сухая)': 70, 'Кус-кус (сухой)': 250, 'Вермишель (сухая)': 100,
    'Чечевица (сухая)': 140, 'Горох (сухой)': 100, 'Нут (сухой)': 150, 'Нут консервированный': 350, 'Фасоль белая (сухая)': 180, 'Фасоль консервированная в собственном соку': 300, 'Хумус': 500,
    'Куриная грудка (сырая)': 380, 'Куриное бедро без кожи (сырое)': 330, 'Куриные голени (сырые)': 230, 'Куриный фарш (сырой)': 330, 'Куриная печень (сырая)': 270, 'Куриные сердечки (сырые)': 250, 'Индейка филе (сырая)': 520, 'Индейка фарш (сырой)': 430,
    'Говядина постная (сырая)': 700, 'Говяжий фарш 10% жира (сырой)': 600, 'Свинина постная (сырая)': 480,
    'Минтай (сырой)': 330, 'Хек (сырой)': 350, 'Треска (сырая)': 600, 'Горбуша (сырая)': 550, 'Скумбрия (сырая)': 450, 'Креветки сырые очищенные': 900, 'Лосось слабосолёный': 2500, 'Тунец консервированный в собственном соку': 900,
    'Яйцо куриное': 220, 'Молоко 2.5%': 85, 'Кефир 1%': 90, 'Творог 5%': 420, 'Творог 2%': 400, 'Йогурт натуральный 2%': 160, 'Йогурт греческий 2%': 400, 'Сметана 10%': 250, 'Сыр твёрдый лёгкий 15%': 800, 'Сыр творожный лёгкий': 900, 'Сыр адыгейский': 500, 'Сыр фета': 800, 'Сливочное масло 82.5%': 900,
    'Капуста белокочанная': 35, 'Морковь сырая': 40, 'Лук репчатый': 40, 'Картофель сырой': 45, 'Свёкла сырая': 40, 'Огурец': 180, 'Огурец солёный': 200, 'Помидор': 250, 'Перец болгарский': 320, 'Кабачок': 120, 'Баклажан': 220, 'Тыква': 60, 'Капуста брокколи': 350, 'Капуста цветная': 220, 'Овощная смесь замороженная': 250, 'Капуста квашеная': 120, 'Салат айсберг': 300, 'Шпинат': 500, 'Редис': 250, 'Шампиньоны свежие': 350, 'Укроп': 600, 'Томатная паста': 350, 'Томаты консервированные': 250, 'Авокадо': 500, 'Чеснок': 400,
    'Яблоко': 110, 'Банан': 110, 'Груша': 170, 'Апельсин': 120, 'Киви': 250, 'Клубника': 500, 'Курага': 600, 'Изюм': 400,
    'Масло подсолнечное': 160, 'Масло оливковое': 900, 'Мёд': 700, 'Грецкий орех': 1100, 'Миндаль': 1300, 'Арахисовая паста': 600, 'Семена льна': 300,
    'Хлеб ржаной': 90, 'Хлеб цельнозерновой': 130, 'Хлебцы цельнозерновые': 450, 'Мука овсяная': 120, 'Отруби овсяные': 150, 'Соевый соус': 400, 'Лимонный сок': 300
  };
  const CATPRICE = { 'Крупы и гарниры': 120, 'Хлеб и выпечка': 100, 'Мясо': 500, 'Птица': 330, 'Рыба и морепродукты': 450, 'Яйца': 230, 'Молочные продукты': 150, 'Сыры': 800, 'Овощи и зелень': 120, 'Фрукты и ягоды': 150, 'Орехи, сухофрукты и семена': 900, 'Бобовые': 180, 'Масла, соусы и приправы': 250 };
  function priceOf(name, over) {
    if (over && over[name] != null) return over[name];
    if (PRICE[name] != null) return PRICE[name];
    const f = findFood(name); return (f && CATPRICE[f.cat]) || 300;
  }
  const PANTRY_EXTRA = ['Мёд', 'Мука овсяная', 'Томатная паста', 'Семена льна', 'Изюм', 'Корица', 'Паприка молотая', 'Лимонный сок', 'Соевый соус'];
  const isPantry = n => { const f = findFood(n); return PANTRY_EXTRA.indexOf(n) >= 0 || (f && f.cat === 'Масла, соусы и приправы'); };
  function aisleOf(n) {
    const f = findFood(n), c = f ? f.cat : '';
    if (/заморож/i.test(n)) return 'Замороженное';
    if (c === 'Овощи и зелень' || c === 'Фрукты и ягоды' || c === 'Грибы') return 'Овощи, фрукты, зелень';
    if (c === 'Мясо' || c === 'Птица' || c === 'Колбасы и деликатесы') return 'Мясо и птица';
    if (c === 'Рыба и морепродукты') return 'Рыба';
    if (c === 'Молочные продукты' || c === 'Сыры' || c === 'Яйца') return 'Молочное и яйца';
    if (c === 'Хлеб и выпечка') return 'Хлеб';
    return 'Бакалея';
  }
  const AISLES = ['Овощи, фрукты, зелень', 'Мясо и птица', 'Рыба', 'Молочное и яйца', 'Бакалея', 'Хлеб', 'Замороженное'];
  const SWAPS = {
    'Индейка филе (сырая)': ['Куриная грудка (сырая)', 'Куриное бедро без кожи (сырое)'], 'Индейка фарш (сырой)': ['Куриный фарш (сырой)'],
    'Говядина постная (сырая)': ['Свинина постная (сырая)', 'Куриное бедро без кожи (сырое)'], 'Говяжий фарш 10% жира (сырой)': ['Куриный фарш (сырой)'],
    'Горбуша (сырая)': ['Минтай (сырой)', 'Хек (сырой)'], 'Треска (сырая)': ['Минтай (сырой)', 'Хек (сырой)'], 'Креветки сырые очищенные': ['Кальмар (сырой)'],
    'Йогурт греческий 2%': ['Йогурт натуральный 2%'], 'Творог 5%': ['Творог 2%'], 'Сыр твёрдый лёгкий 15%': ['Сыр адыгейский'], 'Сыр фета': ['Сыр адыгейский'],
    'Грецкий орех': ['Семена льна'], 'Миндаль': ['Грецкий орех'], 'Лосось слабосолёный': ['Сельдь солёная'], 'Авокадо': ['Огурец'],
    'Масло оливковое': ['Масло подсолнечное'], 'Тунец консервированный в собственном соку': ['Горбуша консервированная'], 'Скумбрия (сырая)': ['Минтай (сырой)']
  };
  function shopping(plans, dates, over, have) {
    have = have || {};
    const acc = {};
    plans.forEach(pl => pl.days.forEach(d => {
      if (dates.indexOf(d.date) < 0) return;
      d.meals.forEach(m => m.ing.forEach(([n, g]) => { acc[n] = (acc[n] || 0) + g; }));
    }));
    const items = Object.keys(acc).map(n => {
      const f = findFood(n), pr = priceOf(n, over), g = acc[n];
      const buyG = g < 1000 ? Math.ceil(g / 50) * 50 : Math.ceil(g / 100) * 100;
      const pieces = f && f.ul === 'шт' && f.ug ? Math.ceil(g / f.ug) : null;
      return { n, g, buyG, cat: f ? f.cat : 'Прочее', aisle: aisleOf(n), price: pr, cost: Math.round(buyG / 1000 * pr), pieces, pantry: !!isPantry(n), have: !!have[n] };
    });
    items.sort((a, b) => AISLES.indexOf(a.aisle) - AISLES.indexOf(b.aisle) || b.cost - a.cost);
    const buy = items.filter(x => !x.have && !x.pantry);
    return { items, total: buy.reduce((s, x) => s + x.cost, 0), pantryTotal: items.filter(x => x.pantry && !x.have).reduce((s, x) => s + x.cost, 0) };
  }
  /** Подсказки, как удешевить корзину */
  function savings(items, over) {
    const out = [];
    items.filter(x => !x.have && SWAPS[x.n]).forEach(x => {
      SWAPS[x.n].forEach(alt => { const c = Math.round(x.buyG / 1000 * priceOf(alt, over)); if (x.cost - c >= 40) out.push({ from: x.n, to: alt, save: x.cost - c }); });
    });
    out.sort((a, b) => b.save - a.save);
    const seen = {}; return out.filter(o => seen[o.from] ? false : (seen[o.from] = 1)).slice(0, 5);
  }
  /** План готовки на выходной: что приготовить впрок */
  function prepPlan(plan, dates, kit, multiFirst) {
    const cnt = {};
    plan.days.forEach(d => { if (dates.indexOf(d.date) < 0) return; d.meals.forEach((m, i) => { if (i === 1 || i === 3) return; cnt[m.dishId] = (cnt[m.dishId] || 0) + 1; }); });
    const tasks = Object.keys(cnt).map(id => {
      const rc = BYID[id], m = defMethod(rc, kit || defKit(), multiFirst) || { type: 'none', timeMin: 0, steps: [] };
      return { id, name: rc.n, times: cnt[id], tech: m.type, timeMin: m.timeMin || 0, active: rc.activeMin || 0, tempC: m.tempC || null };
    }).filter(t => t.times >= 2 && t.tech !== 'none').sort((a, b) => b.timeMin - a.timeMin);
    return tasks;
  }
  return {
    SLOTS, TECH, defKit, macro, scaleDish, genWeek, replaceMeal, setRecipes, methodsFor, usable, defMethod, methodOk,
    PRICE, CATPRICE, AISLES, SWAPS, priceOf, isPantry, aisleOf, shopping, savings, prepPlan,
    get DISHES() { return RECIPES; }, get DISH() { return BYID; }
  };
})();

/* Памятка по бюджетной корзине (цены ориентировочные, за кг/л/10 шт) */
const BASKET = [
  { grp: 'Крупы и макароны (основа сытости)', tip: 'Берите на развес и большими пачками: дешевле на 20–30%.', items: [['Гречка', 140], ['Рис круглозёрный', 110], ['Овсяные хлопья (не быстрые)', 90], ['Пшено', 80], ['Перловка', 70], ['Макароны из твёрдых сортов', 100]] },
  { grp: 'Белок (самое важное при похудении)', tip: 'Куриные бёдра и печень выгоднее грудки по цене на грамм белка. Яйца и творог — самый дешёвый белок.', items: [['Куриные бёдра/голени', 260], ['Куриная грудка', 380], ['Куриная печень', 270], ['Минтай/хек (заморозка)', 330], ['Яйца (10 шт)', 120], ['Творог 2–5%', 400], ['Кефир 1% (л)', 90]] },
  { grp: 'Овощи (объём и клетчатка)', tip: 'Капуста, морковь, свёкла, лук и картофель стоят копейки круглый год. Замороженные смеси не хуже свежих.', items: [['Капуста белокочанная', 35], ['Морковь', 40], ['Свёкла', 40], ['Лук', 40], ['Картофель', 45], ['Замороженные овощные смеси', 250], ['Кабачки в сезон', 80]] },
  { grp: 'Бобовые', tip: 'Чечевица варится без замачивания. 100 г сухой чечевицы заменяют 100 г мяса по белку.', items: [['Чечевица', 140], ['Горох колотый', 100], ['Фасоль сухая', 180]] },
  { grp: 'Фрукты', tip: 'Яблоки, груши, бананы и сезонные фрукты. Соки не нужны: в них сахар без клетчатки.', items: [['Яблоки', 110], ['Бананы', 110], ['Сезонные фрукты', 150]] },
  { grp: 'Прочее', tip: 'Масло считаем на ложки: 1 ст. ложка = 120 ккал.', items: [['Подсолнечное масло (л)', 160], ['Ржаной хлеб', 90], ['Томатная паста', 350]] }
];
const BASKET_RULES = [
  'Ходите в магазин по списку после еды: на сытый желудок в корзину попадает на 20–30% меньше лишнего.',
  'Готовьте на 2–3 дня сразу: суп, гречка, запечённая курица. Это экономит и деньги, и силу воли.',
  'Вместо «фитнес-продуктов» покупайте обычные: овсянка вместо мюсли, творог вместо йогуртов с сахаром, кефир вместо сладких напитков.',
  'Сладкое, чипсы и газировку не запрещаем, а не носим домой: хочется — купите одну порцию и съешьте её вне дома.',
  'Покупайте акционное мясо и птицу, замораживайте порциями по 150–200 г.',
  'Сравнивайте цену за кг, а не за упаковку.'
];
if (typeof module !== 'undefined') module.exports = MealPlan;
