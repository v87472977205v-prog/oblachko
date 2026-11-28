/* ===== ФАЙЛ расширение-стего-утилита.js =====
   
   Расширение «Стего-утилита».
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- Расширение «Стего-утилита» ----
   Прячет файл или текст в картинку (PNG, младшие биты пикселей), WAV-аудио или в конец любого файла; необязательный пароль
   (AES-GCM, PBKDF2) и сжатие (gzip). Всё считается на устройстве, ничего не отправляется. Формат упаковки совпадает с
   отдельной страницей stego.html (магия STG1, хвост STGEND01): файлы, спрятанные там, достаются здесь и наоборот.
   Доступно администратору, остальным выдаётся в консоли (Расширения). Ядро ниже перенесено без изменений. */
const STG=(()=>{
const enc=new TextEncoder(),dec=new TextDecoder();
const MAGIC=[0x53,0x54,0x47,0x31],TRAIL=enc.encode('STGEND01');
const fmt=b=>b>1e6?(b/1e6).toFixed(2)+' МБ':b<1e3?b+' Б':(b/1e3).toFixed(1)+' КБ';
const concat=(...a)=>{const o=new Uint8Array(a.reduce((n,x)=>n+x.length,0));let p=0;for(const x of a){o.set(x,p);p+=x.length}return o};
const u32=n=>{const a=new Uint8Array(4);new DataView(a.buffer).setUint32(0,n);return a};
const u16=n=>{const a=new Uint8Array(2);new DataView(a.buffer).setUint16(0,n);return a};
const pipe=async(d,t)=>new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(t)).arrayBuffer());
const NF=()=>new Error('NOTFOUND');

/* Предпросмотр: по сигнатуре байтов определяем тип и показываем превью, не полагаясь на имя/MIME */
function sniff(bytes){
  const h=bytes.subarray(0,16);
  const eq=(a,o=0)=>a.every((v,i)=>h[i+o]===v);
  if(eq([0x89,0x50,0x4E,0x47]))return'image/png';
  if(eq([0xFF,0xD8,0xFF]))return'image/jpeg';
  if(eq([0x47,0x49,0x46]))return'image/gif';
  if(eq([0x52,0x49,0x46,0x46])&&bytes.length>11&&eq([0x57,0x41,0x56,0x45],8))return'audio/wav';
  if(eq([0x52,0x49,0x46,0x46])&&bytes.length>11&&eq([0x41,0x56,0x49,0x20],8))return'video/avi';
  if(eq([0x49,0x44,0x33])||eq([0xFF,0xFB])||eq([0xFF,0xF3])||eq([0xFF,0xF2]))return'audio/mpeg';
  if(eq([0x4F,0x67,0x67,0x53]))return'audio/ogg';
  if(eq([0x50,0x4B,0x03,0x04]))return'application/zip';
  if(eq([0x25,0x50,0x44,0x46]))return'application/pdf';
  if(bytes.length>=12&&eq([0x66,0x74,0x79,0x70],4))return'video/mp4';
  // похоже на текст?
  const n=Math.min(bytes.length,512);let printable=0;
  for(let i=0;i<n;i++){const c=bytes[i];if(c===9||c===10||c===13||(c>=32&&c<127)||c>=128)printable++}
  if(n&&printable/n>0.95)return'text/plain';
  return'application/octet-stream';
}
const LABEL={'image/png':'PNG-изображение','image/jpeg':'JPEG-изображение','image/gif':'GIF-изображение',
  'audio/wav':'WAV-аудио','audio/mpeg':'MP3-аудио','audio/ogg':'OGG-аудио','video/avi':'AVI-видео','video/mp4':'MP4-видео/аудио',
  'application/zip':'ZIP-архив','application/pdf':'PDF-документ','text/plain':'текст','application/octet-stream':'файл неизвестного формата'};

