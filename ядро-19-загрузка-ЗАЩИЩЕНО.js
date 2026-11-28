/* ===== ФАЙЛ ядро-19-загрузка-ЗАЩИЩЕНО.js =====
   
   ЗАЩИЩЕНО (зона 2): загрузка файлов в облако.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ⛔ ЗАЩИЩЁННЫЙ КОД: переписан из исходного файла БЕЗ ИЗМЕНЕНИЙ. Не править без явного «да» владельца.
   ===== */
/* ╔══════════════════════════════════════════════════════════════════════════════════════╗
   ║  ⛔  ВНИМАНИЕ, ИИ / НЕЙРОСЕТЬ / РАЗРАБОТЧИК: БЛОК «ЗАГРУЗКА ФАЙЛОВ» ТРОГАТЬ НЕЛЬЗЯ  ⛔   ║
   ╠══════════════════════════════════════════════════════════════════════════════════════╣
   ║  Граница блока: от этого комментария до строки «=== КОНЕЦ ЗАЩИЩЁННОГО БЛОКА ЗАГРУЗКИ ===». ║
   ║  В него входят: CONC, MAXA, keepAwake, maxNoSync, reconnectTG, startPool, enqueue,   ║
   ║  runPool, retryFailed, runJob, sentAlready, fixPicked, а также upPaint/stallLim/U и  ║
   ║  обработчик client.on('uploadProgress') в connect().                                  ║
   ║                                                                                      ║
   ║  Блок многократно отлаживали на реальном Telegram (зависания на 0% и на 100%).        ║
   ║  Любая «оптимизация» или «упрощение» его снова ломает загрузку. ЗАПРЕЩЕНО:            ║
   ║   • менять CONC (=2) и MAXA (=5), увеличивать параллельность;                         ║
   ║   • менять таймауты (45 с до старта, 90 с после 100%, stallLim, 8 с в maxNoSync);     ║
   ║   • убирать reconnectTG, проверку канала sentAlready, освобождение слота на 99%;      ║
   ║   • переписывать, «чистить», переименовывать или переносить код этого блока;          ║
   ║   • менять порядок: getProgressId → подготовка → sendDocument → ожидание ответа.      ║
   ║  Если задача пользователя не про загрузку: не открывай этот блок, не форматируй его.  ║
   ║  Если без правки не обойтись: СНАЧАЛА спроси владельца явно, объясни зачем, и только  ║
   ║  с его письменного «да» меняй минимально; после правки проверь, что нет синтаксических ║
   ║  ошибок, и допиши в журнал изменений ниже.                                            ║
   ║                                                                                      ║
   ║  Журнал: v81 — CONC 3→2, MAXA 3→5, переподключение при зависании, сторожевые таймеры. ║
   ║  v85 — только текст сообщения о закрытом доступе в enqueue (логика не менялась).      ║
   ╚══════════════════════════════════════════════════════════════════════════════════════╝ */
/* ---- загрузка: очередь, 2 файла одновременно, повторы, защита от зависаний ---- */
const CONC=2,MAXA=5;let UQ=[],UF=[],needRef=false,rt=0,wl=null,_rc=null,_rcAt=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const scheduleRender=()=>{if(!rt)rt=setTimeout(()=>{rt=0;render()},700)};
async function keepAwake(on){
  try{
    if(on){if('wakeLock' in navigator&&!wl){wl=await navigator.wakeLock.request('screen');wl.addEventListener('release',()=>{wl=null})}}
    else if(wl){await wl.release();wl=null}
  }catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&U.on){keepAwake(true);for(const j of U.jobs)if(j.abort&&j.cur<.99&&Date.now()-j.lastP>stallLim(j,Date.now())*.5){ulog(`Вернулись в приложение: загрузка ${j.name} стояла, обрываю`);j.abort()}}});
