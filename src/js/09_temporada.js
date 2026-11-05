// ===== Temporada (30 dias, 30 prêmios), JOGAR! (partida rápida), adversários "de verdade" e o fim de partida animado =====

// ---------- bots do Médio um pouquinho mais fáceis (mira menos certeira, reagem e atiram um tiquinho menos) ----------
Object.assign(BOTCFG.normal,{jit:.3,range:340,dash:.006,react:.3,fire:.85,spd:.95,dmg:.88});

// ---------- 100 adversários com cara de jogador: apelido, pelo, chapéu, roupa, pelagem e olhos próprios ----------
const BOT_NICKS=['Pedrinho_BR','LuaGamer','Kaique07','Thaly.exe','Rafinha_Z','GabiCapy','MatheusFPS','JuuBear','DaviPro','Lele_22',
  'NandoXD','Bia_Lagoa','CaioTurbo','Duda.mp4','Enzo_Kill','Maju_Ofc','Gui_Sniper','Leticia9','VitinhoGG','Ana_Clara',
  'Joaozinho','Mel_Fofa','Arthur_Rei','Yasmin.ttv','Brunao_99','Lari_Play','Kauã_Zika','Clarinha','Heitor_BR','Sofia_Uwu',
  'TheoMaster','Isa_Gamer','Lucca_FF','Nicole.zip','Breno_Top','Valen_tina','Murilo_7','Helo_Capy','PH_Monstro','Alice_Rush',
  'Samuca','Manu_Star','Igor_Ninja','Rebeca_GG','Otavio.dev','Lívia_BR','Danzinho','Cecília_08','Rodrigo_TV','Aninha_Pro',
  'Fefe_Cap','Joao_Vitor','Lorena_X','Kevin_Bala','Bela_Moon','Tiago_Lag','Marina_Uau','Caique_Z','Pietra_7','GuhRibeiro',
  'Nath_Fps','Vini_Raio','Laura_Lol','Cadu_Sz','Bruna.exe','Ruan_Speed','Mari_Capy','Dudu_Boom','Giovana_9','Lipe_Ofc',
  'Tati_Gamer','Erick_Mito','Julia_Rush','Zeca_Pagod','Lara_Zen','Andre_Tank','Helena_GG','Fabinho','Sarah_Star','Breninho',
  'Ju_Lagoa','Wesley_FF','Bianca_Uwu','Leo_Caos','Paulinha','Hugo_Mira','Carol_Top','Tom_Capy','Dani_Rose','Junin_Zika',
  'Malu_Play','Edu_Ninja','Priscila_7','Gustavo.tv','Nina_Boom','Raul_Sniper','Vivi_Capy','Fred_Lag','Lia_Moon','Capi_Lendas'];
function botProfile(i){const R=mulberry(9173+i*7919),pk=a=>a[Math.floor(R()*a.length)];
  const furs=[...FURS.map(f=>f[0]),...RFURS.map(f=>f[0]),...SHOP.find(s=>s[0]==='cores')[3].map(c=>c[1])];
  const L=defaultLook(Math.floor(R()*PRESETS.length));L.body=pk(furs);L.hat=R()<.62?'cartola':'none';
  const roupas=SHOP.find(s=>s[0]==='roupas')[3],pat=R()<.45?0:1+Math.floor(R()*6),out=R()<.35?0:1+Math.floor(R()*6);
  return{name:BOT_NICKS[i%BOT_NICKS.length],look:cleanLook(L),sty:{pat,patC:'#2A1A12',out,outC:out?roupas[out-1][1]:'#FF4F9A',fx:R()<.08?'neon':'',sk:R()<.2?1+Math.floor(R()*5):0},eye:{t:Math.floor(R()*6),b:Math.floor(R()*5),c:pk(Map3D.EYECOLS)}}}
