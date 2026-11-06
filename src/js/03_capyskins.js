// ===== Skins 3D: personagens completos montados em cima da capivara (Explorador, Marombeiro, Super-Capi, Cinema Mudo, Dino) =====
// Cada skin = pintura no corpo (shader da capivara, uSk) + peças 3D presas nos ossos + ajustes de osso/olhos/chapéu.
// Tudo é modelado aqui por código (geometrias do three.js combinadas por osso) e animado junto com o esqueleto.
// Coordenadas das peças: espaço do modelo (x = esquerda da capivara, y = cima, z = frente), altura ~1.
const Skins3D=(()=>{
let T=null,H=null;
function init(THREE,helpers){T=THREE;H=helpers}
// [nome, chapéu de palha aparece?, olhos (tipo/sobrancelha/cor), cor da "pálpebra" (máscara), ossos]
const MUSC_BONES={spine:[1.2,1.1,1.14],chest:[1.16,1.08,1.14],neck:[1/(1.2*1.16),1/(1.1*1.08),1/(1.14*1.14)],armL:[1.22,1.04,1.22],armR:[1.22,1.04,1.22],foreL:[1.12,1,1.12],foreR:[1.12,1,1.12],handL:[1.12,1.1,1.12],handR:[1.12,1.1,1.12],
  thighL:[1.25,1,1.25],thighR:[1.25,1,1.25],shinL:[1.12,1,1.12],shinR:[1.12,1,1.12]};
const DEF=[null,
  {n:'Explorador',hat:false,eye:{t:2,b:2,c:'#3DAE5A'}},
  {n:'Marombeiro',hat:false,eye:{t:2,b:2,c:'#3DAE5A'},bones:MUSC_BONES},
  {n:'Super-Capi',hat:true,eye:{t:2,b:2,c:'#3DAE5A'},lid:'#D6262E'},
  {n:'Cinema Mudo',hat:false,eye:{t:2,b:2,c:'#8A8F9A'},gray:1},
  {n:'Dino',hat:false,eye:{t:2,b:2,c:'#3DAE5A'}},
  // exclusivas da temporada
  {n:'Capitão Pirata',hat:false,eye:{t:2,b:4,c:'#3DAE5A'}},
  {n:'Astronauta',hat:false,eye:{t:0,b:1,c:'#3B7BD8'}}];
const NAMES=DEF.map(d=>d&&d.n);

// ---------- ajudantes de geometria ----------
const C=h=>new T.Color(h);
// caixa arredondada com normais analíticas (contorno de tinta sem rachaduras)
function rbox(w,h,d,r,seg=5){const g=new T.BoxGeometry(w,h,d,seg,seg,seg),p=g.attributes.position,n=g.attributes.normal,hx=w/2-r,hy=h/2-r,hz=d/2-r,v=new T.Vector3(),q=new T.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);q.set(Math.max(-hx,Math.min(hx,v.x)),Math.max(-hy,Math.min(hy,v.y)),Math.max(-hz,Math.min(hz,v.z)));v.sub(q);if(v.lengthSq()<1e-12)v.set(0,0,1);v.normalize();n.setXYZ(i,v.x,v.y,v.z);p.setXYZ(i,q.x+v.x*r,q.y+v.y*r,q.z+v.z*r)}
  return g}
const sph=(ws=18,hs=12)=>new T.SphereGeometry(1,ws,hs);
const hemi=(ws=26,hs=10)=>new T.SphereGeometry(1,ws,hs,0,Math.PI*2,0,Math.PI/2);
function star(R,r,d){const s=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,rr=i%2?r:R;i?s.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):s.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}
  return new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:d*.4,bevelSize:R*.08,bevelSegments:1})}
// casco (capuz) elipsoidal com abertura na frente para o rosto
function shell(rx,ry,rz,open){const g=new T.SphereGeometry(1,40,28),p=g.attributes.position,idx=g.index.array,keep=[],v=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
  for(let i=0;i<idx.length;i+=3){let cz=0,cy=0,cx=0;for(let k=0;k<3;k++){v[k].fromBufferAttribute(p,idx[i+k]);cx+=v[k].x/3;cy+=v[k].y/3;cz+=v[k].z/3}if(!open(cx,cy,cz))keep.push(idx[i],idx[i+1],idx[i+2])}
  g.setIndex(keep);g.scale(rx,ry,rz);return g}

