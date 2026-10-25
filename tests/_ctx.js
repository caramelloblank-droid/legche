/* Общая загрузка модулей для автотестов: создаёт «браузерный» контекст и подгружает содержимое из content/ */
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
exports.make = function (files, extra) {
  const ls = {};
  const ctx = Object.assign({ module: {}, console, localStorage: { getItem: k => ls[k] || null, setItem: (k, v) => { ls[k] = v; } }, window: {} }, extra || {});
  vm.createContext(ctx);
  files.forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, 'www/js', f + '.js'), 'utf8'), ctx));
  const j = n => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', n), 'utf8'));
  if (files.indexOf('foods') >= 0) ctx.__foods = j('foods.json'), vm.runInContext('setFoods(__foods)', ctx);
  if (files.indexOf('plan') >= 0) ctx.__recipes = j('recipes.json'), vm.runInContext('MealPlan.setRecipes(__recipes)', ctx);
  return ctx;
};
exports.run = (ctx, code) => vm.runInContext(code, ctx);
