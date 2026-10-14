"""Генерация иконок и заставки (запускается один раз локально; результат лежит в assets/)."""
import math
from PIL import Image, ImageDraw
TEAL=(17,127,127); DEEP=(11,95,95); WHITE=(255,255,255)
def drop(d, cx, cy, s, fill):
    r=0.27*s; top=cy-0.40*s; ccy=cy+0.08*s; dd=ccy-top
    phi=math.acos(r/dd)
    p1=(cx-r*math.sin(phi), ccy-r*math.cos(phi)); p2=(cx+r*math.sin(phi), ccy-r*math.cos(phi))
    d.polygon([(cx,top),p1,p2],fill=fill); d.ellipse([cx-r,ccy-r,cx+r,ccy+r],fill=fill)
    return ccy,r
def check(d,cx,cy,s,col):
    w=int(0.05*s)
    pts=[(cx-0.12*s,cy+0.00*s),(cx-0.03*s,cy+0.09*s),(cx+0.14*s,cy-0.09*s)]
    d.line(pts,fill=col,width=w,joint='curve')
    for p in (pts[0],pts[-1]): d.ellipse([p[0]-w/2,p[1]-w/2,p[0]+w/2,p[1]+w/2],fill=col)
def grad(size):
    im=Image.new('RGB',(size,size),TEAL); px=im.load()
    for y in range(size):
        t=y/size
        c=tuple(int(TEAL[i]*(1-t)+DEEP[i]*t) for i in range(3))
        for x in range(size): px[x,y]=c
    return im
def icon_only(size=1024):
    S=size*2; im=grad(S).convert('RGBA'); d=ImageDraw.Draw(im)
    ccy,r=drop(d,S/2,S/2,S*0.74,WHITE); check(d,S/2,ccy,S*0.74,TEAL)
    return im.resize((size,size),Image.LANCZOS)
def foreground(size=1024):
    S=size*2; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    ccy,r=drop(d,S/2,S/2,S*0.50,WHITE); check(d,S/2,ccy,S*0.50,TEAL)
    return im.resize((size,size),Image.LANCZOS)
def splash(size,bg,dark):
    im=Image.new('RGB',(size,size),bg); ic=icon_only(int(size*0.22))
    mask=Image.new('L',ic.size,0); ImageDraw.Draw(mask).rounded_rectangle([0,0,ic.size[0]-1,ic.size[1]-1],radius=int(ic.size[0]*0.22),fill=255)
    im.paste(ic.convert('RGB'),((size-ic.size[0])//2,(size-ic.size[1])//2),mask); return im
icon_only().convert('RGB').save('assets/icon-only.png')
foreground().save('assets/icon-foreground.png')
grad(1024).save('assets/icon-background.png')
splash(2732,(242,245,249),False).save('assets/splash.png')
splash(2732,(14,22,32),True).save('assets/splash-dark.png')
print('icons ok')
