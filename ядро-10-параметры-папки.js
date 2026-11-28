/* ===== ФАЙЛ ядро-10-параметры-папки.js =====
   
   Настройки папки, isAdmin.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
function openFolderSet(){
  const r=R(),c=cur;fromSet=false;admParent=null;
  openAdm(c?'Папка «'+base(c)+'»':(r||'Облако'));
  const it=[];
  if(c){
    if(canPw(r))it.push(['lkf','lock',lockOf(r,c)?'Снять пароль с папки':'Запаролить папку']);
    it.push(['rnf','edit','Переименовать'],['mvf','move','Переместить'],['cpf','copy','Копировать'],['delf','trash','Удалить папку','del']);
  }else{
    it.push(['newf','folderplus','Новая папка']);
    if(r)it.push(['repo','repo','Настройки репозитория']);
  }
  $('#admb').innerHTML=(c?'':'<div class="fsn">Вы в корне. Откройте папку, чтобы настроить её.</div>')+`<div class="stl">${it.map(([k,ic,tx,cl])=>`<button data-fs="${k}"${cl?` class="${cl}"`:''}>${icon(ic)}<span>${tx}</span></button>`).join('')}</div>`;
}
$('#gearb').onclick=e=>{e.stopPropagation();openFolderSet()};
$('#admb').addEventListener('click',e=>{
  const b=e.target.closest('[data-fs]');if(!b)return;
  const k=b.dataset.fs;$('#adm').hidden=true;fromSet=false;admParent=null;
  if(k==='repo')openRepoMenu(R());
  else if(k==='newf')$('#fabd').click();
  else $('#'+k).click();
});
$('#admb').addEventListener('click',e=>{const b=e.target.closest('[data-set]');if(!b)return;const k=b.dataset.set;
  const ACT={upd:appUpdate,ulg:ulShow},SETK={cov:openCov,lks:openLks,cch:openCache,raw:openRaw,inst:()=>instPage(true)},ADMK={usr:openUsers,acc:openAccList,jrn:openJournal,key:makeKey,ann:openAnn,ext:openExtAdmin,stat:openStats,adx:openAdx};
  if(ACT[k]){ACT[k]();return}
  if(SETK[k]){fromSet=true;admParent=drawSettings;SETK[k]();return}
  if(ADMK[k]){if(!isAdmin())return;fromSet=true;admParent=drawConsole;ADMK[k]()}  /* консоль и всё из неё — только у владельца */
});

let ADXON=false;   /* v129: режим администратора, включённый кодом на этом устройстве (функция-режим-администратора.js) */
const isAdmin=()=>(!S.viewer&&!S.guestUser)||ADXON;

