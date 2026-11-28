/* ===== ФАЙЛ ядро-14-кэш.js =====
   
   Кэш на диске (IndexedDB), служебный архив, сверка с чатом, офлайн.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- показ ---- */
const CSZ=new Map();
function evictC(){
  let tot=0;for(const v of CSZ.values())tot+=v;
  if(tot<120e6)return;
  const keep=new Set([openId,...[pi-1,pi].map(k=>pq[k]&&pq[k].id),...aheadIds(),...[...BGV].filter(([,t])=>Date.now()-t<18e5).map(([id])=>id)]);
  for(const [id,sz] of [...CSZ]){
    if(tot<90e6)break;
    const f=files.find(x=>x.id===id);
    if(keep.has(id)||(f&&(f.mime||'').startsWith('image/')))continue;
    try{URL.revokeObjectURL(C.get(id))}catch(e){}
    C.delete(id);CSZ.delete(id);tot-=sz;
  }
}
/* ---- кэш на диске (IndexedDB) ----
   'f' — сами файлы, 'a' — лёгкая «карточка» (когда, сколько) — по ней считаем срок, размер и чистим, не трогая сами файлы;
   'm' — индекс архива для быстрого старта. Срок хранения файлов — неделя с последнего прослушивания/открытия. */
const DAY=864e5,TTL0=7*DAY;let _db=null;
/* срок хранения файлов и музыки на устройстве: настройка «Кэш файлов и музыки» (часы; 0 — не удалять по сроку), по умолчанию неделя */
const CTTLS=[[6,'6 часов'],[24,'День'],[168,'Неделя'],[-1,'Не удалять']];
const ttl=()=>{const h=+ld('tgcttl',168);return h>0?h*36e5:(h<0?Infinity:TTL0)};   /* ограничений по размеру нет: ни общего, ни на файл */
const WARM=new Set();   /* id файлов, про которые точно знаем: они лежат на диске */
const cacheable=f=>!!f&&f.size>0;
function idb(){
  if(_db)return _db;
  _db=new Promise((ok,no)=>{
    let done=false;const tm=setTimeout(()=>{if(!done){done=true;_db=null;no(new Error('IndexedDB не отвечает'))}},5000);
    try{
      const q=indexedDB.open('cloudcache',2);
      q.onupgradeneeded=e=>{
        const d=q.result,tx=q.transaction;
        if(!d.objectStoreNames.contains('f'))d.createObjectStore('f',{keyPath:'id'});
        if(!d.objectStoreNames.contains('m'))d.createObjectStore('m',{keyPath:'id'});
        if(!d.objectStoreNames.contains('a')){
          const a=d.createObjectStore('a',{keyPath:'id'});
          if(e.oldVersion>0)tx.objectStore('f').openCursor().onsuccess=ev=>{const c=ev.target.result;if(c){const r=c.value;a.put({id:r.id,t:r.t||Date.now(),size:r.size||(r.blob&&r.blob.size)||0});c.continue()}};
        }
      };
      q.onsuccess=()=>{clearTimeout(tm);if(done){try{q.result.close()}catch(e){}return}done=true;const d=q.result;d.onversionchange=()=>{try{d.close()}catch(e){}_db=null};ok(d)};
      q.onerror=()=>{clearTimeout(tm);if(done)return;done=true;_db=null;no(q.error)};
    }catch(e){clearTimeout(tm);done=true;_db=null;no(e)}
  });
  return _db;
}
const idbOp=(st,mode,fn)=>idb().then(d=>new Promise((ok,no)=>{const t=d.transaction(st,mode),r=fn(t.objectStore(st));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)}));
const idbTx=(stores,mode,fn)=>idb().then(d=>new Promise((ok,no)=>{const t=d.transaction(stores,mode);fn(t);t.oncomplete=()=>ok();t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)}));
async function cHas(id){try{const m=await idbOp('a','readonly',s=>s.get(id));return !!m&&Date.now()-m.t<ttl()}catch(e){return false}}
async function cGet(id){
  try{
    const m=await idbOp('a','readonly',s=>s.get(id));
    if(!m||Date.now()-m.t>=ttl())return null;
    const r=await idbOp('f','readonly',s=>s.get(id));
    if(!r||!r.blob)return null;
    /* продлеваем срок: раз файл слушают, он живёт дальше (пишем только карточку, не сам файл) */
    if(Date.now()-m.t>Math.min(12*36e5,ttl()/4))idbOp('a','readwrite',s=>s.put({id,t:Date.now(),size:m.size})).catch(()=>{});
    return r.blob;
  }catch(e){}
  return null;
}
async function cPut(id,blob){
  const put=()=>idbTx(['f','a'],'readwrite',tx=>{const t=Date.now();tx.objectStore('f').put({id,t,size:blob.size,blob});tx.objectStore('a').put({id,t,size:blob.size})});
  try{await put();WARM.add(id);return true}
  catch(e){
    /* не хватило места — освобождаем половину и пробуем ещё раз */
    try{const i=await cacheInfo();await cPurge(i.size/2);await put();WARM.add(id);return true}catch(x){}
  }
  return false;
}
/* чистка: просроченное и «осиротевшие» файлы; размер не ограничен (лишнее убираем только если браузеру не хватило места) */
async function cPurge(cap=Infinity){
  try{
    const all=(await idbOp('a','readonly',s=>s.getAll()))||[],live=new Set(all.map(r=>r.id));
    let tot=0;const del=[],now=Date.now();
    for(const r of all.sort((a,b)=>b.t-a.t)){if(now-r.t>=ttl()||tot+(r.size||0)>cap)del.push(r.id);else tot+=r.size||0}
    const keys=(await idbOp('f','readonly',s=>s.getAllKeys()))||[];
    for(const k of keys)if(!live.has(k))del.push(k);
    if(del.length){await idbTx(['f','a'],'readwrite',tx=>{for(const i of del){tx.objectStore('f').delete(i);tx.objectStore('a').delete(i)}});del.forEach(i=>WARM.delete(i))}
  }catch(e){}
}
async function cacheQuota(){try{const e=await navigator.storage.estimate();return e&&e.quota?{used:e.usage||0,quota:e.quota}:null}catch(x){return null}}
async function cacheInfo(){
  try{const all=((await idbOp('a','readonly',s=>s.getAll()))||[]).filter(r=>Date.now()-r.t<ttl());return{n:all.length,size:all.reduce((a,r)=>a+(r.size||0),0)}}
  catch(e){return{n:0,size:0}}
}
/* «Сбросить кэш» в настройках (одинаково у владельца и у гостя): стирает сохранённые файлы и музыку на устройстве.
   Файлы в канале, вход, пароли, позиции в треках и настройки не трогает. Играющий сейчас трек не обрывается. */
