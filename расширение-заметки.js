/* ===== ФАЙЛ расширение-заметки.js =====
   
   Расширение «Заметки».
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* при входе под пользователем ключ заметок выводится из введённого пароля и запоминается на устройстве */
async function ntLogin(name,pw){NTK=null;NTKu=null;const k=await deriveKey(pw,te.encode('ntx:'+name));await idbOp('m','readwrite',x=>x.put({id:'ntk:'+name,key:k}))}
document.addEventListener('click',e=>{if(e.target.closest('#ntadd,#ntfm'))return;const f=$('#ntfm');if(f&&!f.hidden){f.hidden=true;const b=$('#ntadd');if(b)b.classList.remove('open')}});
/* ---- Расширение «Заметки»: открывается как папка в разделе «Расширения», только списком.
   Заметки лежат в канале (📓), привязаны к аккаунту пользователя и видны на любом его устройстве.
   Одна версия заметки = одно или несколько сообщений (длинные режутся на части), старые версии удаляются. ---- */
const NTP='📓 ';let NTS=[];const NTC=new Map();let NTK=null,NTKu=null;
const NT={pf:false,pp:null,n:null,q:'',t:0,d:new Set(),f:0,rt:0},NTQ={};let NTD=[];
const ntMe=()=>S.guestUser||'';
async function ntMine(){const out=[];
  for(const r of NTS.filter(r=>r.u===ntMe())){const k=r.u+r.id+r.v;let note=NTC.get(k);
    if(!note&&r.raw){try{note=r.e?(NTK?JSON.parse(td.decode(await aesD(NTK,b64d(r.raw)))):null):JSON.parse(r.raw)}catch(e){note=null;NT.bad=(NT.bad||0)+1}if(note)NTC.set(k,note)}
    if(note)out.push({...note,_m:r.mids})}
  return out}
function ntAskPw(msg,bad){return new Promise(r=>{const o=document.createElement('div');o.id='ntpw';
  o.innerHTML=`<div class="b"><div class="t">Пароль</div><div class="m">${esc(msg)}</div><input type="password" id="ntpi" autocomplete="current-password" enterkeyhint="done"><div class="m bad">${esc(bad||'')}</div><div class="row"><button id="ntpc">Отмена</button><button class="p" id="ntpo">Открыть</button></div></div>`;
  document.body.appendChild(o);const i=$('#ntpi');i.focus();const done=v=>{o.remove();r(v)};
  $('#ntpo').onclick=()=>done(i.value);$('#ntpc').onclick=()=>done(null);i.onkeydown=e=>{if(e.key==='Enter')done(i.value)}})}
/* ключ шифрования выводится из пароля учётки (у владельца — из мастер-пароля) и запоминается на устройстве */
async function ntKeyGet(){const u=ntMe();if(NTK&&NTKu===u)return NTK;NTK=null;NTKu=u;
  if(!S.guestUser&&!ownkey)return null;
  const kid='ntk:'+(u||'*');
  try{const r=await idbOp('m','readonly',s=>s.get(kid));if(r&&r.key){NTK=r.key;return NTK}}catch(e){}
  let bad='';
  for(;;){
    const pw=await ntAskPw(S.guestUser?'Введите пароль вашей учётки, один раз. Дальше ключ заметок создаётся автоматически при входе.':'Введите мастер-пароль. Им шифруются заметки; на этом устройстве его нужно ввести один раз.',bad);
    if(pw===null)return undefined;
    try{
      if(S.guestUser){const rec=users.find(x=>x.u===S.guestUser);if(rec&&hashPw(pw,rec.h.split(':')[0])!==rec.h)throw 0}
      else await aesD(await deriveKey(pw,b64d(ownkey.s)),b64d(ownkey.w));
      NTK=await deriveKey(pw,te.encode('ntx:'+(u||'*')));
      try{await idbOp('m','readwrite',s=>s.put({id:kid,key:NTK}))}catch(e){}
      return NTK}
    catch(e){bad='Неверный пароль'}}}
