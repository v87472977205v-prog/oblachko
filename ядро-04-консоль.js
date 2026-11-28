/* ===== ФАЙЛ ядро-04-консоль.js =====
   
   Экран администратора, настройки, консоль, кэш, служебный архив, обложки (экраны), фоновая работа.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
function openAdm(t){try{gymReset()}catch(e){}$('#admt').textContent=t;$('#adm').hidden=false;const q=$('#musq');if(q)q.hidden=true}
let fromSet=false,admParent=null;
$('#admx').onclick=()=>{if(fromSet&&admParent){admParent();return}fromSet=false;admParent=null;$('#adm').hidden=true};
function drawSettings(){
  fromSet=false;admParent=null;openAdm('Настройки');
  $('#admb').innerHTML=`<div class="stl"><button data-set="cov">${icon('music')}<span>Обложки музыки</span></button><button data-set="lks">${icon('repo')}<span>Кнопка открытия репозитория</span></button><button data-set="cch">${icon('cloud')}<span>Кэш файлов и музыки</span></button><button data-set="raw">${icon('refresh')}<span>Служебный архив (быстрый запуск)</span></button>${instStandalone()?'':`<button data-set="inst">${icon('down')}<span>Установить приложение</span></button>`}<button data-set="upd">${icon('refresh')}<span>Обновить приложение</span></button><button data-set="ulg">${icon('list')}<span>Журнал загрузки</span></button></div>`;
}
/* консоль — только у администратора (у остальных не открывается ни кнопкой, ни напрямую) */
function drawConsole(){
  if(!isAdmin()){drawSettings();return}
  fromSet=false;admParent=null;openAdm('Консоль администратора');
  $('#admb').innerHTML=`<div class="stl"><button data-set="usr">${icon('users')}<span>Пользователи</span></button><button data-set="acc">${icon('lock')}<span>Доступ</span></button><button data-set="jrn">${icon('list')}<span>Журнал действий</span></button><button data-set="key">${icon('lock')}<span>Ключ для друга</span></button><button data-set="ann">${icon('bell')}<span>Оповещения</span></button><button data-set="ext">${icon('puzzle')}<span>Расширения</span></button><button data-set="stat">${icon('list')}<span>Статистика</span></button>${adxTrue()?`<button data-set="adx">${icon('lock')}<span>Код администратора</span></button>`:''}</div>`;
}
function openLks(){
  openAdm('Кнопка открытия репозитория');
  const sl=ld('lkstyle','round')==='slide';
  $('#admb').innerHTML=`<div style="padding:10px 14px"><div class="uc"><div class="un">Кнопка открытия репозитория</div><div class="us">Как открывать зашифрованный или запароленный репозиторий.</div><div class="row"><button class="chip${sl?'':' on'}" data-lks="round">Круглая</button><button class="chip${sl?' on':''}" data-lks="slide">Слайдер</button></div></div></div>`;
}
function openCache(){
  openAdm('Кэш файлов и музыки');
  $('#admb').innerHTML=`<div class="gls">
    <section class="gl"><div class="gll">Занято на устройстве</div><div class="glbig" id="cachebig">…</div><div class="glsub" id="cachei">Считаю…</div><div class="glbar"><i id="cachebar"></i></div></section>
    <section class="gl"><div class="gll">Сколько хранить</div><div class="glseg" id="cttl">${CTTLS.map(([h,n])=>`<button data-cttl="${h}">${n}</button>`).join('')}</div><div class="glsub" id="cttld"></div></section>
    <section class="gl"><div class="gll">Очистка</div><div class="glsub" style="margin:0 0 14px">Удаляет сохранённые на устройстве файлы и музыку. Файлы в канале, вход, пароли и позиции в треках не затрагиваются.</div><button class="gldel" id="cachex">${icon('trash')}Сбросить кэш</button></section>
  </div>`;
  paintCttl();paintCache();
}
function paintCttl(){
  const h=+ld('tgcttl',168);
  document.querySelectorAll('[data-cttl]').forEach(x=>x.classList.toggle('on',+x.dataset.cttl===h));
  const d=$('#cttld');if(!d)return;
  const w={6:'через 6 часов',24:'через сутки',168:'через неделю'}[h];
  d.textContent=h<0?'Файлы сами не удаляются, пока браузеру хватает места. Удалить можно вручную кнопкой «Сбросить кэш» ниже.':'Файлы и музыка удаляются с устройства '+w+' после последнего прослушивания или открытия.';
}
async function paintCache(){
  try{
    const[i,q]=await Promise.all([cacheInfo(),cacheQuota()]);
    const big=$('#cachebig'),sub=$('#cachei'),bar=$('#cachebar');if(!big)return;
    big.textContent=i.n?size(i.size):'0 МБ';
    sub.textContent=(i.n?`Файлов: ${i.n}`:'Пока пусто')+(q?` · приложение использует ${size(q.used)} из ${size(q.quota)} доступных браузером`:'');
    if(bar)bar.style.width=(q&&q.quota?Math.max(i.n?2:0,Math.min(100,i.size/q.quota*100)):0)+'%';
  }catch(e){}
}
function openRaw(){
  openAdm('Служебный архив');
  $('#admb').innerHTML=`<div class="gls">
    <section class="gl"><div class="gll">Состояние</div><div class="glbig" id="rawbig">…</div><div class="glsub" id="rawi">Считаю…</div><div class="glsub" id="rawwhy"></div></section>
    <section class="gl"><div class="gll">Сколько хранить</div><div class="glseg">${RAWKEEP.map(([h,n])=>`<button data-rkeep="${h}">${n}</button>`).join('')}</div><div class="glsub" id="rawd"></div></section>
    <section class="gl"><div class="gll">Очистка</div><div class="glsub" style="margin:0 0 14px">Удаляет копию записей чата на устройстве. Файлы и данные в Telegram не затрагиваются. При следующем запуске чат будет прочитан целиком, это дольше.</div><button class="gldel" id="rawx">${icon('trash')}Удалить архив</button></section>
  </div>`;
  paintRawKeep();paintRaw();
}
function paintRawKeep(){
  const h=+ld('tgrawkeep',168);
  document.querySelectorAll('[data-rkeep]').forEach(x=>x.classList.toggle('on',+x.dataset.rkeep===h));
  const d=$('#rawd');if(!d)return;
  const w={6:'6 часов',24:'суток',168:'недели'}[h];
  d.textContent=h<0?'Архив не удаляется по сроку, приложение запускается быстро всегда. Удалить его можно вручную кнопкой «Удалить архив» ниже. Удалённые в чате файлы всё равно сверяются и пропадают.':'Архив удаляется, если больше '+w+' его не обновляли и не сверяли с чатом. Тогда следующий запуск медленнее.';
}
async function paintRaw(){
  try{
    const r=await idbOp('m','readonly',s=>s.get('raw')),big=$('#rawbig'),inf=$('#rawi'),why=$('#rawwhy');if(!big)return;
    if(!r||!r.r){big.textContent='Архива нет';inf.textContent='Появится после ближайшего полного чтения чата.'}
    else{
      const n=Object.values(r.r).reduce((a,v)=>a+(v?v.length:0),0),kb=Math.round(JSON.stringify(r.r).length/1024);
      big.textContent=n.toLocaleString('ru')+' записей';
      inf.textContent='Обновлён '+ago(r.fullT)+' · около '+(kb>=1024?(kb/1024).toFixed(1)+' МБ':kb+' КБ');
    }
    const w=ld('tgrawwhy',null);
    why.textContent=w&&w.w?'Последний раз архив не использован: '+w.w+' ('+ago(w.t)+').':'';
  }catch(e){}
}
const ago=t=>{const m=Math.max(0,Math.round((Date.now()-t)/6e4));if(m<1)return 'только что';if(m<60)return m+' мин назад';const h=Math.round(m/60);if(h<24)return h+' ч назад';return Math.round(h/24)+' дн назад'};
async function rawReset(){
  RAWM=null;
  await idbOp('m','readwrite',s=>s.delete('raw'));await idbOp('m','readwrite',s=>s.delete('rawdirty'));await idbOp('m','readwrite',s=>s.delete('idx'));
}
async function appUpdate(){
  if(!confirm('Обновить приложение? Вход и файлы не затрагиваются.'))return;
  try{const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()));const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}catch(x){}
  location.reload();
}
$('#admb').addEventListener('click',async e=>{
  {const ks=e.target.closest('[data-lks]');if(ks){const v=ks.dataset.lks;sv('lkstyle',v);applyLks();document.querySelectorAll('[data-lks]').forEach(x=>x.classList.toggle('on',x.dataset.lks===v));return}}
  {const ce=e.target.closest('[data-cveq]');if(ce){const v=ce.dataset.cveq;sv('cveq',v);applyEq();document.querySelectorAll('[data-cveq]').forEach(x=>x.classList.toggle('on',x.dataset.cveq===v));return}}
  {const cw=e.target.closest('[data-cvw]');if(cw){const v=cw.dataset.cvw;sv('cvweb',v);cvWebChanged();document.querySelectorAll('[data-cvw]').forEach(x=>x.classList.toggle('on',x.dataset.cvw===v));return}}
  if(e.target.closest('#cvx')){if(confirm('Удалить сохранённые обложки и подобрать заново?'))cvReset();return}
  {const rk=e.target.closest('[data-rkeep]');if(rk){sv('tgrawkeep',+rk.dataset.rkeep);paintRawKeep();return}}
  {const rx=e.target.closest('#rawx');if(rx){if(rx.disabled)return;if(!confirm('Удалить служебный архив? Следующий запуск будет дольше.'))return;rx.disabled=true;try{await rawReset();say('Архив удалён');paintRaw()}catch(x){say('Не удалось удалить архив: '+err(x),1)}finally{rx.disabled=false}return}}
  {const ct=e.target.closest('[data-cttl]');if(ct){sv('tgcttl',+ct.dataset.cttl);paintCttl();cPurge().then(paintCache);return}}
  const b=e.target.closest('#cachex');if(!b||b.disabled)return;
  b.disabled=true;
  try{const was=await cacheReset();paintCache();say(was.n?'Кэш сброшен: освобождено '+size(was.size):'Кэш и так пуст')}
  catch(x){say('Не удалось сбросить кэш: '+err(x),1)}
  finally{b.disabled=false}
});
function openCov(){
  openAdm('Обложки музыки');
  const on=cvWebOn(),eq=ld('cveq','on')!=='off';
  $('#admb').innerHTML=`<div style="padding:10px 14px"><div class="uc"><div class="un">Откуда брать обложки</div><div class="us">Только из интернета (iTunes), по названию трека: туда уходит одно название, в том числе у зашифрованных файлов. Из самих файлов ничего не читается. Найденные обложки запоминаются и видны на других устройствах.</div><div class="row"><button class="chip${on?' on':''}" data-cvw="on">Из интернета</button><button class="chip${on?'':' on'}" data-cvw="off">Выключено</button></div><div class="us">Выключено — ничего не ищется и не показывается, у всех треков своя зелёная обложка.</div></div><div class="uc"><div class="un">Треки без обложки</div><div class="us">У каждого трека своя неповторимая зелёная обложка с нотой, она не меняется.</div></div><div class="uc"><div class="un">Эквалайзер на играющем треке</div><div class="us">Показывается только там, где нет настоящей обложки, и двигается, пока музыка играет.</div><div class="row"><button class="chip${eq?' on':''}" data-cveq="on">Показывать</button><button class="chip${eq?'':' on'}" data-cveq="off">Скрыть</button></div></div><div class="uc"><div class="row"><button id="cvx">Подобрать обложки заново</button></div></div></div>`;
}
const applyEq=()=>document.body.classList.toggle('noeq',ld('cveq','on')==='off');applyEq();
$('#setb').onclick=drawSettings;

