/* ===== ФАЙЛ ядро-12-подключение.js =====
   
   Библиотека и вход в Telegram, поиск/создание канала.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- библиотека и вход ---- */
async function loadLib(){
  const U=['https://cdn.jsdelivr.net/npm/@mtkruto/browser/esm/mod.js','https://cdn.jsdelivr.net/npm/@mtkruto/browser@0.125.0/esm/mod.js','https://unpkg.com/@mtkruto/browser/esm/mod.js','https://esm.sh/@mtkruto/browser'];
  const errs=[];
  for(const u of U){try{return await import(u)}catch(e){errs.push(u.replace('https://','').split('/')[0]+': '+err(e))}}
  throw new Error('Не загрузилась библиотека Telegram. Проверьте интернет/VPN и откройте файл в Chrome. Детали: '+errs.join(' | '));
}
function ask(label,type){return new Promise(res=>{
  booting=false;show();$('#askl').textContent=label;const i=$('#aski');i.type=type;i.value='';$('#ask').hidden=false;i.focus();
  $('#askb').onclick=()=>{$('#ask').hidden=true;res(i.value.trim())};
})}
async function connect(){
  say('Подключаюсь…');
  lib=lib||await loadLib();
  const opts={apiId:+S.apiId,apiHash:S.apiHash};
  try{if(lib.StorageLocalStorage)opts.storage=new lib.StorageLocalStorage(PFX)}catch(e){}
  client=new lib.Client(opts);
  /* ⛔ ЗАЩИЩЁННЫЙ БЛОК ЗАГРУЗКИ: обработчик прогресса не менять без разрешения владельца */
  try{client.on('uploadProgress',ctx=>{
    const p=(ctx&&ctx.update&&ctx.update.uploadProgress)||(ctx&&ctx.uploadProgress);
    if(!p||!U.on)return;
    let j=p.id!==undefined?U.byPid.get(String(p.id)):null;
    if(!j){const c=[...U.jobs].filter(x=>!x.pid);if(c.length===1)j=c[0];else if(U.jobs.size===1)j=[...U.jobs][0]}
    if(!j)return;
    const up=+p.uploaded||0,tot=+p.total||+p.partCount||j.size||0;
    let fr=tot?up/tot:0;if(fr>1)fr=j.size?up/j.size:1;
    j.got=true;j.cur=Math.max(j.cur,Math.min(1,fr));j.lastP=Date.now();U.lastP=j.lastP;U.got=true;upPaint();
    {const q=Math.floor(j.cur*4+1e-6);if(q>(j.q||0)){j.q=q;ulog(q>=4?`${j.name}: передано 100%, жду подтверждения от Telegram`:`${j.name}: ${q*25}%`)}}
  })}catch(e){}
  await client.start({
    phone:()=>S.phone,
    code:()=>ask(S.viewer?'Возьмите код у владельца облака':'Код, который пришёл вам в Telegram','text'),
    password:()=>ask(S.viewer?'Возьмите пароль двухэтапной проверки у владельца облака':'Пароль двухэтапной проверки','password')
  });
  await findChannel();
  if(!S.main){S.main=S.chat;sv('tgm',S)}
  try{await refresh({light:true,fast:true})}catch(e){
    if(!ACC.test(err(e))||S.viewer)throw e;
    if(!confirm('Канал архива недоступен ('+err(e)+'). Создать новый канал «'+TITLE+'»? Старые файлы останутся в старом канале.'))throw e;
    await makeChannel();await refresh();
  }
  BGS.ok=1;BGS.t=Date.now()-17e4;   /* первая фоновая сверка архива через ~30 с после запуска */
}
const NET=/disconnect|network|connection|timeout|timed out|websocket|fetch|closed|offline/i;
async function connectRetry(){
  let last;
  for(let i=0;i<4;i++){
    try{return await connect()}
    catch(x){
      last=x;if(!NET.test(err(x)))throw x;
      try{client&&await client.disconnect()}catch(e){}
      if(i<3){say('Нет связи с Telegram, пробую снова ('+(i+2)+' из 4)…');await new Promise(r=>setTimeout(r,1500*(i+1)))}
    }
  }
  throw new Error('Нет связи с Telegram. Проверьте интернет или включите VPN и нажмите «Войти» ещё раз. ('+err(last)+')');
}
async function findChannel(){
  if(S.chat)return;
  say('Ищу канал архива…');
  try{
    const list=await client.getChats();
    for(const it of list){const c=it.chat||it;if(c&&c.title===TITLE){S.chat=c.id;sv('tgm',S);return}}
  }catch(e){
    if(S.viewer)throw e;
    if(!confirm('Не удалось проверить, есть ли уже канал «'+TITLE+'» ('+err(e)+'). Создать новый?'))throw e;
  }
  if(S.viewer)throw new Error('Канал «'+TITLE+'» не найден. Владелец должен добавить этот аккаунт в канал администратором (с правом публикации, изменения и удаления сообщений). Потом нажмите «Войти» ещё раз.');
  await makeChannel();
}
async function makeChannel(){
  say('Создаю приватный канал «'+TITLE+'»…');
  const c=await client.createChannel(TITLE);
  S.chat=c.id!==undefined?c.id:c.chat.id;sv('tgm',S);
  try{await client.getChats()}catch(e){}
}
const ACC=/cannot be accessed|CHANNEL_INVALID|PEER_ID_INVALID|CHANNEL_PRIVATE/i;
async function reload(){
  try{
    const list=await client.getChats();
    for(const it of list){const c=it.chat||it;if(c&&c.title===TITLE){S.chat=c.id;sv('tgm',S);return}}
  }catch(e){}
  try{await client.getChat(S.chat)}catch(e){}
}
async function withChat(fn){
  if(OFFLINE)throw new Error('Нет связи с Telegram: это действие недоступно офлайн');
  if(!client)throw new Error('Ещё подключаюсь к Telegram, подождите секунду');
  try{return await fn()}
  catch(e){if(!ACC.test(err(e)))throw e;await reload();return await fn()}
}