const ntFmt=t=>{const d=new Date(t),n=new Date();return d.toDateString()===n.toDateString()?d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('ru',{day:'numeric',month:'short',year:d.getFullYear()===n.getFullYear()?undefined:'numeric'})};
const ntTtl=n=>n.t.trim()||(n.k==='c'?(n.c.find(i=>i.d.trim())||{d:''}).d:n.b.trim().split('\n')[0])||'Без названия';
const ntPrev=n=>n.k==='c'?n.c.filter(i=>i.d.trim()).slice(0,3).map(i=>(i.x?'☑ ':'☐ ')+i.d).join('  '):n.b.replace(/\s+/g,' ').trim().slice(0,90);
const ntText=n=>(n.t.trim()?n.t.trim()+'\n\n':'')+(n.k==='c'?n.c.map(i=>(i.x?'[x] ':'[ ] ')+i.d).join('\n'):n.b);
/* сборка заметок из сообщений канала: берём последнюю полностью записанную версию */
function ntBuild(P){const g={};for(const x of P)(g[x.u+'\u0000'+x.id]=g[x.u+'\u0000'+x.id]||[]).push(x);const out=[];
  for(const k in g){const a=g[k];
    for(const v of [...new Set(a.map(x=>x.v))].sort((p,q)=>q-p)){
      const cu=a.filter(x=>x.v===v).sort((p,q)=>p.p-q.p),ps=[],seen=new Set();
      for(const x of cu)if(!seen.has(x.p)){seen.add(x.p);ps.push(x)}
      if(ps.length!==cu[0].n)continue;
      out.push({u:a[0].u,id:a[0].id,v,e:cu[0].e?1:0,raw:ps.map(x=>x.s).join(''),mids:a.map(x=>x.m)});break}}
  return out}
function ntStore(n,mids,v,raw,e){const u=ntMe(),note=JSON.parse(JSON.stringify({id:n.id,t:n.t,b:n.b,c:n.c,k:n.k,p:n.p,cr:n.cr,up:n.up})),r=NTS.find(x=>x.id===n.id&&x.u===u);
  NTC.set(u+n.id+v,note);if(r){r.v=v;r.mids=mids;r.raw=raw;r.e=e}else NTS.push({u,id:n.id,v,raw,e,mids})}
function ntPush(n){
  const u=ntMe(),v=Math.max(Date.now(),(n._v||0)+1),e=NTK?1:0,key=NTK;n._v=v;
  const snap=JSON.stringify({id:n.id,t:n.t,b:n.b,c:n.c,k:n.k,p:n.p,cr:n.cr,up:n.up});ntStore(n,n._m||[],v,null,e);
  const run=async()=>{NT.f++;try{
    const body=e?b64e(await aesE(key,te.encode(snap))):snap,old=n._m||[],parts=[];
    for(let i=0;i<body.length;i+=1200)parts.push(body.slice(i,i+1200));
    const ids=[];for(let i=0;i<parts.length;i++){const m=await withChat(()=>client.sendMessage(S.chat,NTP+JSON.stringify({u,id:n.id,v,p:i,n:parts.length,s:parts[i],e})));ids.push(m.id)}
    n._m=ids;ntStore(n,ids,v,body,e);
    for(let i=0;i<old.length;i+=100){try{await withChat(()=>client.deleteMessages(S.chat,old.slice(i,i+100)))}catch(x){}}
  }finally{NT.f--}};
  const p=(NTQ[n.id]||Promise.resolve()).then(run);NTQ[n.id]=p.catch(()=>{});
  return p.then(()=>true,x=>{const f=/FLOOD_WAIT_(\d+)/.exec(String(err(x))+' '+String(x&&x.message||x));if(f){FLOODT=Date.now()+(+f[1]+1)*1000;say('Лимит Telegram: досохраню автоматически через '+f[1]+' с',1)}else say('Заметка не сохранилась в облаке: '+err(x),1);return false})}
function ntFlush(){clearTimeout(NT.t);const L=[...NT.d];NT.d.clear();for(const n of L)ntPush(n)}
const ntTouch=()=>{NT.n.up=Date.now();NT.d.add(NT.n);clearTimeout(NT.t);NT.t=setTimeout(ntFlush,1500);try{qkPinUpd(NT.n)}catch(e){}};
function ntDel(n){try{qkPinDelId(n.id)}catch(e){}NTS=NTS.filter(r=>!(r.id===n.id&&r.u===ntMe()));NT.d.delete(n);
  const p=(NTQ[n.id]||Promise.resolve()).then(async()=>{const m=[...(n._m||[])];for(let i=0;i<m.length;i+=100)await withChat(()=>client.deleteMessages(S.chat,m.slice(i,i+100)))});
  NTQ[n.id]=p.catch(()=>{});p.catch(e=>say('Не удалось удалить в облаке: '+err(e),1))}