$('#upl').onclick=()=>ulShow();
$('#upx').onclick=()=>{ulog('Нажата «Отмена»');U.cancel=true;UQ=[];for(const j of U.jobs){try{j.abort?j.abort():j.ctl&&j.ctl.abort()}catch(e){}}};
async function maxNoSync(){
  let m=0;for(const x of files)if(x.no>m)m=x.no;
  maxNoSync.bad=true;
  try{const b=await Promise.race([client.getHistory(S.chat,{limit:30}),new Promise((_,r)=>setTimeout(()=>r(0),8000))]);maxNoSync.bad=false;for(const msg of b){const e=entry(msg);if(e&&e.no>m)m=e.no}}catch(e){}
  return m;
}
/* Соединение с Telegram могло «умереть» тихо (фон, смена сети, VPN): тогда новые отправки тоже зависают.
   Переподключаемся один раз на всех; чаще, чем раз в 20 с, не трогаем, чтобы не рвать живые загрузки. */
function reconnectTG(why){
  if(_rc)return _rc;
  if(Date.now()-_rcAt<20000)return Promise.resolve(true);
  _rc=(async()=>{
    ulog(`Переподключаюсь к Telegram (${why})`);
    try{await Promise.race([client.disconnect(),sleep(5000)])}catch(e){}
    for(let i=0;i<3;i++){
      try{await Promise.race([client.connect(),new Promise((_,r)=>setTimeout(()=>r(new Error('таймаут подключения')),12000))]);ulog('Связь с Telegram восстановлена');return true}
      catch(e){ulog(`Переподключение ${i+1} из 3 не удалось: ${err(e)}`);await sleep(1500*(i+1))}
    }
    return false;
  })().finally(()=>{_rc=null;_rcAt=Date.now()});
  return _rc;
}
/* запуск очереди: если связь не отвечает, сначала переподключаемся; любой сбой не оставляет «вечную загрузку» */
async function startPool(bad){
  try{if(bad)await reconnectTG('нет ответа при старте');await runPool()}
  catch(x){
    ulog('✖ Сбой очереди: '+err(x));
    clearInterval(U.tick);keepAwake(false);U.cancel=false;U.on=false;U.jobs.clear();U.byPid.clear();UQ=[];UF=[];upPaint();
    say('Загрузка прервалась: '+err(x),1);
  }
}
let _em=Promise.resolve();
const encMutex=fn=>{const r=_em.then(fn,fn);_em=r.catch(()=>{});return r};
async function dlStream(f){
  if(f.enc||f.size<8e7||!window.showSaveFilePicker||C.has(f.id))return false;
  let h;try{h=await showSaveFilePicker({suggestedName:f.name})}catch(e){return true}
  const w=await h.createWritable();
  try{
    const it=client.download(f.fid)[Symbol.asyncIterator]();let n=0;
    for(;;){const r=await stallP(it.next(),30000);if(r.done)break;await w.write(r.value);n+=r.value.length;say('Сохраняю: '+Math.round(n/1e6)+' из '+Math.round(f.size/1e6)+' МБ')}
    await w.close();say('Сохранено: '+f.name);
  }catch(e){try{await w.abort()}catch(x){}throw e}
  return true;
}
function sniffExt(h){
  const a=(i,t)=>[...t].every((c,k)=>h[i+k]===c.charCodeAt(0));
  if(h[0]===255&&h[1]===216&&h[2]===255)return'jpg';
  if(h[0]===137&&a(1,'PNG'))return'png';
  if(a(0,'GIF8'))return'gif';
  if(a(0,'RIFF')&&a(8,'WEBP'))return'webp';
  if(a(0,'RIFF')&&a(8,'WAVE'))return'wav';
  if(a(4,'ftyp')){const b=String.fromCharCode(...h.slice(8,12));return /^(heic|heix|hevc|mif1|msf1)/.test(b)?'heic':b==='qt  '?'mov':(b==='M4A '||b==='M4B ')?'m4a':'mp4'}
  if(a(0,'ID3'))return'mp3';
  if(h[0]===255&&(h[1]&246)===240)return'aac';
  if(h[0]===255&&(h[1]&224)===224&&(h[1]&6)!==0)return'mp3';
  if(a(0,'%PDF'))return'pdf';
  if(a(0,'OggS'))return'ogg';
  if(a(0,'fLaC'))return'flac';
  if(h[0]===26&&h[1]===69&&h[2]===223&&h[3]===163)return'webm';
  return'';
}
/* Android иногда отдаёт вместо файла пустую заглушку (0 байт или ~1 КБ, имя из одних цифр без расширения).
   Такие файлы не отправляем, а честно сообщаем. */
