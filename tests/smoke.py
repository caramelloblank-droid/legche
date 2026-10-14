import sys, json
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,locale='ru-RU')
    pg=ctx.new_page()
    pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)))
    pg.on('console',lambda m:errs.append('CONSOLE '+m.text) if m.type=='error' else None)
    pg.on('dialog',lambda d:d.accept())
    dismiss=lambda: pg.evaluate("document.querySelectorAll('.celebrate').forEach(e=>e.remove())")
    pg.goto('file:///home/claude/legche/www/index.html')
    pg.wait_for_selector('#pn')
    pg.screenshot(path='/tmp/s0_onb.png')
    pg.fill('#pn','Алекс'); pg.select_option('#px','m'); pg.fill('#pa','35'); pg.fill('#ph','183'); pg.fill('#pw','150')
    pg.click('[data-a=onb-ok]')
    pg.wait_for_selector('text=Ваша норма')
    pg.screenshot(path='/tmp/s1_norm.png')
    pg.click('text=Позже')
    # добавить еду
    pg.click('[data-a=food-add]')
    pg.fill('#fq','гречка'); pg.wait_for_timeout(200)
    pg.screenshot(path='/tmp/s2_search.png')
    pg.click('[data-a=pick-food] >> nth=0'); pg.wait_for_selector('#fg')
    pg.fill('#fg','250'); pg.click('[data-a=amt-ok]')
    pg.fill('#fq','яйцо'); pg.wait_for_timeout(100); pg.click('[data-a=pick-food] >> nth=0'); pg.click('[data-a=amt-ok]')
    pg.click('[data-a=sheet-close]'); pg.wait_for_selector('.celebrate'); pg.screenshot(path='/tmp/s2b_cele.png'); pg.click('[data-a=celebrate-close]')
    for i in range(3): pg.click('[data-a=water][data-ml="500"]')
    pg.screenshot(path='/tmp/s3_today.png',full_page=False)
    pg.evaluate("document.getElementById('main').scrollTop=600"); pg.screenshot(path='/tmp/s3b_today.png')
    for tab,name in [('diary','diary'),('plan','plan'),('move','move'),('prog','prog')]:
        dismiss(); pg.click('[data-a=tab][data-t=%s]'%tab); pg.wait_for_timeout(100); pg.screenshot(path='/tmp/s4_%s.png'%name)
    # план: подвкладки
    dismiss(); pg.click('[data-a=tab][data-t=plan]')
    for s in ['week','shop','basket']:
        pg.click('[data-a=plan-sub][data-s=%s]'%s); pg.wait_for_timeout(80); pg.screenshot(path='/tmp/s5_plan_%s.png'%s)
    pg.click('[data-a=plan-sub][data-s=day]'); pg.click('[data-a=plan-eat] >> nth=0')
    # вес, давление, сахар
    pg.click('[data-a=tab][data-t=prog]')
    dismiss(); pg.click('[data-a=weight-add]'); pg.fill('#wv','148.5'); pg.click('[data-a=weight-ok]'); pg.wait_for_timeout(200); dismiss()
    for s,fn in [('bp',lambda: (pg.click('[data-a=bp-add]'),pg.fill('#bs','150'),pg.fill('#bd','95'),pg.click('[data-a=bp-ok]'),pg.click('[data-a=sheet-close]'))),
                 ('glu',lambda: (pg.click('[data-a=glu-add]'),pg.fill('#gv','7.4'),pg.click('[data-a=glu-ok]'),pg.click('[data-a=sheet-close]'))),
                 ('body',lambda: (pg.click('[data-a=meas-add]'),pg.fill('#mw','140'),pg.fill('#mh','150'),pg.click('[data-a=meas-ok]'))),
                 ('rew',lambda: None),('pair',lambda: None),('weight',lambda: None)]:
        dismiss(); pg.click('[data-a=prog-sub][data-s=%s]'%s); pg.wait_for_timeout(80); fn(); dismiss(); pg.wait_for_timeout(80); pg.screenshot(path='/tmp/s6_%s.png'%s)
    # движение с давлением 150/95 (один замер)
    dismiss(); pg.click('[data-a=tab][data-t=move]'); pg.screenshot(path='/tmp/s7_move.png')
    pg.click('[data-a=run-start][data-kind=micro]'); pg.wait_for_selector('#runner .tm'); pg.wait_for_timeout(1300); pg.screenshot(path='/tmp/s8_run.png')
    pg.click('[data-a=run-stop]'); pg.wait_for_timeout(100)
    # настройки
    dismiss(); pg.click('[data-a=settings]'); pg.wait_for_selector('#nOn',state='attached'); pg.screenshot(path='/tmp/s9_settings.png')
    pg.click('[data-a=notif-save]'); pg.wait_for_timeout(200)
    pg.click('[data-a=sheet-close]')
    # второй профиль
    dismiss(); pg.click('[data-a=profiles]'); pg.click('[data-a=profile-new]'); pg.fill('#pn','Маша'); pg.select_option('#px','f'); pg.fill('#pa','30'); pg.fill('#ph','172'); pg.fill('#pw','120')
    pg.click('[data-a=onb-ok]'); pg.click('text=Позже')
    pg.click('[data-a=tab][data-t=prog]'); pg.click('[data-a=prog-sub][data-s=pair]'); pg.wait_for_timeout(100); pg.screenshot(path='/tmp/s10_pair.png')
    pg.click('[data-a=tab][data-t=plan]'); pg.click('[data-a=plan-sub][data-s=shop]'); pg.select_option('[data-c=shopWho]','all'); pg.wait_for_timeout(100); pg.screenshot(path='/tmp/s11_shop_all.png')
    pg.reload(); pg.wait_for_selector('#main'); 
    print('profiles after reload:', pg.evaluate("Store.db.profiles.length"))
    # тёмная тема
    ctx2=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,color_scheme='dark',locale='ru-RU')
    pg2=ctx2.new_page(); pg2.goto('file:///home/claude/legche/www/index.html'); pg2.wait_for_selector('#pn'); pg2.screenshot(path='/tmp/s12_dark.png')
    b.close()
print('ERRORS:',errs if errs else 'none')
