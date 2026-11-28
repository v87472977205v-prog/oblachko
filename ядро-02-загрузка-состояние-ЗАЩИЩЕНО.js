/* ===== ФАЙЛ ядро-02-загрузка-состояние-ЗАЩИЩЕНО.js =====
   
   ЗАЩИЩЕНО (зона 2, часть A): состояние загрузки U, stallLim, upPaint, beforeunload.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ⛔ ЗАЩИЩЁННЫЙ КОД: переписан из исходного файла БЕЗ ИЗМЕНЕНИЙ. Не править без явного «да» владельца.
   ===== */
/* ⛔ ЗАЩИЩЁННЫЙ БЛОК ЗАГРУЗКИ (см. большое примечание у «загрузка: очередь»): U, stallLim, upPaint не менять без разрешения владельца */
const U={on:false,total:0,done:0,fin:0,ok:0,n:0,name:'',t0:0,lastP:0,got:false,cancel:false,waitMsg:'',retry:'',nextNo:1,tick:0,jobs:new Set(),byPid:new Map()};
function stallLim(j,now){const sp=j.cur*j.size/Math.max((now-j.t0)/1000,1);return Math.max(40000,Math.min(240000,6*524288/Math.max(sp,2000)*1000))}
function upPaint(){
  $('#up').hidden=!U.on;if(!U.on)return;
  let part=0;for(const j of U.jobs)part+=j.cur*j.size;
  const sent=U.done+part,pct=U.total?Math.min(100,sent/U.total*100):0,ind=!U.got&&sent===0;
  $('#upb').classList.toggle('ind',ind);$('#upi').style.width=pct+'%';
  const act=[...U.jobs];
  $('#upn').textContent=act.length>1?`Загружается файлов: ${act.length}`:(act[0]?act[0].name:U.name);
  $('#upc').textContent=U.n>1?`${Math.min(U.fin+act.length,U.n)} из ${U.n}`:'';
  const now=Date.now(),sec=(now-U.t0)/1000,spd=sent/Math.max(sec,.5),stall=U.lastP?now-U.lastP:0;
  let t;
  if(U.waitMsg)t=U.waitMsg;
  else if(ind)t='Отправка…';
  else{
    t=Math.floor(pct)+'% · '+size(sent)+' из '+size(U.total)+(sec>2&&sent>0?' · '+size(spd)+'/с · ещё '+fmtT((U.total-sent)/spd):'');
    const sj=act.filter(j=>j.cur<.99&&now-j.lastP>stallLim(j,now)*.6);
    if(sj.length)t='Нет прогресса '+Math.floor(Math.max(...sj.map(j=>now-j.lastP))/1000)+' с — не выключайте экран · '+t;
    else if(act.length&&act.every(j=>j.cur>=.99))t='Telegram подтверждает приём · '+t;
  }
  if(U.retry)t=U.retry+' · '+t;
  $('#ups').textContent=t;
}
window.addEventListener('beforeunload',e=>{if(U.on){e.preventDefault();e.returnValue=''}});
