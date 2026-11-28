/* ===== ФАЙЛ ядро-15-скачивание.js =====
   
   Скачивание файлов из Telegram.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
const DLP=new Map(),BGV=new Map(),SNAP=new Map();let BIGLOAD=0,_dt=0;
const stallP=(p,ms)=>{let t;return Promise.race([p,new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error('Загрузка зависла')),ms)})]).finally(()=>clearTimeout(t))};
function paintBigLoad(f){const el=stg.querySelector('.dlt');if(!el||BIGLOAD!==f.id)return;const n=DLP.get(f.id)||0;el.textContent=Math.round(n/1e6)+' из '+Math.round(f.size/1e6)+' МБ ('+Math.min(99,Math.floor(n/Math.max(1,f.size)*100))+'%)'}
function dlTick(f){const now=Date.now();if(now-_dt<300)return;_dt=now;if(openId===f.id)paintBigLoad(f);if(loadingTrack&&pq[pi]&&pq[pi].id===f.id&&f.size>0){const e=$('#pdur');if(e)e.textContent='↓'+Math.min(99,Math.floor((DLP.get(f.id)||0)/f.size*100))+'%'}}
/* ---- загрузка из Telegram ----
   Каждый файл качается одной общей задачей: если плеер и просмотр просят один файл — это одна загрузка.
   Фоновые (подкачка следующих треков) можно отменить, повышенные до «срочных» — нет. */
const DLJ=new Map();
/* Ссылка на файл в Telegram (fid) со временем устаревает, а в архиве быстрого запуска лежат старые ссылки: берём свежую из самого сообщения. */
async function freshFid(f){
  try{
    if(OFFLINE||!client)return false;
    const r=await withChat(()=>client.getMessages(S.chat,[f.id])),m=r&&r[0],e=m&&entry(m);
    if(e&&e.fid&&e.fid!==f.fid){f.fid=e.fid;return true}
  }catch(x){}
  return false;
}
function dlRaw(f,pre){
  let j=DLJ.get(f.id);
  if(j){if(!pre)j.pre=false;return j.p}
  j={f,pre:!!pre,stop:false,aud:isAud(f)};
  const gone=new Promise((_,rej)=>{j.cancel=()=>{if(j.stop)return;j.stop=true;rej(new Error('Отменено'))}});gone.catch(()=>{});
  DLJ.set(f.id,j);
  j.p=(async()=>{try{
    if(OFFLINE)throw new Error('Нет связи: этот файл не сохранён для офлайна');
    /* сразу после запуска соединение с Telegram ещё поднимается: ждём до 30 с, а не падаем с ошибкой */
    if(!(client&&BGS.ok)){const t0=Date.now();while(!(client&&BGS.ok)&&!OFFLINE&&!j.stop&&Date.now()-t0<30000)await Promise.race([sleep(400),gone])}
    if(OFFLINE)throw new Error('Нет связи: этот файл не сохранён для офлайна');
    if(!client)throw new Error('Ещё подключаюсь к Telegram, подождите секунду');
    let parts=[],n=0;
    try{
      for(let a=0;a<4;a++){
        parts=[];n=0;let acc=[],accN=0;
        SNAP.set(f.id,()=>new Blob([...parts,...acc],{type:f.mime}));
        try{
          const it=client.download(f.fid)[Symbol.asyncIterator]();
          try{
            for(let first=true;;first=false){
              /* ждём кусок: первый — до 20 с (соединение), следующие — до 10 с; отмена прерывает ожидание сразу */
              const r=await Promise.race([stallP(it.next(),first?20000:10000),gone]);if(r.done)break;
              const c=r.value,len=c.length||c.byteLength||0;acc.push(c);n+=len;accN+=len;
              if(accN>=16e6){parts.push(new Blob(acc));acc=[];accN=0}
              DLP.set(f.id,n);dlTick(f);
            }
          }catch(e){try{const q=it.return&&it.return();q&&q.catch&&q.catch(()=>{})}catch(x){}throw e}
          if(acc.length)parts.push(new Blob(acc));
          break;
        }catch(e){
          if(j.stop||a===3)throw e;
          const em=String(err(e));
          if(a===0||/FILE_REFERENCE|FILE_ID|REFERENCE|EXPIRED/i.test(em))await freshFid(f);   /* первая же неудача: ссылка могла устареть */
          const fl=/FLOOD_WAIT\D{0,12}(\d+)|wait of (\d+)/i.exec(em),w=fl?+(fl[1]||fl[2]):0;
          if(w>25)throw e;
          await Promise.race([sleep(w?(w+1)*1000:Math.min(3000,500*2**a)),gone]);
        }
      }
    }finally{DLP.delete(f.id);SNAP.delete(f.id)}
    if(n>0&&cacheable({size:n})){const w=cPut(f.id,new Blob(parts));if(j.pre)await w}
    return{parts,n};
  }finally{if(DLJ.get(f.id)===j)DLJ.delete(f.id)}})();
  j.p.catch(()=>{});
  return j.p;
}
async function urlOf(f,noDisk){
  if(!C.has(f.id)){
    let parts,n;const raw=noDisk?null:await Promise.race([cGet(f.id),sleep(6000).then(()=>null)]);
    if(raw){parts=[raw];n=raw.size;WARM.add(f.id)}
    else{const r=await dlRaw(f,false);parts=r.parts;n=r.n}
    if(C.has(f.id))return C.get(f.id);
    const blob=f.enc?await decBlob(f,parts):new Blob(parts,{type:f.mime});
    if(C.has(f.id))return C.get(f.id);
    C.set(f.id,URL.createObjectURL(blob));CSZ.set(f.id,n);if(f.size>8e7)BGV.set(f.id,Date.now());evictC();
  }
  return C.get(f.id);
}

