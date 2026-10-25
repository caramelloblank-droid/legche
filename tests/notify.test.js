const T = require('./_ctx'); const ctx = T.make(['util', 'notify']);
T.run(ctx, `
const cfg={on:true,days:[1,2,3,4,5],workStart:'09:00',workEnd:'18:00',lunchFrom:'13:00',lunchTo:'14:00',moveEvery:60,waterEvery:90,weigh:{on:true,dow:1,time:'08:00'},bp:{on:true,times:['08:00','20:00']},glu:{on:false,time:'07:30'},diary:{on:true,time:'20:30'},backup:{on:true,dow:0,time:'19:00'}};
const l=Notify.build(cfg);const ids=new Set(l.map(x=>x.id));
if(ids.size!==l.length)throw new Error('дубли id'); if(l.some(x=>x.id>=40000))throw new Error('id пересекаются с разовыми');
if(l.some(x=>x.schedule.on.weekday<1||x.schedule.on.weekday>7))throw new Error('день недели');
if(plug('LocalNotifications')!==null)throw new Error('в браузере плагина быть не должно');
window.Capacitor={registerPlugin:n=>({name:n})}; if(plug('LocalNotifications').name!=='LocalNotifications')throw new Error('registerPlugin не используется');
console.log('уведомлений',l.length,'OK notify');`, {});
