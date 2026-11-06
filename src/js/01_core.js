// ===== Utilidades, configurações e áudio =====
const isTouch=matchMedia('(pointer:coarse)').matches||('ontouchstart' in window&&innerWidth<1100);
if(isTouch)document.body.classList.add('mobile');

const DEFAULT_SETTINGS={master:80,sfx:85,music:55,sound:true,quality:'medium',names:true,shake:true,fullscreen:false,
  vibrate:true,deadzone:22,joySize:128,joyOpacity:70,fps:60,particles:'full',dynres:true};
const S=Object.assign({},DEFAULT_SETTINGS,store.get('settings',{}));
function saveSettings(){store.set('settings',S)}

// ---------- Áudio sintetizado (sem arquivos) ----------
const Sound=(()=>{
  let ac=null,master,sfxBus,musBus,musicOn=false,musTimer=null,step=0,tempo=100,nextT=0,noiseBuf=null,lastPlay={};
  function init(){if(ac)return;try{ac=new (window.AudioContext||window.webkitAudioContext)()}catch(e){return}
    master=ac.createGain();sfxBus=ac.createGain();musBus=ac.createGain();const comp=ac.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=10;comp.ratio.value=5;comp.attack.value=.003;comp.release.value=.18;sfxBus.connect(comp);comp.connect(master);musBus.connect(master);master.connect(ac.destination);
    noiseBuf=ac.createBuffer(1,ac.sampleRate*.5,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;apply()}
  function apply(){trkVol();if(!ac)return;master.gain.value=S.sound?S.master/100:0;sfxBus.gain.value=S.sfx/100*.55;musBus.gain.value=S.music/100*.22}
  function tone(f,dur,type='square',vol=.3,slide=0,when=0,bus=sfxBus){if(!ac)return;const t=ac.currentTime+when,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f*slide),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(bus);o.start(t);o.stop(t+dur+.02)}
  function noise(dur,vol=.3,freq=1200,when=0,bus=sfxBus,q=1){if(!ac)return;const t=ac.currentTime+when,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuf;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(bus);s.start(t);s.stop(t+dur+.02)}
  // ruído filtrado com varredura de frequência (tiros, explosões, assobios)
  function nz(dur,vol,type,f1,f2,when=0,q=.8,atk=.002){if(!ac||vol<=.001)return;const t=ac.currentTime+when,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuf;s.loop=true;s.playbackRate.value=rand(.9,1.1);
    f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f1,t);if(f2&&f2!==f1)f.frequency.exponentialRampToValueAtTime(Math.max(30,f2),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+atk);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(sfxBus);s.start(t);s.stop(t+dur+.05)}
  function osc(f1,f2,dur,type,vol,when=0,vib=0){if(!ac||vol<=.001)return;const t=ac.currentTime+when,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f1,t);if(f2&&f2!==f1)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dur);
    if(vib){const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=vib;lg.gain.value=f1*.06;l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+dur+.05)}
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+dur+.05)}
  // ---------- tiro de cada arma: receita da categoria + variação fixa pelo número da arma (cada uma soa diferente) ----------
  const gunLast={};
  function gun(g,v=1){if(!ac||!S.sound||!g)return;const id=g.id|0,now=time(),gap=g.cat==='smg'?38:60;if(gunLast[id]&&now-gunLast[id]<gap)return;gunLast[id]=now;
    let h=(id+1)*2654435761%4294967296;const R=()=>{h=(h*1664525+1013904223)%4294967296;return h/4294967296};const pm=.78+R()*.5,dm=.85+R()*.4,big=Math.min(1.6,.75+(g.dmg||10)/60);
    try{switch(g.cat){
      case 'pistol':nz(.07*dm,.5*v,'highpass',2600*pm,1400,0,.7);osc(420*pm,120,.09,'square',.18*v);osc(150*pm,60,.12,'sine',.45*v*big);nz(.16*dm,.12*v,'lowpass',1800,300,.03);break;
      case 'smg':{const r=rand(.93,1.07);nz(.045*dm,.38*v,'highpass',3400*pm*r,2000,0,.9);osc(600*pm*r,200,.05,'square',.12*v);osc(130*pm,70,.07,'sine',.3*v);break}
      case 'rifle':nz(.05,.75*v,'highpass',3000*pm,1600,0,.6);osc(90*pm,40,.22,'sine',.7*v*big);nz(.55*dm,.28*v,'lowpass',2200*pm,180,.02,.5);osc(1400*pm,500,.06,'triangle',.12*v);break;
      case 'shotgun':nz(.08,.85*v,'lowpass',5000,900,0,.4);osc(85*pm,38,.28,'sine',.85*v*big);nz(.4*dm,.4*v,'bandpass',900*pm,200,.01,.6);nz(.2,.18*v,'highpass',4000,2500,.02);break;
      case 'heavy':osc(140*pm,40,.45*dm,'sawtooth',.4*v);osc(70*pm,30,.5*dm,'sine',.8*v*big);nz(.6*dm,.55*v,'lowpass',1600*pm,120,0,.5);nz(.25,.25*v,'bandpass',2600*pm,700,.04,1.2);break;
      case 'laser':if(g.beam){osc(2600*pm,300,.38*dm,'sawtooth',.2*v,0,38);osc(1300*pm,180,.42*dm,'sine',.3*v);nz(.42*dm,.22*v,'highpass',6000,1800,0,1.5);osc(110,60,.25,'sine',.35*v)}
        else{osc(1800*pm,260*pm,.2*dm,R()<.5?'sawtooth':'square',.2*v,0,R()<.5?24:0);osc(900*pm,120,.16,'sine',.18*v);nz(.12,.1*v,'highpass',5000,3000)}break;
      case 'throw':nz(.22*dm,.3*v,'bandpass',700*pm,2600*pm,0,2.5,.04);osc(500*pm,900*pm,.12,'triangle',.1*v);break;
      case 'explosive':osc(220*pm,70,.2,'square',.2*v);nz(.16,.45*v,'lowpass',1400*pm,300,0,.7);osc(90*pm,45,.2,'sine',.5*v);nz(.3,.12*v,'bandpass',1800*pm,600,.05,3);break;
      case 'melee':nz(.18*dm,.32*v,'bandpass',600*pm,3200*pm,0,1.8,.05);osc(180*pm,90,.1,'triangle',.18*v,.08);break;
      default:if(lib[g.sfx])lib[g.sfx]();else lib.pew();osc(300*pm,150*pm,.08,'triangle',.12*v)}
      // som "temático" por cima do disparo (congelar, choque, galinha, buzina...)
      if(g.cat!=='special'&&g.cat!=='builder'&&['quack','honk','boing','slap','freeze','zap','flash','warp','no','yes'].includes(g.sfx))lib[g.sfx]()}catch(e){console.warn('som',e)}}
  // recarga depois do tiro (só a sua arma): escopeta bomba, rifle ferrolho, pesada encaixa o foguete, energia recarrega zunindo
  function reload(g){if(!ac||!S.sound||!g)return;const c=g.cat;try{
    if(c==='shotgun'){nz(.05,.35,'bandpass',1800,1200,0,4);osc(320,200,.05,'square',.12);nz(.06,.4,'bandpass',2400,1600,.16,4);osc(260,160,.06,'square',.14,.16)}
    else if(c==='rifle'){nz(.04,.3,'bandpass',3200,2400,0,5);osc(700,500,.03,'square',.1);nz(.05,.32,'bandpass',2600,1800,.12,5);osc(500,380,.04,'square',.1,.12)}
    else if(c==='heavy'||c==='explosive'){nz(.12,.3,'bandpass',900,500,0,3);osc(160,120,.12,'square',.14);nz(.3,.12,'highpass',5000,2500,.12,1);osc(90,90,.08,'sine',.3,.14)}
    else if(c==='laser'){osc(300,2400,.4,'sine',.1,0,14);nz(.4,.05,'bandpass',1500,6000,0,6,.2)}
    else if(c==='pistol'){nz(.03,.25,'bandpass',3600,2800,0,6);osc(900,700,.025,'square',.08)}}catch(e){}}
  // explosões em camadas: estalo, grave que treme e o "rabo" que vai sumindo; quanto maior o raio, mais pesada
  function bigBoom(r=100,v=1){if(!ac||!S.sound)return;const k=Math.min(2,r/110);try{nz(.08,.9*v,'highpass',2500,800,0,.5);osc(110,28,.9*k,'sine',.95*v);osc(60,25,1.1*k,'triangle',.5*v);nz(1.1*k,.7*v,'lowpass',2200,90,0,.4);nz(.6*k,.25*v,'bandpass',600,150,.06,.8);
    for(let i=0;i<4;i++)nz(.05,.14*v,'highpass',3000,2000,.12+i*.09+Math.random()*.05,1)}catch(e){}}
  const lib={
    click(){tone(520,.06,'triangle',.25,1.6)},
    hover(){tone(880,.03,'triangle',.08)},
    boing(){tone(260,.18,'sine',.35,2.4)},
    pew(){tone(rand(760,900),.09,'square',.12,.4)},
    pop(){tone(420,.07,'sine',.25,2.2);noise(.04,.12,3000)},
    heavy(){tone(140,.25,'sawtooth',.25,.4);noise(.18,.25,500)},
    laser(){tone(1500,.22,'sawtooth',.12,.25)},
    melee(){noise(.12,.25,2500,0,sfxBus,3)},
    throw(){noise(.1,.15,1800,0,sfxBus,5);tone(600,.08,'triangle',.1,1.5)},
    no(){tone(180,.3,'square',.25,.7);tone(120,.3,'square',.2,.7,.05)},
    yes(){tone(660,.1,'triangle',.25);tone(880,.12,'triangle',.25,1,.08)},
    honk(){tone(330,.25,'square',.2);tone(392,.25,'square',.12)},
    quack(){tone(700,.12,'sawtooth',.2,.6)},
    hit(){noise(.07,.3,700);tone(160,.06,'square',.15,.6)},
    hurt(){tone(300,.14,'square',.2,.5)},
    boom(){noise(.5,.55,240,0,sfxBus,.7);tone(90,.4,'sine',.5,.4)},
    gem(n){const f=880*Math.pow(1.06,clamp(n||0,0,12));tone(f,.09,'triangle',.22);tone(f*1.5,.12,'sine',.12,1,.05)},
    heal(){[523,659,784].forEach((f,i)=>tone(f,.16,'triangle',.22,1,i*.07))},
    dash(){noise(.22,.3,1400,0,sfxBus,.8);tone(500,.18,'sine',.1,2)},
    warp(){tone(300,.2,'sine',.25,4);tone(1200,.18,'sine',.15,.3,.15)},
    ko(){tone(220,.35,'triangle',.3,.3);tone(1200,.5,'sine',.08,.4,.1)},
    level(){[392,523,659,784,1046].forEach((f,i)=>tone(f,.22,'square',.14,1,i*.08));noise(.5,.18,6000,.35)},
    spawn(){noise(.3,.2,900,0,sfxBus,1);tone(880,.15,'triangle',.2,1,.25);tone(1320,.2,'triangle',.18,1,.33)},
    tick(){tone(1000,.05,'square',.12)},
    count(){tone(660,.16,'square',.2);tone(330,.18,'triangle',.25)},
    go(){tone(880,.12,'square',.22);tone(1320,.35,'square',.18,1,.08);noise(.4,.25,5000,.05,sfxBus,.6)},
    win(){[523,659,784,1046,784,1046].forEach((f,i)=>tone(f,.25,'square',.14,1,i*.12))},
    freeze(){tone(2400,.25,'sine',.12,.5);noise(.3,.15,6000,0,sfxBus,2)},
    flash(){noise(.6,.5,4000,0,sfxBus,.4);tone(3200,.8,'sine',.08,.9)},
    timestop(){tone(880,.6,'sine',.2,.25);tone(440,.9,'triangle',.15,.5,.1);noise(.8,.1,300,0,sfxBus,.5)},
    hole(){tone(120,1.2,'sawtooth',.18,.3);tone(60,1.4,'sine',.3,.5)},
    meteor(){tone(1800,1.1,'sine',.12,.15)},
    build(){noise(.12,.3,500,0,sfxBus,2);tone(200,.1,'square',.15,.8,.05)},
    pickup(){tone(660,.08,'square',.15);tone(990,.12,'square',.12,1,.07)},
    med(){[440,554,659,880].forEach((f,i)=>tone(f,.12,'triangle',.2,1,i*.05))},
    swap(){tone(300,.05,'square',.12,1.8);noise(.05,.15,3000)},
    capture(){[392,494,587,784,988].forEach((f,i)=>tone(f,.18,'square',.16,1,i*.07))},
    zap(){tone(1200,.15,'sawtooth',.15,.3);noise(.1,.2,5000)},
    slap(){noise(.08,.5,1500,0,sfxBus,1.5);tone(200,.08,'square',.2,.5)},
  };
  function play(n,a){if(!ac||!S.sound)return;const t=time();if(lastPlay[n]&&t-lastPlay[n]<35)return;lastPlay[n]=t;try{lib[n]&&lib[n](a)}catch(e){}}
  // música procedural ska/funk
  const prog=[[0,4,7],[5,9,12],[7,11,14],[5,9,12]];
  function scheduleMusic(){if(!ac||!musicOn)return;const spb=60/tempo/2;while(nextT<ac.currentTime+.25){const bar=Math.floor(step/8)%4,s=step%8,root=196*Math.pow(2,prog[bar][0]/12);
      const t=nextT-ac.currentTime;
      if(s%2===0)tone(root/2*(s===4?1.5:1),spb*.9,'triangle',.5,1,t,musBus);
      if(s%2===1)prog[bar].forEach(n=>tone(196*Math.pow(2,n/12)*2,spb*.35,'square',.07,1,t,musBus));
      noise(.04,s%4===2?.25:.08,s%4===2?2500:9000,t,musBus,s%4===2?.8:1);
      if(tempo>120&&s===6&&Math.random()<.5)tone(root*4,spb*.5,'sine',.08,1.5,t,musBus);
      nextT+=spb;step++}}
  // ---------- Trilha sonora (public/music): Início oficial nos menus e na abertura; Final Fall na partida ----------
  // Os navegadores só deixam tocar som depois do primeiro clique/toque/tecla: se a abertura começar sem som, a música entra no primeiro toque.
  const TRK={menu:['music/inicio.mp3?v=oficial'],battle:['music/finalfall.mp3?v=1']};
  let cur=null,curKind='',fadeT=0;const els=new Map();
  const tvol=()=>S.sound?Math.pow(S.master/100,1.2)*(S.music/100)*.7:0;
  function trkVol(){if(cur&&!cur._fading)cur.volume=Math.min(1,tvol())}
  function el(src){let a=els.get(src);if(!a){a=new Audio();a.src=src;a.loop=true;a.preload='auto';a.setAttribute('playsinline','');els.set(src,a)}return a}
  function fade(a,to,ms,done){a._fading=true;const from=a.volume,t0=performance.now();const f=()=>{const k=Math.min(1,(performance.now()-t0)/ms);try{a.volume=Math.max(0,Math.min(1,from+(to-from)*k))}catch(e){}if(k<1)requestAnimationFrame(f);else{a._fading=false;done&&done()}};f()}
  function startTrack(kind){if(curKind===kind&&cur&&!cur.paused)return;const list=TRK[kind],src=list[Math.floor(Math.random()*list.length)],next=el(src),prev=cur;
    curKind=kind;cur=next;if(prev&&prev!==next)fade(prev,0,600,()=>{prev.pause()});
    if(prev!==next){try{next.currentTime=0}catch(e){}next.volume=0}
    const p=next.play();if(p&&p.catch)p.catch(()=>{curKind=''});fade(next,Math.min(1,tvol()),900)}
  function music(on,bpm){wantMusic=on;wantKind=bpm&&bpm>120?'battle':'menu';if(!on){if(cur)fade(cur,0,400,()=>cur&&cur.pause());curKind='';return}startTrack(wantKind)}
  let wantKind='menu';
  // aba escondida / janela minimizada: música pausa e o motor de áudio dorme (não gasta processador em segundo plano)
  document.addEventListener('visibilitychange',()=>{if(document.hidden){try{if(ac&&ac.state==='running')ac.suspend()}catch(e){}if(cur)cur.pause();return}
    try{if(ac&&ac.state==='suspended')ac.resume()}catch(e){}if(cur&&wantMusic){const p=cur.play();if(p&&p.catch)p.catch(()=>{})}});
  let unlocked=false,silentEl=null;
  function unlock(){init();if(!ac)return;try{if(ac.state!=='running')ac.resume()}catch(e){}
    if(!unlocked){unlocked=true;try{const b=ac.createBuffer(1,1,22050),s=ac.createBufferSource();s.buffer=b;s.connect(ac.destination);s.start(0)}catch(e){}
      try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
      try{silentEl=document.createElement('audio');silentEl.setAttribute('playsinline','');silentEl.loop=true;silentEl.volume=.01;
        silentEl.src='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';const pr=silentEl.play();if(pr&&pr.catch)pr.catch(()=>{})}catch(e){}}
    if(wantMusic&&(!cur||cur.paused||curKind===''))startTrack(wantKind)}
  let wantMusic=true;
  return {play,init,apply,music,unlock,gun,reload,bigBoom};
})();
const vibe=ms=>{if(S.vibrate&&navigator.vibrate)try{navigator.vibrate(ms)}catch(e){}};
for(const ev of ['pointerdown','touchstart','touchend','mousedown','click'])addEventListener(ev,()=>Sound.unlock(),{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)Sound.unlock()});
addEventListener('keydown',()=>Sound.unlock(),{capture:true});

function toast(msg,kind=''){const d=document.createElement('div');d.className='toast '+kind;d.textContent=msg;$('toasts').appendChild(d);setTimeout(()=>d.remove(),2700)}
function confirmBox(title,text,yes='SIM',no='CANCELAR'){return new Promise(res=>{const mi=$('mInput');if(mi)mi.classList.add('hidden');$('mTitle').textContent=title;$('mText').textContent=text;$('mYes').textContent=yes;$('mNo').textContent=no;$('modal').classList.remove('hidden');
  const done=v=>{$('modal').classList.add('hidden');$('mYes').onclick=$('mNo').onclick=null;Sound.play('click');res(v)};$('mYes').onclick=()=>done(true);$('mNo').onclick=()=>done(false)})}

