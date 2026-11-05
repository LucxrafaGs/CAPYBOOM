// ===== Conta do jogador (Supabase): cadastro, entrar, e progresso salvo na nuvem =====
// Tabela public.profiles (uma linha por conta): username, oranges (laranjas) e data (itens comprados, visual, troféus...).
// Sem conta, tudo continua só no navegador (como antes). Com conta, cada mudança é salva na nuvem alguns segundos depois,
// e ao entrar em outro aparelho o progresso vem junto. Na primeira vez, o progresso que já estava no navegador vai para a conta.
const SB_URL='https://cswuqdlxlguivvhzugyq.supabase.co',SB_KEY='sb_publishable_RVa9J--f2jg_XqPhVU5_sQ_Xs1a_hV3';
const SYNC_KEYS=['nick','look','owned','equip','eyes','menubg','trophies','bonusXp','stats','daily','totalGems','spent','bonusOr','season'];
const SKEY='67x_acc_s',sesTab=()=>{try{return JSON.parse(sessionStorage.getItem(SKEY)||'null')}catch(e){return null}};
const ACC={keep:store.get('accKeep',true)!==false,ses:store.get('acc',null)||sesTab(),prof:null,tab:'novo',msg:null,busy:false,dirty:false,saveT:0,lastSave:0,syncErr:false,pending:null};
const rawSet=store.set.bind(store);
store.set=(k,v)=>{rawSet(k,v);if(ACC.prof&&SYNC_KEYS.includes(k))accDirty()};

async function sb(path,o={}){const h={apikey:SB_KEY,'Content-Type':'application/json'};if(o.auth!==false&&ACC.ses)h.Authorization='Bearer '+ACC.ses.access_token;
  if(o.prefer)h.Prefer=o.prefer;
  const r=await fetch(SB_URL+path,{method:o.method||'GET',headers:h,body:o.body?JSON.stringify(o.body):undefined,keepalive:!!o.keepalive});
  let j=null;try{j=await r.json()}catch(e){}
  if(!r.ok){const e=new Error((j&&(j.msg||j.error_description||j.message||j.error))||('http '+r.status));e.status=r.status;e.code=j&&(j.error_code||j.code);throw e}return j}
function saveSes(d){if(!d||!d.access_token){ACC.ses=null;rawSet('acc',null);try{sessionStorage.removeItem(SKEY)}catch(e){}return}
  ACC.ses={access_token:d.access_token,refresh_token:d.refresh_token,expires_at:d.expires_at||Math.floor(Date.now()/1000)+(d.expires_in||3600),uid:(d.user&&d.user.id)||ACC.ses&&ACC.ses.uid,email:(d.user&&d.user.email)||ACC.ses&&ACC.ses.email};storeSes()}
