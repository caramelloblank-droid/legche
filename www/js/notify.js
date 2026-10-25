/* Локальные уведомления Android (Capacitor LocalNotifications). Работают без интернета и без сервера, в том числе при закрытом приложении. */
const Notify = (function () {
  const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const LN = () => plug('LocalNotifications');
  const ICON = 'ic_stat_legche', COLOR = '#138A8A';
  const MOVE = [
    ['Пора размяться', 'Встаньте, потянитесь, пройдитесь минуту. Спина скажет спасибо.'],
    ['Встаньте на минутку', 'Круги плечами, подъём на носки, 10 глубоких вдохов.'],
    ['Мини-разминка', 'Откройте раздел «Движение»: 2 минуты, и вы снова в тонусе.'],
    ['Не сидите долго', 'Пройдитесь до окна и обратно, выпейте воды.'],
    ['Разомните ноги', 'Подъёмы на носки у опоры — 30 секунд.']
  ];
  const WATER = [
    ['Время воды', 'Выпейте стакан воды и отметьте в приложении.'],
    ['Глоток здоровья', 'Стакан воды перед следующим делом.'],
    ['Вода — лучший перекус', 'Часто голод путают с жаждой. Выпейте воды.'],
    ['Пейте воду', 'Ещё 250 мл ближе к дневной норме.']
  ];
  const mins = t => { const a = t.split(':').map(Number); return a[0] * 60 + a[1]; };
  const hm = m => ({ hour: Math.floor(m / 60), minute: m % 60 });
  function slots(from, to, every, skipFrom, skipTo, offset) {
    const out = []; const a = mins(from) + (offset || 0), b = mins(to);
    for (let t = a; t <= b; t += every) { if (skipFrom && t >= mins(skipFrom) && t < mins(skipTo)) continue; out.push(t); }
    return out;
  }
  /** Формирует список уведомлений из настроек (чистая функция, её же использует тест). */
  function build(cfg) {
    const out = [];
    const mk = (id, ch, title, body, weekday, t, go) => out.push({
      id: id, title: title, body: body, channelId: ch, smallIcon: ICON, iconColor: COLOR, extra: { go: go },
      schedule: { on: Object.assign({ weekday: weekday }, hm(t)), repeats: true, allowWhileIdle: true }
    });
    const mv = slots(cfg.workStart, cfg.workEnd, cfg.moveEvery, cfg.lunchFrom, cfg.lunchTo, 0);
    const wt = slots(cfg.workStart, cfg.workEnd, cfg.waterEvery, cfg.lunchFrom, cfg.lunchTo, 20);
    cfg.days.forEach(d => {
      const wd = d + 1;
      mv.forEach((t, i) => mk(10000 + d * 100 + i, 'move', MOVE[i % MOVE.length][0], MOVE[i % MOVE.length][1], wd, t, 'move'));
      wt.forEach((t, i) => mk(20000 + d * 100 + i, 'water', WATER[i % WATER.length][0], WATER[i % WATER.length][1], wd, t, 'water'));
      if (cfg.diary.on) mk(33000 + d, 'health', 'Дневник питания', 'Запишите, что ели сегодня: так точнее видно прогресс.', wd, mins(cfg.diary.time), 'diary');
    });
    if (cfg.weigh.on) mk(30000, 'health', 'Пора взвеситься', 'Утром, после туалета, до еды. Смотрим на тренд, а не на одно число.', cfg.weigh.dow + 1, mins(cfg.weigh.time), 'weight');
    if (cfg.bp.on) cfg.bp.times.forEach((t, i) => cfg.days.concat([0, 6].filter(x => cfg.days.indexOf(x) < 0)).forEach(d => mk(31000 + d * 10 + i, 'health', 'Измерьте давление', 'Посидите 5 минут спокойно и измерьте. Запишите результат.', d + 1, mins(t), 'bp')));
    if (cfg.glu.on) [0, 1, 2, 3, 4, 5, 6].forEach(d => mk(32000 + d, 'health', 'Измерьте сахар', 'Натощак, до еды. Запишите значение в приложении.', d + 1, mins(cfg.glu.time), 'glu'));
    if (cfg.backup.on) mk(34000, 'health', 'Резервная копия', 'Сохраните данные: Настройки → Экспорт. Так вы ничего не потеряете.', cfg.backup.dow + 1, mins(cfg.backup.time), 'settings');
    return out.slice(0, 450);
  }
  async function ensurePerm() {
    const ln = LN(); if (!ln) return false;
    let p = await ln.checkPermissions();
    if (p.display !== 'granted') p = await ln.requestPermissions();
    return p.display === 'granted';
  }
  async function channels() {
    const ln = LN(); if (!ln || !ln.createChannel) return;
    const ch = [['water', 'Вода', 'Напоминания пить воду'], ['move', 'Разминка', 'Напоминания встать и размяться'], ['health', 'Здоровье и записи', 'Вес, давление, сахар, дневник']];
    for (const c of ch) { try { await ln.createChannel({ id: c[0], name: c[1], description: c[2], importance: 4, visibility: 1, vibration: true }); } catch (e) { } }
  }
  async function cancelAll() {
    const ln = LN(); if (!ln) return;
    const p = await ln.getPending();
    const mine = (p.notifications || []).filter(n => n.id < 40000);
    if (mine.length) await ln.cancel({ notifications: mine.map(n => ({ id: n.id })) });
  }
  /** Применить настройки: отменить старые, поставить новые. */
  async function apply(cfg) {
    if (!isNative()) return { ok: false, reason: 'web' };
    try {
      await cancelAll();
      if (!cfg.on) return { ok: true, count: 0 };
      if (!(await ensurePerm())) return { ok: false, reason: 'perm' };
      await channels();
      const list = build(cfg);
      const ln = LN();
      for (let i = 0; i < list.length; i += 80) await ln.schedule({ notifications: list.slice(i, i + 80) });
      return { ok: true, count: list.length };
    } catch (e) { console.error(e); return { ok: false, reason: 'error', msg: String(e && e.message || e) }; }
  }
  async function test() {
    if (!isNative()) {
      if ('Notification' in window) { const p = await Notification.requestPermission(); if (p === 'granted') { new Notification('Легче', { body: 'Тестовое уведомление' }); return { ok: true }; } }
      return { ok: false, reason: 'web' };
    }
    try {
      if (!(await ensurePerm())) return { ok: false, reason: 'perm' };
      await channels();
      await LN().schedule({ notifications: [{ id: 1, title: 'Легче', body: 'Уведомления работают. Это тест.', channelId: 'health', smallIcon: ICON, iconColor: COLOR, schedule: { at: new Date(Date.now() + 4000), allowWhileIdle: true } }] });
      return { ok: true };
    } catch (e) { return { ok: false, reason: 'error', msg: String(e && e.message || e) }; }
  }
  /** Разовое уведомление (например, «измерьте давление» наутро после застолья) */
  async function oneShot(id, title, body, at) {
    if (!isNative()) return false;
    try { if (!(await ensurePerm())) return false; await channels(); await LN().schedule({ notifications: [{ id: id, title: title, body: body, channelId: 'health', smallIcon: ICON, iconColor: COLOR, extra: { go: 'bp' }, schedule: { at: at, allowWhileIdle: true } }] }); return true; } catch (e) { return false; }
  }
  async function cancelIds(ids) { const ln = LN(); if (!ln || !ids.length) return; try { await ln.cancel({ notifications: ids.map(id => ({ id: id })) }); } catch (e) { } }
  /** Диагностика напоминаний */
  async function diag() {
    const out = { native: isNative(), perm: null, exact: null, pending: null, next: null };
    if (!out.native) return out;
    const ln = LN(); if (!ln) { out.perm = 'нет плагина'; return out; }
    try { out.perm = (await ln.checkPermissions()).display; } catch (e) { out.perm = 'ошибка'; }
    out.exact = await exactStatus();
    try {
      const p = await ln.getPending(); out.pending = (p.notifications || []).length;
      const now = new Date(); let best = null;
      (p.notifications || []).forEach(n => {
        const on = n.schedule && n.schedule.on; if (!on) { if (n.schedule && n.schedule.at) { const t = new Date(n.schedule.at); if (t > now && (!best || t < best.t)) best = { t: t, title: n.title }; } return; }
        for (let d = 0; d < 8; d++) { const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, on.hour || 0, on.minute || 0); if (t > now && (on.weekday == null || t.getDay() + 1 === on.weekday)) { if (!best || t < best.t) best = { t: t, title: n.title }; break; } }
      });
      out.next = best;
    } catch (e) { out.pending = 'ошибка'; }
    return out;
  }
  async function exactStatus() { const ln = LN(); if (!ln || !ln.checkExactNotificationSetting) return null; try { return (await ln.checkExactNotificationSetting()).exact_alarm; } catch (e) { return null; } }
  async function openExact() { const ln = LN(); if (ln && ln.changeExactNotificationSetting) { try { await ln.changeExactNotificationSetting(); } catch (e) { } } }
  function onTap(cb) { const ln = LN(); if (ln && ln.addListener) ln.addListener('localNotificationActionPerformed', ev => { const g = ev && ev.notification && ev.notification.extra && ev.notification.extra.go; if (g) cb(g); }); }
  return { isNative, build, apply, test, exactStatus, openExact, onTap, slots, mins, oneShot, cancelIds, diag };
})();
if (typeof module !== 'undefined') module.exports = Notify;
