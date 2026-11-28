/* ===== ФАЙЛ ядро-01-основа.js =====
   
   Чистые функции (имена, пути, подписи), QR-код, ключ CLK2, порядок и перемешивание, исходное состояние.
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* Чистые функции без DOM: разбор подписей, имён, путей. Покрыты tests/run.mjs */
const te=new TextEncoder(),td=new TextDecoder();
const TITLE='Мой архив',PFX='tgarchive',FP='📁 ',RP='🗂 ',LK='🔒 ',ENC='🔐 ';
const fmtT=sec=>!isFinite(sec)||sec<0?'':sec<60?Math.ceil(sec)+' с':Math.floor(sec/60)+' мин '+Math.ceil(sec%60)+' с';
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const size=n=>!n?'':n>1e9?(n/1e9).toFixed(2)+' ГБ':n>1e6?(n/1e6).toFixed(1)+' МБ':Math.max(1,Math.round(n/1e3))+' КБ';
const pad=n=>n?'№'+String(n).padStart(4,'0'):'№—';
const key=c=>c.replace(/[^\p{L}\p{N}_]/gu,'_');
const ext=n=>(n.split('.').pop()||'').slice(0,4).toUpperCase();
const MIME={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',pdf:'application/pdf',mp3:'audio/mpeg',m4a:'audio/mp4',ogg:'audio/ogg',oga:'audio/ogg',wav:'audio/wav',opus:'audio/ogg',flac:'audio/flac',m4v:'video/mp4','3gp':'video/3gpp',mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm',aac:'audio/aac'};
const mimeOf=(m,n)=>(m&&m!=='application/octet-stream')?m:(MIME[(n.split('.').pop()||'').toLowerCase()]||m||'');
const clean=n=>n.replace(/[\/\n\r]/g,' ').trim();
const parentPath=p=>p.includes('/')?p.slice(0,p.lastIndexOf('/')):'';
const base=p=>p.slice(p.lastIndexOf('/')+1);
const inTree=(p,root)=>p===root||p.startsWith(root+'/');
const b64e=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const b64d=t=>{t=t.replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';const s=atob(t),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u};
const caption=(no,path,name,repo)=>{
  const top=path?path.split('/')[0]:'';
  const c=(no?pad(no):'')+(top?' #'+key(top):'')+(repo?'\n'+RP+repo:'')+(path?'\n'+FP+path:'')+'\n'+name;
  if(c.length>1024)throw new Error('Подпись слишком длинная ('+c.length+' из 1024 символов): сократите имя файла или названия папок');
  return c;
};
function parseCombo(t){
  const km=/CLK1\.([A-Za-z0-9_-]+)/.exec(t);
  if(km){try{const j=JSON.parse(td.decode(b64d(km[1])));if(j&&j.i&&j.h&&j.p)return{id:String(j.i),hash:String(j.h),phone:String(j.p),viewer:true}}catch(e){}}
  const r={},tk=t.split(/[\s,;|]+/).map(p=>p.replace(/^(api[_-]?id|api[_-]?hash|hash|phone|тел\w*|номер)\s*[:=]?/i,'').replace(/^["'`:=]+|["'`:=]+$/g,'')).filter(Boolean);
  for(let i=0;i<tk.length;i++){
    const p=tk[i];
    if(p[0]==='+'&&!r.phone){
      let acc=p,n=p.replace(/\D/g,'').length,j=i+1;
      while(n<11&&j<tk.length&&/^[\d().\-]+$/.test(tk[j])){acc+=tk[j];n+=tk[j].replace(/\D/g,'').length;j++}
      r.phone='+'+acc.replace(/\D/g,'');i=j-1;continue;
    }
    if(/^[0-9a-f]{32}$/i.test(p))r.hash=p;
    else if(/^\d{10,15}$/.test(p)&&!r.phone)r.phone='+'+p;
    else if(/^\d{3,9}$/.test(p))r.id=p;
  }
  return r;
}
/* ---- QR-код (байтовый режим, коррекция L/M, версии 1–16): без внешних библиотек ---- */
const QR=(()=>{
  const EXP=new Uint8Array(512),LOG=new Uint8Array(256);
  for(let i=0,x=1;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d}
  for(let i=255;i<512;i++)EXP[i]=EXP[i-255];
  const mul=(a,b)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
  const gen=n=>{let g=[1];for(let i=0;i<n;i++){const r=new Array(g.length+1).fill(0);for(let j=0;j<g.length;j++){r[j]^=g[j];r[j+1]^=mul(g[j],EXP[i])}g=r}return g};
  const rs=(data,n)=>{const g=gen(n),r=new Array(n).fill(0);for(const d of data){const f=d^r.shift();r.push(0);if(f)for(let i=0;i<n;i++)r[i]^=mul(g[i+1],f)}return r};
  /* [ec на блок, блоков1, данных1, блоков2, данных2] */
  const TB={
    L:[0,[7,1,19,0,0],[10,1,34,0,0],[15,1,55,0,0],[20,1,80,0,0],[26,1,108,0,0],[18,2,68,0,0],[20,2,78,0,0],[24,2,97,0,0],[30,2,116,0,0],[18,2,68,2,69],[20,4,81,0,0],[24,2,92,2,93],[26,4,107,0,0],[30,3,115,1,116],[22,5,87,1,88],[24,5,98,1,99]],
    M:[0,[10,1,16,0,0],[16,1,28,0,0],[26,1,44,0,0],[18,2,32,0,0],[24,2,43,0,0],[16,4,27,0,0],[18,4,31,0,0],[22,2,38,2,39],[22,3,36,2,37],[26,4,43,1,44],[30,1,50,4,51],[22,6,36,2,37],[22,8,37,1,38],[24,4,40,5,41],[24,5,41,5,42],[28,7,45,3,46]]};
  const AL=[0,[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74]];
  const cap=(v,l)=>{const t=TB[l][v];return t[1]*t[2]+t[3]*t[4]};
  const bch=(v,g,len)=>{let r=v<<len;const gl=g.toString(2).length;for(let i=r.toString(2).length;i>=gl;i--)if(r>>(i-1)&1)r^=g<<(i-gl);return r};
  function build(v,l,bytes){
    const t=TB[l][v],total=t[1]*t[2]+t[3]*t[4],bits=[];
    const put=(x,n)=>{for(let i=n-1;i>=0;i--)bits.push(x>>i&1)};
    put(4,4);put(bytes.length,v<10?8:16);for(const b of bytes)put(b,8);
    put(0,Math.min(4,total*8-bits.length));while(bits.length%8)bits.push(0);
    const cw=[];for(let i=0;i<bits.length;i+=8){let x=0;for(let j=0;j<8;j++)x=x<<1|bits[i+j];cw.push(x)}
    for(let p=0;cw.length<total;p^=1)cw.push(p?0x11:0xec);
    const blocks=[];let o=0;
    for(let i=0;i<t[1]+t[3];i++){const n=i<t[1]?t[2]:t[4];blocks.push(cw.slice(o,o+n));o+=n}
    const ecs=blocks.map(b=>rs(b,t[0])),out=[],md=Math.max(t[2],t[4]);
    for(let i=0;i<md;i++)for(const b of blocks)if(i<b.length)out.push(b[i]);
    for(let i=0;i<t[0];i++)for(const e of ecs)out.push(e[i]);
    return out;
  }
  function make(v,l,data){
    const n=17+4*v,M=Array.from({length:n},()=>new Int8Array(n).fill(-1)),F=Array.from({length:n},()=>new Uint8Array(n));
    const set=(r,c,x)=>{if(r>=0&&c>=0&&r<n&&c<n){M[r][c]=x;F[r][c]=1}};
    /* поисковые узоры */
    const finder=(r,c)=>{for(let i=-1;i<=7;i++)for(let j=-1;j<=7;j++){let x=0;if(i>=0&&i<=6&&j>=0&&j<=6)x=(i===0||i===6||j===0||j===6||(i>=2&&i<=4&&j>=2&&j<=4))?1:0;set(r+i,c+j,x)}};
    finder(0,0);finder(0,n-7);finder(n-7,0);
    for(let i=8;i<n-8;i++){set(6,i,i%2?0:1);set(i,6,i%2?0:1)}
    const ap=AL[v];
    for(const a of ap)for(const b of ap){if((a===6&&b===6)||(a===6&&b===ap[ap.length-1])||(a===ap[ap.length-1]&&b===6))continue;
      for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)set(a+i,b+j,Math.max(Math.abs(i),Math.abs(j))===1?0:1)}
    set(n-8,8,1);
    for(let i=0;i<9;i++){if(!F[8][i])set(8,i,0);if(!F[i][8])set(i,8,0)}
    for(let i=0;i<8;i++){if(!F[8][n-1-i])set(8,n-1-i,0);if(!F[n-1-i][8])set(n-1-i,8,0)}
    if(v>=7){const vi=(v<<12)|bch(v,0x1f25,12);for(let i=0;i<18;i++){const b=vi>>i&1,a=Math.floor(i/3),c=i%3+n-11;set(a,c,b);set(c,a,b)}}
    /* данные змейкой */
    const bits=[];for(const b of data)for(let i=7;i>=0;i--)bits.push(b>>i&1);
    const place=mask=>{
      const m=M.map(r=>Int8Array.from(r));let k=0;
      for(let c=n-1;c>0;c-=2){if(c===6)c--;
        for(let i=0;i<n;i++){const r=((n-1-c)>>1&1)?i:n-1-i;
          for(let d=0;d<2;d++){const cc=c-d;if(F[r][cc])continue;let x=k<bits.length?bits[k]:0;k++;
            const mk=[(r+cc)%2===0,r%2===0,cc%3===0,(r+cc)%3===0,(Math.floor(r/2)+Math.floor(cc/3))%2===0,(r*cc)%2+(r*cc)%3===0,((r*cc)%2+(r*cc)%3)%2===0,((r+cc)%2+(r*cc)%3)%2===0][mask];
            m[r][cc]=x^(mk?1:0)}}}
      const fi=(((l==='L'?1:0)<<3|mask)<<10|bch((l==='L'?1:0)<<3|mask,0x537,10))^0x5412;
      const sf=(r,c,i)=>{m[r][c]=fi>>i&1};
      for(let i=0;i<=5;i++)sf(i,8,i);sf(7,8,6);sf(8,8,7);sf(8,7,8);for(let i=9;i<15;i++)sf(8,14-i,i);
      for(let i=0;i<8;i++)sf(8,n-1-i,i);for(let i=8;i<15;i++)sf(n-15+i,8,i);
      return m;
    };
    const pen=m=>{let p=0;
      for(let a=0;a<2;a++)for(let i=0;i<n;i++){let run=1;for(let j=1;j<n;j++){const x=a?m[j][i]:m[i][j],y=a?m[j-1][i]:m[i][j-1];if(x===y){run++;if(run===5)p+=3;else if(run>5)p++}else run=1}}
      for(let i=0;i<n-1;i++)for(let j=0;j<n-1;j++){const x=m[i][j];if(x===m[i][j+1]&&x===m[i+1][j]&&x===m[i+1][j+1])p+=3}
      const pt=[1,0,1,1,1,0,1,0,0,0,0],qt=[0,0,0,0,1,0,1,1,1,0,1];
      for(let a=0;a<2;a++)for(let i=0;i<n;i++)for(let j=0;j<=n-11;j++){let u=1,w=1;for(let k=0;k<11;k++){const x=a?m[j+k][i]:m[i][j+k];if(x!==pt[k])u=0;if(x!==qt[k])w=0}p+=(u+w)*40}
      let d=0;for(const r of m)for(const x of r)d+=x;p+=Math.floor(Math.abs(d*100/(n*n)-50)/5)*10;return p};
    let best=null,bp=1e9;for(let k=0;k<8;k++){const m=place(k),q=pen(m);if(q<bp){bp=q;best=m}}
    return best.map(r=>Array.from(r));
  }
  return text=>{
    const bytes=Array.from(new TextEncoder().encode(text));
    for(const l of['M','L'])for(let v=1;v<=16;v++){
      const need=Math.ceil((4+(v<10?8:16)+bytes.length*8)/8);
      if(need<=cap(v,l))return make(v,l,build(v,l,bytes));
    }
    throw new Error('Слишком длинный текст для QR');
  };
})();

/* ---- шифрованный ключ CLK2: AES-GCM, секрет зашит в приложение (защита от случайного взгляда, не от разбора кода) ---- */
const CK2SEC='31da4c25eea146a30e90121fef574d3fe4a3a3464c832adf';
const ck2key=async()=>crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',te.encode(CK2SEC)),'AES-GCM',false,['encrypt','decrypt']);
async function ck2enc(o){
  const iv=crypto.getRandomValues(new Uint8Array(12)),ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await ck2key(),te.encode(JSON.stringify(o))));
  const u=new Uint8Array(12+ct.length);u.set(iv);u.set(ct,12);return 'CLK2.'+b64e(u);
}
async function parseComboA(t){
  const m=/CLK2\.([A-Za-z0-9_\-\s]+)/i.exec(t);
  if(m){
    const tk=m[1].split(/\s+/).filter(Boolean);
    for(let k=tk.length;k>=1;k--){
      try{
        const u=b64d(tk.slice(0,k).join('')),j=JSON.parse(td.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:u.subarray(0,12)},await ck2key(),u.subarray(12))));
        if(j&&j.i&&j.h&&j.p)return{id:String(j.i),hash:String(j.h),phone:String(j.p),viewer:true}
      }catch(e){}
    }
    return{bad:true};
  }
  return parseCombo(t);
}
function ordBuild(L){
  const g=new Map();
  for(const x of L){const k=x.r+'\n'+x.p;let q=g.get(k);if(!q){q={r:x.r,p:x.p,parts:new Map(),mids:[]};g.set(k,q)}q.mids.push(x.mid);if(!q.parts.has(x.n))q.parts.set(x.n,x.o)}
  return[...g.values()].map(q=>({r:q.r,p:q.p,mids:q.mids,o:[...q.parts.keys()].sort((a,b)=>a-b).flatMap(n=>q.parts.get(n).split(',').filter(Boolean).map(t=>parseInt(t,36)))}));
}
function entry(m){
  const d=m.document||m.video||m.audio||m.animation,ph=m.photo;
  if(!d&&!ph)return null;
  const cap=m.caption||'',lines=cap.split('\n');
  const mt=cap.match(/^№(\d+)/),ht=cap.match(/#([\p{L}\p{N}_]+)/u);
  const pl=lines.find(l=>l.startsWith(FP));
  const path=pl?pl.slice(FP.length).trim():(ht?ht[1].replace(/_/g,' '):'');
  const last=lines.length>1?lines[lines.length-1]:'';
  let name,mime,sz,fid;
  if(d){fid=d.fileId;name=last||d.fileName||'файл';mime=mimeOf(d.mimeType,name);sz=d.fileSize||0}
  else{fid=ph.fileId;name=last||('Фото '+m.id+'.jpg');mime='image/jpeg';sz=ph.fileSize||0}
  let enc=false,encName='';if(last.startsWith('🔐')){enc=true;encName=last.slice(2).trim();name='🔐 зашифровано';mime='application/octet-stream'}
  const dt=m.date instanceof Date?m.date.getTime():(m.date>1e11?m.date:m.date*1000);
  return{id:m.id,fid,no:mt?+mt[1]:0,name,mime,size:sz,date:dt||Date.now(),path,enc,encName,repo:(lines.find(l=>l.startsWith(RP))||'').slice(RP.length).trim()};
}

/* ---- перемешивание ----
   Настоящая «колода»: все треки очереди выстраиваются в случайном порядке один раз, и играют по этому порядку —
   пока не прозвучат все, ни один не повторяется. Когда колода кончилась: при «Повтор: все» тасуется новая
   (первый трек новой колоды не равен последнему прошлой), иначе воспроизведение останавливается. */
function shufOrder(len,first,rnd=Math.random,keys=null,prevKey=null){
  if(keys&&keys.length===len&&len>1)return keyOrder(len,first,rnd,keys,prevKey);
  const a=[];for(let i=0;i<len;i++)if(i!==first)a.push(i);
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return first>=0&&first<len?[first,...a]:a;
}
/* Перемешивание без повторов исполнителя подряд: из оставшихся берём случайный трек, у которого исполнитель
   отличается от предыдущего. Если таких не осталось (один исполнитель доминирует) — берём любой. Треки без
   распознанного исполнителя ограничений не имеют. */
const sameArt=(a,b)=>!!a&&a===b;
function keyOrder(len,first,rnd,keys,prevKey){
  const hasF=first>=0&&first<len;
  const once=()=>{
    const left=[];for(let i=0;i<len;i++)if(i!==first)left.push(i);
    const out=hasF?[first]:[];let last=hasF?keys[first]:prevKey;
    while(left.length){
      let k=-1;
      for(let t=0;t<30;t++){const c=Math.floor(rnd()*left.length);if(!sameArt(last,keys[left[c]])){k=c;break}}
      if(k<0){const ok=[];for(let c=0;c<left.length;c++)if(!sameArt(last,keys[left[c]]))ok.push(c);k=ok.length?ok[Math.floor(rnd()*ok.length)]:Math.floor(rnd()*left.length)}
      const i=left[k];left[k]=left[left.length-1];left.pop();
      out.push(i);last=keys[i];
    }
    return out;
  };
  /* несколько попыток: берём колоду без совпадений исполнителя подряд; если без них не вышло — с наименьшим числом */
  let best=null,bestBad=Infinity;
  for(let a=0;a<12;a++){
    const o=once();let bad=0;
    for(let i=1;i<o.length;i++)if(sameArt(keys[o[i]],keys[o[i-1]]))bad++;
    if(bad<bestBad){best=o;bestBad=bad}
    if(!bad)break;
  }
  return best;
}
/* sh={o:[порядок],p:позиция,len}: подгоняем под трек i, который сейчас включили (следующий, предыдущий или любой другой) */
function shSync(sh,i,len,rnd=Math.random){
  if(sh.len===len&&sh.o[sh.p]===i)return;
  if(sh.len===len&&sh.o[sh.p+1]===i){sh.p++;return}
  if(sh.len===len&&sh.p>0&&sh.o[sh.p-1]===i){sh.p--;return}
  sh.len=len;sh.o=shufOrder(len,i,rnd,ARTK);sh.p=0;
}
/* Какие треки идут следом (индексы в очереди). sh изменяется на месте. */
function aheadIdx(pi,len,shuf,repm,sh,n,rnd=Math.random){
  if(pi<0||len<1)return[];
  if(shuf&&len>1){
    shSync(sh,pi,len,rnd);
    if(repm===1)while(sh.o.length-sh.p-1<n){
      const last=sh.o[sh.o.length-1],a=shufOrder(len,-1,rnd,ARTK,ARTK?ARTK[last]:null);
      if(!ARTK&&a[0]===last)[a[0],a[1]]=[a[1],a[0]];
      sh.o.push(...a);
    }
    if(sh.p>2*len){sh.o.splice(0,len);sh.p-=len}
    return sh.o.slice(sh.p+1,sh.p+1+n);
  }
  const out=[];
  for(let j=1;j<=n;j++){const k=pi+j;if(k<len)out.push(k);else if(repm===1){const w=k%len;if(w!==pi&&!out.includes(w))out.push(w)}else break}
  if(!out.length&&repm===1&&len===1)out.push(0);
  return out;
}

const $=s=>document.querySelector(s);
const ld=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const cvK=id=>id;
let S=ld('tgm',{});if(S.main&&S.chat&&S.chat!==S.main){S.chat=S.main;sv('tgm',S)}  /* раньше приложение могло остаться внутри директории: возвращаем в основной канал */
let files=[],folders=[],cur='',openId=null,ready=false,showSetup=true;
let lib,client,pid;
