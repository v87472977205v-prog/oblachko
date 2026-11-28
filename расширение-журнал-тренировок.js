/* ===== ФАЙЛ расширение-журнал-тренировок.js =====
   
   Расширение «Журнал тренировок» (оболочка и синхронизация).
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- Расширение «Журнал тренировок»: приложение gym-log целиком, внутри изолированного фрейма на весь экран.
   «Назад» переадресуется в приложение, выход — его ползунком. Данные лежат на устройстве (gym_*, IndexedDB gymlog). ---- */
const GYM={on:false,recs:new Map(),sx:'',q:null,last:0,pend:null,pt:0,rt:0};let FLOODT=0;
function gymReset(){if(!GYM.on)return;GYM.on=false;const h=$('#adm .ah');if(h)h.hidden=false;$('#admb').style.cssText='';removeEventListener('message',gymMsg)}
/* «Назад» из календаря журнала возвращает в меню расширений */
function gymMsg(e){const f=$('#gymf');if(!GYM.on||!f||e.source!==f.contentWindow||!e.data)return;
  if(e.data.gym==='exit'){gyFlush();gymReset();$('#admb').innerHTML='';if(isAdmin())openExtAdmin();else openExts()}
  else if(e.data.gym==='sync'){GYM.pend=e.data;clearTimeout(GYM.pt);GYM.pt=setTimeout(gyFlush,6000)}
  else if(e.data.gym==='rest')gyRest(e.data.end);
  else if(e.data.gym==='vib'){const p=e.data.p;try{if(navigator.vibrate&&(typeof p==='number'||(Array.isArray(p)&&p.length<=20&&p.every(x=>typeof x==='number'))))navigator.vibrate(p)}catch(x){}}}
/* Таймер отдыха в фоне: пока идёт отсчёт, тихая дорожка не даёт странице «заснуть»; по окончании в свёрнутом приложении
   приходит системное уведомление с вибрацией (вибрировать из свёрнутой страницы браузер не даёт). */
const GYR={end:0,iv:null,ka:null};
function gySilence(){const n=8000,b=new Uint8Array(44+n*2),v=new DataView(b.buffer),w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++)v.setInt16(44+i*2,i%2?1:-1,true);return URL.createObjectURL(new Blob([b],{type:'audio/wav'}))}
function gyRestStop(){GYR.end=0;clearInterval(GYR.iv);GYR.iv=null;if(GYR.ka){try{GYR.ka.pause()}catch(e){}}}
function gyRestDone(){gyRestStop();if(!document.hidden)return;
  try{if('Notification' in window&&Notification.permission==='granted'&&navigator.serviceWorker)navigator.serviceWorker.ready.then(r=>r.showNotification('Отдых окончен',{body:'Пора на следующий подход',tag:'gymrest',renotify:true,requireInteraction:true,vibrate:[800,250,800,250,1200],icon:'icon-v4-192.png'}))}catch(e){}}
function gyRest(end){
  if(!end){if(GYR.end&&Date.now()>=GYR.end-1500)gyRestDone();else gyRestStop();return}
  GYR.end=end;
  try{if('Notification' in window&&Notification.permission==='default')Notification.requestPermission()}catch(e){}
  try{if(!GYR.ka){GYR.ka=new Audio(gySilence());GYR.ka.loop=true}GYR.ka.play().catch(()=>{})}catch(e){}
  clearInterval(GYR.iv);GYR.iv=setInterval(()=>{if(GYR.end&&Date.now()>=GYR.end)gyRestDone()},1000)}
document.addEventListener('visibilitychange',()=>{if(document.hidden){gyFlush();return}
  try{navigator.serviceWorker&&navigator.serviceWorker.ready.then(r=>r.getNotifications({tag:'gymrest'}).then(a=>a.forEach(n=>n.close())))}catch(e){}});
function gyFlush(){clearTimeout(GYM.pt);const d=GYM.pend;GYM.pend=null;if(d)gySyncOut(d)}
function gymBack(){const f=$('#gymf');if(f&&f.contentWindow)f.contentWindow.postMessage({gym:'back'},'*')}
/* Синхронизация: день = одна запись в канале (📓, вид g, шифруется ключом пользователя, как заметки).
   Уходят подходы, текст заметок и настройки; фото и голос остаются на устройстве. Пустой день — «надгробие», чтобы удаление дошло до других устройств. */
const gyJ=s=>{try{const o=JSON.parse(s);return o&&typeof o==='object'&&!Array.isArray(o)?o:{}}catch(x){return{}}};
const gyOkD=k=>/^\d{4}-\d{2}-\d{2}$/.test(k);
const gyDay=(d,n)=>JSON.stringify({d:d||[],n:(n||[]).map(x=>({text:(x&&x.text)||'',t:(x&&x.t)||''}))});
async function gyPush(id,b){let n=GYM.recs.get(id);if(!n){const t=Date.now();n={id,t:'',b:'',c:[],k:'g',p:0,cr:t,up:t};GYM.recs.set(id,n)}n.b=b;n.up=Date.now();
  for(let a=0;a<4;a++){const w=Math.max(FLOODT-Date.now(),GYM.last+1500-Date.now(),0);if(w)await new Promise(r=>setTimeout(r,w));
    GYM.last=Date.now();if(await ntPush(n))return true;if(FLOODT<=Date.now())break}
  if(!n._m||!n._m.length)GYM.recs.delete(id);return false}
