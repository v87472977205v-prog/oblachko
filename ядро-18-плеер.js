/* ===== ФАЙЛ ядро-18-плеер.js =====
   
   Плеер, подкачка, управление с наушников, эквалайзер, жесты, новая папка.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- плеер ---- */
const isAud=f=>(f.mime||'').startsWith('audio/')||/\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)$/i.test(f.name);
const audioList=()=>curList.map(id=>files.find(x=>x.id===id)).filter(f=>f&&isAud(f));
const au=new Audio();au.preload='auto';
let pq=[],pi=-1,seeking=false;
/* ключи исполнителей для текущей очереди (индексы совпадают с pq); нужны перемешиванию без повторов */
let ARTK=null;
const artistOf=f=>{const m=dispName(f.name).match(/^(.+?)\s+[-–—]\s+.+$/);return m?m[1].trim().toLowerCase():''};
let LASTID=+ld('tglast',0)||0;
let SHUF=false,REPM=0,SPDI=Math.max(0,Math.min(5,+ld('tgspd',0)||0)),SLP=0,slpT=0,lastSave=0;
const SPDS=[1,1.25,1.5,1.75,2,.75],SLPS=[0,15,30,60],PS=ld('tgpos',{});
const applySpd=()=>{au.defaultPlaybackRate=au.playbackRate=SPDS[SPDI]};
function drawPl4(){
  const A=(id,s)=>{const e=$('#'+id);e.setAttribute('aria-label',s);e.title=s};
  $('#pshuf').classList.toggle('on',SHUF);A('pshuf','Перемешать: '+(SHUF?'вкл':'выкл'));
  A('prep',['Повтор: нет','Повтор: все','Повтор: один'][REPM]);$('#prep').classList.toggle('on',REPM>0);
  try{$('#prep svg path').setAttribute('d',IC[REPM===2?'repeat1':'repeat'])}catch(e){}
  $('#pspd .pl').textContent=SPDS[SPDI]+'×';A('pspd','Скорость '+SPDS[SPDI]+'×');$('#pspd').classList.toggle('on',SPDI>0);
  const b=$('#pslp .pbg');b.textContent=SLP||'';b.hidden=!SLP;A('pslp',SLP?'Сон: '+SLP+' мин':'Таймер сна');$('#pslp').classList.toggle('on',!!SLP)}
