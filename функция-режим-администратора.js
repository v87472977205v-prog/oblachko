/* ===== ФАЙЛ функция-режим-администратора.js =====

   Функция: режим администратора по коду активации (префикс adx*).
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17 и раздел 10.
   ===== */
/* ---- Режим администратора по коду ----
   Настоящий владелец (вошёл как владелец) в «Консоли → Код администратора» задаёт код. Обычный пользователь вводит этот код
   в строку поиска в меню и нажимает Enter: на ЭТОМ устройстве у этого пользователя включается режим администратора (isAdmin()
   становится истинным: консоль, расширения, статистика и т. д.). Личные данные пользователя (заметки, «волна», настройки)
   остаются его собственными: S.viewer и S.guestUser не меняются.
   Отключает режим только настоящий владелец (отдельное устройство или всех сразу). Сам код в чате не хранится: только соль и
   отпечаток PBKDF2-SHA256. Записи в чате: значок 🛡, разбор — refresh() в ядро-13-чтение-архива.js.
     {k:'code', v, s:соль, h:отпечаток, i:итераций}   текущий код (одна запись)
     {k:'act',  v, dv:устройство, u:пользователь, n:подпись}   кто и когда включил режим
     {k:'rev',  v, dv:устройство или '*'}               отзыв: устройство (или все) теряют режим, если включили его раньше v */