// "Manter conectado": guarda o login no aparelho; desmarcado, vale só enquanto esta aba estiver aberta
function storeSes(){if(ACC.keep){rawSet('acc',ACC.ses);try{sessionStorage.removeItem(SKEY)}catch(e){}}else{rawSet('acc',null);try{sessionStorage.setItem(SKEY,JSON.stringify(ACC.ses))}catch(e){}}}
async function fresh(){if(!ACC.ses)return false;if(ACC.ses.expires_at-60>Date.now()/1000)return true;
  try{saveSes(await sb('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:{refresh_token:ACC.ses.refresh_token}}));return true}
  catch(e){if(e.status===400||e.status===401){saveSes(null);ACC.prof=null;accTagUpd();ACC.tab='entrar';ACC.msg=['Sua sessão expirou. Entre de novo.','bad'];gateShow()}return false}}
// erros do Supabase em português
function accErr(e){const m=String(e&&e.message||e).toLowerCase(),c=e&&e.code||'';
  if(c==='email_not_confirmed'||m.includes('not confirmed'))return'Falta confirmar o email: abra o link que enviamos para você.';
  if(c==='invalid_credentials'||m.includes('invalid login'))return'Email ou senha errados.';
  if(c==='user_already_exists'||m.includes('already registered'))return'Já existe uma conta com esse email. Use "Entrar".';
  if(c==='weak_password'||m.includes('password should'))return'Senha fraca: use pelo menos 6 caracteres.';
  if(c==='over_email_send_rate_limit'||m.includes('rate limit'))return'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
  if(m.includes('invalid')&&m.includes('email'))return'Esse email não parece válido.';
  if(m.includes('sending confirmation')||m.includes('sending')&&m.includes('email'))return'Não conseguimos enviar o email de confirmação agora. Tente de novo daqui a pouco.';
  if(m.includes('failed to fetch')||m.includes('network'))return'Sem conexão com o servidor de contas. Verifique a internet.';
  return'Não deu certo: '+(e&&e.message||e)}

// ---------- progresso: navegador <-> nuvem ----------
function localData(){const d={};for(const k of SYNC_KEYS){const v=store.get(k,undefined);if(v!==undefined)d[k]=v}return d}
async function loadProfile(){if(!await fresh())return null;const r=await sb('/rest/v1/profiles?select=*&id=eq.'+ACC.ses.uid);return r&&r[0]||null}
async function accPull(){const p=await loadProfile();if(!p)return;ACC.prof=p;
  if(!p.synced){// primeira vez nesta conta: o que já estava no navegador vai junto (laranjas de presente da conta têm prioridade)
    const oranges=p.oranges>0?p.oranges:wallet(),data=localData();data.nick=p.username;
    const r=await sb('/rest/v1/profiles?id=eq.'+p.id,{method:'PATCH',prefer:'return=representation',body:{data,oranges,synced:true}});ACC.prof=r&&r[0]||Object.assign(p,{data,oranges,synced:true})}
  applyCloud(ACC.prof);ACC.lastSave=Date.now();accTagUpd();if(view==='conta')accRender()}
function applyCloud(p){const d=p.data||{};for(const k of SYNC_KEYS){if(k in d)rawSet(k,d[k]);else if(k!=='nick')try{localStorage.removeItem('67x_'+k)}catch(e){}}
  rawSet('nick',p.username);
  // as laranjas da conta mandam: ajusta o "bônus" para a carteira bater exatamente com a nuvem
  rawSet('bonusOr',Math.max(0,p.oranges-(store.get('totalGems',0)-store.get('spent',0))));
  accRefreshGame()}
function accRefreshGame(){try{myLook=cleanLook(store.get('look',defaultLook(1)));DAY=null;curBg=store.get('menubg','lagoa');applyMenuBg();applyEquip();$('nick').value=store.get('nick','');renderTop();if(view==='home')renderHome()}catch(e){console.warn('conta: atualizar tela',e)}}
function accDirty(){ACC.dirty=true;clearTimeout(ACC.saveT);ACC.saveT=setTimeout(accPush,3500);accSyncUpd()}
async function accPush(keep){if(!ACC.prof||!ACC.dirty)return;if(ACC.busy){ACC.saveT=setTimeout(accPush,1500);return}ACC.busy=true;ACC.dirty=false;accSyncUpd();
  try{if(!await fresh())throw new Error('sessão');const body={data:localData(),oranges:wallet()};
    await sb('/rest/v1/profiles?id=eq.'+ACC.prof.id,{method:'PATCH',body,keepalive:!!keep,prefer:'return=minimal'});
    ACC.prof.data=body.data;ACC.prof.oranges=body.oranges;ACC.lastSave=Date.now();ACC.syncErr=false}
  catch(e){ACC.dirty=true;ACC.syncErr=true;ACC.saveT=setTimeout(accPush,15000)}
  ACC.busy=false;accSyncUpd()}
addEventListener('pagehide',()=>{if(ACC.dirty)accPush(true)});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ACC.dirty)accPush(true)});

// ---------- ações ----------
async function accSignup(email,user,pass){const redirect=encodeURIComponent(location.origin+location.pathname);
  const r=await sb('/auth/v1/signup?redirect_to='+redirect,{method:'POST',auth:false,body:{email,password:pass,data:{username:user}}});
  if(r&&r.access_token){saveSes(r);await accPull();return'ok'}
  const u=r&&(r.user||r);if(u&&Array.isArray(u.identities)&&!u.identities.length)throw Object.assign(new Error('already registered'),{code:'user_already_exists'});
  return'confirm'}