$('#pshuf').onclick=()=>{SHUF=!SHUF;SH={o:[],p:0,len:0};drawPl4();pfPlan()};
$('#prep').onclick=()=>{REPM=(REPM+1)%3;drawPl4();pfPlan()};
$('#pspd').onclick=()=>{SPDI=(SPDI+1)%SPDS.length;sv('tgspd',SPDI);applySpd();drawPl4()};
$('#pslp').onclick=()=>{SLP=SLPS[(SLPS.indexOf(SLP)+1)%SLPS.length];clearTimeout(slpT);if(SLP)slpT=setTimeout(()=>{au.pause();SLP=0;drawPl4();say('Таймер сна: музыка остановлена')},SLP*60000);drawPl4()};
const TU=[];au.addEventListener('timeupdate',()=>{for(const f of TU)f()});
TU.push(()=>{const f=pq[pi];if(f&&au.duration>0&&Date.now()-lastSave>3000){lastSave=Date.now();PS[f.id]=au.currentTime;const k=Object.keys(PS);if(k.length>500)delete PS[k[0]];sv('tgpos',PS)}});
au.addEventListener('pause',()=>{if(loadingTrack)return;const f=pq[pi];if(f&&au.duration>0&&!au.ended){PS[f.id]=au.currentTime;sv('tgpos',PS)}});
drawPl4();
const lastAud=()=>{const lf=LASTID?files.find(x=>x.id===LASTID):null;return lf&&isAud(lf)?lf:null};   /* запертая папка не мешает вернуть последний трек: он уже играл */
const saveNow=()=>{const f=pq[pi];if(f&&au.duration>0&&!au.ended){PS[f.id]=au.currentTime;sv('tgpos',PS)}};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveNow()});
window.addEventListener('pagehide',saveNow);
const _pend=new Map();
const urlOfD=(f,noDisk)=>{if(C.has(f.id))return Promise.resolve(C.get(f.id));if(!_pend.has(f.id)){const p=urlOf(f,noDisk).finally(()=>{if(_pend.get(f.id)===p)_pend.delete(f.id)});_pend.set(f.id,p)}return _pend.get(f.id)};
/* ждём ссылку на трек, но не вечно: если загрузка не двигается 25 секунд, сообщаем и сдаёмся (дальше — повтор в обход диска) */
function waitUrl(f,noDisk){
  return new Promise((ok,no)=>{
    let last=-1,t0=Date.now(),told=false,done=false;
    const iv=setInterval(()=>{
      const n=DLP.get(f.id)||0;if(n!==last){last=n;t0=Date.now();return}
      const w=Date.now()-t0;
      if(w>10000&&!told){told=true;say('Долго грузится… нажмите ▶, чтобы повторить')}
      if(w>25000&&!done){done=true;clearInterval(iv);no(new Error('Загрузка зависла'))}
    },2000);
    urlOfD(f,noDisk).then(u=>{done=true;clearInterval(iv);ok(u)},e=>{done=true;clearInterval(iv);no(e)});
  });
}
function retryTrack(){
  const f=pq[pi];if(!f)return;
  const j=DLJ.get(f.id);if(j)try{j.cancel()}catch(e){}
  _pend.delete(f.id);playAt(pi,true,false,true);
}
const fmt=t=>{if(!isFinite(t))return'0:00';t=Math.floor(t);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
let loadingTrack=false,playTok=0;
const setPlBtn=()=>{$('#pplay').innerHTML=loadingTrack?'<svg class="i plspin" viewBox="0 0 24 24" style="width:28px;height:28px"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="36 20" stroke-linecap="round"/></svg>':au.paused?'<svg class="i" viewBox="0 0 24 24" style="fill:currentColor;width:28px;height:28px"><path d="M8 5l11 7-11 7z"/></svg>':'<svg class="i" viewBox="0 0 24 24" style="fill:currentColor;width:28px;height:28px"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>'};
setPlBtn();
function showPl(on){$('#pl').hidden=!on;document.body.classList.toggle('pl-on',on&&!document.body.classList.contains('qkmusic'))}
let loadT0=0;
const dispName=n=>String(n||'').replace(/\.(mp3|m4a|flac|wav|ogg|oga|opus|aac|wma)$/i,'');
async function playAt(i,auto=true,resume=false,force=false){
  if(i<0||i>=pq.length)return;
  saveNow();
  /* Если ссылка на трек уже готова (следующий трек подготовлен заранее), включаем его в ту же долю секунды, без пауз и ожиданий:
     при выключенном экране браузер разрешает продолжить звук только сразу, в момент окончания прошлого трека. */
  const ready=pq[i]&&C.get(pq[i].id);
  const tok=++playTok;loadingTrack=true;loadT0=Date.now();if(!ready)au.pause();
  pi=i;const f=pq[i];LASTID=f.id;sv('tglast',LASTID);ARTK=SHUF&&pq.length>1?pq.map(artistOf):null;if(SHUF&&pq.length>1)shSync(SH,i,pq.length);
  HOLD=false;LOADPLAY=auto;msMeta(f);bindMS();msState();try{if(SHM.on){if(SHM.skip)SHM.skip=false;else shSavePos(true,0)}}catch(e){}
  /* листаем туда-сюда: загрузки музыки, которые уже не нужны, не должны тянуть канал */
  for(const j of DLJ.values())if(j.aud&&j.f.id!==f.id)j.pre=true;
  pfPlan();
  showPl(true);markPlaying();setPlBtn();{const n=dispName(f.name),m=n.match(/^(.+?)\s+[-–—]\s+(.+)$/);$('#pt').textContent=m?m[2]:n;$('#partist').textContent=m?m[1]:'';$('#partist').hidden=!m}cvShow(f);$('#pseek').value=0;$('#pcur').textContent='0:00';$('#pdur').textContent='…';
  try{
    /* зашифрованный репозиторий без ключа (после перезапуска): просим пароль, а не падаем; пока приложение свёрнуто — ждём, когда его откроют */
    if(f.enc&&!KEYS[f.repo]){
      if(!await keyForPlay(f.repo)){if(tok===playTok)say('Нужен пароль шифрования «'+f.repo+'», чтобы играла музыка',1);return}
      if(tok!==playTok)return;
    }
    const u=ready||await waitUrl(f,force);if(tok!==playTok)return;
    const rp=resume?PS[f.id]:0;au.src=u;cvEnsure(f,true);applySpd();if(rp>3)au.addEventListener('loadedmetadata',()=>{au.currentTime=rp},{once:true});
    if(LOADPLAY&&!HOLD)await stallP(au.play(),15000);
    failRun=0;RETRIED.delete(f.id);
    pfPlan();
  }catch(x){
    if(tok===playTok){
      if(x&&x.name==='AbortError'){}
      else if(!force&&x&&x.message==='Загрузка зависла'){
        const j=DLJ.get(f.id);if(j)try{j.cancel()}catch(e){}
        _pend.delete(f.id);setTimeout(()=>{if(tok===playTok)playAt(i,auto,resume,true)},300);
      }
      else if(x&&x.name==='NotAllowedError')say('Нажмите ▶, чтобы продолжить');
      else if(!force&&!/ключ|пароль|Отменено|Нет связи/i.test(String(err(x)))){
        /* временный сбой загрузки: один тихий повтор со свежей ссылкой на файл */
        const j=DLJ.get(f.id);if(j)try{j.cancel()}catch(e){}
        _pend.delete(f.id);await freshFid(f);setTimeout(()=>{if(tok===playTok)playAt(i,auto,resume,true)},300);
      }
      else{
        say('Не удалось воспроизвести: '+err(x),1);failRun++;
        if(auto&&failRun<3&&calcNext()>=0)setTimeout(()=>{if(tok===playTok)playAt(calcNext())},1500);
      }
    }
  }
  finally{if(tok===playTok){loadingTrack=false;setPlBtn();markPlaying();msState();pfRun();kickPlay(tok)}}
}
/* трек загрузился, а стоит на паузе, хотя пауза не нажималась: включаем ещё раз (несколько попыток подряд) */
function kickPlay(tok){
  const k=()=>{if(tok!==playTok||loadingTrack||HOLD||!LOADPLAY)return;if(au.paused&&au.src&&!au.ended)au.play().catch(()=>{})};
  setTimeout(k,300);setTimeout(k,1500);setTimeout(k,4000);
}
function startPlayer(id){try{shClose()}catch(e){}sv('tgmode','norm');{const f0=files.find(x=>x.id===id);if(f0)jonce('play',f0)}pq=audioList();SH={o:[],p:0,len:0};playAt(pq.findIndex(f=>f.id===id))}
let failRun=0;const RETRIED=new Map();
async function keyForPlay(r){
  if(KEYS[r]||!encOf(r))return true;
  if(document.visibilityState==='hidden')await new Promise(res=>{const h=()=>{if(document.visibilityState==='visible'){document.removeEventListener('visibilitychange',h);res()}};document.addEventListener('visibilitychange',h)});
  return ensureKey(r);
}
/* ---- подкачка: держим наготове следующие треки ----
   Пока играет текущий, в фоне по одному докачиваются следующие AHEAD штук (на диск устройства).
   Переключили трек — окно сдвигается и подкачка идёт дальше: так плейлист «тянется» впереди прослушивания. */
const AHEAD=3;let SH={o:[],p:0,len:0},PFQ=[],pfBusy=false;
const upcoming=(n=AHEAD)=>aheadIdx(pi,pq.length,SHUF,REPM,SH,n);
const aheadIds=()=>upcoming().map(k=>pq[k]&&pq[k].id).filter(Boolean);
const calcNext=()=>{const u=upcoming(1);return u.length?u[0]:-1};
function pfPlan(){
  if(pi<0||!pq.length)return;
  PFERR.clear();
  const want=upcoming().map(k=>pq[k]).filter(Boolean),keep=new Set([pq[pi].id,...want.map(f=>f.id)]);
  for(const j of DLJ.values())if(j.pre&&!keep.has(j.f.id))j.cancel();
  PFQ=want.filter(f=>cacheable(f)&&!C.has(f.id)&&!WARM.has(f.id));
  const nx=want[0];if(nx&&!C.has(nx.id)&&WARM.has(nx.id))urlOfD(nx).catch(()=>{});   /* следующий уже на диске — готовим ссылку заранее */
  pfRun();
}
let pfTimer=0;const PFERR=new Map();
const pfLater=ms=>{clearTimeout(pfTimer);pfTimer=setTimeout(pfRun,ms)};
async function pfRun(){
  if(pfBusy)return;pfBusy=true;
  try{
    while(PFQ.length){
      if(OFFLINE)break;
      if(!client||!BGS.ok){pfLater(3000);break}   /* соединение ещё поднимается: вернёмся к подкачке чуть позже, а не бросаем её */
      if(loadingTrack){await sleep(400);continue}   /* текущему треку канал нужнее */
      const f=PFQ.shift();
      if(C.has(f.id)||WARM.has(f.id))continue;
      try{
        if(await cHas(f.id))WARM.add(f.id);
        else{await dlRaw(f,true);WARM.add(f.id)}   /* скачанный трек теперь на диске: можно готовить ссылку заранее */
      }catch(e){
        /* неудачную подкачку пробуем ещё раз-другой, а не бросаем молча (иначе следующий трек не готов к концу текущего) */
        const n=(PFERR.get(f.id)||0)+1;PFERR.set(f.id,n);
        if(n<3&&!OFFLINE){PFQ.push(f);pfLater(3000*n);break}
        continue;
      }
      {const nk=calcNext(),nf=nk>=0&&pq[nk];if(nf&&nf.id===f.id&&!C.has(f.id)&&(WARM.has(f.id)))await urlOfD(f).catch(()=>{})}   /* ближайший следующий — сразу в готовность */
    }
  }finally{pfBusy=false}
}
const peekNext=()=>calcNext();
const peekPrev=()=>{if(SHUF&&pq.length>1){shSync(SH,pi,pq.length);return SH.p>0?SH.o[SH.p-1]:-1}return pi>0?pi-1:(REPM===1&&pq.length>1?pq.length-1:-1)};
const prevTrack=()=>{if(au.currentTime>3){au.currentTime=0;return}const k=peekPrev();if(k>=0)playAt(k);else au.currentTime=0};
const nextTrack=()=>{const k=peekNext();if(k>=0)playAt(k)};
$('#pbtn').onclick=()=>{
  expandPl();
  if(pi>=0&&pq.length){showPl(true);return}
  if(shWaveLast()){shResume(false);return}   /* последней играла «волна» (расширение): возвращаем её очередь и место, а не обычный плейлист */
  restoreLast(false);
};
function restoreLast(auto){
  try{shClose()}catch(e){}
  sv('tgmode','norm');
  const a=audioList(),lf=lastAud();
  let q=a,i=lf?a.findIndex(f=>f.id===lf.id):-1;
  if(lf&&i<0){q=files.filter(f=>f.repo===lf.repo&&f.path===lf.path&&isAud(f)).sort((x,y)=>x.no-y.no);i=q.findIndex(f=>f.id===lf.id)}
  if(i<0){q=a;i=0}
  if(!q.length){say('Нет музыки, которую можно запустить',1);return}
  pq=q;SH={o:[],p:0,len:0};showPl(true);playAt(i,auto,true);
}
$('#pplay').onclick=()=>{if(loadingTrack){if(Date.now()-loadT0>4000)retryTrack();return}if(au.paused)au.play().catch(()=>{});else{HOLD=true;au.pause()}};
$('#pprev').onclick=()=>{if(au.currentTime>3){au.currentTime=0;return}slideNav(-1)};$('#pnext').onclick=()=>slideNav(1);
$('#pclose').onclick=()=>{try{shClose()}catch(e){}au.pause();au.removeAttribute('src');au.load();pq=[];pi=-1;collapsePl();showPl(false);markPlaying()};
$('#pseek').addEventListener('input',()=>{seeking=true;$('#pcur').textContent=fmt(+$('#pseek').value)});
$('#pseek').addEventListener('change',()=>{au.currentTime=+$('#pseek').value;seeking=false});
TU.push(()=>{if(seeking)return;$('#pseek').max=au.duration||0;$('#pseek').value=au.currentTime;$('#pcur').textContent=fmt(au.currentTime)});
const seekFill=()=>{const e=$('#pseek'),m=+e.max||0;e.style.setProperty('--p',(m?e.value/m*100:0)+'%')};
$('#pseek').addEventListener('input',seekFill);TU.push(seekFill);
au.addEventListener('loadedmetadata',()=>{$('#pseek').max=au.duration||0;$('#pdur').textContent=fmt(au.duration);$('#pseek').value=au.currentTime;$('#pcur').textContent=fmt(au.currentTime);$('#ppi').style.width=(au.duration?au.currentTime/au.duration*100:0)+'%'});
function markPlaying(){
  const id=pi>=0&&pq[pi]&&!$('#pl').hidden?pq[pi].id:null;
  document.querySelectorAll('#list [data-o]').forEach(el=>el.classList.toggle('playing',id!==null&&+el.dataset.o===id));
  document.body.classList.toggle('playing-now',!au.paused);
}
/* ---- управление с наушников, шторки и экрана блокировки ----
   Раньше обработчики вешались один раз, метаданные появлялись только после успешного старта, а между треками
   состояние становилось «пауза» — система переставала слать кнопки наушников. Теперь: метаданные сразу,
   состояние «играет» держится на время загрузки трека, обработчики перевешиваются при каждом треке и при возврате в приложение. */
let HOLD=false,LOADPLAY=false;
const msState=()=>{try{if(MBG.on&&au.paused){navigator.mediaSession.playbackState='playing';return}navigator.mediaSession.playbackState=((loadingTrack&&LOADPLAY&&!HOLD)||!au.paused)?'playing':'paused'}catch(e){}};
function msMeta(f){try{if('mediaSession' in navigator){const cu=COV.get(f.id);navigator.mediaSession.metadata=new MediaMetadata({title:f.name.replace(/\.[^.]+$/,''),artist:CVA.get(f.id)||'Мой архив',album:'Облачко',artwork:cu?[{src:cu,sizes:'512x512',type:'image/jpeg'}]:[]})}}catch(e){}}
const msPos=()=>{try{if(MBG.on&&au.paused)return;if('mediaSession' in navigator&&au.duration>0&&isFinite(au.duration))navigator.mediaSession.setPositionState({duration:au.duration,playbackRate:au.playbackRate||1,position:Math.min(Math.max(0,au.currentTime),au.duration)})}catch(e){}};
async function msPlay(){
  if(loadingTrack){HOLD=false;LOADPLAY=true;msState();return}   /* нажали «play», пока трек грузится — начнёт играть сразу после загрузки */
  if(pi>=0&&pq[pi]&&au.src){try{await au.play()}catch(e){}return}
  if(shWaveLast()){try{shResume(true)}catch(e){}return}
  /* приложение только что открылось из шторки и ещё читает данные: ждём, а не молчим */
  if(!ready||!files.length){say('Запускаю музыку…');const t0=Date.now(),iv=setInterval(()=>{if(ready&&files.length){clearInterval(iv);restoreLast(true)}else if(Date.now()-t0>90000){clearInterval(iv);say('Не удалось запустить музыку: приложение не загрузилось',1)}},800);return}
  restoreLast(true);                                              /* плеер был закрыт или страница перезапущена — включаем последний трек */
}
function msPause(){HOLD=true;au.pause();msState()}
function bindMS(){
  if(!('mediaSession' in navigator)||MBG.on)return;
  const ms=navigator.mediaSession;
  for(const[a,h]of[['play',msPlay],['pause',msPause],['stop',msPause],['previoustrack',prevTrack],['nexttrack',nextTrack],
    ['seekbackward',d=>{au.currentTime=Math.max(0,au.currentTime-((d&&d.seekOffset)||10));msPos()}],
    ['seekforward',d=>{au.currentTime=Math.min(au.duration||1e9,au.currentTime+((d&&d.seekOffset)||10));msPos()}],
    ['seekto',d=>{if(d.fastSeek&&au.fastSeek)au.fastSeek(d.seekTime);else au.currentTime=d.seekTime;msPos()}]])
    try{ms.setActionHandler(a,h)}catch(e){}
}
bindMS();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){bindMS();msState();msPos()}});
au.addEventListener('seeked',msPos);au.addEventListener('ratechange',msPos);au.addEventListener('durationchange',msPos);
au.addEventListener('play',()=>{HOLD=false;setPlBtn();markPlaying();msState();msPos()});au.addEventListener('pause',()=>{setPlBtn();markPlaying();msState()});
TU.push(()=>{$('#ppi').style.width=(au.duration?au.currentTime/au.duration*100:0)+'%'});
au.addEventListener('error',()=>{
  if(loadingTrack||!au.src||pi<0)return;const f=pq[pi];if(!f)return;
  if(!RETRIED.get(f.id)){RETRIED.set(f.id,1);try{URL.revokeObjectURL(C.get(f.id))}catch(e){}C.delete(f.id);CSZ.delete(f.id);playAt(pi,true,true)}
  else{failRun++;if(failRun<3&&calcNext()>=0)playAt(calcNext());else say('Не удалось воспроизвести трек',1)}
});
TU.push(()=>{if(au.duration-au.currentTime<45){const k=calcNext(),n=k>=0&&pq[k];if(n&&!C.has(n.id)&&!_pend.has(n.id)&&(WARM.has(n.id)||!OFFLINE))urlOfD(n).catch(()=>{})}});
au.addEventListener('ended',()=>{if(pq[pi])delete PS[pq[pi].id];if(REPM===2){au.currentTime=0;au.play().catch(()=>{});return}{const k=calcNext();if(k>=0)playAt(k);else setPlBtn()}});
/* ---- «Случайный плеер»: кнопки в плеере и сохранение места (работает только при SHM.on) ---- */
$('#pdis').onclick=()=>{
  if(!SHM.on)return;const f=pq[pi];if(!f)return;
  const nk=calcNext(),nid=nk>=0&&nk!==pi&&pq[nk]?pq[nk].id:0;
  DIS.set(f.id,f.enc?'':String(f.name||'').slice(0,70));
  pq=pq.filter(x=>x.id!==f.id);pi=-1;SH={o:[],p:0,len:0};shSched('dis');shSched('que');say('Больше не попадётся');
  if(!pq.length){au.pause();return}
  const ni=nid?pq.findIndex(x=>x.id===nid):0;playAt(ni<0?0:ni);
};
$('#pre').onclick=()=>{
  if(!SHM.on)return;const cur=pq[pi],L=shPool();if(!L.length)return;
  const inL=cur&&L.find(x=>x.id===cur.id);
  let o=shBuild(L,inL||undefined).slice(0,600);
  if(cur&&!inL)o=[cur,...o];
  pq=o;pi=cur?0:-1;SH={o:[],p:0,len:0};pfPlan();shSched('que');say('Перемешано заново');
};
TU.push(()=>{if(SHM.on&&!au.paused&&!loadingTrack)shSavePos(false)});
au.addEventListener('pause',()=>{if(SHM.on&&!loadingTrack&&pq[pi]&&!au.ended)shSavePos(true)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){if(SHM.on)shSavePos(true)}else shInit().catch(()=>{})});
window.addEventListener('pagehide',()=>{if(SHM.on)shSavePos(true)});
/* ---- плеер на весь экран + эквалайзер ---- */
const eq=$('#eq'),ex=eq.getContext('2d'),NB=64;
let eb=new Array(NB).fill(.04),er=new Array(NB).fill(.5),en=new Array(NB).fill(.5),eraf=0,elt=0,eCol='#5fc3a6',eBg='#121a17';
function fitEq(){const r=window.devicePixelRatio||1;eq.width=Math.max(1,eq.clientWidth*r);eq.height=Math.max(1,eq.clientHeight*r)}
let eLast=0;
function eqLoop(t){
  if(!$('#pl').classList.contains('full')){eraf=0;return}
  if(document.hidden||t-eLast<30){eraf=requestAnimationFrame(eqLoop);return}eLast=t;
  if(t-elt>130){elt=t;for(let i=0;i<NB;i++)en[i]=Math.random()}
  const r=window.devicePixelRatio||1,W=eq.width,H=eq.height,on=!au.paused;
  const bw=Math.max(2*r,W/NB*.34),gap=(W-NB*bw)/(NB-1);
  ex.clearRect(0,0,W,H);ex.fillStyle=eCol;
  for(let i=0;i<NB;i++){
    er[i]+=(en[i]-er[i])*.12;
    const shape=.28+.72*Math.exp(-Math.pow((i-NB/2)/(NB*.26),2));
    const wave=.55+.45*Math.sin(t/520+i*.38)*Math.sin(t/910+i*.11);
    const tg=on?Math.max(.03,shape*wave*(.3+.7*er[i])):.025;
    eb[i]+=(tg-eb[i])*.16;
    const h=Math.max(bw,eb[i]*H*.62),x=i*(bw+gap),y=(H-h)/2;
    ex.globalAlpha=on?.45+.55*shape:.35;
    if(!on&&Math.abs(x+bw/2-W/2)<Math.min(W,H)*.2)continue;
    ex.beginPath();if(ex.roundRect)ex.roundRect(x,y,bw,h,bw/2);else ex.rect(x,y,bw,h);ex.fill();
  }
  if(!on){
    const cx=W/2,cy=H/2,q=Math.min(W,H)*.06;
    ex.globalAlpha=.9;ex.fillStyle=eCol;ex.beginPath();ex.moveTo(cx-q*.55,cy-q*.8);ex.lineTo(cx+q*.9,cy);ex.lineTo(cx-q*.55,cy+q*.8);ex.closePath();ex.fill();
  }
  ex.globalAlpha=1;
  eraf=requestAnimationFrame(eqLoop);
}
function startEq(){const cs=getComputedStyle(document.documentElement);eCol=cs.getPropertyValue('--acc').trim()||eCol;eBg=cs.getPropertyValue('--bg').trim()||eBg;requestAnimationFrame(()=>{fitEq();if(!eraf)eraf=requestAnimationFrame(eqLoop)})}
function stopEq(){if(eraf)cancelAnimationFrame(eraf);eraf=0}
function expandPl(){const el=$('#pl');if(el.classList.contains('full'))return;el.classList.add('full');el.style.transform='';el.style.transition='';startEq()}
function collapsePl(){const el=$('#pl');el.classList.remove('full');el.style.transform='';el.style.transition='';stopEq()}
$('#pcol').onclick=collapsePl;
$('#eq').onclick=()=>{if(loadingTrack){if(Date.now()-loadT0>4000)retryTrack();return}if(au.paused)au.play().catch(()=>{});else{HOLD=true;au.pause()}};
$('#pt').onclick=()=>{if(!$('#pl').classList.contains('full'))expandPl()};
window.addEventListener('resize',()=>{if($('#pl').classList.contains('full'))fitEq()});
/* свайп по названию в свёрнутом плеере: влево — следующий трек, вправо — предыдущий */
let miniGo=null;
{let sx=0,sy=0,sm='',sd=0,on=false,gd=0,gk=-1,v=0,lx=0,lt=0;
const pt=$('#pt'),pg=$('#ptg'),pw=$('#ptw'),GAP=28,W=()=>pw.clientWidth+GAP;
const showG=k=>{const cs=getComputedStyle(pt);pg.style.font=cs.font;pg.style.letterSpacing=cs.letterSpacing;pg.style.color=cs.color;pg.textContent=pq[k]?dispName(pq[k].name):'';pg.style.display='block'};
const hideG=()=>{pg.style.display='none';pg.style.transition='none'};
/* перекидывание: текущее название уезжает, соседнее заезжает на его место */
const commit=(dir,k)=>{sliding=true;const T='transform .24s ease',w=W();
  pt.style.transition=pg.style.transition=T;
  pt.style.transform=`translateX(${-dir*w}px)`;pg.style.transform='translateX(0)';
  setTimeout(()=>{playAt(k);pt.style.transition='none';pt.style.transform='';hideG();
    setTimeout(()=>{pt.style.transition='';sliding=false},40)},250)};
miniGo=(dir,k)=>{gd=dir;showG(k);pg.style.transition='none';pg.style.transform=`translateX(${dir*W()}px)`;void pg.offsetWidth;commit(dir,k)};
pt.addEventListener('touchstart',e=>{on=false;sm='';gd=0;gk=-1;if($('#pl').classList.contains('full')||sliding||pi<0)return;const t=e.touches[0];sx=lx=t.clientX;sy=t.clientY;lt=performance.now();v=0;sd=0;on=true;pt.style.transition='none'},{passive:true});
pt.addEventListener('touchmove',e=>{if(!on)return;const t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;
  if(!sm){if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.3)sm='h';else if(Math.abs(dy)>10){on=false;pt.style.transform='';return}else return}
  const now=performance.now();v=(t.clientX-lx)/Math.max(1,now-lt);lx=t.clientX;lt=now;
  sd=dx;const dir=dx<0?1:-1;
  if(gd!==dir){gd=dir;gk=dir>0?peekNext():peekPrev();if(gk>=0)showG(gk);else hideG()}
  const has=gk>=0;
  pt.style.transform=`translateX(${has?dx:dx*.3}px)`;
  if(has){pg.style.transition='none';pg.style.transform=`translateX(${dir>0?W()+dx:-W()+dx}px)`}
},{passive:true});
const fin=()=>{if(!on)return;on=false;const m=sm;sm='';
  if(m!=='h'){pt.style.transform='';return}
  const dir=sd<0?1:-1,fast=Math.abs(v)>.5&&Math.abs(sd)>20&&Math.sign(v)===Math.sign(sd);
  if(gk>=0&&gd===dir&&(Math.abs(sd)>60||fast)){commit(dir,gk);return}
  const T='transform .2s ease';pt.style.transition=T;pt.style.transform='';
  if(pg.style.display==='block'){pg.style.transition=T;pg.style.transform=`translateX(${gd>0?W():-W()}px)`;setTimeout(hideG,210)}
  setTimeout(()=>{pt.style.transition=''},220)};