async function fixPicked(fs){
  const ok=[],bad=[];
  for(const f of fs){
    const noExt=!/\.[A-Za-z0-9]{1,6}$/.test(f.name),stubName=/^\d+$/.test(f.name);
    if(!noExt&&f.size>0){ok.push(f);continue}
    let h=null;try{h=new Uint8Array(await f.slice(0,16).arrayBuffer())}catch(e){h=null}
    const ext=h&&h.length?sniffExt(h):'';
    if(f.size===0){
      try{const b=new Uint8Array(await f.arrayBuffer());if(b.length){ok.push(new File([b],f.name+(ext?'.'+ext:''),{type:f.type||''}));continue}}catch(e){}
      bad.push(f);continue;
    }
    if(!ext&&stubName&&f.size<=4096){bad.push(f);continue}
    ok.push(ext&&noExt?new File([f],f.name+'.'+ext,{type:f.type||''}):f);
  }
  if(bad.length){
    ulog('Пропущено пустых файлов: '+bad.length+' ('+bad.slice(0,5).map(x=>x.name+' · '+x.size+' Б').join(', ')+')');
    say('Не загружено файлов: '+bad.length+'. Телефон отдал их пустыми (0 байт или около 1 КБ). Проверьте, что файл целиком скачан на телефон и открывается в «Файлах» или в плеере, и выберите его через «Файлы»',1);
  }
  return ok;
}
async function enqueue(fs,rrO,ppO){
  if(repoBlocked(rrO!==undefined?rrO:R())){say('Вы потеряли доступ к этому репозиторию',1);return}
  fs=await fixPicked(fs);if(!fs.length)return;
  ulog(`Выбрано файлов: ${fs.length}`);
  const rr=rrO!==undefined?rrO:R(),pp=ppO!==undefined?ppO:cur,en=encOn(rr);
  if(en&&!KEYS[rr]&&!await ensureKey(rr)){say('Загрузка отменена: нужен пароль шифрования',1);return}
  const items=fs.map(f=>({f,path:pp,repo:rr,enc:en})),add=fs.reduce((a,f)=>a+f.size,0);
  if(U.on){U.total+=add;U.n+=fs.length;UQ.push(...items);upPaint();return}
  const m=await maxNoSync();
  if(U.on){U.total+=add;U.n+=fs.length;UQ.push(...items);upPaint();return}
  Object.assign(U,{on:true,total:add,done:0,fin:0,ok:0,n:fs.length,name:fs[0].name,t0:Date.now(),lastP:Date.now(),got:false,cancel:false,waitMsg:'',retry:'',nextNo:m+1});
  U.jobs.clear();U.byPid.clear();UQ=items;UF=[];needRef=false;
  keepAwake(true);U.tick=setInterval(upPaint,1000);upPaint();
  startPool(maxNoSync.bad);
}
async function runPool(){
  /* место в очереди освобождается, как только файл целиком ушёл (100%): ответ Telegram он ждёт уже «на фоне», а следующий файл тем временем грузится */
  const pend=new Set();
  await Promise.all(Array.from({length:CONC},async()=>{
    while(UQ.length&&!U.cancel){
      const it=UQ.shift();
      const p=((it.enc&&it.f.size>3e7)?encMutex(()=>runJob(it)):runJob(it)).catch(()=>{UF.push(it)});
      pend.add(p);p.finally(()=>pend.delete(p));
      await Promise.race([p,new Promise(res=>{const iv=setInterval(()=>{if(it._job&&it._job.cur>=.99)res()},400);p.finally(()=>{clearInterval(iv);res()})})]);
      while(pend.size>=CONC+1&&!U.cancel)await Promise.race([...pend]);
    }
  }));
  await Promise.all([...pend]);
  clearInterval(U.tick);keepAwake(false);
  const was=U.cancel;U.cancel=false;
  if(needRef){needRef=false;try{await refresh()}catch(x){}}
  U.on=false;U.jobs.clear();U.byPid.clear();upPaint();render();saveIndex();
  const failed=UF.slice();UF=[];
  ulog(was?`Загрузка отменена. Успешно: ${U.ok}`:`Загрузка завершена. Успешно: ${U.ok}, с ошибкой: ${failed.length}`);
  say(was?`Отменено. Загружено файлов: ${U.ok}`:`Готово: загружено файлов — ${U.ok}`+(failed.length?`, не загружено — ${failed.length}`:''),failed.length&&!was);
  if(failed.length&&!was&&confirm(`Не загрузилось файлов: ${failed.length}\n${failed.slice(0,5).map(x=>x.f.name).join('\n')}\n\nПовторить?`)){
    retryFailed(failed);
  }
}
function retryFailed(items){
  if(U.on){U.total+=items.reduce((a,x)=>a+x.f.size,0);U.n+=items.length;UQ.push(...items);return}
  const add=items.reduce((a,x)=>a+x.f.size,0);let m=0;for(const x of files)if(x.no>m)m=x.no;
  Object.assign(U,{on:true,total:add,done:0,fin:0,ok:0,n:items.length,name:items[0].f.name,t0:Date.now(),lastP:Date.now(),got:false,cancel:false,waitMsg:'',retry:'',nextNo:m+1});
  U.jobs.clear();U.byPid.clear();UQ=items.slice();UF=[];needRef=false;
  keepAwake(true);U.tick=setInterval(upPaint,1000);upPaint();startPool(false);
}
let ULOG=ld('tgulog',[]),_ulS=0,ulOpen=false;
function ulog(m){
  const d=new Date(),p=n=>String(n).padStart(2,'0');
  ULOG.push(p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())+'  '+m);
  if(ULOG.length>300)ULOG.splice(0,ULOG.length-300);
  clearTimeout(_ulS);_ulS=setTimeout(()=>{try{sv('tgulog',ULOG.slice(-200))}catch(e){}},1500);
  if(ulOpen)ulPaint();
}
function ulPaint(){
  const pre=$('#ulpre');if(!pre)return;
  const near=pre.scrollHeight-pre.scrollTop-pre.clientHeight<60;
  pre.textContent=ULOG.length?ULOG.join('\n'):'Пока пусто. Здесь будет видно, что делает приложение при загрузке файлов.';
  if(near)pre.scrollTop=pre.scrollHeight;
}
function ulShow(){
  let o=$('#ulp');if(o)o.remove();
  o=document.createElement('div');o.id='ulp';
  o.innerHTML='<div class="ulb"><div class="ulh">Журнал загрузки</div><pre id="ulpre"></pre><div class="ulr"><button id="ulcp">Копировать</button><button id="ulcl">Очистить</button><button class="p" id="ulx">Закрыть</button></div></div>';
  document.body.appendChild(o);ulOpen=true;ulPaint();$('#ulpre').scrollTop=$('#ulpre').scrollHeight;
  const close=()=>{ulOpen=false;o.remove()};
  $('#ulx').onclick=close;o.onclick=e=>{if(e.target===o)close()};
  $('#ulcl').onclick=()=>{ULOG=[];try{sv('tgulog',[])}catch(e){}ulPaint()};
  $('#ulcp').onclick=async()=>{try{await navigator.clipboard.writeText(ULOG.join('\n'));say('Журнал скопирован')}catch(e){say('Не удалось скопировать',1)}};
}
async function sentAlready(it,no){
  try{
    const b=await Promise.race([client.getHistory(S.chat,{limit:40}),new Promise((_,rej)=>setTimeout(()=>rej(0),15000))]);
    for(const m of b){const e=entry(m);if(e&&e.no===no&&e.repo===(it.repo||'')&&e.path===(it.path||''))return e}
  }catch(x){}
  return null;
}
async function runJob(it){
  if(U.cancel)return;
  const f=it.f,job={name:f.name,size:f.size,cur:0,got:false,lastP:Date.now(),t0:Date.now(),ctl:null};
  U.jobs.add(job);it._job=job;U.lastP=Date.now();upPaint();
  const no=U.nextNo++;ulog(`▶ Начинаю: ${f.name} · ${size(f.size)}${it.enc?' · с шифрованием':''}${it.path?' · папка '+it.path:''}`);let done=false,floods=0;
  for(let a=1;a<=MAXA&&!done&&!U.cancel;a++){
    job.cur=0;job.q=0;job.got=false;job.lastP=Date.now();job.t0=Date.now();
    ulog(`Попытка ${a} из ${MAXA}: ${f.name}`);
    if(a>1){const e0=await sentAlready(it,no);if(e0){ulog(`Файл ${f.name} уже в канале, повторно не отправляю`);files.push(e0);done=true;jlog('up',(it.enc?'зашифрованный файл':f.name)+' → '+(it.repo||'Облако')+(it.path?' / '+it.path:''));scheduleRender();saveIndex();break}}
    U.retry=a>1?`Повтор ${a} из ${MAXA}: ${f.name}`:'';
    let timer=0,pv;
    try{
      try{pv=await Promise.race([client.getProgressId(),new Promise(r=>setTimeout(()=>r(undefined),5000))])}catch(x){pv=undefined}
      ulog(pv!==undefined?'Получен номер загрузки':'Номер загрузки не получен за 5 с, иду без него');
      job.pid=pv!==undefined;
      if(pv!==undefined)U.byPid.set(String(pv),job);
      const big=f.size>1.5e8&&!it.enc;
      if(it.enc&&f.size>3e8)throw new Error('Файл больше 300 МБ нельзя зашифровать');
      ulog(it.enc?'Шифрую и читаю файл…':big?'Большой файл: отправляю потоком':'Читаю файл…');
      let data=it.enc?(f.size>3e7?await encBytes(it.repo,f):await encMutex(()=>encBytes(it.repo,f))):big?f.stream():new Uint8Array(await f.arrayBuffer());
      ulog('Файл подготовлен, отправляю в Telegram');
      const ctl=new AbortController();job.ctl=ctl;
      let kill;const dead=new Promise((_,rej)=>{kill=rej});dead.catch(()=>{});
      job.abort=()=>{try{ctl.abort()}catch(e){}kill(new Error('Нет ответа от Telegram'))};
      const ts0=Date.now();
      timer=setInterval(()=>{
        const now=Date.now(),hi=job.cur>=.99;
        if(job.got&&now-job.lastP>(hi?90000:stallLim(job,now))){ulog(`⏱ Нет движения ${Math.round((now-job.lastP)/1000)} с${hi?' (после 100%)':''}: обрываю попытку`);job.abort()}
        else if(!job.got&&(job.pid||U.jobs.size===1)&&now-ts0>45000){ulog('⏱ Отправка не началась за 45 с: обрываю попытку');job.abort()}
        else if(now-job.t0>120000+f.size/50+(hi?90000:0)){ulog('⏱ Вышло общее время попытки: обрываю');job.abort()}
      },3000);
      const eN=it.enc?await encName(it.repo,f):null;
      const o={caption:caption(no,it.path,eN?'🔐'+eN:f.name,it.repo),fileName:eN?'enc'+no+'.bin':f.name,signal:ctl.signal};
      if(big)o.fileSize=f.size;
      if(pv!==undefined)o.progressId=pv;
      const sp=withChat(()=>client.sendDocument(S.chat,data,o));sp.catch(()=>{});
      /* файл дошёл до 100%, а ответа Telegram всё нет: не ждём вслепую, а заглядываем в канал — если файл уже там, считаем его загруженным */
      let fnd=null;const fp=new Promise(res=>{fnd=res});
      const poll=setInterval(async()=>{
        if(U.polling||job.cur<.99||Date.now()-job.lastP<5000)return;
        U.polling=true;
        try{const e=await sentAlready(it,no);if(e){ulog(`Файл ${f.name} уже в канале, ответа Telegram не жду`);fnd({__e:e})}}catch(x){}finally{U.polling=false}
      },4000);
      let r;try{r=await Promise.race([sp,dead,fp])}finally{clearInterval(poll)}
      data=null;done=true;
      const en=r&&r.__e?r.__e:entry(r);
      ulog(en?`✔ Загружен: ${f.name}`:`✔ Telegram принял ${f.name}, список обновлю в конце`);
      if(en){if(!en.no)en.no=no;files.push(en)}else needRef=true;
      jlog('up',(it.enc?'зашифрованный файл':f.name)+' → '+(it.repo||'Облако')+(it.path?' / '+it.path:''));
      scheduleRender();saveIndex();
    }catch(x){
      ulog(U.cancel?`Отменено: ${f.name}`:`✖ Ошибка: ${err(x)}`);
      if(U.cancel)break;
      if(/Подпись слишком/.test(err(x)))break;
      if(job.cur>=.98){
        let e=null;
        ulog('Передано 100%: проверяю, есть ли файл в канале');
        for(let k=0;k<5&&!e&&!U.cancel;k++){e=await sentAlready(it,no);ulog(e?`Проверка ${k+1}: файл найден`:`Проверка ${k+1}: файла в канале пока нет`);if(!e)await sleep(4000)}   /* файл дошёл до 100%: даём Telegram дозаписать его и ищем в канале */
        if(e){files.push(e);done=true;jlog('up',(it.enc?'зашифрованный файл':f.name)+' → '+(it.repo||'Облако')+(it.path?' / '+it.path:''));scheduleRender();break}
      }
      const msg=err(x),m=/(?:FLOOD_WAIT|wait of|wait for)\D{0,12}(\d{1,5})/i.exec(msg);
      if(m&&floods<5){
        floods++;a--;ulog(`Telegram просит подождать ${m[1]} с`);
        for(let sec=Math.min(+m[1],180);sec>0&&!U.cancel;sec--){U.waitMsg=`Telegram просит подождать: ещё ${sec} с`;upPaint();await sleep(1000)}
        U.waitMsg='';
      }else if(a<MAXA){
        /* зависание или обрыв: старое соединение ненадёжно, перед повтором поднимаем новое */
        if(/Нет ответа от Telegram|завис|disconnect|network|connection|timeout|timed out|websocket|closed|fetch/i.test(msg))await reconnectTG('зависла отправка '+f.name);
        ulog(`Повтор через ${a*2.5} с`);await sleep(a*2500)
      }
    }finally{clearInterval(timer);if(pv!==undefined)U.byPid.delete(String(pv))}
  }
  U.jobs.delete(job);U.fin++;U.done+=f.size;U.retry='';
  if(done)U.ok++;else if(!U.cancel){UF.push(it);ulog(`✖ НЕ ЗАГРУЖЕН: ${f.name}`)}
  upPaint();
}
/* === КОНЕЦ ЗАЩИЩЁННОГО БЛОКА ЗАГРУЗКИ === */
