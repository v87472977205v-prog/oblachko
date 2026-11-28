/* ===== ФАЙЛ ядро-03-состояние-доступ.js =====
   
   Состояние, тосты и журнал сообщений, иконки, пути, пароли, отпечаток пальца, журнал действий (очередь), список репозиториев.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
const C=new Map();
let repos=[],locks=[],users=[],JOUR=[],JENC=[],ORD=[],ORDIDX=new Map(),ownkey=null,OFFLINE=false;const UN=new Set();
let UNS=ld('tgun',{});
/* репозиторий запоминается открытым на устройстве, а вот папки - только пока приложение открыто (FUN) */
const FUN=new Map();
const isFk=k=>!!k.slice(k.indexOf('\n')+1);
const unAdd=(k,h)=>{UN.add(k);if(isFk(k)){FUN.set(k,h);return}UNS[k]=h;sv('tgun',UNS)};
const unDel=k=>{UN.delete(k);FUN.delete(k);delete UNS[k];sv('tgun',UNS)};
function syncUN(){UN.clear();for(const k of Object.keys(UNS)){if(isFk(k)){delete UNS[k];continue}const i=k.indexOf('\n'),l=lockOf(k.slice(0,i),k.slice(i+1));if(l&&l.h===UNS[k])UN.add(k);else delete UNS[k]}for(const[k,h]of[...FUN]){const i=k.indexOf('\n'),l=lockOf(k.slice(0,i),k.slice(i+1));if(l&&l.h===h)UN.add(k);else FUN.delete(k)}sv('tgun',UNS)}
let P=ld('tgmp',{sort:'new',view:'grid',repo:''}),sel=new Set(),selMode=false,booting=false,lp=false,pickMode='one';
if(P.sort==='no')P.sort='new';
const SORTS={new:(a,b)=>b.date-a.date,old:(a,b)=>a.date-b.date,name:(a,b)=>a.name.localeCompare(b.name,'ru',{numeric:true}),no:(a,b)=>a.no-b.no,my:(a,b)=>{const x=ORDIDX.get(a.id),y=ORDIDX.get(b.id);return x===undefined&&y===undefined?a.date-b.date:x===undefined?1:y===undefined?-1:x-y}};
const storageOK=(()=>{try{localStorage.setItem('_t','1');const ok=localStorage.getItem('_t')==='1';localStorage.removeItem('_t');return ok}catch(e){return false}})();
let toastT;
/* журнал сообщений: на экране зашифрованного репозитория они выводятся в «терминал» и остаются там */
const TLOG=[];
const tEsc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function termHTML(head){return '<div class="tl dim">&gt; '+tEsc(head)+'</div>'+TLOG.slice(-40).map(x=>'<div class="tl'+(x.e?' err':'')+'"><span class="tt">'+x.h+'</span> '+tEsc(x.t)+'</div>').join('')+'<div class="tl"><span class="cur">&#9608;</span></div>'}
function termDraw(){const el=document.querySelector('.lkterm');if(!el)return false;el.innerHTML=termHTML(el.dataset.h||'');el.scrollTop=el.scrollHeight;return true}
const say=(t,e)=>{
  for(const s of['#st','#sst','#bootm']){$(s).textContent=t;$(s).classList.toggle('err',!!e)}
  if(t){TLOG.push({t:String(t),e:!!e,h:new Date().toTimeString().slice(0,8)});if(TLOG.length>80)TLOG.shift();if(termDraw()){$('#toast').hidden=true;return}}
  const T=$('#toast');
  if(!ready||showSetup||!t||(!e&&/^(Подключаюсь|Ищу канал архива|Обновляю архив)/.test(String(t)))){T.hidden=true;return}
  T.textContent=t;T.classList.toggle('err',!!e);T.hidden=false;
  clearTimeout(toastT);toastT=setTimeout(()=>{T.hidden=true},e?7000:3000);
};
const err=x=>(x&&x.message)||String(x);