// monta as peças de uma skin: {bone:[partes]} → uma malha (e um contorno) por osso
function Builder(rest){const P={};
  return{P,add(bone,geo,col,o={}){(P[bone]||(P[bone]=[])).push({geo,col:C(col),p:o.p||[0,0,0],r:o.r||[0,0,0],s:o.s||[1,1,1],ol:o.ol!==false,ds:!!o.ds,gl:!!o.gl})},
    build(){const out=[];for(const bone in P){const b=rest[bone]||[0,0,0];
      for(const kind of ['m','ds','gl']){const L=P[bone].filter(q=>kind==='ds'?q.ds:kind==='gl'?q.gl:!q.ds&&!q.gl);if(!L.length)continue;
        const mk=list=>{if(!list.length)return null;const pos=[],nor=[],col=[],ind=[];let off=0;const m=new T.Matrix4(),e=new T.Euler(),qq=new T.Quaternion();
          for(const q of list){let g=q.geo.clone();m.compose(new T.Vector3(q.p[0]-b[0],q.p[1]-b[1],q.p[2]-b[2]),qq.setFromEuler(e.set(q.r[0],q.r[1],q.r[2],'YXZ')),new T.Vector3(...q.s));g.applyMatrix4(m);
            if(!g.attributes.normal)g.computeVertexNormals();const pa=g.attributes.position,na=g.attributes.normal;for(let i=0;i<pa.count;i++){pos.push(pa.getX(i),pa.getY(i),pa.getZ(i));nor.push(na.getX(i),na.getY(i),na.getZ(i));col.push(q.col.r,q.col.g,q.col.b)}
            if(g.index){for(const k of g.index.array)ind.push(k+off)}else for(let i=0;i<pa.count;i++)ind.push(i+off);off+=pa.count;g.dispose()}
          const G=new T.BufferGeometry();G.setAttribute('position',new T.Float32BufferAttribute(pos,3));G.setAttribute('normal',new T.Float32BufferAttribute(nor,3));G.setAttribute('color',new T.Float32BufferAttribute(col,3));
          G.setIndex(off>65535?new T.Uint32BufferAttribute(ind,1):new T.Uint16BufferAttribute(ind,1));G.computeBoundingSphere();return G};
        out.push({bone,ds:kind==='ds',gl:kind==='gl',geo:mk(L),ogeo:kind!=='m'?null:mk(L.filter(q=>q.ol))})}}
      return out}}}

