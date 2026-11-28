/* ===== ФАЙЛ ядро-06-выбор-папки-ЗАЩИЩЕНО.js =====
   
   ЗАЩИЩЕНО (зона 1): окно выбора репозитория и папки (kp*).
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ⛔ ЗАЩИЩЁННЫЙ КОД: переписан из исходного файла БЕЗ ИЗМЕНЕНИЙ. Не править без явного «да» владельца.
   ===== */
/* ---- Страница выбора репозитория и папки ----
   Всё на одной странице деревом: нажатие на строку выбирает репозиторий или папку, стрелка справа раскрывает вложенные.
   Запароленные помечены замком: и выбрать их, и раскрыть можно только после ввода пароля.
   Вложенные папки запароленной папки не видны, пока она не разблокирована. */
const KP={cb:null,cur:{r:null,p:''},open:new Set(),all:false,openU:new Set(),allowAll:false};
const kpOthers=()=>repos.filter(x=>visRepo(x)&&!mineRepo(x)&&!repoBlocked(x.name)&&!repoRO(x.name));
const kpName=(r,p)=>(r||'Облако')+(p?' › '+p.split('/').join(' › '):'');
const kpKids=(r,p)=>allPaths(r).filter(x=>parentPath(x)===p);
function kpOpen(cb,cur,opts){
  KP.cb=cb;KP.cur=cur||{r:null,p:''};KP.open=new Set();KP.allowAll=!!(opts&&opts.allowAll);KP.all=false;KP.openU=new Set();KP.confirm=!!(opts&&opts.confirm);KP.sel=null;
  if(KP.allowAll&&cur&&cur.r){const o=kpOthers().find(x=>x.name===cur.r);if(o){KP.all=true;KP.openU.add(o.owner||'')}}
  if(cur&&cur.r!==null){KP.open.add(cur.r+'\n');let a='';for(const sg of cur.p?cur.p.split('/'):[]){a=a?a+'/'+sg:sg;KP.open.add(cur.r+'\n'+a)}}
  $('#kpick').hidden=false;kpDraw();
}
function kpClose(){$('#kpick').hidden=true;KP.cb=null}
const kpBack=kpClose;
function kpDraw(){
  $('#kpt').textContent=KP.confirm?'Выберите папку':'Куда сохранять';const fsel=KP.confirm&&KP.sel;$('#kpf').hidden=!fsel;if(fsel)$('#kpok').textContent='Выбрать: '+kpName(KP.sel.r,KP.sel.p);
  const out=[],at=(r,p)=>`data-r="${esc(r)}" data-p="${esc(p)}"`;
  const row=(r,p,name,ic,d)=>{
    const open=KP.open.has(r+'\n'+p)&&!isLocked(r,p),lk=lockOf(r,p),on=KP.confirm?(!!KP.sel&&KP.sel.r===r&&KP.sel.p===p):(KP.cur.r===r&&KP.cur.p===p);
    out.push(`<div class="kr" style="padding-left:${d*16}px"><button class="ko" data-ks="1" ${at(r,p)}>${ic}<span class="n">${esc(name)}</span>${lk?`<span class="kb">${icon('lock')}${p?'Запаролена':'Запаролен'}</span>`:''}${on?`<span class="kb">${icon('check')}</span>`:''}</button><button class="kc${open?' op':''}" data-kx="1" ${at(r,p)} aria-label="Раскрыть">${icon('down')}</button></div>`);
    if(open){
      out.push(`<div class="kr kn" style="padding-left:${(d+1)*16}px"><button class="ko" data-knew="1" ${at(r,p)}>${icon('folderplus')}<span class="n">Новая папка</span></button></div>`);
      for(const x of kpKids(r,p))row(r,x,base(x),'<span>📁</span>',d+1);
    }
  };
  for(const[r,n]of[...(repoBlocked('')?[]:[['','Облако']]),...repos.filter(mineRepo).map(x=>[x.name,x.name])])row(r,'',n,icon(r?'repo':'cloud'),0);
  if(KP.allowAll){
    const oth=kpOthers();
    const owners=[...new Set(oth.map(x=>x.owner||''))].sort((a,b)=>a.localeCompare(b,'ru'));
    if(owners.length){
      if(KP.all)for(const u of owners){
        const op=KP.openU.has(u);
        out.push(`<div class="kr"><button class="ko" data-ku="${esc(u)}"><span>👤</span><span class="n">${esc(u||'Владелец')}</span><span class="kb">${op?'▾':'▸'}</span></button></div>`);
        if(op)for(const x of oth.filter(x=>(x.owner||'')===u))row(x.name,'',x.name,icon('repo'),1);
      }
      out.unshift(`<button class="kall${KP.all?' on':''}" data-kall="1">👥 ${KP.all?'Скрыть пользователей':'Выбрать всех пользователей'}</button>`);
    }
  }
  $('#kpb').innerHTML=out.join('');
}
async function kpPick(r,p){
  try{
    if(!await unlock(r,p))return;
    if(r&&encOn(r)&&!KEYS[r]&&!await ensureKey(r))return;
  }catch(x){say(err(x),1);return}
  const cb=KP.cb;kpClose();if(cb)cb(r,p);
}
$('#kpx').onclick=kpClose;
$('#kpok').onclick=()=>{const s=KP.sel;if(!s)return;KP.sel=null;kpPick(s.r,s.p)};
let kpBusy=false;
$('#kpb').addEventListener('click',async e=>{
  const g=a=>e.target.closest('['+a+']');
  const ab=g('data-kall'),ub=g('data-ku');
  if(ab){KP.all=!KP.all;if(KP.all)for(const x of kpOthers())KP.openU.add(x.owner||'');kpDraw();return}
  if(ub){const u=ub.dataset.ku;if(KP.openU.has(u))KP.openU.delete(u);else KP.openU.add(u);kpDraw();return}
  const sb=g('data-ks'),xb=g('data-kx'),nb=g('data-knew');
  const el=sb||xb||nb;if(!el||kpBusy)return;
  const r=el.dataset.r,p=el.dataset.p;
  kpBusy=true;
  try{
    if(sb){if(KP.confirm){KP.sel={r,p};kpDraw()}else await kpPick(r,p)}
    else if(xb){
      const k=r+'\n'+p;
      if(KP.open.has(k)&&!isLocked(r,p)){KP.open.delete(k);kpDraw()}
      else if(await unlock(r,p)){KP.open.add(k);kpDraw()}
    }
    else if(nb){
      const n=clean(String(await uiPrompt('Название новой папки','')||'')).trim();
      if(n){const np=p?p+'/'+n:n;if(KP.confirm){KP.sel={r,p:np};kpDraw()}else await kpPick(r,np)}
    }
  }finally{kpBusy=false}
});