async function key(pw,salt){
  if(!crypto.subtle)throw new Error('Шифрование недоступно в этом браузере');
  const b=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:200000,hash:'SHA-256'},b,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function buildPacket(name,data,pw,zip){
  const nb=enc.encode(name).slice(0,65535);
  let body=concat(u16(nb.length),nb,data),flags=0,head=new Uint8Array(0);
  if(zip&&window.CompressionStream){body=await pipe(body,new CompressionStream('gzip'));flags|=2}
  if(pw){
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    body=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(pw,salt),body));
    flags|=1;head=concat(salt,iv);
  }
  return concat(new Uint8Array(MAGIC),Uint8Array.of(flags),head,u32(body.length),body);
}
async function parsePacket(rd,max,pw){
  const m=rd(4);if(!MAGIC.every((v,i)=>m[i]===v))throw NF();
  const flags=rd(1)[0];let salt,iv;
  if(flags&1){const h=rd(28);salt=h.slice(0,16);iv=h.slice(16)}
  const len=new DataView(rd(4).buffer).getUint32(0);
  if(len>max)throw NF();
  let body=rd(len);
  if(flags&1){
    if(!pw)throw new Error('Данные зашифрованы, введите пароль');
    try{body=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv},await key(pw,salt),body))}
    catch{throw new Error('Неверный пароль или данные повреждены')}
  }
  if(flags&2)body=await pipe(body,new DecompressionStream('gzip'));
  const nl=new DataView(body.buffer,body.byteOffset).getUint16(0);
  return{name:dec.decode(body.slice(2,2+nl)),data:body.slice(2+nl)};
}

/* Носители: n ячеек, get/set работают с байтом, в младших битах которого лежат данные */
async function imgCarrier(file){
  const url=URL.createObjectURL(file),img=new Image();img.src=url;
  try{await img.decode()}catch{URL.revokeObjectURL(url);throw new Error('Не удалось открыть как изображение')}
  const cv=document.createElement('canvas');cv.width=img.naturalWidth;cv.height=img.naturalHeight;
  const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);URL.revokeObjectURL(url);
  const id=ctx.getImageData(0,0,cv.width,cv.height),d=id.data;
  let c=0;for(let i=3;i<d.length;i+=4)if(d[i]===255)c++; // только непрозрачные пиксели
  const ix=new Uint32Array(c*3);let k=0;
  for(let i=0;i<d.length;i+=4)if(d[i+3]===255){ix[k++]=i;ix[k++]=i+1;ix[k++]=i+2}
  return{n:ix.length,get:i=>d[ix[i]],set:(i,v)=>{d[ix[i]]=v},
    save:()=>new Promise(r=>{ctx.putImageData(id,0,0);cv.toBlob(r,'image/png')})};
}
function parseWav(buf){
  const dv=new DataView(buf),s=(o,n)=>String.fromCharCode(...new Uint8Array(buf,o,n));
  if(buf.byteLength<44||s(0,4)!=='RIFF'||s(8,4)!=='WAVE')return null;
  let p=12,fmtc=null;
  while(p+8<=buf.byteLength){
    const id=s(p,4),sz=dv.getUint32(p+4,true);
    if(id==='fmt ')fmtc={tag:dv.getUint16(p+8,true),bits:dv.getUint16(p+22,true)};
    if(id==='data')return fmtc?{fmt:fmtc,off:p+8,len:Math.min(sz,buf.byteLength-p-8)}:null;
    p+=8+sz+(sz&1);
  }
  return null;
}
function encodeWav(ab){
  const ch=ab.numberOfChannels,len=ab.length,sr=ab.sampleRate,out=new Uint8Array(44+len*ch*2),dv=new DataView(out.buffer);
  const w=(o,t)=>{for(let i=0;i<t.length;i++)out[o+i]=t.charCodeAt(i)};
  w(0,'RIFF');dv.setUint32(4,36+len*ch*2,true);w(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);
  dv.setUint16(22,ch,true);dv.setUint32(24,sr,true);dv.setUint32(28,sr*ch*2,true);dv.setUint16(32,ch*2,true);dv.setUint16(34,16,true);
  w(36,'data');dv.setUint32(40,len*ch*2,true);
  const cs=[];for(let c=0;c<ch;c++)cs.push(ab.getChannelData(c));
  let p=44;for(let i=0;i<len;i++)for(let c=0;c<ch;c++){const x=Math.max(-1,Math.min(1,cs[c][i]));dv.setInt16(p,x<0?x*32768:x*32767,true);p+=2}
  return out;
}
async function wavCarrier(file,noConv){
  const buf=await file.arrayBuffer();let info=parseWav(buf),bytes,conv=false;
  if(info&&(info.fmt.tag===1||info.fmt.tag===0xFFFE)&&info.fmt.bits===16)bytes=new Uint8Array(buf.slice(0));
  else{
    if(noConv)throw new Error('skip');
    const ac=new(window.AudioContext||window.webkitAudioContext)();let ab;
    try{ab=await ac.decodeAudioData(buf.slice(0))}catch{throw new Error('Не удалось прочитать аудио')}finally{ac.close()}
    bytes=encodeWav(ab);info=parseWav(bytes.buffer);conv=true;
  }
  const off=info.off;
  return{n:Math.floor(info.len/2),converted:conv,get:i=>bytes[off+2*i],set:(i,v)=>{bytes[off+2*i]=v},
    save:async()=>new Blob([bytes],{type:'audio/wav'})};
}