// ---------- materiais das peças ----------
let MAT=null;
function mats(){if(MAT)return MAT;
  const acc=H.patch(new T.MeshStandardMaterial({vertexColors:true,roughness:.66,metalness:0}),{key:'skinAcc',fr:[['#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*.42;']]});
  const ds=H.patch(new T.MeshStandardMaterial({vertexColors:true,roughness:.7,metalness:0,side:T.DoubleSide}),{key:'skinAccDS',fr:[['#include <emissivemap_fragment>','#include <emissivemap_fragment>\nif(!gl_FrontFacing)diffuseColor.rgb*=.45;totalEmissiveRadiance+=diffuseColor.rgb*.42;']]});
  // contorno de tinta para peças rígidas (mesma largura em pixels do contorno da capivara)
  const out=new T.MeshBasicMaterial({color:'#2A1A12',side:T.BackSide});
  out.onBeforeCompile=s=>{s.uniforms.uOW=H.OU.uOW;s.uniforms.uRes=H.OU.uRes;
    s.vertexShader='uniform float uOW;uniform vec2 uRes;\n'+s.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n{vec3 vn=normalize(normalMatrix*normal);vec2 d=(projectionMatrix*vec4(vn,0.)).xy*uRes;float l=length(d);if(l>1e-6)gl_Position.xy+=d/l*uOW*1.6*gl_Position.w/uRes;gl_Position.z+=.002*gl_Position.w;}')};
  out.customProgramCacheKey=()=>'skinOutline';
  // mapa do explorador (desenhado aqui mesmo)
  const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');g.fillStyle='#EBDDB5';g.fillRect(0,0,128,128);g.fillStyle='#7FC0D8';g.fillRect(6,6,116,116);
  g.fillStyle='#8DBE6A';g.beginPath();g.moveTo(14,40);g.bezierCurveTo(30,10,70,18,84,34);g.bezierCurveTo(110,44,116,80,96,98);g.bezierCurveTo(70,120,30,110,22,88);g.bezierCurveTo(8,70,10,52,14,40);g.fill();
  g.fillStyle='#C9A35A';g.beginPath();g.ellipse(70,62,16,11,.4,0,7);g.fill();g.strokeStyle='#B03A2E';g.lineWidth=3;g.setLineDash([5,4]);g.beginPath();g.moveTo(30,92);g.quadraticCurveTo(46,52,72,60);g.stroke();
  g.setLineDash([]);g.lineWidth=4;g.beginPath();g.moveTo(66,54);g.lineTo(78,66);g.moveTo(78,54);g.lineTo(66,66);g.stroke();g.strokeStyle='#6B4A2A';g.lineWidth=5;g.strokeRect(3,3,122,122);
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
  const map=H.patch(new T.MeshStandardMaterial({map:tex,roughness:.8,side:T.DoubleSide}),{key:'skinMap',fr:[['#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*.42;']]});
  // vidro do capacete: transparente, com brilho na borda (fresnel)
  const glass=H.patch(new T.MeshStandardMaterial({color:'#CFE8FF',roughness:.05,metalness:.1,transparent:true,opacity:.2,depthWrite:false,side:T.DoubleSide}),{key:'skinGlass',dm:.3,
    fr:[['#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{float fz=pow(1.-abs(normalize(normal).z),2.2);diffuseColor.a=.1+fz*.6;totalEmissiveRadiance+=vec3(.55,.75,1.)*fz*.55;}']]});
  return MAT={acc,ds,out,map,glass}}
// capa: material próprio por capivara (uniforms do vento/corrida)
const CAPE_V=`{float u=aCp.x,v=aCp.y,v2=v*v;float fl=uSpd*.13+uDash*.2;
  transformed.z-=v2*fl;transformed.y+=v2*fl*.55;
  float w=sin(uPh*6.5-v*7.+u*2.6)*(.008+.022*uSpd+.035*uDash)*v;transformed.z+=w;transformed.y+=w*.4;
  transformed.x+=uTurn*v2*.16+sin(uPh*1.9+u*1.3)*.008*v;}`;
function capeMat(){const u={uSpd:{value:0},uDash:{value:0},uTurn:{value:0},uPh:{value:0}};
  const m=H.patch(new T.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:0,side:T.DoubleSide}),{key:'skinCape',uni:()=>u,vd:'attribute vec2 aCp;uniform float uSpd,uDash,uTurn,uPh;\n',v:CAPE_V,
    fr:[['#include <emissivemap_fragment>','#include <emissivemap_fragment>\nif(!gl_FrontFacing)diffuseColor.rgb*=.62;totalEmissiveRadiance+=diffuseColor.rgb*.42;']]});m.userData.cu=u;return m}
