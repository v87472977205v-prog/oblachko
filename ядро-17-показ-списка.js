/* ===== ФАЙЛ ядро-17-показ-списка.js =====
   
   Показ списка (render, show), репозитории, меню репозитория.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
const thumb=(f,u)=>f.mime.startsWith('video/')?`<video src="${u}#t=0.1" preload="metadata" muted playsinline></video><span class="pb">▶</span>`:`<img alt="" src="${u}">`;
const obs=new IntersectionObserver(es=>es.forEach(async e=>{
  if(!e.isIntersecting)return;obs.unobserve(e.target);
  if(U.on||loadingTrack){const el=e.target;setTimeout(()=>{if(el.isConnected)obs.observe(el)},4000);return}
  const f=files.find(x=>x.id==e.target.dataset.th);
  try{e.target.innerHTML=thumb(f,await urlOf(f))}catch(x){}e.target.classList.add('ok');
}),{rootMargin:'200px'});
let AM=false,GR=true;
const hueOf=n=>{let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;return h};
const coverStyle=n=>{const h=hueOf(n),a=146+h%34,l1=24+(h>>3)%10,l2=10+(h>>5)%7;return`background:linear-gradient(145deg,hsl(${a} 32% ${l1}%),hsl(${a+14} 38% ${l2}%))`};
function fileRow(f,showPath){
  const s=sel.has(f.id)?' sel':'',aud=isAud(f),mediaT=f.mime.startsWith('image/')||f.mime.startsWith('video/');
  const img=(f.mime.startsWith('image/')&&f.size<=8e6)||(f.mime.startsWith('video/')&&f.size<=25e6);
  const th=aud?`<div class="th cov" data-cv="${f.id}" style="${coverStyle(f.name)}">${covInner(f.id)}</div>`:`<div class="th" ${img?`data-th="${f.id}"`:''}>${esc(ext(f.name))}</div>`;
  if(GR){
    const cap=mediaT?`<div class="cap"><div class="tn">${esc(f.name)}</div></div>`:`<div class="tn">${esc(f.name)}</div><div class="m">${showPath?esc(f.path||'Корень'):size(f.size)}</div>`;
    return`<div class="tile${mediaT?' media':''}${s}" data-o="${f.id}">${th}<span class="ck">✓</span>${cap}</div>`;
  }
  if(aud)return`<div class="f trk${s}" data-o="${f.id}">${th}<div><b>${esc(f.name.replace(/\.[^.]+$/,''))}</b><div class="m">${showPath?esc(f.path||'Корень')+' · ':''}${size(f.size)}</div></div><span class="go">${icon('play')}</span><span class="ck">✓</span></div>`;
  return`<div class="f${s}" data-o="${f.id}">${th}
    <div><b>${esc(f.name)}</b><div class="m">${showPath?esc(f.path||'Корень')+' · ':''}${size(f.size)} ${new Date(f.date).toLocaleDateString('ru')}</div></div><span class="ck">✓</span></div>`;
}
function folderRow(p){
  const n=files.filter(f=>f.repo===R()&&inTree(f.path,p)).length,lk=lockOf(R(),p)?`<span class="lkb">${icon('lock')}</span>`:'';
  if(GR)return`<div class="tile" data-go="${esc(p)}"><div class="th fo">📁</div><div class="tn">${esc(base(p))}${lk}</div><div class="m">Файлов: ${n}</div></div>`;
  return`<div class="f" data-go="${esc(p)}"><div class="th fo">📁</div><div><b>${esc(base(p))}${lk}</b><div class="m">Файлов: ${n}</div></div></div>`;
}
let FT='all';
const ftOk=f=>FT==='all'||(FT==='img'?f.mime.startsWith('image/'):FT==='vid'?f.mime.startsWith('video/'):FT==='aud'?isAud(f):!(f.mime.startsWith('image/')||f.mime.startsWith('video/')||isAud(f)));
function drawFltMenu(){
  $('#fltm').innerHTML=[['all','Все файлы'],['img','Фото'],['vid','Видео'],['aud','Музыка'],['doc','Документы']].map(([k,t])=>`<button data-ft="${k}">${k===FT?icon('check'):'<i class="i"></i>'}${t}</button>`).join('');
  $('#fltb').classList.toggle('on',FT!=='all');
}
$('#tgl').onclick=e=>{e.stopPropagation();const t=$('#top'),o=t.classList.toggle('tl');$('#tgl').setAttribute('aria-expanded',o);if(!o){$('#sortm').hidden=true;$('#fltm').hidden=true}};
const tlClose=()=>{$('#top').classList.remove('tl');$('#tgl').setAttribute('aria-expanded','false')};
$('#tools').addEventListener('click',e=>{if(e.target.closest('button'))setTimeout(tlClose,180)});
document.addEventListener('click',e=>{if(!e.target.closest('#top'))tlClose()});
$('#fltb').onclick=e=>{e.stopPropagation();$('#sortm').hidden=true;$('#fltm').hidden=!$('#fltm').hidden};
$('#fltm').onclick=e=>{const b=e.target.closest('[data-ft]');if(!b)return;FT=b.dataset.ft;$('#fltm').hidden=true;render()};
document.addEventListener('click',e=>{if(!e.target.closest('#fltm,#fltb'))$('#fltm').hidden=true});
function render(){
  if(SHV){if(P.repo!==SHV.r)P.repo=SHV.r;if(SHV.p&&!inTree(cur,SHV.p))cur=SHV.p}
  if(!_dd&&files.some(f=>f.enc&&!f.dec&&KEYS[f.repo])){_dd=1;decAll().then(()=>{_dd=0;render()},()=>{_dd=0})}
  const q=$('#q').value.trim().toLowerCase();
  const segs=cur?cur.split('/'):[];let acc='';
  $('#crumbs').innerHTML=`<button class="chip${cur===''?' on':''}" data-go="">${esc(R()||'Облако')}</button>`+segs.map(s=>{acc=acc?acc+'/'+s:s;return`<button class="chip${acc===cur?' on':''}" data-go="${esc(acc)}">${esc(s)}</button>`}).join('');
  drawFltMenu();
  $('#delf').hidden=!cur;
  $('#vmode').innerHTML=icon(P.view==='grid'?'list':'grid');drawSortMenu();
  {const lst=((repoBlocked(R())||isLocked(R(),''))?[]:(q?files.filter(f=>f.repo===R()&&shIn(f)&&!isLocked(f.repo,f.path)&&f.name.toLowerCase().includes(q)):files.filter(f=>f.repo===R()&&f.path===cur))).filter(ftOk);
   AM=P.view==='grid'&&lst.length>0&&lst.filter(isAud).length/lst.length>=.6;GR=P.view==='grid'&&!AM}
  $('#list').className=(GR?'grid':'')+(selMode?' selm':'');
  $('#selbar').hidden=!selMode;$('#selc').textContent='Выбрано: '+sel.size;
  $('#top').hidden=selMode;{const fb=selMode||fabBlocked();$('#fab').hidden=fb;if(fb)fabClose()}
  const qq=$('#q').value.trim();$('#sq').hidden=!qq||selMode;$('#sqt').textContent='Поиск: «'+qq+'»';
  ORDIDX=ordIdx(R(),cur);const cmp=(P.sort==='my'&&q)?SORTS.new:(SORTS[P.sort]||SORTS.new);
  let html='';
  drawRepos();
  if(repoBlocked(R())){html='<div class="empty"><span class="big">🚫</span>Вы потеряли доступ к этому репозиторию</div>'}
  else if(!isLocked(R(),'')&&needKey(R())){html=''+lkScr('Репозиторий зашифрован','AES-256: LOCKED')+'<button class="lockbtn unk" aria-label="Ввести пароль шифрования"><span class="lk">'+icon('lock')+'</span><span class="lt">Потяните, чтобы открыть</span></button>'}
  else if(isLocked(R(),'')){html=''+lkScr('Репозиторий защищён паролем','ACCESS: PASSWORD')+'<button class="lockbtn unl" aria-label="Ввести пароль"><span class="lk">'+icon('lock')+'</span><span class="lt">Потяните, чтобы открыть</span></button>'}
  else if(q){
    const L=files.filter(f=>f.repo===R()&&shIn(f)&&!isLocked(f.repo,f.path)&&f.name.toLowerCase().includes(q)).filter(ftOk).sort(cmp);
    html=L.length?L.map(f=>fileRow(f,true)).join(''):'<div class="empty"><span class="big">🔍</span>Ничего не найдено</div>';
  }else{
    const subs=allPaths().filter(p=>parentPath(p)===cur);
    const L=files.filter(f=>f.repo===R()&&f.path===cur).filter(ftOk).sort(cmp);
    html=subs.map(folderRow).join('')+L.map(f=>fileRow(f,false)).join('');
    if(!html)html='<div class="empty"><span class="big">📂</span>Здесь пока пусто.<br>Нажмите «+», чтобы добавить файлы,<br>или создайте папку в меню.</div>';
  }
  $('#list').innerHTML=html;
  curList=[...document.querySelectorAll('#list [data-o]')].map(d=>+d.dataset.o);
  $('#pbtn').hidden=!(audioList().length||pi>=0||lastAud()||shSaved());
  markPlaying();
  document.querySelectorAll('[data-th]').forEach(el=>{const ff=files.find(x=>x.id==el.dataset.th);if(ff&&C.has(ff.id))el.innerHTML=thumb(ff,C.get(ff.id));else obs.observe(el)});
  document.querySelectorAll('[data-cv]').forEach(el=>{const ff=files.find(x=>x.id==el.dataset.cv);if(ff&&!COV.has(ff.id))cvObs.observe(el)});
  try{appEmit('render')}catch(e){}
}
function show(){document.body.classList.toggle('ro',!!S.viewer);
  $('#boot').hidden=!booting;
  $('#setup').hidden=booting||(ready&&!showSetup);
  $('#app').hidden=booting||!ready||showSetup;
  if(ready&&!showSetup)render();
}

const go=async e=>{const d=e.target.closest('[data-go]');if(!d)return;const t=d.dataset.go;if(t&&!await unlock(R(),t))return;cur=t;selMode=false;sel.clear();$('#q').value='';render()};
$('#repl').onclick=async e=>{const dm=e.target.closest('[data-rm]');if(dm){openRepoMenu(dm.dataset.rm);return}const b=e.target.closest('[data-r]');if(!b)return;const r=b.dataset.r;if(!await unlock(r,''))return;P.repo=r;sv('tgmp',P);cur='';selMode=false;sel.clear();$('#q').value='';render();closeDrawer()};
async function newEncSetup(n){
  const a=await askPass('Код шифрования для «'+n+'». Если забудете, файлы не восстановить');if(!a)return null;
  const b=await askPass('Повторите код шифрования');if(a!==b){alert('Коды не совпали');return null}
  const salt=crypto.getRandomValues(new Uint8Array(16)),k=await deriveKey(a,salt),chk=b64e(await aesE(k,te.encode('ok')));
  const x=await encPw(a);
  return{enc:Object.assign({s:b64e(salt),c:chk,on:1},x?{x}:{}),k};
}
async function makeRepo(n){
  if(!canMake()){say('Вы потеряли право создавать репозитории',1);return false}
  if(!hasCrypto()){alert('Шифрование недоступно: при таком способе открытия приложения браузер не даёт доступ к криптографии. Откройте приложение с хостинга по https.');return false}
  const ne=await newEncSetup(n);if(!ne)return false;
  const m=await withChat(()=>client.sendMessage(S.chat,RP+n+'\n'+ENC+JSON.stringify(ne.enc)+GOWN()));
  repos.push({id:m.id,name:n,enc:ne.enc,guest:!!S.viewer,owner:S.viewer?S.guestUser||'':''});
  KEYS[n]=ne.k;P.repo=n;sv('tgmp',P);jlog('rep+',n);
  return true;
}
$('#addrepo').onclick=async()=>{if(!canMake()){say('Вы потеряли право создавать репозитории',1);return}const n=clean(await uiPrompt('Название репозитория')||'');if(!n)return;if(n==='Облако'||repos.some(x=>x.name===n)){alert('Такой репозиторий уже есть');return}try{if(await makeRepo(n)){cur='';render()}}catch(x){say(err(x),1)}};
$('#rsw').onclick=async()=>{
  if(rswBusy)return;rswBusy=true;
  try{
    if(P.all){const o=document.querySelectorAll('#repl .rrow.oth');if(o.length){o.forEach(x=>x.classList.add('hid'));await new Promise(r=>setTimeout(r,300))}}
    else{rpAnim=true;setTimeout(()=>{rpAnim=false},600)}
    P.all=!P.all;if(R()&&!repos.some(x=>x.name===R()&&showRepo(x))){P.repo='';cur=''}sv('tgmp',P);render();
  }finally{rswBusy=false}
};
$('#lkf').onclick=()=>toggleLock(R(),cur).catch(x=>say(err(x),1));
/* ---- меню репозитория (три точки) ---- */
let rmRepo='';
function openRepoMenu(r){if(SHV)return;
  rmRepo=r;const lk=lockOf(r,''),open=UN.has(r+'\n'),it=[];
  if(canPw(r)){it.push(lk?['chg','Сменить пароль','lock']:['set','Поставить пароль','lock']);
  if(lk)it.push(['rm','Снять пароль','unlock'])}
  if(encOf(r)&&canPw(r))it.push(['cpe','Сменить пароль шифрования','lock']);
  {const bs=window.PublicKeyCredential?bioRepoState(r):null;if(bs!==null)it.push(bs?['bio-','Отключить отпечаток','finger']:['bio+','Включить отпечаток','finger'])}
  if(lk&&open)it.push(['cls','Закрыть на этом устройстве','lock']);
  if(r&&!noDel(r))it.push(['del','Удалить репозиторий','trash']);
  $('#rml').innerHTML=`<div class="rt">${esc(r||'Облако')}</div>`+it.map(([a,t,ic])=>`<button data-a="${a}"${a==='del'?' class="del"':''}>${icon(ic)}${t}</button>`).join('');
  $('#rmn').hidden=false;
}
async function changeLock(r,p){
  if(roDeny(r))return;
  if(!canPw(r)){alert('Менять пароли здесь нельзя: этот репозиторий создан не вами.');return}
  const l=lockOf(r,p);if(!l)return toggleLock(r,p);
  const bioWas=BIO.k[bioKey(r,p)]===l.h;
  if(!UN.has(r+'\n'+p)&&!await checkLock(l))return;
  const a=await askPass('Новый пароль');if(!a)return;
  const b=await askPass('Повторите пароль');if(a!==b){alert('Пароли не совпали');return}
  const h=hashPw(a,Math.random().toString(36).slice(2,10)),xx=await encPw(a);
  const m=await withChat(()=>client.sendMessage(S.chat,LK+JSON.stringify(xx?{r,p,h,x:xx}:{r,p,h})));
  await withChat(()=>client.deleteMessages(S.chat,[l.id]));
  locks=locks.filter(x=>x!==l);locks.push({id:m.id,r,p,h,x:xx});unAdd(r+'\n'+p,h);if(bioWas){BIO.k[bioKey(r,p)]=h;saveBio()}else bioOff(r,p);jlog('chg',lkn(r,p));say('Пароль изменён');render();
}
function closeRepo(r){
  for(const k of[...UN])if(k.startsWith(r+'\n'))unDel(k);
  if(R()===r){cur='';selMode=false;sel.clear()}
  say('Закрыто на этом устройстве');render();
}
async function deleteRepo(r){
  if(!r)return;if(roDeny(r))return;
  if(noDel(r)){alert('Репозитории с паролем удалять нельзя.');return}
  if(!await unlock(r,''))return;
  const fl=files.filter(f=>f.repo===r),mk=folders.filter(x=>x.repo===r),lk=locks.filter(l=>l.r===r),rp=repos.filter(x=>x.name===r);
  const msg=fl.length?`В репозитории «${r}» файлов: ${fl.length}. Удалить репозиторий вместе со всеми файлами навсегда?`:`Удалить репозиторий «${r}»?`;
  if(!confirm(msg))return;
  const ids=[...fl,...mk,...lk,...rp].map(x=>x.id);
  for(let i=0;i<ids.length;i+=100){const part=ids.slice(i,i+100);await withChat(()=>client.deleteMessages(S.chat,part))}
  files=files.filter(f=>f.repo!==r);folders=folders.filter(x=>x.repo!==r);locks=locks.filter(l=>l.r!==r);repos=repos.filter(x=>x.name!==r);
  for(const k of[...UN])if(k.startsWith(r+'\n'))unDel(k);
  bioForget(r);delete KEYS[r];
  if(R()===r){P.repo='';sv('tgmp',P);cur=''}
  jlog('rep-',r);say('Репозиторий удалён');render();
}
$('#rml').onclick=async e=>{
  const b=e.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a,r=rmRepo;$('#rmn').hidden=true;
  try{
    if(a==='set'||a==='rm')await toggleLock(r,'');
    else if(a==='chg')await changeLock(r,'');
    else if(a==='cpe')await changeEncPw(r);
    else if(a==='cls')closeRepo(r);
    else if(a==='bio+'){if(await bioRepoEnable(r))say('Отпечаток включён');drawRepos()}
    else if(a==='bio-'){bioForget(r);say('Отпечаток отключён');drawRepos()}
    else if(a==='del')await deleteRepo(r);
  }catch(x){say(err(x),1)}
};
$('#rmn').onclick=e=>{if(e.target.id==='rmn')$('#rmn').hidden=true};