pt.addEventListener('touchend',fin);pt.addEventListener('touchcancel',fin)}

let fY=null,fX=0,fd=0,fm='',gdir=0,gidx=-1,sliding=false,gh=null;
$('#pl').addEventListener('touchstart',e=>{
  fY=null;fm='';gdir=0;gidx=-1;if(sliding||!$('#pl').classList.contains('full')||e.target.closest('input,button'))return;
  const t=e.touches[0];fX=t.clientX;fY=t.clientY;fd=0;
},{passive:true});
$('#pl').addEventListener('touchmove',e=>{
  if(fY===null)return;
  const t=e.touches[0],dx=t.clientX-fX,dy=t.clientY-fY;
  if(!fm){
    if(dy>10&&dy>Math.abs(dx)*1.5){fm='v';$('#pl').style.transition='none'}
    else if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.5){fm='h';eq.style.transition='none';$('#pt').style.transition='none'}
    else return;
  }
  if(fm==='v'){fd=Math.max(0,dy);$('#pl').style.transform=`translateY(${fd}px)`}
  else{
    fd=dx;const dir=dx<0?1:-1,W=$('#pl').clientWidth;
    if(gdir!==dir){gdir=dir;gidx=dir>0?peekNext():peekPrev();if(gidx>=0)ghostFor(gidx);else if(gh)gh.style.display='none'}
    const has=gidx>=0;
    eq.style.transform=$('#pt').style.transform=`translateX(${has?dx:dx*.3}px)`;
    if(has&&gh){gh.style.transition='none';gh.style.transform=`translateX(${dir>0?W+dx:-W+dx}px)`}
  }
},{passive:true});
const fEnd=()=>{
  if(fY===null||!fm){fY=null;fm='';return}
  const m=fm;fY=null;fm='';
  if(m==='v'){
    const el=$('#pl');el.style.transition='transform .18s';
    if(fd>110){el.style.transform='translateY(100%)';setTimeout(collapsePl,170)}else el.style.transform='';
  }else{
    const W=$('#pl').clientWidth,thr=Math.max(70,W*.22);
    if(Math.abs(fd)>thr&&gidx>=0&&gdir===(fd<0?1:-1))commitSlide(gdir,gidx);
    else{if(fd>thr&&gidx<0)au.currentTime=0;snapSlide()}
  }
};
function ghostFor(idx){
  if(!gh){gh=document.createElement('div');gh.id='pgh';gh.innerHTML='<canvas></canvas><div class="gt"></div>';$('#pl').appendChild(gh)}
  const pr=$('#pl').getBoundingClientRect(),a=eq.getBoundingClientRect(),b=$('#pt').getBoundingClientRect(),c=gh.firstChild,t=gh.lastChild;
  c.width=eq.width;c.height=eq.height;
  c.style.cssText=`position:absolute;left:${a.left-pr.left}px;top:${a.top-pr.top}px;width:${a.width}px;height:${a.height}px`;
  try{c.getContext('2d').drawImage(eq,0,0)}catch(e){}
  t.style.cssText=`position:absolute;left:${b.left-pr.left}px;top:${b.top-pr.top}px;width:${b.width}px;height:${b.height}px`;
  t.textContent=pq[idx]?dispName(pq[idx].name):'';
  {const nu=pq[idx]&&COV.get(pq[idx].id);if(nu)c.style.cssText+=`;border-radius:30px;background:linear-gradient(rgba(4,14,12,.38),rgba(4,14,12,.58)),url("${nu}") center/cover no-repeat`}
  gh.style.display='block';
}
function snapSlide(){
  const T='transform .22s ease',W=$('#pl').clientWidth,p=$('#pt');
  eq.style.transition=p.style.transition=T;eq.style.transform=p.style.transform='';
  if(gh&&gh.style.display!=='none'){gh.style.transition=T;gh.style.transform=`translateX(${gdir>0?W:-W}px)`;setTimeout(()=>{gh.style.display='none'},230)}
  setTimeout(()=>{eq.style.transition=p.style.transition=''},240);
}
function commitSlide(dir,idx){
  sliding=true;
  const W=$('#pl').clientWidth,T='transform .24s ease',p=$('#pt');
  eq.style.transition=p.style.transition=T;eq.style.transform=p.style.transform=`translateX(${-dir*W}px)`;
  gh.style.transition=T;gh.style.transform='translateX(0)';
  setTimeout(()=>{
    playAt(idx);
    eq.style.transition=p.style.transition='none';eq.style.transform=p.style.transform='';
    gh.style.display='none';gh.style.transition='none';
    setTimeout(()=>{eq.style.transition=p.style.transition='';sliding=false},40);
  },250);
}
function slideNav(dir){
  const idx=dir>0?peekNext():peekPrev();
  if(idx<0){if(dir<0)au.currentTime=0;return}
  if(sliding||document.hidden){playAt(idx);return}
  if(!$('#pl').classList.contains('full')){if(miniGo)miniGo(dir,idx);else playAt(idx);return}
  gdir=dir;gidx=idx;ghostFor(idx);
  gh.style.transition='none';gh.style.transform=`translateX(${dir>0?$('#pl').clientWidth:-$('#pl').clientWidth}px)`;void gh.offsetWidth;
  commitSlide(dir,idx);
}
$('#pl').addEventListener('touchend',fEnd,{passive:true});
$('#pl').addEventListener('touchcancel',fEnd,{passive:true});
/* свёрнутый плеер: потяни вверх — откроется на весь экран */
let mY=null,mX=0,md=0,mOn=false;
$('#pl').addEventListener('touchstart',e=>{
  mY=null;if($('#pl').classList.contains('full')||e.target.closest('input'))return;
  const t=e.touches[0];mX=t.clientX;mY=t.clientY;md=0;mOn=false;
},{passive:true});
$('#pl').addEventListener('touchmove',e=>{
  if(mY===null)return;
  const t=e.touches[0],dx=t.clientX-mX,dy=t.clientY-mY;
  if(!mOn){if(dy<-8&&-dy>Math.abs(dx)*1.5){mOn=true;$('#pl').style.transition='none'}else return}
  md=Math.min(0,dy);$('#pl').style.transform=`translateY(${Math.max(md,-80)}px)`;
},{passive:true});
const mEnd=()=>{
  if(mY===null||!mOn){mY=null;return}
  mY=null;mOn=false;const el=$('#pl');
  if(md<-45){el.style.transform='';el.style.transition='';expandPl()}
  else{el.style.transition='transform .18s';el.style.transform=''}
};
$('#pl').addEventListener('touchend',mEnd,{passive:true});
$('#pl').addEventListener('touchcancel',mEnd,{passive:true});
$('#crumbs').onclick=go;
$('#q').oninput=render;
$('#vmode').onclick=()=>{P.view=P.view==='grid'?'list':'grid';sv('tgmp',P);render()};
const openDrawer=()=>{const dp=$('#dp');dp.style.transform='';dp.style.transition='';dp.classList.add('anim');$('#drawer').hidden=false};
const closeDrawer=()=>{$('#drawer').hidden=true;$('#q').blur()};
$('#hb').onclick=openDrawer;
let swiped=false,oX=null,oY=0,od=0,oOn=false;
/* у левого края экрана свайп вправо — это системный жест «назад»: шторку оттуда не открываем, чтобы они не дрались */
const EDGE=32;
document.addEventListener('touchstart',e=>{
  oX=null;
  if($('#app').hidden||!$('#drawer').hidden||!$('#vw').hidden||!$('#pick').hidden||selMode||$('#pl').classList.contains('full'))return;
  if(e.touches.length!==1||e.target.closest('#crumbs,#sortm,#fltm,#pl,input,select'))return;
  const t=e.touches[0];if(t.clientX<EDGE)return;oX=t.clientX;oY=t.clientY;od=0;oOn=false;
},{passive:true});
document.addEventListener('touchmove',e=>{
  if(oX===null)return;
  const t=e.touches[0],dx=t.clientX-oX,dy=t.clientY-oY;
  if(!oOn){
    if(dx>14&&dx>Math.abs(dy)*1.5){oOn=true;const dp=$('#dp');dp.classList.remove('anim');dp.style.transition='none';dp.style.transform='translateX(-100%)';$('#drawer').hidden=false}
    else{if(Math.abs(dy)>14)oX=null;return}
  }
  od=dx;const W=$('#dp').offsetWidth;$('#dp').style.transform=`translateX(${Math.min(0,-W+dx)}px)`;
},{passive:true});
const endOpen=()=>{
  if(oX===null||!oOn){oX=null;return}
  oX=null;oOn=false;
  const dp=$('#dp'),W=dp.offsetWidth;dp.style.transition='transform .18s';
  swiped=true;setTimeout(()=>{swiped=false},350);
  if(od>W*0.35){dp.style.transform='translateX(0)';setTimeout(()=>{dp.style.transition='';dp.style.transform=''},190)}
  else{dp.style.transform='translateX(-100%)';setTimeout(()=>{$('#drawer').hidden=true;dp.style.transform='';dp.style.transition=''},190)}
};
document.addEventListener('touchend',endOpen,{passive:true});
document.addEventListener('touchcancel',endOpen,{passive:true});
let dX=null,dY=0,dd=0;
$('#drawer').addEventListener('touchstart',e=>{const t=e.touches[0];dX=t.clientX;dY=t.clientY;dd=0;$('#dp').style.transition='none'},{passive:true});
$('#drawer').addEventListener('touchmove',e=>{
  if(dX===null)return;
  const t=e.touches[0],dx=t.clientX-dX,dy=t.clientY-dY;
  if(dd===0&&Math.abs(dy)>Math.abs(dx))return;
  dd=Math.min(0,dx);$('#dp').style.transform=`translateX(${dd}px)`;
},{passive:true});
$('#drawer').addEventListener('touchend',()=>{
  if(dX===null)return;dX=null;
  const dp=$('#dp');dp.style.transition='transform .18s';
  if(dd<-60){dp.style.transform='translateX(-100%)';setTimeout(closeDrawer,170)}
  else dp.style.transform='';
},{passive:true});
$('#drawer').onclick=e=>{if(e.target.id==='drawer'||(e.target.closest('#dp button')&&!e.target.closest('.rdots,#rsw')))closeDrawer()};
$('#q').addEventListener('keydown',e=>{if(e.key==='Enter')closeDrawer()});
$('#sqx').onclick=()=>{$('#q').value='';render()};
function drawSortMenu(){
  $('#sortm').innerHTML=[['new','Сначала новые'],['old','Сначала старые'],['name','По названию'],['my','Мой порядок']].map(([k,t])=>`<button data-s="${k}">${k===P.sort?icon('check'):'<i class="i"></i>'}${t}</button>`).join('');
}
$('#sortb').onclick=e=>{e.stopPropagation();$('#fltm').hidden=true;$('#sortm').hidden=!$('#sortm').hidden};
$('#sortm').onclick=e=>{const b=e.target.closest('[data-s]');if(!b)return;P.sort=b.dataset.s;sv('tgmp',P);$('#sortm').hidden=true;render()};
document.addEventListener('click',e=>{if(!e.target.closest('#sortm,#sortb'))$('#sortm').hidden=true});
async function newFolder(){
  if(roDeny(R()))return;
  const n=clean(await uiPrompt('Название новой папки')||'');
  if(!n)return;
  const p=cur?cur+'/'+n:n;
  if(allPaths().includes(p)){cur=p;render();return}
  ulog(`Создаю папку: ${p}`);
  const send=()=>withChat(()=>client.sendMessage(S.chat,(R()?RP+R()+'\n':'')+FP+p));
  try{
    let r;
    try{r=await send()}
    catch(x){
      if(!NET.test(err(x)))throw x;
      /* связь могла оборваться, пока приложение лежало в фоне: переподключаемся и пробуем ещё раз */
      ulog(`Папка: нет связи (${err(x)}), переподключаюсь`);
      try{await client.connect()}catch(e){}
      await sleep(800);r=await send();
    }
    folders.push({id:r.id,path:p,repo:R()});jlog('fo+',(R()||'Облако')+' / '+p);cur=p;render();saveIndex();ulog('✔ Папка создана');say('Папка создана: '+p);
  }catch(x){ulog(`✖ Папку не создал: ${err(x)}`);say('Не удалось создать папку: '+err(x),1)}
}
$('#delf').onclick=async()=>{
  const r=R(),t=cur;if(!t)return;if(roDeny(r))return;
  const fl=files.filter(f=>f.repo===r&&inTree(f.path,t)),mk=folders.filter(x=>x.repo===r&&inTree(x.path,t)),lk=locks.filter(l=>l.r===r&&l.p&&inTree(l.p,t)),od=ORD.filter(x=>x.r===r&&x.p&&inTree(x.p,t));
  for(const l of lk){if(!await unlock(r,l.p))return}
  const sub=allPaths(r).filter(x=>x!==t&&inTree(x,t)).length;
  const msg=fl.length?`В папке «${t}» файлов: ${fl.length}`+(sub?`, вложенных папок: ${sub}`:'')+`. Удалить папку вместе со всеми файлами навсегда? Отменить это нельзя.`:`Удалить пустую папку «${t}»?`;
  if(!confirm(msg))return;
  const meta=[...mk,...lk].map(x=>x.id),ords=od.flatMap(x=>x.mids||[]).filter(Boolean),fids=fl.map(f=>f.id),done=new Set();let e0=null;
  try{
    /* сначала файлы, потом служебные сообщения папки: если оборвётся связь, папка останется и её можно удалить повторно */
    for(let i=0;i<fids.length;i+=100){
      say(`Удаляю ${Math.min(i+100,fids.length)} из ${fids.length}…`);
      const part=fids.slice(i,i+100);await withChat(()=>client.deleteMessages(S.chat,part));part.forEach(x=>done.add(x));
    }
    const rest=[...meta,...ords];
    for(let i=0;i<rest.length;i+=100){const part=rest.slice(i,i+100);await withChat(()=>client.deleteMessages(S.chat,part))}
  }catch(x){e0=x}
  files=files.filter(f=>!done.has(f.id));done.forEach(i=>C.delete(i));
  if(e0){say(`Удалено файлов ${done.size} из ${fids.length}, папка осталась: `+err(e0),1);render();return}
  folders=folders.filter(x=>!mk.includes(x));locks=locks.filter(l=>!lk.includes(l));ORD=ORD.filter(x=>!od.includes(x));
  jlog('fo-',(r||'Облако')+' / '+t+(fids.length?' (файлов: '+fids.length+')':''));
  cur=parentPath(t);render();try{saveIndex()}catch(x){}
  say(fids.length?`Папка удалена вместе с файлами (${fids.length})`:'Папка удалена');
};
$('#fab').onclick=e=>{e.stopPropagation();const m=$('#fabm');m.hidden=!m.hidden;$('#fab').classList.toggle('open',!m.hidden)};
const fabClose=()=>{$('#fabm').hidden=true;$('#fab').classList.remove('open')};
$('#fabf').onclick=()=>{fabClose();$('#fi').click()};
$('#fabd').onclick=()=>{fabClose();newFolder()};
document.addEventListener('click',e=>{if(!e.target.closest('#fabm,#fab'))fabClose()});
$('#rf').onclick=async()=>{try{if(OFFLINE){OFFLINE=false;try{await connectRetry()}catch(e){OFFLINE=true;throw e}document.body.classList.remove('off');say('Связь восстановлена')}await refresh();render()}catch(x){say(err(x),1)}};


