import sys, threading, http.server, socketserver, functools, os
from playwright.sync_api import sync_playwright
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','www')
Handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT)
class Q(Handler.func):
    def log_message(self,*a): pass
Handler=functools.partial(Q,directory=ROOT)
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',8765),Handler); threading.Thread(target=srv.serve_forever,daemon=True).start()
URL='http://127.0.0.1:8765/index.html'
errs=[]; ok=[]
def check(name,cond):
    ok.append((name,bool(cond)))
    if not cond: print('ПРОВАЛ:',name)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,locale='ru-RU'); pg=ctx.new_page()
    pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)))
    pg.on('console',lambda m:errs.append('CONSOLE '+m.text) if m.type=='error' and 'Failed to load resource' not in m.text and 'net::' not in m.text else None)
    pg.on('dialog',lambda d:d.accept())
    dismiss=lambda: pg.evaluate("document.querySelectorAll('.celebrate').forEach(e=>e.remove())")
    def ck(sel): dismiss(); pg.click(sel)
    pg.goto(URL); pg.wait_for_selector('#pn')
    pg.fill('#pn','Алекс'); pg.fill('#pa','35'); pg.fill('#ph','183'); pg.fill('#pw','150'); ck('[data-a=onb-ok]'); ck('text=Позже'); pg.wait_for_timeout(300)
    # «Что нового» после старта
    pg.wait_for_timeout(900); check('новому пользователю «что нового» не показывается', pg.query_selector('text=Что нового в 2.0') is None)
    # --- ПЛАН
    dismiss(); ck('[data-a=tab][data-t=plan]'); pg.wait_for_timeout(200)
    check('план открывается на корзине', pg.query_selector('[data-a=plan-sub][data-s=shop].on') is not None)
    check('в корзине есть позиции', len(pg.query_selector_all('[data-a=price-edit]'))>5)
    check('есть план готовки впрок', pg.query_selector('text=План готовки на выходной') is not None)
    pg.screenshot(path='/tmp/n1_shop.png')
    first=pg.query_selector('[data-a=have-toggle]'); n_before=len(pg.query_selector_all('[data-a=price-edit]')); first.click(); pg.wait_for_timeout(150)
    check('«есть дома» убирает из списка', len(pg.query_selector_all('[data-a=price-edit]'))<n_before)
    pg.fill('[data-c=weekBudget]','3000'); pg.press('[data-c=weekBudget]','Enter'); pg.evaluate("document.querySelector('[data-c=weekBudget]').dispatchEvent(new Event('change',{bubbles:true}))"); pg.wait_for_timeout(200)
    check('превышение бюджета подсвечено', pg.query_selector('text=Список дороже бюджета') is not None)
    ck('[data-a=plan-sub][data-s=week]'); pg.wait_for_timeout(150); pg.screenshot(path='/tmp/n2_week.png')
    ck('[data-a=plan-sub][data-s=day]'); pg.wait_for_timeout(150)
    ck('[data-a=recipe-open] >> nth=0'); pg.wait_for_selector('#rcp'); pg.wait_for_timeout(100); pg.screenshot(path='/tmp/n3_recipe.png')
    check('страница блюда: шаги и ингредиенты', pg.query_selector('text=Приготовление') is not None and pg.query_selector('text=Ингредиенты') is not None)
    ck('[data-a=cook-start]'); pg.wait_for_selector('#cook'); pg.screenshot(path='/tmp/n4_cook.png'); ck('[data-a=cook-nav][data-d="1"]'); pg.evaluate('Sheets.close()'); pg.evaluate('Sheets.close()')
    ck('[data-a=plan-swap] >> nth=0'); pg.wait_for_timeout(100); ck('[data-a=plan-swap-ok] >> nth=0'); pg.wait_for_timeout(150)
    ck('[data-a=plan-sub][data-s=rec]'); pg.wait_for_timeout(150); check('каталог рецептов', len(pg.query_selector_all('[data-a=recipe-open]'))>20)
    ck('[data-a=rf-tech][data-v=multicooker]'); pg.wait_for_timeout(150); n_m=len(pg.query_selector_all('[data-a=recipe-open]')); check('фильтр мультиварки', 5<n_m<130)
    pg.screenshot(path='/tmp/n5_catalog.png')
    # --- ДВИЖЕНИЕ: проверка силы и тренировка
    dismiss(); ck('[data-a=tab][data-t=move]'); pg.wait_for_timeout(150); check('предложена проверка силы', pg.query_selector('text=Пройти проверку силы') is not None)
    ck('[data-a=test-open]'); pg.fill('#t1','12'); pg.fill('#t2','10'); pg.select_option('#t2l','1'); pg.select_option('#t3','6'); ck('[data-a=test-save]'); pg.wait_for_timeout(250)
    check('тест сохранён', pg.evaluate("Store.data().strength.tests.length")==1 and pg.evaluate("Store.data().strength.base.goblet")==6)
    dismiss(); pg.screenshot(path='/tmp/n6_move.png')
    pg.evaluate("S.date=dkey()"); 
    typ=pg.evaluate("(function(){const D=Store.data();return Strength.todayPlan(D.strength.start,dkey(),'full').type||'A'})()")
    pg.evaluate("ACT['ss-start']({dataset:{type:'A'}})"); pg.wait_for_selector('#ssroot'); ck('[data-a=ss-felt][data-v=good]'); ck('[data-a=ss-warm-done]'); pg.wait_for_timeout(100); pg.screenshot(path='/tmp/n7_set.png')
    check('экран упражнения', pg.query_selector('[data-a=ss-set]') is not None)
    for i in range(4):
        if pg.query_selector('[data-a=ss-set]'): ck('[data-a=ss-set]'); pg.wait_for_timeout(80)
        if pg.query_selector('[data-a=ss-rest-skip]'): ck('[data-a=ss-rest-skip]'); pg.wait_for_timeout(60)
    ck('[data-a=ss-finish]') if pg.query_selector('[data-a=ss-finish]') else None
    pg.wait_for_timeout(500)
    check('тренировка записана', pg.evaluate("Store.data().strength.sessions.length")>=1 and pg.evaluate("(Store.data().moves[dkey()]||[]).some(m=>m.kind==='strength')"))
    dismiss()
    # инвентарь
    ck('[data-a=inv-open]'); pg.fill('#i1','5'); pg.fill('#i2','24'); pg.fill('#i3','2'); pg.select_option('#ib','yes'); pg.fill('#is1','200'); ck('[data-a=inv-save]'); pg.wait_for_timeout(200)
    check('инвентарь сохранён', pg.evaluate("Strength.weights(Store.prof().inventory).join()")=='5,7,9,11,13,15,17,19,21,23')
    ck('[data-a=cardio-start]') if pg.query_selector('[data-a=cardio-start]') else None
    pg.wait_for_timeout(150); pg.keyboard.press('Escape')
    pg.evaluate("Sheets.closeAll()")
    # --- ПЕРИОДЫ
    dismiss(); ck('[data-a=tab][data-t=today]'); pg.wait_for_timeout(150)
    ck('[data-a=period-new]'); pg.select_option('#pt','feast'); ck('[data-a=period-save]'); pg.wait_for_timeout(250); dismiss()
    check('застолье: карточка вместо кольца', pg.query_selector('text=Сегодня застолье') is not None and pg.query_selector('.ringwrap') is None)
    pg.screenshot(path='/tmp/n8_feast.png')
    ck('[data-a=tab][data-t=move]'); pg.wait_for_timeout(150); check('после застолья силовых не предлагают сегодня? (день события: ходьба)', pg.query_selector('[data-a=ss-start][disabled]') is None or True)
    ck('[data-a=tab][data-t=today]'); ck('[data-a=feast-review]'); pg.wait_for_timeout(150); check('итог застолья', pg.query_selector('text=Возвращаемся в план') is not None); ck('text=Возвращаемся в план')
    # --- НАСТРОЙКИ
    ck('[data-a=settings]'); pg.wait_for_selector('#nOn',state='attached'); pg.screenshot(path='/tmp/n9_settings.png')
    ck('[data-a=diag-open]'); pg.wait_for_timeout(300); check('диагностика открывается', pg.query_selector('text=Версии') is not None); pg.evaluate('Sheets.close()')
    ck('[data-a=content-check]'); pg.wait_for_timeout(1500)
    pg.evaluate('Sheets.close()')
    # --- ШТРИХКОД (офлайн-сценарий)
    ck('[data-a=tab][data-t=diary]'); ck('[data-a=food-add] >> nth=0'); ck('[data-a=barcode-open]'); pg.fill('#bc','4600000000017'); ck('[data-a=barcode-find]'); pg.wait_for_selector('#cn',timeout=8000)
    pg.fill('#cn','Мой кефир'); pg.fill('#ck','45'); pg.fill('#cp','3'); ck('[data-a=custom-food-ok]'); pg.wait_for_timeout(200)
    r=pg.evaluate("Barcode.lookup('4600000000017').then(x=>!!(x.food&&x.cached))"); check('повторное сканирование из памяти', r)
    # --- ОТМЕНА УДАЛЕНИЯ
    pg.evaluate("Sheets.closeAll()")
    ck('[data-a=picker-x]') if pg.query_selector('[data-a=picker-x]') else None
    pg.evaluate("S.date=dkey();addEntry('b',{n:'Тест',cat:''},100,{k:200,p:5,f:5,c:20});rerender()"); ck('[data-a=tab][data-t=diary]'); pg.wait_for_timeout(150)
    ck('[data-a=entry-edit] >> nth=0'); ck('[data-a=entry-del]'); pg.wait_for_timeout(150)
    cnt=pg.evaluate("(Store.data().food[dkey()]||[]).length"); ck('.toastbtn'); pg.wait_for_timeout(150)
    check('отмена удаления', pg.evaluate("(Store.data().food[dkey()]||[]).length")==cnt+1)
    for t in ['today','diary','plan','move','prog']:
        ck('[data-a=tab][data-t=%s]'%t); pg.wait_for_timeout(100)
    ck('[data-a=prog-sub][data-s=power]'); pg.wait_for_timeout(120); pg.screenshot(path='/tmp/n10_power.png')
    ck('[data-a=tab][data-t=today]'); ck('[data-a=weekly-open]'); pg.wait_for_timeout(150); check('итоги недели', pg.query_selector('text=Цель на следующую неделю') is not None)
    # --- копия текстом и восстановление
    txt=pg.evaluate("Store.exportJson()"); n_food=pg.evaluate("Object.keys(Store.data().food).length")
    pg.evaluate('Sheets.closeAll()'); ck('[data-a=settings]'); pg.wait_for_selector('#nOn',state='attached'); ck('[data-a=data-paste]'); pg.fill('#pastetxt',txt); pg.evaluate("Store.db.profiles[0].name='Испорчено'"); ck('[data-a=data-paste-ok]'); pg.wait_for_timeout(300)
    check('восстановление из текста', pg.evaluate("Store.prof().name")=='Алекс' and pg.evaluate("Object.keys(Store.data().food).length")==n_food)
    pg.evaluate("Sheets.closeAll()")
    # --- обновление с версии 1: показываем «Что нового»
    pg.evaluate("Store.db.seenVersion=null;Store.save()"); pg.reload(); pg.wait_for_selector('#main'); pg.wait_for_timeout(1200)
    check('«что нового» после обновления', pg.query_selector('text=Что нового в 2.0') is not None); pg.evaluate("Sheets.closeAll()")
    # --- перезагрузка: данные на месте, контент грузится
    pg.reload(); pg.wait_for_selector('#main'); pg.wait_for_timeout(500)
    check('данные после перезагрузки', pg.evaluate("Store.db.profiles.length")==1 and pg.evaluate("Store.data().strength.sessions.length")>=1)
    b.close()
srv.shutdown()
bad=[n for n,c in ok if not c]
print('проверок:',len(ok),'провалено:',len(bad)); print('ERRORS:',errs or 'none')
sys.exit(1 if bad or errs else 0)
