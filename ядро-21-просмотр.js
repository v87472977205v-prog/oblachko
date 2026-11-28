/* ===== ФАЙЛ ядро-21-просмотр.js =====
   
   Просмотр файлов (картинки, видео, документы), жесты, меню «три точки».
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
function openPick(cp){
  const out=[];
  for(const r of[...(repoBlocked('')?[]:['']),...repos.filter(visRepo).map(x=>x.name)]){
    if(isLocked(r,''))continue;
    for(const p of['',...allPaths(r)]){
      if((pickMode==='folder'||pickMode==='fcopy')&&r===R()&&inTree(p,cur))continue;
      if(p&&isLocked(r,p))continue;
      out.push([r,p]);
    }
  }
  const mul=repos.length>0;
  $('#pickl').innerHTML=out.map(([r,p])=>`<button class="pk${r===R()&&p===cp?' on':''}" data-pr="${esc(r)}" data-p="${esc(p)}">📁 ${mul?esc(r||'Облако')+' › ':''}${esc(p||'Корень')}</button>`).join('');
  $('#pick').hidden=false;
}

const fx=f=>(f.name.split('.').pop()||'').toLowerCase();
const TXT=new Set(['txt','md','csv','tsv','json','log','xml','html','htm','css','js','ts','py','java','c','cpp','h','sh','bat','ini','cfg','conf','yml','yaml','toml','sql','srt','vtt','tex']);
const isTxt=f=>f.mime.startsWith('text/')||TXT.has(fx(f));
const isDocx=f=>fx(f)==='docx';
const PV=new Set(['docx','xlsx','xls','xlsm','ods','pptx','zip']);
const isPrev=f=>isTxt(f)||PV.has(fx(f));
let WB=null;
function xlHTML(i){
  const tabs=WB.SheetNames.map((n,k)=>`<button data-sh="${k}" class="${k===i?'on':''}">${esc(n)}</button>`).join('');
  const rows=XLSX.utils.sheet_to_json(WB.Sheets[WB.SheetNames[i]],{header:1,raw:false,defval:''});
  const R=rows.slice(0,500);
  return `<div class="doc xl"><div class="tabs">${tabs}</div><div class="tw"><table>${R.map(r=>'<tr>'+r.slice(0,40).map(c=>`<td>${esc(c)}</td>`).join('')+'</tr>').join('')}</table></div>${rows.length>500?'<p><i>Показаны первые 500 строк.</i></p>':''}</div>`;
}
stg.addEventListener('click',e=>{const b=e.target.closest('[data-sh]');if(b&&WB){stg.innerHTML=xlHTML(+b.dataset.sh)}});
function loadScript(us){return new Promise((ok,no)=>{let i=0;const t=()=>{if(i>=us.length)return no(new Error('Не загрузился модуль просмотра. Проверьте интернет.'));const sc=document.createElement('script');sc.src=us[i++];sc.onload=ok;sc.onerror=()=>{sc.remove();t()};document.head.appendChild(sc)};t()})}
async function docView(f,u){
  const buf=await (await fetch(u)).arrayBuffer();
  if(isDocx(f)){
    if(!window.mammoth)await loadScript(['https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js','https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js']);
    const r=await window.mammoth.convertToHtml({arrayBuffer:buf});
    return '<div class="doc">'+(r.value||'<p>Документ пустой.</p>')+'</div>';
  }
  const e=fx(f);
  if(['xlsx','xls','xlsm','ods'].includes(e)){
    if(!window.XLSX)await loadScript(['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js']);
    WB=XLSX.read(buf,{type:'array'});return xlHTML(0);
  }
  if(e==='pptx'||e==='zip'){
    if(!window.JSZip)await loadScript(['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js']);
    const z=await JSZip.loadAsync(buf);
    if(e==='zip')return '<pre class="tx">'+esc(Object.values(z.files).map(x=>(x.dir?'📁 ':'📄 ')+x.name).join('\n'))+'</pre>';
    const num=n=>+n.match(/(\d+)\.xml$/)[1];
    const names=Object.keys(z.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>num(a)-num(b));
    let out='';
    for(let i=0;i<names.length;i++){
      const d=new DOMParser().parseFromString(await z.file(names[i]).async('string'),'application/xml');
      const ps=[...d.getElementsByTagName('a:p')].map(p=>[...p.getElementsByTagName('a:t')].map(t=>t.textContent).join('')).filter(Boolean);
      out+=`<div class="sl"><div class="m">Слайд ${i+1} из ${names.length}</div>`+(ps.length?ps.map((t,k)=>k?`<p>${esc(t)}</p>`:`<h3>${esc(t)}</h3>`).join(''):'<p><i>Без текста</i></p>')+'</div>';
    }
    return '<div class="doc">'+(out||'<p>Слайдов не найдено.</p>')+'</div>';
  }
  const part=buf.byteLength>3e5?buf.slice(0,3e5):buf;let t;
  try{t=new TextDecoder('utf-8',{fatal:true}).decode(part)}catch(e){t=new TextDecoder('windows-1251').decode(part)}
  return '<pre class="tx">'+esc(t)+(buf.byteLength>3e5?'\n\n… показано начало файла (первые 300 КБ). Полностью — через «Скачать».':'')+'</pre>';
}
async function showAt(i,dir){
  if(i<0||i>=curList.length)return;
  const f=files.find(x=>x.id===curList[i]);if(!f)return;
  jonce('view',f);saveVid();vi=i;openId=f.id;z={s:1,x:0,y:0};
  $('#vw').hidden=false;$('#vmenu').hidden=true;$('#vw').classList.remove('hide');
  $('#vname').textContent=f.name;
  $('#vsub').textContent=`${i+1} из ${curList.length}`;
  const isImg=f.mime.startsWith('image/');
  stg.style.touchAction=isImg?'none':'auto';
  stg.innerHTML='<div class="vl">Загрузка…</div>';
  if(f.size>1e9){stg.innerHTML='<div class="vl">Файл больше 1 ГБ: здесь его не открыть.<br>Откройте его в Telegram по номеру.</div>';return}
  const bigV=f.size>8e7&&!C.has(f.id);
  let dp=null;
  if(bigV){
    BIGLOAD=f.id;stg.innerHTML='<div class="vl">Загружаю файл…<div class="dlt" style="margin:12px 0;font-size:16px">0 МБ</div><div class="dls" style="font-size:13px;opacity:.7">Можно закрыть: загрузка продолжится в фоне.<br>Когда будет готово, я скажу.</div></div>';paintBigLoad(f);
    dp=urlOfD(f);dp.catch(()=>{});bgToast(f,dp);
    if(isUnk(f.mime)&&!f.enc){
      const d00=stg.querySelector('.dls');if(d00)d00.textContent='Определяю тип файла…';
      const sm=await sniffBig(f,dp);if(openId!==f.id)return;if(sm)f.mime=sm;
    }
    if(f.mime.startsWith('video/')&&!f.enc){
      const d0=stg.querySelector('.dls');if(d0)d0.textContent='Готовлю начало видео…';
      if(await tryStream(f,dp))return;
      if(openId!==f.id)return;
      const d1=stg.querySelector('.dls');if(d1)d1.textContent='Это видео нельзя запустить раньше времени (индекс файла в конце). Жду полной загрузки; можно закрыть, она пойдёт в фоне.';
    }
  }
  try{
    const u=await(dp||urlOfD(f));
    if(openId!==f.id)return;
    if(isUnk(f.mime)&&!f.enc){const sm=await sniffUrl(u);if(openId!==f.id)return;if(sm){f.mime=sm;await retype(f,u,sm);return showAt(i,dir)}}
    const m=f.mime;
    $('#vw').classList.toggle('nz',!isImg);
    if(!isImg&&!m.startsWith('video/')&&m!=='application/pdf'&&isPrev(f)){
      stg.innerHTML='<div class="vl">Открываю…</div>';
      const h=await docView(f,u);if(openId!==f.id)return;stg.innerHTML=h;
      for(const k of[i-1,i+1]){const n=files.find(x=>x.id===curList[k]);if(n&&n.mime.startsWith('image/')&&n.size<8e6)urlOf(n).catch(()=>{})}
      return;
    }
    stg.innerHTML=isImg?`<img alt="" draggable="false" src="${u}">`:m.startsWith('video/')?`<video controls playsinline src="${u}"></video>`:m==='application/pdf'?`<iframe src="${u}"></iframe>`:m.startsWith('audio/')?`<div class="vl"><div style="font-size:42px">🎵</div>${esc(f.name)}<br><audio controls src="${u}" style="margin-top:16px;width:min(90vw,420px)"></audio></div>`:`<div class="vl">${esc(ext(f.name))}<br>Предпросмотр недоступен.<br>Нажмите «Скачать».</div>`;
    {const v=stg.querySelector('video');if(v)bindVideoPos(v,f)}
    if(dir&&stg.firstElementChild)stg.firstElementChild.classList.add(dir>0?'inr':'inl');
    for(const k of[i-1,i+1]){const n=files.find(x=>x.id===curList[k]);if(n&&n.mime.startsWith('image/')&&n.size<8e6)urlOf(n).catch(()=>{})}
  }catch(x){if(openId===f.id)stg.innerHTML=`<div class="vl">${esc(err(x))}</div>`}
}
/* ---- тип файла по содержимому ---- */
const isUnk=m=>!m||m==='application/octet-stream';
function sniffBytes(u){
  const s=(a,b)=>String.fromCharCode(...u.subarray(a,b));
  if(u.length>=12&&s(4,8)==='ftyp'){const b=s(8,12);return b==='M4A '?'audio/mp4':b==='qt  '?'video/quicktime':'video/mp4'}
  if(u.length>=4&&u[0]===0x1A&&u[1]===0x45&&u[2]===0xDF&&u[3]===0xA3)return 'video/webm';
  if(u.length>=3&&u[0]===0xFF&&u[1]===0xD8&&u[2]===0xFF)return 'image/jpeg';
  if(u.length>=4&&u[0]===0x89&&s(1,4)==='PNG')return 'image/png';
  if(u.length>=4&&s(0,4)==='GIF8')return 'image/gif';
  if(u.length>=12&&s(0,4)==='RIFF'&&s(8,12)==='WEBP')return 'image/webp';
  if(u.length>=4&&s(0,4)==='%PDF')return 'application/pdf';
  if(u.length>=4&&s(0,4)==='OggS')return 'audio/ogg';
  if(u.length>=3&&s(0,3)==='ID3')return 'audio/mpeg';
  return '';
}
async function sniffBig(f,dp){
  let fin=false;dp.then(()=>{fin=true},()=>{fin=true});
  while(openId===f.id&&!fin&&(DLP.get(f.id)||0)<65536)await sleep(120);
  if(!SNAP.has(f.id))return '';
  return sniffBytes(new Uint8Array(await SNAP.get(f.id)().slice(0,64).arrayBuffer()));
}
async function sniffUrl(u){
  try{const r=await fetch(u),rd=r.body.getReader(),c=await rd.read();try{rd.cancel()}catch(e){}return c.value?sniffBytes(c.value.subarray(0,64)):''}catch(e){return ''}
}
async function retype(f,u,mime){
  try{const b=await(await fetch(u)).blob(),nu=URL.createObjectURL(new Blob([b],{type:mime}));try{URL.revokeObjectURL(u)}catch(e){}C.set(f.id,nu)}catch(e){}
}
/* ---- ранний старт видео: первые МБ, дальше подгрузка в фоне ---- */
const STG1=[2e6,6e6,16e6],_toasted=new WeakSet();
function bgToast(f,dp){dp.then(()=>{if(openId!==f.id&&!_toasted.has(dp)){_toasted.add(dp);say('Готово: '+f.name.slice(0,40)+'. Откройте файл ещё раз')}},()=>{})}
async function tryStream(f,dp){
  let fin=false;dp.then(()=>{fin=true},()=>{fin=true});
  for(const need of STG1){
    while(openId===f.id&&!fin&&(DLP.get(f.id)||0)<need)await sleep(150);
    if(openId!==f.id||fin||!SNAP.has(f.id))return false;
    const snap=SNAP.get(f.id)(),url=URL.createObjectURL(snap),v=document.createElement('video');
    v.controls=true;v.setAttribute('playsinline','');
    const ok=await new Promise(res=>{let tm;const done=r=>{clearTimeout(tm);v.onloadedmetadata=v.onerror=null;res(r)};tm=setTimeout(()=>done(false),6000);v.onloadedmetadata=()=>done(true);v.onerror=()=>done(false);v.src=url});
    if(openId!==f.id||!ok){try{URL.revokeObjectURL(url)}catch(e){}if(openId!==f.id)return false;continue}
    $('#vw').classList.add('nz');stg.innerHTML='';stg.appendChild(v);bindVideoPos(v,f);
    v.play().catch(()=>{});runStream(f,v,url,snap.size);return true;
  }
  return false;
}
function runStream(f,v,url0,size0){
  let url=url0,size=size0,swapping=false,finalDone=false;
  const chip=document.createElement('div');chip.className='dlchip';stg.appendChild(chip);
  const swap=(nu,ns)=>{
    const t=v.currentTime,was=!v.paused,old=url;swapping=true;url=nu;size=ns;
    v.addEventListener('loadedmetadata',()=>{try{v.currentTime=t}catch(e){}if(was)v.play().catch(()=>{});swapping=false;setTimeout(()=>{if(old!==C.get(f.id))try{URL.revokeObjectURL(old)}catch(e){}},1500)},{once:true});
    v.src=nu;
  };
  const tick=setInterval(()=>{
    if(openId!==f.id||!v.isConnected){clearInterval(tick);if(url!==C.get(f.id))try{URL.revokeObjectURL(url)}catch(e){};return}
    if(swapping)return;
    const dur=isFinite(v.duration)?v.duration:0,b=v.buffered,bend=b.length?b.end(b.length-1):0;
    const est=dur&&f.size?dur*size/f.size:bend,runway=Math.min(est,bend||est)-v.currentTime;
    if(C.has(f.id)){
      if(!finalDone&&(v.paused||v.ended||v.error||runway<15)){finalDone=true;chip.remove();swap(C.get(f.id),f.size)}
      return;
    }
    const have=DLP.get(f.id)||0;
    chip.textContent='Подгружается: '+Math.round(have/1e6)+' из '+Math.round(f.size/1e6)+' МБ';
    if((runway<8||v.ended||v.error)&&have>size*1.3&&SNAP.has(f.id)){const sn=SNAP.get(f.id)();swap(URL.createObjectURL(sn),sn.size)}
  },500);
}
function bindVideoPos(v,f){
  const rp=PS[f.id];let ls=0;
  v.addEventListener('loadedmetadata',()=>{if(rp>3&&rp<v.duration-5){v.currentTime=rp;say('Продолжаю с '+fmt(rp))}},{once:true});
  const save=()=>{if(v.duration>0&&!v.ended){PS[f.id]=v.currentTime;const k=Object.keys(PS);if(k.length>500)delete PS[k[0]];sv('tgpos',PS)}};
  v.addEventListener('timeupdate',()=>{if(Date.now()-ls>3000){ls=Date.now();save()}});
  v.addEventListener('pause',save);
  v.addEventListener('ended',()=>{delete PS[f.id];sv('tgpos',PS)});
}
function saveVid(){const v=stg.querySelector('video');if(v&&openId&&v.duration>0&&!v.ended){PS[openId]=v.currentTime;sv('tgpos',PS)}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveVid()});window.addEventListener('pagehide',saveVid);
function closeV(){saveVid();$('#vw').hidden=true;$('#vmenu').hidden=true;$('#pick').hidden=true;openId=null;stg.innerHTML='';render()}
function dropCur(){curList.splice(vi,1);if(!curList.length)closeV();else showAt(Math.min(vi,curList.length-1))}
$('#vx').onclick=closeV;
$('#vprev').onclick=()=>showAt(vi-1,-1);
$('#vnext').onclick=()=>showAt(vi+1,1);
document.addEventListener('keydown',e=>{
  if($('#vw').hidden)return;
  if(e.key==='ArrowLeft')showAt(vi-1,-1);else if(e.key==='ArrowRight')showAt(vi+1,1);else if(e.key==='Escape')closeV();
});
/* жесты: листание, щипок для увеличения, двойной тап, тап прячет панели */
const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
let t0=null,pin=null,lastTap=0,tapTm;
stg.addEventListener('touchstart',e=>{
  if(!media()){
    t0=null;
    if(e.touches.length!==1)return;
    const t=e.touches[0],r=stg.getBoundingClientRect(),el=stg.firstElementChild;
    if(el&&el.matches('video')&&t.clientY>r.bottom-130)return;
    t0={x:t.clientX,y:t.clientY,plain:true};return;
  }
  if(e.touches.length===2){pin={d:dist(e.touches),s:z.s};t0=null;return}
  if(e.touches.length===1){const t=e.touches[0];t0={x:t.clientX,y:t.clientY,zx:z.x,zy:z.y,t:Date.now(),mv:false}}
},{passive:true});
stg.addEventListener('touchmove',e=>{
  const m=media();if(!m)return;
  if(pin&&e.touches.length===2){z.s=Math.min(5,Math.max(1,pin.s*dist(e.touches)/pin.d));applyZ();return}
  if(!t0||e.touches.length!==1)return;
  const t=e.touches[0],dx=t.clientX-t0.x,dy=t.clientY-t0.y;
  if(Math.abs(dx)+Math.abs(dy)>10)t0.mv=true;
  if(z.s>1){z.x=t0.zx+dx;z.y=t0.zy+dy;applyZ()}
  else{m.style.transition='none';m.style.transform=Math.abs(dy)>Math.abs(dx)*1.2&&dy>0?`translateY(${dy}px)`:`translateX(${dx}px)`}
},{passive:true});
stg.addEventListener('touchend',e=>{
  const m=media();
  if(!m){
    if(!t0||!t0.plain){t0=null;return}
    const t=e.changedTouches[0],dx=t.clientX-t0.x,dy=t.clientY-t0.y;t0=null;
    const el0=stg.firstElementChild;
    if(dy>130&&dy>Math.abs(dx)*1.8&&el0&&el0.matches('video,.vl')){closeV();return}
    const d=dx<0?1:-1;
    if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5&&curList[vi+d]!==undefined)showAt(vi+d,d);
    return;
  }
  if(pin){if(e.touches.length<2){pin=null;if(z.s<1.05)z={s:1,x:0,y:0};applyZ(true)}return}
  if(!t0)return;
  const t=e.changedTouches[0],dx=t.clientX-t0.x,dy=t.clientY-t0.y,o=t0;t0=null;
  if(!o.mv&&Date.now()-o.t<300){
    const now=Date.now();
    if(now-lastTap<300){clearTimeout(tapTm);lastTap=0;z=z.s>1?{s:1,x:0,y:0}:{s:2.5,x:0,y:0};applyZ(true)}
    else{lastTap=now;tapTm=setTimeout(()=>$('#vw').classList.toggle('hide'),300)}
    return;
  }
  if(z.s===1&&dy>110&&dy>Math.abs(dx)*1.6){closeV();return}
  const d=dx<0?1:-1;
  if(z.s===1&&Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.2&&curList[vi+d]!==undefined){showAt(vi+d,d);return}
  applyZ(true);
},{passive:true});
stg.addEventListener('click',()=>{$('#vmenu').hidden=true});

