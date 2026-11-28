/* ===== ФАЙЛ расширение-задачи-на-шторке.js =====
   
   Дополнение к «Быстрому доступу»: на шторке (свайп вниз) вместо закреплённой заметки с названием —
   только задачи. Вверху строка «Добавить задачу», ниже список: галочка (выполнено — задача зачёркивается и остаётся),
   справа крестик — убрать задачу со шторки.
   Задачи хранятся на устройстве (localStorage, ключ tgqtasks, отдельно для каждого пользователя) и с «Заметками»
   никак не связаны: крестик удаляет только со шторки, заметки не затрагиваются.
   Файл расширение-быстрого-доступа.js НЕ менялся: quickOpen() оборачивается ниже, старый блок «На шторке» убирается.
   Порядок загрузки — в модули.js: ПОСЛЕ расширение-быстрого-доступа.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
addCss('qtask',`
  #qks .qtk{margin-top:12px;padding:12px 14px 8px;border-radius:22px;background:linear-gradient(160deg,color-mix(in srgb,var(--acc) 12%,transparent),color-mix(in srgb,var(--ink) 3%,transparent));border:1px solid color-mix(in srgb,var(--acc) 34%,transparent)}
  #qks .qtadd{display:flex;align-items:center;gap:8px}
  #qks .qtadd input{flex:1;min-width:0;padding:11px 14px;border-radius:14px;border:1px solid color-mix(in srgb,var(--ink) 14%,transparent);background:color-mix(in srgb,var(--ink) 6%,transparent);color:var(--ink);font-size:16px;font-family:inherit;outline:none}
  #qks .qtadd input:focus{border-color:var(--acc)}
  #qks .qtadd button{flex:none;width:44px;height:44px;border-radius:50%;padding:0;display:grid;place-items:center;background:var(--acc);color:var(--accink);border:0;box-shadow:0 4px 14px color-mix(in srgb,var(--acc) 35%,transparent)}
  #qks .qtadd button .i{width:22px;height:22px;stroke-width:2.6}
  #qks .qtl{margin-top:4px}
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
  #qks .qtn{padding:10px 2px 6px;font-size:13px;color:var(--mute)}
`);
const qtMe=()=>{try{return qkMe()}catch(e){return''}};
const qtGet=()=>{const d=ld('tgqtasks',null);return d&&d.u===qtMe()&&Array.isArray(d.l)?d.l.filter(t=>t&&t.id&&typeof t.d==='string'):[]};
const qtSet=l=>sv('tgqtasks',{u:qtMe(),l});
function qtRows(){
  const l=qtGet();
  return l.length?l.map(t=>`<div class="qtr${t.x?' dn':''}" data-qtid="${esc(t.id)}"><button class="qtc" data-qtt="${esc(t.id)}" aria-label="Выполнено">${icon('check')}</button><div class="qtt" data-qtt="${esc(t.id)}">${esc(t.d)}</div><button class="qtx" data-qtx="${esc(t.id)}" aria-label="Убрать со шторки">${icon('close')}</button></div>`).join(''):'<div class="qtn">Пока нет задач</div>';
}
function qtPaint(){const b=document.querySelector('#qks .qtl');if(b)b.innerHTML=qtRows()}
function qtAdd(){
  const i=document.querySelector('#qks #qtin');if(!i)return;
  const d=i.value.replace(/\s+/g,' ').trim().slice(0,200);if(!d){i.focus();return}
  const l=qtGet();l.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),d,x:0});
  qtSet(l.slice(-100));i.value='';qtPaint();i.focus();
}
function qtBlock(){
  const el=document.createElement('div');el.className='qtk';
  el.innerHTML=`<div class="qtadd"><input id="qtin" type="text" placeholder="Добавить задачу" maxlength="200" autocomplete="off" enterkeyhint="done"><button id="qtplus" aria-label="Добавить">${icon('plus')}</button></div><div class="qtl">${qtRows()}</div>`;
  el.addEventListener('click',e=>{
    if(e.target.closest('#qtplus')){qtAdd();return}
    const x=e.target.closest('[data-qtx]');
    if(x){qtSet(qtGet().filter(t=>t.id!==x.dataset.qtx));qtPaint();return}
    const c=e.target.closest('[data-qtt]');
    if(c){const l=qtGet(),t=l.find(q=>q.id===c.dataset.qtt);if(t){t.x=t.x?0:1;qtSet(l);qtPaint()}}
  });
  el.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='qtin'){e.preventDefault();qtAdd()}});
  return el;
}
/* вставка блока в шторку: оборачиваем quickOpen(), сам он не менялся */
const qtOpen0=quickOpen;
quickOpen=function(){
  const had=!!$('#qks');
  qtOpen0.apply(this,arguments);
  if(had)return;
  const p=document.querySelector('#qks .qkp');if(!p)return;
  const old=p.querySelector('[data-qkpin]');if(old)old.remove();      /* старый блок «На шторке» с названием заметки */
  p.insertBefore(qtBlock(),p.querySelector('.qkbar'));
};
/* пункт «Вывести на шторку» в меню заметки больше не нужен */
qkMenuItem=()=>[];
