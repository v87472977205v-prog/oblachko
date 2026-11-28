/* ===== ФАЙЛ ядро-20-выбор-перенос.js =====
   
   Выбор файлов, перетаскивание, перенос и копирование.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
$('#fi').onchange=async e=>{const fs=[...e.target.files];e.target.value='';if(!fs.length)return;if(roDeny(R()))return;try{if(!await forceEnc(R()))return}catch(x){say(err(x),1);return}enqueue(fs)};


let curList=[],vi=0,z={s:1,x:0,y:0};
const stg=$('#vstage');
const media=()=>stg.firstElementChild&&stg.firstElementChild.matches('img')?stg.firstElementChild:null;
const curFile=()=>files.find(x=>x.id===openId);
const applyZ=anim=>{const m=media();if(!m)return;m.style.transition=anim?'transform .2s':'none';m.style.transform=`translate(${z.x}px,${z.y}px) scale(${z.s})`};
function lkScr(t,head){requestAnimationFrame(termDraw);return '<div class="lkscr"><div class="lkhero"><img src="lock-hero.jpg" alt=""><i></i><i></i><i></i></div><div class="lkt">'+t+'</div><div class="lkterm" data-h="'+head+'">'+termHTML(head)+'</div></div>'}
function applyLks(){document.body.classList.toggle('lk-sl',ld('lkstyle','round')==='slide')}
function lkGo(b){if(b.classList.contains('unk'))ensureKey(R()).then(ok=>ok&&render());else unlock(R(),'').then(ok=>ok&&render())}
applyLks();
(()=>{
  const L=$('#list');let st=null;
  const sl=()=>document.body.classList.contains('lk-sl');
  const inb=e=>sl()&&e.target.closest&&e.target.closest('.lockbtn');
  L.addEventListener('pointerdown',e=>{
    const b=inb(e);if(!b)return;e.stopPropagation();
    const k=b.querySelector('.lk');if(!k)return;
    k.classList.remove('snap');
    st={b,k,x:e.clientX,max:b.clientWidth-k.offsetWidth-12,id:e.pointerId,dx:0};
    try{b.setPointerCapture(e.pointerId)}catch(x){}
  },true);
  L.addEventListener('pointermove',e=>{
    if(!st||e.pointerId!==st.id)return;e.stopPropagation();
    st.dx=Math.max(0,Math.min(st.max,e.clientX-st.x));st.k.style.transform='translateX('+st.dx+'px)';
  },true);
  const end=e=>{
    if(!st||e.pointerId!==st.id)return;e.stopPropagation();
    const s=st;st=null;s.k.classList.add('snap');
    if(s.dx>=s.max*.8){s.k.style.transform='translateX(0)';try{navigator.vibrate&&navigator.vibrate(15)}catch(x){}lkGo(s.b);return}
    if(s.dx<6){s.k.style.transform='translateX(22px)';setTimeout(()=>{s.k.style.transform='translateX(0)'},220);return}
    s.k.style.transform='translateX(0)';
  };
  L.addEventListener('pointerup',end,true);L.addEventListener('pointercancel',end,true);
  ['touchstart','touchmove','touchend'].forEach(t=>L.addEventListener(t,e=>{if(inb(e))e.stopPropagation()},{capture:true,passive:true}));
})();
$('#list').onclick=e=>{
  if(lp||swiped||Date.now()<dragBlock)return;
  {const lb=e.target.closest('.unk,.unl');if(lb){if(document.body.classList.contains('lk-sl')&&e.detail)return;lkGo(lb);return}}
  const d=e.target.closest('[data-o]');
  if(d){const id=+d.dataset.o;if(e.target.closest('.ck')){if(selMode)toggleSel(id);else enterSel(id)}else if(selMode)toggleSel(id);else{const f0=files.find(x=>x.id===id);if(f0&&isAud(f0))startPlayer(id);else showAt(curList.indexOf(id))}}
  else go(e);
};
function paintSel(){
  $('#selbar').hidden=!selMode;$('#selc').textContent='Выбрано: '+sel.size;
  $('#sall').textContent=curList.length&&curList.every(id=>sel.has(id))?'Снять':'Все';
  $('#top').hidden=selMode;{const fb=selMode||fabBlocked();$('#fab').hidden=fb;if(fb)fabClose()}
  $('#sq').hidden=!$('#q').value.trim()||selMode;
  document.querySelectorAll('#list [data-o]').forEach(d=>d.classList.toggle('sel',sel.has(+d.dataset.o)));
}
function enterSel(id){selMode=true;sel=new Set(id!=null?[id]:[]);try{navigator.vibrate&&navigator.vibrate(20)}catch(e){}paintSel()}
function toggleSel(id){if(sel.has(id))sel.delete(id);else sel.add(id);paintSel()}
function exitSel(){selMode=false;sel.clear();render()}
let lpT=null,lpX=0,lpY=0;
const lpClear=()=>clearTimeout(lpT);
const lpAct=id=>{if(lp)return;lp=true;if(selMode){if(!sel.has(id))toggleSel(id)}else enterSel(id);armDrag(id)};
$('#selb').onclick=()=>enterSel(null);
$('#list').addEventListener('pointerdown',e=>{
  const d=e.target.closest('[data-o]');if(!d)return;
  lp=false;lpX=e.clientX;lpY=e.clientY;lpClear();
  lpT=setTimeout(()=>lpAct(+d.dataset.o),400);
});
$('#list').addEventListener('pointermove',e=>{if(Math.abs(e.clientX-lpX)+Math.abs(e.clientY-lpY)>12)lpClear()});
for(const ev of['pointerup','pointercancel','pointerleave'])$('#list').addEventListener(ev,()=>{lpClear();if(lp)setTimeout(()=>{lp=false},350)});
/* на телефоне долгое нажатие приходит как contextmenu: это второй, надёжный путь */
$('#list').addEventListener('contextmenu',e=>{
  e.preventDefault();lpClear();
  const d=e.target.closest('[data-o]');if(d)lpAct(+d.dataset.o);
});
/* ---- перетаскивание: зажать файл, он выделяется, дальше тянуть ---- */
let DR=null,dragBlock=0;
const ordIdx=(r,p)=>{const m=new Map(),e=ORD.find(x=>x.r===r&&x.p===p);if(e)e.o.forEach((id,i)=>m.set(id,i));return m};
let ordQ=Promise.resolve();
function ordSave(r,p){ordQ=ordQ.then(()=>ordDo(r,p)).catch(x=>say(err(x),1))}
async function ordDo(r,p){
  const e=ORD.find(x=>x.r===r&&x.p===p);if(!e)return;
  const ids=e.o.slice(),old=e.mids.slice(),parts=[],mids=[];
  for(let i=0;i<ids.length;i+=500)parts.push(ids.slice(i,i+500).map(x=>x.toString(36)).join(','));
  for(let n=0;n<parts.length;n++){const m=await withChat(()=>client.sendMessage(S.chat,ORR+JSON.stringify({r,p,n,o:parts[n]})));mids.push(m.id)}
  e.mids=mids;
  if(old.length)try{await withChat(()=>client.deleteMessages(S.chat,old))}catch(x){}
}
function armDrag(id){if(SHV)return;
  if($('#q').value.trim())return;
  const el=document.querySelector('#list [data-o="'+id+'"]');if(!el)return;
  DR={id,el,started:false,x:lpX,y:lpY,lx:lpX,ly:lpY,cl:null,ox:0,oy:0,tm:0};
  if(!ld('tghint',0)){sv('tghint',1);say('Не отпуская, потяните файл, чтобы переставить')}
}
function dragMove(x,y){
  const D=DR;if(!D)return;D.lx=x;D.ly=y;
  if(!D.started){
    if(Math.abs(x-D.x)+Math.abs(y-D.y)<8)return;
    const r=D.el.getBoundingClientRect();D.ox=D.x-r.left;D.oy=D.y-r.top;
    const c=D.el.cloneNode(true);c.removeAttribute('data-o');c.classList.remove('sel');c.classList.add('dragclone');c.style.width=r.width+'px';c.style.height=r.height+'px';document.body.appendChild(c);
    D.cl=c;D.el.classList.add('dragging');D.started=true;D.tm=setInterval(dragScroll,16);
    try{navigator.vibrate&&navigator.vibrate(15)}catch(e){}
  }
  D.cl.style.left=(x-D.ox)+'px';D.cl.style.top=(y-D.oy)+'px';
  dragHit(x,y);
}
function dragHit(x,y){
  const D=DR;if(!D||!D.started)return;
  const e=document.elementFromPoint(x,y),t=e&&e.closest('#list [data-o]');
  if(!t||t===D.el)return;
  const r=t.getBoundingClientRect(),before=GR?(x<r.left+r.width/2):(y<r.top+r.height/2);
  t.parentNode.insertBefore(D.el,before?t:t.nextSibling);
}
function dragScroll(){
  const D=DR;if(!D||!D.started)return;
  let d=0;if(D.ly<110)d=-Math.ceil((110-D.ly)/8);else if(D.ly>innerHeight-110)d=Math.ceil((D.ly-(innerHeight-110))/8);
  if(d){scrollBy(0,d);dragHit(D.lx,D.ly)}
}
function dragEnd(){
  const D=DR;if(!D)return;DR=null;clearInterval(D.tm);
  if(!D.started)return;
  D.cl.remove();D.el.classList.remove('dragging');dragBlock=Date.now()+600;
  dropOrder(D.id);
}
function dropOrder(movedId){
  const r=R(),p=cur;if(roDeny(r)){render();return}
  const shown=[...document.querySelectorAll('#list [data-o]')].map(d=>+d.dataset.o);
  let fin=shown;
  if(sel.size>1&&sel.has(movedId)){
    const others=shown.filter(id=>sel.has(id)&&id!==movedId);
    fin=shown.filter(id=>!sel.has(id)||id===movedId);
    fin.splice(fin.indexOf(movedId)+1,0,...others);
  }
  ORDIDX=ordIdx(r,p);
  const cmp=SORTS[P.sort]||SORTS.new,full=files.filter(f=>f.repo===r&&f.path===p).sort(cmp).map(f=>f.id),set=new Set(fin);let k=0;
  const out=full.map(id=>set.has(id)?fin[k++]:id);
  if(P.sort==='my'&&out.join()===full.join()){render();return}
  let e=ORD.find(x=>x.r===r&&x.p===p);if(!e){e={r,p,o:[],mids:[]};ORD.push(e)}
  e.o=out;P.sort='my';sv('tgmp',P);
  jlog('ord',(r||'Облако')+(p?' / '+p:''));
  render();ordSave(r,p);
}
$('#list').addEventListener('touchmove',e=>{if(!DR)return;e.preventDefault();const t=e.touches[0];dragMove(t.clientX,t.clientY)},{passive:false});
document.addEventListener('mousemove',e=>{if(DR&&(e.buttons&1))dragMove(e.clientX,e.clientY)});
for(const ev of['touchend','touchcancel','mouseup'])document.addEventListener(ev,dragEnd);
$('#sx').onclick=exitSel;
$('#sall').onclick=()=>{if(curList.length&&curList.every(id=>sel.has(id)))sel.clear();else curList.forEach(id=>sel.add(id));paintSel()};
$('#srm').onclick=async()=>{
  const ids=[...sel];if(!ids.length)return;if(roDeny(R()))return;
  if(!confirm(`Удалить файлов: ${ids.length} — навсегда?`))return;
  const nm=ids.slice(0,3).map(i=>{const f=files.find(x=>x.id===i);return f?jn(f):''}).filter(Boolean).join(', ');
  const done=new Set();let e0=null;
  try{
    for(let i=0;i<ids.length;i+=100){
      say(`Удаляю ${Math.min(i+100,ids.length)} из ${ids.length}…`);
      const part=ids.slice(i,i+100);await withChat(()=>client.deleteMessages(S.chat,part));part.forEach(x=>done.add(x));
    }
  }catch(x){e0=x}
  files=files.filter(f=>!done.has(f.id));done.forEach(i=>C.delete(i));
  if(done.size)jlog('del',done.size+' файл(ов): '+nm+(ids.length>3?'…':''));
  exitSel();e0?say(`Удалено ${done.size} из ${ids.length}: `+err(e0),1):say('Удалено: '+done.size);
};
$('#sdl').onclick=async()=>{
  {const L=[...sel].map(id=>files.find(x=>x.id===id)).filter(Boolean);
   if(L.length>1&&L.reduce((a,f)=>a+(f.size||0),0)<=5e8){
     try{
       if(!window.JSZip)await loadScript(['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js']);
       const z=new JSZip(),used=new Set();let k=0;
       for(const f of L){
         say(`Собираю ZIP ${++k} из ${L.length}…`);
         let nm=f.name,i=1;const d=f.name.lastIndexOf('.');
         while(used.has(nm.toLowerCase()))nm=d>0?f.name.slice(0,d)+' ('+(++i)+')'+f.name.slice(d):f.name+' ('+(++i)+')';
         used.add(nm.toLowerCase());z.file(nm,await(await fetch(await urlOf(f))).blob());jlog('dl',jn(f));
       }
       const b=await z.generateAsync({type:'blob',compression:'STORE'}),a=document.createElement('a');
       a.href=URL.createObjectURL(b);a.download='Архив.zip';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),60000);
       say('Готово: Архив.zip');return;
     }catch(x){say('ZIP не получился, скачиваю по одному: '+err(x),1)}
   }}
  for(const id of[...sel]){
    const f=files.find(x=>x.id===id);if(!f)continue;
    try{say('Скачиваю: '+f.name);const a=document.createElement('a');a.href=await urlOf(f);a.download=f.name;a.click();jlog('dl',jn(f));await new Promise(r=>setTimeout(r,400))}
    catch(x){say(err(x),1);return}
  }
  say('Готово');
};

