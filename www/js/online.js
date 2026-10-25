/* Онлайн-функции (необязательные): обновление рецептов и базы продуктов, проверка версии, штрихкоды. */
const Content = (function () {
  let cfg = { version: '2.0.0', repo: '', contentBase: '', offApi: 'https://world.openfoodfacts.org/api/v2/product/' };
  const st = { foods: { version: 0, src: 'встроенная' }, recipes: { version: 0, src: 'встроенная' }, tips: { version: 0, src: 'встроенная' }, err: null };
  let builtin = {}, cache = {};
  const PACKS = ['foods', 'recipes', 'tips'];
  async function getJson(url) { const r = await fetchT(url, { cache: 'no-store' }, 10000); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
  /* IndexedDB: небольшое хранилище для скачанных пакетов */
  function idb() { return new Promise((res, rej) => { const q = indexedDB.open('legche', 1); q.onupgradeneeded = () => q.result.createObjectStore('content'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
  async function idbGet(k) { try { const d = await idb(); return await new Promise(res => { const r = d.transaction('content').objectStore('content').get(k); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }); } catch (e) { return null; } }
  async function idbSet(k, v) { try { const d = await idb(); return await new Promise(res => { const t = d.transaction('content', 'readwrite'); t.objectStore('content').put(v, k); t.oncomplete = () => res(true); t.onerror = () => res(false); }); } catch (e) { return false; } }
  async function idbDel(k) { try { const d = await idb(); d.transaction('content', 'readwrite').objectStore('content').delete(k); } catch (e) { } }
  async function sha256(text) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }

  /* Проверка содержимого. Те же правила использует ci/build_content.py при сборке */
  function validateFoods(list) {
    const e = []; if (!Array.isArray(list) || list.length < 50) return ['список продуктов пуст или слишком мал'];
    const seen = {};
    list.forEach((x, i) => {
      if (!x || typeof x.n !== 'string' || !x.n) { e.push('#' + i + ': нет названия'); return; }
      ['k', 'p', 'f', 'c'].forEach(f => { if (typeof x[f] !== 'number' || !isFinite(x[f]) || x[f] < 0) e.push(x.n + ': неверное поле ' + f); });
      if (x.k > 950) e.push(x.n + ': калорийность выше 950');
      if (seen[x.n.toLowerCase()]) e.push('повтор: ' + x.n); seen[x.n.toLowerCase()] = 1;
    });
    return e.slice(0, 20);
  }
  const TYPES = ['stove', 'oven', 'multicooker', 'blender', 'toaster', 'microwave', 'none'];
  function validateRecipes(list, names) {
    const e = []; if (!Array.isArray(list) || list.length < 10) return ['список рецептов пуст или слишком мал'];
    const ids = {};
    list.forEach(r => {
      const id = r && r.id; if (!id || typeof id !== 'string') { e.push('рецепт без id'); return; }
      if (ids[id]) e.push(id + ': повтор id'); ids[id] = 1;
      if (!r.name) e.push(id + ': нет названия');
      if (['b', 'l', 'd', 's'].indexOf(r.meal) < 0) e.push(id + ': неверный meal');
      if (!(r.cost >= 1 && r.cost <= 3)) e.push(id + ': cost должен быть 1–3');
      if (!Array.isArray(r.ingredients) || !r.ingredients.length) e.push(id + ': нет ингредиентов');
      else r.ingredients.forEach(i => { if (!names[String(i[0]).toLowerCase()]) e.push(id + ': нет в базе продуктов «' + i[0] + '»'); if (!(i[1] > 0)) e.push(id + ': граммы «' + i[0] + '»'); });
      if (!Array.isArray(r.methods) || !r.methods.length) e.push(id + ': нет способов приготовления');
      else r.methods.forEach(m => {
        if (TYPES.indexOf(m.type) < 0) e.push(id + ': способ ' + m.type);
        if ((m.type === 'oven' || m.type === 'multicooker') && !(m.tempC > 0 && m.timeMin > 0)) e.push(id + ': ' + m.type + ' без времени или температуры');
        if (!Array.isArray(m.steps) || !m.steps.length) e.push(id + ': нет шагов');
      });
    });
    return e.slice(0, 20);
  }
  const foodNames = list => { const o = {}; list.forEach(f => { o[f.n.toLowerCase()] = 1; }); return o; };

  function apply() {
    setFoods(cache.foods); MealPlan.setRecipes(cache.recipes);
    if (typeof TIPS !== 'undefined' && Array.isArray(cache.tips) && cache.tips.length) { TIPS.length = 0; cache.tips.forEach(t => TIPS.push(t)); }
  }
  async function init() {
    try { cfg = Object.assign(cfg, await getJson('app-config.json')); } catch (e) { }
    const man = await getJson('content/manifest.json'); builtin = man;
    for (const n of PACKS) { cache[n] = await getJson('content/' + man.packs[n].file); st[n] = { version: man.packs[n].version, src: 'встроенная' }; }
    // более новые пакеты из памяти
    for (const n of PACKS) {
      const c = await idbGet(n);
      if (c && c.version > st[n].version && Array.isArray(c.data)) { cache[n] = c.data; st[n] = { version: c.version, src: 'обновление', date: c.date }; }
    }
    // защита: скачанные рецепты должны быть согласованы с базой продуктов
    const bad = validateRecipes(cache.recipes, foodNames(cache.foods));
    if (bad.length && st.recipes.src === 'обновление') { cache.recipes = await getJson('content/' + man.packs.recipes.file); st.recipes = { version: man.packs.recipes.version, src: 'встроенная' }; await idbDel('recipes'); }
    apply(); return st;
  }
  /** Проверка обновлений в репозитории. force — игнорировать ограничение раз в 12 часов */
  async function checkRemote(force) {
    const db = Store.db; if (!db.prefs.online) return { skipped: 'off' };
    const now = Date.now(); if (!force && now - (db.contentMeta.checked || 0) < 12 * 3600e3) return { skipped: 'recent' };
    if (!cfg.contentBase) return { skipped: 'no-config' };
    try {
      const man = await getJson(cfg.contentBase + 'manifest.json?_=' + now);
      db.contentMeta.checked = now; st.err = null;
      if (man.minApp && cmpVer(man.minApp, await Updater.version()) > 0) { Store.save(); return { skipped: 'old-app', need: man.minApp }; }
      const updated = [], pending = {};
      for (const n of ['foods', 'recipes', 'tips']) {
        const rp = man.packs && man.packs[n]; if (!rp || !(rp.version > st[n].version)) continue;
        const text = await (await fetchT(cfg.contentBase + rp.file + '?_=' + now, { cache: 'no-store' }, 15000)).text();
        if (rp.sha256 && rp.sha256.length === 64 && (await sha256(text)) !== rp.sha256.toLowerCase()) throw new Error('контрольная сумма ' + rp.file + ' не совпала');
        let data; try { data = JSON.parse(text); } catch (e) { throw new Error(rp.file + ': не удалось прочитать JSON'); }
        pending[n] = { version: rp.version, data: data };
      }
      const foods = pending.foods ? pending.foods.data : cache.foods;
      if (pending.foods) { const e = validateFoods(foods); if (e.length) throw new Error('база продуктов: ' + e[0]); }
      if (pending.recipes || pending.foods) { const e = validateRecipes(pending.recipes ? pending.recipes.data : cache.recipes, foodNames(foods)); if (e.length) throw new Error('рецепты: ' + e[0]); }
      for (const n of Object.keys(pending)) { cache[n] = pending[n].data; st[n] = { version: pending[n].version, src: 'обновление', date: dkey() }; await idbSet(n, { version: pending[n].version, data: pending[n].data, date: dkey() }); updated.push(n); }
      if (updated.length) apply();
      Store.save(); return { updated: updated };
    } catch (e) { st.err = String(e && e.message || e); return { error: st.err }; }
  }
  async function reset() { for (const n of PACKS) await idbDel(n); db_reset(); return init(); }
  function db_reset() { Store.db.contentMeta.checked = 0; Store.save(); }
  return { init, checkRemote, reset, state: st, validateFoods, validateRecipes, foodNames, get cfg() { return cfg; } };
})();

/* Проверка новой версии приложения на GitHub */
const Updater = (function () {
  async function version() {
    const A = plug('App');
    try { if (A && A.getInfo) { const i = await A.getInfo(); if (i && i.version) return i.version; } } catch (e) { }
    return (Content.cfg && Content.cfg.version) || '0.0.0';
  }
  /** Возвращает {tag, notes, url} если есть новая версия, иначе null */
  async function check(force) {
    const db = Store.db; if (!db.prefs.online) return null;
    const now = Date.now(), m = db.updateMeta;
    if (!force) { if (now - (m.checked || 0) < 24 * 3600e3 && !m.found) return null; if (m.snooze && now < m.snooze) return null; }
    const repo = Content.cfg.repo; if (!repo) return null;
    try {
      const r = await fetchT('https://api.github.com/repos/' + repo + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } }, 8000);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); m.checked = now;
      const local = await version(), tag = j.tag_name || '';
      if (tag && cmpVer(tag, local) > 0) {
        const apk = (j.assets || []).find(a => /\.apk$/i.test(a.name));
        m.found = { tag: tag, notes: String(j.body || '').slice(0, 1500), url: j.html_url, apk: apk ? apk.browser_download_url : null };
        Store.save(); return m.found;
      }
      m.found = null; Store.save(); return null;
    } catch (e) { return null; }
  }
  async function open(url) { const B = plug('Browser'); try { if (B && B.open) { await B.open({ url: url }); return; } } catch (e) { } window.open(url, '_blank'); }
  return { version, check, open };
})();

/* Штрихкоды: поиск в сохранённых продуктах, затем в Open Food Facts */
const Barcode = (function () {
  const clean = c => String(c || '').replace(/\D/g, '');
  function local(code) {
    const db = Store.db, D = Store.data();
    return db.scanned.find(f => f.barcode === code) || D.customFoods.find(f => f.barcode === code) || null;
  }
  async function fetchOff(code) {
    const base = Content.cfg.offApi, url = base + code + '.json?fields=code,product_name,product_name_ru,brands,nutriments,serving_quantity,quantity';
    const ua = 'Legche/' + (await Updater.version()) + ' (github.com/' + (Content.cfg.repo || 'legche') + ')';
    const H = plug('CapacitorHttp');
    if (Notify.isNative() && H && H.get) { const r = await H.get({ url: url, headers: { 'User-Agent': ua, Accept: 'application/json' } }); if (r.status === 404) return null; if (r.status !== 200) throw new Error('HTTP ' + r.status); return typeof r.data === 'string' ? JSON.parse(r.data) : r.data; }
    const r = await fetchT(url, { headers: { Accept: 'application/json' } }, 8000); if (r.status === 404) return null; if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
  }
  function parse(code, data) {
    if (!data || data.status !== 1 || !data.product) return null;
    const p = data.product, nut = p.nutriments || {};
    let name = (p.product_name_ru || p.product_name || '').trim(); if (!name) return null;
    const brand = (p.brands || '').split(',')[0].trim(); if (brand && name.toLowerCase().indexOf(brand.toLowerCase()) < 0) name += ' (' + brand + ')';
    let kcal = nut['energy-kcal_100g']; if (kcal == null && nut['energy_100g'] != null) kcal = nut['energy_100g'] / 4.184;
    const f = { id: 's' + code, n: name, k: kcal == null ? null : Math.round(kcal), p: +(nut.proteins_100g || 0), f: +(nut.fat_100g || 0), c: +(nut.carbohydrates_100g || 0), cat: 'Из штрихкода', barcode: code, src: 'Open Food Facts', q: normQ(name) };
    const sq = parseFloat(p.serving_quantity); if (sq > 0 && sq < 2000) { f.ug = sq; f.ul = 'порция'; }
    return f;
  }
  /** result: {food} найден, {partial} нет калорийности, {none:true} не найден, {error} нет сети */
  async function lookup(raw) {
    const code = clean(raw); if (code.length < 8) return { bad: true };
    const db = Store.db, hit = local(code); if (hit) return { food: hit, cached: true };
    db.scanStats.tries++;
    if (!db.prefs.online) { Store.save(); return { none: true, offline: true }; }
    try {
      const f = parse(code, await fetchOff(code));
      if (!f) { Store.save(); return { none: true, code: code }; }
      if (f.k == null) { Store.save(); return { partial: f, code: code }; }
      db.scanStats.hits++; db.scanned.push(f); Store.save(); return { food: f };
    } catch (e) { Store.save(); return { error: String(e && e.message || e), code: code }; }
  }
  const scanner = () => plug('BarcodeScanner');
  async function cameraAvailable() { const s = scanner(); if (!s || !Notify.isNative()) return false; try { const r = await s.isSupported(); return !!(r && r.supported); } catch (e) { return false; } }
  /** Сканирование камерой: возвращает строку штрихкода или null */
  async function scan() {
    const s = scanner(); if (!s) return null;
    const perm = await s.requestPermissions(); if (perm.camera !== 'granted' && perm.camera !== 'limited') throw new Error('Нет разрешения на камеру');
    try { const a = await s.isGoogleBarcodeScannerModuleAvailable(); if (a && a.available === false) await s.installGoogleBarcodeScannerModule(); } catch (e) { }
    const r = await s.scan({ formats: ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E'] });
    return r && r.barcodes && r.barcodes[0] ? r.barcodes[0].rawValue : null;
  }
  return { lookup, clean, cameraAvailable, scan, local };
})();
