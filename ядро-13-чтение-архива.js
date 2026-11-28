/* ===== ФАЙЛ ядро-13-чтение-архива.js =====
   
   Шифрование файлов, чтение архива (readFast, refresh).
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- чтение архива ---- */
/* ---- шифрование файлов (AES-256-GCM, ключ из пароля) ---- */
const KEYS={};let _dd=0;
const hasCrypto=()=>!!(window.crypto&&crypto.subtle);
async function deriveKey(pw,salt){const km=await crypto.subtle.importKey('raw',te.encode(pw),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function aesE(key,u8,aad){const iv=crypto.getRandomValues(new Uint8Array(12)),p={name:'AES-GCM',iv};if(aad)p.additionalData=aad;const ct=new Uint8Array(await crypto.subtle.encrypt(p,key,u8)),o=new Uint8Array(12+ct.length);o.set(iv);o.set(ct,12);return o}
const chunkAad=(i,n)=>{const a=new Uint8Array(8),dv=new DataView(a.buffer);dv.setUint32(0,i);dv.setUint32(4,n);return a};
async function deriveRaw(pw,salt){const km=await crypto.subtle.importKey('raw',te.encode(pw),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},km,256))}
const keyRaw=raw=>crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
/* Пароль шифрования открывает «обёртку» (e.w) с ключом файлов, поэтому смена пароля не требует перешифровывать файлы.
   Старые репозитории без e.w работают как раньше: ключ файлов = ключ из пароля. Бросает ошибку при неверном пароле. */
