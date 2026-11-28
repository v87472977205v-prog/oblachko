/* ===== ФАЙЛ ядро-07-расширения.js =====
   
   Система расширений: список EXTS, предложение/отзыв, экран «Расширения» + конструктор (registerExt, addCss, onApp).
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- Расширения ----
   Владелец (Консоль → Расширения) нажимает «+» у расширения и выбирает пользователя: тому приходит вопрос.
   Если он нажал «Да», в его шторке появляется раздел «Расширения». Записи лежат в канале (🧩): предложение, согласие, отказ. */
const EXR='🧩 ';
let EXT=[];
const EXTS=[{id:'music',name:'Музыка из чата',ic:'music',open:()=>openMusic()},{id:'notes',name:'Заметки',ic:'edit',open:()=>openNotes()},{id:'gym',name:'Журнал тренировок',ic:'dumb',open:()=>openGym()},{id:'links',name:'Временные ссылки',ic:'copy',open:()=>openShares()},{id:'shuf',name:'Случайный плеер',ic:'repo',open:()=>openShuffle()},{id:'stego',name:'Стего-утилита',ic:'picture',open:()=>openStego()},{id:'quick',name:'Быстрый доступ к расширениям',ic:'grid',set:1,open:()=>openExtSet('quick')},{id:'tree',name:'Дерево репозиториев',ic:'tree',set:1,open:()=>openTree()}];
const extName=id=>{let n='';for(const r of EXT)if(r.x===id&&r.k==='n'&&r.n)n=r.n;return n||(EXTS.find(e=>e.id===id)||{}).name||id};
const extState=(x,u)=>{let k='';for(const r of EXT)if(r.x===x&&r.u===u)k=r.k;return k};
const extMine=()=>EXTS.filter(e=>isAdmin()||(S.guestUser&&extState(e.id,S.guestUser)==='a'));
function extSync(){const b=$('#extb');if(b)b.hidden=isAdmin()||!extMine().length||quickOn();try{treeSync()}catch(e){}try{quickSync()}catch(e){}}
async function extSend(rec){
  const m=await withChat(()=>client.sendMessage(S.chat,EXR+JSON.stringify(rec)));
  EXT.push({id:m.id,...rec});EXT.sort((a,b)=>a.id-b.id);saveIndex();return m;
}
function openExtAdmin(){
  if(!isAdmin())return;
  fromSet=true;admParent=drawConsole;openAdm('Расширения');
  $('#admb').innerHTML=`<div class="exl">${EXTS.map(e=>`<div class="exr"><button class="exo" data-exo="${e.id}">${icon(e.ic)}<span>${esc(extName(e.id))}</span></button><button class="exg" data-exg="${e.id}" aria-label="Настройки расширения">${icon('gear')}</button><button class="exp" data-exv="${e.id}" aria-label="Отозвать у пользователя">−</button><button class="exp" data-exp="${e.id}" aria-label="Предложить пользователю">+</button></div>`).join('')}</div>`;
}
function openExtUsers(x,rev){
  if(!isAdmin())return;
  fromSet=true;admParent=openExtAdmin;openAdm(rev?'У кого отозвать':'Кому предложить');
  const st={a:'подключено',o:'ждёт ответа',d:'отказался',r:'отозвано'};
  const L=rev?users.filter(u=>{const k=extState(x,u.u);return k==='a'||k==='o'}):users;
  $('#admb').innerHTML=L.length?`<div class="exl">${L.map(u=>`<div class="exr"><button class="exo" ${rev?'data-exw':'data-exu'}="${esc(x)}" data-u="${esc(u.u)}"><span>${esc(u.u)}</span></button><span class="us">${st[extState(x,u.u)]||''}</span></div>`).join('')}</div>`:`<div class="empty">${rev?'Это расширение пока никому не выдано':'Пользователей пока нет'}</div>`;
}
function openExts(){
  fromSet=false;admParent=null;openAdm('Расширения');
  const L=extMine();
  $('#admb').innerHTML=L.length?`<div class="exl">${L.map(e=>`<div class="exr"><button class="exo" data-exm="${e.id}">${icon(e.ic)}<span>${esc(extName(e.id))}</span></button>${e.set?`<button class="exg" data-exs="${e.id}" aria-label="Настройки расширения">${icon('gear')}</button>`:''}</div>`).join('')}</div>`:'<div class="empty">Пока нет расширений</div>';
}
$('#extb').onclick=openExts;

/* ---- КОНСТРУКТОР: как подключать новые расширения и функции отдельными файлами (раздел 17 документации) ----
   registerExt({id,name,ic,open,ord}) — добавляет расширение в список (id — латиницей, ic — имя иконки из IC, open — функция открытия).
   addCss(id,css)  — добавляет стили модуля (повторный вызов с тем же id заменяет их).
   onApp(имя,fn)   — подписка на события приложения; appEmit(имя,данные) — вызвать событие.
   События: 'render' (после каждой перерисовки списка файлов), 'start' (после запуска, в конце ядро-99-запуск.js). */
function registerExt(d){
  if(!d||!d.id||EXTS.some(e=>e.id===d.id))return;
  EXTS.push({ic:'puzzle',...d});
  try{extSync()}catch(e){}
}
function addCss(id,css){
  let s=document.getElementById('css-'+id);
  if(!s){s=document.createElement('style');s.id='css-'+id;document.head.appendChild(s)}
  s.textContent=css;
}
const APPH={};
function onApp(n,f){(APPH[n]=APPH[n]||[]).push(f)}
function appEmit(n,a){for(const f of(APPH[n]||[])){try{f(a)}catch(e){console.error('onApp '+n,e)}}}
