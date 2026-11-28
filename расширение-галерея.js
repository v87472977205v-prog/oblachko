/* ===== ФАЙЛ расширение-галерея.js =====
   
   Расширение «Галерея»: все фото и видео из облака одной лентой, как в обычной галерее телефона.
   Лента от новых к старым (можно перевернуть), заголовки по месяцам, плотная сетка квадратиков (3/4/5 в ряд),
   фильтры «Всё / Фото / Видео» и по репозиториям. Нажатие открывает обычный просмотрщик приложения со свайпом
   влево-вправо по всей ленте. Закрытые паролем и зашифрованные без ключа места пропускаются.
   Ничего не меняет в файлах: только читает список files и использует urlOf(), thumb(), showAt() из ядра.
   Выдаётся пользователям как любое расширение (Консоль → Расширения → «+»). Настройки (фильтр, плотность, порядок) — на устройстве, ключ tggal.
   Порядок загрузки — в модули.js: ДО ядро-23-выход-назад.js (чтобы кнопка «назад» закрывала галерею раньше остальных).
   Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
addCss('gal',`
  #gal{position:fixed;inset:0;z-index:8;background:var(--bgfx,var(--bg));display:flex;flex-direction:column;font-family:system-ui,sans-serif;color:var(--ink)}
  #gal[hidden]{display:none}
  #gal .gh{display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 12px 8px}
  #gal .gh .gb{flex:none;width:42px;height:42px;padding:0;border-radius:50%;display:grid;place-items:center;background:var(--card);border:1px solid var(--line);color:var(--ink)}
  #gal .gh .gb .i{width:20px;height:20px}
  #gal .gt1{flex:1;min-width:0}
  #gal .gt1 b{display:block;font-size:19px;font-weight:700}
  #gal .gt1 span{display:block;font-size:12.5px;color:var(--mute);margin-top:1px}
  #gal .gc{display:flex;gap:8px;overflow-x:auto;padding:4px 12px 10px;scrollbar-width:none}
  #gal .gc::-webkit-scrollbar{display:none}
  #gal .gc button{flex:none;padding:8px 14px;border-radius:99px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:14px;font-weight:500;white-space:nowrap}
  #gal .gc button.on{background:var(--acc);color:var(--accink);border-color:var(--acc);font-weight:700}
  #gal .gc i{flex:none;width:1px;background:var(--line);margin:4px 2px}
  #gal .gs{flex:1;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:0 0 calc(24px + env(safe-area-inset-bottom))}
  #gal .gm{position:sticky;top:0;z-index:2;padding:10px 14px 6px;font-size:14px;font-weight:700;background:linear-gradient(var(--bg) 70%,transparent);letter-spacing:.2px}
  #gal .gm span{font-weight:500;color:var(--mute);margin-left:6px;font-size:12.5px}
  #gal .gg{display:grid;gap:3px;padding:0 3px;content-visibility:auto;contain-intrinsic-size:auto 400px}
  #gal .gt{position:relative;aspect-ratio:1;overflow:hidden;background:var(--card);border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;font:600 12px system-ui;color:var(--mute);-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;user-select:none}
  #gal .gt:not(.ok){background:linear-gradient(100deg,var(--card) 30%,var(--line) 50%,var(--card) 70%) 0 0/200% 100%;animation:shim 1.3s linear infinite}
  #gal .gt img,#gal .gt video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;-webkit-user-drag:none}
  #gal .gt:active{opacity:.75}
  #gal .gt .pb{position:absolute;right:5px;bottom:5px;background:rgba(0,0,0,.6);color:#fff;border-radius:50%;width:22px;height:22px;font-size:10px;line-height:22px;text-align:center;pointer-events:none}
  #gal .ge{padding:60px 20px;text-align:center;color:var(--mute);font-size:15px;line-height:1.5}
  #gal .ge .big{display:block;font-size:46px;margin-bottom:8px}
`);
const GAL={on:false,t:'all',r:'*',c:3,rev:false,ids:[],map:new Map(),q:[],act:0,io:null,...(ld('tggal',{})||{})};
GAL.on=false;GAL.ids=[];GAL.map=new Map();GAL.q=[];GAL.act=0;GAL.io=null;
const galSave=()=>sv('tggal',{t:GAL.t,r:GAL.r,c:GAL.c,rev:GAL.rev});
const GAL_MON=['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const galIsImg=f=>(f.mime||'').startsWith('image/'),galIsVid=f=>(f.mime||'').startsWith('video/');
function galOk(f){
  if(!(galIsImg(f)||galIsVid(f)))return false;
  try{
    if(repoBlocked(f.repo)||isLocked(f.repo,f.path)||(f.repo!==undefined&&needKey(f.repo)))return false;
    if(f.enc&&f.dec!==1)return false;
  }catch(e){return false}
  return true;
}
const galRepos=()=>{const out=[];try{for(const r of[...(repoBlocked('')?[]:['']),...repos.filter(visRepo).map(x=>x.name)]){if(!isLocked(r,''))out.push(r)}}catch(e){}return out};
function galList(){
  let L=files.filter(galOk);
  if(GAL.r!=='*')L=L.filter(f=>f.repo===GAL.r);
  const all=L;
  if(GAL.t==='img')L=L.filter(galIsImg);else if(GAL.t==='vid')L=L.filter(galIsVid);
  L=L.slice().sort((a,b)=>(b.date-a.date)||(b.id-a.id));
  if(GAL.rev)L.reverse();
  return{L,all};
}
function galDraw(){
  const root=$('#gal');if(!root)return;
  const{L,all}=galList(),np=all.filter(galIsImg).length,nv=all.filter(galIsVid).length;
  const rs=galRepos();
  if(GAL.r!=='*'&&!rs.includes(GAL.r)){GAL.r='*';galSave();return galDraw()}
  const chip=(k,v,t,on)=>`<button data-${k}="${esc(v)}" class="${on?'on':''}">${esc(t)}</button>`;
  $('#galhd').innerHTML=`<button class="gb" data-gback aria-label="Назад">${icon('back')}</button><div class="gt1"><b>Галерея</b><span>${np?'Фото: '+np:''}${np&&nv?' · ':''}${nv?'Видео: '+nv:''}${!np&&!nv?'Пока пусто':''}</span></div><button class="gb" data-grev aria-label="Порядок" title="${GAL.rev?'Сначала старые':'Сначала новые'}">${icon('down')}</button><button class="gb" data-gcols aria-label="Размер">${icon('grid')}</button>`;
  $('#galhd [data-grev] .i').style.transform=GAL.rev?'rotate(180deg)':'';
  $('#galch').innerHTML=chip('gt','all','Всё',GAL.t==='all')+chip('gt','img','Фото',GAL.t==='img')+chip('gt','vid','Видео',GAL.t==='vid')+(rs.length>1?'<i></i>'+chip('gr','*','Все репозитории',GAL.r==='*')+rs.map(r=>chip('gr',r,r||'Облако',GAL.r===r)).join(''):'');
  const sc=$('#galsc');
  GAL.map=new Map(L.map(f=>[f.id,f]));GAL.ids=L.map(f=>f.id);GAL.q=[];
  if(GAL.io)GAL.io.disconnect();
  if(!L.length){sc.innerHTML=`<div class="ge"><span class="big">🖼️</span>${all.length?'В этом фильтре ничего нет':'Фото и видео в облаке пока нет'}</div>`;return}
  let html='',cur='',n=0,buf='';
  const flush=()=>{if(buf){html+=`<div class="gg" style="grid-template-columns:repeat(${GAL.c},1fr)">${buf}</div>`;buf=''}};
  const head=(k,cnt)=>`<div class="gm">${esc(k)}<span>${cnt}</span></div>`;
  const groups=[];
  for(const f of L){const d=new Date(f.date),k=GAL_MON[d.getMonth()].replace(/^./,c=>c.toUpperCase())+' '+d.getFullYear();if(!groups.length||groups[groups.length-1].k!==k)groups.push({k,a:[]});groups[groups.length-1].a.push(f)}
  for(const g of groups){
    html+=head(g.k,g.a.length);
    html+=`<div class="gg" style="grid-template-columns:repeat(${GAL.c},1fr)">`+g.a.map(f=>{
      const th=(galIsImg(f)&&f.size<=8e6)||(galIsVid(f)&&f.size<=25e6);
      return`<div class="gt" data-gid="${f.id}" ${th?`data-gth="${f.id}"`:'data-gnoth="1"'}>${th?'':esc(ext(f.name))}${galIsVid(f)&&!th?'<span class="pb">▶</span>':''}</div>`;
    }).join('')+'</div>';
  }
  sc.innerHTML=html;
  sc.querySelectorAll('[data-gnoth]').forEach(e=>e.classList.add('ok'));
  GAL.io=new IntersectionObserver(es=>{for(const e of es){if(!e.isIntersecting)continue;GAL.io.unobserve(e.target);GAL.q.push(e.target)}galPump()},{root:sc,rootMargin:'300px'});
  sc.querySelectorAll('[data-gth]').forEach(el=>{const f=GAL.map.get(+el.dataset.gth);if(f&&C.has(f.id)){el.innerHTML=thumb(f,C.get(f.id));el.classList.add('ok')}else GAL.io.observe(el)});
}
/* миниатюры грузим по 3 штуки сразу, чтобы не забивать связь с Telegram */
function galPump(){
  while(GAL.act<3&&GAL.q.length){
    const el=GAL.q.shift();if(!el.isConnected)continue;
    if(U.on||loadingTrack){const e=el;setTimeout(()=>{if(e.isConnected&&GAL.io)GAL.io.observe(e)},4000);continue}
    const f=GAL.map.get(+el.dataset.gth);if(!f)continue;
    GAL.act++;
    urlOf(f).then(u=>{if(el.isConnected)el.innerHTML=thumb(f,u)}).catch(()=>{}).finally(()=>{el.classList.add('ok');GAL.act--;galPump()});
  }
}
function galClose(){const r=$('#gal');if(r)r.hidden=true;GAL.on=false;if(GAL.io){GAL.io.disconnect();GAL.io=null}GAL.q=[]}
function openGallery(){
  let root=$('#gal');
  if(!root){
    root=document.createElement('div');root.id='gal';
    root.innerHTML='<div class="gh" id="galhd"></div><div class="gc" id="galch"></div><div class="gs" id="galsc"></div>';
    document.body.appendChild(root);
    root.addEventListener('click',e=>{
      const t=e.target;
      if(t.closest('[data-gback]')){galClose();return}
      if(t.closest('[data-grev]')){GAL.rev=!GAL.rev;galSave();galDraw();return}
      if(t.closest('[data-gcols]')){GAL.c=GAL.c>=5?3:GAL.c+1;galSave();galDraw();return}
      const ct=t.closest('[data-gt]');if(ct){GAL.t=ct.dataset.gt;galSave();galDraw();return}
      const cr=t.closest('[data-gr]');if(cr){GAL.r=cr.dataset.gr;galSave();galDraw();return}
      const g=t.closest('[data-gid]');
      if(g){const i=GAL.ids.indexOf(+g.dataset.gid);if(i>=0){curList=GAL.ids.slice();showAt(i)}}
    });
  }
  try{$('#adm').hidden=true}catch(e){}
  root.hidden=false;GAL.on=true;
  galDraw();
  /* зашифрованные файлы получают названия и типы только после расшифровки */
  try{if(files.some(f=>f.enc&&!f.dec&&KEYS[f.repo]))decAll().then(()=>{if(GAL.on)galDraw()},()=>{})}catch(e){}
}
registerExt({id:'gallery',name:'Галерея',ic:'picture',open:()=>openGallery()});
/* кнопка «назад»: если открыта галерея (и поверх неё нет просмотра/меню) — закрываем её первой и не пускаем событие дальше */
window.addEventListener('popstate',e=>{
  if(!GAL.on||!$('#vw').hidden||!$('#pick').hidden||!$('#kpick').hidden||$('#pl').classList.contains('full'))return;
  galClose();try{hFill()}catch(x){}e.stopImmediatePropagation();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&GAL.on&&$('#vw').hidden)galClose()});
/* список файлов изменился (новые загрузки, расшифровка) — обновляем ленту, если галерея открыта и просмотр закрыт */
onApp('render',()=>{if(GAL.on&&$('#vw').hidden&&!GAL.busy){GAL.busy=1;setTimeout(()=>{GAL.busy=0;if(GAL.on&&$('#vw').hidden){const sc=$('#galsc'),y=sc?sc.scrollTop:0,ids=galList().L.map(x=>x.id).join();if(ids!==GAL.ids.join()){galDraw();if(sc)sc.scrollTop=y}}},400)}});
