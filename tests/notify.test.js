const vm=require('vm'),fs=require('fs');
const ctx={module:{},console,window:{}};vm.createContext(ctx);
['util','store','notify'].forEach(f=>{try{vm.runInContext(fs.readFileSync('www/js/'+f+'.js','utf8'),ctx)}catch(e){if(f!=='store')throw e}});
vm.runInContext(`
const cfg={on:true,days:[1,2,3,4,5],workStart:'09:00',workEnd:'18:00',lunchFrom:'13:00',lunchTo:'14:00',moveEvery:60,waterEvery:90,weigh:{on:true,dow:1,time:'08:00'},bp:{on:true,times:['08:00','20:00']},glu:{on:false,time:'07:30'},diary:{on:true,time:'20:30'},backup:{on:true,dow:0,time:'19:00'}};
const l=Notify.build(cfg);const ids=new Set(l.map(x=>x.id));
console.log('count',l.length,'unique',ids.size);
if(ids.size!==l.length)throw new Error('dup ids');
console.log(JSON.stringify(l[0]));
console.log('move slots',Notify.slots('09:00','18:00',60,'13:00','14:00',0).map(t=>t/60).join(','));
if(l.some(x=>x.schedule.on.weekday<1||x.schedule.on.weekday>7))throw new Error('weekday');
console.log('OK notify');
`,ctx);