/* меню «три точки» */
$('#vmore').onclick=e=>{e.stopPropagation();$('#vmenu').hidden=!$('#vmenu').hidden};
$('#vmenu').onclick=async e=>{
  const a=e.target.dataset.a;if(!a)return;
  $('#vmenu').hidden=true;const f=curFile();if(!f)return;
  if(a==='info')alert(`${f.name}\nПапка: ${f.path||'Корень'}\nРазмер: ${size(f.size)}\nДата: ${new Date(f.date).toLocaleString('ru')}`);
  if(a==='mv'){pickMode='one';openPick(f.path)}
  if(a==='rn'){
    if(roDeny(curFile()&&curFile().repo))return;
    const n=(await uiPrompt('Новое название файла',f.name)||'').replace(/[\r\n]+/g,' ').trim();
    if(!n||n===f.name)return;
    const old=f.name,oldE=f.encName;f.name=n;
    try{
      if(f.enc){if(!KEYS[f.repo]&&!await ensureKey(f.repo))throw new Error('Нужен пароль шифрования');f.encName=await encName(f.repo,{name:n,type:f.mime})}
      await withChat(()=>client.editMessageCaption(S.chat,f.id,{caption:caption(f.no,f.path,capName(f),f.repo)}));
      $('#vname').textContent=f.name;jlog('ren',f.enc?'зашифрованный файл':old+' → '+f.name);
    }catch(x){f.name=old;f.encName=oldE;alert(err(x))}
  }
};
$('#pick').onclick=async e=>{
  const b=e.target.closest('[data-p]');
  if(!b){if(e.target.id==='pick')$('#pick').hidden=true;return}
  const np=b.dataset.p,nr=b.dataset.pr||'';$('#pick').hidden=true;
  if(pickMode==='batch'){await batchMove(np,nr);return}
  if(pickMode==='folder'){await moveFolder(np,nr);return}
  if(pickMode==='fcopy'){await copyFolder(np,nr);return}
  const f=curFile(),op=f.path,or=f.repo;
  if(np===op&&nr===or)return;
  if(roDeny(or)||roDeny(nr))return;
  {const bl=encMoveBlock([f],nr,or);if(bl){alert(bl);return}if(encWarn([f],nr,or))return}
  f.path=np;f.repo=nr;
  try{await withChat(()=>client.editMessageCaption(S.chat,f.id,{caption:caption(f.no,f.path,capName(f),f.repo)}))}
  catch(x){f.path=op;f.repo=or;alert(err(x));return}
  jlog('mv',jn(f)+' → '+(nr||'Облако')+(np?' / '+np:''));
  if(!$('#q').value||nr!==R())dropCur();
};
$('#vdl').onclick=async()=>{
  const f=curFile();if(!f)return;
  try{if(await dlStream(f)){jlog('dl',jn(f));return}const a=document.createElement('a');a.href=await urlOf(f);a.download=f.name;a.click();jlog('dl',jn(f))}catch(x){alert(err(x))}
};
$('#vrm').onclick=async()=>{
  const f=curFile();if(!f)return;if(roDeny(f.repo))return;
  if(!confirm(`Удалить «${f.name}» навсегда?`))return;
  try{await withChat(()=>client.deleteMessages(S.chat,[f.id]));files=files.filter(x=>x.id!==f.id);C.delete(f.id);jlog('del',jn(f));dropCur()}
  catch(x){alert(err(x))}
};


