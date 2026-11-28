/* ===== ФАЙЛ расширение-задачи-на-шторке.js =====
   
   Задачи на шторке (свайп вниз). Задачи — это пункты чек-листов из расширения «Заметки», помеченные кнопкой «Вынести на шторку»
   (кнопка в строке пункта в самой заметке; метка q:1 и id пункта i хранятся в самой заметке, поэтому всё синхронизируется
   между устройствами одного пользователя вместе с заметками). Заголовка нет: только список задач.
   Добавлять задачи на шторке нельзя: всё делается в «Заметках» (кнопка у пункта чек-листа или пункт меню «⋯» → «Вынести все задачи на шторку»).
   На шторке: галочка «выполнено» (пункт зачёркивается и остаётся; в заметке он тоже отмечается), крестик справа —
   убирает пункт ТОЛЬКО со шторки (q=0), в заметке пункт остаётся.
   Шторка показывает быстрый снимок с устройства (localStorage tgqtasks), а в фоне подтягивает свежие заметки.
   Если заметки на этом устройстве ещё не открывались (нет ключа) — действия ждут в очереди (tgqtops) и применятся при первой возможности.
   Если вынесенных задач нет, блока на шторке не видно.
   Файл расширение-быстрого-доступа.js НЕ менялся: quickOpen() оборачивается ниже. В расширение-заметки.js добавлены: кнопка в строке пункта
   и вызовы qtRebuild() после изменений заметок.
   Порядок загрузки — в модули.js: ПОСЛЕ расширение-заметки.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
addCss('qtask',`
  .nci .qtp{opacity:.55}
  .nci .qtp.on{opacity:1;color:var(--acc)}
  #qks .qtk{margin-top:12px;padding:6px 14px 6px;border-radius:22px;background:linear-gradient(160deg,color-mix(in srgb,var(--acc) 12%,transparent),color-mix(in srgb,var(--ink) 3%,transparent));border:1px solid color-mix(in srgb,var(--acc) 34%,transparent)}
  #qks .qtk[hidden]{display:none}
  #qks .qtr{display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid color-mix(in srgb,var(--ink) 9%,transparent)}
  #qks .qtr:last-child{border-bottom:0}
  #qks .qtc{flex:none;width:26px;height:26px;padding:0;border-radius:8px;display:grid;place-items:center;background:transparent;border:2px solid color-mix(in srgb,var(--acc) 70%,transparent);color:var(--accink);transition:background .15s,border-color .15s}
  #qks .qtc .i{width:16px;height:16px;stroke-width:3;opacity:0}
  #qks .qtr.dn .qtc{background:var(--acc);border-color:var(--acc)}
  #qks .qtr.dn .qtc .i{opacity:1}
  #qks .qtt{flex:1;min-width:0;font-size:15.5px;line-height:1.35;color:var(--ink);word-break:break-word;transition:opacity .15s}
  #qks .qtr.dn .qtt{text-decoration:line-through;opacity:.5}
  #qks .qtx{flex:none;width:34px;height:34px;padding:0;border-radius:50%;display:grid;place-items:center;background:transparent;border:0;color:var(--mute)}
  #qks .qtx .i{width:18px;height:18px}
  #qks .qtx:active{background:color-mix(in srgb,var(--ink) 10%,transparent)}
`);
const QT={rt:0};
const qtUid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const qtMe=()=>{try{return ntMe()}catch(e){return''}};
const qtAvail=()=>{try{return quickOn()&&extMine().some(e=>e.id==='notes')}catch(e){return false}};
const qtSnap=()=>{const d=ld('tgqtasks',null);return d&&d.u===qtMe()&&Array.isArray(d.l)?d.l:[]};
const qtSnapSet=l=>sv('tgqtasks',{u:qtMe(),l});
const qtOps=()=>{const d=ld('tgqtops',null);return d&&d.u===qtMe()&&Array.isArray(d.l)?d.l:[]};
const qtOpsSet=l=>sv('tgqtops',{u:qtMe(),l});
function qtRows(){
  const l=qtSnap();
  return l.length?l.map(t=>`<div class="qtr${t.x?' dn':''}"><button class="qtc" data-qtt="${esc(t.i)}" aria-label="Выполнено">${icon('check')}</button><div class="qtt" data-qtt="${esc(t.i)}">${esc(t.d)}</div><button class="qtx" data-qtx="${esc(t.i)}" aria-label="Убрать со шторки">${icon('close')}</button></div>`).join(''):'';
}
function qtPaint(){const b=document.querySelector('#qks .qtk');if(!b)return;const l=qtSnap();b.hidden=!l.length;b.innerHTML=qtRows()}
/* применить действия к заметкам (NTD уже загружен): отметка x и/или метка шторки q */
function qtApplySync(ops){
  const touched=new Set();
  for(const o of ops){
    const n=NTD.find(x=>x.id===o.n),it=n&&n.k==='c'&&n.c.find(c=>c&&c.i===o.i);
    if(!it)continue;
    if('x' in o)it.x=o.x?1:0;
    if('q' in o)it.q=o.q?1:0;
    touched.add(n);
  }
  for(const n of touched){n.up=Date.now();ntPush(n)}
}
/* ключ заметок без запроса пароля: только если уже запомнен на устройстве */
async function qtKey(){
  const u=ntMe();
  if(NTK&&NTKu===u)return true;
  if(!S.guestUser&&!ownkey){NTK=null;NTKu=u;return true}
  try{const r=await idbOp('m','readonly',s=>s.get('ntk:'+(u||'*')));if(r&&r.key){NTK=r.key;NTKu=u;return true}}catch(e){}
  return false;
}
/* загрузить заметки (если их никто сейчас не редактирует) */
async function qtLoad(){
  if(!await qtKey())return false;
  if(!(NT.n||NT.d.size||NT.f))NTD=(await ntMine()).filter(n=>n.k!=='g');
  return true;
}
/* пересобрать снимок шторки из заметок; сначала применяются действия, ожидавшие в очереди */
function qtRebuild(){
  const ops=qtOps();
  if(ops.length){qtApplySync(ops);qtOpsSet([])}
  const l=[];
  for(const n of NTD.slice().sort((a,b)=>(a.cr||0)-(b.cr||0)))
    if(n.k==='c')for(const it of n.c)if(it&&it.q&&it.i&&String(it.d||'').trim())l.push({n:n.id,i:it.i,d:String(it.d).slice(0,200),x:it.x?1:0});
  qtSnapSet(l);qtPaint();
}
/* действие со шторки: сразу меняем снимок на экране, потом записываем в заметку (или в очередь) */
async function qtAct(i,patch){
  const l=qtSnap(),t=l.find(x=>x.i===i);if(!t)return;
  const op={n:t.n,i,...patch};
  qtSnapSet(patch.q===0?l.filter(x=>x.i!==i):l.map(x=>x.i===i?{...x,...('x' in patch?{x:patch.x}:{})}:x));
  qtPaint();
  let ok=false;
  try{if(await qtLoad()){qtApplySync([op]);ok=true}}catch(e){}
  if(!ok)qtOpsSet([...qtOps(),op]);
}
function qtBlock(){
  const el=document.createElement('div');el.className='qtk';el.hidden=!qtSnap().length;el.innerHTML=qtRows();
  el.addEventListener('click',e=>{
    /* после нажатия список перерисовывается, и общий обработчик шторки решил бы, что нажали мимо панели, и закрыл её */
    e.stopPropagation();
    const x=e.target.closest('[data-qtx]');
    if(x){qtAct(x.dataset.qtx,{q:0});return}
    const c=e.target.closest('[data-qtt]');
    if(c){const t=qtSnap().find(q=>q.i===c.dataset.qtt);if(t)qtAct(t.i,{x:t.x?0:1})}
  });
  return el;
}
/* подтянуть свежие заметки с других устройств и обновить список на шторке */
async function qtRefresh(){
  try{
    if(!OFFLINE&&client&&Date.now()-QT.rt>45000){QT.rt=Date.now();await refresh()}
    if(await qtLoad())qtRebuild();
  }catch(e){}
}
/* вставка блока в шторку: оборачиваем quickOpen(), сам он не менялся */
const qtOpen0=quickOpen;
quickOpen=function(){
  const had=!!$('#qks');
  qtOpen0.apply(this,arguments);
  if(had)return;
  const p=document.querySelector('#qks .qkp');if(!p)return;
  const old=p.querySelector('[data-qkpin]');if(old)old.remove();      /* старый блок «На шторке» с названием заметки */
  if(!qtAvail())return;
  p.insertBefore(qtBlock(),p.querySelector('.qkbar'));
  qtRefresh();
};
/* меню заметки «⋯»: у чек-листа — вынести все задачи на шторку / убрать все (старый пункт «вся заметка целиком» заменён) */
qkMenuItem=n=>{
  if(!qtAvail()||!n||n.k!=='c')return[];
  const its=n.c.filter(i=>i&&String(i.d||'').trim());if(!its.length)return[];
  const all=its.every(i=>i.q);
  return[{t:all?'Убрать все задачи со шторки':'Вынести все задачи на шторку',ic:'grid',fn:()=>{
    for(const i of its){i.q=all?0:1;if(!all&&!i.i)i.i=qtUid()}
    ntTouch();try{ntPaintC()}catch(e){}
    say(all?'Убрано со шторки':'Вынесено на шторку');
  }}];
};
