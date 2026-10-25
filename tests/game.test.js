const T = require('./_ctx'); const ctx = T.make(['util', 'foods', 'calc', 'plan', 'exercises', 'periods', 'strength', 'store', 'game']);
T.run(ctx, `
const assert=(c,m)=>{if(!c)throw new Error('FAIL '+m)};
Store.load(); const today=dkey();
const P=Store.addProfile({name:'Тест',sex:'m',age:35,height:183,weight:150,activity:1.2,deficitPct:20,goalWeight:128});
P.createdAt=addDays(today,-10); const D=Store.data(); D.weight=[{d:addDays(today,-10),w:150}];
for(let i=9;i>=1;i--){const k=addDays(today,-i); if(i===4) continue; D.food[k]=[{id:'a',slot:'l',n:'x',k:1500,p:100,f:50,c:150,t:'13:00'}];D.water[k]=3000;D.moves[k]=[{min:6}];}
D.weight.push({d:addDays(today,-1),w:147});
let g=Game.compute(P,D,today); assert(g.streak===8,'серия с заморозкой '+g.streak);
// застолье: день засчитывается без записей
Periods.create(D,'feast',addDays(today,-4),null,{}); Store.save(); g=Game.compute(P,D,today); assert(g.streak>=8,'застолье засчитано '+g.streak);
// болезнь: нейтральные дни не рвут серию
const D2=JSON.parse(JSON.stringify(D)); D2.periods=[]; D2.food[addDays(today,-2)]=[]; D2.water[addDays(today,-2)]=0; D2.moves[addDays(today,-2)]=[];
Periods.create(D2,'sick',addDays(today,-3),addDays(today,-2),{}); Store.save(); const g2=Game.compute(P,D2,today); console.log('серия при болезни',g2.streak); assert(g2.streak>=6,'болезнь нейтральна');
// вес после события не в тренде
D.weight.push({d:addDays(today,-3),w:155}); D.weight.sort((a,b)=>a.d<b.d?-1:1); Store.save(); g=Game.compute(P,D,today); assert(g.ma.every(m=>m.w<150.5),'вес после застолья исключён из тренда: '+JSON.stringify(g.ma.slice(-2)));
// силовые
D.strength.tests.push({d:addDays(today,-8),sts:10},{d:today,sts:16}); D.strength.sessions.push({d:today,type:'A',exs:[]}); Store.save(); g=Game.compute(P,D,today);
assert(g.unlocked.some(a=>a.id==='str_test')&&g.unlocked.some(a=>a.id==='sts5'),'достижения силы');
D.moves[today]=[{min:6}]; D.food[today]=[{id:'b',slot:'b',n:'y',k:1500,p:100,f:50,c:150,t:'09:00'}]; D.water[today]=3000; Store.save(); g=Game.compute(P,D,today);
console.log('xp',g.xp,'level',g.level,'challenges',g.challenges.map(c=>c.id).join());
const exp=Store.exportJson(); Store.importJson(exp); assert(Store.db.profiles.length===1&&Store.db.v===2&&Store.prof().inventory.db.step===1,'импорт и миграция');
// импорт копии версии 1
const v1=JSON.parse(exp); v1.db.v=1; delete v1.db.prefs.kit; delete v1.db.scanned; delete v1.db.profiles[0].inventory; delete v1.db.data[v1.db.profiles[0].id].periods; delete v1.db.data[v1.db.profiles[0].id].strength;
Store.importJson(JSON.stringify(v1)); assert(Store.db.prefs.kit.stove===true&&Array.isArray(Store.db.scanned)&&Store.prof().inventory.band==='no'&&Array.isArray(Store.data().periods)&&Store.data().strength.sessions.length===0,'миграция v1→v2');
console.log('OK game');`);
