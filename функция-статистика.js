/* ===== ФАЙЛ функция-статистика.js =====
   
   Функция: статистика по пользователям (только владелец).
   Часть приложения «Облачко»: все функции и переменные общие с другими файлами (глобальные).
   Порядок загрузки — в модули.js. Подробности — ДОКУМЕНТАЦИЯ_Облачко.txt, раздел 17.
   ===== */
/* ---- Статистика (только для владельца) ----
   По каждому пользователю: сколько репозиториев, сколько в них файлов и места, когда был последний вход.
   Вход берётся из журнала действий; если журнал зашифрован, сначала нужен мастер-пароль. */
const stPl=(n,a)=>{const m=n%100,k=n%10;return n+' '+(m>10&&m<15?a[2]:k===1?a[0]:k>1&&k<5?a[1]:a[2])};
function stWhen(t){
  const d=new Date(t),n=new Date(),hm=d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});
  const day=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime(),diff=Math.round((day(n)-day(d))/864e5);
  if(diff===0)return 'сегодня, '+hm;if(diff===1)return 'вчера, '+hm;
  return d.toLocaleDateString('ru',{day:'numeric',month:'long',year:d.getFullYear()===n.getFullYear()?undefined:'numeric'})+', '+hm;
}
async function openStats(){
  if(!isAdmin())return;
  openAdm('Статистика');
  drawStats();
}
function drawStats(){
  if(!isAdmin())return;
  const locked=!!(ownkey&&!OWNPRIV&&JENC.length),all=[...JOUR,...JQ],last=new Map(),act=new Map();
  for(const e of all){
    if(e.a==='login'&&e.t>(last.get(e.u)||0))last.set(e.u,e.t);
    if(e.t>(act.get(e.u)||0))act.set(e.u,e.t);
  }
  const calc=(rs,root)=>{
    const rows=[];
    for(const[r,n]of[...(root?[['','Облако']]:[]),...rs.map(x=>[x.name,x.name])]){
      const fl=files.filter(f=>(f.repo||'')===r);
      rows.push({n,c:fl.length,sz:fl.reduce((a,f)=>a+(f.size||0),0)});
    }
    return{rows,rc:rs.length+(root?1:0),fc:rows.reduce((a,r)=>a+r.c,0),sz:rows.reduce((a,r)=>a+r.sz,0)};
  };
  const own=calc(repos.filter(x=>!x.guest),true);
  const list=users.map(u=>({u:u.u,...calc(repos.filter(x=>x.guest&&x.owner===u.u),false),lg:last.get(u.u)||0,ac:act.get(u.u)||0}));
  list.sort((a,b)=>(b.lg||b.ac)-(a.lg||a.ac)||a.u.localeCompare(b.u,'ru'));
  const tot={rc:own.rc+list.reduce((a,x)=>a+x.rc,0),fc:own.fc+list.reduce((a,x)=>a+x.fc,0)};
  const card=(name,x,when)=>`<div class="uc stc"><div class="sh"><b>${esc(name)}</b>${when?`<span>${when}</span>`:''}</div>
    <div class="sn"><span><i>${x.rc}</i> ${stPl(x.rc,['репозиторий','репозитория','репозиториев']).replace(/^\d+ /,'')}</span><span><i>${x.fc}</i> ${stPl(x.fc,['файл','файла','файлов']).replace(/^\d+ /,'')}</span>${x.sz?`<span><i>${size(x.sz)}</i></span>`:''}</div>
    ${x.rows.map(r=>`<div class="sl"><span>${esc(r.n)}</span><span>${stPl(r.c,['файл','файла','файлов'])}${r.sz?' · '+size(r.sz):''}</span></div>`).join('')}</div>`;
  let h=`<div style="padding:10px 14px"><div class="sg"><div><b>${users.length}</b><span>пользователей</span></div><div><b>${tot.rc}</b><span>репозиториев</span></div><div><b>${tot.fc}</b><span>файлов</span></div></div>`;
  if(locked)h+='<div class="uc"><div class="us">Время входа скрыто: журнал зашифрован.</div><div class="row"><button class="p" id="stun">Ввести мастер-пароль</button></div></div>';
  h+=card('Владелец',own,'');
  for(const x of list){
    const when=x.lg?'вход: '+stWhen(x.lg):x.ac?'активность: '+stWhen(x.ac):(locked?'':'входов не было');
    h+=card(x.u,x,when);
  }
  if(!list.length)h+='<div class="empty">Пользователей пока нет</div>';
  $('#admb').innerHTML=h+'</div>';
}
$('#admb').addEventListener('click',async e=>{
  if(e.target.id==='stun'&&await unlockOwner())drawStats();
});

