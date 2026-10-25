const T = require('./_ctx'); const ctx = T.make(['util', 'foods', 'calc', 'plan']);
T.run(ctx, `
const assert=(c,m)=>{if(!c)throw new Error('FAIL '+m)};
// 1. все ингредиенты есть в базе, у каждого рецепта хотя бы один способ и шаги
let bad=0; MealPlan.DISHES.forEach(d=>{ d.ing.forEach(([n])=>{if(!findFood(n)){console.log('нет в базе',d.id,n);bad++}});
  if(!d.methods.length){console.log('нет способов',d.id);bad++}
  d.methods.forEach(m=>{ if(!m.steps||!m.steps.length){console.log('нет шагов',d.id);bad++}
    if((m.type==='oven'||m.type==='multicooker')&&(!m.tempC||!m.timeMin)){console.log('нет времени/температуры',d.id,m.type);bad++} }); });
assert(!bad,'содержимое рецептов');
assert(MealPlan.DISHES.length>=125,'число рецептов '+MealPlan.DISHES.length);
// 2. диапазоны калорийности порций
const KR={b:[250,620],l:[330,720],d:[250,640],s:[90,330]};
MealPlan.DISHES.forEach(d=>{const k=MealPlan.macro(d.ing).k; if(k<KR[d.m][0]||k>KR[d.m][1]) console.log('внимание: калорийность',d.id,d.n,k)});
// 3. правила недели по многим сериям и разной технике
const kits={all:MealPlan.defKit(), noMulti:Object.assign(MealPlan.defKit(),{multi:false}), noOven:Object.assign(MealPlan.defKit(),{oven:false})};
let worst={multi:0,fish:9,legume:0,leg0:9,methods:9};
for(const [kn,kit] of Object.entries(kits)) for(const mf of [false,true]) for(let seed=0;seed<40;seed++){
  const w=MealPlan.genWeek(2000,'2026-10-12',{seed,kit,multiFirst:mf,maxCost:2,reserveDow:5});
  const mt=w.meta; worst.multi=Math.max(worst.multi,mt.multiShare); worst.fish=Math.min(worst.fish,mt.fishDays); worst.leg0=Math.min(worst.leg0,mt.legumeDays); worst.legume=Math.max(worst.legume,mt.legumeDays); if(kn==='all')worst.methods=Math.min(worst.methods,mt.methods.length);
  assert(w.days.length===7&&w.days.every(d=>d.meals.length===5),'структура');
  const avg=w.days.reduce((s,d)=>s+d.tot.k,0)/7; assert(Math.abs(avg-2000)/2000<0.07,'среднее '+avg);
  if(kn==='noMulti') w.days.forEach(d=>d.meals.forEach(m=>assert(m.method!=='multicooker','мультиварка выключена')));
  if(kn==='noOven') w.days.forEach(d=>d.meals.forEach(m=>assert(m.method!=='oven','духовка выключена')));
}
console.log('худшие значения по сериям:',JSON.stringify(worst));
assert(worst.multi<=0.5,'мультиварки не более 50%: '+worst.multi);
assert(worst.fish>=2,'рыба >= 2 дней: '+worst.fish);
assert(worst.leg0>=2&&worst.legume<=3,'бобовые 2–3 дня');
assert(worst.methods>=3,'способов >= 3 (полная кухня): '+worst.methods);
// 4. приоритет мультиварки повышает долю, но не выше 50%
let a=0,b=0;for(let s=0;s<40;s++){a+=MealPlan.genWeek(2000,'2026-10-19',{seed:s,multiFirst:false}).meta.multiShare;b+=MealPlan.genWeek(2000,'2026-10-19',{seed:s,multiFirst:true}).meta.multiShare}
console.log('доля мультиварки без/с приоритетом',(a/40).toFixed(2),(b/40).toFixed(2)); assert(b>=a,'приоритет работает');
// 5. исключения и бюджет
const ex=MealPlan.genWeek(2000,'2026-10-12',{exclude:['рыб','минтай','хек','треска','горбуш','скумбр','тунец','креветк','лосос','сёмг']});
ex.days.forEach(d=>d.meals.forEach(m=>m.ing.forEach(([n])=>assert(!/минтай|хек|треска|горбуш|скумбр|тунец|креветк|лосос/i.test(n),'исключение '+n))));
// 6. список покупок, подсказки, план готовки
const A=MealPlan.genWeek(1890,'2026-10-12',{maxCost:2}),B=MealPlan.genWeek(2370,'2026-10-12',{maxCost:2});
const dates=A.days.map(d=>d.date);const sh=MealPlan.shopping([A,B],dates,{},{});
console.log('покупки: позиций',sh.items.length,'сумма',sh.total,'запасы',sh.pantryTotal,'подсказок',MealPlan.savings(sh.items,{}).length,'готовка впрок',MealPlan.prepPlan(A,dates,MealPlan.defKit(),false).length);
const sh2=MealPlan.shopping([A,B],dates,{},{'Картофель сырой':true}); assert(sh2.total<sh.total,'«есть дома» вычитается');
// 7. замена блюда
const c=MealPlan.genWeek(2000,'2026-10-12',{});MealPlan.replaceMeal(c,c.days[0].date,2,'l15');assert(c.days[0].meals[2].dishId==='l15','замена');
// 8. поиск
assert(searchFoods(FOODS,'курица',5).length>0&&searchFoods(FOODS,'картошка',5)[0].n.indexOf('Картофель')===0&&searchFoods(FOODS,'яйца',3)[0].n==='Яйцо куриное','поиск');
console.log('OK plan');`);
