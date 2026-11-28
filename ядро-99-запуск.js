/* ===== ФАЙЛ ядро-99-запуск.js =====
   
   Запуск приложения (должен грузиться ПОСЛЕДНИМ).
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
$('#aid').value=S.apiId||'';$('#ahash').value=S.apiHash||'';$('#phone').value=S.phone||'';
if(S.apiId&&S.apiHash&&S.phone)$('#combo').value=S.apiId+' '+S.apiHash+' '+S.phone;
/* ключ из QR: ссылка вида адрес#key=CLK2.… подставляет ключ в строку входа */
try{const km=/[#&]key=(CLK[12]\.[A-Za-z0-9_-]+)/.exec(location.hash);if(km){history.replaceState(history.state,'',location.pathname+location.search);if(S.auto&&S.chat)say('Вы уже вошли. Чтобы войти по новому ключу, сначала выйдите из аккаунта',1);else{$('#combo').value=km[1]}}}catch(e){}
drawCs();
if(S.apiId&&S.apiHash&&(S.auto||S.chat)){
  booting=true;
  (async()=>{
    let early=false;
    if(!S.viewer&&S.auto&&await loadCachedIdx()){early=true;booting=false;ready=true;showSetup=false;show();say('Обновляю архив…')}
    try{
      await connectRetry();
      if(S.viewer&&!await guestGate())throw new Error('Без имени пользователя войти нельзя');
      if(S.viewer)jlog('login','вход');
      await firstRepo();
      booting=false;ready=true;showSetup=false;show();
    }catch(x){
      booting=false;
      if(early||(S.auto&&await loadOffline())){OFFLINE=true;document.body.classList.add('off');ready=true;showSetup=false;show();say('Нет связи. Показаны сохранённые данные; открываются недавно просмотренные файлы');return}
      say('Не вышло: '+err(x),1);show();
    }
  })();
}
show();
try{if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').then(r=>{document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')r.update().catch(()=>{})})}).catch(()=>{})}catch(e){}
try{appEmit('start')}catch(e){}