// geometria da capa: presa nos ombros, abre em leque até perto do chão, barra ondulada e acabamento dourado
let CAPEG=null;
function capeGeo(rest){if(CAPEG)return CAPEG;const b=rest.chest,NU=26,NV=18,pos=[],col=[],cp=[],ind=[];const red=C('#D3242C'),gold=C('#E9B43A'),tmp=new T.Color();
  for(let j=0;j<=NV;j++){const v=j/NV;for(let i=0;i<=NU;i++){const u=i/NU*2-1;const th=u*(1.5+.28*v),rx=.27+.2*v,rz=.228+.12*v;
      let y=.505-.47*v+(1-u*u)*.0+Math.sin(u*9.5)*.014*v*v,x=Math.sin(th)*rx,z=.0-Math.cos(th)*rz;
      // gola: a ponta de cima se curva sobre os ombros
      if(v<.12){const k=1-v/.12;y+=k*.02}
      pos.push(x-b[0],y-b[1],z-b[2]);cp.push(u,v);
      const edge=Math.max(Math.abs(u)>.93?1:0,v>.93?1:0);tmp.copy(red).lerp(gold,edge);col.push(tmp.r,tmp.g,tmp.b)}}
  for(let j=0;j<NV;j++)for(let i=0;i<NU;i++){const a=j*(NU+1)+i,b2=a+1,c=a+NU+1,d=c+1;ind.push(a,c,b2,b2,c,d)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setAttribute('aCp',new T.Float32BufferAttribute(cp,2));g.setIndex(ind);g.computeVertexNormals();g.computeBoundingSphere();
  return CAPEG=g}

// ---------- as peças de cada skin ----------
function design(sk,B){const b=Builder(restOf(B)),A=b.add.bind(b);
  if(sk===1){// EXPLORADOR: capacete de safári, lenço laranja, mochila, fivela, mapa e bolsinha
    const hb='#D9C69A',hd='#C7B184',bd='#8E4A28';
    A('head',hemi(),hb,{p:[0,.872,.07],s:[.212,.15,.232]});
    A('head',sph(10,8),hd,{p:[0,1.018,.07],s:[.022,.014,.022]});
    A('head',new T.CylinderGeometry(1,1,.034,32,1,true),bd,{p:[0,.888,.07],s:[.216,1,.236],ol:false});
    A('head',new T.LatheGeometry([new T.Vector2(.2,.004),new T.Vector2(.24,-.004),new T.Vector2(.285,-.024),new T.Vector2(.297,-.037),new T.Vector2(.282,-.043),new T.Vector2(.24,-.02),new T.Vector2(.2,-.012)],40),hd,{p:[0,.875,.07],s:[1,1,1.08],r:[-.04,0,0]});
    A('head',rbox(.05,.036,.014,.006),'#5A3820',{p:[0,.888,.322],r:[-.12,0,0]});A('head',rbox(.028,.016,.016,.004),'#C9B07A',{p:[0,.888,.325],r:[-.12,0,0],ol:false});
    // lenço amarrado no pescoço (anel + nó + duas pontas)
    const sc='#E3612C';A('chest',new T.TorusGeometry(.222,.034,12,36),sc,{p:[0,.5,.03],r:[Math.PI/2+.25,0,0],s:[.93,.96,.62]});
    A('chest',sph(),sc,{p:[0,.47,.262],s:[.05,.045,.04]});
    A('chest',new T.ConeGeometry(.07,.15,4),'#D8562A',{p:[-.035,.395,.262],r:[0,0,-.28],s:[1,1,.32]});A('chest',new T.ConeGeometry(.064,.13,4),'#D8562A',{p:[.04,.405,.258],r:[0,0,.34],s:[1,1,.3]});
    // mochila nas costas
    const bp='#8E6C3E',bp2='#765630';A('chest',rbox(.38,.33,.14,.055),bp,{p:[0,.36,-.275]});A('chest',rbox(.36,.12,.155,.045),bp2,{p:[0,.47,-.275],r:[.1,0,0]});
    A('chest',rbox(.22,.13,.06,.025),bp2,{p:[0,.3,-.355]});A('chest',rbox(.05,.02,.02,.006),'#4A3420',{p:[0,.36,-.384],ol:false});
    for(const s of [1,-1]){A('chest',rbox(.075,.15,.11,.03),bp2,{p:[s*.215,.33,-.255]});A('chest',rbox(.03,.12,.03,.01),'#5A3A20',{p:[s*.09,.39,-.35],ol:false})}
    A('chest',new T.CapsuleGeometry(.05,.33,4,12),'#6E5A3A',{p:[0,.555,-.255],r:[0,0,Math.PI/2]});
    for(const s of [1,-1])A('chest',new T.TorusGeometry(.05,.008,6,14),'#4A3420',{p:[s*.12,.555,-.255],r:[0,Math.PI/2,0],ol:false});
    // fivela do cinto, mapa e bolsinha
    A('hips',rbox(.07,.045,.016,.007),'#9C9C98',{p:[0,.2,.258]});A('hips',rbox(.04,.02,.018,.004),'#5A4A3A',{p:[0,.2,.262],ol:false});
    A('hips',rbox(.075,.08,.06,.022),'#B9A374',{p:[.235,.16,.1],r:[0,.5,0]});A('hips',rbox(.06,.02,.065,.008),'#9C8658',{p:[.235,.205,.1],r:[0,.5,0],ol:false})}
  else if(sk===2){// MAROMBEIRO: só a fivela (o resto é corpo e short pintado)
    A('hips',rbox(.075,.05,.016,.008),'#9A9A9A',{p:[0,.205,.262]});A('hips',rbox(.045,.024,.018,.005),'#6A6A6A',{p:[0,.205,.266],ol:false})}
  else if(sk===3){// SUPER-CAPI: botões dourados da capa, fivela com estrela e bolsinhas do cinto
    const gd='#E9B43A',gd2='#C48A1C';for(const s of [1,-1]){A('chest',new T.CylinderGeometry(.04,.04,.02,24),gd,{p:[s*.2,.5,.15],r:[Math.PI/2-.55,0,-s*.5]});
      A('chest',star(.026,.011,.006),gd2,{p:[s*.205,.505,.162],r:[-.55,s*.4,0],ol:false})}
    A('hips',rbox(.085,.06,.02,.01),gd,{p:[0,.205,.262]});A('hips',star(.022,.009,.006),gd2,{p:[0,.205,.272],ol:false});
    for(const s of [1,-1]){A('hips',rbox(.065,.055,.045,.014),'#7B4A27',{p:[s*.14,.2,.225],r:[0,s*.55,0]});A('hips',sph(8,6),gd,{p:[s*.142,.215,.25],s:[.009,.009,.009],r:[0,s*.55,0],ol:false})}}
  else if(sk===5){// DINO: capuz com dentes, olhos e espinhos; cauda; garrinhas
    const gr='#4E8B3B',gr2='#41782F',sp='#DA5A2C',th='#EFE3C2';
    A('head',shell(.262,.255,.262,(x,y,z)=>z>.34&&y<.5&&y>-.92),gr,{p:[0,.7,.05],ds:true});
    // focinho do dino por cima da testa + sobrancelhas + narinas
    A('head',sph(26,16),gr,{p:[0,.905,.17],s:[.215,.1,.235]});A('head',sph(20,12),gr2,{p:[0,.885,.33],s:[.15,.06,.09],ol:false});
    for(const s of [1,-1]){A('head',sph(),gr,{p:[s*.13,.975,.22],s:[.07,.05,.075]});A('head',sph(12,8),'#FFC82E',{p:[s*.142,.985,.255],s:[.042,.042,.04]});
      A('head',sph(8,6),'#1A1208',{p:[s*.146,.985,.292],s:[.009,.03,.008],ol:false});A('head',sph(6,4),'#FFFFFF',{p:[s*.135,1.0,.29],s:[.008,.008,.006],ol:false});
      A('head',sph(8,6),'#22301A',{p:[s*.05,.93,.395],s:[.016,.01,.012],ol:false})}
    // dentes de cima (pendurados na borda do focinho) e de baixo (na mandíbula)
    for(let i=0;i<9;i++){const a=-1.22+i*2.44/8,x=Math.sin(a)*.2,z=.17+Math.cos(a)*.205;A('head',new T.ConeGeometry(.022,.065,6),th,{p:[x,.8,z],r:[Math.PI,0,0],ol:i%2===0})}
    const jaw=new T.CatmullRomCurve3([new T.Vector3(-.235,.69,.13),new T.Vector3(-.2,.58,.27),new T.Vector3(0,.535,.36),new T.Vector3(.2,.58,.27),new T.Vector3(.235,.69,.13)]);
    A('head',new T.TubeGeometry(jaw,40,.04,10,false),gr,{});
    for(let i=1;i<8;i++){const q=jaw.getPoint(i/8);A('head',new T.ConeGeometry(.018,.05,6),th,{p:[q.x,q.y+.045,q.z+.005],r:[0,0,0],ol:i%2===1})}
    // espinhos: cabeça → costas
    const fin=(bone,p,r,s=1)=>A(bone,new T.ConeGeometry(.05*s,.1*s,4),sp,{p,r,s:[.38,1,1]});
    fin('head',[0,1.0,.12],[-.2,0,0],.8);fin('head',[0,1.0,.0],[-.55,0,0],.95);fin('head',[0,.93,-.13],[-1.0,0,0],1);fin('head',[0,.8,-.21],[-1.35,0,0],.95);
    fin('chest',[0,.46,-.2],[-1.45,0,0],1);fin('chest',[0,.37,-.235],[-1.55,0,0],.95);fin('spine',[0,.28,-.245],[-1.6,0,0],.9);fin('spine',[0,.21,-.255],[-1.65,0,0],.8);
    // garras
    for(const s of [1,-1]){const hb=s>0?'handL':'handR',fb=s>0?'footL':'footR';for(let k=-1;k<=1;k++){A(hb,new T.ConeGeometry(.013,.04,6),th,{p:[s*(.318+k*.018),.165,.142-Math.abs(k)*.01],r:[Math.PI/2+.5,0,0],ol:false});
        A(fb,new T.ConeGeometry(.016,.045,6),th,{p:[s*.099+k*.034,.022,.125],r:[Math.PI/2-.15,0,0],ol:false})}}}
  else if(sk===6){// CAPITÃO PIRATA: chapéu de três pontas com caveira, tapa-olho, papagaio no ombro, fivela dourada
    const bk='#26202E',gd='#E9B43A';
    A('head',new T.CylinderGeometry(.16,.19,.11,28),bk,{p:[0,.92,.07],s:[1,1,1.05]});
    A('head',new T.CylinderGeometry(.3,.3,.022,3),bk,{p:[0,.868,.07],r:[0,Math.PI/6+Math.PI,0],s:[1,1,1.05]});
    const V=[[0,.33],[.29,-.17],[-.29,-.17]];for(let i=0;i<3;i++){const a=V[i],b2=V[(i+1)%3],mx=(a[0]+b2[0])/2,mz=(a[1]+b2[1])/2,L=Math.hypot(b2[0]-a[0],b2[1]-a[1]),ang=Math.atan2(b2[0]-a[0],b2[1]-a[1]);
      A('head',new T.CapsuleGeometry(.04,L*.82,4,10),bk,{p:[mx*1.02,.905,.07+mz*1.02],r:[Math.PI/2,ang,0]});
      A('head',new T.CapsuleGeometry(.011,L*.8,3,8),gd,{p:[mx*1.1,.935,.07+mz*1.1],r:[Math.PI/2,ang,0],ol:false})}
    A('head',sph(12,10),'#F4EFE6',{p:[0,.925,.235],s:[.034,.032,.016]});for(const sx of [1,-1])A('head',sph(8,6),'#1A1208',{p:[sx*.012,.93,.248],s:[.008,.009,.004],ol:false});
    for(const sx of [1,-1])A('head',new T.CapsuleGeometry(.005,.03,2,6),'#F4EFE6',{p:[0,.895,.238],r:[0,0,sx*.9],ol:false});
    // tapa-olho no olho direito (a alça é pintada na cabeça)
    {const n=new T.Vector3(-.8,.36,.4).normalize().add(new T.Vector3(0,.1,.45)).normalize(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),n),e=new T.Euler().setFromQuaternion(q,'YXZ');
      A('head',new T.CylinderGeometry(.058,.058,.014,22),'#16121C',{p:[-.138+n.x*.035,.785+n.y*.035,.214+n.z*.035],r:[e.x,e.y,e.z]})}
    // papagaio no ombro esquerdo
    const pg='#2FB34A',pr='#E23B2E',pb='#2D6BE0',py='#FFC531';
    A('chest',sph(),pg,{p:[.2,.585,.0],s:[.05,.075,.055],r:[.2,0,0]});A('chest',sph(),pr,{p:[.2,.67,.025],s:[.042,.042,.042]});
    A('chest',new T.ConeGeometry(.016,.04,8),py,{p:[.2,.66,.072],r:[Math.PI/2+.5,0,0]});
    for(const sx of [1,-1]){A('chest',sph(8,6),'#FFFFFF',{p:[.2+sx*.03,.68,.048],s:[.012,.012,.008],ol:false});A('chest',sph(6,4),'#111111',{p:[.2+sx*.033,.68,.054],s:[.006,.006,.004],ol:false});
      A('chest',sph(),pb,{p:[.2+sx*.045,.58,-.005],s:[.016,.055,.04],r:[.25,0,sx*.15]})}
    A('chest',new T.ConeGeometry(.03,.14,4),pb,{p:[.2,.49,-.05],r:[Math.PI-.35,0,0],s:[1,1,.4]});A('chest',new T.ConeGeometry(.022,.12,4),pr,{p:[.2,.5,-.03],r:[Math.PI-.2,0,0],s:[1,1,.4],ol:false});
    for(const sx of [1,-1])A('chest',new T.ConeGeometry(.01,.03,6),'#3A3A3A',{p:[.2+sx*.02,.515,.02],r:[Math.PI,0,0],ol:false});
    A('hips',rbox(.08,.055,.016,.008),gd,{p:[0,.21,.262]});A('hips',rbox(.045,.028,.018,.005),'#2A1A12',{p:[0,.21,.266],ol:false});
    for(const sx of [1,-1])A('hips',new T.ConeGeometry(.03,.11,4),'#C8282E',{p:[sx*.06+.15,.15,.21],r:[0,0,sx*.2],s:[1,1,.3],ol:false})}
  else if(sk===7){// ASTRONAUTA: capacete de vidro, gola, mochila de oxigênio com tanques, antena e mangueiras
    const wh='#F1F3F7',gy='#AEB6C3',dk='#3A4150';
    A('head',sph(36,24),'#CFE8FF',{p:[0,.7,.11],s:[.345,.34,.345],gl:true});
    A('head',sph(10,8),'#FFFFFF',{p:[-.17,.93,.27],s:[.06,.028,.012],r:[.6,-.5,.4],ol:false});
    A('chest',new T.TorusGeometry(.245,.045,12,40),gy,{p:[0,.5,.06],r:[Math.PI/2+.18,0,0],s:[1.05,1,.9]});
    A('chest',new T.TorusGeometry(.245,.014,8,40),'#E9B43A',{p:[0,.53,.06],r:[Math.PI/2+.18,0,0],s:[1.05,1,.9],ol:false});
    A('chest',rbox(.36,.38,.16,.06),wh,{p:[0,.37,-.29]});A('chest',rbox(.22,.12,.03,.02),dk,{p:[0,.42,-.37]});
    for(let i=0;i<3;i++)A('chest',sph(8,6),['#FF4F4F','#6CF06A','#45D4FF'][i],{p:[-.06+i*.06,.42,-.385],s:[.016,.016,.01],ol:false});
    for(const sx of [1,-1]){A('chest',new T.CapsuleGeometry(.05,.22,4,12),gy,{p:[sx*.2,.36,-.3]});
      A('chest',new T.TorusGeometry(.1,.016,8,20,Math.PI*.9),dk,{p:[sx*.19,.5,-.17],r:[0,Math.PI/2,Math.PI*.55],ol:false})}
    A('chest',new T.CylinderGeometry(.008,.008,.16,6),gy,{p:[.12,.62,-.3],ol:false});A('chest',sph(10,8),'#FF4F4F',{p:[.12,.705,-.3],s:[.022,.022,.022]});
    A('hips',rbox(.09,.05,.02,.01),gy,{p:[0,.205,.262]})}
  return b.build()}