/* ---- пути папок: "Учёба/Латынь" ---- */
const IC={dumb:'M6 5v14M18 5v14M3 9v6M21 9v6M6 12h12',puzzle:'M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z',file:'M6 3h8l4 4v14H6zM14 3v4h4',users:'M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',menu:'M4 6h16M4 12h16M4 18h16',filter:'M3 5h18l-7 8v6l-4-2v-4z',edit:'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',copy:'M9 9h10v10H9zM5 15V5h10',sort:'M8 4v16M8 4L4 8M8 4l4 4M16 20V4M16 20l-4-4M16 20l4-4',grid:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',list:'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',refresh:'M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5',folderplus:'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 10v6M9 13h6',trash:'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',gear:'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4',lock:'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',down:'M6 9l6 6 6-6',play:'M8 5l11 7-11 7z',music:'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',prev:'M7 5v14M19 5l-9 7 9 7z',next:'M17 5v14M5 5l9 7-9 7z',rew:'M11 6l-7 6 7 6zM20 6l-7 6 7 6z',fwd:'M13 6l7 6-7 6zM4 6l7 6-7 6z',unlock:'M6 11h12v9H6zM8 11V8a4 4 0 0 1 7.6-1.7',cloud:'M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.2 4.5 4.5 0 0 0 7 18z',move:'M5 12h14M13 6l6 6-6 6',repo:'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',plus:'M12 5v14M5 12h14',check:'M5 12l5 5 9-10',close:'M6 6l12 12M18 6L6 18',back:'M15 5l-7 7 7 7',bell:'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',logout:'M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9',finger:'M12 11v4c0 2-.5 3.5-1.5 5M8 10a4 4 0 0 1 8 0v3c0 2.5-.5 4.5-1.5 6.5M5 12a7 7 0 0 1 14 0v1.5M8 13v1c0 2-.4 3.4-1 4.5'};
Object.assign(IC,{picture:'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM21 15l-3.1-3.1a2 2 0 0 0-2.8 0L6 21',download:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',bolt:'M13 2 3 14h9l-1 8 10-12h-9l1-8z',wifioff:'M12 20h.01M8.5 16.4a5 5 0 0 1 7 0M2 8.8a15 15 0 0 1 4.2-2.6M5 12.9a10 10 0 0 1 5.2-2.6M22 8.8a15 15 0 0 0-11.7-3.7M19 12.9a10 10 0 0 0-1.2-.9M2 2l20 20',expand:'M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3'});
Object.assign(IC,{thumbdown:'M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z',shuffle:'M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22M18 2l4 4-4 4M2 6h1.9c1.5 0 2.9.9 3.6 2.2M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8M18 14l4 4-4 4',repeat:'m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3',repeat1:'m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3M11 10h1v4',gauge:'m12 14 4-4M3.34 19a10 10 0 1 1 17.32 0',moon:'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',tree:'M12 22V6.8M7.5 22h9M12 16.5C9.5 16.5 7.5 15 6.8 12.1M12 13.5C14.5 13.5 16.5 12 17.3 9.3M10.2 4.8a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0M4.5 10.7a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0M16.1 7.8a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0',branch:'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM15 6a9 9 0 0 0-9 9',folder:'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'});
const icon=n=>`<svg class="i" viewBox="0 0 24 24"><path d="${IC[n]}"/></svg>`;
document.querySelectorAll('[data-ic]').forEach(el=>el.insertAdjacentHTML('afterbegin',icon(el.dataset.ic)));
function allPaths(r=R()){
  const s=new Set();
  for(const p of[...folders.filter(x=>x.repo===r).map(x=>x.path),...files.filter(f=>f.repo===r).map(f=>f.path)]){
    let acc='';for(const seg of p.split('/')){if(!seg)continue;acc=acc?acc+'/'+seg:seg;s.add(acc)}
  }
  return[...s].sort((a,b)=>a.localeCompare(b,'ru'));
}
const R=()=>P.repo||'';
const fabBlocked=()=>!!SHV||repoBlocked(R())||repoRO(R())||isLocked(R(),cur)||needKey(R());

/* ---- пароли (защита внутри приложения) ---- */
const lockOf=(r,p)=>locks.find(l=>l.r===r&&l.p===p);
const GU='👤';
const UR='🙋 ',JR='📝 ',OKR='🗝 ',ORR='🔢 ',AN='📣 ',CVX='🖼 ';
let ANN=[],CVRM=[],SHR=[],SHV=null;
const repoGuest=r=>{const x=r&&repos.find(q=>q.name===r);return !!(x&&x.guest&&(!x.owner||x.owner===S.guestUser))};
const guestRec=()=>S.viewer&&S.guestUser?users.find(x=>x.u===S.guestUser):null;
const repoBlocked=r=>{const g=guestRec();return !!(g&&g.r&&g.r.includes(r||''))};
/* только чтение: репозиторий виден, но загружать, менять и удалять в нём нельзя; canMake — может ли друг создавать свои репозитории */
const repoRO=r=>{const g=guestRec();return !!(g&&g.ro&&g.ro.includes(r||''))};
const roDeny=r=>{if(!repoRO(r))return false;say('Вы потеряли право публиковать и менять здесь свои данные',1);return true};
const canMake=()=>{const g=guestRec();return !(g&&g.nc)};
const visRepo=x=>!S.viewer||((!x.guest||!x.owner||x.owner===S.guestUser)&&!repoBlocked(x.name));
const mineRepo=x=>S.viewer?(!!(x.guest&&(!x.owner||x.owner===S.guestUser))&&!repoBlocked(x.name)):!x.guest;
const showRepo=x=>!!P.all||mineRepo(x)||!!(SHV&&x.name===SHV.r);
const shIn=f=>!SHV||!SHV.p||inTree(f.path,SHV.p);
const GOWN=()=>(S.viewer&&S.guestUser?'\n'+GU+' '+S.guestUser:S.viewer?'\n'+GU:'');
const canPw=r=>!S.viewer||repoGuest(r);
const noDel=r=>!!S.viewer&&locks.some(l=>l.r===r);
function blocker(r,p){
  if(SHV&&r===SHV.r&&(!SHV.p||inTree(p,SHV.p)))return null;
  const ch=[''];let acc='';for(const sg of p?p.split('/'):[]){acc=acc?acc+'/'+sg:sg;ch.push(acc)}
  for(const q of ch){const l=lockOf(r,q);if(l&&!UN.has(r+'\n'+q))return l}return null;
}
const isLocked=(r,p)=>!!blocker(r,p);
function c53(s,seed){let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return(h2>>>0).toString(16).padStart(8,'0')+(h1>>>0).toString(16).padStart(8,'0')}
const hashPw=(pw,salt)=>{let h=salt+pw;for(let i=0;i<2000;i++)h=c53(h,i&7);return salt+':'+h};
const BIOOK={};
function askPass(title,type='password',init='',bio,scr){return new Promise(res=>{
  const pwEl=$('#pw');$('#pwt').textContent=scr?scr.t:title;const i=$('#pwi');i.type=type;i.value=init;
  if(scr){pwEl.classList.add('scr');$('#pws').textContent=scr.s||'';$('#pws').hidden=!scr.s;i.placeholder='Введите код';$('#pwo').textContent='Разблокировать';$('#pwx').hidden=false;$('#pwx').onclick=()=>done(null)}
  pwEl.hidden=false;
  const bb=$('#pwb');bb.hidden=!bio;
  const done=v=>{gone=true;$('#pw').hidden=true;pwEl.classList.remove('scr');i.placeholder='';$('#pwo').textContent='ОК';$('#pwx').hidden=true;$('#pwx').onclick=null;$('#pwo').onclick=$('#pwc').onclick=bb.onclick=null;i.onkeydown=null;i.type='password';bb.hidden=true;res(v)};
  let busy=false,gone=false;
  const note=m=>{if(pwEl.classList.contains('scr')){$('#pws').textContent=m;$('#pws').hidden=false}else say(m,1);try{i.focus()}catch(x){}};
  const tryBio=async()=>{
    if(busy||gone)return;busy=true;
    try{
      for(let n=0;n<3&&!gone;n++){
        const t0=Date.now();
        try{
          if(await bio()){if(!gone)done(BIOOK)}
          else if(!gone)note('Отпечаток принят, но сохранённый ключ на этом устройстве пропал. Введите пароль шифрования один раз, отпечаток восстановится сам.');
          return;
        }
        catch(e){
          /* если окно отпечатка «моргнуло» и закрылось почти сразу - оно не успело открыться, пробуем снова сами */
          if(Date.now()-t0<900&&n<2){await new Promise(r=>setTimeout(r,350));continue}
          if(!gone)note(bioErr(e));
          return;
        }
      }
    }finally{busy=false}
  };
  if(bio){bb.innerHTML=icon('finger')+'<span>Открыть отпечатком</span>';bb.onclick=tryBio}
  else setTimeout(()=>i.focus(),60);
  $('#pwo').onclick=()=>done(i.value);$('#pwc').onclick=()=>done(null);i.onkeydown=e=>{if(e.key==='Enter')done(i.value)};
  if(bio)setTimeout(()=>requestAnimationFrame(tryBio),450);
})}
const uiPrompt=(t,d='')=>askPass(t,'text',d).then(v=>v===null?'':v);
/* ---- отпечаток пальца (WebAuthn, только на этом устройстве) ---- */
let BIO=ld('tgbio',{id:'',k:{},no:{}});if(!BIO.k)BIO.k={};if(!BIO.no)BIO.no={};
if(!BIO.e)BIO.e={};if(!BIO.eno)BIO.eno={};
const saveBio=()=>sv('tgbio',BIO);
/* открытый репозиторий запоминается на этом устройстве, закрыть его можно вручную в меню */
const BIOWEB=/^https:$/.test(location.protocol)||location.hostname==='localhost'||location.hostname==='127.0.0.1';
const BIOSUP=!!(window.PublicKeyCredential&&navigator.credentials&&window.isSecureContext&&BIOWEB);
let BIOSKIP=false;
const bioKey=(r,p)=>r+'\n'+p;
const bioOn=l=>{if(!(BIOSUP&&BIO.id&&l))return false;if(BIO.k[bioKey(l.r,l.p)]===l.h)return true;if(!l.p){return false}const rl=lockOf(l.r,'');return !!(rl&&BIO.k[bioKey(rl.r,'')]===rl.h)};
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
const bin2b=u=>btoa(String.fromCharCode(...new Uint8Array(u)));
const b2bin=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
async function bioCreate(){
  const mk=att=>navigator.credentials.create({publicKey:{challenge:rnd(32),rp:{name:'Облачко'},user:{id:rnd(16),name:'oblachko',displayName:'Облачко'},
    pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
    authenticatorSelection:Object.assign({userVerification:'required',residentKey:'discouraged'},att?{authenticatorAttachment:'platform'}:{}),timeout:120000}});
  let c;
  try{c=await mk(true)}catch(e){if(e&&(e.name==='NotSupportedError'||e.name==='ConstraintError'||e.name==='TypeError'))c=await mk(false);else throw e}
  if(!c)return false;BIO.id=bin2b(c.rawId);saveBio();return true;
}
async function bioAsk(){
  const a=await navigator.credentials.get({publicKey:{challenge:rnd(32),allowCredentials:[{type:'public-key',id:b2bin(BIO.id),transports:['internal']}],userVerification:'required',timeout:60000}});
  return !!a;
}
const bioErr=e=>{const n=(e&&e.name)||'';
  if(n==='NotAllowedError')return 'Отпечаток не подтверждён или окно закрыто. Попробуйте ещё раз.';
  if(n==='SecurityError')return 'Браузер не разрешает отпечаток на этом адресе (нужен https).';
  if(n==='NotSupportedError')return 'Этот телефон или браузер не поддерживает отпечаток для сайтов. Проверьте, что на телефоне настроен отпечаток и экран блокировки.';
  if(n==='InvalidStateError')return 'Ключ уже создан. Нажмите ещё раз.';
  return 'Не удалось включить отпечаток: '+(n?n+': ':'')+err(e)};
async function bioEnable(l){
  if(!BIOWEB){alert('Сайт открыт как локальный файл ('+location.protocol+'//). Отпечаток работает только когда сайт открыт по адресу https://… Выложите сайт на хостинг (например GitHub Pages) и откройте его по ссылке.');return false}
  if(!BIOSUP){alert('Отпечаток недоступен в этом браузере.');return false}
  try{if(!await bioCreate())return false}
  catch(e){alert(bioErr(e));return false}
  BIO.k[bioKey(l.r,l.p)]=l.h;delete BIO.no[bioKey(l.r,l.p)];saveBio();return true;
}
function bioOff(r,p){delete BIO.k[bioKey(r,p)];saveBio()}
const bioReady=()=>{
  if(!BIOWEB){alert('Сайт открыт как локальный файл ('+location.protocol+'//). Отпечаток работает только по адресу https://…');return false}
  if(!BIOSUP){alert('Отпечаток недоступен в этом браузере.');return false}
  return true};
/* отпечаток вместо пароля шифрования: ключ хранится как неэкспортируемый CryptoKey в IndexedDB */
const bioEOn=r=>{const e=encOf(r);return !!(BIOSUP&&BIO.id&&e&&BIO.e[r]===e.c)};
async function bioEPut(r){
  const e=encOf(r);if(!e||!KEYS[r]||!bioReady())return false;
  try{if(!BIO.id&&!await bioCreate())return false}catch(x){alert(bioErr(x));return false}
  try{await idbOp('m','readwrite',s=>s.put({id:'bk:'+r,k:KEYS[r]}))}catch(x){alert('Не удалось сохранить ключ на устройстве: '+err(x));return false}
  BIO.e[r]=e.c;delete BIO.eno[r];saveBio();return true;
}
async function bioELoad(r){
  if(!await bioAsk())return null;
  const rec=await idbOp('m','readonly',s=>s.get('bk:'+r));
  if(!rec||!rec.k)return null;
  const ee=encOf(r);await aesD(rec.k,b64d(ee.k||ee.c));return rec.k;
}
function bioEOff(r){delete BIO.e[r];saveBio();try{idbOp('m','readwrite',s=>s.delete('bk:'+r)).catch(()=>{})}catch(x){}}
/* репозиторий удалён: забываем все его отпечатки (пароль репозитория, пароли его папок, ключ шифрования) */
/* один переключатель на репозиторий: отпечаток открывает и пароль репозитория, и пароль шифрования; пароли остаются запасным вариантом */
const bioRepoState=r=>{const l=lockOf(r,''),e=encOf(r);if(!l&&!e)return null;return (!l||bioOn(l))&&(!e||bioEOn(r))};
async function bioRepoEnable(r){
  if(!bioReady())return false;
  const l=lockOf(r,''),e=encOf(r);
  BIOSKIP=true;
  try{
    if(l&&!UN.has(r+'\n')&&!await checkLock(l))return false;
    if(e&&!await ensureKey(r))return false;
    if(l&&!bioOn(l)&&!await bioEnable(l))return false;
    if(e&&!bioEOn(r)&&!await bioEPut(r))return false;
    return true;
  }finally{setTimeout(()=>{BIOSKIP=false},1000)}
}
function bioForget(r){const pre=r+'\n';for(const o of[BIO.k,BIO.no])for(const k of Object.keys(o))if(k.startsWith(pre))delete o[k];delete BIO.eno[r];bioEOff(r)}
async function checkLock(l){
  const useBio=bioOn(l);
  const pw=await askPass(l.p?'Пароль папки «'+base(l.p)+'»':'Пароль репозитория «'+(l.r||'Облако')+'»','password','',useBio?bioAsk:undefined,{t:l.p?'Папка заблокирована':'Репозиторий заблокирован',s:l.p?base(l.p):(l.r||'Облако')});
  if(pw===null)return false;
  if(pw===BIOOK){unAdd(l.r+'\n'+l.p,l.h);jlog('login','отпечаток: '+lkn(l.r,l.p));return true}
  if(hashPw(pw,l.h.split(':')[0])===l.h){unAdd(l.r+'\n'+l.p,l.h);escrowLock(l,pw);return true}
  jlog('badpw',lkn(l.r,l.p));alert('Неверный пароль');return false;
}
async function unlock(r,p){for(;;){const l=blocker(r,p);if(!l)return true;if(!await checkLock(l))return false}}
async function toggleLock(r,p){
  if(roDeny(r))return;
  if(!canPw(r)){alert('Менять пароли здесь нельзя: этот репозиторий создан не вами.');return}
  const l=lockOf(r,p);
  if(l){
    if(!UN.has(r+'\n'+p)&&!await checkLock(l))return;
    await withChat(()=>client.deleteMessages(S.chat,[l.id]));
    locks=locks.filter(x=>x!==l);unDel(r+'\n'+p);bioOff(r,p);jlog('unlock',lkn(r,p));say('Пароль снят');render();return;
  }
  const a=await askPass('Новый пароль');if(!a)return;
  const b=await askPass('Повторите пароль');if(a!==b){alert('Пароли не совпали');return}
  const h=hashPw(a,Math.random().toString(36).slice(2,10)),x=await encPw(a);
  const m=await withChat(()=>client.sendMessage(S.chat,LK+JSON.stringify(x?{r,p,h,x}:{r,p,h})));
  locks.push({id:m.id,r,p,h,x});unAdd(r+'\n'+p,h);jlog('lock',lkn(r,p));say('Пароль установлен');render();
}
let rpAnim=false,rswBusy=false;
function drawRepos(){
  try{extSync()}catch(e){}
  {const cb=$('#conb');if(cb){cb.hidden=!isAdmin();cb.style.display=isAdmin()?'':'none'}}
  try{const w=$('#whoami');w.hidden=!S.guestUser;w.textContent=S.guestUser?'Вы вошли как: '+S.guestUser+(ADXON?' · администратор':''):''}catch(e){}
  document.body.classList.toggle('own',isAdmin());
  $('#rsw').setAttribute('aria-checked',String(!!P.all));
  const L=[...(repoBlocked('')?[]:[['','Облако']]),...repos.filter(x=>!repoBlocked(x.name)&&(showRepo(x)||x.name===R())).map(x=>[x.name,x.name+(x.owner&&x.owner!==S.guestUser?' · '+x.owner:(S.viewer&&!x.guest?' · владелец':'')),!mineRepo(x)])];
  const dots='<svg class="i" viewBox="0 0 24 24" style="fill:currentColor;stroke:none"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>';
  const rowH=([r,t,oth])=>`<div class="rrow${oth?' oth':''}"><button class="rp${r===R()?' on':''}" data-r="${esc(r)}">${icon(r?'repo':'cloud')}<span>${esc(t)}</span>${lockOf(r,'')?`<span class="lkb">${icon(UN.has(r+'\n')?'unlock':'lock')}</span>`:''}</button><button class="rdots" data-rm="${esc(r)}" aria-label="Меню репозитория">${dots}</button></div>`;
  $('#repl').innerHTML=L.map(rowH).join('');
  if(rpAnim){const o=[...document.querySelectorAll('#repl .rrow.oth')];o.forEach(x=>x.classList.add('hid'));void $('#repl').offsetHeight;requestAnimationFrame(()=>requestAnimationFrame(()=>o.forEach(x=>x.classList.remove('hid'))))}
  $('#fsec').hidden=!cur;$('#lkf').hidden=!cur||!canPw(R());$('#mvf').hidden=!cur;$('#rnf').hidden=!cur;$('#cpf').hidden=!cur;
  if(cur)$('#lkf').lastChild.textContent=lockOf(R(),cur)?'Снять пароль с папки':'Запаролить папку';
}
let JQ=[],jT=0;
const jwho=()=>S.viewer?(S.guestUser||'гость'):'владелец';
const jn=f=>(f.enc||encOn(f.repo))?'зашифрованный файл':f.name;
function jlog(a,d){JQ.push({t:Date.now(),u:jwho(),a,d:String(d||'').slice(0,100)});clearTimeout(jT);jT=setTimeout(jflush,15000);if(JQ.length>300)JQ.shift();if(JQ.length>=6)jflush()}
const lkn=(r,p)=>(r||'Облако')+(p?' / '+p:'');
const JV=new Map();
function jonce(a,f){const k=a+f.id,n=Date.now();if(n-(JV.get(k)||0)<18e5)return;JV.set(k,n);jlog(a,jn(f)+' ('+lkn(f.repo,f.path)+')')}
let jBusy=false;
async function jflush(){
  if(jBusy||!JQ.length||OFFLINE||!client||!S.chat)return;
  jBusy=true;const b=JQ.splice(0,6);
  try{const p=await jpack(b);if(!p)throw 0;const m=await withChat(()=>client.sendMessage(S.chat,p));JOUR.push(...b.map(e=>({...e,mid:m.id})))}
  catch(e){JQ.unshift(...b);jBusy=false;return}
  jBusy=false;
  if(JQ.length)setTimeout(jflush,1500);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)jflush()});
let HIDAT=0;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){HIDAT=Date.now();return}
  if(HIDAT&&Date.now()-HIDAT>60000&&FUN.size){for(const k of FUN.keys())UN.delete(k);FUN.clear();try{render()}catch(e){}}
  HIDAT=0;
});
const ACT={up:'загрузил','del':'удалил',mv:'перенёс',ren:'переименовал','rep+':'создал репозиторий','ext+':'предложил расширение:',extok:'подключил расширение:',extno:'отказался от расширения:',extrn:'переименовал расширение:',extrv:'отозвал расширение:','rep-':'удалил репозиторий','fo+':'создал папку','fo-':'удалил папку',login:'вошёл',view:'открыл',play:'включил',dl:'скачал',lock:'поставил пароль:',unlock:'снял пароль:',chg:'сменил пароль:',badpw:'ввёл неверный пароль:','user+':'создал профиль','user-':'удалил профиль',ublock:'закрыл доступ пользователю',uunblock:'открыл доступ пользователю',rblock:'закрыл доступ к репозиторию:',runblock:'открыл доступ к репозиторию:',cp:'скопировал',enc:'шифрование:',ord:'изменил порядок файлов:',key:'создал ключ для друга',out:'вышел из аккаунта',jclr:'очистил журнал',own:'включил хранение паролей',ann:'опубликовал оповещение','sh+':'предложил доступ:','sh✓':'принял доступ:','sh-':'отказался от доступа:','shx':'отозвал доступ:','ann-':'удалил оповещение','lnk+':'создал ссылку на папку:',lnk:'открыл по ссылке:','lnk-':'отозвал ссылку:',rro:'оставил только чтение:',ncr:'запретил создавать репозитории:','ncr-':'разрешил создавать репозитории:'};