/* заметки, которые раньше лежали только на устройстве, переезжают в облако */
function ntMigrate(){try{const k='ntx-'+(S.guestUser||'admin'),old=ld(k,[]);if(!Array.isArray(old)||!old.length)return;
  const have=new Set(NTD.map(x=>x.id));
  Promise.all(old.filter(o=>o&&o.id&&!have.has(o.id)).map(o=>{NTD.push(o);return ntPush(o)})).then(r=>{if(r.every(Boolean))localStorage.removeItem(k)})}catch(e){}}
/* заметки, сохранённые без шифрования, шифруются при первом открытии с ключом */
function ntUpgrade(){if(!NTK)return;const pl=new Set(NTS.filter(r=>r.u===ntMe()&&!r.e).map(r=>r.id));for(const n of NTD)if(pl.has(n.id))ntPush(n)}
/* подтянуть изменения с других устройств */
function ntSyncIn(){if(OFFLINE||Date.now()-NT.rt<60000)return;NT.rt=Date.now();
  refresh().then(async()=>{try{render()}catch(e){}if(NT.n||NT.d.size||NT.f||!$('#ntl'))return;NTD=(await ntMine()).filter(n=>n.k!=='g');ntPaint()}).catch(()=>{})}
function ntSheet(items){const o=document.createElement('div');o.id='ntsh';o.innerHTML='<div class="b">'+items.map((x,i)=>`<button data-i="${i}" class="${x.c||''}">${icon(x.ic)}<span>${esc(x.t)}</span></button>`).join('')+'</div>';document.body.appendChild(o);o.onclick=e=>{const b=e.target.closest('button');o.remove();if(b)items[b.dataset.i].fn()}}
async function openNotes(inner){
  if(!inner){const pf=fromSet,pp=admParent;const k=await ntKeyGet();if(k===undefined)return;
    NT.pf=pf;NT.pp=pp;NT.q='';NT.bad=0;NTD=(await ntMine()).filter(n=>n.k!=='g');
    if(NT.bad){say('Часть заметок не расшифровалась: возможно, пароль учётки менялся',1);NT.bad=0}
    ntMigrate();ntUpgrade();ntSyncIn()}
  NT.n=null;fromSet=NT.pf;admParent=NT.pp;
  openAdm(extName('notes'));
  $('#admb').innerHTML=`<div class="nts"><input id="ntq" type="search" placeholder="Поиск по заметкам" value="${esc(NT.q)}"><div id="ntl"></div></div><div id="ntfm" hidden><button id="ntfc">${icon('check')}Чек-лист</button><button id="ntfn">${icon('edit')}Заметка</button></div><button class="ntfab" id="ntadd" aria-label="Добавить">${icon('plus')}</button>`;
  $('#ntq').oninput=e=>{NT.q=e.target.value.trim();ntPaint()};
  $('#ntadd').onclick=()=>{const f=$('#ntfm');f.hidden=!f.hidden;$('#ntadd').classList.toggle('open',!f.hidden)};$('#ntfn').onclick=()=>ntNew('t');$('#ntfc').onclick=()=>ntNew('c');
  $('#ntl').onclick=e=>{const r=e.target.closest('[data-id]');if(r)ntOpen(r.dataset.id)};
  ntPaint();
}
function ntPaint(){const s=NT.q.toLowerCase();
  const L=NTD.filter(n=>!s||(n.t+' '+n.b+' '+n.c.map(i=>i.d).join(' ')).toLowerCase().includes(s)).sort((a,b)=>b.p-a.p||b.up-a.up);
  $('#ntl').innerHTML=L.length?L.map(n=>`<div class="f ntr${n.p?' pin':''}" data-id="${n.id}"><div class="th fo">${icon(n.k==='c'?'check':'edit')}</div><div><b>${esc(ntTtl(n))}</b><div class="m">${n.p?'★ ':''}${ntFmt(n.up)}${ntPrev(n)?' · '+esc(ntPrev(n)):''}</div></div></div>`).join(''):`<div class="empty"><span class="big">📝</span>${NT.q?'Ничего не найдено':'Здесь пока пусто.<br>Нажмите «+», чтобы создать заметку'}</div>`}