async function openEnc(pw,e){
  const salt=b64d(e.s),K=await deriveKey(pw,salt);await aesD(K,b64d(e.c));
  if(!e.w)return{dk:K,raw:null,salt};
  const raw=await aesD(K,b64d(e.w));return{dk:await keyRaw(raw),raw,salt};
}
async function aesD(key,u8,aad){const p={name:'AES-GCM',iv:u8.subarray(0,12)};if(aad)p.additionalData=aad;return new Uint8Array(await crypto.subtle.decrypt(p,key,u8.subarray(12)))}
const encOf=r=>{const x=repos.find(q=>q.name===r);return x&&x.enc};
const encOn=r=>!!(r&&encOf(r)&&encOf(r).on);
const needKey=r=>!!(r&&encOf(r)&&!KEYS[r]&&files.some(f=>f.repo===r&&f.enc));
const capName=f=>f.enc?'🔐'+f.encName:f.name;
async function encName(r,f){return b64e(await aesE(KEYS[r],te.encode(JSON.stringify({n:f.name,m:f.type||''}))))}
async function encBytes(r,f){
  const key=KEYS[r],CH=1<<20,len=f.size,n=Math.max(1,Math.ceil(len/CH)),out=new Uint8Array(4+len+n*32),dv=new DataView(out.buffer);
  out.set([84,71,69,50]);let p=4;
  for(let i=0;i<n;i++){const part=new Uint8Array(await f.slice(i*CH,(i+1)*CH).arrayBuffer()),c=await aesE(key,part,chunkAad(i,n));dv.setUint32(p,c.length);out.set(c,p+4);p+=4+c.length}
  return out;
}
async function decBlob(f,parts){
  const key=KEYS[f.repo];if(!key)throw new Error('Нет ключа шифрования');
  const all=await new Blob(parts).arrayBuffer(),u=new Uint8Array(all),dv=new DataView(all);
  const v2=u[0]===84&&u[1]===71&&u[2]===69&&u[3]===50,v1=u[0]===84&&u[1]===71&&u[2]===69&&u[3]===49;
  if(!v1&&!v2)throw new Error('Неизвестный формат шифрования');
  const fr=[];let p=4;
  while(p<u.length){const L=dv.getUint32(p);if(p+4+L>u.length)throw new Error('Файл повреждён (обрезан)');fr.push(u.subarray(p+4,p+4+L));p+=4+L}
  const out=[];
  for(let i=0;i<fr.length;i++)out.push(await aesD(key,fr[i],v2?chunkAad(i,fr.length):undefined));
  return new Blob(out,{type:f.mime});
}
async function decAll(){
  for(const f of files){
    if(!f.enc||f.dec||!KEYS[f.repo])continue;
    try{const j=JSON.parse(td.decode(await aesD(KEYS[f.repo],b64d(f.encName))));f.name=j.n;f.mime=mimeOf(j.m||'application/octet-stream',j.n);f.dec=1}catch(e){f.dec='x'}
  }
  try{cvLoadRemote()}catch(e){}
}
async function ensureKey(r){
  if(KEYS[r])return true;const e=encOf(r);if(!e)return true;
  if(!hasCrypto()){alert('Шифрование недоступно: при таком способе открытия файла браузер не даёт доступ к криптографии. Откройте файл через file:// или с хостинга.');return false}
  let bk=null;
  const wasBio=bioEOn(r);
  const bioFn=wasBio?async()=>{bk=await bioELoad(r);return !!bk}:undefined;
  const pw=await askPass('Пароль шифрования «'+r+'»','password','',bioFn);if(pw===null)return false;
  if(pw===BIOOK&&bk){KEYS[r]=bk;decAll().then(render);jlog('login','отпечаток: шифрование '+r);return true}
  try{const o=await openEnc(pw,e);KEYS[r]=o.dk;escrowEnc(r,pw);decAll().then(render);if(wasBio&&BIO.id)bioEPut(r).catch(()=>{});return true}
  catch(x){alert('Неверный пароль шифрования');return false}
}
async function setRepoEnc(r,enc){
  const x=repos.find(q=>q.name===r);
  const m=await withChat(()=>client.sendMessage(S.chat,RP+r+'\n'+ENC+JSON.stringify(enc)+(x.guest?'\n'+GU+(x.owner?' '+x.owner:''):'')));
  await withChat(()=>client.deleteMessages(S.chat,[x.id]));x.id=m.id;x.enc=enc;
}
async function changeEncPw(r){
  if(!canPw(r)){alert('Менять пароли здесь нельзя: этот репозиторий создан не вами.');return}
  const e=encOf(r);if(!e){alert('Репозиторий «'+r+'» не зашифрован.');return}
  const bioWasE=bioEOn(r);
  if(!hasCrypto()){alert('Шифрование недоступно: при таком способе открытия приложения браузер не даёт доступ к криптографии. Откройте приложение с хостинга по https.');return}
  const a=await askPass('Текущий пароль шифрования «'+r+'»');if(a===null)return;
  let raw;
  try{const o=await openEnc(a,e);raw=o.raw||await deriveRaw(a,o.salt)}
  catch(x){alert('Неверный пароль шифрования');return}
  const n1=await askPass('Новый пароль шифрования для «'+r+'». Если забудете, файлы не восстановить');if(!n1)return;
  const n2=await askPass('Повторите новый пароль');if(n1!==n2){alert('Пароли не совпали');return}
  const salt=crypto.getRandomValues(new Uint8Array(16)),K2=await deriveKey(n1,salt),dk=await keyRaw(raw);
  const ne={s:b64e(salt),c:b64e(await aesE(K2,te.encode('ok'))),w:b64e(await aesE(K2,raw)),k:b64e(await aesE(dk,te.encode('ok'))),on:e.on};
  {const x=await encPw(n1);if(x)ne.x=x}
  /* проверка до записи: новый пароль должен открыть ключ, а ключ — реальные зашифрованные файлы этого репозитория */
  try{
    const o=await openEnc(n1,ne),tf=files.find(f=>f.repo===r&&f.enc&&f.encName);
    if(tf)await aesD(o.dk,b64d(tf.encName));
  }catch(x){alert('Проверка не прошла, пароль не изменён: '+err(x));return}
  await setRepoEnc(r,ne);
  KEYS[r]=dk;if(bioWasE)await bioEPut(r);else bioEOff(r);
  jlog('chg','шифрование: '+r);say('Пароль шифрования изменён. Файлы открываются как раньше');
  try{drawRepos()}catch(x){}
}
async function forceEnc(r){
  if(!r)return true;
  const x=repos.find(q=>q.name===r);if(!x)return true;
  if(x.enc&&x.enc.on)return true;
  if(!hasCrypto()){alert('Шифрование недоступно: при таком способе открытия приложения браузер не даёт доступ к криптографии. Откройте приложение с хостинга по https.');return false}
  if(x.enc){if(!await ensureKey(r))return false;await setRepoEnc(r,{...x.enc,on:1});jlog('enc',r+' код действует');return true}
  alert('Репозиторий «'+r+'» ещё не зашифрован. Задайте код шифрования: все новые файлы будут шифроваться.');
  const ne=await newEncSetup(r);if(!ne)return false;
  await setRepoEnc(r,ne.enc);KEYS[r]=ne.k;jlog('enc',r+' код задан');return true;
}

