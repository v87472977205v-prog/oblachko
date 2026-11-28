/* ===== ФАЙЛ расширение-твоя-волна.js =====
   
   Расширение «Случайный плеер» («Твоя волна»).
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- Расширение «Случайный плеер» («Твоя волна») ----
   Выбираешь одно или несколько мест (репозитории и папки, в том числе чужие), все аудио из них (с вложенными папками)
   перемешиваются так, чтобы исполнители не шли подряд и не повторялись близко. Работает только пока играет очередь
   этого расширения (SHM.on): кнопки «Не нравится» и «Ещё раз» в плеере появляются только тогда, обычный плеер не затронут.
   Очередь, место в треке, выбранные места и дизлайки хранятся в чате (префикс SHW) отдельно для каждого пользователя
   и подхватываются с любого устройства. Закрытые паролем папки без пароля пропускаются. ---- */
const SHW='🎧 ';
let SPS=[],DIS=new Map();
const SHF={places:[]};
const SHM={on:false,ini:0,busy:0,chk:0,q:Promise.resolve(),lw:0,t:0,posId:0,hid:[],que:[],c:{},tm:{},skip:false,pos:null,noEdit:false};
const SHDEV=(()=>{let d=ld('tgdev','');if(!d||typeof d!=='string'){d=Math.random().toString(36).slice(2,10);sv('tgdev',d)}return d})();
const shufAud=f=>isAud(f)||/\.(mp4|m4v)$/i.test(f.name||'');
const shufIn=(path,p)=>p===''||inTree(path||'',p);
const shufAllCount=(r,p)=>files.filter(f=>f.repo===r&&shufIn(f.path,p)&&shufAud(f)&&!DIS.has(f.id)).length;
const shufAbove=(lp,p)=>lp===''||inTree(p,lp);
const shufLocks=(r,p)=>locks.filter(l=>l.r===r&&!UN.has(r+'\n'+l.p)&&(shufAbove(l.p,p)||shufIn(l.p,p))).sort((a,b)=>a.p.length-b.p.length);
const shOnAvail=()=>extMine().some(e=>e.id==='shuf');
/* треки всех выбранных мест: без дублей, без закрытых паролем и без дизлайков */
const shPool=()=>{const m=new Map();for(const pl of SHF.places)for(const f of files)if(f.repo===pl.r&&shufIn(f.path,pl.p)&&shufAud(f)&&!isLocked(f.repo,f.path)&&!DIS.has(f.id))m.set(f.id,f);return[...m.values()]};
/* исполнитель: из названия «Исполнитель - Трек», иначе из тегов, иначе папка; у первого из «feat./&/,» */
function shArt(f){
  let a=artistOf(f);
  if(!a){try{const t=CVA.get(f.id);if(t)a=String(t).trim().toLowerCase()}catch(e){}}
  if(a)return a.replace(/ё/g,'е').split(/\s+(?:feat\.?|ft\.?|при уч\.?|x|×|&)\s+|\s*[,;]\s*/i)[0].trim();
  return f.path?'д:'+base(f.path).toLowerCase():'';
}
/* Очередь: исполнитель не повторяется, пока не прошли ещё W других; чаще берём тех, у кого больше треков; соседние папки тоже чередуем */
function shBuild(tr,first){
  const gs=new Map(),keyOf=f=>shArt(f)||('#'+f.id);
  for(const f of tr){const k=keyOf(f);if(!gs.has(k))gs.set(k,[]);gs.get(k).push(f)}
  for(const a of gs.values())for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  const out=[],rec=[],W=Math.min(8,Math.max(0,gs.size-1));let left=tr.length,last=null;
  const dirOf=f=>f?f.repo+'\n'+f.path:null;
  if(first){const a=gs.get(keyOf(first));const i=a?a.indexOf(first):-1;if(i>=0){a.splice(i,1);out.push(first);left--;rec.push(keyOf(first));last=dirOf(first)}}
  while(left>0){
    const all=[...gs.keys()].filter(k=>gs.get(k).length);
    const mx=Math.max(...all.map(k=>gs.get(k).length)),wd=Math.max(1,Math.min(W,Math.floor(left/mx)-1)),rw=rec.slice(-wd);
    let c=all.filter(k=>!rw.includes(k));
    if(!c.length)c=all.filter(k=>k!==rec[rec.length-1]);
    if(!c.length)c=all;
    let sum=0;const w=c.map(k=>{const a=gs.get(k),x=a.length*a.length*(dirOf(a[a.length-1])===last?.35:1);sum+=x;return x});
    let r=Math.random()*sum,pick=c[c.length-1];
    for(let i=0;i<c.length;i++){r-=w[i];if(r<=0){pick=c[i];break}}
    const f=gs.get(pick).pop();out.push(f);left--;last=dirOf(f);rec.push(pick);if(rec.length>W)rec.shift();
  }
  return out;
}
/* ---- хранение в чате ---- */
const shCache=()=>sv('tgshm',{u:jwho(),pos:SHM.pos,...SHM.c});
function shGet(k){
  if(k==='sel')return{pl:SHF.places.map(x=>[x.r,x.p])};
  if(k==='dis')return{l:[...DIS].map(([id,n])=>[id,n])};
  return{q:[...pq.map(f=>f.id),...SHM.hid].map(i=>i.toString(36)).join(',')};
}
function shSched(k){
  const v=Date.now(),d=shGet(k);SHM.c[k]={v,d};shCache();
  clearTimeout(SHM.tm[k]);
  SHM.tm[k]=setTimeout(()=>{SHM.q=SHM.q.then(()=>shPutDoc(k,v,d)).catch(()=>{})},k==='que'?1500:4000);
}
async function shPutDoc(k,v,d){
  if(OFFLINE||!client||!S.chat)return;
  const u=jwho(),s=JSON.stringify(d),parts=[];
  for(let i=0;i<s.length;i+=2800)parts.push(s.slice(i,i+2800));if(!parts.length)parts.push('');
  const old=SPS.filter(x=>x.u===u&&x.k===k).map(x=>x.id),add=[];
  for(let i=0;i<parts.length;i++){
    const rec={u,k,v,p:i,n:parts.length,s:parts[i]};
    const m=await withChat(()=>client.sendMessage(S.chat,SHW+JSON.stringify(rec)));
    add.push({id:m.id,...rec,d:null});
  }
  SPS=SPS.filter(x=>!old.includes(x.id)).concat(add);
  if(old.length)try{await withChat(()=>client.deleteMessages(S.chat,old))}catch(e){}
}
function shDocs(){
  const u=jwho(),by={},out={};
  for(const x of SPS)if(x.u===u&&x.k!=='pos'){((by[x.k]=by[x.k]||{})[x.v]=by[x.k][x.v]||[]).push(x)}
  for(const k in by){
    for(const v of Object.keys(by[k]).map(Number).sort((a,b)=>b-a)){
      const ps=by[k][v],n=ps[0].n;
      if(new Set(ps.map(p=>p.p)).size===n&&ps.every(p=>p.p<n)){
        ps.sort((a,b)=>a.p-b.p);
        try{const seen=new Set(),s=ps.filter(p=>!seen.has(p.p)&&seen.add(p.p)).map(p=>p.s).join('');out[k]={v,d:JSON.parse(s)};break}catch(e){}
      }
    }
  }
  return out;
}
/* место в треке: одно сообщение на пользователя, правится на месте (при ошибке — новое, старое удаляется) */
function shSavePos(force,s,a=1){
  if(!SHM.on&&a)return;const f=pq[pi];if(!f)return;
  const now=Date.now();if(!force&&now-SHM.lw<(SHM.noEdit?90000:30000))return;
  SHM.lw=now;
  const cur=typeof s==='number'?s:(isFinite(au.currentTime)?au.currentTime:0);
  const d={a,id:f.id,s:Math.floor(cur),t:now,dv:SHDEV};
  SHM.pos=d;SHM.t=now;shCache();
  SHM.q=SHM.q.then(()=>shWritePos(d)).catch(()=>{});
}
async function shWritePos(d){
  if(OFFLINE||!client||!S.chat||U.on||MUS.busy)return;
  const u=jwho(),txt=SHW+JSON.stringify({u,k:'pos',d});
  const mine=SPS.filter(x=>x.u===u&&x.k==='pos').sort((a,b)=>((b.d&&b.d.t)||0)-((a.d&&a.d.t)||0));
  const id=(SHM.posId&&mine.some(x=>x.id===SHM.posId))?SHM.posId:(mine[0]&&mine[0].id);
  if(id&&!SHM.noEdit){
    try{await withChat(()=>client.editMessageText(S.chat,id,txt));const r=SPS.find(x=>x.id===id);if(r)r.d=d;SHM.posId=id;return}
    catch(e){const m=err(e);if(/not modified/i.test(m))return;if(/not a function|undefined/i.test(m))SHM.noEdit=true}
  }
  const m=await withChat(()=>client.sendMessage(S.chat,txt));
  const dead=mine.map(x=>x.id);
  SPS=SPS.filter(x=>!dead.includes(x.id)).concat([{id:m.id,u,k:'pos',v:0,p:0,n:1,s:'',d}]);SHM.posId=m.id;
  if(dead.length)try{await withChat(()=>client.deleteMessages(S.chat,dead))}catch(e){}
}
async function shFetchPos(){
  const u=jwho(),recs=SPS.filter(x=>x.u===u&&x.k==='pos');let best=null;
  const cand=x=>{if(x&&x.t&&x.id&&(!best||x.t>best.t))best=x};
  for(const r of recs)cand(r.d);
  if(recs.length&&!OFFLINE&&client&&typeof client.getMessages==='function'){
    try{
      const b=await withChat(()=>client.getMessages(S.chat,recs.map(r=>r.id)));
      for(const m of b||[]){const t=m&&m.text;if(typeof t==='string'&&t.startsWith(SHW)){try{const j=JSON.parse(t.slice(SHW.length));if(j&&j.u===u&&j.k==='pos'&&j.d){cand(j.d);const r=recs.find(x=>x.id===m.id);if(r)r.d=j.d}}catch(e){}}}
    }catch(e){}
  }
  const l=ld('tgshm',{});if(l.u===u)cand(l.pos);
  return best;
}
function shLoad(){
  const loc=ld('tgshm',{}),mine=loc.u===jwho()?loc:{},rem=shDocs();
  const g=k=>{const a=rem[k],b=mine[k];return a&&(!b||a.v>=b.v)?a:b};
  for(const k of['sel','dis','que']){const x=g(k);if(x)SHM.c[k]=x}
  const s=SHM.c.sel,d=SHM.c.dis,q=SHM.c.que;
  if(s&&s.d&&Array.isArray(s.d.pl))SHF.places=s.d.pl.map(x=>({r:String(x[0]||''),p:String(x[1]||'')}));
  if(d&&d.d&&Array.isArray(d.d.l))DIS=new Map(d.d.l.map(x=>[+x[0],String(x[1]||'')]));
  SHM.que=q&&q.d&&q.d.q?String(q.d.q).split(',').filter(Boolean).map(x=>parseInt(x,36)).filter(Boolean):[];
}
/* собрать очередь из сохранённого и включить с нужного места */
function shApply(pos,auto){
  const byId=new Map(files.map(f=>[f.id,f])),list=[],hid=[];
  for(const id of SHM.que){
    const f=byId.get(id);
    if(f&&shufAud(f)&&!isLocked(f.repo,f.path)&&!DIS.has(id))list.push(f);
    else if(f&&!DIS.has(id))hid.push(id);
  }
  if(!list.length)return false;
  let i=pos?list.findIndex(f=>f.id===pos.id):-1,s=i>=0?pos.s:0;if(i<0)i=0;
  SHM.on=true;SHM.hid=hid;pq=list;SHUF=false;REPM=1;SH={o:[],p:0,len:0};
  if(s>3){PS[list[i].id]=s;sv('tgpos',PS)}
  drawPl4();shmUi();sv('tgmode','wave');SHM.skip=!!pos;if(pos)SHM.t=pos.t;
  showPl(true);playAt(i,!!auto,true);
  return true;
}
async function shInit(){
  if(SHM.busy||!files.length)return;
  if(!shOnAvail()){if(SHM.on)shOff();return}
  if(SHM.ini&&Date.now()-SHM.chk<15000)return;
  SHM.chk=Date.now();SHM.busy=1;
  try{
    const first=!SHM.ini;SHM.ini=1;
    shLoad();
    const pos=await shFetchPos();
    try{$('#pbtn').hidden=!(audioList().length||pi>=0||lastAud()||shSaved())}catch(e){}
    if(!pos||!SHM.que.length)return;
    if(first){if(pos.a===1&&pi<0&&!pq.length)shApply(pos,false);else SHM.t=Math.max(SHM.t,pos.t)}
    else if(au.paused&&pos.dv!==SHDEV&&pos.t>SHM.t&&pos.a===1&&(SHM.on||pi<0))shApply(pos,false);
  }finally{SHM.busy=0}
}
const shmUi=()=>document.body.classList.toggle('shm',!!SHM.on);
function shOff(){SHM.on=false;shmUi()}
function shClose(){if(SHM.on){try{shSavePos(true,undefined,0)}catch(e){}}shOff()}
/* ---- экран расширения ---- */
const shNameOf=(id,n)=>{const f=files.find(x=>x.id===id);return(f&&!f.enc&&f.name)?dispName(f.name):(n||'Трек (название скрыто)')};
const SHV2={r:null,oth:false,open:new Set()};
const shCovered=(r,p)=>SHF.places.some(x=>x.r===r&&(x.p===''||inTree(p,x.p)));
const shExact=(r,p)=>SHF.places.some(x=>x.r===r&&x.p===p);
function shRepoCounts(r){
  const m=new Map();
  for(const f of files){if(f.repo!==r||!shufAud(f))continue;m.set('',(m.get('')||0)+1);let a='';for(const sg of(f.path||'').split('/')){if(!sg)continue;a=a?a+'/'+sg:sg;m.set(a,(m.get(a)||0)+1)}}
  return m;
}
const shPlaceNote=pl=>{
  if(pl.r&&encOn(pl.r)&&!KEYS[pl.r])return 'нужен пароль шифрования';
  if(isLocked(pl.r,pl.p))return 'запаролено';
  return '';
};
/* главный экран */
function shufPaint(){
  SHV2.r=null;
  const pool=shPool(),n=pool.length,arts=new Set(pool.map(f=>shArt(f)||f.id)).size;
  const pos=SHM.pos||ld('tgshm',{}).pos,hasQ=!!(SHM.c.que&&SHM.c.que.d&&SHM.c.que.d.q);
  let res='';
  if(hasQ&&pos&&pos.id&&!SHM.on){
    const pf=files.find(x=>x.id===pos.id),nm=pf&&shufAud(pf)?dispName(pf.name):'Сохранённая очередь';
    res=`<button class="swres" id="shfcont"><span class="swplay">${icon('play')}</span><span class="swt"><span class="swn1">Продолжить</span><span class="swn2">${esc(nm)}${pos.s>3?' · с '+fmt(pos.s):''}</span></span></button>`;
  }
  const rows=SHF.places.map((pl,i)=>{
    const note=shPlaceNote(pl),c=shufAllCount(pl.r,pl.p);
    return `<div class="swr"><span class="swi">${icon(pl.p?'folder':(pl.r?'repo':'cloud'))}</span><div class="swt"><div class="swn1">${esc(pl.p?base(pl.p):(pl.r||'Облако'))}</div><div class="swn2">${esc(kpName(pl.r,pl.p))} · ${note?esc(note):stPl(c,['трек','трека','треков'])}</div></div><button class="swx" data-shx="${i}" aria-label="Убрать место">${icon('close')}</button></div>`;
  }).join('');
  const dis=[...DIS].map(([id,nm])=>`<div class="swr"><div class="swt"><div class="swn1">${esc(shNameOf(id,nm))}</div></div><button class="swundo" data-shu="${id}">Вернуть</button></div>`).join('');
  const info=!SHF.places.length?'Выберите одно или несколько мест. Можно брать папки из разных репозиториев, в том числе чужих.':(n?stPl(n,['трек','трека','треков'])+' · исполнителей: '+arts:'Пароли спросим при запуске');
  $('#admb').innerHTML=`<div class="sw">${res}
    <section class="swc"><div class="swh"><span>Откуда играть</span></div>${rows||''}
      <button class="swb line" id="shfadd">${icon('branch')}Все репозитории</button></section>
    <div class="swn2 swinfo">${info}</div>
    <button class="swgo" id="shfgo" ${SHF.places.length?'':'disabled'}>${icon('shuffle')}Перемешать и играть</button>
    <details class="swc"><summary>Дизлайки <b>${DIS.size}</b></summary>${dis||'<div class="swn2" style="padding:8px 2px">Пока пусто. Кнопка «Не нравится» есть в полном плеере.</div>'}</details>
  </div>`;
}
/* выбор мест: репозитории → папки с галочками */
/* дерево репозиториев: облако — основание, пользователи — ветви, репозитории — листья */
/* все пользователи и их репозитории по группам (то же правило, что у списка меню при «Все пользователи»: скрыто только закрытое лично для вас в консоли): «Мои», «Владелец», затем остальные; у пользователя без доступных репозиториев ветка пустая */
function shTreeGroups(){
  const vis=repos.filter(x=>!repoBlocked(x.name)),mine=vis.filter(mineRepo).map(x=>x.name);
  const G=[{n:'Мои',i:'Я',r:mine}];
  const lab=x=>(x.owner&&x.owner!==S.guestUser)?x.owner:(!x.guest?'Владелец':'Гость'),oth=vis.filter(x=>!mineRepo(x)),map=new Map();
  const add=n=>{if(!map.has(n))map.set(n,[])};
  if(S.viewer)add('Владелец');
  for(const u of users)if(!(S.viewer&&u.u===S.guestUser))add(u.u);
  for(const x of oth){add(lab(x));map.get(lab(x)).push(x.name)}
  const names=[...map.keys()].sort((a,b)=>(b==='Владелец')-(a==='Владелец')||a.localeCompare(b,'ru'));
  for(const nm of names)G.push({n:nm,i:(nm.trim().charAt(0)||'?').toUpperCase(),r:map.get(nm)});
  return G;
}
function shTreeSvg(attr='data-swrepo',isOn){
  const G=shTreeGroups();
  const W=360,CX=180;let hs=G.map(g=>g.r.length?Math.max(88,g.r.length*40+22):80),sum=hs.reduce((a,b)=>a+b,0);
  const avail=520-84-130;if(sum<avail){const ex=(avail-sum)/G.length;hs=hs.map(v=>v+ex);sum=avail}
  const H=84+sum+130;
  const baseY=H-92,topY=H-130-sum-26,cut=(s,n)=>s.length>n?s.slice(0,n-1)+'…':s,sel=isOn||(r=>SHF.places.some(x=>x.r===r));
  let br='',nd='',y=H-130;
  G.forEach((g,gi)=>{
    const h=hs[gi],cy=y-h/2,side=gi%2?1:-1,nx=CX+side*36;y-=h;
    const dl=(gi*.14).toFixed(2),n=g.r.length;
    br+=`<path class="br bb${n?'':' gh'}" pathLength="1" style="animation-delay:${dl}s" d="M${CX} ${cy+30} C${CX} ${cy+6} ${CX+side*10} ${cy} ${nx-side*20} ${cy}"/>`;
    nd+=`<g class="swnode${n?'':' gh'}" style="animation-delay:${dl}s"><circle class="nd0" cx="${nx}" cy="${cy}" r="25"/><circle class="nd" cx="${nx}" cy="${cy}" r="20"/><text class="ni" x="${nx}" y="${cy}">${esc(g.i)}</text><text class="lb" x="${nx}" y="${cy+36}">${esc(cut(g.n,10))}</text>${n?'':`<text class="lb lb2" x="${nx}" y="${cy+49}">пусто</text>`}</g>`;
    g.r.forEach((name,k)=>{
      const ly=cy+(k-(n-1)/2)*40,lx=side>0?260:4,sx=nx+side*20,ex=side>0?lx:lx+96,dx=Math.max(6,Math.abs(ex-sx)*.5),d2=(gi*.14+.18+k*.06).toFixed(2),en=encOn(name);
      br+=`<path class="br tw" pathLength="1" style="animation-delay:${d2}s" d="M${sx} ${cy} C${sx+side*dx} ${cy} ${ex-side*dx} ${ly} ${ex} ${ly}"/>`;
      nd+=`<g class="leaf${sel(name)?' on':''}" ${attr}="${esc(name)}" style="animation-delay:${d2}s" role="button"><title>${esc(name)}</title><rect x="${lx}" y="${ly-16}" width="96" height="32" rx="16"/><text class="lt" x="${lx+(en?40:48)}" y="${ly}">${esc(cut(name,en?9:11))}</text>${en?`<path class="lk" transform="translate(${lx+77} ${ly-6.5}) scale(.54)" d="${IC.lock}"/>`:''}</g>`;
    });
  });
  const ok=!repoBlocked(''),cy0=H-52,tw=(yy)=>2.4+6.6*(yy-topY)/(baseY-topY);
  const trunk=`M${CX-9} ${baseY} C${CX-8} ${baseY-(baseY-topY)*.35} ${CX-3.4} ${baseY-(baseY-topY)*.7} ${CX-2.4} ${topY} L${CX+2.4} ${topY} C${CX+3.4} ${baseY-(baseY-topY)*.7} ${CX+8} ${baseY-(baseY-topY)*.35} ${CX+9} ${baseY} Z`;
  const roots=`<path class="br rt" pathLength="1" d="M${CX-7} ${baseY-4} C${CX-14} ${baseY+6} ${CX-30} ${baseY+6} ${CX-44} ${baseY+16}"/><path class="br rt" pathLength="1" d="M${CX+7} ${baseY-4} C${CX+14} ${baseY+6} ${CX+30} ${baseY+6} ${CX+44} ${baseY+16}"/>`;
  const sp=[[-38,-30,1.8],[34,-40,1.5],[-12,-58,1.3],[18,-22,1.6],[-30,-8,1.2],[44,-12,1.3]].map(([a,b,r],i)=>`<circle class="sp" style="animation-delay:${(i*.4).toFixed(1)}s" cx="${CX+a}" cy="${topY+b+18}" r="${r}"/>`).join('');
  const crown=`<circle cx="${CX}" cy="${topY+4}" r="52" fill="url(#swcg)"/><circle cx="${CX-26}" cy="${topY+24}" r="32" fill="url(#swcg)"/><circle cx="${CX+28}" cy="${topY+18}" r="30" fill="url(#swcg)"/>${sp}<circle class="crown" cx="${CX}" cy="${topY}" r="5.5"/>`;
  const base=`<g class="cl"${ok?` ${attr}="" role="button"`:''}><circle class="cbg0" cx="${CX}" cy="${cy0}" r="39"/><circle class="cbg${sel('')?' on':''}" cx="${CX}" cy="${cy0}" r="31"/><path class="cic" transform="translate(${CX-14} ${cy0-14}) scale(1.17)" d="${IC.cloud}"/><text class="lb" x="${CX}" y="${H-4}">Облако</text></g>`;
  const defs=`<defs><linearGradient id="swtg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" style="stop-color:var(--acc);stop-opacity:.8"/><stop offset="1" style="stop-color:var(--acc);stop-opacity:.18"/></linearGradient><radialGradient id="swcg"><stop offset="0" style="stop-color:var(--acc);stop-opacity:.2"/><stop offset="1" style="stop-color:var(--acc);stop-opacity:0"/></radialGradient></defs>`;
  return `<svg class="swtree" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${defs}${crown}${roots}<path class="trunk" d="${trunk}" fill="url(#swtg)"/><path class="br hl" pathLength="1" d="M${CX-1.2} ${baseY} L${CX-.6} ${topY+6}"/>${br}${nd}${base}</svg>`;
}
function shPickPaint(){
  const inRepo=SHV2.r!==null,oth=kpOthers();
  let h=`<div class="sw"><div class="swtop"><button class="swb ghost" data-swback>${icon('back')}${inRepo?'Дерево':'Назад'}</button><button class="swb acc" data-swdone>Готово${SHF.places.length?' · '+SHF.places.length:''}</button></div>`;
  if(!inRepo){
    h+=shTreeSvg();
  }else{
    const r=SHV2.r,cnt=shRepoCounts(r),tot=cnt.get('')||0;
    h+=`<div class="swh2">${esc(r||'Облако')}</div>`;
    const ck=(on,inh)=>`<span class="swck${on?' on':inh?' inh':''}">${on||inh?icon('check'):''}</span>`;
    h+=`<button class="swr swrb" data-swroot="1">${ck(shExact(r,''),false)}<span class="swt"><span class="swn1">Весь репозиторий</span></span><span class="swc2">${tot}</span></button>`;
    const walk=(p,d)=>{
      for(const x of kpKids(r,p)){
        const c=cnt.get(x)||0;if(!c)continue;
        const kids=kpKids(r,x).some(k=>(cnt.get(k)||0)>0),lk=isLocked(r,x),open=SHV2.open.has(x)&&!lk;
        const ex=shExact(r,x),inh=!ex&&shCovered(r,x);
        h+=`<div class="swr tr" style="padding-left:${d*18}px"><button class="swckb" data-swck="${esc(x)}" aria-label="Выбрать">${ck(ex,inh)}</button><button class="swt" data-swopen="${esc(x)}"><span class="swn1">${esc(base(x))}</span>${lk?`<span class="swbd">${icon('lock')}запаролена</span>`:''}</button><span class="swc2">${c}</span>${kids?`<button class="swchev${open?' op':''}" data-swopen="${esc(x)}" aria-label="Раскрыть">${icon('down')}</button>`:'<span class="swchev"></span>'}</div>`;
        if(open)walk(x,d+1);
      }
    };
    walk('',0);
    if(!tot)h+='<div class="swn2" style="padding:14px 4px">В этом репозитории нет аудио</div>';
  }
  $('#admb').innerHTML=h+'</div>';
}
async function shToggle(r,p){
  if(shExact(r,p))SHF.places=SHF.places.filter(x=>!(x.r===r&&x.p===p));
  else if(shCovered(r,p)){say('Уже входит в выбранную папку');return}
  else{
    try{if(isLocked(r,p)&&!await unlock(r,p))return}catch(x){say(err(x),1);return}
    SHF.places=SHF.places.filter(x=>!(x.r===r&&(p===''||inTree(x.p,p))));
    SHF.places.push({r,p});
  }
  shSched('sel');shPickPaint();
}
async function shEnterRepo(r){
  try{
    if(!await unlock(r,''))return;
    if(r&&encOn(r)&&!KEYS[r]&&!await ensureKey(r))return;
    await decAll();
  }catch(x){say(err(x),1);return}
  SHV2.r=r;SHV2.open=new Set();shPickPaint();
}
function openShuffle(){
  fromSet=false;admParent=null;openAdm(extName('shuf'));
  try{shLoad()}catch(e){}
  shufPaint();
}
/* пароли для всех выбранных мест: закрытая папка без пароля пропускается, вложенные закрытые тоже */
async function shUnlockAll(){
  let any=false;
  for(const pl of SHF.places){
    const{r,p}=pl;let skip=false;
    try{
      for(const l of shufLocks(r,p)){if(!await checkLock(l)&&shufAbove(l.p,p)){skip=true;break}}
      if(skip){say('Пропускаю «'+kpName(r,p)+'»: пароль не введён',1);continue}
      if(r&&encOn(r)&&!KEYS[r]&&!await ensureKey(r)){say('Пропускаю «'+kpName(r,p)+'»: нет пароля шифрования',1);continue}
      any=true;
    }catch(x){say(err(x),1)}
  }
  try{await decAll()}catch(e){}
  return any;
}
async function shStartPlay(){
  const L=shPool();
  if(!L.length){say('В выбранных местах нет доступной музыки',1);$('#adm').hidden=false;shufPaint();return}
  shClose();
  pq=shBuild(L).slice(0,600);SHM.on=true;SHM.hid=[];SHUF=false;REPM=1;SH={o:[],p:0,len:0};drawPl4();shmUi();sv('tgmode','wave');
  $('#adm').hidden=true;fromSet=false;admParent=null;
  shSched('sel');shSched('que');SHM.skip=false;playAt(0);
}
async function shufStart(){await shUnlockAll();await shStartPlay()}
/* есть ли сохранённая «волна» у этого пользователя (на устройстве или из чата) и играла ли она последней */
function shSaved(){
  try{
    if(!shOnAvail())return false;
    if(SHM.pos&&SHM.c.que)return true;
    const l=ld('tgshm',{});
    return l.u===jwho()&&!!(l.pos&&l.pos.id&&l.que&&l.que.d&&l.que.d.q);
  }catch(e){return false}
}
const shWaveLast=()=>ld('tgmode','')==='wave'&&shSaved();
async function shResume(auto=true){
  try{shLoad()}catch(e){}
  const pos=SHM.pos||ld('tgshm',{}).pos;
  await shUnlockAll();
  $('#adm').hidden=true;
  if(shApply(pos,auto))return;
  say('Сохранённой очереди нет, собираю новую');
  await shStartPlay();
}
let shBusy=false;
$('#admb').addEventListener('click',async e=>{
  const t=e.target.closest&&e.target.closest('#shfadd,#shfgo,#shfcont,[data-shx],[data-shu],[data-swback],[data-swdone],[data-swseg],[data-swrepo],[data-swroot],[data-swck],[data-swopen]');if(!t)return;
  const d=t.dataset;
  if(t.id==='shfadd'){SHV2.r=null;SHV2.oth=false;shPickPaint();return}
  if(t.id==='shfgo'||t.id==='shfcont'){
    if(t.disabled||shBusy)return;shBusy=true;
    try{if(t.id==='shfgo')await shufStart();else await shResume()}catch(x){say(err(x),1)}finally{shBusy=false}
    return;
  }
  if(d.shx!==undefined){SHF.places.splice(+d.shx,1);shSched('sel');shufPaint();return}
  if(d.shu!==undefined){DIS.delete(+d.shu);shSched('dis');shufPaint();return}
  if(d.swback!==undefined){if(SHV2.r!==null){SHV2.r=null;shPickPaint()}else shufPaint();return}
  if(d.swdone!==undefined){shufPaint();return}
  if(d.swseg!==undefined){SHV2.oth=d.swseg==='1';shPickPaint();return}
  if(d.swrepo!==undefined){await shEnterRepo(d.swrepo);return}
  if(d.swroot!==undefined){await shToggle(SHV2.r,'');return}
  if(d.swck!==undefined){await shToggle(SHV2.r,d.swck);return}
  if(d.swopen!==undefined){
    const p=d.swopen,r=SHV2.r,kids=kpKids(r,p).length>0;
    if(kids){
      if(!SHV2.open.has(p)){try{if(isLocked(r,p)&&!await unlock(r,p))return}catch(x){say(err(x),1);return}SHV2.open.add(p)}else SHV2.open.delete(p);
      shPickPaint();
    }else await shToggle(r,p);
  }
});