function ntNew(k){const t=Date.now(),n={id:t.toString(36)+Math.random().toString(36).slice(2,5),t:'',b:'',c:k==='c'?[{x:0,d:''}]:[],k,p:0,cr:t,up:t};NTD.push(n);ntOpen(n.id)}
const ntGrow=()=>{const x=$('#ntx');x.style.height='auto';x.style.height=Math.max(x.scrollHeight,innerHeight*.45)+'px'};
function ntPaintC(){$('#ntc').innerHTML=NT.n.c.map((x,i)=>`<div class="nci${x.x?' dn':''}"><button class="ncb" data-t="${i}" aria-label="Отметить">${x.x?'✓':''}</button><input data-i="${i}" value="${esc(x.d)}" placeholder="Пункт" autocomplete="off"><button class="ib2" data-r="${i}" aria-label="Удалить пункт">${icon('close')}</button></div>`).join('')+'<button id="ntcadd">+ Пункт</button>'}
function ntAddC(at){NT.n.c.splice(at,0,{x:0,d:''});ntPaintC();$('#ntc').querySelector(`[data-i="${at}"]`).focus();ntTouch()}
function ntView(){const c=NT.n.k==='c';$('#ntx').hidden=c;$('#ntc').hidden=!c;if(c)ntPaintC();else ntGrow()}
function ntOpen(id){const n=NTD.find(x=>x.id===id);if(!n)return;NT.n=n;fromSet=true;admParent=ntEnd;openAdm('Заметка');
  $('#admb').innerHTML=`<div class="nts"><input id="nte" placeholder="Название" maxlength="200" autocomplete="off"><textarea id="ntx" placeholder="Начните писать…"></textarea><div id="ntc"></div></div>`;
  $('#nte').value=n.t;$('#ntx').value=n.b;
  const m=$('#musq');m.hidden=false;m.textContent='⋯';m.onclick=ntMenu;
  $('#nte').oninput=e=>{n.t=e.target.value;ntTouch()};
  $('#ntx').oninput=e=>{n.b=e.target.value;ntGrow();ntTouch()};
  const c=$('#ntc');
  c.addEventListener('input',e=>{const i=e.target.dataset.i;if(i!=null){n.c[i].d=e.target.value;ntTouch()}});
  c.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.i!=null){e.preventDefault();ntAddC(+e.target.dataset.i+1)}});
  c.addEventListener('click',e=>{const t=e.target.closest('[data-t]'),r=e.target.closest('[data-r]');
    if(t){const x=n.c[t.dataset.t];x.x=x.x?0:1;ntTouch();ntPaintC()}else if(r){n.c.splice(r.dataset.r,1);ntTouch();ntPaintC()}else if(e.target.id==='ntcadd')ntAddC(n.c.length)});
  ntView();
  if(!n.t&&!n.b&&!n.c.some(i=>i.d))setTimeout(()=>(n.k==='c'?$('#nte'):$('#ntx')).focus(),60)}
function ntEnd(){const n=NT.n;if(!n)return;NT.n=null;$('#musq').textContent='?';
  const l=n.c.length;n.c=n.c.filter(i=>i.d.trim());if(n.c.length!==l)NT.d.add(n);
  if(!n.t.trim()&&!n.b.trim()&&!n.c.length){NTD=NTD.filter(x=>x!==n);if(n._m&&n._m.length)ntDel(n);NT.d.delete(n)}
  ntFlush();openNotes(1)}
/* поделиться картинкой: текст заметки на фоне приложения */
function ntWrap(c,txt,w){const out=[];for(const p of txt.split('\n')){if(!p){out.push('');continue}let line='';
  for(const word of p.split(' ')){const t=line?line+' '+word:word;if(c.measureText(t).width<=w){line=t;continue}if(line)out.push(line);line=word;
    while(c.measureText(line).width>w){let k=line.length;while(k>1&&c.measureText(line.slice(0,k)).width>w)k--;out.push(line.slice(0,k));line=line.slice(k)}}
  out.push(line)}return out}
