/* ===== ФАЙЛ ядро-05-музыка-ЗАЩИЩЕНО.js =====
   
   ЗАЩИЩЕНО (зона 1): расширение «Музыка из чата» (mus*).
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ⛔ ЗАЩИЩЁННЫЙ КОД: переписан из исходного файла БЕЗ ИЗМЕНЕНИЙ. Не править без явного «да» владельца.
   ===== */
const MUS_BOT='@audio_storm_bot';
const MUS={rows:[],stop:false,busy:false,log:[],total:0,done:0,proc:0,stage:'',showLog:false,tick:0};
function mstage(t){MUS.stage=t;MUS.tick=Date.now();musPaint()}
let MS=ld('tgmus',{chat:'',repo:'',folder:'',list:''});
const msv=()=>sv('tgmus',MS);
function mlog(m){
  const d=new Date(),q=n=>String(n).padStart(2,'0');
  MUS.tick=Date.now();MUS.log.push(q(d.getHours())+':'+q(d.getMinutes())+':'+q(d.getSeconds())+'  '+m);if(MUS.log.length>200)MUS.log.shift();
  ulog('Музыка: '+m);const el=$('#musl');if(el){el.textContent=MUS.log.join('\n');el.scrollTop=el.scrollHeight}
}
const musChatId=t=>{t=String(t||'').trim();const m=/(?:t\.me|telegram\.me)\/([A-Za-z0-9_]+)/i.exec(t);if(m)t=m[1];if(!t)return '';if(/^-?\d+$/.test(t))return +t;return '@'+t.replace(/^@/,'')};
const musDate=m=>m.date instanceof Date?m.date:new Date(m.date>1e11?m.date:m.date*1000);
const musDur=s=>{s=Math.round(s||0);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const musAud=m=>m&&(m.audio||m.voice||(m.document&&/^audio\//.test(m.document.mimeType||'')&&m.document));
function musInfo(m){
  const a=m.audio,v=m.voice,d=musAud(m),dt=musDate(m),q=n=>String(n).padStart(2,'0');
  let nm='';
  if(a){const ar=a.artist||a.performer||'',ti=a.title||'';nm=[ar,ti].filter(Boolean).join(' - ')}
  if(!nm&&d&&d.fileName)nm=d.fileName.replace(/\.[^.]+$/,'');
  if(!nm){const tx=String(m.text||m.caption||'').split('\n').map(x=>x.replace(/[*_`]+/g,'').trim()).find(Boolean);if(tx)nm=tx.slice(0,80)}
  if(!nm)nm=(v?'Голосовое ':'Аудио ')+dt.getFullYear()+'-'+q(dt.getMonth()+1)+'-'+q(dt.getDate())+' '+q(dt.getHours())+'-'+q(dt.getMinutes())+'-'+q(dt.getSeconds());
  const mime=(d&&d.mimeType)||(v?'audio/ogg':'audio/mpeg');
  let ext=((d&&d.fileName)||'').match(/\.([A-Za-z0-9]{2,5})$/);ext=ext?ext[1].toLowerCase():(/mpeg|mp3/.test(mime)?'mp3':/mp4|m4a|aac/.test(mime)?'m4a':/flac/.test(mime)?'flac':/wav/.test(mime)?'wav':'ogg');
  nm=clean(nm).replace(/[<>:"|?*\\\x00-\x1f]/g,'').replace(/\s+/g,' ').trim().slice(0,120)||'audio';
  return{id:m.id,msg:m,fid:d.fileId,name:nm+'.'+ext,title:nm,dur:(d&&d.duration)||0,date:dt,mime,size:(d&&d.fileSize)||0};
}
/* любой вызов Telegram не может висеть вечно: через limit мс считаем, что связь мёртвая */
const withTO=(p,ms,what)=>{let t;return Promise.race([p,new Promise((_,rj)=>{t=setTimeout(()=>rj(new Error('нет ответа от Telegram ('+what+')')),ms)})]).finally(()=>clearTimeout(t))};
async function musResolve(){
  const id=MUS_BOT;
  if(!client)throw new Error('Ещё подключаюсь к Telegram, подождите секунду');
  try{const c=await client.getChat(id);return c&&c.id!==undefined?c.id:id}catch(x){throw new Error('Не нашёл бота '+MUS_BOT+': '+err(x))}
}
async function musFolderEnsure(r,p){
  if(!p||allPaths(r).includes(p))return;
  const m=await withChat(()=>client.sendMessage(S.chat,(r?RP+r+'\n':'')+FP+p));
  folders.push({id:m.id,path:p,repo:r});jlog('fo+',(r||'Облако')+' / '+p);saveIndex();mlog('Создана папка: '+p);
}
async function musTarget(){
  const r=MS.repo||'',p=String(MS.folder||'').split('/').map(x=>clean(x)).filter(Boolean).join('/');
  if(r&&!repos.some(x=>x.name===r&&visRepo(x)))throw new Error('Репозиторий «'+r+'» не найден');
  if(!await unlock(r,p))throw new Error('Нужен пароль папки или репозитория');
  if(!await forceEnc(r))throw new Error('Нужен код шифрования репозитория');
  if(r&&encOn(r)&&!KEYS[r]&&!await ensureKey(r))throw new Error('Нужен код шифрования репозитория');
  await musFolderEnsure(r,p);
  return{r,p};
}
async function musGet(it){
  const parts=[];const src=client.download(it.fid);
  const itr=src[Symbol.asyncIterator]?src[Symbol.asyncIterator]():src[Symbol.iterator]();
  const t0=Date.now();
  for(;;){
    /* один трек не может держать весь плейлист: дольше 4 минут — пропускаем, он уйдёт в «неудачные» */
    if(Date.now()-t0>240000){try{itr.return&&itr.return()}catch(e){}throw new Error('слишком медленная загрузка, пропущено (можно повторить кнопкой)')}
    const r=await withTO(itr.next(),60000,'загрузка трека');
    if(r.done)break;
    if(MUS.stop)throw new Error('Остановлено');
    parts.push(await r.value);
  }
  return new Blob(parts,{type:it.mime});
}
async function musSave(it,tg){
  if(files.some(f=>f.repo===tg.r&&f.path===tg.p&&f.name===it.name)){mlog('Уже есть, пропускаю: '+it.name);return false}
  mstage('Скачиваю: '+it.title);
  const b=await musGet(it);if(!b.size)throw new Error('пустой файл');
  mstage('Передаю в облако: '+it.title);
  if(roDeny(tg.r))throw new Error('Репозиторий только для чтения');
  await enqueue([new File([b],it.name,{type:it.mime})],tg.r,tg.p);
  mlog('✓ Передано в загрузку: '+it.name);return true;
}
/* бот может прислать не трек, а список вариантов с кнопками: тогда нажимаем первую кнопку */
const musRowsOf=m=>{const k=m&&m.replyMarkup;const r=k&&(k.inlineKeyboard||k.inline_keyboard);return Array.isArray(r)?r:[]};
async function musClick(chat,m){
  const btn=musRowsOf(m).flat().find(b=>b&&(b.callbackData!==undefined||b.callback_data!==undefined));
  if(!btn){mlog('   у сообщения нет кнопок с действием');return false}
  const data=btn.callbackData!==undefined?btn.callbackData:btn.callback_data;
  const raw=typeof data==='string'?new TextEncoder().encode(data):data,str=typeof data==='string'?data:new TextDecoder().decode(data);
  const tries=[];
  if(typeof client.sendCallbackQuery==='function'){
    tries.push(['объект callback',()=>client.sendCallbackQuery(chat,m.id,{type:'callback',data:str})]);
    tries.push(['объект data',()=>client.sendCallbackQuery(chat,m.id,{data:str})]);
    tries.push(['строка',()=>client.sendCallbackQuery(chat,m.id,str)]);
  }
  tries.push(['raw',async()=>{const peer=await client.getInputPeer(chat);return client.invoke({_:'messages.getBotCallbackAnswer',peer,msg_id:m.id,data:raw})}]);
  let last='';
  for(const[n,f]of tries){
    try{await f();mlog('   кнопка нажата ('+n+')');return true}
    catch(x){const t=err(x);if(/BOT_RESPONSE_TIMEOUT/i.test(t)){mlog('   кнопка нажата ('+n+'), бот отвечает долго');return true}last=t}
  }
  mlog('   ⚠ кнопка не нажалась: '+last);return false;
}
async function musWait(chat,baseId,ms){
  let end=Date.now()+ms;const clicked=new Set();
  while(Date.now()<end&&!MUS.stop){
    let b=[];try{b=await withTO(client.getHistory(chat,{limit:10}),15000,'история чата')}catch(x){}
    const inc=b.filter(m=>m.id>baseId&&!m.out).sort((a,c)=>a.id-c.id);
    const au=inc.find(m=>musAud(m));if(au)return au;
    const lst=inc.slice().reverse().find(m=>musRowsOf(m).length>=2&&!clicked.has(m.id));
    if(lst){clicked.add(lst.id);mlog('   Бот прислал список ('+musRowsOf(lst).length+' рядов кнопок), жму первую…');mstage('Выбираю трек из списка…');if(await musClick(chat,lst))end=Math.max(end,Date.now()+30000);mstage('Жду трек от бота…')}
    await sleep(2000);
  }
  return null;
}
function musResumable(){return !!(MS.job&&MS.job.pos<MS.job.lines.length)}
let musWL=null;
/* экран не гаснет, пока идёт скачивание (если браузер умеет Wake Lock) */
async function musWake(on){
  try{
    if(on&&!musWL&&navigator.wakeLock)musWL=await navigator.wakeLock.request('screen');
    else if(!on&&musWL){const w=musWL;musWL=null;await w.release()}
  }catch(e){musWL=null}
}
async function musPlaylist(){
  if(MUS.busy)return;
  const ta=$('#musp');if(ta){MS.list=ta.value;msv()}
  const lines=String(MS.list||'').split('\n').map(x=>x.trim()).filter(Boolean);
  if(!lines.length){say('Введите хотя бы одну строку: Исполнитель - Название',1);return}
  musRun(lines,0,[],0);
}
async function musRun(lines,start,bad,round){
  if(MUS.busy||!lines.length)return;
  if(!MS.folderOk){say('Сначала выберите папку: нажмите «Куда», выберите папку и нажмите «Выбрать»',1);return}
  round=round||0;
  MS.job={lines,pos:start,bad:bad.slice(),round,auto:true};msv();
  const markBad=l=>{if(!MS.job.bad.includes(l))MS.job.bad.push(l)};
  const markOk=l=>{MS.job.bad=MS.job.bad.filter(x=>x!==l)};
  MUS.busy=true;MUS.stop=false;MUS.total=lines.length;MUS.done=Math.max(0,start-bad.length);MUS.proc=start;bgStart();musWake(true);
  mstage(start?'Продолжаю с '+(start+1)+'-й строки…':'Подготовка…');
  /* сторожевой таймер: если ничего не происходит 2 минуты, переподключаем Telegram */
  const wd=setInterval(()=>{if(MUS.busy&&Date.now()-MUS.tick>120000){MUS.tick=Date.now();mlog('⚠ Нет движения 2 минуты, переподключаюсь к Telegram');reconnectTG('нет движения').catch(()=>{})}},15000);
  let fails=0,pause=0;
  try{
    const chat=await musResolve(),tg=await musTarget();let n=start;
    mlog('Плейлист: '+lines.length+' строк → '+(tg.r||'Облако')+(tg.p?' / '+tg.p:'')+(round?' (повтор, круг '+round+')':''));
    if(start)mlog('Продолжаю с '+(start+1)+'-й строки');
    for(const line of lines.slice(start)){
      if(MUS.stop){mlog('Остановлено');break}
      n++;mlog('['+n+'/'+lines.length+'] Запрашиваю: '+line);
      mstage('Отправляю запрос: '+line);
      let sent=null;
      for(let t=0;t<3&&!sent&&!MUS.stop;t++){
        try{sent=await withTO(client.sendMessage(chat,line),25000,'отправка запроса')}
        catch(x){
          mlog('⚠ Попытка '+(t+1)+' из 3: '+err(x));
          if(t<2){mstage('Переподключаюсь к Telegram…');await withTO(reconnectTG('не отправилось сообщение'),30000,'переподключение').catch(()=>{});await sleep(2000)}
        }
      }
      if(!sent){
        fails++;MUS.proc++;markBad(line);mlog('✖ Не отправилось: «'+line+'»');
        if(fails>=3){
          /* связь мертва: запоминаем строку и делаем паузу; плановик продолжит сам */
          MS.job.pos=n-1;pause=60000;
          mlog('Связь с Telegram потеряна. Продолжу сам через минуту');
          MUS.stage='Нет связи с Telegram. Продолжу сам через минуту';break;
        }
        MS.job.pos=n;msv();musPaint();continue;
      }
      fails=0;
      mstage('Жду ответ бота…');
      await sleep(6000+Math.random()*1000);
      const tm=await musWait(chat,sent.id,30000);
      let ok=false;
      if(!tm){mlog('⚠ Нет ответа с треком на «'+line+'»')}
      else{try{const it=musInfo(tm);ok=!!(await musSave(it,tg))}catch(x){mlog('✖ '+line+': '+err(x))}}
      MUS.proc++;
      if(ok){MUS.done++;markOk(line)}else markBad(line);
      MS.job.pos=n;msv();musPaint();
      if(n<lines.length){mstage('Пауза перед следующим запросом…');await sleep(6000+Math.random()*1000)}
    }
    const finished=!MUS.stop&&MS.job.pos>=lines.length;
    mlog('Итог: скачано '+MUS.done+' из '+lines.length+(MS.job.bad.length?', не получилось: '+MS.job.bad.length:''));
    if(MUS.stop){MS.job.auto=false;MUS.stage='Остановлено. Нажмите «Продолжить скачивание»'}
    else if(pause){MS.job.next=Date.now()+pause}
    else if(finished){
      if(MS.job.bad.length&&round<10){
        /* неудачные сами пойдут вторым кругом через 2 минуты */
        mlog('Неудачные ('+MS.job.bad.length+') пойдут повтором через 2 минуты, круг '+(round+1));
        MS.job={lines:MS.job.bad.slice(),pos:0,bad:[],round:round+1,auto:true,next:Date.now()+120000};
        MUS.stage='Повтор неудачных через 2 минуты, круг '+(round+1);
      }else if(MS.job.bad.length){MS.job.auto=false;MUS.stage='Не получилось: '+MS.job.bad.length+'. Нажмите «Повторить неудачные»'}
      else{MS.job.auto=false;MUS.stage='Готово. Все треки отправлены в загрузку'}
    }
    msv();
  }catch(x){
    const m=err(x);mlog('✖ '+m);
    /* если нужен пароль или ввод пользователя, сами не продолжим; в остальных случаях повторим через 2 минуты */
    if(MS.job&&!MUS.stop){if(/пароль|шифрован|не найден|только для чтения/.test(m))MS.job.auto=false;else MS.job.next=Date.now()+120000}
    MUS.stage='Ошибка: '+m+(MS.job&&MS.job.auto?'. Повторю через 2 минуты':'');
    say(m,1);
  }
  finally{clearInterval(wd);MUS.busy=false;musWake(false);msv();bgStop();musPaint()}
}
/* плановик: раз в 15 секунд проверяет, есть ли незаконченный список, и продолжает его сам */
function musTick(){
  const j=MS.job;
  if(MUS.busy||!j||!j.auto||j.pos>=j.lines.length||(j.next||0)>Date.now()||!MS.folderOk||!client)return;
  musRun(j.lines,j.pos,j.bad,j.round||0);
}
setInterval(musTick,15000);
function musPaint(){
  bgMeta();
  const g=$('#musg');if(!g)return;
  const res=!MUS.busy&&musResumable(),bad=MS.job&&MS.job.bad?MS.job.bad.length:0,rtry=!MUS.busy&&!res&&bad>0;
  g.textContent=MUS.busy?'Остановить':(res?'Продолжить скачивание':'Начать скачивание');
  g.classList.toggle('del',MUS.busy);g.classList.toggle('p',!MUS.busy);
  const rb=$('#musr');if(rb)rb.hidden=!res;
  const xb=$('#musx');if(xb){xb.hidden=!rtry;xb.textContent='Повторить неудачные ('+bad+')'}
  const f=$('#mpf'),t=$('#mpt'),st=$('#mps');
  if(f)f.style.width=(MUS.total?Math.min(100,Math.round(MUS.proc/MUS.total*100)):0)+'%';
  if(t){const sk=MUS.proc-MUS.done;t.textContent='Скачано '+MUS.done+' из '+MUS.total+(sk>0?' · не получилось: '+sk:'')}
  if(st)st.textContent=MUS.stage||'';
  const w=$('#musw');if(w)w.hidden=!MUS.showLog;
  const q=$('#musq');if(q)q.classList.toggle('on',MUS.showLog);
  const el=$('#musl');if(el&&MUS.showLog){el.textContent=MUS.log.join('\n');el.scrollTop=el.scrollHeight}
}
function musPaintTo(){
  const b=$('#musto');if(!b)return;
  b.innerHTML=icon(MS.repo?'repo':'cloud')+'<span class="n">'+esc(MS.folderOk?kpName(MS.repo,MS.folder):'Выберите папку')+'</span>'+icon('down');
}
function openMusic(){
  openAdm(extName('music'));
  const rl=[...(repoBlocked('')?[]:[['','Облако']]),...repos.filter(visRepo).map(x=>[x.name,x.name])];
  if(!rl.some(x=>x[0]===MS.repo)){MS.repo='';msv()}
  $('#admb').innerHTML=`<div class="mus">
    <div class="uc"><label class="ml">Куда</label><button class="mto" id="musto"></button></div>
    <div class="uc"><textarea id="musp" placeholder="Исполнитель - Название&#10;по одному в строке">${esc(MS.list)}</textarea>
      <div class="row"><button class="p" id="musg">Начать скачивание</button><button id="musr" hidden>Начать заново</button><button id="musx" hidden>Повторить неудачные</button><button id="musk">Очистить</button></div></div>
    <div class="uc"><div class="mpt" id="mpt"></div><div class="mpb"><i id="mpf"></i></div><div class="mps" id="mps"></div></div>
    <div class="uc" id="musw" hidden><pre id="musl"></pre></div></div>`;
  const q=$('#musq');q.hidden=false;q.onclick=()=>{MUS.showLog=!MUS.showLog;musPaint()};
  if(MS.job&&!MUS.busy){MUS.total=MS.job.lines.length;MUS.proc=MS.job.pos;MUS.done=Math.max(0,MS.job.pos-MS.job.bad.length);MUS.stage=musResumable()?(MS.job.auto?'Скачивание продолжится само':'Остановлено. Нажмите «Продолжить скачивание»'):''}
  musPaintTo();musPaint();
}
$('#admb').addEventListener('input',e=>{
  const t=e.target;if(t.id==='musp'){MS.list=t.value;msv()}
});
$('#admb').addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('.mus button');if(!b||b.disabled)return;
  if(b.id==='musto'){kpOpen((r,p)=>{MS.repo=r;MS.folder=p;MS.folderOk=true;msv();musPaintTo()},{r:MS.repo||'',p:MS.folder||''},{allowAll:true,confirm:true});return}
  if(b.id==='musg'){if(MUS.busy){MUS.stop=true;if(MS.job)MS.job.auto=false;msv();mlog('Остановка запрошена…')}else if(musResumable())musRun(MS.job.lines,MS.job.pos,MS.job.bad,MS.job.round||0);else musPlaylist()}
  else if(b.id==='musr'){if(!MUS.busy){MS.job=null;msv();musPlaylist()}}
  else if(b.id==='musx'){if(!MUS.busy&&MS.job&&MS.job.bad.length)musRun(MS.job.bad.slice(),0,[])}
  else if(b.id==='musk'){const ta=$('#musp');ta.value='';MS.list='';MS.job=null;msv();ta.focus()}
});