/* быстрое чтение: страницы по 100 сообщений запрашиваются сразу по несколько штук, а не одна за другой.
   Окно с offsetId=o отдаёт до 100 сообщений старше o, поэтому окна с шагом 100 вместе покрывают весь канал.
   Если что-то пошло не так, вызывающий код читает архив по-старому, последовательно. */
async function readFast(prog){
  const first=await withChat(()=>client.getHistory(S.chat,{limit:100}));
  if(!first.length)return[];
  const all=new Map();for(const m of first)all.set(m.id,m);
  const low=Math.min(...first.map(m=>m.id)),offs=[];
  for(let o=low;o>1;o-=100)offs.push(o);
  let k=0,fail=null;
  const worker=async()=>{
    while(!fail){
      const j=k++;if(j>=offs.length)return;
      let b=null;
      for(let t=0;t<3&&!b;t++){
        try{b=await withChat(()=>client.getHistory(S.chat,{limit:100,offsetId:offs[j]}))}
        catch(e){
          const m=/FLOOD_WAIT\D{0,12}(\d+)|wait of (\d+)/i.exec(err(e)),w=m?+(m[1]||m[2]):0;
          if(w>30||t>=2){fail=e;return}
          await sleep(w?(w+1)*1000:1200*(t+1));
        }
      }
      if(!b){fail=new Error('пустой ответ');return}
      for(const m of b)all.set(m.id,m);
      if(prog)prog(all.size);
    }
  };
  await Promise.all([worker(),worker(),worker(),worker()]);
  if(fail)throw fail;
  return[...all.values()].sort((x,y)=>y.id-x.id);
}
async function refresh(opt){
  const out=[],fol=[],reps=[],lks=[],usr=[],jr=[],jenc=[],ordp=[],ans=[],cvx=[],exr=[],ntp=[],shr=[],sps=[],adr=[],seen=new Set();let off,okk=null;const oks=[];
  /* СЛУЖЕБНЫЙ АРХИВ (быстрый запуск): RK — все «сырые» записи, прочитанные из чата; maxId — самое новое сообщение */
  const RK={out,fol,reps,lks,usr,jr,jenc,ordp,ans,cvx,exr,ntp,shr,sps,adr,oks};let maxId=0,snap=null,wasFull=true,vOk=false;
  const proc=m=>{
    if(seen.has(m.id))return;seen.add(m.id);if(m.id>maxId)maxId=m.id;
      const e=entry(m);
      if(e)out.push(e);
      else{const t=m.text;if(typeof t==='string'){
        if(t.startsWith(UR)){try{const j=JSON.parse(t.slice(UR.length));if(j.u&&j.h)usr.push({id:m.id,u:j.u,h:j.h,e:j.e||'',c:j.c||0,b:j.b?1:0,r:Array.isArray(j.r)?j.r.filter(x=>typeof x==='string'):[],ro:Array.isArray(j.ro)?j.ro.filter(x=>typeof x==='string'):[],nc:j.nc?1:0})}catch(x){}}
        else if(t.startsWith(JR)){try{const j=JSON.parse(t.slice(JR.length));if(Array.isArray(j)){for(const e of j)jr.push({...e,mid:m.id,pl:1})}else if(j&&j.k&&j.d)jenc.push({mid:m.id,k:j.k,d:j.d})}catch(x){}}
        else if(t.startsWith(ORR)){try{const j=JSON.parse(t.slice(ORR.length));ordp.push({mid:m.id,r:j.r||'',p:j.p||'',n:j.n||0,o:String(j.o||'')})}catch(x){}}
        else if(t.startsWith(CVX)){try{const j=JSON.parse(t.slice(CVX.length));if(j&&j.d)cvx.push({mid:m.id,r:j.r||'',e:j.e?1:0,d:j.d})}catch(x){}}
        else if(t.startsWith(AN)){try{const j=JSON.parse(t.slice(AN.length));if(j&&j.v&&Array.isArray(j.l))ans.push({id:m.id,v:String(j.v),d:j.d||0,l:j.l.map(String)})}catch(x){}}
        else if(t.startsWith(NTP)){try{const j=JSON.parse(t.slice(NTP.length));if(j&&j.id&&typeof j.s==='string')ntp.push({m:m.id,u:String(j.u||''),id:String(j.id),v:+j.v||0,p:+j.p||0,n:+j.n||1,s:j.s,e:j.e?1:0})}catch(x){}}
        else if(t.startsWith(ADXW)){try{const j=JSON.parse(t.slice(ADXW.length));if(j&&j.k)adr.push({id:m.id,k:String(j.k),v:+j.v||0,dv:String(j.dv||''),u:String(j.u||''),s:typeof j.s==='string'?j.s:'',h:typeof j.h==='string'?j.h:'',i:+j.i||0,n:String(j.n||'').slice(0,60)})}catch(x){}}
        else if(t.startsWith(SHW)){try{const j=JSON.parse(t.slice(SHW.length));if(j&&j.k&&typeof j.u==='string')sps.push({id:m.id,u:j.u,k:String(j.k),v:+j.v||0,p:+j.p||0,n:+j.n||1,s:typeof j.s==='string'?j.s:'',d:j.d&&typeof j.d==='object'?j.d:null})}catch(x){}}
        else if(t.startsWith('🔗 ')){try{const j=JSON.parse(t.slice(3));if(j&&j.i)shr.push({id:m.id,i:String(j.i),r:j.r||'',p:j.p||'',e:+j.e||0,m:+j.m||0,c:+j.c||0,x:j.x?1:0,t:+j.t||0,k:j.k||'',o:String(j.o||'')})}catch(x){}}
        else if(t.startsWith(EXR)){try{const j=JSON.parse(t.slice(EXR.length));if(j&&j.k&&j.x&&j.u)exr.push({id:m.id,k:String(j.k),x:String(j.x),u:String(j.u),n:String(j.n||'')})}catch(x){}}
        else if(t.startsWith(OKR)){try{const r={id:m.id,...JSON.parse(t.slice(OKR.length))};oks.push(r);if(!okk||r.id>okk.id)okk=r}catch(x){}}
        else if(t.startsWith(LK)){try{const j=JSON.parse(t.slice(LK.length));lks.push({id:m.id,r:j.r||'',p:j.p||'',h:j.h,x:j.x||''})}catch(x){}}
        else if(t.startsWith(RP)||t.startsWith(FP)){
          const ls=t.split('\n'),rl=ls.find(l=>l.startsWith(RP)),pl=ls.find(l=>l.startsWith(FP));
          if(pl)fol.push({id:m.id,path:pl.slice(FP.length).trim(),repo:rl?rl.slice(RP.length).trim():''});
          else if(rl){const el=ls.find(l=>l.startsWith(ENC));let en=null;try{if(el)en=JSON.parse(el.slice(ENC.length))}catch(x){}reps.push({id:m.id,name:rl.slice(RP.length).trim(),enc:en,guest:ls.some(l=>l.startsWith(GU)),owner:((ls.find(l=>l.startsWith(GU))||'').slice(GU.length)).trim()})}
        }
      }}
  };
  if(opt&&opt.light){
    /* лёгкий запуск: берём сохранённый служебный архив и дочитываем только новые сообщения (плюс запас 300 номеров назад на случай правок) */
    try{
      snap=await rawLoad();
      if(snap){
        const cut=snap.maxId-300;
        /* v102: при opt.verify старые записи архива сверяются с чатом: удалённые на другом устройстве выпадают сразу */
        const stale=Date.now()-snap.fullT>RAWTTL;
        /* v122: при запуске (opt.fast) архив старше 6 часов НЕ сверяется перед показом: сверка всех записей долгая, а её сбой раньше
           приводил к полному чтению чата. Показываем архив сразу, а сверка идёт фоном (bgSync, opt.verify). Сбой сверки без verify
           тоже не сбрасывает архив: он остаётся в работе, а запасной путь (RAWV.bad) включит полное чтение в фоне. */
        let alive=null;
        if(opt.verify||(stale&&!opt.fast)){
          try{alive=await aliveIds(snap,cut)}
          catch(e){if(opt.verify)throw e;alive=null}
        }
        vOk=!!alive||!snap.r||!Object.values(snap.r).some(a=>a&&a.length);
        for(const k in RK)for(const e of (snap.r[k]||[]))if(e[RAWID[k]]<cut&&(!alive||alive.has(e[RAWID[k]]))){RK[k].push({...e});seen.add(e[RAWID[k]])}
        for(const r of oks)if(!okk||r.id>okk.id)okk=r;
        maxId=snap.maxId;let o2;
        for(let g=0;g<60;g++){
          const b=await withChat(()=>client.getHistory(S.chat,o2?{limit:100,offsetId:o2}:{limit:100}));
          if(!b.length)break;
          for(const m of b)proc(m);
          const lo=Math.min(...b.map(m=>m.id));
          if(lo<cut||b.length<2)break;
          o2=lo;if(g===59)throw new Error('окно слишком большое');
        }
        wasFull=false;
      }
    }catch(x){
      snap=null;wasFull=true;seen.clear();maxId=0;okk=null;for(const k in RK)RK[k].length=0;
    }
  }
  let fast=null;
  if(wasFull){
  try{fast=await readFast(()=>{})}catch(x){fast=null}
  if(fast){for(const m of fast)proc(m)}
  else{
    for(;;){
      const b=await withChat(()=>client.getHistory(S.chat,off?{limit:100,offsetId:off}:{limit:100}));
      const n0=seen.size;for(const m of b)proc(m);
      if(seen.size===n0)break;
      off=Math.min(...b.map(m=>m.id));
    }
  }
  }
  rawSave(RK,maxId,wasFull?0:(vOk?Date.now():snap.fullT));
  files=out;folders=fol;repos=reps;locks=lks;users=usrUniq(usr);JOUR=jr;JENC=jenc;ORD=ordBuild(ordp);ANN=ans.sort((a,b)=>a.id-b.id);EXT=exr.sort((a,b)=>a.id-b.id);NTS=ntBuild(ntp);SHR=[...new Map(shr.sort((a,b)=>a.id-b.id).map(x=>[x.i,x])).values()];ownkey=okk;OKS=oks;CVRM=cvx;syncUN();guestBlockedCheck();saveIndex();if(OWNPRIV)await jDecryptAll();try{cvLoadRemote()}catch(e){}
  if(R()&&!repos.some(x=>x.name===R()&&showRepo(x)))P.repo='';
  if(repoBlocked(R())){const c=[...(repoBlocked('')?[]:['']),...repos.filter(x=>showRepo(x)&&!repoBlocked(x.name)).map(x=>x.name)];if(c.length){P.repo=c[0];cur=''}}
  if(cur&&!allPaths().includes(cur))cur='';
  SPS=sps;ADXR=adr;try{adxSync()}catch(e){}try{annAuto()}catch(e){}try{shAuto()}catch(e){}try{shInit().catch(()=>{})}catch(e){}try{extSync();extAuto()}catch(e){}
}