async function cacheReset(){
  const keep=new Set([openId,pq[pi]&&pq[pi].id].filter(Boolean));
  for(const j of DLJ.values())if(j.pre)j.cancel();
  PFQ=[];
  for(const id of [...C.keys()]){if(keep.has(id))continue;try{URL.revokeObjectURL(C.get(id))}catch(e){}C.delete(id);CSZ.delete(id);BGV.delete(id)}
  WARM.clear();
  const before=await cacheInfo();
  await idbTx(['f','a'],'readwrite',tx=>{tx.objectStore('f').clear();tx.objectStore('a').clear()});
  try{render()}catch(e){}
  try{pfPlan()}catch(e){}
  return before;
}
/* ---- СЛУЖЕБНЫЙ АРХИВ: сырые записи чата в IndexedDB (без дополнительного шифрования: это те же данные, что лежат в чате;
   расшифрованное содержимое и ключи сюда не попадают). Полное чтение чата раз в RAWTTL или после локального удаления/переноса. ---- */
const RAWID={out:'id',fol:'id',reps:'id',lks:'id',usr:'id',jr:'mid',jenc:'mid',ordp:'mid',ans:'id',cvx:'mid',exr:'id',ntp:'m',shr:'id',sps:'id',adr:'id',oks:'id'};
const RAWTTL=6*36e5;let RAWM=null;
/* срок хранения служебного архива (настройки → «Служебный архив»): часы, -1 = не удалять по сроку; по умолчанию неделя.
   Срок считается от последнего чтения или успешной сверки с чатом (fullT). Помнит последнюю причину сброса (tgrawwhy) для экрана. */