/* LSB: первые 8 ячеек (по 1 биту) хранят глубину, дальше данные по `d` бит на ячейку */
function embed(c,p,d){
  const cap=Math.max(0,Math.floor((c.n-8)*d/8));
  if(8+Math.ceil(p.length*8/d)>c.n)throw new Error('Не влезает: нужно '+fmt(p.length)+', вместимость '+fmt(cap)+'. Увеличьте «бит на канал», возьмите контейнер побольше или метод «В конец файла».');
  for(let b=0;b<8;b++)c.set(b,(c.get(b)&254)|((d>>(7-b))&1));
  const m=(1<<d)-1,tb=p.length*8;let bp=0;
  for(let s=8;bp<tb;s++){
    let v=0;for(let k=0;k<d;k++,bp++)v=(v<<1)|(bp<tb?(p[bp>>3]>>(7-(bp&7)))&1:0);
    c.set(s,(c.get(s)&~m&255)|v);
  }
}
function lsbReader(c){
  if(c.n<64)throw NF();
  let d=0;for(let b=0;b<8;b++)d=(d<<1)|(c.get(b)&1);
  if(d<1||d>4)throw NF();
  const m=(1<<d)-1;let s=8,buf=0,nb=0;
  return{max:Math.floor((c.n-8)*d/8),read(n){
    const o=new Uint8Array(n);
    for(let i=0;i<n;i++){
      while(nb<8){if(s>=c.n)throw NF();buf=(buf<<d)|(c.get(s++)&m);nb+=d}
      o[i]=(buf>>(nb-8))&255;nb-=8;buf&=(1<<nb)-1;
    }
    return o;
  }};
}
const arrReader=a=>{let p=0;return n=>{if(p+n>a.length)throw NF();const o=a.slice(p,p+n);p+=n;return o}};
const tryRun=async fn=>{try{return await fn()}catch(e){if(e.message==='NOTFOUND')return null;throw e}};