/* ---- «Консоль» только у администратора (в шторке); шестерёнка настроек папки — у всех ---- */
$('#conb').onclick=()=>{if(isAdmin())drawConsole()};

/* ---- Консоль → «Музыка из чата» ----
   Вход в Telegram берётся тот же, что у Облачка (api_id / api_hash / сессия), второй раз входить не нужно.
   Из чата или бота скачиваются голосовые и аудио, и сразу кладутся в выбранный репозиторий и папку Облачка. */
/* ---- Фоновая работа ----
   Пока идёт плейлист, тихо крутится служебный звук, а в шторке уведомлений показывается карточка Облачка:
   значок приложения, «Скачано 3 из 10», текущий этап и шкала прогресса. Кнопка паузы в карточке останавливает загрузку.
   Пока вкладка «воспроизводит» звук, браузер не усыпляет страницу, и загрузка идёт при свёрнутом приложении и погашенном экране. */
const MBG={a:null,on:false};
function bgStart(){
  if(MBG.on)return;MBG.on=true;
  try{
    if(!MBG.a){
      const sr=8000,n=sr*10,buf=new ArrayBuffer(44+n*2),dv=new DataView(buf);   /* дольше 5 секунд: короче Chrome не показывает карточку в шторке */
      const w=(o,t)=>{for(let i=0;i<t.length;i++)dv.setUint8(o+i,t.charCodeAt(i))};
      w(0,'RIFF');dv.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,sr,true);dv.setUint32(28,sr*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);w(36,'data');dv.setUint32(40,n*2,true);
      for(let i=0;i<n;i++)dv.setInt16(44+i*2,Math.round(Math.sin(2*Math.PI*25*i/sr)*300),true);
      MBG.a=new Audio(URL.createObjectURL(new Blob([buf],{type:'audio/wav'})));MBG.a.loop=true;
    }
    const pr=MBG.a.play();if(pr&&pr.catch)pr.catch(x=>mlog('Фоновый режим не включился: '+err(x)));
  }catch(e){mlog('Фоновый режим не включился: '+err(e))}
  try{
    const ms=navigator.mediaSession;
    for(const a of['play','previoustrack','nexttrack','seekbackward','seekforward','seekto'])try{ms.setActionHandler(a,null)}catch(e){}
    const stop=()=>{if(MUS.busy){MUS.stop=true;mstage('Останавливаю…');mlog('Остановка из шторки')}try{if(MBG.on&&MBG.a)MBG.a.play()}catch(e){}};
    for(const a of['pause','stop'])try{ms.setActionHandler(a,stop)}catch(e){}
  }catch(e){}
  bgMeta();
}
function bgMeta(){
  if(!MBG.on||!('mediaSession' in navigator))return;
  if(typeof au!=='undefined'&&!au.paused)return;
  try{
    const ms=navigator.mediaSession,ic=n=>new URL(n,location.href).href;
    ms.metadata=new MediaMetadata({title:'Скачано '+MUS.done+' из '+MUS.total,artist:MUS.stage||'Готовлюсь…',album:'Облачко · скачивание музыки',artwork:[{src:ic('icon-v4-512.png'),sizes:'512x512',type:'image/png'},{src:ic('icon-v4-192.png'),sizes:'192x192',type:'image/png'}]});
    ms.playbackState='playing';
    if(MUS.total>0)ms.setPositionState({duration:MUS.total,position:Math.min(MUS.proc,MUS.total),playbackRate:0.0001});
  }catch(e){}
}
function bgStop(){
  MBG.on=false;
  try{if(MBG.a)MBG.a.pause()}catch(e){}
  try{if(typeof au==='undefined'||au.paused){navigator.mediaSession.metadata=null;navigator.mediaSession.playbackState='none'}}catch(e){}
  try{bindMS()}catch(e){}
}
