/* ===== ФАЙЛ расширение-музыка-из-чата.js =====
   
   Дополнение к расширению «Музыка из чата» (скачивание плейлистом): красивый выбор «Куда скачивать».
   Само скачивание — в защищённом ядро-05-музыка-ЗАЩИЩЕНО.js, оно не менялось.
   Использует из расширение-твоя-волна.js: shTreeSvg, shRepoCounts (поэтому в модули.js этот файл стоит ПОСЛЕ него).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ===== ВЫБОР «КУДА СКАЧИВАТЬ» для расширения «Музыка из чата» (mp*) =====
   Тот же вид, что у «Откуда играть»: дерево «облако → пользователи → репозитории», затем папки репозитория с галочками.
   Отличия: место одно (галочка как «радио»), в любую папку можно добавить «Новую папку» (для нового плейлиста),
   пустые папки видны. Результат пишется в MS.repo / MS.folder / MS.folderOk — их читает защищённый код скачивания,
   сам он НЕ менялся: кнопку «Куда» перехватывает слушатель ниже (в защищённом файле остаётся запасной старый выбор). */
addCss('mp',`
  .swck.mp{border-radius:50%}
  .swck.mp .i{width:15px;height:15px}
  .mpnew{color:var(--acc);font-weight:600;font-size:14.5px}
  .mpnew .i{width:20px;height:20px;flex:none}
  .mpsel{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:color-mix(in srgb,var(--acc) 12%,var(--card));border:1px solid color-mix(in srgb,var(--acc) 40%,transparent);font-size:14px;word-break:break-word}
  .mpsel .i{width:18px;height:18px;flex:none;color:var(--acc)}
  .swb:disabled{opacity:.4}
`);
const MP={r:null,open:new Set(),sel:null,news:[]};
const mpKids=(r,p)=>{const s=new Set(kpKids(r,p));for(const n of MP.news)if(n.r===r&&parentPath(n.p)===p)s.add(n.p);return[...s].sort((a,b)=>a.localeCompare(b,'ru'))};
const mpIs=(r,p)=>!!MP.sel&&MP.sel.r===r&&MP.sel.p===p;
const mpCap=()=>MP.sel?`<div class="mpsel">${icon('check')}<span>Сюда скачаю: <b>${esc(kpName(MP.sel.r,MP.sel.p))}</b>${allPaths(MP.sel.r).includes(MP.sel.p)||!MP.sel.p?'':' (папка будет создана)'}</span></div>`:'<div class="swn2 swinfo">Нажмите на репозиторий в дереве, затем отметьте папку.</div>';
function mpPaint(){
  const inRepo=MP.r!==null;
  let h=`<div class="sw"><div class="swtop"><button class="swb ghost" data-mpback>${icon('back')}${inRepo?'Дерево':'Назад'}</button><button class="swb acc" data-mpdone ${MP.sel?'':'disabled'}>Готово</button></div>`;
  if(!inRepo){
    h+=`<div class="swh2">Куда скачивать</div>${shTreeSvg('data-mprepo',r=>!!MP.sel&&MP.sel.r===r)}${mpCap()}`;
  }else{
    const r=MP.r,cnt=shRepoCounts(r);
    h+=`<div class="swh2">${esc(r||'Облако')}</div>`;
    const ck=on=>`<span class="swck mp${on?' on':''}">${on?icon('check'):''}</span>`;
    h+=`<button class="swr swrb" data-mpck="">${ck(mpIs(r,''))}<span class="swt"><span class="swn1">Весь репозиторий</span></span><span class="swc2">${cnt.get('')||0}</span></button>`;
    h+=`<button class="swr mpnew" data-mpnew="">${icon('folderplus')}<span class="swt"><span class="swn1">Новая папка</span></span></button>`;
    const walk=(p,d)=>{
      for(const x of mpKids(r,p)){
        const c=cnt.get(x)||0,lk=isLocked(r,x),open=MP.open.has(x)&&!lk,on=mpIs(r,x);
        h+=`<div class="swr tr" style="padding-left:${d*18}px"><button class="swckb" data-mpck="${esc(x)}" aria-label="Выбрать">${ck(on)}</button><button class="swt" data-mpopen="${esc(x)}"><span class="swn1">${esc(base(x))}</span>${lk?`<span class="swbd">${icon('lock')}запаролена</span>`:''}</button>${c?`<span class="swc2">${c}</span>`:''}<button class="swchev${open?' op':''}" data-mpopen="${esc(x)}" aria-label="Раскрыть">${icon('down')}</button></div>`;
        if(open){
          h+=`<button class="swr mpnew" style="padding-left:${(d+1)*18}px" data-mpnew="${esc(x)}">${icon('folderplus')}<span class="swt"><span class="swn1">Новая папка</span></span></button>`;
          walk(x,d+1);
        }
      }
    };
    walk('',0);
    h+=mpCap();
  }
  $('#admb').innerHTML=h+'</div>';
}
function mpOpen(){
  MP.r=null;MP.open=new Set();MP.news=[];
  MP.sel=MS.folderOk?{r:MS.repo||'',p:MS.folder||''}:null;
  const q=$('#musq');if(q)q.hidden=true;
  mpPaint();
}
async function mpEnter(r){
  if(r&&repoRO(r)){say('Репозиторий только для чтения',1);return}
  try{
    if(!await unlock(r,''))return;
    if(r&&encOn(r)&&!KEYS[r]&&!await ensureKey(r))return;
    await decAll();
  }catch(x){say(err(x),1);return}
  MP.r=r;MP.open=new Set();
  if(MP.sel&&MP.sel.r===r){let a='';for(const sg of MP.sel.p?MP.sel.p.split('/'):[]){a=a?a+'/'+sg:sg;if(a!==MP.sel.p)MP.open.add(a)}}
  mpPaint();
}
async function mpSelect(r,p){
  try{if(isLocked(r,p)&&!await unlock(r,p))return}catch(x){say(err(x),1);return}
  MP.sel={r,p};mpPaint();
}
async function mpDone(){
  const s=MP.sel;if(!s)return;
  try{
    if(!await unlock(s.r,s.p))return;
    if(s.r&&encOn(s.r)&&!KEYS[s.r]&&!await ensureKey(s.r))return;
  }catch(x){say(err(x),1);return}
  MS.repo=s.r;MS.folder=s.p;MS.folderOk=true;msv();
  openMusic();
}
let mpBusy=false;
/* capture: срабатывает раньше старого обработчика кнопки «Куда» и не даёт ему открыть старое окно */
$('#admb').addEventListener('click',e=>{
  if(e.target.closest&&e.target.closest('#musto')){e.stopImmediatePropagation();e.preventDefault();mpOpen()}
},true);
$('#admb').addEventListener('click',async e=>{
  const t=e.target.closest&&e.target.closest('[data-mprepo],[data-mpback],[data-mpdone],[data-mpck],[data-mpopen],[data-mpnew]');if(!t||t.disabled)return;
  const d=t.dataset;
  if(d.mpback!==undefined){if(MP.r!==null){MP.r=null;mpPaint()}else openMusic();return}
  if(mpBusy)return;mpBusy=true;
  try{
    if(d.mpdone!==undefined)await mpDone();
    else if(d.mprepo!==undefined)await mpEnter(d.mprepo);
    else if(d.mpck!==undefined)await mpSelect(MP.r,d.mpck);
    else if(d.mpopen!==undefined){
      const p=d.mpopen,r=MP.r;
      if(MP.open.has(p)){MP.open.delete(p);mpPaint()}
      else{try{if(isLocked(r,p)&&!await unlock(r,p))return}catch(x){say(err(x),1);return}MP.open.add(p);mpPaint()}
    }
    else if(d.mpnew!==undefined){
      const p=d.mpnew,r=MP.r;
      const n=clean(String(await uiPrompt('Название новой папки','')||'')).trim();
      if(n){
        const np=p?p+'/'+n:n;
        if(!allPaths(r).includes(np)&&!MP.news.some(x=>x.r===r&&x.p===np))MP.news.push({r,p:np});
        if(p)MP.open.add(p);
        MP.sel={r,p:np};mpPaint();
      }
    }
  }catch(x){say(err(x),1)}finally{mpBusy=false}
});