function restOf(B){const o={};for(const k in B){let v=B[k].userData.rest.clone(),p=B[k].parent;while(p&&p.isBone&&p.userData.rest){v.add(p.userData.rest);p=p.parent}o[k]=[v.x,v.y,v.z]}return o}
const CACHE={};
// cauda do dino: 5 segmentos em cadeia (cada um um grupo que gira), com espinhos em cima
function tail(A,rest){const m=mats(),g0=new T.Group(),h=rest.hips;g0.position.set(0-h[0],.15-h[1],-.235-h[2]);A.B.hips.add(g0);let par=g0;const segs=[],L=[.11,.1,.09,.08,.07],R=[.085,.07,.055,.04,.026];
  if(!CACHE.tail){CACHE.tail=L.map((l,i)=>{const bd=Builder({x:[0,0,0]});bd.add('x',new T.CylinderGeometry(R[i+1]||.008,R[i],l,14,1,false).rotateX(-Math.PI/2).translate(0,0,-l/2),'#4E8B3B');
      bd.add('x',sph(14,10),'#4E8B3B',{p:[0,0,-l],s:[R[i+1]||.01,R[i+1]||.01,R[i+1]||.01]});
      bd.add('x',new T.ConeGeometry(.035*(1-i*.14),.075*(1-i*.14),4),'#DA5A2C',{p:[0,R[i]*.85,-l*.5],r:[-.35,0,0],s:[.38,1,1]});
      bd.add('x',sph(12,8),'#E8C98A',{p:[0,-R[i]*.5,-l*.5],s:[R[i]*.75,R[i]*.5,l*.5],ol:false});return bd.build()[0]})}
  for(let i=0;i<L.length;i++){const g=new T.Group();if(i)g.position.z=-L[i-1];par.add(g);const c=CACHE.tail[i],me=new T.Mesh(c.geo,m.acc);me.castShadow=true;me.frustumCulled=false;g.add(me);
    if(c.ogeo&&A.outline){const o=new T.Mesh(c.ogeo,m.out);o.frustumCulled=false;g.add(o)}segs.push(g);par=g}
  return{root:g0,segs}}

