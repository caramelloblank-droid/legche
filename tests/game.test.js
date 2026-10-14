const vm=require('vm'),fs=require('fs');
const ls={};const ctx={module:{},console,localStorage:{getItem:k=>ls[k]||null,setItem:(k,v)=>{ls[k]=v}}};vm.createContext(ctx);
['util','foods','calc','plan','store','game'].forEach(f=>vm.runInContext(fs.readFileSync('www/js/'+f+'.js','utf8'),ctx));
vm.runInContext(`
const assert=(c,m)=>{if(!c)throw new Error('FAIL '+m)};
Store.load();
const today=dkey();
const P=Store.addProfile({name:'Тест',sex:'m',age:35,height:183,weight:150,activity:1.2,deficitPct:20,goalWeight:128});
P.createdAt=addDays(today,-10);
const D=Store.data();
D.weight=[{d:addDays(today,-10),w:150}];
// 6 полных дней подряд, потом пропуск 1, потом сегодня не выполнено
for(let i=9;i>=1;i--){const k=addDays(today,-i); if(i===4) continue;
 D.food[k]=[{id:'a',slot:'l',n:'x',k:1500,p:100,f:50,c:150,t:'13:00'}];D.water[k]=3000;D.moves[k]=[{min:6}];}
D.weight.push({d:addDays(today,-1),w:147});
let g=Game.compute(P,D,today);
console.log('streak',g.streak,'freezeLeft',g.freezeLeft,'xp',g.xp,'lvl',g.level,g.title,'ach',g.unlocked.map(a=>a.id).join(','));
assert(g.streak===8,'streak with freeze expected 8 got '+g.streak);
D.food[today]=[{id:'b',slot:'b',n:'y',k:1500,p:100,f:50,c:150,t:'09:00'}];D.water[today]=3000;D.moves[today]=[{min:6}];
Store.save(); g=Game.compute(P,D,today);
assert(g.streak===9,'today counts '+g.streak);
console.log('challenges',JSON.stringify(g.challenges));
const snap=Game.snapshot(P,D);console.log(JSON.stringify(snap).slice(0,120));
const exp=Store.exportJson();Store.importJson(exp);assert(Store.db.profiles.length===1,'import');
console.log('OK game');
`,ctx);