async function accLogin(email,pass){saveSes(await sb('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email,password:pass}}));await accPull()}
async function accLogout(){if(ACC.dirty)await accPush();try{await sb('/auth/v1/logout',{method:'POST'})}catch(e){}
  saveSes(null);ACC.prof=null;for(const k of SYNC_KEYS)try{localStorage.removeItem('67x_'+k)}catch(e){}accRefreshGame();accTagUpd();ACC.tab='entrar';ACC.msg=null;gateShow()}
// voltou do link de confirmação do email (#access_token=...): entra direto
(function(){const h=location.hash;if(!/access_token=/.test(h))return;const q=new URLSearchParams(h.slice(1));
  saveSes({access_token:q.get('access_token'),refresh_token:q.get('refresh_token'),expires_in:+q.get('expires_in')||3600});
  try{const pl=JSON.parse(atob(q.get('access_token').split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));ACC.ses.uid=pl.sub;ACC.ses.email=pl.email;storeSes()}catch(e){}
  history.replaceState(null,'',location.pathname+location.search);if(q.get('type')==='recovery')ACC.recovery=true;else ACC.welcome=true})();

// ---------- tela ----------
const esc=s=>escapeHtml(String(s==null?'':s));
function accTagUpd(){let on;try{on=!!ACC.prof}catch(e){return}const t=$('accTag'),b=$('btnAcc');if(t){t.textContent=on?'☁ '+ACC.prof.username:'Criar conta / Entrar';t.classList.toggle('on',on)}if(b)b.classList.toggle('on',on)}
function accSyncUpd(){const el=$('accSync');if(!el)return;const busy=ACC.busy||ACC.dirty;el.className='m-accsync'+(ACC.syncErr?' err':busy?' busy':'');
  el.querySelector('span').textContent=ACC.syncErr?'Sem conexão — vou tentar salvar de novo':busy?'Salvando na nuvem…':'Tudo salvo na nuvem'}
function accRender(){const el=ACC.ses?$('accBody'):$('gateBody');if(!el)return;
  if(ACC.ses&&!ACC.prof&&!ACC.recovery){// tem conta mas ainda não carregou (sem internet?): joga com o que está no aparelho
    el.innerHTML=`<div class="m-accmsg">Conectando à sua conta${esc(ACC.ses.email?' ('+ACC.ses.email+')':'')}… Enquanto isso, você joga com o que está salvo neste aparelho.</div>
      <div class="m-accrow"><button class="m-btn2" id="accRetry"><svg class="i"><use href="#i-refresh"/></svg>TENTAR DE NOVO</button><button class="m-btn2" id="accOut2"><svg class="i"><use href="#i-door"/></svg>SAIR DA CONTA</button></div>`;
    $('accRetry').onclick=()=>{Sound.play('click');accPull().catch(e=>toast(accErr(e),'bad'))};
    $('accOut2').onclick=async()=>{Sound.play('click');await accLogout();toast('Você saiu da conta.')};return}
  if(ACC.prof&&ACC.recovery){// veio do link "esqueci minha senha": cria a senha nova
    el.innerHTML=`<div class="m-accmsg ok">Crie uma senha nova para <b>${esc(ACC.prof.username)}</b>.</div><form class="m-accform" id="accNewPw"><label>SENHA NOVA<input class="field" type="password" id="accP1" autocomplete="new-password" required></label>
      <label>CONFIRMAR SENHA<input class="field" type="password" id="accP2" autocomplete="new-password" required></label><button class="m-play sm m-accmain" type="submit"><b>SALVAR SENHA</b></button></form>`;
    $('accNewPw').onsubmit=async ev=>{ev.preventDefault();const a=$('accP1').value;if(a.length<6||a!==$('accP2').value){Sound.play('no');toast(a.length<6?'Use pelo menos 6 caracteres.':'As senhas não estão iguais.','bad');return}
      try{await fresh();await sb('/auth/v1/user',{method:'PUT',body:{password:a}});ACC.recovery=false;toast('Senha nova salva!','good');accRender()}catch(e){toast(accErr(e),'bad')}};return}
  if(ACC.prof){const p=ACC.prof,st=store.get('stats',{kills:0,games:0,wins:0});
    el.innerHTML=`<div class="m-accprof"><canvas width="140" height="140" id="accAva"></canvas><div><b>${esc(p.username)}</b><small>${esc(ACC.ses&&ACC.ses.email)}</small></div></div>
      <div class="m-accstats"><div><b>${wallet().toLocaleString('pt-BR')}</b><span>LARANJAS</span></div><div><b>${trophies().toLocaleString('pt-BR')}</b><span>TROFÉUS</span></div><div><b>${(store.get('owned',[])||[]).length}</b><span>ITENS</span></div></div>
      <div class="m-accstats"><div><b>${st.games||0}</b><span>PARTIDAS</span></div><div><b>${st.wins||0}</b><span>VITÓRIAS</span></div><div><b>${st.kills||0}</b><span>ABATES</span></div></div>
      <div class="m-accsync" id="accSync"><i></i><span></span></div>
      <p class="m-accnote">Suas laranjas, itens da loja, visual, olhos, fundos, troféus e desafios ficam salvos nesta conta. Entre com o mesmo email em outro aparelho e tudo vem junto.</p>
      <div class="m-accrow"><button class="m-btn2" id="accSave"><svg class="i"><use href="#i-refresh"/></svg>SALVAR AGORA</button><button class="m-btn2" id="accOut"><svg class="i"><use href="#i-door"/></svg>SAIR DA CONTA</button></div>`;
    drawPortrait($('accAva'),myLook,{bg:false,self:true});accSyncUpd();
    $('accSave').onclick=async()=>{Sound.play('click');ACC.dirty=true;await accPush();toast(ACC.syncErr?'Não deu para salvar agora.':'Salvo na nuvem!',ACC.syncErr?'bad':'good')};
    $('accOut').onclick=async()=>{if(!await confirmBox('Sair da conta?','Seu progresso continua salvo na conta. Neste aparelho você volta a jogar como visitante.','SAIR','FICAR'))return;Sound.play('click');await accLogout();toast('Você saiu da conta.')};
    return}
  if(ACC.pending){el.innerHTML=`<div class="m-accmsg ok"><b>Quase lá!</b> Enviamos um link para <b>${esc(ACC.pending)}</b>. Abra seu email, toque no link para confirmar e você entra automaticamente.</div>
      <p class="m-accnote">Não chegou? Olhe a caixa de spam. Já confirmou em outro aparelho? Entre aqui com email e senha.</p><button class="m-play sm m-accmain" id="accGoLogin"><b>JÁ CONFIRMEI — ENTRAR</b></button>`;
    $('accGoLogin').onclick=()=>{ACC.tab='entrar';ACC.pending=null;accRender()};return}
  if(ACC.tab==='recuperar'){el.innerHTML=`<div class="m-accrec"><h4>${I('lock')}Esqueci minha senha</h4><p class="m-accnote">Escreva o email da sua conta. Vamos mandar um link para você criar uma senha nova.</p>
      ${ACC.msg?`<div class="m-accmsg ${ACC.msg[1]}">${esc(ACC.msg[0])}</div>`:''}
      <form class="m-accform" id="recForm"><label>EMAIL<input class="field" type="email" id="recEmail" autocomplete="email" required value="${esc(ACC.recEm||'')}"></label>
      <button class="m-play sm m-accmain" type="submit" id="recGo"><b>ENVIAR LINK</b></button><button class="m-acclink" type="button" id="recBack">${I('back')}Voltar para o login</button></form></div>`;
    $('recBack').onclick=()=>{ACC.tab='entrar';ACC.msg=null;Sound.play('click');accRender()};
    $('recForm').onsubmit=async ev=>{ev.preventDefault();if(ACC.busy)return;const em=$('recEmail').value.trim();ACC.recEm=em;ACC.busy=true;const b=$('recGo');b.disabled=true;b.querySelector('b').textContent='ENVIANDO…';
      try{await sb('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+location.pathname),{method:'POST',auth:false,body:{email:em}});ACC.msg=['Pronto! Se existir uma conta com esse email, o link chega em instantes. Olhe também o spam.','ok'];Sound.play('yes')}catch(e){ACC.msg=[accErr(e),'bad'];Sound.play('no')}
      ACC.busy=false;accRender()};return}
  const novo=ACC.tab==='novo';
  el.innerHTML=`<div class="m-acctabs"><button class="m-tab${novo?' on':''}" data-at="novo">${I('plus')}<span>Criar conta</span></button><button class="m-tab${novo?'':' on'}" data-at="entrar">${I('arrow')}<span>Entrar</span></button></div>
    ${ACC.msg?`<div class="m-accmsg ${ACC.msg[1]}">${esc(ACC.msg[0])}</div>`:''}
    <form class="m-accform" id="accForm" autocomplete="on">
      <label>EMAIL<input class="field" type="email" id="accEmail" autocomplete="email"  required></label>
      ${novo?`<label>NOME DE USUÁRIO<input class="field" id="accUser" maxlength="16" autocomplete="username" required><span class="hint" id="accUserHint">3 a 16 letras, números ou _</span></label>`:''}
      <label>SENHA<input class="field" type="password" id="accPass" autocomplete="${novo?'new-password':'current-password'}" required></label>
      ${novo?`<label>CONFIRMAR SENHA<input class="field" type="password" id="accPass2" autocomplete="new-password" required></label>`:''}
      <div class="m-keeprow"><label class="m-keep"><input type="checkbox" id="accKeep"${ACC.keep?' checked':''}><i></i>Manter conectado</label>${novo?'':`<button class="m-acclink" type="button" id="accForgot">Esqueci minha senha</button>`}</div>
      <button class="m-play sm m-accmain" type="submit" id="accGo"><b>${novo?'CRIAR CONTA':'ENTRAR'}</b></button>
    </form>
    <p class="m-accnote">${novo?'Com uma conta, suas laranjas, skins, itens, visual e troféus ficam salvos e você joga em qualquer aparelho. O que você já tem neste navegador vai junto para a conta.':'Entre com o email e a senha da sua conta para trazer seu progresso para este aparelho.'}</p>`;
  el.querySelectorAll('[data-at]').forEach(b=>b.onclick=()=>{ACC.tab=b.dataset.at;ACC.msg=null;Sound.play('click');accRender()});
  const form=$('accForm');
  if(novo){let t=0;const u=$('accUser'),hint=$('accUserHint');u.oninput=()=>{clearTimeout(t);const v=u.value.trim();
      if(!/^[A-Za-z0-9_]{3,16}$/.test(v)){hint.className='hint'+(v?' bad':'');hint.textContent=v?'Use 3 a 16 letras, números ou _ (sem espaço).':'3 a 16 letras, números ou _';return}
      hint.className='hint';hint.textContent='Verificando…';t=setTimeout(async()=>{try{const ok=await sb('/rest/v1/rpc/username_available',{method:'POST',auth:false,body:{u:v,mail:$('accEmail').value.trim()||null}});
        if(u.value.trim()!==v)return;hint.className='hint '+(ok?'ok':'bad');hint.textContent=ok?'✓ Nome livre!':'Esse nome já é de outra capivara.'}catch(e){hint.className='hint';hint.textContent=''}},450)}}
  else $('accForgot').onclick=()=>{ACC.recEm=$('accEmail').value.trim();ACC.tab='recuperar';ACC.msg=null;Sound.play('click');accRender()};
  $('accKeep').onchange=e=>{ACC.keep=e.target.checked;rawSet('accKeep',ACC.keep);Sound.play('click')};
  form.onsubmit=async ev=>{ev.preventDefault();if(ACC.busy)return;const em=$('accEmail').value.trim(),pw=$('accPass').value;
    if(novo){const us=$('accUser').value.trim();
      if(!/^[A-Za-z0-9_]{3,16}$/.test(us)){ACC.msg=['Nome de usuário: 3 a 16 letras, números ou _ (sem espaço).','bad'];return accRenderKeep(em,us)}
      if(pw.length<6){ACC.msg=['A senha precisa ter pelo menos 6 caracteres.','bad'];return accRenderKeep(em,us)}
      if(pw!==$('accPass2').value){ACC.msg=['As duas senhas não estão iguais.','bad'];return accRenderKeep(em,us)}}
    ACC.busy=true;const btn=$('accGo');btn.disabled=true;btn.querySelector('b').textContent='AGUARDE…';
    try{if(novo){const r=await accSignup(em,$('accUser').value.trim(),pw);ACC.msg=null;if(r==='confirm'){ACC.pending=em}else{gateHide();Sound.play('level');celebrate(40);toast('Conta criada! Bem-vindo, '+ACC.prof.username+'!','good')}}
      else{await accLogin(em,pw);ACC.msg=null;gateHide();Sound.play('level');toast('Bem-vindo de volta, '+ACC.prof.username+'!','good')}}
    catch(e){ACC.msg=[accErr(e),'bad'];Sound.play('no')}
    ACC.busy=false;accRender()}}
function accRenderKeep(em,us){Sound.play('no');accRender();$('accEmail').value=em;if($('accUser'))$('accUser').value=us}
// ---------- portão de entrada: sem conta não dá para jogar ----------
// Aparece logo depois da abertura (Entre Mundos), no centro, com os quadros de capivara passando ao fundo.
// O login fica guardado neste aparelho: quem já entrou vai direto para o jogo.
let gateT=0,gateI=-1,gateFront=0,gateOrder=[];
function gateSlide(){if(!gateOrder.length){gateOrder=Object.keys(ART).sort(()=>Math.random()-.5)}gateI=(gateI+1)%gateOrder.length;const k=gateOrder[gateI],a=$('gA'),b=$('gB'),on=gateFront?a:b,off=gateFront?b:a;gateFront^=1;
  const url=`loading/${k}.jpg?v=${ASSETV}`;on.onload=()=>{on.classList.remove('on');void on.offsetWidth;on.classList.add('on');off.classList.remove('on');$('gArt').textContent=ART[k]};
  if(on.getAttribute('src')===url&&on.complete)on.onload();else on.src=url}
function gateShow(){const g=$('gate');if(!g)return;g.classList.remove('hidden','out');document.body.classList.add('gated');if(view!=='home'&&MENUV.includes(view))go('home');accRender();clearInterval(gateT);gateSlide();gateT=setInterval(gateSlide,4500)}
function gateHide(){const g=$('gate');if(!g||g.classList.contains('hidden'))return;g.classList.add('out');document.body.classList.remove('gated');clearInterval(gateT);setTimeout(()=>{g.classList.add('hidden');g.classList.remove('out')},500);go('home');renderTop()}
// com o portão aberto, as teclas do menu (Q, E, Tab, Enter...) não mexem no jogo por trás
addEventListener('keydown',e=>{if(!document.body.classList.contains('gated'))return;const tag=document.activeElement&&document.activeElement.tagName;if(tag==='INPUT')return;e.stopImmediatePropagation()},true);
if(!ACC.ses)gateShow();
$('btnAcc').onclick=()=>{Sound.play('click');go('conta')};
if($('accTag'))$('accTag').onclick=e=>{e.stopPropagation();Sound.play('click');go('conta')};
accTagUpd();
// ao abrir o jogo com conta: busca o progresso salvo (se falhar, joga com o que está no navegador e tenta salvar depois)
if(ACC.ses)accPull().then(()=>{if(ACC.recovery&&ACC.prof)go('conta');else if(ACC.welcome&&ACC.prof){toast('Email confirmado! Bem-vindo, '+ACC.prof.username+'!','good');go('conta')}}).catch(e=>console.warn('conta:',e));
