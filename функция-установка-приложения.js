/* ===== ФАЙЛ функция-установка-приложения.js =====
   
   Функция: установка как приложения (PWA).
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- Установка как приложения ----
   Первый запуск в браузере: полноэкранная страница «Установите приложение» с кнопкой (instPage). Android/ПК Chrome:
   событие beforeinstallprompt, кнопка вызывает системную установку (приложение, а не ярлык); iPhone: пошаговая
   инструкция «На экран Домой». Если выбрано «Продолжить в браузере», раз в 3 дня мягко напоминает компактная панель
   (installOpen) до установки. Не показываем в установленном приложении. 'tginst': done / later, 'tginstt': время.
   Вручную: Настройки → «Установить приложение». */
const INST={ev:null,tries:0};
const instStandalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true}catch(e){return false}};
const instIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const instState=()=>ld('tginst','');
const instLater=()=>{sv('tginst','later');sv('tginstt',Date.now())};
function instAuto(){
  if(instStandalone()||$('#inst')||$('#instp'))return;
  const s=instState();
  if(s==='done')return;
  if(!$('#pw').hidden||!$('#up').hidden){if(INST.tries++<8)setTimeout(instAuto,4000);return}
  if(!s){instPage(false);return}
  if(Date.now()-(+ld('tginstt',0))>3*864e5)installOpen(false);
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();INST.ev=e;setTimeout(instAuto,1500)});
window.addEventListener('appinstalled',()=>{INST.ev=null;sv('tginst','done');instClose();try{say('Приложение установлено')}catch(e){}});
if(instIOS()&&!instStandalone())setTimeout(instAuto,3000);
function instClose(){
  for(const id of['#inst','#instp']){const el=$(id);if(!el)continue;el.classList.remove('on');setTimeout(()=>el.remove(),320)}
}
const instBody=(ev,ios)=>{
  const shareI='<svg class="i" viewBox="0 0 24 24"><path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  if(ev)return{main:`<button class="ibtn" data-inst="go">Установить</button>`,hint:''};
  if(ios)return{main:`<ol class="ist"><li><b>1</b><span>Нажмите «Поделиться» ${shareI} внизу экрана Safari</span></li><li><b>2</b><span>Выберите «На экран “Домой”»</span></li><li><b>3</b><span>Нажмите «Добавить»</span></li></ol>`,hint:'Открывайте сайт именно в Safari. Значок появится на главном экране и запустится как приложение.'};
  return{main:`<ol class="ist"><li><b>1</b><span>Откройте меню браузера (три точки)</span></li><li><b>2</b><span>Выберите «Установить приложение» или «Добавить на главный экран»</span></li></ol>`,hint:'Лучше всего это работает в Chrome. Если такого пункта нет, возможно, приложение уже установлено.'};
};
/* компактная панель-напоминание */
function installOpen(manual){
  if($('#inst'))return;
  if(instStandalone()){if(manual)say('Приложение уже установлено');return}
  const ev=INST.ev,b=instBody(ev,instIOS());
  const el=document.createElement('div');el.id='inst';
  el.innerHTML=`<div class="ip"><img class="iic" src="icon-v4-192.png" alt=""><div class="it">Установить «Облачко»</div><div class="id">Ваши данные всегда под рукой.</div>${b.main}${b.hint?`<div class="ihint">${b.hint}</div>`:''}<button class="ibtn2" data-inst="no">Не сейчас</button></div>`;
  document.body.appendChild(el);void el.offsetHeight;el.classList.add('on');
}
/* полноэкранная страница установки в стиле приложения */
function instPage(manual){
  if($('#instp'))return;
  if(instStandalone()){if(manual)say('Приложение уже установлено');return}
  const ev=INST.ev,b=instBody(ev,instIOS());
  const row=(ic,h,d)=>`<div class="ipr"><span class="ipi">${icon(ic)}</span><div><b>${h}</b>${d?`<span>${d}</span>`:''}</div></div>`;
  const el=document.createElement('div');el.id='instp';el.className='pg ipg';
  el.innerHTML=`<div class="pgin"><svg class="rglogo ipl" viewBox="0 0 40 28" aria-hidden="true"><path d="M10 23a6.5 6.5 0 0 1-1-12.9A9 9 0 0 1 26 8.5 7 7 0 0 1 28 23z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="15" cy="15.5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M17.2 15.5h6m-2 0v2.2m-2.4-2.2v1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><h1 class="pgt">Облачко</h1><p class="pgs">Установите приложение</p><div class="pgc ipc">${row('cloud','Ваши данные всегда под рукой','')}</div>${b.main.replace('class="ibtn"','class="ibtn ipb"')}${b.hint?`<p class="ipk">${b.hint}</p>`:''}<button class="ipn" data-inst="no">${ev?'Продолжить в браузере':'Закрыть'}</button></div>`;
  document.body.appendChild(el);void el.offsetHeight;el.classList.add('on');
}
document.addEventListener('click',async e=>{
  const el=$('#inst')||$('#instp');if(!el)return;
  const b=e.target.closest('[data-inst]');
  if(!b){if(el.id==='inst'&&!e.target.closest('.ip')){instLater();instClose()}return}
  if(b.dataset.inst==='no'){instLater();instClose();return}
  const ev=INST.ev;if(!ev)return;
  INST.ev=null;instClose();
  try{ev.prompt();const r=await ev.userChoice;if(r&&r.outcome==='accepted')sv('tginst','done');else instLater()}catch(x){instLater()}
});
