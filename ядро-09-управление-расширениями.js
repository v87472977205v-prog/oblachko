/* ===== ФАЙЛ ядро-09-управление-расширениями.js =====
   
   Клики в списке расширений (консоль), вопрос пользователю «Новое расширение».
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
$('#admb').addEventListener('click',async e=>{
  const g=a=>e.target.closest('['+a+']');
  const o=g('data-exo'),p=g('data-exp'),u=g('data-exu'),m=g('data-exm'),v=g('data-exv'),w=g('data-exw');
  const rn=g('data-exg'),es=g('data-exs');
  if(rn){if(isAdmin())openExtSet(rn.dataset.exg);return}
  if(es){openExtSet(es.dataset.exs);return}
  if(o){const x=EXTS.find(q=>q.id===o.dataset.exo);if(x&&isAdmin()){fromSet=true;admParent=openExtAdmin;x.open()}return}
  if(m){const x=EXTS.find(q=>q.id===m.dataset.exm);if(x&&extMine().includes(x)){fromSet=true;admParent=openExts;x.open()}return}
  if(p){if(isAdmin())openExtUsers(p.dataset.exp);return}
  if(v){if(isAdmin())openExtUsers(v.dataset.exv,true);return}
  if(w){
    if(!isAdmin()||w.disabled)return;
    const id=w.dataset.exw,name=w.dataset.u;
    if(!confirm('Отозвать расширение «'+extName(id)+'» у пользователя «'+name+'»? Оно пропадёт из его меню.'))return;
    w.disabled=true;
    try{await extSend({k:'r',x:id,u:name});jlog('extrv',extName(id)+' ← '+name);say('Расширение отозвано');openExtUsers(id,true)}
    catch(err2){say('Не удалось отозвать: '+err(err2),1);w.disabled=false}
    return;
  }
  if(u){
    if(!isAdmin()||u.disabled)return;
    const id=u.dataset.exu,name=u.dataset.u,x=EXTS.find(q=>q.id===id);if(!x)return;
    const s0=extState(id,name);
    if(s0==='a'){say('У пользователя «'+name+'» это расширение уже подключено');return}
    if(s0==='o'){say('Предложение уже отправлено, ждём ответа');return}
    if(!confirm('Предложить расширение «'+extName(x.id)+'» пользователю «'+name+'»?'))return;
    u.disabled=true;
    try{await extSend({k:'o',x:id,u:name});jlog('ext+',extName(x.id)+' → '+name);say('Предложение отправлено');openExtUsers(id)}
    catch(err2){say('Не удалось отправить: '+err(err2),1);u.disabled=false}
  }
});
function extAsk(x){
  const o=document.createElement('div');o.id='extq';o.className='pg';
  o.innerHTML=`<div class="pgin">${PGLOGO}<h1 class="pgt">Новое расширение</h1><p class="pgs">${esc(extName(x.id))}</p><div class="pgc"><p>Владелец предлагает вам подключить расширение «${esc(extName(x.id))}». Подключить?</p></div></div><div class="pgf"><button class="pgp" id="extyes">Да</button><button class="pgp no" id="extno">Нет</button></div>`;
  document.body.appendChild(o);
  const bs=[$('#extyes'),$('#extno')];
  const reply=async k=>{
    bs.forEach(b=>b.disabled=true);
    try{
      await extSend({k,x:x.id,u:S.guestUser});jlog(k==='a'?'extok':'extno',extName(x.id));o.remove();extSync();
      say(k==='a'?'Расширение подключено: '+extName(x.id)+'. Оно в меню → Расширения':'Вы отказались от расширения');
      setTimeout(extAuto,400);
    }catch(err2){say('Не удалось ответить: '+err(err2),1);bs.forEach(b=>b.disabled=false)}
  };
  $('#extyes').onclick=()=>reply('a');$('#extno').onclick=()=>reply('d');
}
const extAsked=new Set();let extTry=0;
function extAuto(){
  if(isAdmin()||!S.guestUser||$('#extq'))return;
  const x=EXTS.find(q=>extState(q.id,S.guestUser)==='o'&&!extAsked.has(q.id));if(!x)return;
  if(booting||!ready||showSetup||$('#ann')){if(extTry++<600)setTimeout(extAuto,700);return}
  extTry=0;extAsked.add(x.id);extAsk(x);
}
