/* ===== ФАЙЛ ядро-16-обложки.js =====
   
   Обложки: разбор тегов, хранилище, подбор, показ.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/*CV-PARSE-BEGIN*/
/* ---- обложки: достаём картинку и исполнителя из тегов файла (mp3/ID3, flac, m4a) ---- */
const cvSync=(b,o)=>((b[o]&127)<<21)|((b[o+1]&127)<<14)|((b[o+2]&127)<<7)|(b[o+3]&127);
const cvUnsync=b=>{const o=new Uint8Array(b.length);let n=0;for(let i=0;i<b.length;i++){o[n++]=b[i];if(b[i]===255&&b[i+1]===0)i++}return o.subarray(0,n)};
const cvStrEnd=(b,o,enc)=>{if(enc===1||enc===2){for(let i=o;i+1<b.length;i+=2)if(b[i]===0&&b[i+1]===0)return[i,2];return[b.length,0]}for(let i=o;i<b.length;i++)if(b[i]===0)return[i,1];return[b.length,0]};
const cvText=(b,enc)=>{try{let l='utf-8';if(enc===0)l='latin1';else if(enc===1||enc===2){l=enc===2?'utf-16be':'utf-16le';if(b[0]===254&&b[1]===255){l='utf-16be';b=b.subarray(2)}else if(b[0]===255&&b[1]===254)b=b.subarray(2)}return new TextDecoder(l).decode(b).split('\0')[0].trim()}catch(e){return ''}};
const cvImg=u=>u.length<12?'':u[0]===255&&u[1]===216&&u[2]===255?'image/jpeg':u[0]===137&&u[1]===80&&u[2]===78&&u[3]===71?'image/png':u[0]===71&&u[1]===73&&u[2]===70?'image/gif':(u[0]===82&&u[1]===73&&u[2]===70&&u[3]===70&&u[8]===87&&u[9]===69&&u[10]===66&&u[11]===80)?'image/webp':'';
/* сколько байт занимает ID3-тег целиком (чтобы докачать только начало файла) */
const cvId3Len=h=>h.length>=10&&h[0]===73&&h[1]===68&&h[2]===51?10+cvSync(h,6)+(h[5]&16?10:0):0;
function cvId3(u){
  if(u.length<10||u[0]!==73||u[1]!==68||u[2]!==51)return null;
  const ver=u[3],fl=u[5],size=cvSync(u,6),want=10+size;
  let body=u.subarray(10,Math.min(u.length,want)),auth=u.length>=want;
  if(fl&128&&ver<4)body=cvUnsync(body);
  let o=0;
  if(fl&64&&body.length>4)o=ver===4?cvSync(body,0):4+((body[0]<<24)|(body[1]<<16)|(body[2]<<8)|body[3]);
  const il=ver===2?3:4,hl=ver===2?6:10;
  let pic=null,front=null,artist='';
  while(o+hl<=body.length){
    const id=String.fromCharCode(...body.subarray(o,o+il));
    if(!/^[A-Z0-9]+$/.test(id))break;
    const sz=ver===2?(body[o+3]<<16)|(body[o+4]<<8)|body[o+5]:ver===3?body[o+4]*16777216+((body[o+5]<<16)|(body[o+6]<<8)|body[o+7]):cvSync(body,o+4);
    const fg=ver>2?body[o+9]:0,st=o+hl;
    if(sz<=0)break;
    if(st+sz>body.length){auth=false;break}
    let d=body.subarray(st,st+sz);o=st+sz;
    if(ver===3){if(fg&192)continue;if(fg&32)d=d.subarray(1)}
    if(ver===4){if(fg&12)continue;if(fg&64)d=d.subarray(1);if(fg&1)d=d.subarray(4);if(fg&2||fl&128)d=cvUnsync(d)}
    if(id==='APIC'||id==='PIC'){
      const enc=d[0];let p=1,type;
      if(id==='PIC'){p=4}else{const e=cvStrEnd(d,p,0);p=e[0]+e[1]}
      type=d[p];p++;
      const e2=cvStrEnd(d,p,enc),data=d.subarray(e2[0]+e2[1]),mime=cvImg(data);
      if(mime&&!pic)pic={data,mime};
      if(mime&&type===3&&!front)front={data,mime};
    }else if((id==='TPE1'||id==='TP1')&&!artist&&d.length>1)artist=cvText(d.subarray(1),d[0]);
  }
  return{pic:front||pic,artist,auth};
}
async function cvFlac(b){
  const u32=(d,o)=>d.getUint32(o);
  let o=4,pic=null,front=null,artist='',auth=false;
  for(;;){
    if(o+4>b.size)break;
    const h=new Uint8Array(await b.slice(o,o+4).arrayBuffer()),last=h[0]&128,type=h[0]&127,len=(h[1]<<16)|(h[2]<<8)|h[3];
    if(o+4+len>b.size)break;
    if(type===6||type===4){
      const raw=new Uint8Array(await b.slice(o+4,o+4+len).arrayBuffer()),dv=new DataView(raw.buffer);
      try{
        if(type===6){
          const pt=u32(dv,0),ml=u32(dv,4),dl=u32(dv,8+ml),p=12+ml+dl+16,n=u32(dv,p),data=raw.subarray(p+4,p+4+n),mime=cvImg(data);
          if(mime&&!pic)pic={data,mime};if(mime&&pt===3&&!front)front={data,mime};
        }else{
          const vl=dv.getUint32(0,true);let p=4+vl;const c=dv.getUint32(p,true);p+=4;
          for(let i=0;i<c&&p+4<=raw.length;i++){const l=dv.getUint32(p,true);p+=4;const t=new TextDecoder().decode(raw.subarray(p,p+l));p+=l;const m=/^artist=(.*)$/i.exec(t);if(m&&!artist)artist=m[1].trim()}
        }
      }catch(e){}
    }
    o+=4+len;
    if(last){auth=true;break}
  }
  return{pic:front||pic,artist,auth};
}
function cvMoov(u){
  const dv=new DataView(u.buffer,u.byteOffset,u.byteLength);let pic=null,artist='';
  const box=(o,e,fn)=>{while(o+8<=e){const sz=dv.getUint32(o),t=String.fromCharCode(u[o+4],u[o+5],u[o+6],u[o+7]);if(sz<8||o+sz>e)break;fn(t,o+8,o+sz);o+=sz}};
  const ilst=(s,e)=>box(s,e,(t,s2,e2)=>{
    if(t==='covr'&&!pic)box(s2,e2,(t3,s3,e3)=>{if(t3==='data'){const d=u.subarray(s3+8,e3),m=cvImg(d);if(m)pic={data:d,mime:m}}});
    else if(t==='\u00a9ART'&&!artist)box(s2,e2,(t3,s3,e3)=>{if(t3==='data')artist=new TextDecoder().decode(u.subarray(s3+8,e3)).trim()});
  });
  const meta=(s,e)=>box(s+4,e,(t,s2,e2)=>{if(t==='ilst')ilst(s2,e2)});
  box(0,u.length,(t,s,e)=>{if(t==='udta')box(s,e,(t2,s2,e2)=>{if(t2==='meta')meta(s2,e2)});else if(t==='meta')meta(s,e)});
  return{pic,artist,auth:true};
}
async function cvMp4(b){
  let o=0;
  while(o+8<=b.size){
    const dv=new DataView(await b.slice(o,o+16).arrayBuffer());
    let sz=dv.getUint32(0),hl=8;const t=String.fromCharCode(dv.getUint8(4),dv.getUint8(5),dv.getUint8(6),dv.getUint8(7));
    if(sz===1&&dv.byteLength>=16){sz=dv.getUint32(8)*4294967296+dv.getUint32(12);hl=16}else if(sz===0)sz=b.size-o;
    if(sz<hl)break;
    if(t==='moov'){if(o+sz>b.size)return null;return cvMoov(new Uint8Array(await b.slice(o+hl,o+sz).arrayBuffer()))}
    o+=sz;
  }
  return null;
}
/* blob — файл целиком или его начало; возвращает {pic:{data,mime}|null, artist, auth} или null, если формат не разобрать */
async function cvTags(b){
  const h=new Uint8Array(await b.slice(0,12).arrayBuffer());
  if(h[0]===73&&h[1]===68&&h[2]===51){const n=cvId3Len(h);if(n>12e6)return{pic:null,artist:'',auth:true};return cvId3(new Uint8Array(await b.slice(0,Math.min(b.size,n)).arrayBuffer()))}
  if(h[0]===102&&h[1]===76&&h[2]===97&&h[3]===67)return cvFlac(b);
  if(h[4]===102&&h[5]===116&&h[6]===121&&h[7]===112)return cvMp4(b);
  return null;
}
/*CV-PARSE-END*/