async function gyPull(){
  GYM.recs=new Map();for(const n of (await ntMine()).filter(n=>n.k==='g'))GYM.recs.set(n.id,n);
  const kd='gym_log'+GYM.sx,kn='gym_notes'+GYM.sx,ks='gym_settings'+GYM.sx;
  const log=gyJ(localStorage.getItem(kd)),nts=gyJ(localStorage.getItem(kn));
  const days=new Set([...Object.keys(log),...Object.keys(nts)].filter(gyOkD));
  for(const [id,r] of GYM.recs){
    if(id==='gs'){const s=gyJ(r.b);if(Object.keys(s).length)localStorage.setItem(ks,JSON.stringify(s));continue}
    if(!id.startsWith('gd')||!gyOkD(id.slice(2)))continue;const k=id.slice(2);days.delete(k);
    const o=gyJ(r.b),rd=Array.isArray(o.d)?o.d:[],rn=Array.isArray(o.n)?o.n:[],loc=Array.isArray(nts[k])?nts[k]:[];
    if(rd.length)log[k]=rd;else delete log[k];
    const m=rn.map(x=>{const l=x.t&&loc.find(y=>y&&y.t===x.t);return{text:x.text||'',t:x.t||'',photos:(l&&l.photos)||[],audio:(l&&l.audio)||[]}});
    for(const l of loc)if(l&&((l.photos&&l.photos.length)||(l.audio&&l.audio.length))&&!m.some(x=>x.t===l.t))m.push(l);
    if(m.length)nts[k]=m;else delete nts[k]}
  localStorage.setItem(kd,JSON.stringify(log));localStorage.setItem(kn,JSON.stringify(nts));
  /* то, чего ещё нет в облаке (первый запуск, правки без сети), отправляем */
  const up=[...days].map(k=>['gd'+k,gyDay(log[k],nts[k])]);const s0=localStorage.getItem(ks);if(s0&&!GYM.recs.has('gs'))up.push(['gs',s0]);
  if(up.length)GYM.q=(GYM.q||Promise.resolve()).then(async()=>{for(const [id,b] of up)await gyPush(id,b)})}
function gySyncOut(d){const log=gyJ(d.log),nts=gyJ(d.notes),days=new Set(Object.keys(log).concat(Object.keys(nts)).filter(gyOkD));
  for(const id of GYM.recs.keys())if(id.startsWith('gd'))days.add(id.slice(2));
  const empty=gyDay([],[]);
  GYM.q=(GYM.q||Promise.resolve()).then(async()=>{
    for(const k of days){const b=gyDay(Array.isArray(log[k])?log[k]:[],Array.isArray(nts[k])?nts[k]:[]),r=GYM.recs.get('gd'+k);
      if(r?r.b===b:b===empty)continue;await gyPush('gd'+k,b)}
    const s=GYM.recs.get('gs');if(d.set&&(!s||s.b!==d.set))await gyPush('gs',d.set)}).catch(()=>{})}
/* Журнал открывается сразу, из того, что уже есть на устройстве и в загруженном облаке. Обновление канала идёт в фоне:
   если за это время с другого устройства пришли правки, а здесь ещё ничего не меняли, журнал тихо перечитывается. */
const gySnap=()=>{try{return(localStorage.getItem('gym_log'+GYM.sx)||'')+'|'+(localStorage.getItem('gym_notes'+GYM.sx)||'')+'|'+(localStorage.getItem('gym_settings'+GYM.sx)||'')}catch(e){return''}};
async function gyBg(){
  if(OFFLINE||Date.now()-GYM.rt<60000)return;GYM.rt=Date.now();
  const snap=gySnap();
  try{await refresh()}catch(e){return}
  if(!GYM.on||gySnap()!==snap)return;      /* пока грузили, здесь уже что-то записали: чужие правки не накатываем */
  try{await gyPull()}catch(e){return}
  if(GYM.on&&gySnap()!==snap){const f=$('#gymf');try{f&&f.contentWindow&&f.contentWindow.postMessage({gym:'reload'},'*')}catch(e){}}
}
async function openGym(){
  const k=await ntKeyGet();if(k===undefined)return;
  GYM.sx=S.guestUser?'_'+S.guestUser:'';
  try{await gyPull()}catch(e){say('Журнал не подтянулся из облака: '+err(e),1)}
  openAdm(extName('gym'));GYM.on=true;
  $('#adm .ah').hidden=true;$('#admb').style.cssText='padding:env(safe-area-inset-top,0px) 0 0;overflow:hidden';
  $('#admb').innerHTML='<iframe id="gymf" allow="microphone; camera; autoplay; fullscreen; screen-wake-lock; vibrate" style="display:block;width:100%;height:100%;border:0;background:transparent"></iframe>';
  const sx=GYM.sx;
  $('#gymf').srcdoc=new TextDecoder().decode(Uint8Array.from(atob(GYMB64),c=>c.charCodeAt(0))).replace('const K={d:"gym_log",n:"gym_notes",s:"gym_settings",c:"gym_copies"}','const K={d:"gym_log'+sx+'",n:"gym_notes'+sx+'",s:"gym_settings'+sx+'",c:"gym_copies'+sx+'"}').replace('indexedDB.open("gymlog",1)','indexedDB.open("gymlog'+sx+'",1)').replace("addEventListener('message',function(e){if(e.data&&e.data.gym==='back'){try{backH()}catch(x){}}});","addEventListener('message',function(e){if(e.data&&e.data.gym==='back'){try{backH()}catch(x){}}else if(e.data&&e.data.gym==='reload'){try{S.data=loadData();S.notes=loadNotes();S.set=readJ(K.s);S.theme=applyTheme(S.set.theme||\"sage\",false);fillCal();refresh()}catch(x){}}});");
  addEventListener('message',gymMsg);
  gyBg()}