const RAWKEEP=[[6,'6 часов'],[24,'День'],[168,'Неделя'],[-1,'Не удалять']];
const rawMax=()=>{const h=+ld('tgrawkeep',168);return h>0?h*36e5:(h<0?Infinity:168*36e5)};
const rawWhy=w=>{try{sv('tgrawwhy',{t:Date.now(),w})}catch(e){}};
async function rawLoad(){
  const r=await idbOp('m','readonly',s=>s.get('raw'));
  if(!r)return null;
  if(!r.r||r.v!==1||!r.maxId){rawWhy('формат архива не подошёл');return null}
  if(r.chat!==S.chat){rawWhy('другой чат');return null}
  if(Date.now()-r.fullT>rawMax()){rawWhy('истёк срок хранения');return null}
  const d=await idbOp('m','readonly',s=>s.get('rawdirty'));
  if(d&&d.t>=r.t){rawWhy('файлы переименовали, перенесли или удалили на этом устройстве');return null}
  return r;
}
function rawSave(RK,maxId,fullT){
  if(OFFLINE||!S.chat||!maxId)return;
  try{
    const r={};for(const k in RK)r[k]=RK[k].map(e=>({...e}));
    RAWM={f:new Map(RK.out.map(f=>[f.id,f.path+'|'+f.repo+'|'+(f.enc?'':f.name)])),fo:new Map(RK.fol.map(x=>[x.id,x.path+'|'+x.repo])),rp:new Set(RK.reps.map(x=>x.id))};
    idbOp('m','readwrite',s=>s.put({id:'raw',v:1,t:Date.now(),chat:S.chat,maxId,fullT:fullT||Date.now(),r})).then(()=>idbOp('m','readwrite',s=>s.delete('rawdirty'))).catch(()=>{});
  }catch(e){}
}
function rawDirtyCheck(){
  if(!RAWM)return;
  let bad=false;
  const cf=new Map(files.map(f=>[f.id,f.path+'|'+f.repo+'|'+(f.enc?'':f.name)]));
  for(const [id,v] of RAWM.f)if(cf.get(id)!==v){bad=true;break}
  if(!bad){const cu=new Map(folders.map(x=>[x.id,x.path+'|'+x.repo]));for(const [id,v] of RAWM.fo)if(cu.get(id)!==v){bad=true;break}}
  if(!bad){const rp=new Set(repos.map(x=>x.id));for(const id of RAWM.rp)if(!rp.has(id)){bad=true;break}}
  if(bad){RAWM=null;idbOp('m','readwrite',s=>s.put({id:'rawdirty',t:Date.now()})).catch(()=>{})}
}
/* v102: быстрая сверка архива с чатом. Новые сообщения подтягивает лёгкое чтение, а удалённые на другом устройстве ловит getMessages
   (пачки по 100 номеров, 3 запроса одновременно). Если getMessages не работает или ответ подозрителен, включается запасной путь: полное чтение раз в 10 минут. */
