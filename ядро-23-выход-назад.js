/* ===== ФАЙЛ ядро-23-выход-назад.js =====
   
   Выход из аккаунта, кнопка «назад».
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
$('#out').onclick=async()=>{
  if(!confirm('Выйти из аккаунта? Файлы в канале останутся.'))return;
  jlog('out','');for(let n=0;n<8&&(JQ.length||jBusy);n++){await jflush();await sleep(200)}
  try{if(client){if(client.signOut)await client.signOut();else if(client.logOut)await client.logOut()}}catch(e){}
  try{Object.keys(localStorage).filter(k=>k.includes(PFX)||k==='tgm'||k==='tgun'||['tgmp','tglast','tgpos','tgspd','tgshm','tgtree','tgcttl','tgrawkeep','tgrawwhy','tgmode','tgquick','tgnpin','tgqord','tgqmus','tgadx'].includes(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}
  try{idbOp('f','readwrite',s=>s.clear());idbOp('a','readwrite',s=>s.clear());idbOp('m','readwrite',s=>s.clear())}catch(e){}try{BIO.e={};BIO.eno={};saveBio()}catch(e){}WARM.clear();
  S={};ready=false;showSetup=true;files=[];folders=[];cur='';C.clear();
  for(const i of['#aid','#ahash','#phone','#combo'])$(i).value='';drawCs();
  pq=[];pi=-1;openId=null;try{au.pause();au.removeAttribute('src')}catch(e){}
  location.reload();
};
cPurge();setInterval(cPurge,3600e3);
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}  /* просим браузер не стирать кэш при нехватке места */
/* ---- кнопка «назад»: шаг назад по папкам, на главной спрашивает о выходе ---- */
let guarded=false;const HB=6;
/* в истории браузера держим запас записей: каждое нажатие «назад» съедает одну, а мы тут же докладываем новую.
   Даже если браузер пропустит часть записей, приложение остаётся на странице и просто идёт на шаг назад по пути. */
const hIdx=()=>{const st=history.state;return st&&st.g==='s'?st.i:-1};
function hFill(){try{let i=hIdx();while(i<HB){i++;history.pushState({g:'s',i},'')}}catch(e){guarded=false}}
function guard(){if(!guarded)guarded=true;if(hIdx()<HB)hFill()}
document.addEventListener('click',()=>{if(ready)guard()},true);
document.addEventListener('pointerdown',()=>{if(ready&&guarded&&hIdx()<HB)hFill()},true);
window.addEventListener('popstate',e=>{
  if(!guarded)return;
  const st=e.state;if(st&&st.g!=='s')return;
  const i=st?st.i:-1;
  if($('#pl').classList.contains('full'))collapsePl();
  else if(!$('#kpick').hidden)kpBack();
  else if(!$('#adm').hidden){if(GYM.on)gymBack();else $('#admx').onclick()}
  else if(!$('#rmn').hidden)$('#rmn').hidden=true;
  else if(!$('#drawer').hidden)closeDrawer();
  else if(!$('#sortm').hidden)$('#sortm').hidden=true;
  else if(!$('#fltm').hidden)$('#fltm').hidden=true;
  else if(!$('#pick').hidden)$('#pick').hidden=true;
  else if(!$('#vw').hidden&&!$('#vmenu').hidden)$('#vmenu').hidden=true;
  else if(!$('#vw').hidden)closeV();
  else if(selMode)exitSel();
  else if(showSetup&&ready){showSetup=false;show()}
  else if($('#q').value){$('#q').value='';render()}
  else if(cur){cur=parentPath(cur);render()}
  else if(confirm('Вы точно хотите выйти из приложения?')){guarded=false;history.go(-(i+1));return}
  hFill();
});