function disguiseBots(){const pool=[...Array(BOT_NICKS.length).keys()].sort(()=>Math.random()-.5);let j=0;
  for(const p of Object.values(players))if(p.bot){const pr=botProfile(pool[j++]);p.name=pr.name;p.look=pr.look;p.sty=pr.sty;p.eye=pr.eye;p.fake=1}}

// ---------- JOGAR! = partida rápida: procura, encontra e entra com 10 capivaras (você + 9) ----------
let QUICK=null,qT=0,qClock=0;
function quickEnd(){if(QUICK){Object.assign(cfg,QUICK.prev);QUICK=null}}
function quickPlay(){if(mlBusy||qT)return;Sound.play('boing');if(!QUICK)QUICK={prev:JSON.parse(JSON.stringify(cfg))};
  Object.assign(cfg,{mode:pick(MODES).id,map:pick(MAPS).id,bots:MAX_PLAYERS-1,diff:'normal',time:180});
  showLoad('quick');const el=$('mload');el.classList.add('searching');el.classList.remove('found');
  $('mlKind').textContent='PARTIDA RÁPIDA';$('mlTitle').textContent='PROCURANDO PARTIDA';const t0=performance.now();
  let cb=$('mlCancel');if(!cb){cb=document.createElement('button');cb.id='mlCancel';cb.className='ml-cancel';cb.textContent='CANCELAR';el.querySelector('.ml-top').appendChild(cb)}
  cb.onclick=()=>{clearTimeout(qT);clearInterval(qClock);qT=0;el.classList.remove('searching','found');hideLoad();quickEnd();Sound.play('click')};
  const tick=()=>{const s=Math.floor((performance.now()-t0)/1000);$('mlMap').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} • procurando capivaras na sua região`};tick();clearInterval(qClock);qClock=setInterval(tick,500);
  qT=setTimeout(()=>{clearInterval(qClock);qT=0;const md=modeById(cfg.mode),mp=mapById(cfg.map);el.classList.remove('searching');el.classList.add('found');Sound.play('yes');
    $('mlKind').textContent='PARTIDA ENCONTRADA!';$('mlTitle').textContent=md.n.toUpperCase();$('mlMap').textContent=`${mp.n} • ${MAX_PLAYERS} capivaras`;
    setTimeout(()=>{el.classList.remove('found');matchLoad('quick')},1300)},2400+Math.random()*2600)}

// ---------- TEMPORADA: 30 dias a partir de 05/11/2026, 30 níveis, um prêmio por nível ----------
const SEA_START=Date.parse('2026-11-05T00:00:00-03:00'),SEA_LEN=30*864e5;
const seaId=()=>Math.max(1,Math.floor((Date.now()-SEA_START)/SEA_LEN)+1),seaEnd=()=>SEA_START+seaId()*SEA_LEN;
const SEA_NAMES=['Capivaras do Caos','Verão na Lagoa','Noite Neon','Festa das Laranjas'];
const seaName=()=>SEA_NAMES[(seaId()-1)%SEA_NAMES.length];
const SEA_REW=[{t:'or',n:150},{t:'item',id:'rc:0'},{t:'tr',n:5},{t:'item',id:'roupas:0'},{t:'or',n:250},{t:'item',id:'tt:0'},{t:'item',id:'estilos:2'},{t:'item',id:'rw:0'},{t:'tr',n:10},{t:'item',id:'quadros:3'},
  {t:'or',n:300},{t:'item',id:'rc:5'},{t:'item',id:'pelos:1'},{t:'xp',n:300},{t:'item',id:'roupas:1'},{t:'tr',n:15},{t:'item',id:'rw:3'},{t:'item',id:'estilos:4'},{t:'or',n:500},{t:'item',id:'pelos:5'},
  {t:'item',id:'rc:10'},{t:'item',id:'tt:8'},{t:'item',id:'fundos:2'},{t:'tr',n:20},{t:'item',id:'roupas:4'},{t:'or',n:800},{t:'item',id:'estilos:1'},{t:'tr',n:30},{t:'item',id:'quadros:0'},{t:'item',id:'estilos:3'}];
const SEA_BIG=[10,20,30];
const seaNeed=l=>100+8*(l-1); // XP para completar o nível l
function seaState(){let s=store.get('season',null);if(!s||s.id!==seaId())s={id:seaId(),xp:0};return s}
function seaInfo(xp){let lv=0,acc=0;while(lv<30&&xp>=acc+seaNeed(lv+1)){acc+=seaNeed(lv+1);lv++}return{lv,cur:xp-acc,need:lv<30?seaNeed(lv+1):1,max:lv>=30}}
function seaLeft(){const ms=Math.max(0,seaEnd()-Date.now()),d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5);return d>0?`${d}d ${h}h`:`${h}h ${Math.floor(ms%36e5/6e4)}min`}
// adiciona XP e entrega os prêmios dos níveis completados
function seaAdd(xp){const s=seaState(),a=seaInfo(s.xp);s.xp+=xp;const b=seaInfo(s.xp),ups=[];for(let l=a.lv+1;l<=b.lv;l++)ups.push({lv:l,rw:grant(Object.assign({},SEA_REW[l-1]))});store.set('season',s);return{from:a,to:b,ups,xp0:s.xp-xp,xp1:s.xp}}
// miniatura de um prêmio (cor, quadro, lagoa, roupa, efeito...)
function rwThumb(rw){const sw=bg=>`<i class="rw-sw" style="background:${bg}"></i>`;
  if(rw.t==='or')return`<span class="rw-ic or">${I('orange')}</span>`;if(rw.t==='tr')return`<span class="rw-ic tr">${I('trophy')}</span>`;if(rw.t==='xp')return`<span class="rw-ic xp">${I('star')}</span>`;
  const [k,i]=rw.id.split(':'),n=+i,cat=SHOP.find(s=>s[0]===k);
  if(k==='rc')return sw(RFURS[n][0]);if(k==='rw'){const c=RWATERS[n][1];return sw(`radial-gradient(ellipse at 50% 60%,${c[0]},${c[1]} 70%,${c[3]})`)}
  if(k==='tt')return`<span class="rw-ic tt">${I('crown')}</span>`;
  if(k==='quadros')return`<i class="rw-sw art" style="background-image:url(loading/${cat[3][n][1]}_p.jpg?v=${ASSETV})"></i>`;
  if(k==='fundos'){const c=SHOPWATERS[n];return sw(`radial-gradient(ellipse at 50% 60%,${c[0]},${c[1]} 70%,${c[3]})`)}
  if(k==='cores')return sw(cat[3][n][1]);if(k==='roupas')return`<span class="rw-ic" style="color:${cat[3][n][1]}">${I('shirt')}</span>`;
  if(k==='pelos')return sw(cat[3][n][1]);if(k==='estilos')return`<i class="rw-sw glow" style="background:${cat[3][n][1]}"></i>`;return`<span class="rw-ic">${I('gift')}</span>`}
function rwTitle(rw){return rw.t==='item'?itemName(rw.id):rewardText(rw)}
// cartão da temporada na tela inicial
function seaCardRender(){const s=seaState(),f=seaInfo(s.xp);$('seaHead').textContent=`TEMPORADA ${s.id} • termina em ${seaLeft()}`;$('seaLv').textContent=f.lv;
  $('seaFill').style.width=(f.max?100:f.cur/f.need*100)+'%';$('seaName').textContent=f.max?'Temporada completa!':`${f.cur}/${f.need} XP • ${rwTitle(SEA_REW[f.lv])}`}
// tela da temporada: todos os prêmios (desbloqueados, o próximo e os futuros)
function seaRender(){const s=seaState(),f=seaInfo(s.xp);
  $('tsTop').innerHTML=`<div class="ts-hex"><small>NÍVEL</small><b>${f.lv}</b></div><div class="ts-info"><small>TEMPORADA ${s.id} • ${escapeHtml(seaName())}</small>
      <div class="m-bar ts-bar"><i style="width:${f.max?100:f.cur/f.need*100}%"></i><span>${f.max?'Completa!':`${f.cur} / ${f.need} XP`}</span></div>
      <p>Termina em <b>${seaLeft()}</b> • ${f.lv}/30 prêmios desbloqueados</p></div>`;
  $('tsHow').innerHTML=[['flag','Terminar partida','+25'],['crown','Vitória','+35'],['skull','Cada eliminação','+5 (até 15)'],['bolt','Double / Triple kill','+6 / +12'],['heart','Morrer pouco','até +20']].map(([ic,t,v])=>`<span>${I(ic)}${t}<b>${v}</b></span>`).join('');
  $('tsGrid').innerHTML=SEA_REW.map((rw,i)=>{const l=i+1,st=f.lv>=l?'got':l===f.lv+1?'next':'lock';
    return`<div class="ts-rw ${st}${SEA_BIG.includes(l)?' big':''}"><em>${l}</em><div class="ts-th">${rwThumb(rw)}</div><b>${escapeHtml(rwTitle(rw))}</b><span>${st==='got'?I('check')+'Desbloqueado':st==='next'?`Faltam ${f.need-f.cur} XP`:I('lock')+'Nível '+l}</span></div>`}).join('');
  const nx=$('tsGrid').querySelector('.next');if(nx)nx.scrollIntoView({block:'nearest'})}

// ---------- XP da partida: terminar, colocação, eliminações, morrer pouco, multi-kills ----------
const SM={d:0,t:0,m:0};function seaReset(){SM.d=SM.t=SM.m=0}
function seaMulti(n){if(n===2)SM.d++;else if(n===3)SM.t++;else if(n>=4)SM.m++}
function matchXP(me,place,won,n){const L=[],add=(t,v)=>{if(v>0)L.push([t,v])};if(!me)return L;
  add('Partida finalizada',25);
  if(won)add('Vitória!',35);else if(place===2)add('2º lugar',24);else if(place===3)add('3º lugar',16);else if(place<=Math.ceil(n/2))add('Metade de cima',8);
  const k=me.kills||0,d=me.deaths||0;add(k+(k===1?' eliminação':' eliminações'),Math.min(k,15)*5);
  if(d===0)add('Sem morrer nenhuma vez!',20);else if(d<=2)add('Morreu pouco',10);else if(d<=4)add('Sobreviveu bem',4);
  add('Double kill'+(SM.d>1?' ×'+SM.d:''),Math.min(SM.d,4)*6);add('Triple kill'+(SM.t>1?' ×'+SM.t:''),Math.min(SM.t,3)*12);add('Multi kill'+(SM.m>1?' ×'+SM.m:''),Math.min(SM.m,2)*20);
  if((me.best||0)>=3)add('Sequência de '+me.best,Math.min(me.best,10)*2);
  // teto: uma partida rende no máximo 2 níveis da temporada (se passar, todas as linhas encolhem na mesma proporção)
  const cap=seaCap(),tot=L.reduce((a,l)=>a+l[1],0);if(tot>cap){const vals=L.map(l=>Math.floor(l[1]*cap/tot));let left=cap-vals.reduce((a,v)=>a+v,0);for(let i=0;left>0;i=(i+1)%vals.length){vals[i]++;left--}L.forEach((l,i)=>l[1]=vals[i])}
  return L.filter(l=>l[1]>0)}
// XP que falta para subir exatamente 2 níveis a partir de agora (ou até o fim da temporada)
function seaCap(){const x=seaState().xp,a=seaInfo(x);let need=a.need-a.cur;if(a.lv+1<30)need+=seaNeed(a.lv+2);return a.max?0:need}

// ---------- fim de partida: suspense → pódio (top 3) → barra da temporada ----------
let ES=null;
function esPortrait(cv,p){drawPortrait(cv,p.look,{bg:false,full:true,bot:p.bot&&!p.fake,styObj:p.fake&&p.sty?Object.assign({},p.sty,{eye:p.eye}):null,self:p.id===self})}
function endSeq(o){const el=$('endSeq');if(!el)return;ES=Object.assign({phase:0,t:[]},o);clearTimeout(ES.tm);el.classList.remove('hidden');document.body.classList.add('endseq');
  const n=o.list.length;ES.lines=matchXP(o.me,o.place,o.won,n);ES.xp=ES.lines.reduce((a,l)=>a+l[1],0);ES.res=seaAdd(ES.xp);
  esSuspense()}
function esSuspense(){const o=ES,st=$('esStage');const tw=o.tw;const win=tw>=0?'TIME '+TEAM[tw].n.toUpperCase():tw===-2?'EMPATE!':(o.list[0]?o.list[0].name:'???');
  st.innerHTML=`<div class="es-sus"><div class="es-spot"></div><div class="es-title">FIM DE PARTIDA!</div><div class="es-q">E o grande vencedor é…</div>
    <div class="es-roll"><b id="esRoll">???</b></div><div class="es-drum"><i></i><i></i><i></i></div><button class="es-tap" id="esTap">TOQUE PARA REVELAR</button></div>`;
  const names=o.list.map(p=>p.name);let i=0,delay=60,done=false;const roll=()=>{if(done||!$('esRoll'))return;$('esRoll').textContent=names[i++%names.length]||'???';Sound.play('tick');delay*=1.09;if(delay<380)ES.rt=setTimeout(roll,delay);else reveal()};
  const reveal=()=>{if(done||!$('esRoll'))return;done=true;clearTimeout(ES.rt);const r=$('esRoll');r.textContent=win;r.parentNode.classList.add('win');$('esTap').classList.add('gone');
    st.querySelector('.es-sus').classList.add('revealed');Sound.play('win');celebrate(o.won?180:90);ES.tm=setTimeout(esPodium,1700)};
  roll();$('esTap').onclick=reveal;st.querySelector('.es-sus').onclick=e=>{if(e.target.id!=='esTap')reveal()}}
function esPodium(){const o=ES,st=$('esStage'),top=o.list.slice(0,3),me=o.me;
  const slot=(p,i)=>p?`<div class="es-slot s${i+1}"><canvas width="240" height="264"></canvas><div class="es-nm">${i===0?I('crown'):''}${escapeHtml(p.name)}${p.id===self?' <small>(você)</small>':''}</div><div class="es-blk"><b>${i+1}º</b><small>${escapeHtml(scoreLabel(p))}</small></div></div>`:'<div class="es-slot empty"></div>';
  st.innerHTML=`<div class="es-pod"><h2>RANKING DA PARTIDA</h2><div class="es-podium">${slot(top[1],1)}${slot(top[0],0)}${slot(top[2],2)}</div>
    <div class="es-you"><span>Você: <b>${o.place}º</b></span><span>${I('skull')}<b>${me?me.kills:0}</b> elim.</span><span>${I('heart')}<b>${me?me.deaths:0}</b> mortes</span><span>${I('flame')}<b>${me?me.best||0:0}</b> sequência</span></div>
    <button class="m-play sm es-btn" id="esNext"><b>CONTINUAR</b></button></div>`;
  st.querySelectorAll('.es-slot canvas').forEach((cv,k)=>{const p=[top[1],top[0],top[2]][k];if(p)esPortrait(cv,p)});Sound.play('pop');
  $('esNext').onclick=()=>{Sound.play('click');clearTimeout(ES.tm);esSeason()};ES.tm=setTimeout(esSeason,7000)}
function esSeason(){const o=ES,st=$('esStage'),r=o.res,s=seaState();
  st.innerHTML=`<div class="es-sea"><div class="es-seahead"><small>TEMPORADA ${s.id} • ${escapeHtml(seaName())}</small><div class="es-lvrow"><div class="ts-hex"><small>NÍVEL</small><b id="esLv">${r.from.lv}</b></div>
      <div class="es-barw"><div class="m-bar es-bar"><i id="esFill"></i><span id="esXp"></span></div><div class="es-gain">+<b id="esGain">0</b> XP</div></div></div></div>
    <div class="es-mid" id="esMid"><ul class="es-lines" id="esLines"></ul><div class="es-unlock hidden" id="esUnlock"></div></div>
    <div class="es-btns">${solo?`<button class="m-btn2" id="esMenu">${I('home')}MENU</button><button class="m-play sm" id="esAgain"><b>JOGAR DE NOVO</b></button>`:`<button class="m-play sm" id="esCont"><b>CONTINUAR</b></button>`}</div></div>`;
  const fill=$('esFill'),xpT=$('esXp'),lvT=$('esLv');let shown=r.xp0,lv=r.from.lv;const draw=()=>{const f=seaInfo(shown);fill.style.width=(f.max?100:f.cur/f.need*100)+'%';xpT.textContent=f.max?'Temporada completa!':`${f.cur} / ${f.need} XP`;
    if(f.lv!==lv){lv=f.lv;lvT.textContent=lv;lvT.parentNode.classList.remove('pop');void lvT.offsetWidth;lvT.parentNode.classList.add('pop');const up=r.ups.find(u=>u.lv===lv);if(up)esUnlock(up)}};draw();
  // cada motivo aparece em sequência e a barra corre junto
  let li=0,gain=0;const next=()=>{if(ES!==o||li>=o.lines.length)return;const [t,v]=o.lines[li++],ul=$('esLines');if(!ul)return;ul.insertAdjacentHTML('beforeend',`<li><span>${escapeHtml(t)}</span><b>+${v}</b></li>`);const mid=$('esMid');if(mid)mid.scrollTop=mid.scrollHeight;Sound.play('gem',li);
    const from=shown,to=shown+v,t0=performance.now();const run=()=>{if(ES!==o||!$('esFill'))return;const k=Math.min(1,(performance.now()-t0)/520);shown=Math.round(from+(to-from)*k);const eg=$('esGain');if(eg)eg.textContent=gain+Math.round(v*k);draw();if(k<1)requestAnimationFrame(run);else{gain+=v;ES.tm=setTimeout(next,260)}};run()};
  ES.tm=setTimeout(next,500);
  if(solo){$('esMenu').onclick=()=>{esClose();Sound.play('click');goHome()};$('esAgain').onclick=()=>{esClose();if(QUICK){goHome();setTimeout(quickPlay,60)}else{goHome();setTimeout(playNow,60)}}}
  else $('esCont').onclick=()=>{Sound.play('click');esClose()}}
function esUnlock(up){const el=$('esUnlock');if(!el)return;el.classList.remove('hidden');Sound.play('level');celebrate(60);
  el.insertAdjacentHTML('beforeend',`<div class="es-uc"><small>NÍVEL ${up.lv} • DESBLOQUEADO!</small><div class="ts-th">${rwThumb(up.rw)}</div><b>${escapeHtml(rwTitle(up.rw))}</b></div>`);const mid=$('esMid');if(mid)setTimeout(()=>{mid.scrollTop=mid.scrollHeight},30)}
function esClose(){clearTimeout(ES&&ES.tm);clearTimeout(ES&&ES.rt);$('endSeq').classList.add('hidden');document.body.classList.remove('endseq');ES=null}

$('seaCard').onclick=()=>{Sound.play('click');go('temporada')};
setInterval(()=>{if(view==='home')seaCardRender();if(view==='temporada')seaRender()},60000);
seaCardRender();
