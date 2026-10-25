#!/usr/bin/env python3
"""Проверка и подготовка контента (рецепты, продукты, советы).
  python3 ci/build_content.py --check          только проверить
  python3 ci/build_content.py --auto           проверить и обновить manifest.json (версия +1, если файл изменился)
  python3 ci/build_content.py --copy           скопировать content/ в www/content/ (для сборки APK)
Опции можно сочетать: --auto --copy"""
import hashlib, json, os, shutil, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
C = os.path.join(ROOT, 'content')
errors, warns = [], []

def load(name):
    with open(os.path.join(C, name), 'rb') as f:
        raw = f.read()
    if raw.startswith(b'\xef\xbb\xbf'):
        errors.append(name + ': файл сохранён с BOM, сохраните как UTF-8 без BOM')
    try:
        return raw, json.loads(raw.decode('utf-8'))
    except Exception as e:
        errors.append(name + ': не удалось прочитать JSON: ' + str(e)); return raw, None

def check_foods(foods):
    if not isinstance(foods, list) or len(foods) < 50:
        errors.append('foods.json: слишком мало продуктов'); return {}
    names = {}
    for i, x in enumerate(foods):
        n = x.get('n') if isinstance(x, dict) else None
        if not n: errors.append('foods.json #%d: нет названия (n)' % i); continue
        for k in 'kpfc':
            v = x.get(k)
            if not isinstance(v, (int, float)) or v < 0: errors.append('foods.json «%s»: неверное поле %s' % (n, k))
        if isinstance(x.get('k'), (int, float)) and x['k'] > 950: errors.append('foods.json «%s»: калорийность > 950' % n)
        if n.lower() in names: errors.append('foods.json: повтор «%s»' % n)
        names[n.lower()] = 1
        calc = 4 * (x.get('p') or 0) + 9 * (x.get('f') or 0) + 4 * (x.get('c') or 0)
        if x.get('k', 0) > 40 and abs(calc - x['k']) / x['k'] > 0.35 and 'алкоголь' not in x.get('cat', '').lower():
            warns.append('foods.json «%s»: калорийность %s не сходится с БЖУ (%d)' % (n, x['k'], calc))
    return names

TYPES = {'stove', 'oven', 'multicooker', 'blender', 'toaster', 'microwave', 'none'}
def check_recipes(rs, names):
    if not isinstance(rs, list) or len(rs) < 10:
        errors.append('recipes.json: слишком мало рецептов'); return
    ids = {}
    for r in rs:
        rid = r.get('id') if isinstance(r, dict) else None
        if not rid: errors.append('recipes.json: рецепт без id'); continue
        if rid in ids: errors.append('recipes.json: повтор id %s' % rid)
        ids[rid] = 1
        if not r.get('name'): errors.append(rid + ': нет названия (name)')
        if r.get('meal') not in ('b', 'l', 'd', 's'): errors.append(rid + ': meal должен быть b, l, d или s')
        if r.get('cost') not in (1, 2, 3): errors.append(rid + ': cost должен быть 1, 2 или 3')
        ings = r.get('ingredients') or []
        if not ings: errors.append(rid + ': нет ингредиентов')
        for it in ings:
            if not (isinstance(it, list) and len(it) == 2): errors.append(rid + ': ингредиент должен быть [название, граммы]'); continue
            if it[0].lower() not in names: errors.append('%s: «%s» нет в базе продуктов (foods.json)' % (rid, it[0]))
            if not (isinstance(it[1], (int, float)) and it[1] > 0): errors.append('%s: граммы «%s»' % (rid, it[0]))
        ms = r.get('methods') or []
        if not ms: errors.append(rid + ': нет способов приготовления (methods)')
        for m in ms:
            if m.get('type') not in TYPES: errors.append('%s: неизвестный способ «%s»' % (rid, m.get('type')))
            if m.get('type') in ('oven', 'multicooker') and not (m.get('tempC') and m.get('timeMin')):
                errors.append('%s: для %s нужны timeMin и tempC' % (rid, m.get('type')))
            if not m.get('steps') or not all(isinstance(s, str) and s for s in m['steps']): errors.append(rid + ': нужны шаги (steps)')

def main():
    args = set(sys.argv[1:])
    f_raw, foods = load('foods.json'); r_raw, recipes = load('recipes.json'); t_raw, tips = load('tips.json')
    names = check_foods(foods) if foods is not None else {}
    if recipes is not None: check_recipes(recipes, names)
    if not isinstance(tips, list) or not tips: errors.append('tips.json: нужен непустой список строк')
    # manifest
    mp = os.path.join(C, 'manifest.json')
    man = json.load(open(mp, encoding='utf8')) if os.path.exists(mp) else {'schema': 2, 'minApp': '2.0.0', 'packs': {}}
    info = {'foods': ('foods.json', f_raw, foods), 'recipes': ('recipes.json', r_raw, recipes), 'tips': ('tips.json', t_raw, tips)}
    changed = []
    for k, (fname, raw, data) in info.items():
        h = hashlib.sha256(raw).hexdigest()
        p = man['packs'].get(k) or {'version': 0, 'file': fname}
        p['file'] = fname; p['count'] = len(data) if isinstance(data, list) else 0
        if p.get('sha256') != h:
            if '--auto' in args or not p.get('sha256'):
                p['version'] = p.get('version', 0) + 1; p['sha256'] = h; changed.append('%s -> версия %d' % (k, p['version']))
            else:
                warns.append('%s: файл изменён, но manifest не обновлён (запустите с --auto)' % fname)
        man['packs'][k] = p
    for w in warns[:15]: print('внимание:', w)
    if errors:
        print('ОШИБКИ В КОНТЕНТЕ:')
        for e in errors[:40]: print('  -', e)
        print('Всего ошибок:', len(errors)); sys.exit(1)
    if '--auto' in args or changed:
        with open(mp, 'w', encoding='utf8') as f: json.dump(man, f, ensure_ascii=False, indent=2); f.write('\n')
    if changed: print('manifest обновлён:', '; '.join(changed))
    print('Контент в порядке: продуктов %d, рецептов %d, советов %d' % (len(foods), len(recipes), len(tips)))
    if '--copy' in args:
        dst = os.path.join(ROOT, 'www', 'content')
        if os.path.isdir(dst): shutil.rmtree(dst)
        shutil.copytree(C, dst); print('скопировано в www/content/')

if __name__ == '__main__':
    main()
