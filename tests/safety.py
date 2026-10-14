from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844})
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file:///home/claude/legche/www/index.html'); pg.wait_for_selector('#pn')
    pg.fill('#pn','Т'); pg.fill('#pa','35'); pg.fill('#ph','183'); pg.fill('#pw','150'); pg.click('[data-a=onb-ok]'); pg.click('text=Позже')
    def bp(s,d):
        pg.click('[data-a=tab][data-t=prog]'); pg.click('[data-a=prog-sub][data-s=bp]'); pg.click('[data-a=bp-add]')
        pg.fill('#bs',str(s)); pg.fill('#bd',str(d)); pg.click('[data-a=bp-ok]'); pg.wait_for_timeout(100)
        if pg.query_selector('[data-a=sheet-close] >> text=Понятно'): pg.click('text=Понятно')
        pg.evaluate("document.querySelectorAll('.celebrate').forEach(e=>e.remove())")
    def move_state():
        pg.click('[data-a=tab][data-t=move]'); pg.wait_for_timeout(80)
        t=pg.inner_text('#main'); return ('Нагрузки отменены' in t, 'Облегчённый режим' in t, pg.query_selector('[data-a=run-start][data-kind=main]') is not None, pg.query_selector('[data-a=walk]') is not None)
    print('норма  :',move_state())
    bp(150,95); print('1x150/95:',move_state())
    bp(148,93); print('2x ≥140 :',move_state())
    bp(190,115); print('190/115 :',move_state())
    # крайний случай: пересчёт нормы и поиск
    pg.click('[data-a=tab][data-t=today]'); pg.click('[data-a=food-add]'); pg.fill('#fq','гречка'); pg.wait_for_timeout(100)
    print('поиск «гречка» первые:',[x.inner_text().split('\n')[0] for x in pg.query_selector_all('[data-a=pick-food] b')[:3]])
    pg.fill('#fq','яйцо'); pg.wait_for_timeout(100); print('поиск «яйцо»:',[x.inner_text() for x in pg.query_selector_all('[data-a=pick-food] b')[:2]])
    b.close()
print('ERR',errs or 'none')
