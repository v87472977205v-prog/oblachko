/* ===== ФАЙЛ расширение-дерево-репозиториев.js =====
   
   Расширение «Дерево репозиториев».
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- Расширение «Дерево репозиториев» ----
   Кнопка с деревом в шапке меню (рядом с тумблером «Все пользователи») видна только когда расширение подключено.
   Экран: облако — основание, пользователи — ветви, репозитории — листья; нажатие на лист открывает этот репозиторий. */
const treeOn=()=>extMine().some(e=>e.id==='tree')&&ld('tgtree','on')!=='off';
/* режим дерева: вместо плашки «Все пользователи» и списка репозиториев в меню остаётся круглая кнопка с деревом */
function treeSync(){
  const on=treeOn(),w=$('#treebw');
  if(w)w.hidden=!on;
  document.body.classList.toggle('treemode',on);
}
function openTree(){
  openAdm(extName('tree'));
  $('#admb').innerHTML=`<div class="sw"><div class="swtreew">${shTreeSvg('data-trr',r=>r===R())}</div></div>`;
}
/* --- продолжение (часть 2) --- */
async function treeGo(r){
  try{
    if(!await unlock(r,''))return;
    const x=repos.find(q=>q.name===r);
    if(x&&!showRepo(x))P.all=true;
    P.repo=r;sv('tgmp',P);cur='';selMode=false;sel.clear();$('#q').value='';
    $('#adm').hidden=true;fromSet=false;admParent=null;closeDrawer();render();
  }catch(x){say(err(x),1)}
}
/* --- продолжение (часть 3) --- */
$('#treeb').onclick=()=>{if(!treeOn())return;closeDrawer();fromSet=false;admParent=null;openTree()};
