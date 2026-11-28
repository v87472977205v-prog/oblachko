/* ===== ФАЙЛ функция-журнал-работы.js =====
   
   Функция: журнал действий (экран владельца).
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
function drawJournal(flt){
  if(!isAdmin())return;
  const all=[...JOUR,...JQ],L=all.sort((a,b)=>b.t-a.t).filter(e=>!flt||e.u===flt),us=[...new Set(all.map(e=>e.u))],oldN=all.filter(e=>e.pl).length;
  let h='',day='';
  if(!ownkey)h+='<div class="uc"><div class="us">Сейчас журнал лежит в канале открытым текстом. Включите хранение паролей во вкладке «Пользователи»: новые записи будут шифроваться, и прочитать их сможете только вы по мастер-паролю.</div></div>';
  else if(oldN)h+=`<div class="uc"><div class="us">Записей без шифрования: ${oldN}.</div><div class="row"><button class="p" id="jold">Зашифровать их</button></div></div>`;
  h+=`<div class="row"><select id="jsel"><option value="">Все пользователи</option>${us.map(u=>`<option${u===flt?' selected':''}>${esc(u)}</option>`).join('')}</select><button class="del" id="jclr">Очистить</button></div>`;
  for(const e of L.slice(0,400)){
    const d=new Date(e.t),ds=d.toLocaleDateString('ru',{day:'numeric',month:'long'});
    if(ds!==day){day=ds;h+=`<div class="jd">${ds}</div>`}
    h+=`<div class="jr"><span class="jt">${d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}</span><span><b>${esc(e.u)}</b> ${ACT[e.a]||esc(e.a)} ${esc(e.d||'')}</span></div>`;
  }
  if(!L.length)h+='<div class="empty">Пока пусто</div>';
  $('#admb').innerHTML=h;
}
const openJournal=async()=>{
  if(!isAdmin())return;
  openAdm('Журнал действий');
  if(ownkey&&!OWNPRIV&&JENC.length){
    $('#admb').innerHTML='<div class="uc"><div class="us">Журнал зашифрован: прочитать его можете только вы.</div><div class="row"><button class="p" id="jun">Ввести мастер-пароль</button></div></div>';
    if(await unlockOwner())drawJournal('');
    return;
  }
  drawJournal('');
};
