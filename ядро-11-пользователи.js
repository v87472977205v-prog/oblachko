/* ===== ФАЙЛ ядро-11-пользователи.js =====
   
   Пользователи, пароли друзей, мастер-пароль владельца, доступ, регистрация, вход гостя.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- пользователи и хранение паролей для владельца ---- */
let OWNPRIV=null,OWNPRIVS=[],OKS=[];
async function ownDec(b){let le=null;for(const k of(OWNPRIVS.length?OWNPRIVS:[OWNPRIV])){try{return await crypto.subtle.decrypt({name:'RSA-OAEP'},k,b)}catch(e){le=e}}throw le||new Error('нет ключа')}
async function setupOwnerKey(){
  if(!hasCrypto()){alert('Недоступно: при таком способе открытия файла браузер не даёт доступ к криптографии. Откройте файл через file:// или с хостинга.');return}
  const a=await askPass('Мастер-пароль владельца (им защищаются пароли друзей)');if(!a)return;
  const b=await askPass('Повторите мастер-пароль');if(a!==b){alert('Пароли не совпали');return}
  const kp=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
  const pub=await crypto.subtle.exportKey('jwk',kp.publicKey),pk=new Uint8Array(await crypto.subtle.exportKey('pkcs8',kp.privateKey)),salt=crypto.getRandomValues(new Uint8Array(16)),k=await deriveKey(a,salt),w=b64e(await aesE(k,pk));
  const m=await withChat(()=>client.sendMessage(S.chat,OKR+JSON.stringify({pub,s:b64e(salt),w})));
  ownkey={id:m.id,pub,s:b64e(salt),w};OWNPRIV=kp.privateKey;OWNPRIVS=[OWNPRIV];OKS=[ownkey];jlog('own','');say('Хранение паролей включено');drawUsers();
}
async function unlockOwner(){
  if(OWNPRIV)return true;if(!ownkey)return false;
  const a=await askPass('Мастер-пароль владельца');if(a===null)return false;
  /* ключей владельца в канале может быть несколько (например, включали хранение дважды): пробуем открыть все этим паролем */
  const ps=[];
  for(const o of(OKS.length?OKS:[ownkey])){try{const k=await deriveKey(a,b64d(o.s));ps.push(await crypto.subtle.importKey('pkcs8',await aesD(k,b64d(o.w)),{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']))}catch(e){}}
  if(!ps.length){alert('Неверный мастер-пароль');return false}
  OWNPRIV=ps[0];OWNPRIVS=ps;try{await jDecryptAll()}catch(e){}return true
}
async function encPw(pw){
  if(!ownkey||!hasCrypto())return '';
  try{const pk=await crypto.subtle.importKey('jwk',ownkey.pub,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);return b64e(new Uint8Array(await crypto.subtle.encrypt({name:'RSA-OAEP'},pk,te.encode(pw))))}catch(e){return ''}
}
/* Копия пароля для администратора. Для записей, созданных до этой функции, копия дописывается сама,
   когда друг в следующий раз вводит свой пароль (раньше пароль знал только он). Сбой тут ни на что не влияет. */
const ESCB=new WeakSet();
async function escrowLock(l,pw){
  try{
    if(!S.viewer||!ownkey||l.x||ESCB.has(l)||!canPw(l.r))return;ESCB.add(l);
    const x=await encPw(pw);if(!x)return;
    const m=await withChat(()=>client.sendMessage(S.chat,LK+JSON.stringify({r:l.r,p:l.p,h:l.h,x})));
    try{await withChat(()=>client.deleteMessages(S.chat,[l.id]))}catch(e){}
    l.id=m.id;l.x=x;
  }catch(e){}
}
async function escrowEnc(r,pw){
  try{
    const e=encOf(r);if(!S.viewer||!ownkey||!e||e.x||ESCB.has(e)||!canPw(r))return;ESCB.add(e);
    const x=await encPw(pw);if(!x)return;
    await setRepoEnc(r,{...e,x});
  }catch(e){}
}
async function jpack(b){
  if(!ownkey)return JR+JSON.stringify(b);
  if(!hasCrypto())return '';
  try{
    const pk=await crypto.subtle.importKey('jwk',ownkey.pub,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
    const ak=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);
    const wk=new Uint8Array(await crypto.subtle.encrypt({name:'RSA-OAEP'},pk,await crypto.subtle.exportKey('raw',ak)));
    return JR+JSON.stringify({k:b64e(wk),d:b64e(await aesE(ak,te.encode(JSON.stringify(b))))});
  }catch(e){return ''}
}
async function jDecryptAll(){
  if(!OWNPRIV||!JENC.length)return;
  const rest=[];
  for(const x of JENC){
    try{
      const raw=await ownDec(b64d(x.k)),ak=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
      for(const e of JSON.parse(td.decode(await aesD(ak,b64d(x.d)))))JOUR.push({...e,mid:x.mid});
    }catch(e){rest.push(x)}
  }
  JENC=rest;
}
async function jEncryptOld(){
  const old=JOUR.filter(e=>e.pl);if(!old.length)return;
  const mids=[...new Set(old.map(e=>e.mid))],fresh=[];
  for(let i=0;i<old.length;i+=6){
    const b=old.slice(i,i+6).map(({t,u,a,d})=>({t,u,a,d})),p=await jpack(b);if(!p)throw new Error('Не удалось зашифровать журнал');
    const m=await withChat(()=>client.sendMessage(S.chat,p));fresh.push(...b.map(e=>({...e,mid:m.id})));
  }
  for(let i=0;i<mids.length;i+=100){const ch=mids.slice(i,i+100);await withChat(()=>client.deleteMessages(S.chat,ch))}
  JOUR=[...JOUR.filter(e=>!e.pl),...fresh];
}
function drawUsers(){
  if(!isAdmin())return;
  const lastIn=u=>{let t=0;for(const e of JOUR)if(e.a==='login'&&e.u===u&&e.t>t)t=e.t;return t};
  let h='';
  if(!ownkey)h+='<div class="uc"><div class="un">Пароли друзей</div><div class="us">Чтобы восстановить доступ, если друг потеряет пароли (вход, шифрование репозиториев, коды папок), включите хранение паролей. Они шифруются так, что прочитать их можете только вы, по мастер-паролю. Старые пароли дописываются сами, когда друг вводит их в следующий раз.</div><div class="row"><button class="p" id="mkk">Включить хранение паролей</button></div></div>';
  else if(OKS.length>1)h+=`<div class="uc"><div class="us">Ключей владельца в канале: ${OKS.length}, открыто этим паролем: ${OWNPRIVS.length}. Пароль, записанный под ключом, который не открылся, показать нельзя.</div></div>`;
  if(ownkey&&!OWNPRIV)h+='<div class="uc"><div class="us">Пароли защищены мастер-паролем.</div><div class="row"><button id="unl2">Показать пароли</button></div></div>';
  if(!users.length)h+='<div class="empty">Друзья ещё не входили</div>';
  const pwLine=(lbl,x)=>`<div class="us">${lbl}: ${OWNPRIV&&x?`<code data-e="${esc(x)}">…</code>`:x?'скрыт':'не сохранён'}</div>`;
  for(const u of users){
    const rs=repos.filter(x=>x.owner===u.u),
      rpl=rs.map(rp=>{
        const lk=locks.filter(l=>l.r===rp.name).sort((a,b)=>(a.p||'').localeCompare(b.p||'')),nm=esc(rp.name||'Облако');
        let o='';
        if(rp.enc)o+=pwLine('🔐 «'+nm+'» · пароль шифрования',rp.enc.x);
        for(const l of lk)o+=pwLine('🔒 «'+nm+'» · '+(l.p?'код папки «'+esc(l.p)+'»':'пароль репозитория'),l.x);
        return o;
      }).join(''),fl=files.filter(f=>rs.some(x=>x.name===f.repo)),sz=fl.reduce((a,f)=>a+(f.size||0),0),li=lastIn(u.u);
    h+=`<div class="uc"><div class="un">${esc(u.u)}${u.b?' · 🚫 доступ закрыт':''}</div>${(u.r&&u.r.length)?'<div class="us">Закрыт доступ к: '+u.r.map(x=>esc(x||'Облако')).join(', ')+'</div>':''}${(u.ro&&u.ro.length)?'<div class="us">Только чтение: '+u.ro.map(x=>esc(x||'Облако')).join(', ')+'</div>':''}${u.nc?'<div class="us">Создавать репозитории нельзя</div>':''}<div class="us">Репозиториев: ${rs.length} · файлов: ${fl.length} · ${size(sz)}</div><div class="us">${u.c?'Создан '+new Date(u.c).toLocaleDateString('ru'):''}${li?' · был '+new Date(li).toLocaleString('ru',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):''}</div><div class="us">Пароль: ${OWNPRIV&&u.e?`<code data-e="${esc(u.e)}">…</code>`:u.e?'скрыт':'не сохранён (профиль создан до включения хранения)'}</div>${rpl?'<div class="un" style="font-size:13px;margin-top:6px">Репозитории и коды</div>'+rpl:''}<div class="row"><button data-ba="${esc(u.u)}">Доступ</button><button class="del" data-du="${esc(u.u)}">Удалить профиль</button></div></div>`;
  }
  $('#admb').innerHTML=h;
  if(OWNPRIV)document.querySelectorAll('#admb code[data-e]').forEach(async c=>{try{c.textContent=await ownDec(b64d(c.dataset.e)).then(b=>td.decode(b))}catch(e){c.textContent='не открывается этим мастер-паролем'}});
}
function usrUniq(a){const m=new Map();for(const x of a){const q=m.get(x.u);if(!q||q.id<x.id)m.set(x.u,x)}return[...m.values()]}
async function saveUserRec(u){
  const rec={u:u.u,h:u.h,e:u.e,c:u.c};if(u.b)rec.b=1;if(u.r&&u.r.length)rec.r=u.r;if(u.ro&&u.ro.length)rec.ro=u.ro;if(u.nc)rec.nc=1;
  const m=await withChat(()=>client.sendMessage(S.chat,UR+JSON.stringify(rec)));
  try{await withChat(()=>client.deleteMessages(S.chat,[u.id]))}catch(x){}
  u.id=m.id;
}
async function toggleBlock(name){
  if(!isAdmin())return;
  const u=users.find(x=>x.u===name);if(!u)return;
  const on=!u.b;
  if(!confirm(on?'Закрыть доступ пользователю «'+name+'» полностью? Он не сможет войти в облако, пока вы не откроете доступ. Его репозитории и файлы останутся.':'Открыть полный доступ пользователю «'+name+'»?'))return;
  const old=u.b;u.b=on?1:0;
  try{await saveUserRec(u)}catch(x){u.b=old;throw x}
  jlog(on?'ublock':'uunblock',name);say(on?'Доступ закрыт':'Доступ открыт');
}
async function setRepoLevel(name,repo,lvl){
  if(!isAdmin())return;
  const u=users.find(x=>x.u===name);if(!u)return;
  const lbl=repo||'Облако',oc=u.r||[],oro=u.ro||[],nowL=oc.includes(repo)?'closed':oro.includes(repo)?'ro':'full';
  if(nowL===lvl)return;
  const txt={full:'Дать «'+name+'» полный доступ к «'+lbl+'»: смотреть, загружать, менять и удалять?',ro:'Оставить «'+name+'» в «'+lbl+'» только чтение? Он будет видеть и открывать файлы, но не сможет загружать, менять и удалять.',closed:'Закрыть «'+name+'» доступ к «'+lbl+'»? Файлы останутся на месте, он просто перестанет их видеть.'}[lvl];
  if(!confirm(txt))return;
  u.r=oc.filter(x=>x!==repo);u.ro=oro.filter(x=>x!==repo);
  if(lvl==='closed')u.r.push(repo);else if(lvl==='ro')u.ro.push(repo);
  try{await saveUserRec(u)}catch(x){u.r=oc;u.ro=oro;throw x}
  jlog(lvl==='closed'?'rblock':lvl==='ro'?'rro':'runblock',name+' → '+lbl);
  say(lvl==='closed'?'Доступ к «'+lbl+'» закрыт':lvl==='ro'?'«'+lbl+'»: только чтение':'Полный доступ к «'+lbl+'» открыт');
}
async function toggleCreate(name){
  if(!isAdmin())return;
  const u=users.find(x=>x.u===name);if(!u)return;
  const on=!u.nc;
  if(!confirm(on?'Запретить «'+name+'» создавать новые репозитории? Уже созданные останутся.':'Разрешить «'+name+'» создавать репозитории?'))return;
  const old=u.nc;u.nc=on?1:0;
  try{await saveUserRec(u)}catch(x){u.nc=old;throw x}
  jlog(on?'ncr':'ncr-',name);say(on?'Создание репозиториев запрещено':'Создание репозиториев разрешено');
}
async function toggleRepoBlock(name,repo){
  if(!isAdmin())return;
  const u=users.find(x=>x.u===name);if(!u)return;
  const cur=u.r||[],on=!cur.includes(repo),lbl=repo||'Облако';
  if(!confirm(on?'Закрыть пользователю «'+name+'» доступ к «'+lbl+'»? Файлы останутся на месте, он просто перестанет их видеть.':'Открыть пользователю «'+name+'» доступ к «'+lbl+'»?'))return;
  u.r=on?[...cur,repo]:cur.filter(x=>x!==repo);
  try{await saveUserRec(u)}catch(x){u.r=cur;throw x}
  jlog(on?'rblock':'runblock',name+' → '+lbl);say(on?'Доступ к «'+lbl+'» закрыт':'Доступ к «'+lbl+'» открыт');
}
let ACCFROM=null;
function openAccess(name){
  if(!isAdmin())return;
  const u=users.find(x=>x.u===name);if(!u){drawUsers();return}
  fromSet=true;admParent=ACCFROM||openUsers;openAdm('Доступ: '+name);
  const bl=u.r||[],ro=u.ro||[],q=esc(u.u);
  let h='<div class="uc"><div class="un">Полный доступ</div><div class="us">'+(u.b?'Закрыт: войти в облако пользователь не может.':'Открыт: пользователь входит как обычно.')+'</div><div class="row"><button class="chip'+(u.b?' on':'')+'" data-bu="'+q+'">'+(u.b?'Открыть полный доступ':'Закрыть полный доступ')+'</button></div></div>';
  h+='<div class="uc"><div class="un">Создание репозиториев</div><div class="us">'+(u.nc?'Запрещено: свои репозитории пользователь создавать не может.':'Разрешено: пользователь может создавать свои репозитории, даже если в других ему доступ закрыт.')+'</div><div class="row"><button class="chip'+(u.nc?' on':'')+'" data-nc="'+q+'">'+(u.nc?'Разрешить создавать':'Запретить создавать')+'</button></div></div>';
  h+='<div class="us" style="margin:6px 4px 8px">Доступ к репозиториям</div>';
  const row=(r,t,sub)=>{
    const L=bl.includes(r)?'closed':ro.includes(r)?'ro':'full',v=esc(u.u+'\n'+r+'\n');
    const b=(l,tx)=>'<button class="chip'+(L===l?' on':'')+'" data-bl="'+v+l+'">'+tx+'</button>';
    return '<div class="uc"><div class="un">'+esc(t)+'</div>'+(sub?'<div class="us">'+esc(sub)+'</div>':'')+'<div class="us">Сейчас: '+({full:'полный доступ',ro:'только чтение',closed:'закрыт'})[L]+'</div><div class="row">'+b('full','Полный')+b('ro','Только чтение')+b('closed','Закрыт')+'</div></div>';
  };
  h+=row('','Облако','общее для всех');
  for(const x of repos)h+=row(x.name,x.name,x.owner?'владелец: '+x.owner:'');
  $('#admb').innerHTML=h;
}
/* отдельное меню консоли: у кого какой доступ */
function openAccList(){
  if(!isAdmin())return;
  ACCFROM=openAccList;fromSet=true;admParent=drawConsole;openAdm('Доступ');
  let h='<div class="us" style="margin:4px 4px 10px">Выберите пользователя: можно закрыть вход целиком, закрыть или оставить только чтение в отдельных репозиториях и запретить создавать репозитории.</div>';
  if(!users.length)h+='<div class="empty">Друзья ещё не входили</div>';
  for(const u of users){
    const cl=(u.r||[]).length,ro=(u.ro||[]).length;
    h+='<div class="uc"><div class="un">'+esc(u.u)+(u.b?' · 🚫 вход закрыт':'')+'</div><div class="us">'+(cl?'Закрыто репозиториев: '+cl+' · ':'')+(ro?'Только чтение: '+ro+' · ':'')+(u.nc?'создавать репозитории нельзя':'создавать репозитории можно')+'</div><div class="row"><button class="p" data-ba="'+esc(u.u)+'">Настроить доступ</button></div></div>';
  }
  $('#admb').innerHTML=h;
}
/* если администратор закрыл доступ, пока пользователь в приложении: показываем заглушку при ближайшем обновлении */
function guestBlockedCheck(){
  if(!S.viewer||!S.guestUser||document.getElementById('blkscr'))return;
  const r=users.find(x=>x.u===S.guestUser);if(!r||!r.b)return;
  S.guestUser='';S.guestHash='';sv('tgm',S);
  try{if(U.on){U.cancel=true;UQ=[]}}catch(e){}
  const o=document.createElement('div');o.id='blkscr';
  o.style.cssText='position:fixed;inset:0;z-index:99999;background:#0b1f1a;color:#e8f3ef;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;font:16px system-ui,sans-serif';
  o.innerHTML='<div style="font-size:20px;font-weight:700">Доступ закрыт</div><div>Вы потеряли доступ к облаку.</div>';
  document.body.appendChild(o);
}
const openUsers=()=>{if(!isAdmin())return;ACCFROM=openUsers;fromSet=true;admParent=drawConsole;openAdm('Пользователи');drawUsers()};
$('#admb').onchange=e=>{if(e.target.id==='jsel')drawJournal(e.target.value)};
$('#admb').onclick=async e=>{
  const t=e.target;
  try{
    if(t.id==='mkk')await setupOwnerKey();
    else if(t.id==='unl2'){if(await unlockOwner())drawUsers()}
    else if(t.id==='jun'){if(await unlockOwner())drawJournal('')}
    else if(t.id==='jold'){t.disabled=true;t.textContent='Шифрую…';try{await jEncryptOld();say('Журнал зашифрован')}finally{drawJournal('')}}
    else if(t.dataset.ba){openAccess(t.dataset.ba)}
    else if(t.dataset.bu){await toggleBlock(t.dataset.bu);openAccess(t.dataset.bu)}
    else if(t.dataset.bl){const[a,b,c]=t.dataset.bl.split('\n');await setRepoLevel(a,b,c);openAccess(a)}
    else if(t.dataset.nc){await toggleCreate(t.dataset.nc);openAccess(t.dataset.nc)}
    else if(t.dataset.br){const k=t.dataset.br.indexOf('\n');await toggleRepoBlock(t.dataset.br.slice(0,k),t.dataset.br.slice(k+1));openAccess(t.dataset.br.slice(0,k))}
    else if(t.dataset.du){
      if(!confirm('Удалить профиль «'+t.dataset.du+'»? Его репозитории и файлы останутся. Друг сможет заново занять это имя.'))return;
      const u=users.find(x=>x.u===t.dataset.du);if(u){await withChat(()=>client.deleteMessages(S.chat,[u.id]));users=users.filter(x=>x!==u);jlog('user-',u.u)}drawUsers();
    }else if(t.id==='jclr'){
      if(!confirm('Очистить весь журнал действий?'))return;
      const ids=[...new Set([...JOUR,...JENC].map(x=>x.mid).filter(Boolean))];
      for(let i=0;i<ids.length;i+=100){const ch=ids.slice(i,i+100);await withChat(()=>client.deleteMessages(S.chat,ch))}
      JOUR=[];JENC=[];jlog('jclr','');drawJournal('');
    }
  }catch(x){say(err(x),1)}
};
function regScreen(check){return new Promise(res=>{
  const R=$('#reg'),n=$('#rgn'),p=$('#rgp'),q=$('#rgp2'),ok=$('#rgok'),er=$('#rge');
  n.value=p.value=q.value='';er.textContent='';R.hidden=false;R.scrollTop=0;setTimeout(()=>n.focus(),80);
  let busy=false;
  const done=v=>{R.hidden=true;ok.onclick=null;[n,p,q].forEach(i=>i.onkeydown=null);p.value=q.value='';res(v)};
  const go=async()=>{
    if(busy)return;busy=true;ok.disabled=true;er.textContent='';
    try{const m=await check(n.value.trim(),p.value,q.value);if(m){er.textContent=m;return}done(true)}
    catch(x){er.textContent=err(x)}
    finally{busy=false;ok.disabled=false}
  };
  ok.onclick=go;
  n.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();p.focus()}};
  p.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();q.focus()}};
  q.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();go()}};
})}
async function guestGate(){
  const rec=users.find(x=>x.u===S.guestUser);
  if(rec&&rec.b){S.guestUser='';S.guestHash='';sv('tgm',S);throw new Error('Вы потеряли доступ к облаку')}
  if(S.guestUser&&rec&&rec.h===S.guestHash)return true;
  S.guestUser='';S.guestHash='';
  const ok=await regScreen(async(raw,a,b)=>{
    const name=clean(raw||'').trim();
    if(!name)return 'Введите имя пользователя';
    if(!/^[\p{L}\p{N}_.-]{2,24}$/u.test(name))return 'Имя: от 2 до 24 символов, буквы, цифры, _ . -';
    const ex=users.find(x=>x.u.toLowerCase()===name.toLowerCase());
    if(ex){
      if(ex.b)return 'Вы потеряли доступ к облаку';
      if(!a)return 'Введите пароль';
      if(hashPw(a,ex.h.split(':')[0])!==ex.h)return 'Неверный пароль';
      try{await ntLogin(ex.u,a)}catch(e){}S.guestUser=ex.u;S.guestHash=ex.h;sv('tgm',S);return null;
    }
    if(!a)return 'Придумайте пароль';
    if(a!==b)return 'Пароли не совпали';
    const h=hashPw(a,Math.random().toString(36).slice(2,10)),e=await encPw(a),c=Date.now();
    const m=await withChat(()=>client.sendMessage(S.chat,UR+JSON.stringify({u:name,h,e,c})));
    users.push({id:m.id,u:name,h,e,c});try{await ntLogin(name,a)}catch(e){}S.guestUser=name;S.guestHash=h;sv('tgm',S);jlog('user+',name);return null;
  });
  return !!ok;
}
async function firstRepo(){
  if(S.rp||S.viewer||repos.length||files.length||!canMake())return;S.rp=1;sv('tgm',S);
  const n=clean(await uiPrompt('Создайте первый репозиторий. Название (или «Отмена» — останется «Облако»):','Мой репозиторий')||'');if(!n)return;
  try{await makeRepo(n)}catch(x){say(err(x),1)}
}


