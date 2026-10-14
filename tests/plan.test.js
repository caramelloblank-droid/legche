const vm=require('vm'),fs=require('fs');
const ctx={module:{},console};vm.createContext(ctx);
['util','foods','calc','plan'].forEach(f=>vm.runInContext(fs.readFileSync('www/js/'+f+'.js','utf8'),ctx));
vm.runInContext(`
let bad=0;MealPlan.DISHES.forEach(d=>d.ing.forEach(([n])=>{if(!findFood(n)){console.log('MISSING',d.id,n);bad++}}));
if(bad) throw new Error('missing ingredients');
const base=MealPlan.DISHES.map(d=>d.id+':'+MealPlan.macro(d.ing).k).join(' ');console.log(base);
for(const t of [1500,1890,2370]){
 const w=MealPlan.genWeek(t,'2026-10-12',{seed:0,maxCost:2,reserveDow:5});
 const avg=w.days.reduce((s,d)=>s+d.tot.k,0)/7;
 console.log('target',t,'avg',Math.round(avg),'sat',w.days[5].tot.k,'mon',w.days[0].tot.k,'P',w.days[0].tot.p, w.days[0].meals.map(m=>m.dishId).join(','));
 if(Math.abs(avg-t)/t>0.06) throw new Error('avg off');
}
const a=MealPlan.genWeek(1890,'2026-10-12',{maxCost:2}),b=MealPlan.genWeek(2370,'2026-10-12',{maxCost:2});
const dates=a.days.map(d=>d.date);const sh=MealPlan.shopping([a,b],dates,{});
console.log('shopping items',sh.items.length,'total',sh.total);
console.log(sh.items.slice(0,6).map(i=>i.n+' '+i.buyG+'г '+i.cost+'₽').join('; '));
console.log('OK plan');
`,ctx);