const g=id=>document.getElementById(id);
const ST={meth:'auto',depth:1,zip:true,tok:0,urls:[]};
const urlOf=b=>{const u=URL.createObjectURL(b);ST.urls.push(u);return u};
function msg(o,t,err){o.innerHTML='';const p=document.createElement('div');p.className='sgm'+(err?' err':'');p.textContent=t;o.append(p)}
function link(o,blob,name){const a=document.createElement('a');a.href=urlOf(blob);a.download=name;a.className='swgo sgdl';a.innerHTML=icon('download')+'<span></span>';a.lastChild.textContent='Скачать '+name;o.append(a)}
/* Предпросмотр по сигнатуре байтов, а не по имени/MIME */
async function showPreview(el,blob,name,size){
  el.hidden=false;el.innerHTML='';
  const head=new Uint8Array(await blob.slice(0,64).arrayBuffer());
  const mime=sniff(head),label=LABEL[mime]||mime;
  const fn=document.createElement('div');fn.className='sgfn';fn.textContent=name||'(без имени)';
  const mt=document.createElement('div');mt.className='sgfm';mt.textContent=label+' · '+fmt(size!=null?size:blob.size);
  el.append(fn,mt);
  const url=urlOf(blob);
  if(mime.startsWith('image/')){const img=document.createElement('img');img.src=url;img.alt=name||'';el.append(img)}
  else if(mime.startsWith('audio/')){const a=document.createElement('audio');a.controls=true;a.src=url;el.append(a)}
  else if(mime.startsWith('video/')){const v=document.createElement('video');v.controls=true;v.src=url;el.append(v)}
  else if(mime==='text/plain'&&blob.size<200000){const t=await blob.text(),pre=document.createElement('pre');pre.textContent=t.slice(0,4000)+(t.length>4000?'\n…':'');el.append(pre)}
}
const hidePrev=el=>{el.hidden=true;el.innerHTML=''};
function method(f){
  const m=ST.meth;if(m!=='auto')return m;
  if(f.type.startsWith('image/'))return'img';
  if(/\.wav$/i.test(f.name))return'wav';
  return'append';
}
const payloadSize=()=>{const pf=g('sgpay').files[0];return pf?pf.size:enc.encode(g('sgtxt').value||'').length};
async function updCap(){
  const t=++ST.tok,f=g('sgcont').files[0],o=g('sgcap');
  if(!f){o.textContent='';return}
  const m=method(f);
  if(m==='append'){o.textContent='Размер данных не ограничен: они дописываются в конец файла.';return}
  o.textContent='Считаю вместимость…';
  try{
    const c=await(m==='img'?imgCarrier(f):wavCarrier(f));if(t!==ST.tok)return;
    const cells=c.n-8,need=payloadSize()+80,curD=ST.depth,curCap=Math.max(0,Math.floor(cells*curD/8));
    let line='Вместимость при '+curD+' бит/канал: около '+fmt(curCap)+(c.converted?'. Аудио будет сконвертировано в WAV.':'');
    if(need>80){
      let rec=null;for(let d=1;d<=4;d++){if(Math.floor(cells*d/8)>=need){rec=d;break}}
      if(rec===null)line+='. Даже при 4 бит/канал файл не влезает: нужен контейнер побольше или метод «В конец файла».';
      else if(rec===curD)line+='. Для этого файла текущей глубины достаточно.';
      else if(rec<curD)line+='. Для этого файла хватило бы '+rec+' бит/канал, это меньше изменений в контейнере.';
      else line+='. Для этого файла нужно не меньше '+rec+' бит/канал, иначе не влезет.';
    }
    o.textContent=line;
  }catch(e){if(t===ST.tok)o.textContent=e.message}
}
function pills(box,attr,val){document.querySelectorAll('#'+box+' button').forEach(b=>b.classList.toggle('on',b.dataset[attr]===String(val)))}
function tab(n){
  g('sgp1').hidden=n!==1;g('sgp2').hidden=n!==2;
  document.querySelectorAll('[data-sgtab]').forEach(b=>b.classList.toggle('on',+b.dataset.sgtab===n));
}
const fileName=(id,f,def)=>{const e=g(id+'n');if(e)e.textContent=f?f.name+' · '+fmt(f.size):def};
async function doHide(){
  const o=g('sgo1'),cf=g('sgcont').files[0],pf=g('sgpay').files[0],txt=g('sgtxt').value;
  if(!cf)return msg(o,'Выберите контейнер',1);
  if(!pf&&!txt)return msg(o,'Выберите файл или введите текст',1);
  msg(o,'Работаю…');
  try{
    const name=pf?pf.name:'message.txt',data=pf?new Uint8Array(await pf.arrayBuffer()):enc.encode(txt);
    const pk=await buildPacket(name,data,g('sgpw').value,ST.zip),m=method(cf);
    const base=cf.name.replace(/\.[^.]*$/,''),ext=(cf.name.match(/\.[^.]*$/)||[''])[0];
    let blob,out;
    if(m==='append'){blob=new Blob([await cf.arrayBuffer(),pk,u32(pk.length),TRAIL]);out=base+'_out'+ext}
    else{const c=await(m==='img'?imgCarrier(cf):wavCarrier(cf));embed(c,pk,ST.depth);blob=await c.save();out=base+'_out.'+(m==='img'?'png':'wav')}
    msg(o,'Готово. Спрятано: '+name+' ('+fmt(data.length)+'). Храните и пересылайте результат как файл, не как фото в мессенджере.');
    link(o,blob,out);
    const pv=document.createElement('div');pv.className='sgpv';o.append(pv);
    await showPreview(pv,blob,out,blob.size);
  }catch(e){msg(o,e.message,1)}
}
async function doFind(){
  const o=g('sgo2'),f=g('sgdfile').files[0],pw=g('sgdpw').value;
  if(!f)return msg(o,'Выберите файл',1);
  msg(o,'Ищу данные…');
  try{
    const b=new Uint8Array(await f.arrayBuffer()),L=b.length;let r=null;
    if(L>12&&TRAIL.every((v,i)=>b[L-8+i]===v)){
      const n=new DataView(b.buffer).getUint32(L-12);
      if(n+12<=L)r=await tryRun(()=>parsePacket(arrReader(b.subarray(L-12-n,L-12)),n,pw));
    }
    const lsb=c=>tryRun(()=>{const x=lsbReader(c);return parsePacket(x.read,x.max,pw)});
    if(!r){let c=null;try{c=await wavCarrier(f,1)}catch{}if(c)r=await lsb(c)}
    if(!r){let c=null;try{c=await imgCarrier(f)}catch{}if(c)r=await lsb(c)}
    if(!r)return msg(o,'Скрытых данных не найдено. Возможно, файл пережали или он в другом формате.',1);
    const safeName=r.name.replace(/[\\/:*?"<>|]/g,'_')||'extracted.bin',rb=new Blob([r.data]);
    msg(o,'Найден файл: '+r.name+' ('+fmt(r.data.length)+')');
    link(o,rb,safeName);
    const pv=document.createElement('div');pv.className='sgpv';o.append(pv);
    await showPreview(pv,rb,r.name,r.data.length);
  }catch(e){msg(o,e.message,1)}
}
function build(){
  ST.urls.splice(0).forEach(u=>URL.revokeObjectURL(u));
  ST.meth='auto';ST.depth=1;ST.zip=true;ST.tok++;
  const pick=(id,t,s)=>`<label class="sgf"><span class="sgfi">${icon('picture')}</span><span class="sgft"><b>${t}</b><span id="${id}n">${s}</span></span><input type="file" id="${id}"></label>`;
  $('#admb').innerHTML=`<div class="gls stg">
    <div class="glseg sgtabs"><button class="on" data-sgtab="1">${icon('lock')}Спрятать</button><button data-sgtab="2">${icon('unlock')}Достать</button></div>
    <div id="sgp1" class="gls0">
      <section class="gl"><div class="gll">Контейнер</div>${pick('sgcont','Выбрать контейнер','Картинка, аудио или любой файл')}<div id="sgpc" class="sgpv" hidden></div></section>
      <section class="gl"><div class="gll">Что спрятать</div>${pick('sgpay','Выбрать файл','Любой файл')}<div id="sgpp" class="sgpv" hidden></div><div class="sgor">или текст</div><textarea id="sgtxt" class="glin" rows="3" placeholder="Введите текст…"></textarea></section>
      <section class="gl"><div class="gll">Метод</div>
        <div class="glseg" id="sgm"><button class="on" data-sgm="auto">Авто</button><button data-sgm="img">В картинку</button><button data-sgm="wav">В аудио</button><button data-sgm="append">В конец файла</button></div>
        <div class="glsub" id="sgmd">Авто: тип выбирается по контейнеру. «В картинку» даёт PNG, «В аудио» даёт WAV, «В конец файла» подходит для любого формата и сохраняет его.</div>
        <div class="gll sgmt">Бит на канал</div><div class="glseg g4" id="sgd"><button class="on" data-sgd="1">1</button><button data-sgd="2">2</button><button data-sgd="3">3</button><button data-sgd="4">4</button></div>
        <div class="gll sgmt">Пароль</div><input type="password" id="sgpw" class="glin" autocomplete="off" placeholder="необязательно">
        <div class="sgzr"><span>Сжать перед встраиванием</span><button class="swsw" id="sgzip" role="switch" aria-checked="true" aria-label="Сжать перед встраиванием"></button></div>
        <div id="sgcap" class="glsub"></div></section>
      <button class="swgo" id="sggo">${icon('lock')}Спрятать</button><div id="sgo1" class="sgo"></div>
    </div>
    <div id="sgp2" class="gls0" hidden>
      <section class="gl"><div class="gll">Файл с данными</div>${pick('sgdfile','Выбрать файл','Картинка, аудио или любой файл')}<div id="sgpd" class="sgpv" hidden></div>
        <div class="gll sgmt">Пароль (если был)</div><input type="password" id="sgdpw" class="glin" autocomplete="off"></section>
      <button class="swgo" id="sgdgo">${icon('unlock')}Достать</button><div id="sgo2" class="sgo"></div>
    </div>
  </div>`;
  const root=g('sgp1').parentNode;
  root.addEventListener('click',e=>{
    const tb=e.target.closest('[data-sgtab]');if(tb){tab(+tb.dataset.sgtab);return}
    const mm=e.target.closest('[data-sgm]');if(mm){ST.meth=mm.dataset.sgm;pills('sgm','sgm',ST.meth);updCap();return}
    const dd=e.target.closest('[data-sgd]');if(dd){ST.depth=+dd.dataset.sgd;pills('sgd','sgd',ST.depth);updCap();return}
    if(e.target.closest('#sgzip')){ST.zip=!ST.zip;g('sgzip').setAttribute('aria-checked',ST.zip);return}
    if(e.target.closest('#sggo')){doHide();return}
    if(e.target.closest('#sgdgo')){doFind();return}
  });
  const onFile=(id,prev,def)=>g(id).addEventListener('change',()=>{const f=g(id).files[0];fileName(id,f,def);f?showPreview(g(prev),f,f.name,f.size):hidePrev(g(prev))});
  onFile('sgcont','sgpc','Картинка, аудио или любой файл');onFile('sgpay','sgpp','Любой файл');onFile('sgdfile','sgpd','Картинка, аудио или любой файл');
  g('sgcont').addEventListener('change',updCap);g('sgpay').addEventListener('change',updCap);g('sgtxt').addEventListener('input',updCap);
}
return{open(){openAdm(extName('stego'));build()}};
})();
function openStego(){STG.open()}