/*CV-RUN-BEGIN*/
/* ---- обложки: хранилище, подбор и показ ----
   Порядок: тег в самом файле (если файл уже на устройстве или это mp3/flac — докачиваем только начало), иначе поиск в iTunes по названию. */
const COV=new Map(),CVA=new Map(),CVT=new Map(),CVQ={q:[],set:new Set(),run:false,webAt:0,cool:0};
const cvWebOn=()=>ld('cvweb','on')!=='off';
const CVDB=()=>CVDB.p||(CVDB.p=new Promise((ok,no)=>{try{const r=indexedDB.open('oblachko-cov',1);r.onupgradeneeded=()=>r.result.createObjectStore('c');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}}));
const cvIO=(mode,fn)=>CVDB().then(db=>new Promise((ok,no)=>{const t=db.transaction('c',mode),q=fn(t.objectStore('c'));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)}));
const cvGet=id=>cvIO('readonly',s=>s.get(cvK(id))).catch(()=>null);
const cvPut=(id,rec)=>cvIO('readwrite',s=>s.put(rec,cvK(id))).catch(()=>{});
const cvEqm='<span class="eqm"><i></i><i></i><i></i></span>';
const CVG=new Map();
function cvGen(id){
  const f=files.find(x=>x.id==id),n=f?f.name:String(id),k=id+'|'+n;
  if(CVG.has(k))return CVG.get(k);
  const h1=hueOf(n),h2=hueOf(n+'b'),h3=hueOf(n+'c'),h4=hueOf(n+'d'),h5=hueOf(n+'e');
  const a=134+h1%44,l1=24+h2%16,l2=8+h3%9,ang=h4%360,s1=34+h5%18;
  const c=(x,y,r,hh,ll,o)=>`<circle cx='${x}' cy='${y}' r='${r}' fill='hsl(${hh} ${s1}% ${ll}%)' opacity='${o}'/>`;
  const svg=`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' gradientTransform='rotate(${ang} .5 .5)'><stop offset='0' stop-color='hsl(${a} ${s1}% ${l1}%)'/><stop offset='1' stop-color='hsl(${a+16} ${s1+6}% ${l2}%)'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/>${c(10+h2%80,8+h3%40,16+h4%24,a-10,l1+12,.22)}${c(15+h3%75,60+h5%36,20+h1%26,a+22,l2+16,.2)}${c(70+h4%24,30+h2%50,8+h5%14,a+8,l1+20,.16)}<g fill='rgba(255,255,255,.88)'><ellipse cx='41' cy='68' rx='9' ry='6.5' transform='rotate(-18 41 68)'/><rect x='47' y='28' width='4.5' height='40'/><path d='M51.5 28q17 3 17 18q-6-9-17-9z'/></g></svg>`;
  const u='data:image/svg+xml,'+encodeURIComponent(svg).replace(/'/g,'%27');
  CVG.set(k,u);return u;
}
const cvUrl=id=>COV.get(id)||cvGen(id);
const covInner=id=>`<img alt="" src="${cvUrl(id)}">`+(COV.get(id)?'':cvEqm);
function cvPaint(id){document.querySelectorAll(`[data-cv="${id}"]`).forEach(el=>{el.innerHTML=covInner(id)})}
function cvPlayer(f){
  const u=f&&cvUrl(f.id),pl=$('#pl');if(!pl)return;
  $('#pcv').style.backgroundImage=u?`url("${u}")`:'';
  $('#eq').style.setProperty('--cv',u?`url("${u}")`:'none');
  pl.classList.toggle('hascv',!!u);pl.classList.toggle('cvbg',!!u);
}
function cvApply(f,rec){
  if(COV.has(f.id)&&CVT.get(f.id)===rec.t)return;
  const u=rec.b?URL.createObjectURL(rec.b):(rec.u||'');
  CVT.set(f.id,rec.t);COV.set(f.id,u);if(rec.a)CVA.set(f.id,rec.a);
  cvPaint(f.id);
  if(pi>=0&&pq[pi]&&pq[pi].id===f.id){cvPlayer(f);msMeta(f)}
}
const cvTerm=n=>dispName(n).replace(/[\[(][^\])]*[\])]/g,' ').replace(/\b(official|lyrics?|audio|video|clip|hd|hq|mp3)\b/gi,' ').replace(/^\s*\d{1,3}[\s.\-_)]+/,'').replace(/_+/g,' ').replace(/\s+/g,' ').trim();
const cvToks=t=>(t.toLowerCase().replace(/ё/g,'е').match(/[\p{L}\p{N}]+/gu)||[]);
function cvJsonp(url){return new Promise((ok,no)=>{const cb='cvj'+Date.now()+Math.floor(Math.random()*1e6),sc=document.createElement('script');let t=setTimeout(()=>{fin();no(new Error('timeout'))},12000);function fin(){clearTimeout(t);delete window[cb];sc.remove()}window[cb]=d=>{fin();ok(d)};sc.onerror=()=>{fin();no(new Error('net'))};sc.src=url+'&callback='+cb;document.head.appendChild(sc)})}
async function cvItunes(term,cc){
  const url='https://itunes.apple.com/search?media=music&entity=song&limit=8&term='+encodeURIComponent(term)+cc;
  try{
    const r=await fetch(url);
    if(r.status===403||r.status===429){const e=new Error('limit');e.rate=1;throw e}
    if(!r.ok)return null;
    return await r.json();
  }catch(e){
    if(e&&e.rate)throw e;
    return await cvJsonp(url);
  }
}
async function cvWeb(f){
  const term=cvTerm(f.name);if(term.length<3||cvToks(term).length<1)return null;
  const ft=new Set(cvToks(term));
  for(const cc of ['','&country=RU']){
    const w=Math.max(0,3200-(Date.now()-CVQ.webAt));if(w)await sleep(w);CVQ.webAt=Date.now();
    const j=await cvItunes(term,cc);if(!j)continue;let best=null,bs=0;
    for(const x of j.results||[]){
      const tt=cvToks(x.trackName||''),at=cvToks(x.artistName||'');if(!tt.length||!x.artworkUrl100)continue;
      const tin=tt.filter(w=>ft.has(w)).length/tt.length,ah=at.some(w=>ft.has(w));
      /* берём только уверенное совпадение: все слова названия есть в имени файла и совпал исполнитель (или в имени файла только название) */
      if(tin>=1&&(ah||ft.size<=tt.length)&&tin+(ah?1:0)>bs){bs=tin+(ah?1:0);best=x}
    }
    if(best)return{url:best.artworkUrl100.replace(/\d+x\d+bb\.(jpg|png)$/,'600x600bb.jpg'),artist:best.artistName||''};
  }
  return null;
}
async function cvShrink(b){
  try{
    const bm=await createImageBitmap(b),k=Math.min(1,600/Math.max(bm.width,bm.height)),w=Math.max(1,Math.round(bm.width*k)),h=Math.max(1,Math.round(bm.height*k));
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#111';x.fillRect(0,0,w,h);x.drawImage(bm,0,0,w,h);if(bm.close)bm.close();
    const o=await new Promise(r=>c.toBlob(r,'image/jpeg',.84));
    return o&&(o.size<b.size||k<1)?o:b;
  }catch(e){return b}
}
/* начало файла: для mp3 ровно размер ID3-тега, для flac первые 2 МБ; остальные форматы без полной загрузки не разобрать */
async function cvHead(f){
  const it=client.download(f.fid)[Symbol.asyncIterator]();let parts=[],n=0,need=10;
  try{
    for(;;){
      const r=await stallP(it.next(),20000);if(r.done)break;
      const c=r.value;parts.push(c);n+=c.length||c.byteLength||0;
      if(need===10&&n>=10){
        const h=new Uint8Array(await new Blob(parts).slice(0,10).arrayBuffer()),l=cvId3Len(h);
        if(l)need=Math.min(l,12e6);else if(h[0]===102&&h[1]===76&&h[2]===97&&h[3]===67)need=2e6;else return null;
      }
      if(need>10&&n>=need)break;
    }
  }finally{try{const q=it.return&&it.return();q&&q.catch&&q.catch(()=>{})}catch(e){}}
  return new Blob(parts);
}
async function cvHeadEnc(f){
  const key=KEYS[f.repo];if(!key||!client)return null;
  const CH=1<<20,n=Math.max(1,Math.ceil((f.size-4)/(CH+32)));
  const it=client.download(f.fid)[Symbol.asyncIterator]();let parts=[],got=0,need=8,v2=false;
  try{
    for(;;){
      const r=await stallP(it.next(),20000);if(r.done)break;
      parts.push(r.value);got+=r.value.length||r.value.byteLength||0;
      if(need===8&&got>=8){
        const h=new Uint8Array(await new Blob(parts).slice(0,8).arrayBuffer());
        v2=h[0]===84&&h[1]===71&&h[2]===69&&h[3]===50;
        if(!v2&&!(h[0]===84&&h[1]===71&&h[2]===69&&h[3]===49))return null;
        const L=new DataView(h.buffer).getUint32(4);if(L>CH+64)return null;need=8+L;
      }
      if(need>8&&got>=need)break;
    }
  }finally{try{const q=it.return&&it.return();q&&q.catch&&q.catch(()=>{})}catch(e){}}
  if(need<=8||got<need)return null;
  const u=new Uint8Array(await new Blob(parts).slice(8,need).arrayBuffer());
  return new Blob([await aesD(key,u,v2?chunkAad(0,n):undefined)]);
}
async function cvHeavy(f,hi,rec){
  if(!cvWebOn()||(f.enc&&f.dec!==1))return;
  if(Date.now()<CVQ.cool){setTimeout(cvAllSoon,CVQ.cool-Date.now()+1500);return}
  if(rec&&rec.k==='web'&&(rec.b||rec.u))return;
  let out=null,tried=false,pubU='',w=null;
  try{w=await cvWeb(f);tried=true}catch(e){CVQ.cool=Date.now()+(e&&e.rate?90000:300000)}   /* лимит или нет доступа к iTunes: на время прекращаем, запись останется «не искали» */
  if(w){
    pubU=w.url;
    try{const r=await fetch(w.url);if(!r.ok)throw 0;out={b:await cvShrink(await r.blob()),k:'web',a:w.artist,fc:false,t:Date.now()}}
    catch(e){out={u:w.url,k:'web',a:w.artist,fc:false,t:Date.now()}}
  }
  if(!out){if(!tried)return;out={k:'none',w:1,a:'',fc:false,t:Date.now()}}
  await cvPut(f.id,out);cvApply(f,out);
  if(out.k==='web'&&pubU)try{cvPub(f,pubU,out.a)}catch(e){}
}
async function cvPump(){
  if(CVQ.run)return;CVQ.run=true;
  try{
    while(CVQ.q.length){
      const it=CVQ.q.shift(),f=it.f;
      try{
        if(!it.hi&&!it.bg&&!document.querySelector(`[data-cv="${f.id}"]`))continue;     /* строка уже прокручена/перерисована — не тратим трафик */
        await cvHeavy(f,it.hi,it.rec);await sleep(200);
      }catch(e){
        if(e&&/busy/.test(e.message||'')){if(it.bg)setTimeout(()=>cvEnsure(f,false,true),8000);else setTimeout(()=>document.querySelectorAll(`[data-cv="${f.id}"]`).forEach(el=>cvObs.observe(el)),8000)}
      }finally{CVQ.set.delete(f.id)}
    }
  }finally{CVQ.run=false}
}
async function cvEnsure(f,hi,bg){
  if(!f||!isAud(f)||!cvWebOn())return;
  if(!hi&&COV.has(f.id))return;
  let rec=await cvGet(f.id);const web=true;
  if(rec&&rec.k==='tag')rec=null;                /* обложки, взятые раньше из файлов, больше не используются */
  const rm=CVR.get(f.id);
  if(rm&&!(rec&&(rec.b||rec.u))){const r2={k:'web',u:rm.u,a:rm.a||'',fc:false,t:Date.now()};await cvPut(f.id,r2);cvApply(f,r2);return}
  const fresh=rec&&(rec.b||rec.u||(rec.k==='none'&&Date.now()-rec.t<3*864e5&&(rec.w||!web)));
  if(fresh)cvApply(f,rec);
  const todo=!fresh;
  if(!todo||CVQ.set.has(f.id))return;
  CVQ.set.add(f.id);hi?CVQ.q.unshift({f,hi,rec,bg}):CVQ.q.push({f,hi,rec,bg});cvPump();
}
/* общий индекс: найденные в интернете обложки пишутся в канал (для зашифрованных репозиториев — зашифрованно), на другом устройстве они подхватываются без скачивания */
const CVR=new Map(),CVDONE=new Set(),CVP=[];let cvPT=0,cvPB=false;
async function cvLoadRemote(){
  let ch=false;
  for(const m of CVRM){
    if(CVDONE.has(m.mid))continue;
    try{
      let txt;
      if(m.e){const k=KEYS[m.r];if(!k)continue;txt=td.decode(await aesD(k,b64d(m.d)))}
      else txt=m.d;
      const j=JSON.parse(txt);
      for(const x of j.i||[])if(x&&x[0]&&x[1]){CVR.set(x[0],{u:String(x[1]),a:String(x[2]||'')});ch=true}
      CVDONE.add(m.mid);
    }catch(e){CVDONE.add(m.mid)}
  }
  cvAllSoon();
}
function cvPub(f,u,a){
  if(!f||!u||CVR.has(f.id))return;
  CVR.set(f.id,{u,a:a||''});CVP.push({r:f.repo||'',id:f.id,u,a:a||''});
  clearTimeout(cvPT);cvPT=setTimeout(cvFlush,8000);
}
async function cvFlush(){
  if(cvPB||!CVP.length||OFFLINE||!client||!S.chat)return;
  cvPB=true;
  try{
    while(CVP.length){
      const r=CVP[0].r,grp=[];
      for(let i=0;i<CVP.length&&grp.length<10;i++)if(CVP[i].r===r)grp.push(CVP[i]);
      const e=encOf(r);if(e&&!KEYS[r]){for(const g of grp)CVP.splice(CVP.indexOf(g),1);continue}
      const json=JSON.stringify({i:grp.map(g=>[g.id,g.u,g.a])});
      const body=e?{r,e:1,d:b64e(await aesE(KEYS[r],te.encode(json)))}:{r,e:0,d:json};
      const txt=CVX+JSON.stringify(body);
      if(txt.length>3900){for(const g of grp)CVP.splice(CVP.indexOf(g),1);continue}
      const m=await withChat(()=>client.sendMessage(S.chat,txt));
      CVDONE.add(m.id);CVRM.push({mid:m.id,r,e:e?1:0,d:body.d});
      for(const g of grp)CVP.splice(CVP.indexOf(g),1);
      await sleep(1200);
    }
  }catch(e){setTimeout(cvFlush,60000)}
  cvPB=false;
}
/* подбор обложек сразу для всей музыки, а не только для видимых строк и проигранных треков */
let cvAllT=0,cvAllRun=false;
function cvAllSoon(){clearTimeout(cvAllT);cvAllT=setTimeout(cvAll,2500)}
async function cvAll(){
  if(cvAllRun||!client||OFFLINE||!files||!cvWebOn())return;cvAllRun=true;
  try{for(const f of files.slice()){if(!isAud(f)||COV.has(f.id))continue;if(f.enc&&f.dec!==1)continue;await cvEnsure(f,false,true)}}
  finally{cvAllRun=false}
}
const cvObs=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting)return;cvObs.unobserve(e.target);
  const f=files.find(x=>x.id==e.target.dataset.cv);if(f)cvEnsure(f,false);
}),{rootMargin:'200px'});
function cvShow(f){cvPlayer(f);cvEnsure(f,false)}
async function cvReset(){
  try{await cvIO('readwrite',s=>s.clear())}catch(e){}
  COV.clear();CVA.clear();CVQ.q.length=0;CVQ.set.clear();
  const f=pi>=0&&pq[pi];if(f)cvPlayer(f);
  render();
}
function cvWebChanged(){COV.clear();CVT.clear();const f=pi>=0&&pq[pi];if(f)cvPlayer(f);render();if(cvWebOn())cvAllSoon()}
/*CV-RUN-END*/
