/* ===== ФАЙЛ функция-объявления.js =====
   
   Функция: объявления (владелец пишет, пользователи видят один раз).
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- объявления: пишет владелец, пользователи видят один раз ---- */
const annDate=t=>new Date(t||Date.now()).toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'});
const annNext=()=>{const l=ANN[ANN.length-1];if(!l)return '1.0';const m=String(l.v).match(/^(.*?)(\d+)$/);return m?m[1]+(+m[2]+1):l.v+'.1'};
const PGLOGO='<svg class="rglogo" viewBox="0 0 64 64" aria-hidden="true"><path d="M17 46a11 11 0 0 1-1.6-21.9A17 17 0 0 1 48 23.5 11.6 11.6 0 0 1 48.5 46z" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linejoin="round"/><path d="M32 41V28m-6 6l6-6 6 6" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function annView(a,preview,done){
  let o=$('#ann');if(o)o.remove();
  o=document.createElement('div');o.id='ann';o.className='pg';
  o.innerHTML=`<div class="pgin">${PGLOGO}<h1 class="pgt">Что нового</h1><p class="pgs">Версия ${esc(a.v)} · ${esc(annDate(a.d))}</p>${preview?'<div style="text-align:center"><span class="pgb">Так увидят пользователи</span></div>':''}<div class="pgc"><ul>${a.l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div><div class="pgf"><button class="pgp" id="annok">${preview?'Закрыть':'Понятно'}</button></div>`;
  document.body.appendChild(o);
  $('#annok').onclick=()=>{o.remove();if(done)done()};
}
const annSeen=()=>+(localStorage.getItem('tgann')||0);
const annMark=id=>{try{localStorage.setItem('tgann',String(id))}catch(e){}};
let annTry=0;
function annAuto(){
  const a=ANN[ANN.length-1];if(!a||a.id<=annSeen()||$('#ann'))return;
  if(booting||!ready||showSetup){if(annTry++<600)setTimeout(annAuto,500);return}
  annTry=0;annView(a,false,()=>annMark(a.id));
}
function drawAnnList(){
  if(!isAdmin())return;
  const el=$('#annlist');if(!el)return;
  const L=[...ANN].sort((a,b)=>b.id-a.id);
  el.innerHTML=L.length?L.map(a=>`<div class="uc"><div class="un">Версия ${esc(a.v)} · ${esc(annDate(a.d))}</div><div class="us">${a.l.map(x=>'• '+esc(x)).join('<br>')}</div><div class="row"><button class="del" data-anndel="${a.id}">Удалить</button></div></div>`).join(''):'<div class="us">Пока ничего не опубликовано</div>';
}
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-anndel]');if(!b||S.viewer)return;
  const id=+b.dataset.anndel,a=ANN.find(x=>x.id===id);if(!a||b.disabled)return;
  if(!confirm('Удалить оповещение, версия '+a.v+'? Оно пропадёт у всех пользователей.'))return;
  b.disabled=true;
  try{await withChat(()=>client.deleteMessages(S.chat,[id]));ANN=ANN.filter(x=>x.id!==id);jlog('ann-',a.v);say('Оповещение удалено');drawAnnList()}
  catch(x){say('Не удалось удалить: '+err(x),1);b.disabled=false}
});
function openAnn(){
  if(!isAdmin())return;
  if(S.viewer)return;
  openAdm('Оповещения');
  const last=ANN[ANN.length-1],v=annNext(),d=annDate();
  $('#admb').innerHTML=`<div style="padding:10px 14px"><div class="uc"><div class="un">Версия ${esc(v)} · ${esc(d)}</div><div class="us">Номер и дата подставляются сами. Напишите, что изменилось: Enter или «Следующая строка» добавляет новую строчку.</div><div id="annls"></div><div class="row"><button id="annadd">+ Следующая строка</button></div><div class="row"><button id="annprev">Посмотреть</button><button class="p" id="annpub">Опубликовать</button></div></div><div class="un" style="margin:4px 0 8px">Опубликованные</div><div id="annlist"></div></div>`;
  drawAnnList();
  const box=$('#annls');
  const add=(focus)=>{const r=document.createElement('div');r.className='annl';r.innerHTML='<input type="text" placeholder="Что изменилось"><button class="del" aria-label="Убрать">✕</button>';box.appendChild(r);const i=r.querySelector('input');i.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();add(true)}};r.querySelector('button').onclick=()=>{if(box.children.length>1)r.remove();else i.value=''};if(focus)i.focus()};
  add(false);
  const lines=()=>[...box.querySelectorAll('input')].map(i=>i.value.trim()).filter(Boolean);
  $('#annadd').onclick=()=>add(true);
  $('#annprev').onclick=()=>{const l=lines();if(!l.length){say('Напишите хотя бы одну строчку',1);return}annView({v,d:Date.now(),l},true)};
  $('#annpub').onclick=async e=>{
    const l=lines();if(!l.length){say('Напишите хотя бы одну строчку',1);return}
    if(!confirm('Опубликовать оповещение, версия '+v+'? Каждый пользователь увидит его один раз.'))return;
    const b=e.target;b.disabled=true;
    try{
      const a={v,d:Date.now(),l},m=await withChat(()=>client.sendMessage(S.chat,AN+JSON.stringify(a)));
      ANN.push({...a,id:m.id});annMark(m.id);jlog('ann',v);say('Оповещение опубликовано');drawAnnList();
    }catch(x){say('Не удалось опубликовать: '+err(x),1);b.disabled=false}
  };
}