// ---------- aplicar / tirar ----------
function clear(A){if(A.skObjs){for(const o of A.skObjs)if(o.parent)o.parent.remove(o);A.skObjs=null}if(A.skCape){A.skCape.material.dispose();A.skCape=null}A.skTail=null;
  if(A.skBones){for(const k in A.skBones){const b=A.B[k];if(b)b.scale.set(1,1,1)}A.skBones=null}}
function set(A,sk){sk=sk|0;if(!DEF[sk])sk=0;if(A.skId===sk||!T)return;clear(A);A.skId=sk;const D=DEF[sk],u=A.mat&&A.mat.userData.sty;if(u&&u.uSk)u.uSk.value=sk;
  A.noHat=!!D&&D.hat===false;A.setHat(A.hatWant!==false);
  A.skinEye=D?D.eye:null;if(A.E3){A.E3.key='';CapyRig.setEyes(A,A.E3.raw||null);const eu=A.E3.mat.userData.eu;if(eu&&eu.uLidOn){eu.uLidOn.value=D&&D.lid?1:0;eu.uLidC.value.set(D&&D.lid||'#000000');eu.uGray.value=D&&D.gray?1:0}}
  if(!D)return;
  if(D.bones){A.skBones=D.bones;for(const k in D.bones){const b=A.B[k];if(b)b.scale.fromArray(D.bones[k])}}
  const m=mats();if(!CACHE[sk])CACHE[sk]=design(sk,A.B);A.skObjs=[];
  for(const c of CACHE[sk]){const bone=A.B[c.bone];if(!bone)continue;const me=new T.Mesh(c.geo,c.gl?m.glass:c.ds?m.ds:m.acc);me.castShadow=!c.gl&&A.body.castShadow;if(c.gl)me.renderOrder=6;me.frustumCulled=false;bone.add(me);A.skObjs.push(me);
    if(c.ogeo&&A.outline){const o=new T.Mesh(c.ogeo,m.out);o.frustumCulled=false;bone.add(o);A.skObjs.push(o)}}
  const rest=restOf(A.B);
  if(sk===1){const card=new T.Mesh(CACHE.card||(CACHE.card=new T.PlaneGeometry(.085,.1)),m.map),h=rest.hips;card.position.set(-.215-h[0],.13-h[1],.17-h[2]);card.rotation.set(-.05,-.75,.08);A.B.hips.add(card);A.skObjs.push(card)}
  if(sk===3){const cm=capeMat(),cape=new T.Mesh(capeGeo(rest),cm);cape.castShadow=A.body.castShadow;cape.frustumCulled=false;A.B.chest.add(cape);A.skObjs.push(cape);A.skCape=cape}
  if(sk===5){const tl=tail(A,rest);A.skObjs.push(tl.root);A.skTail=tl}}
// animação secundária (capa e cauda): chamada pelo CapyRig.animate
function tick(A,s,dt,t,S){if(A.skCape){const u=A.skCape.material.userData.cu,k=Math.min(1,dt*6);u.uSpd.value+=(S.mv-u.uSpd.value)*k;u.uDash.value+=(S.dash-u.uDash.value)*k;
    const dy=Math.atan2(Math.sin(S.yaw-(S.pyaw==null?S.yaw:S.pyaw)),Math.cos(S.yaw-(S.pyaw==null?S.yaw:S.pyaw)))/Math.max(dt,1e-3);u.uTurn.value+=(Math.max(-1,Math.min(1,-dy*.12))-u.uTurn.value)*Math.min(1,dt*5);u.uPh.value=t+(S.mv*0)}
  if(A.skTail){const g=A.skTail.segs,mv=S.mv||0;for(let i=0;i<g.length;i++){const ph=t*(3.2+mv*5)-i*.7;g[i].rotation.set(i===0?.55-mv*.25:(.14-mv*.05)+Math.sin(ph*.5)*.03,Math.sin(ph)*(.16+mv*.18)*(i?1:.5),0)}}
  S.pyaw=S.yaw}
return{init,set,tick,NAMES,DEF}})();
