/* Хранилище: всё лежит на телефоне (localStorage WebView), экспорт/импорт в JSON. */
const Store = (function () {
  const KEY = 'legche_v1';
  let db = null, rev = 0, listeners = [];
  const defNotif = () => ({
    on: false, days: [1, 2, 3, 4, 5],
    workStart: '09:00', workEnd: '18:00', lunchFrom: '13:00', lunchTo: '14:00',
    moveEvery: 60, waterEvery: 90,
    weigh: { on: true, dow: 1, time: '08:00' },
    bp: { on: false, times: ['08:00', '20:00'] },
    glu: { on: false, time: '07:30' },
    diary: { on: true, time: '20:30' },
    backup: { on: true, dow: 0, time: '19:00' }
  });
  const newData = () => ({ food: {}, water: {}, weight: [], meas: [], bp: [], glu: [], moves: {}, customFoods: [], recipes: [], fav: [], recent: [], rewards: {}, ach: {}, ms: {}, best: 0 });
  const blank = () => ({ v: 1, activeId: null, profiles: [], data: {}, notif: defNotif(), prices: {}, seeds: {}, prefs: { budget: 2, reserveDow: -1, persons: 'me' }, partners: [] });

  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || !db.profiles) db = blank();
    const b = blank();
    Object.keys(b).forEach(k => { if (db[k] === undefined) db[k] = b[k]; });
    Object.keys(b.notif).forEach(k => { if (db.notif[k] === undefined) db.notif[k] = b.notif[k]; });
    Object.keys(b.prefs).forEach(k => { if (db.prefs[k] === undefined) db.prefs[k] = b.prefs[k]; });
    db.profiles.forEach(p => { const d = data(p.id); const n = newData(); Object.keys(n).forEach(k => { if (d[k] === undefined) d[k] = n[k]; }); });
    if (!prof() && db.profiles.length) db.activeId = db.profiles[0].id;
    return db;
  }
  function save() { rev++; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.error('save failed', e); if (typeof toast === 'function') toast('Не удалось сохранить: нет места в памяти'); } listeners.forEach(f => f()); }
  const prof = () => db.profiles.find(p => p.id === db.activeId) || null;
  function data(id) { id = id || db.activeId; if (!db.data[id]) db.data[id] = newData(); return db.data[id]; }
  function addProfile(p) {
    p.id = uid(); p.createdAt = dkey(); p.startWeight = p.weight; p.calcWeight = p.weight;
    db.profiles.push(p); const d = data(p.id); d.weight.push({ d: dkey(), w: p.weight });
    db.activeId = p.id; save(); return p;
  }
  function removeProfile(id) {
    db.profiles = db.profiles.filter(p => p.id !== id); delete db.data[id];
    if (db.activeId === id) db.activeId = db.profiles.length ? db.profiles[0].id : null; save();
  }
  const exportJson = () => JSON.stringify({ app: 'legche', exported: new Date().toISOString(), db: db }, null, 1);
  function importJson(txt) {
    const o = JSON.parse(txt);
    const nd = o.db || o;
    if (!nd || !Array.isArray(nd.profiles)) throw new Error('Неверный формат файла');
    db = nd; localStorage.setItem(KEY, JSON.stringify(db)); load(); save();
  }
  function reset() { db = blank(); save(); }
  return { load, save, prof, data, addProfile, removeProfile, exportJson, importJson, reset, defNotif,
    get db() { return db; }, get rev() { return rev; }, onSave: f => listeners.push(f) };
})();