const RAWV={bad:0};
async function aliveIds(snap,cut){
  const ids=[];for(const k in RAWID)for(const e of (snap.r[k]||[])){const i=e[RAWID[k]];if(i<cut)ids.push(i)}
  const u=[...new Set(ids)];if(!u.length)return null;
  try{
    if(typeof client.getMessages!=='function')throw new Error('нет getMessages');
    const alive=new Set();let k=0,fail=null;
    const worker=async()=>{
      while(!fail){
        const j=k++;if(j*100>=u.length)return;
        const part=u.slice(j*100,j*100+100);let b=null;
        for(let t=0;t<3&&!b;t++){
          try{b=await withChat(()=>client.getMessages(S.chat,part))}
          catch(e){
            const m=/FLOOD_WAIT\D{0,12}(\d+)|wait of (\d+)/i.exec(err(e)),w=m?+(m[1]||m[2]):0;
            if(w>30||t>=2){fail=e;return}
            await sleep(w?(w+1)*1000:1200*(t+1));
          }
        }
        if(!b){fail=new Error('пустой ответ');return}
        for(const m of b)if(m&&m.id)alive.add(m.id);
      }
    };
    await Promise.all([worker(),worker(),worker()]);
    if(fail)throw fail;
    if(u.length>20&&alive.size<u.length*.5)throw new Error('сверка подозрительна');
    return alive;
  }catch(e){RAWV.bad=1;rawWhy('сверка с чатом не удалась: '+String(err(e)).slice(0,90));throw e}
}
const BGS={ok:0,run:0,t:0,hid:0};
const bgSig=()=>[files,folders,repos,users,locks,ANN,EXT,SHR].map(a=>(a||[]).map(x=>x.id||x.m||x.mid||0).join(',')).join('#');
async function bgSync(force){
  if(!BGS.ok||BGS.run||OFFLINE||!S.chat||!client||document.hidden)return;
  try{if(U&&U.on)return}catch(e){}
  try{if(MUS&&MUS.busy)return}catch(e){}
  const now=Date.now();if(!force&&now-BGS.t<(RAWV.bad?6e5:18e4))return;
  if(force&&now-BGS.t<20000)return;
  BGS.run=1;BGS.t=now;
  try{
    const a=bgSig();
    if(RAWV.bad)await refresh();else await refresh({light:true,verify:true});
    if(bgSig()!==a)try{render()}catch(e){}
  }catch(e){}
  BGS.run=0;
}
setInterval(()=>bgSync(false),30000);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){BGS.hid=Date.now();return}
  if(BGS.hid&&Date.now()-BGS.hid>30000)bgSync(true);BGS.hid=0;
});
window.addEventListener('online',()=>bgSync(true));
let _si=0;
function saveIndex(){clearTimeout(_si);_si=setTimeout(()=>{if(OFFLINE)return;try{rawDirtyCheck()}catch(e){}idbOp('m','readwrite',s=>s.put({id:'idx',t:Date.now(),d:{files,folders,repos,locks,users,ord:ORD,chat:S.chat,ext:EXT,nt:NTS}})).catch(()=>{})},3000)}
async function loadOffline(){
  try{const r=await idbOp('m','readonly',s=>s.get('idx'));if(!r||Date.now()-r.t>Math.max(TTL0*1.5,rawMax()))return false;
  files=r.d.files||[];folders=r.d.folders||[];repos=r.d.repos||[];locks=r.d.locks||[];users=r.d.users||[];EXT=r.d.ext||[];NTS=r.d.nt||[];ORD=r.d.ord||[];S.chat=r.d.chat;OFFLINE=true;document.body.classList.add('off');try{syncUN()}catch(e){}return true}catch(e){return false}
}
async function loadCachedIdx(){
  try{
    const r=await idbOp('m','readonly',s=>s.get('idx'));
    if(!r||!r.d||Date.now()-r.t>rawMax()||(S.chat&&r.d.chat!==S.chat))return false;
    files=r.d.files||[];folders=r.d.folders||[];repos=r.d.repos||[];locks=r.d.locks||[];users=r.d.users||[];EXT=r.d.ext||[];NTS=r.d.nt||[];ORD=r.d.ord||[];if(!S.chat)S.chat=r.d.chat;
    try{syncUN()}catch(e){}return true;
  }catch(e){return false}
}