async function ntImage(n){
  try{const W=1080,P=72,cv=document.createElement('canvas'),c=cv.getContext('2d'),F='Georgia,"Times New Roman",serif';
    c.font='700 58px '+F;const tl=n.t.trim()?ntWrap(c,n.t.trim(),W-2*P):[];
    c.font='38px '+F;let bl=[];
    if(n.k==='c')for(const i of n.c)ntWrap(c,i.d,W-2*P-60).forEach((s,j)=>bl.push({s,x:i.x,f:j===0}));
    else bl=ntWrap(c,n.b,W-2*P).map(s=>({s}));
    if(bl.length>200){bl=bl.slice(0,200);bl.push({s:'…'})}
    const th=tl.length*72,H=Math.max(1350,P+th+(tl.length?60:0)+bl.length*58+P+60);
    cv.width=W;cv.height=H;
    const g=c.createRadialGradient(W/2,H*.08,0,W/2,H*.08,H*.8);g.addColorStop(0,'#08201d');g.addColorStop(.55,'#041211');g.addColorStop(1,'#030c0b');c.fillStyle=g;c.fillRect(0,0,W,H);
    try{const m=/url\("([^"]+)"\)/.exec(getComputedStyle(document.documentElement).getPropertyValue('--bgfx'));
      if(m){const im=new Image();im.src=m[1];await im.decode();const k=Math.max(W/412,H/915),w=412*k,h=915*k;c.drawImage(im,(W-w)/2,H-h,w,h)}}catch(e){}
    let y=P;c.textBaseline='top';c.fillStyle='#e6efeb';c.font='700 58px '+F;
    for(const s of tl){c.fillText(s,P,y);y+=72}
    if(tl.length){y+=8;c.fillStyle='#2b3a34';c.fillRect(P,y,W-2*P,2);y+=40}
    c.font='38px '+F;
    for(const b of bl){
      if(n.k==='c'){if(b.f){c.strokeStyle='#5fc3a6';c.lineWidth=3;c.beginPath();c.arc(P+16,y+22,14,0,7);if(b.x){c.fillStyle='#5fc3a6';c.fill()}c.stroke();
        if(b.x){c.strokeStyle='#0b1713';c.beginPath();c.moveTo(P+9,y+22);c.lineTo(P+15,y+28);c.lineTo(P+24,y+16);c.stroke()}}
        c.fillStyle=b.x?'#8fa19a':'#e6efeb';c.fillText(b.s,P+60,y)}
      else{c.fillStyle='#e6efeb';c.fillText(b.s,P,y)}
      y+=58}
    c.font='28px system-ui,sans-serif';c.fillStyle='#8fa19a';c.fillText('Облачко · Заметки',P,H-P-24);
    const blob=await new Promise(r=>cv.toBlob(r,'image/png'));if(!blob)throw 0;
    const f=new File([blob],'zametka.png',{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:ntTtl(n)}).catch(()=>{});
    else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='zametka.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);say('Картинка сохранена')}
  }catch(e){say('Не удалось сделать картинку',1)}}
function ntMenu(){const n=NT.n;if(!n)return;ntSheet([...qkMenuItem(n),
  {t:n.p?'Открепить':'Закрепить',ic:'check',fn:()=>{n.p=n.p?0:1;ntTouch();say(n.p?'Закреплено':'Откреплено')}},
  {t:n.k==='c'?'Преобразовать в текст':'Преобразовать в чек-лист',ic:n.k==='c'?'edit':'check',fn:()=>{
    if(n.k==='t'){n.c=n.b.split('\n').filter(s=>s.trim()).map(d=>({x:0,d}));if(!n.c.length)n.c=[{x:0,d:''}];n.b='';n.k='c'}
    else{n.b=n.c.map(i=>i.d).join('\n');n.c=[];n.k='t';$('#ntx').value=n.b}
    ntTouch();ntView()}},
  {t:'Поделиться',ic:'up',fn:()=>ntSheet([
    {t:'Скопировать текст',ic:'copy',fn:()=>navigator.clipboard.writeText(ntText(n)).then(()=>say('Скопировано'),()=>say('Не удалось скопировать',1))},
    {t:'Поделиться картинкой',ic:'up',fn:()=>ntImage(n)}])},
  {t:'Удалить',ic:'trash',c:'del',fn:()=>{if(!confirm('Удалить заметку?'))return;NTD=NTD.filter(x=>x!==n);NT.n=null;ntDel(n);$('#musq').textContent='?';openNotes(1);say('Заметка удалена')}}])}
addEventListener('pagehide',()=>{if(NT.d.size)ntFlush()});