const ADXW='🛡 ',ADX_IT=300000;
let ADXR=[];                      /* записи 🛡 из чата (заполняет refresh) */
const ADXT={n:0,t:0};
const adxTrue=()=>!S.viewer&&!S.guestUser;   /* настоящий владелец, а не включённый кодом */
const adxDev=()=>{let d=ld('tgdev','');if(!d||typeof d!=='string'){d=Math.random().toString(36).slice(2,10);sv('tgdev',d)}return d};
const adxLabel=()=>{
  const u=navigator.userAgent||'';
  const os=/android/i.test(u)?'Android':/iphone|ipad|ipod/i.test(u)?'iPhone/iPad':/windows/i.test(u)?'Windows':/mac/i.test(u)?'Mac':/linux/i.test(u)?'Linux':'устройство';
  const br=/edg/i.test(u)?'Edge':/chrome|crios/i.test(u)?'Chrome':/firefox|fxios/i.test(u)?'Firefox':/safari/i.test(u)?'Safari':'';
  return os+(br?', '+br:'');
};
const adxCode=()=>{let r=null;for(const x of ADXR)if(x.k==='code'&&(!r||x.v>r.v))r=x;return r};
const adxAllow=()=>{const n=Date.now();if(n-ADXT.t>6e4){ADXT.t=n;ADXT.n=0}return ++ADXT.n<=8};   /* не чаще 8 проверок в минуту */
async function adxHash(code,saltB64,it){
  if(!(typeof crypto!=='undefined'&&crypto.subtle))throw new Error('Шифрование недоступно в этом браузере');
  const salt=Uint8Array.from(atob(saltB64),c=>c.charCodeAt(0));
  const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:it||ADX_IT},k,256);
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
async function adxPut(rec){
  const m=await withChat(()=>client.sendMessage(S.chat,ADXW+JSON.stringify(rec)));
  ADXR=ADXR.concat([{id:m.id,k:String(rec.k),v:+rec.v||0,dv:String(rec.dv||''),u:String(rec.u||''),s:rec.s||'',h:rec.h||'',i:+rec.i||0,n:String(rec.n||'')}]);
  return m;
}
async function adxDel(ids){
  if(!ids.length)return;
  try{await withChat(()=>client.deleteMessages(S.chat,ids))}catch(e){}
  ADXR=ADXR.filter(x=>!ids.includes(x.id));
}
function adxUi(){try{drawRepos()}catch(e){}try{extSync()}catch(e){}try{if(typeof quickSync==='function')quickSync()}catch(e){}}
/* ввод кода в строке поиска: true — режим включён */
async function adxTry(code){
  if(ADXON||isAdmin())return false;
  const c=String(code||'');
  if(c.length<8||c.length>100)return false;
  const rec=adxCode();if(!rec||!adxAllow())return false;
  let h='';try{h=await adxHash(c,rec.s,rec.i)}catch(e){return false}
  if(h!==rec.h)return false;
  const dv=adxDev(),t=Date.now(),u=S.guestUser||'';
  sv('tgadx',{dv,t,u});ADXON=true;
  adxPut({k:'act',v:t,dv,u,n:adxLabel()}).catch(()=>{});
  try{jlog('adx','Включён режим администратора по коду')}catch(e){}
  adxUi();say('Режим администратора включён');
  return true;
}
function adxOff(silent){
  ADXON=false;try{localStorage.removeItem('tgadx')}catch(e){}
  try{$('#adm').hidden=true}catch(e){}
  adxUi();if(!silent)say('Режим администратора отключён');
}
/* после каждого чтения чата: отзыв, смена пользователя */
function adxSync(){
  if(!ADXON)return;
  const a=ld('tgadx',null);
  if(!a||adxTrue()||a.u!==(S.guestUser||'')){adxOff(true);return}
  if(ADXR.some(r=>r.k==='rev'&&(r.dv==='*'||r.dv===a.dv)&&r.v>=a.t))adxOff(false);
}
/* ---- экран «Код администратора» (только настоящий владелец) ---- */
function adxList(){
  const last=new Map();
  for(const x of ADXR)if(x.k==='act'&&(!last.has(x.dv)||x.v>last.get(x.dv).v))last.set(x.dv,x);
  const revoked=a=>ADXR.some(r=>r.k==='rev'&&(r.dv==='*'||r.dv===a.dv)&&r.v>=a.v);
  return[...last.values()].map(a=>({...a,rv:revoked(a)})).sort((x,y)=>y.v-x.v);
}
function openAdx(){
  if(!adxTrue())return;
  openAdm('Код администратора');
  const code=adxCode(),L=adxList();
  const when=t=>new Date(t).toLocaleString('ru',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
  const rows=L.map(a=>`<div class="adxr${a.rv?' off':''}"><div><b>${esc(a.u||'Неизвестно')}</b><span>${esc(a.n||'устройство')} · ${when(a.v)}${a.rv?' · отключено':''}</span></div>${a.rv?'':`<button data-adxrv="${esc(a.dv)}">Отключить</button>`}</div>`).join('');
  $('#admb').innerHTML=`<div class="adx" style="padding:10px 14px">
    <div class="uc"><div class="un">Код активации</div><div class="us">${code?'Код задан '+when(code.v)+'.':'Код не задан: включить режим администратора на другом устройстве нельзя.'} Пользователь вводит код в строку поиска в меню и нажимает Enter, после чего на его устройстве открывается консоль администратора. Используйте длинный код (не короче 8 символов). В чате хранится только защищённый отпечаток.</div>
      <div class="row"><button class="p" id="adxset">${code?'Изменить код':'Задать код'}</button>${code?'<button class="del" id="adxoff">Отключить для всех</button>':''}</div></div>
    <div class="uc"><div class="un">Устройства с режимом администратора</div>${rows||'<div class="us">Пока никто не включал.</div>'}</div></div>`;
}
async function adxSetCode(){
  if(!adxTrue())return;
  const a=await askPass('Новый код администратора (не короче 8 символов)');if(a===null)return;
  if(a.length<8){say('Код слишком короткий: нужно не меньше 8 символов',1);return}
  const b=await askPass('Повторите код');if(b===null)return;
  if(a!==b){say('Коды не совпали',1);return}
  try{
    const salt=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))),h=await adxHash(a,salt,ADX_IT);
    const old=ADXR.filter(x=>x.k==='code').map(x=>x.id);
    await adxPut({k:'code',v:Date.now(),s:salt,h,i:ADX_IT});
    await adxDel(old);
    try{jlog('adx','Задан код администратора')}catch(e){}
    say('Код сохранён');openAdx();
  }catch(e){say('Не удалось сохранить код: '+err(e),1)}
}
async function adxRevoke(dv){
  if(!adxTrue())return;
  try{await adxPut({k:'rev',v:Date.now(),dv});say(dv==='*'?'Режим отключён у всех':'Режим отключён у устройства');openAdx()}
  catch(e){say('Не удалось отключить: '+err(e),1)}
}
$('#admb').addEventListener('click',async e=>{
  if(!adxTrue())return;
  if(e.target.closest('#adxset')){adxSetCode();return}
  if(e.target.closest('#adxoff')){
    if(!confirm('Отключить режим администратора у всех и удалить код? Чтобы включать его снова, нужно будет задать новый код.'))return;
    await adxRevoke('*');await adxDel(ADXR.filter(x=>x.k==='code').map(x=>x.id));openAdx();return;
  }
  const rv=e.target.closest('[data-adxrv]');if(rv){await adxRevoke(rv.dataset.adxrv)}
});
/* поле поиска в меню: Enter проверяет, не является ли введённое кодом администратора (обычный поиск не затрагивается) */
$('#q').addEventListener('keydown',async e=>{
  if(e.key!=='Enter')return;
  const q=$('#q');
  if(await adxTry(q.value)){q.value='';try{q.dispatchEvent(new Event('input'))}catch(x){}try{closeDrawer()}catch(x){}}
});
if(ld('tgadx',null))ADXON=true;   /* режим, включённый на этом устройстве раньше (проверка отзыва — после чтения чата, adxSync) */
addCss('adx',`.adxr{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid rgba(46,230,203,.14)}.adxr:first-of-type{border-top:0}.adxr b{display:block;font-size:15px}.adxr span{display:block;margin-top:2px;font-size:12.5px;color:#8fb5ae}.adxr.off{opacity:.55}.adxr button{flex:none;padding:7px 12px;border-radius:99px;font-size:13px}`);
