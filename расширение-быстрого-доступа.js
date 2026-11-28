/* ===== ФАЙЛ расширение-быстрого-доступа.js =====
   
   Расширение «Быстрый доступ к расширениям» (плитки по свайпу вниз).
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- Расширение «Быстрый доступ к расширениям» ----
   Когда включено (расширение выдано и тумблер в его настройках включён): кнопка «Расширения» пропадает из шторки,
   а свайп вниз от верха главного экрана открывает панель с плитками доступных расширений. */
function quickOn(){return extMine().some(e=>e.id==='quick')&&ld('tgquick','on')!=='off'}
const qkMusOn=()=>quickOn()&&ld('tgqmus','off')==='on';
function quickSync(){
  const on=quickOn();
  document.documentElement.style.overscrollBehaviorY=on?'contain':'';
  document.body.classList.toggle('qkmusic',qkMusOn());   /* плеер переехал на шторку: нижняя панель плеера скрыта */
  try{showPl(!$('#pl').hidden)}catch(e){}
  if(!on)quickClose(true);
}
const quickIdle=()=>!$('#app').hidden&&$('#drawer').hidden&&$('#adm').hidden&&$('#vw').hidden&&$('#pick').hidden&&$('#kpick').hidden&&$('#up').hidden&&$('#pw').hidden&&!selMode&&!$('#pl').classList.contains('full')&&!$('#qks');
const QK={trk:false,x:0,y:0,sy:0,thr:64,up:false,iv:0,mo:0,noClick:0,drag:false};
const QK_MON=['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const qkCap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const qkOrder=()=>{const o=ld('tgqord',[]);return Array.isArray(o)?o:[]};
/* закреплённая на шторке заметка или чек-лист (одна): снимок содержимого хранится на устройстве, чтобы шторка не просила пароль заметок */
const qkMe=()=>S.guestUser||'';
const qkPin=()=>{const p=ld('tgnpin',null);return p&&p.u===qkMe()&&p.id&&p.s&&extMine().some(e=>e.id==='notes')?p:null};
const qkSnap=n=>({k:n.k,t:String(n.t||'').slice(0,120),b:String(n.b||'').slice(0,400),c:(n.c||[]).slice(0,12).map(i=>({x:i.x?1:0,d:String(i.d||'').slice(0,100)}))});
const qkPinSet=n=>sv('tgnpin',{u:qkMe(),id:n.id,s:qkSnap(n)});
const qkPinUpd=n=>{try{const p=ld('tgnpin',null);if(p&&p.id===n.id)sv('tgnpin',{...p,s:qkSnap(n)})}catch(e){}};
const qkPinDel=()=>{try{localStorage.removeItem('tgnpin')}catch(e){}};
const qkPinDelId=id=>{try{const p=ld('tgnpin',null);if(p&&p.id===id)qkPinDel()}catch(e){}};
/* пункт в меню заметки «⋯»: только когда включён быстрый доступ */
function qkMenuItem(n){
  if(!quickOn())return[];
  const p=ld('tgnpin',null),on=!!(p&&p.id===n.id&&p.u===qkMe());
  return[{t:on?'Убрать со шторки':'Вывести на шторку',ic:'grid',fn:()=>{if(on){qkPinDel();say('Убрано со шторки')}else{qkPinSet(n);say('Выведено на шторку')}}}];
}
function qkCanUp(el){
  for(let n=el;n&&n!==document.documentElement;n=n.parentElement){
    const s=getComputedStyle(n);
    if(/(auto|scroll)/.test(s.overflowY)&&n.scrollHeight>n.clientHeight+1&&n.scrollTop>0)return true;
  }
  const se=document.scrollingElement;return !!(se&&se.scrollTop>0);
}
function qkTick(){
  const c=$('#qkclk');if(!c)return;
  const n=new Date();
  c.textContent=n.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  const dt=$('#qkdate'),s=qkCap(n.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'}));
  if(dt&&dt.textContent!==s){dt.textContent=s;if(QK.mo===0)qkCalPaint()}
  qkMusTick();
}
function qkCalPaint(){
  const box=$('#qkcal');if(!box)return;
  const now=new Date(),d=new Date(now.getFullYear(),now.getMonth()+QK.mo,1),y=d.getFullYear(),m=d.getMonth();
  const first=(d.getDay()+6)%7,days=new Date(y,m+1,0).getDate(),prev=new Date(y,m,0).getDate(),rows=Math.ceil((first+days)/7);
  let cells='';
  for(let i=0;i<rows*7;i++){
    const n=i-first+1;let dd=n,cls='';
    if(n<1){dd=prev+n;cls=' o'}else if(n>days){dd=n-days;cls=' o'}
    else if(QK.mo===0&&n===now.getDate())cls=' td';
    if(i%7>=5&&!cls.includes('td'))cls+=' we';
    cells+=`<span class="qkd${cls}">${dd}</span>`;
  }
  box.innerHTML=`<div class="qkch"><button data-qkm="-1" aria-label="Предыдущий месяц">${icon('back')}</button><button class="qkcm" data-qkm="0">${qkCap(QK_MON[m])} ${y}</button><button data-qkm="1" aria-label="Следующий месяц" class="qkr">${icon('back')}</button></div><div class="qkw"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span class="we">Сб</span><span class="we">Вс</span></div><div class="qkdg">${cells}</div>`;
}
const qkFire=sel=>{const b=$(sel);if(b)b.dispatchEvent(new MouseEvent('click',{bubbles:false}))};   /* нажать кнопку плеера, не закрывая шторку */
const QK_PLAY='<svg viewBox="0 0 24 24"><path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z"/></svg>',QK_PAUSE='<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.2" height="14" rx="1.3"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.3"/></svg>';
function qkMusPaint(){
  const box=$('#qkmus');if(!box)return;
  const f=pi>=0?pq[pi]:null;QK.mid=f?f.id:0;
  if(!f){
    box.innerHTML=`<div class="qkme"><span class="qkmi">${icon('music')}</span><div class="qkmt"><b>Ничего не играет</b><span>Нажмите, чтобы продолжить</span></div><button class="qkgo" data-qkmr aria-label="Включить музыку">${QK_PLAY}</button></div>`;return;
  }
  const cv=COV.get(f.id),ti=($('#pt')||{}).textContent||dispName(f.name),ar=($('#partist')||{}).textContent||'';
  box.innerHTML=`<div class="qkmh"><button class="qkcv" data-qkmo aria-label="Открыть плеер">${cv?`<img src="${esc(cv)}" alt="">`:icon('music')}</button><div class="qkmt" data-qkmo><b>${esc(ti)}</b>${ar?`<span>${esc(ar)}</span>`:''}</div></div><div class="qkmp"><div class="qkpr" data-qkmseek><i id="qkmf"></i></div><div class="qkmtm"><span id="qkmcur">0:00</span><span id="qkmdur">0:00</span></div></div><div class="qkmb"><button data-qkmp="prev" aria-label="Предыдущий">${icon('prev')}</button><button class="qkbig" data-qkmp="play" id="qkmpl" aria-label="Играть или пауза"></button><button data-qkmp="next" aria-label="Следующий">${icon('next')}</button></div>`;
  qkMusTick();
}
function qkMusTick(){
  const box=$('#qkmus');if(!box)return;
  const id=pi>=0&&pq[pi]?pq[pi].id:0;
  if(id!==QK.mid){qkMusPaint();return}
  if(!id)return;
  const d=au.duration,c=au.currentTime,f=$('#qkmf');
  if(f)f.style.width=(d>0&&isFinite(d)?Math.min(100,c/d*100):0)+'%';
  const a=$('#qkmcur'),b=$('#qkmdur');if(a)a.textContent=fmt(c);if(b)b.textContent=d>0&&isFinite(d)?fmt(d):'0:00';
  const pl=$('#qkmpl');if(pl){const pp=!au.paused&&!loadingTrack?'p':'s';if(pl.dataset.s!==pp){pl.dataset.s=pp;pl.innerHTML=pp==='p'?QK_PAUSE:QK_PLAY}}
}
function qkPinHtml(p){
  const s=p.s;let body;
  if(s.k==='c'){
    const rows=s.c.slice(0,6).map(i=>`<div class="qkci${i.x?' dn':''}"><span>${i.x?'✓':''}</span>${esc(i.d)}</div>`).join('');
    body=(rows||'<div class="qkmore">Пусто</div>')+(s.c.length>6?`<div class="qkmore">и ещё ${s.c.length-6}</div>`:'');
  }else body=`<div class="qkbd">${s.b.trim()?esc(s.b):'<span class="qkmore">Пусто</span>'}</div>`;
  return `<div class="qkpin" role="button" tabindex="0" data-qkpin><div class="qkpl">${icon(s.k==='c'?'check':'edit')}На шторке</div><div class="qkpt">${esc(s.t||'Без названия')}</div>${body}</div>`;
}
function quickOpen(){
  if($('#qks'))return;
  const ord=qkOrder(),L=[...extMine().filter(e=>e.id!=='quick'),...qkExtra()].map((e,i)=>({e,k:ord.indexOf(e.id)>=0?ord.indexOf(e.id):1e3+i})).sort((a,b)=>a.k-b.k).map(x=>x.e);
  const pin=qkPin();QK.mo=0;
  const el=document.createElement('div');el.id='qks';
  el.innerHTML=`<div class="qkp"><div class="qkh"><div><div class="qkclk" id="qkclk"></div><button class="qkdt" id="qkdbtn" data-qkcal aria-label="Показать календарь"><span id="qkdate"></span>${icon('down')}</button></div><button data-qkset aria-label="Настройки быстрого доступа">${icon('gear')}</button></div><div class="qkc" id="qkcal"></div>${ld('tgqmus','off')==='on'?'<div class="qkm" id="qkmus"></div>':''}${L.length?`<div class="qkg">${L.map((e,i)=>`<button class="qkt" data-qk="${e.id}" style="animation-delay:${(.1+i*.05).toFixed(2)}s"><span class="qki">${icon(e.ic)}</span><span class="qkn">${esc(e.virt?e.name:extName(e.id))}</span></button>`).join('')}</div><div class="qkhint">Удерживайте плитку, чтобы переставить</div>`:'<div class="qke">Пока нет подключённых расширений</div>'}${pin?qkPinHtml(pin):''}<div class="qkbar"></div></div>`;
  document.body.appendChild(el);
  QK.mid=-1;qkTick();qkCalPaint();qkMusPaint();clearInterval(QK.iv);QK.iv=setInterval(qkTick,500);
  qkBindDrag(el.querySelector('.qkg'));
  void el.offsetHeight;el.classList.add('on');
  try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}
}
function quickClose(now){
  clearInterval(QK.iv);QK.drag=false;
  const el=$('#qks');if(!el)return;
  if(now){el.remove();return}
  el.classList.remove('on');setTimeout(()=>{if(el.parentNode&&!el.classList.contains('on'))el.remove()},320);
}
/* плитка «Консоль» у администратора (в том числе включённого кодом): не расширение, а вход в консоль */
function qkExtra(){return isAdmin()?[{id:'console',name:'Консоль',ic:'users',virt:1,open:()=>drawConsole()}]:[]}
function quickGo(id){
  const x=EXTS.find(q=>q.id===id)||qkExtra().find(q=>q.id===id);if(!x||(!x.virt&&!extMine().includes(x)))return;
  quickClose(true);fromSet=false;admParent=null;x.open();
}
async function qkOpenPin(){
  const p=qkPin();if(!p)return;
  const x=EXTS.find(q=>q.id==='notes');if(!x)return;
  quickClose(true);fromSet=false;admParent=null;
  try{await x.open()}catch(e){return}
  if(NTD.some(n=>n.id===p.id))ntOpen(p.id);else{qkPinDel();say('Эта заметка уже удалена',1)}
}
/* перестановка плиток: удержать плитку и перетащить; порядок запоминается */
function qkBindDrag(grid){
  if(!grid)return;
  let tm=0,st=null,ghost=null,ph=null,ox=0,oy=0,lastSw=0;
  const tiles=()=>[...grid.querySelectorAll('.qkt')],clear=()=>{clearTimeout(tm);tm=0};
  const begin=(tile,x,y)=>{
    const r=tile.getBoundingClientRect();ph=tile;ox=x-r.left;oy=y-r.top;
    ghost=tile.cloneNode(true);ghost.className='qkt qkghost';ghost.removeAttribute('data-qk');
    Object.assign(ghost.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
    $('#qks').appendChild(ghost);tile.classList.add('qkph');QK.drag=true;
    try{navigator.vibrate&&navigator.vibrate(14)}catch(e){}
  };
  const move=(x,y)=>{
    if(!ghost)return;
    ghost.style.left=(x-ox)+'px';ghost.style.top=(y-oy)+'px';
    const now=Date.now();if(now-lastSw<140)return;
    const all=tiles(),tg=all.find(t=>{if(t===ph)return false;const r=t.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom});
    if(!tg)return;
    const before=new Map(all.map(t=>[t,t.getBoundingClientRect()])),pi=all.indexOf(ph),ti=all.indexOf(tg);
    grid.insertBefore(ph,pi<ti?tg.nextSibling:tg);lastSw=now;
    for(const t of all){if(t===ph)continue;const a=before.get(t),b=t.getBoundingClientRect(),dx=a.left-b.left,dy=a.top-b.top;if(dx||dy)t.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:180,easing:'ease'})}
  };
  const end=()=>{
    clear();if(!QK.drag)return;
    QK.drag=false;QK.noClick=Date.now();
    if(ghost){ghost.remove();ghost=null}
    if(ph){ph.classList.remove('qkph');ph=null}
    sv('tgqord',tiles().map(t=>t.dataset.qk));
  };
  grid.addEventListener('touchstart',e=>{const tile=e.target.closest('.qkt');if(!tile||e.touches.length!==1)return;const t=e.touches[0];st={x:t.clientX,y:t.clientY};clear();tm=setTimeout(()=>begin(tile,st.x,st.y),380)},{passive:true});
  grid.addEventListener('touchmove',e=>{const t=e.touches[0];if(!QK.drag){if(tm&&st&&(Math.abs(t.clientX-st.x)>9||Math.abs(t.clientY-st.y)>9))clear();return}if(e.cancelable)e.preventDefault();move(t.clientX,t.clientY)},{passive:false});
  grid.addEventListener('touchend',end);grid.addEventListener('touchcancel',end);
  const mm=e=>{if(QK.drag)move(e.clientX,e.clientY);else if(tm&&st&&(Math.abs(e.clientX-st.x)>9||Math.abs(e.clientY-st.y)>9))clear()};
  const mu=()=>{window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu);end()};
  grid.addEventListener('mousedown',e=>{const tile=e.target.closest('.qkt');if(!tile||e.button!==0)return;st={x:e.clientX,y:e.clientY};clear();tm=setTimeout(()=>begin(tile,st.x,st.y),380);window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu)});
}
document.addEventListener('click',e=>{
  const el=$('#qks');if(!el||!e.isTrusted)return;
  const mo=e.target.closest('[data-qkm]');if(mo){const v=+mo.dataset.qkm;QK.mo=v===0?0:QK.mo+v;qkCalPaint();return}
  if(e.target.closest('[data-qkcal]')){const c=$('#qkcal'),d=$('#qkdbtn');if(c){const o=!c.classList.contains('open');c.classList.toggle('open',o);d.classList.toggle('open',o);if(o){QK.mo=0;qkCalPaint()}}return}
  const mp=e.target.closest('[data-qkmp]');if(mp){const k=mp.dataset.qkmp;if(k==='prev')qkFire('#pprev');else if(k==='next')qkFire('#pnext');else qkFire('#pplay');setTimeout(qkMusTick,150);return}
  if(e.target.closest('[data-qkmo]')){if(pi>=0){quickClose(true);showPl(true);expandPl()}return}
  if(e.target.closest('[data-qkmr]')){quickClose(true);if(lastAud()||shSaved()||audioList().length)qkFire('#pbtn');else say('Включите трек из списка');return}
  const sk=e.target.closest('[data-qkmseek]');if(sk){const r=sk.getBoundingClientRect(),d=au.duration;if(d>0&&isFinite(d)){au.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*d;qkMusTick()}return}
  if(e.target.closest('[data-qkpin]')){qkOpenPin();return}
  const b=e.target.closest('[data-qk]');if(b){if(Date.now()-QK.noClick<500)return;quickGo(b.dataset.qk);return}
  if(e.target.closest('[data-qkset]')){quickClose(true);openExtSet('quick',true);return}
  if(!e.target.closest('.qkp'))quickClose();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')quickClose()});
/* свайп вниз: из любого места главного экрана, если под пальцем нечего прокручивать вверх (у верхнего края сработает раньше) */
document.addEventListener('touchstart',e=>{
  QK.trk=false;QK.up=false;
  const root=$('#qks');
  if(root){
    const tg=e.target,p=root.querySelector('.qkp');
    QK.sy=e.touches[0].clientY;
    QK.up=!tg.closest('.qkp')||!!tg.closest('.qkbar')||!!(p&&p.scrollHeight<=p.clientHeight+1&&!tg.closest('.qkg'));
    return;
  }
  if(e.touches.length!==1||!quickOn()||!quickIdle())return;
  const t=e.touches[0];
  if(t.clientX<32)return;
  if(e.target.closest('input,select,textarea,#pl,#sortm,#fltm,#fabm'))return;
  if(qkCanUp(e.target))return;
  QK.x=t.clientX;QK.y=t.clientY;QK.thr=t.clientY<150?64:90;QK.trk=true;
},{passive:true});
document.addEventListener('touchmove',e=>{
  if($('#qks')){if(QK.up&&!QK.drag&&e.touches[0].clientY-QK.sy<-60){QK.up=false;quickClose()}return}
  if(!QK.trk)return;
  const t=e.touches[0],dx=t.clientX-QK.x,dy=t.clientY-QK.y;
  if(Math.abs(dx)>Math.abs(dy)*.6&&Math.abs(dx)>14){QK.trk=false;return}
  if(dy>12&&e.cancelable)e.preventDefault();
  if(dy>=QK.thr){QK.trk=false;quickOpen()}
},{passive:false});
document.addEventListener('touchend',()=>{QK.trk=false;QK.up=false});
document.addEventListener('touchcancel',()=>{QK.trk=false;QK.up=false});

