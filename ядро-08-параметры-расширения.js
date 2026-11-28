/* ===== ФАЙЛ ядро-08-параметры-расширения.js =====
   
   Настройки расширений (шестерёнка): переименование, переключатели quick/tree.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* настройки расширения (шестерёнка в списке расширений): название (у администратора) и особые параметры */
function openExtSet(id,top){
  const x=EXTS.find(q=>q.id===id);if(!x)return;
  if(top){fromSet=false;admParent=null}else{fromSet=true;admParent=isAdmin()?openExtAdmin:openExts}
  openAdm(extName(id));
  let h='<div class="sw">';
  if(isAdmin())h+=`<div class="swc swtog"><div class="swt"><span class="swn1">Название</span><span class="swn2">${esc(extName(id))}</span></div><button class="swundo" data-exg2="${esc(id)}">Изменить</button></div>`;
  if(id==='tree'){
    const on=ld('tgtree','on')!=='off';
    h+=`<div class="swc swtog"><div class="swt"><span class="swn1">Дерево вместо списка</span><span class="swn2">Когда включено, в меню нет плашки «Все пользователи» и списка репозиториев, остаётся круглая кнопка с деревом.</span></div><button class="swsw" id="treesw" role="switch" aria-checked="${on}" aria-label="Дерево вместо списка"></button></div>`;
  }
  if(id==='quick'){
    const on=ld('tgquick','on')!=='off';
    h+=`<div class="swc swtog"><div class="swt"><span class="swn1">Быстрый доступ</span><span class="swn2">Включено: кнопка «Расширения» убирается из меню, а по свайпу вниз из любого места главного экрана открывается шторка с часами, календарём и плитками расширений.</span></div><button class="swsw" id="quicksw" role="switch" aria-checked="${on}" aria-label="Быстрый доступ к расширениям"></button></div>`;
    const mus=ld('tgqmus','off')==='on';
    h+=`<div class="swc swtog"><div class="swt"><span class="swn1">Музыка на шторке</span><span class="swn2">Плеер показывается в шторке под временем и над плитками. Нижняя панель плеера при этом скрывается.</span></div><button class="swsw" id="qkmussw" role="switch" aria-checked="${mus}" aria-label="Музыка на шторке"></button></div>`;
  }
  $('#admb').innerHTML=h+'</div>';
}
async function extRename(id){
  if(!isAdmin())return;
  const cur=extName(id),v=clean(String(await uiPrompt('Название расширения',cur)||'')).slice(0,40);
  if(!v||v===cur)return;
  try{await extSend({k:'n',x:id,u:'*',n:v});jlog('extrn',cur+' → '+v);say('Переименовано');openExtSet(id)}
  catch(err2){say('Не удалось переименовать: '+err(err2),1)}
}
/* --- продолжение (часть 2) --- */
$('#admb').addEventListener('click',e=>{
  const qm=e.target.closest&&e.target.closest('#qkmussw');
  if(qm){const on=qm.getAttribute('aria-checked')!=='true';sv('tgqmus',on?'on':'off');qm.setAttribute('aria-checked',on);quickSync();say(on?'Музыка перенесена на шторку':'Музыка снова внизу');return}
  const qs=e.target.closest&&e.target.closest('#quicksw');
  if(qs){const on=qs.getAttribute('aria-checked')!=='true';sv('tgquick',on?'on':'off');qs.setAttribute('aria-checked',on);extSync();say(on?'Быстрый доступ включён':'Быстрый доступ выключен');return}
  const sw=e.target.closest&&e.target.closest('#treesw');
  if(sw){const on=sw.getAttribute('aria-checked')!=='true';sv('tgtree',on?'on':'off');sw.setAttribute('aria-checked',on);treeSync();say(on?'Дерево включено':'Дерево выключено');return}
  const rn=e.target.closest&&e.target.closest('[data-exg2]');if(rn){extRename(rn.dataset.exg2);return}
  const t=e.target.closest&&e.target.closest('[data-trr]');if(t)treeGo(t.getAttribute('data-trr'));
});
/* --- продолжение (часть 3) --- */

