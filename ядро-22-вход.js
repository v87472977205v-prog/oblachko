/* ===== ФАЙЛ ядро-22-вход.js =====
   
   Экран входа: строка входа, ключ.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- вход / выход ---- */
const CSK=['id','hash','phone'];
function drawCs(){
  const v=$('#combo').value;
  if(/CLK2\./.test(v))parseComboA(v).then(paintCs);else paintCs(parseCombo(v));
}
function paintCs(r){
  [...$('#cs').children].forEach((el,i)=>{
    const on=!!r[CSK[i]];clearTimeout(el._t);
    if(on===el.classList.contains('ok'))return;
    el._t=setTimeout(()=>{el.classList.toggle('ok',on);el.textContent=on?'✓':'•'},on?i*180:0);
  });
}
$('#combo').addEventListener('input',drawCs);
$('#aski').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#askb').click()}});
$('#eye').onclick=()=>{const c=$('#combo'),on=!c.classList.contains('show');c.classList.toggle('show',on);$('#eye').setAttribute('aria-pressed',on);$('#eye').setAttribute('aria-label',on?'Скрыть ключ':'Показать ключ')};
$('#go').onclick=async()=>{
  const c=$('#combo').value.trim(),wasV=!!S.viewer,same=c===[S.apiId,S.apiHash,S.phone].join(' ');S.viewer=false;
  if(c){
    const r=await parseComboA(c);if(r.bad){say('Ключ повреждён или обрезан при передаче. Попросите прислать его заново (лучше QR)',1);return}
    const miss=[!r.id&&'api_id',!r.hash&&'api_hash',!r.phone&&'телефон'].filter(Boolean);
    if(miss.length){say('Не нашёл в строке: '+miss.join(', '),1);return}
    $('#aid').value=r.id;$('#ahash').value=r.hash;$('#phone').value=r.phone;S.viewer=!!r.viewer||(wasV&&same);if(r.viewer){S.guestUser='';S.guestHash=''}
  }
  S.apiId=$('#aid').value.trim();S.apiHash=$('#ahash').value.trim();S.phone=$('#phone').value.trim();
  if(!S.apiId||!S.apiHash||!S.phone){say('Заполните api_id, api_hash и телефон',1);return}
  sv('tgm',S);
  try{await connectRetry();if(S.viewer&&!await guestGate())throw new Error('Без имени пользователя войти нельзя');if(S.viewer)jlog('login','вход');await firstRepo();S.auto=true;sv('tgm',S);ready=true;showSetup=false;show();say('Готово')}
  catch(x){say('Не вышло: '+err(x),1)}
};
const makeKey=()=>{
  if(!isAdmin()||S.viewer)return;
  openAdm('Ключ для друга');
  $('#admb').innerHTML=`<div class="shs"><div class="uc"><div class="un">Данные второго аккаунта</div><div class="us">Вставьте api_id, api_hash и номер телефона ВТОРОГО аккаунта. Каждое с новой строки, порядок любой (подписи вроде «api_id:» не мешают).</div><textarea id="kdin" rows="4" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="api_id&#10;api_hash&#10;+79991234567" style="display:block;width:100%;box-sizing:border-box;margin-top:10px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font:14px/1.5 ui-monospace,Menlo,monospace;resize:vertical"></textarea><div class="row"><button class="p" id="kdgo">Сделать QR</button></div></div></div>`;
  $('#kdgo').onclick=()=>makeKeyGo($('#kdin').value);
};
const makeKeyGo=async txt=>{
  const r=parseCombo(String(txt||'')),miss=[!r.id&&'api_id',!r.hash&&'api_hash',!r.phone&&'номер'].filter(Boolean);
  if(miss.length){say('Не нашёл: '+miss.join(', ')+'. api_id: 3–9 цифр, api_hash: 32 символа (цифры и буквы a–f), номер: +79991234567',1);return}
  const id=r.id,hs=r.hash,ph=r.phone;
  if(!/^\+\d{10,15}$/.test(ph)){say('Неверный номер. Нужен формат +79991234567',1);return}
  jlog('key','');const kd={i:id,h:hs,p:ph};let key,weak=false;
  try{key=await ck2enc(kd)}catch(e){weak=true;key='CLK1.'+b64e(te.encode(JSON.stringify(kd)))}
  const link=location.href.split('#')[0]+'#key='+key;
  let mx;try{mx=QR(link)}catch(e){alert('Не удалось построить QR: '+err(e));return}
  const q=4,sc=8,n=mx.length,cv=document.createElement('canvas');cv.width=cv.height=(n+2*q)*sc;
  const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);cx.fillStyle='#000';
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(mx[r][c])cx.fillRect((c+q)*sc,(r+q)*sc,sc,sc);
  openAdm('QR-ключ для друга');
  $('#admb').innerHTML=`<div class="shs"><div class="uc"><div class="us">Друг наводит камеру телефона на QR и открывает ссылку: ключ сам подставится в строку входа, останется нажать «Войти».${weak?'<br><b>Внимание:</b> шифрование здесь недоступно (нужен https-адрес), поэтому в QR ключ без шифрования.':''}${/^https?:$/.test(location.protocol)?'':'<br><b>Внимание:</b> приложение открыто не по https-адресу, ссылка из QR у друга не откроется.'}</div></div><div style="text-align:center;margin:10px 0"><img id="kqr" alt="QR-ключ" style="width:min(100%,340px);border-radius:12px;background:#fff"></div><div class="row"><button class="p" id="kqs">Отправить картинкой</button></div><div class="uc"><div class="un">Запасной вариант: ключ текстом</div><div class="us">Если QR не открылся, отправьте этот зашифрованный ключ: друг вставит его в поле «Ключ доступа».</div><code id="kqt" style="display:block;word-break:break-all;margin-top:8px">${esc(key)}</code><div class="row"><button id="kqc">Скопировать ключ</button></div></div><div class="us">Второй аккаунт должен быть АДМИНИСТРАТОРОМ канала «${esc(TITLE)}» (публикация, изменение и удаление сообщений). Когда друг нажмёт «Войти», код придёт в Telegram второго аккаунта: передайте его не через Telegram (SMS, звонок). Картинку с QR и сообщение с ключом после входа друга удалите: по ним можно войти.</div></div>`;
  $('#kqr').src=cv.toDataURL('image/png');
  $('#kqc').onclick=async()=>{try{await navigator.clipboard.writeText(key);say('Ключ скопирован')}catch(e){prompt('Скопируйте ключ целиком',key)}};
  $('#kqs').onclick=()=>cv.toBlob(async bl=>{
    if(!bl)return;const f=new File([bl],'oblachko-key.png',{type:'image/png'});
    try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}catch(e){if(e&&e.name==='AbortError')return}
    const a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=f.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);say('Картинка сохранена');
  },'image/png');
};

