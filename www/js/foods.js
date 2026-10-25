/* База продуктов: данные лежат в content/foods.json (встроенная копия + обновления из интернета).
   Здесь только движок: загрузка списка и поиск. Значения на 100 г. */
const FOODS = [];
const FOOD_BY_NAME = {};
const normQ = s => String(s).toLowerCase().replace(/ё/g, 'е');
function setFoods(list) {
  FOODS.length = 0;
  Object.keys(FOOD_BY_NAME).forEach(k => delete FOOD_BY_NAME[k]);
  list.forEach((x, i) => {
    const f = { id: 'b' + i, n: x.n, k: +x.k, p: +x.p, f: +x.f, c: +x.c, cat: x.cat || 'Прочее', base: true };
    if (x.ug) { f.ug = +x.ug; f.ul = x.ul || 'порция'; }
    f.q = normQ(f.n + ' ' + (x.syn ? x.syn.join(' ') : ''));
    FOODS.push(f);
    FOOD_BY_NAME[f.n.toLowerCase()] = f;
  });
}
function findFood(name) { return FOOD_BY_NAME[String(name).toLowerCase()] || null; }
/* Основа слова: «курица», «куриная», «куриное» дают одну основу и находят друг друга */
function stem(w) { return w.length >= 6 ? w.slice(0, w.length - 2) : (w.length === 5 ? w.slice(0, 4) : (w.length === 4 ? w.slice(0, 3) : w)); }
function searchFoods(list, q, limit) {
  const qn = normQ(q), t = qn.split(/\s+/).filter(Boolean).map(stem);
  if (!t.length) return [];
  const wantRaw = /сух|сыр/.test(qn);
  const res = [];
  list.forEach((f, idx) => {
    const s = f.q || normQ(f.n);
    let ok = true, score = 0;
    for (const w of t) {
      const ix = s.indexOf(w);
      if (ix < 0) { ok = false; break; }
      score += (ix === 0 ? 0 : 1) + (ix > 0 && s[ix - 1] !== ' ' ? 2 : 0);
    }
    if (!ok) return;
    if (!wantRaw && /\((сух|сыр)/.test(s)) score += 0.5;
    res.push([score + idx / 100000, f]);
  });
  res.sort((a, b) => a[0] - b[0]);
  return res.slice(0, limit || 40).map(x => x[1]);
}
if (typeof module !== 'undefined') module.exports = { FOODS, findFood, searchFoods, setFoods };
