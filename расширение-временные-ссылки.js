/* ===== ФАЙЛ расширение-временные-ссылки.js =====
   
   Расширение «Временные ссылки».
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- Временные ссылки: расширение «links» (🔗) ----
   Создаёт владелец или пользователь с подключённым расширением (Расширения → «Временные ссылки»): папка, срок, число переходов на отдельном экране. Ссылку открывают зарегистрированные в Облачке:
   видят эту папку (с вложенными) только на просмотр и скачивание. Срок и счётчик проверяет приложение; запись правила лежит в канале (🔗).
   Для зашифрованного репозитория ключ файлов кладётся в запись (владелец вводит пароль шифрования при создании). */
const shUrl=id=>location.href.split('#')[0]+'#sh='+id;
const shSt=s=>s.x?'отозвана':(s.e&&Date.now()>s.e)?'срок вышел':(s.m&&s.c>=s.m)?'переходы закончились':'действует';
async function shPut(s){
  const o={i:s.i,r:s.r,p:s.p,e:s.e,m:s.m,c:s.c,x:s.x?1:0,t:s.t};if(s.k)o.k=s.k;if(s.o)o.o=s.o;
  const m=await withChat(()=>client.sendMessage(S.chat,'🔗 '+JSON.stringify(o)));
  if(s.id)await withChat(()=>client.deleteMessages(S.chat,[s.id]));
  s.id=m.id;return s;
}
const SH_TERM=[{l:'Без срока',h:0},{l:'1 час',h:1},{l:'3 часа',h:3},{l:'6 часов',h:6},{l:'12 часов',h:12},{l:'1 день',h:24},{l:'2 дня',h:48},{l:'3 дня',h:72},{l:'7 дней',h:168},{l:'14 дней',h:336},{l:'30 дней',h:720}];
const SH_VIS=[{l:'Без лимита',n:0},{l:'1 раз',n:1},{l:'2 раза',n:2},{l:'3 раза',n:3},{l:'5 раз',n:5},{l:'10 раз',n:10},{l:'20 раз',n:20},{l:'50 раз',n:50},{l:'100 раз',n:100}];
const SH_ROW=50;let SHN=null,SHP={f:false,p:null};
const shCan=()=>isAdmin()||(!!S.guestUser&&extState('links',S.guestUser)==='a');
const shMine=s=>isAdmin()||(!!S.guestUser&&s.o===S.guestUser);
function openShares(){
  if(!shCan())return;
  openAdm(extName('links'));
  const L=SHR.filter(shMine).sort((a,b)=>b.t-a.t);
  $('#admb').innerHTML='<div style="padding:10px 14px"><div class="uc"><div class="us">Ссылку открывают только те, кто уже зарегистрирован в Облачке. Они видят эту папку и могут только смотреть и скачивать.</div><div class="row"><button class="p" id="shnew">Новая ссылка</button></div></div>'+(L.length?L.map(s=>`<div class="uc"><div class="un">${esc(kpName(s.r,s.p))}</div><div class="us">${shSt(s)} · переходов: ${s.c}${s.m?' из '+s.m:''}${s.e?' · до '+new Date(s.e).toLocaleString('ru'):''}${isAdmin()&&s.o?' · от '+esc(s.o):''}</div><div class="row"><button data-shc="${s.i}">Копировать</button>${shSt(s)==='действует'?`<button data-shx="${s.i}">Отозвать</button>`:''}<button class="del" data-shd="${s.i}">Удалить</button></div></div>`).join(''):'<div class="us" style="padding:10px 0">Ссылок пока нет</div>')+'</div>';
}
/* настройка новой ссылки — отдельный экран: папка и два «барабана» (срок, число переходов) с щелчками при прокрутке */
function shNew(){
  if(!shCan())return;
  SHP={f:fromSet,p:admParent};
  SHN={r:R(),p:cur,t:5,v:4};
  shSetup();
}
function shBack(){fromSet=SHP.f;admParent=SHP.p;SHN=null;openShares()}
function shSum(){
  const T=SH_TERM[SHN.t],V=SH_VIS[SHN.v],el=$('#shsum');if(!el)return;
  el.textContent=(T.h?'Действует до '+new Date(Date.now()+T.h*36e5).toLocaleString('ru',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}):'Без срока')+' · '+(V.n?'откроют не более '+V.n+(V.n===1?' раза':' раз'):'число переходов не ограничено');
}
function shWheel(box,key,items){
  const lst=box.querySelector('.shl');let last=SHN[key],tm=0;
  lst.innerHTML=items.map((x,i)=>`<div class="shi${i===last?' on':''}" data-i="${i}">${esc(x.l)}</div>`).join('');
  const paint=i=>{[...lst.children].forEach((c,j)=>c.classList.toggle('on',j===i))};
  requestAnimationFrame(()=>{lst.scrollTop=last*SH_ROW});
  lst.addEventListener('scroll',()=>{
    const i=Math.max(0,Math.min(items.length-1,Math.round(lst.scrollTop/SH_ROW)));
    if(i===last)return;
    last=i;SHN[key]=i;paint(i);shSum();
    try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}
  },{passive:true});
  lst.addEventListener('click',e=>{const c=e.target.closest('.shi');if(c)lst.scrollTo({top:(+c.dataset.i)*SH_ROW,behavior:'smooth'})});
}
function shSetup(){
  if(!shCan()||!SHN)return;
  fromSet=true;admParent=shBack;openAdm('Новая ссылка');
  $('#admb').innerHTML=`<div class="shs"><button class="shf" id="shfold">${icon('repo')}<span><small>Папка</small><b>${esc(kpName(SHN.r,SHN.p))}</b></span>${icon('down')}</button><div class="shw"><div class="shc"><div class="sht">Срок</div><div class="shd" id="shdt"><div class="shsel"></div><div class="shl"></div></div></div><div class="shc"><div class="sht">Переходов</div><div class="shd" id="shdv"><div class="shsel"></div><div class="shl"></div></div></div></div><div class="us shsum" id="shsum"></div><div class="row"><button class="p" id="shgo">Создать ссылку</button></div></div>`;
  shWheel($('#shdt'),'t',SH_TERM);shWheel($('#shdv'),'v',SH_VIS);shSum();
}
async function shMake(btn){
  if(!shCan()||!SHN)return;
  const{r,p}=SHN,h=SH_TERM[SHN.t].h,n=SH_VIS[SHN.v].n;
  btn.disabled=true;
  try{
    if(!await unlock(r,p))return;
    let k='';
    if(r&&encOf(r)){
      const pw=await askPass('Пароль шифрования «'+r+'»: он нужен, чтобы файлы открывались по ссылке');if(pw===null)return;
      let o;try{o=await openEnc(pw,encOf(r))}catch(x){alert('Неверный пароль шифрования');return}
      k=b64e(o.raw||await deriveRaw(pw,o.salt));
    }
    const s={i:Math.random().toString(36).slice(2,10),r,p,e:h?Date.now()+h*36e5:0,m:n,c:0,x:0,t:Date.now(),k,o:isAdmin()?'':S.guestUser};
    await shPut(s);SHR.push(s);jlog('lnk+',kpName(r,p));
    try{await navigator.clipboard.writeText(shUrl(s.i));say('Ссылка скопирована')}catch(e){prompt('Скопируйте ссылку',shUrl(s.i))}
    shBack();
  }catch(x){say(err(x),1)}
  finally{btn.disabled=false}
}
$('#admb').addEventListener('click',async e=>{
  const t=e.target.closest('#shnew,#shfold,#shgo,[data-shc],[data-shx],[data-shd]');if(!t||!shCan())return;
  try{
    if(t.id==='shnew'){shNew();return}
    if(t.id==='shfold'){if(SHN)kpOpen((r,p)=>{SHN.r=r;SHN.p=p;shSetup()},{r:SHN.r,p:SHN.p});return}
    if(t.id==='shgo'){shMake(t);return}
    const s=SHR.find(x=>x.i===(t.dataset.shc||t.dataset.shx||t.dataset.shd));if(!s||!shMine(s))return;
    if(t.dataset.shc){try{await navigator.clipboard.writeText(shUrl(s.i));say('Ссылка скопирована')}catch(x){prompt('Скопируйте ссылку',shUrl(s.i))}}
    else if(t.dataset.shx){if(!confirm('Отозвать ссылку?'))return;s.x=1;await shPut(s);jlog('lnk-',kpName(s.r,s.p));openShares()}
    else if(t.dataset.shd){if(!confirm('Удалить ссылку?'))return;await withChat(()=>client.deleteMessages(S.chat,[s.id]));SHR=SHR.filter(x=>x!==s);openShares()}
  }catch(x){say(err(x),1)}
});
/* получатель: ссылка запоминается, пока он входит, и открывается, когда приложение готово */
(function(){const m=/[#&]sh=([a-z0-9]+)/.exec(location.hash);if(m){try{localStorage.setItem('tgsh',m[1]);history.replaceState(history.state,'',location.pathname+location.search)}catch(e){}}})();
let shTry=0;
function shAuto(){
  let id='';try{id=localStorage.getItem('tgsh')||''}catch(e){}
  if(!id)return;
  if(booting||!ready||showSetup){if(shTry++<600)setTimeout(shAuto,500);return}
  shTry=0;try{localStorage.removeItem('tgsh')}catch(e){}
  shOpen(id);
}
async function shOpen(id){
  const s=SHR.find(x=>x.i===id);
  if(!s){alert('Ссылка не найдена или удалена');return}
  const st=shSt(s);if(st!=='действует'){alert('Ссылка не действует: '+st);return}
  try{
    if(!isAdmin()&&s.o!==S.guestUser){s.c++;await shPut(s);jlog('lnk',kpName(s.r,s.p))}
    if(s.k&&!KEYS[s.r]){KEYS[s.r]=await keyRaw(b64d(s.k));s.own=1}
    await decAll();
  }catch(x){say(err(x),1);return}
  shEnter(s);
}
function shEnd(){
  const s=SHV;if(!s)return;SHV=null;document.body.classList.remove('shv');
  if(s.own){delete KEYS[s.r];s.own=0}
  const b=$('#shb');if(b)b.remove();
  if(s.prev){P.repo=s.prev.repo;cur=s.prev.cur;sv('tgmp',P)}
  selMode=false;sel.clear();render();
}
/* ссылка открывает саму папку в обычном виде: только просмотр и скачивание, выше папки не выйти */
function shEnter(s){
  if(SHV)shEnd();
  s.prev={repo:P.repo,cur};SHV=s;
  document.body.classList.add('shv');
  P.repo=s.r;cur=s.p;selMode=false;sel.clear();$('#q').value='';
  const b=document.createElement('div');b.id='shb';
  b.style.cssText='display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px 14px;background:var(--acc,#5fc3a6);color:#04120f;font-size:13px';
  b.innerHTML='<span>Общая папка · только просмотр и скачивание</span><button style="background:none;border:0;color:inherit;font-weight:700;font-size:13px">Закрыть</button>';
  b.querySelector('button').onclick=shEnd;
  $('#list').before(b);
  closeDrawer();render();
}