/* зашифрованные файлы привязаны к ключу своего репозитория */
function encMoveBlock(fl,nr,rr){
  if(nr===rr)return '';
  if(fl.some(f=>f.enc))return 'Зашифрованные файлы нельзя переносить или копировать в другой репозиторий: они зашифрованы ключом этого. Скачайте их и загрузите заново.';
  return '';
}
const encWarn=(fl,nr,rr)=>nr!==rr&&encOn(nr)&&fl.some(f=>!f.enc)&&!confirm('Репозиторий «'+nr+'» зашифрован, а эти файлы нет. Они останутся незашифрованными. Продолжить?');
async function batchMove(np,nr){
  if(roDeny(R())||roDeny(nr))return;
  const ids=[...sel];let i=0;
  {const fl0=ids.map(id=>files.find(x=>x.id===id)).filter(Boolean),bl=encMoveBlock(fl0,nr,R());if(bl){alert(bl);return}if(encWarn(fl0,nr,R()))return}
  try{
    for(const id of ids){
      const f=files.find(x=>x.id===id);if(!f||(f.path===np&&f.repo===nr))continue;
      i++;say(`Перемещаю ${i} из ${ids.length}…`);
      await withChat(()=>client.editMessageCaption(S.chat,f.id,{caption:caption(f.no,np,capName(f),nr)}));f.path=np;f.repo=nr;
    }
    say('Перемещено: '+i);if(i)jlog('mv',i+' файл(ов) → '+(nr||'Облако')+(np?' / '+np:''));
  }catch(x){say(err(x),1)}
  exitSel();
}
async function moveFolder(np,nr,nm){
  if(roDeny(R())||roDeny(nr))return;
  const old=cur,rr=R(),bn=nm||base(old),nb=np?np+'/'+bn:bn;
  if(nb===old&&nr===rr)return;
  if(allPaths(nr).includes(nb)){alert('В выбранном месте уже есть папка с таким именем.');return}
  const mp=p=>nb+p.slice(old.length);
  const fl=files.filter(f=>f.repo===rr&&inTree(f.path,old)),mk=folders.filter(x=>x.repo===rr&&inTree(x.path,old)),lk=locks.filter(l=>l.r===rr&&l.p&&inTree(l.p,old));
  {const bl=encMoveBlock(fl,nr,rr);if(bl){alert(bl);return}if(encWarn(fl,nr,rr))return}
  let i=0;
  try{
    for(const f of fl){say(`Переношу ${++i} из ${fl.length}…`);await withChat(()=>client.editMessageCaption(S.chat,f.id,{caption:caption(f.no,mp(f.path),capName(f),nr)}));f.path=mp(f.path);f.repo=nr}
    for(const p of new Set([nb,...mk.map(x=>mp(x.path))])){const m=await withChat(()=>client.sendMessage(S.chat,(nr?RP+nr+'\n':'')+FP+p));folders.push({id:m.id,path:p,repo:nr})}
    for(const l of lk){const np2=mp(l.p),m=await withChat(()=>client.sendMessage(S.chat,LK+JSON.stringify(l.x?{r:nr,p:np2,h:l.h,x:l.x}:{r:nr,p:np2,h:l.h})));locks.push({id:m.id,r:nr,p:np2,h:l.h,x:l.x});unAdd(nr+'\n'+np2,l.h);if(BIO.k[bioKey(l.r,l.p)]===l.h){delete BIO.k[bioKey(l.r,l.p)];BIO.k[bioKey(nr,np2)]=l.h;saveBio()}}
    const del=[...mk,...lk].map(x=>x.id);
    if(del.length)await withChat(()=>client.deleteMessages(S.chat,del));
    folders=folders.filter(x=>!mk.includes(x));locks=locks.filter(l=>!lk.includes(l));
    P.repo=nr;sv('tgmp',P);cur=nb;exitSel();say('Папка перенесена');jlog('mv','папка '+old+' → '+(nr||'Облако')+(nb?' / '+nb:''));
  }catch(x){say(err(x),1);try{await refresh()}catch(e){}render()}
}
async function copyFolder(np,nr){
  if(roDeny(nr))return;
  const old=cur,rr=R(),nb=np?np+'/'+base(old):base(old);
  if(allPaths(nr).includes(nb)){alert('В выбранном месте уже есть папка с таким именем.');return}
  const mp=p=>nb+p.slice(old.length);
  const fl=files.filter(f=>f.repo===rr&&inTree(f.path,old)).sort((a,b)=>a.no-b.no),mk=folders.filter(x=>x.repo===rr&&inTree(x.path,old)),lk=locks.filter(l=>l.r===rr&&l.p&&inTree(l.p,old));
  let no=0;for(const x of files)if(x.no>no)no=x.no;
  const fw=async fn=>{for(let t=0;;t++){try{return await withChat(fn)}catch(e){const m=/FLOOD_WAIT\D{0,12}(\d+)|wait of (\d+)/i.exec(err(e));if(!m||t>=3)throw e;for(let i=+(m[1]||m[2])+1;i>0;i--){say(`Telegram просит подождать: ${i} с`);await sleep(1000)}}}};
  {const bl=encMoveBlock(fl,nr,rr);if(bl){alert(bl);return}if(encWarn(fl,nr,rr))return}
  let i=0,bad=0,e1='';
  try{
    for(const p of new Set([nb,...mk.map(x=>mp(x.path))])){const m=await fw(()=>client.sendMessage(S.chat,(nr?RP+nr+'\n':'')+FP+p));folders.push({id:m.id,path:p,repo:nr})}
    for(const f of fl){
      say(`Копирую ${++i} из ${fl.length}…`);
      try{
        const myNo=++no;const r=await fw(()=>client.sendDocument(S.chat,f.fid,{caption:caption(myNo,mp(f.path),capName(f),nr),fileName:f.enc?'enc'+myNo+'.bin':f.name}));
        const en=entry(r);if(en){if(!en.no)en.no=no;files.push(en)}
      }catch(x){bad++;no--;if(!e1)e1=err(x)}
      await sleep(400);
    }
    for(const l of lk){const np2=mp(l.p),m=await fw(()=>client.sendMessage(S.chat,LK+JSON.stringify(l.x?{r:nr,p:np2,h:l.h,x:l.x}:{r:nr,p:np2,h:l.h})));locks.push({id:m.id,r:nr,p:np2,h:l.h,x:l.x});unAdd(nr+'\n'+np2,l.h)}
    P.repo=nr;sv('tgmp',P);cur=nb;exitSel();
    jlog('cp','папка '+old+' → '+(nr||'Облако')+(nb?' / '+nb:''));
    bad?say(`Скопировано ${fl.length-bad} из ${fl.length}. Ошибка: ${e1}`,1):say('Папка скопирована');
  }catch(x){say(err(x),1);try{await refresh()}catch(e){}render()}
}
$('#rnf').onclick=async()=>{const n=clean(await uiPrompt('Новое имя папки',base(cur))||'');if(!n||n===base(cur))return;moveFolder(parentPath(cur),R(),n)};
$('#smv').onclick=()=>{if(sel.size){pickMode='batch';openPick(null)}};
$('#mvf').onclick=()=>{pickMode='folder';openPick(null)};
$('#cpf').onclick=()=>{pickMode='fcopy';openPick(null)};
