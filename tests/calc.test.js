const T = require('./_ctx'); const ctx = T.make(['util', 'calc']);
T.run(ctx, `
const assert=(c,m)=>{if(!c)throw new Error('FAIL '+m)};
const m={sex:'m',age:35,height:183,activity:1.2,deficitPct:20}, f={sex:'f',age:30,height:172,activity:1.2,deficitPct:20};
const pm=Calc.plan(m,150), pf=Calc.plan(f,120);
console.log('M',pm.target,pm.protein,'F',pf.target,pf.protein);
assert(pm.target===2370&&pf.target===1890,'targets');
assert(Calc.plan({sex:'f',age:50,height:155,activity:1.2,deficitPct:25},52).target>=1200,'floor');
assert(Calc.plan(m,150,{softDeficit:true}).deficit<=pm.deficit,'soft');
assert(Calc.waterGoal(150)===3000&&Calc.waterGoal(50)===1500,'water');
assert(Calc.bpLevel(120,80)===0&&Calc.bpLevel(145,85)===2&&Calc.bpLevel(185,100)===3,'bp');
const now=Date.now();
assert(Calc.bpMode([{ts:now-3600e3,sys:190,dia:110}],now).mode==='stop','stop');
assert(Calc.bpMode([{ts:now-7200e3,sys:145,dia:92},{ts:now-3600e3,sys:150,dia:95}],now).mode==='light','light');
assert(Calc.gluLevel(4.5,'fasting')===0&&Calc.gluLevel(7.2,'fasting')===2,'glu');
console.log('OK calc');`);
