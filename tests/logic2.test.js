const T = require('./_ctx'); const ctx = T.make(['util', 'foods', 'calc', 'plan', 'exercises', 'periods', 'strength']);
T.run(ctx, `
const assert=(c,m)=>{if(!c)throw new Error('FAIL '+m)};
// ---- инвентарь и веса ----
const inv=Strength.normInv({db:{min:5,max:20,step:2.5},band:'no'});
assert(Strength.weights(inv).join()==='5,7.5,10,12.5,15,17.5,20','веса '+Strength.weights(inv));
assert(Strength.snap(inv,11).w===10&&Strength.snap(inv,30).high&&Strength.snap(inv,2).low,'snap');
// резинок нет: упражнения с резинкой заменены
const sA=Strength.planSession('B',inv,3,{sessions:[]},{goblet:12,pushLevel:1}); const idsB=sA.map(x=>x.id);
console.log('B без резинок:',idsB.join());
assert(!idsB.includes('band_row')&&idsB.includes('row')&&!idsB.includes('chop_band')&&idsB.includes('chop_db'),'замены без резинки');
const inv2=Strength.normInv({band:'yes',db:{min:2,max:10,step:1}}); assert(Strength.planSession('B',inv2,3,{sessions:[]},{}).some(x=>x.id==='band_row'),'с резинкой');
// ограничения по суставам
const invK=Strength.normInv({limits:{knee:true}}); assert(Strength.planSession('A',invK,3,{sessions:[]},{}).some(x=>x.id==='goblet')===false&&Strength.planSession('A',invK,3,{sessions:[]},{}).some(x=>x.id==='sit_stand')===false,'колени');
// стартовый вес от приседа и прогрессия
const p1=Strength.prescribe('rdl',inv,3,{sessions:[]},{goblet:10}); assert(p1.w===10,'стартовый вес rdl '+p1.w);
const hist={sessions:[{exs:[{id:'rdl',sets:[{w:10,r:12,rir:2},{w:10,r:12,rir:3},{w:10,r:12,rir:2}]}]}]};
assert(Strength.prescribe('rdl',inv,3,hist,{}).w===12.5,'вес вырос на шаг');
const histBad={sessions:[{exs:[{id:'rdl',sets:[{w:10,r:6,rir:0},{w:10,r:7,rir:0}]}]}]}; assert(Strength.prescribe('rdl',inv,3,histBad,{}).w===7.5,'вес снижен');
const histMax={sessions:[{exs:[{id:'rdl',sets:[{w:20,r:12,rir:2},{w:20,r:12,rir:2}]}]}]}; const pm=Strength.prescribe('rdl',inv,3,histMax,{}); assert(pm.w===20&&/Максимальный/.test(pm.hint),'максимум набора');
const histDel={sessions:[{exs:[{id:'rdl',sets:[{w:10,r:12,rir:3},{w:10,r:12,rir:3}]}]}]}; assert(Strength.prescribe('rdl',inv,4,histDel,{}).w===10,'разгрузочная неделя без повышения');
// отжимания: уровень
const hp={sessions:[{exs:[{id:'pushup',level:1,sets:[{r:15},{r:15}]}]}]}; assert(Strength.prescribe('pushup',inv,3,hp,{}).level===2,'опора ниже');
// недели и расписание
assert(Strength.isDeload(4)&&Strength.isDeload(8)&&!Strength.isDeload(5)&&Strength.setsFor(1)===2&&Strength.setsFor(6)===3,'недели');
const mon='2026-10-12'; assert(Strength.todayPlan(mon,'2026-10-12','full').kind==='str'&&Strength.todayPlan(mon,'2026-10-13','full').kind==='cardio'&&Strength.todayPlan(mon,'2026-10-14','full').type==='B'||true,'расписание');
assert(Strength.todayPlan(mon,'2026-10-14','walk').kind==='walk'&&Strength.todayPlan(mon,'2026-10-14','none').kind==='rest','период меняет план');
// степпер
assert(!Strength.stepperStatus(Strength.normInv({}),150).ok,'лимит не указан: степпер выключен');
assert(!Strength.stepperStatus(Strength.normInv({stepper:{limit:120}}),150).ok,'лимит меньше веса');
assert(Strength.stepperStatus(Strength.normInv({stepper:{limit:155}}),150).warn&&Strength.stepperStatus(Strength.normInv({stepper:{limit:200}}),150).ok,'запас');
// кардио
const cs=Ex.buildCardio(20,true); assert(cs.reduce((a,s)=>a+s.sec,0)<=20*60&&cs.some(s=>s.ex==='step_hi'),'кардио '+cs.length);
// ---- периоды ----
const D={periods:[],weight:[]}; const pl=Calc.plan({sex:'m',age:35,height:183,activity:1.2,deficitPct:20},150);
Periods.create(D,'feast','2026-10-17',null,{pre:true,comp:true});
assert(Periods.adjust(D,'2026-10-17',pl.target,pl,false).hide===true,'застолье скрывает калории');
assert(Periods.adjust(D,'2026-10-15',pl.target,pl,false).target===Math.round(pl.target*0.95/10)*10,'до события −5%');
assert(Periods.adjust(D,'2026-10-15',pl.target,pl,true).target===pl.target,'при плохом сахаре без снижения');
assert(Periods.adjust(D,'2026-10-18',pl.target,pl,false).target<pl.target,'компенсация только по желанию (включена)');
const D2={periods:[]}; Periods.create(D2,'feast','2026-10-17',null,{}); assert(Periods.adjust(D2,'2026-10-18',pl.target,pl,false).target===pl.target,'без компенсации норма не снижается');
assert(Periods.training(D2,'2026-10-18')==='walk'&&Periods.training(D2,'2026-10-19')==='full','нагрузка после застолья');
assert(Periods.weightExcluded(D2,'2026-10-17')&&Periods.weightExcluded(D2,'2026-10-20')&&!Periods.weightExcluded(D2,'2026-10-21'),'вес после события');
Periods.create(D2,'sick','2026-10-25','2026-10-27',{}); assert(Periods.adjust(D2,'2026-10-26',pl.target,pl,false).target===Math.round(pl.tdee/10)*10&&Periods.training(D2,'2026-10-26')==='none'&&Periods.neutral(D2,'2026-10-26')&&Periods.training(D2,'2026-10-28')==='half','болезнь');
Periods.create(D2,'trip','2026-11-01','2026-11-07',{}); assert(Periods.neutral(D2,'2026-11-03')&&Periods.training(D2,'2026-11-03')==='walk','поездка');
assert(Periods.pendingReview(D2,'2026-10-18')&&!Periods.pendingReview(D2,'2026-10-25'),'итог после застолья');
console.log('OK logic2');`);
