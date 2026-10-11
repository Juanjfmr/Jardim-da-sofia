// Missão contínua, com movimento de personagem, manipulação física leve,
// duas soluções para a ponte, resgate com seguimento e cenário de celebração.
// Desenhada em Canvas 2D: leve, offline e independente de WebGL.
import {
  initialTrail, sanitizeTrail, discoverTrailClue, placeTrailPiece,
  changeTrailBridge, moveTrailBranch, meetTrailFriend, escortTrailFriend,
  decorateTrail, finishTrail,
} from './trail-model.js';

const W = 700, H = 580;
const CLUES = [
  { id: 'ribbon', x: 205, y: 370, symbol: '🎀', voice: 'Uma fitinha! Tem uma pista por aqui.' },
  { id: 'bell', x: 465, y: 210, symbol: '🔔', voice: 'Um sininho! O Pipo passou por aqui.' },
  { id: 'acorn', x: 595, y: 425, symbol: '🌰', voice: 'Uma bolota! Agora sabemos por onde seguir.' },
];
const BRIDGE_SOCKETS = [{x:300,y:302},{x:354,y:289},{x:412,y:302}];
const DECOR = [{ id:'flower', x:235, y:330, symbol:'🌺' }, { id:'lantern',x:350,y:265,symbol:'🏮' }, { id:'ribbon',x:465,y:330,symbol:'🎀' }];
const SCENE_VOICES = {
  forest: 'Toque na trilha para caminhar e encontrar três pistas do Pipo.',
  river: 'Arraste troncos ou folhas para criar a travessia do rio.',
  meadow: 'Afaste o galho, encontre o Pipo e leve seu amigo até casa.',
  party: 'Arraste as três surpresas para preparar a festa do Pipo.',
};
const SCENE_LABEL = {forest:'Bosque das pistas',river:'A travessia do rio',meadow:'Resgate no campo',party:'Festa no jardim'};
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const path = (c,points,fill,stroke,width=1) => {
  c.beginPath(); c.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++) c.lineTo(points[i][0],points[i][1]);
  c.closePath(); if(fill){c.fillStyle=fill;c.fill()} if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}
};
const rounded = (c,x,y,w,h,r,fill) => {
  c.fillStyle=fill; c.beginPath();c.roundRect(x,y,w,h,r);c.fill();
};
const ellipse = (c,x,y,rx,ry,color) => {c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()};
function leaf(c,x,y,s=1,col='#66a66b',rot=0) {
  c.save();c.translate(x,y);c.rotate(rot);c.scale(s,s);
  ellipse(c,0,0,15,8,col);c.strokeStyle='#d0e9a4';c.lineWidth=1.4;c.beginPath();c.moveTo(-12,0);c.lineTo(12,0);c.stroke();c.restore();
}
function flower(c,x,y,s=1,shade='#f6b2c1',phase=0){
  c.save();c.translate(x,y);c.scale(s,s);
  c.strokeStyle='#5f925f';c.lineWidth=3;c.beginPath();c.moveTo(0,3);c.quadraticCurveTo(6,18,0,28);c.stroke();
  for(let a=0;a<6;a++){const t=a*Math.PI/3+Math.sin(phase)*.04;ellipse(c,Math.cos(t)*10,Math.sin(t)*10,9,8,shade)}
  ellipse(c,0,0,7,7,'#fbd16e');c.restore();
}
function tree(c,x,y,r=1,t=0){
  c.save();c.translate(x,y);c.scale(r,r);
  ellipse(c,0,15,63,17,'rgba(40,88,58,.14)');
  rounded(c,-13,-108,26,121,12,'#98704b');rounded(c,-8,-110,9,104,5,'#bd9670');
  ellipse(c,-33,-139,60,60,'#6d9d72');ellipse(c,32,-146,61,63,'#7eaf7a');
  ellipse(c,0,-184,68,66,'#8fc38a');ellipse(c,-18,-178,30,34,'#a9d5a0');
  for(const [px,py] of [[-40,-160],[36,-128],[-4,-213]])ellipse(c,px,py+Math.sin(t)*1,5,4,'#ebbf71');
  c.restore();
}
function cloud(c,x,y,s){
  c.save();c.translate(x,y);c.scale(s,s);
  ellipse(c,-26,4,37,20,'rgba(255,255,255,.73)');ellipse(c,10,-9,42,29,'rgba(255,255,255,.86)');
  ellipse(c,48,4,35,20,'rgba(255,255,255,.82)');c.restore();
}
function pup(c,x,y,t,excited=false){
  c.save();c.translate(x,y+Math.sin(t*7)*(excited?6:2));
  ellipse(c,0,31,50,12,'rgba(46,80,59,.18)');
  // Corpo, pata e rabinho — desenho original para esta missão, sem asset de franquia.
  c.save();c.translate(30,4);c.rotate(-.2+Math.sin(t*10)*.25);ellipse(c,23,0,25,8,'#a77850');c.restore();
  ellipse(c,0,3,45,32,'#c89566');ellipse(c,0,-5,38,20,'#f5c792');
  rounded(c,-35,0,68,28,13,'#568bc1');rounded(c,-9,0,28,28,7,'#e6bd67');
  for(const px of [-29,24]){rounded(c,px,18,16,17,6,'#b77a50');ellipse(c,px+8,33,12,5,'#f6dab2')}
  ellipse(c,-13,-42,46,44,'#cb9769');
  c.save();c.translate(-43,-51);c.rotate(-.35+Math.sin(t*4)*.08);ellipse(c,-3,5,15,35,'#885d47');c.restore();
  c.save();c.translate(24,-54);c.rotate(.5-Math.sin(t*4)*.08);ellipse(c,5,2,14,35,'#885d47');c.restore();
  ellipse(c,-8,-44,31,29,'#eac397');ellipse(c,-11,-25,22,14,'#fff0d4');
  for(const px of [-28,6]){ellipse(c,px,-51,6,8,'#493b37');ellipse(c,px+2,-54,2.5,3,'#fff')}
  ellipse(c,-10,-33,10,7,'#66493e');
  c.strokeStyle='#66493e';c.lineWidth=2;c.beginPath();c.moveTo(-10,-27);c.quadraticCurveTo(-12,-19,-22,-20);c.stroke();
  // Coleira de patrulha genérica.
  rounded(c,-33,-11,47,10,5,'#e8ad4b');ellipse(c,-7,-6,7,7,'#fff4c9');
  c.restore();
}
function bunny(c,x,y,t){
  c.save();c.translate(x,y+Math.sin(t*4)*3);
  ellipse(c,0,35,33,10,'rgba(40,80,60,.14)');
  ellipse(c,-14,-75,13,41,'#fff4e2');ellipse(c,16,-80,13,46,'#fff4e2');
  ellipse(c,-14,-77,7,31,'#e9a6ae');ellipse(c,16,-82,7,36,'#e9a6ae');
  ellipse(c,0,7,28,32,'#fff9e8');ellipse(c,0,-32,38,38,'#fffaf0');
  ellipse(c,-28,27,15,9,'#fff4e2');ellipse(c,25,28,15,9,'#fff4e2');
  for(const px of [-15,15]){ellipse(c,px,-38,5,7,'#453f3f');ellipse(c,px+1,-41,2,2,'#fff')}
  ellipse(c,0,-22,6,5,'#e49da2');ellipse(c,-23,-22,9,5,'#f8d9cf');ellipse(c,23,-22,9,5,'#f8d9cf');
  c.strokeStyle='#85595b';c.lineWidth=2;c.beginPath();c.moveTo(0,-18);c.quadraticCurveTo(7,-12,12,-18);c.stroke();c.restore();
}
function paintBackdrop(c,scene,t,viewW=W,viewH=H,ox=0,oy=0){
  // Cenário panorâmico responsivo, mantendo personagens proporcionais.
  const sky=c.createLinearGradient(0,0,0,viewH);
  sky.addColorStop(0,scene==='river'?'#9dcde2':'#a6d8dd');
  sky.addColorStop(.40,'#e1eccd');
  sky.addColorStop(1,'#a7ce91');
  c.fillStyle=sky;c.fillRect(0,0,viewW,viewH);
  const dx=reduceMotion()?0:Math.sin(t/12)*12;
  cloud(c,ox+120+dx,Math.max(45,oy-55),1.15);
  cloud(c,ox+510-dx,Math.max(65,oy+78),.85);
  ellipse(c,ox+558,oy+68,36,36,'#ffde91');
  c.fillStyle='#b7d69d';c.beginPath();c.moveTo(0,oy+265);
  c.quadraticCurveTo(ox+180,oy+145,ox+380,oy+244);
  c.quadraticCurveTo(ox+550,oy+150,viewW,oy+235);
  c.lineTo(viewW,viewH);c.lineTo(0,viewH);c.fill();
  c.fillStyle='#8fbc8a';c.beginPath();c.moveTo(0,oy+328);
  c.quadraticCurveTo(ox+210,oy+245,ox+410,oy+310);
  c.quadraticCurveTo(ox+570,oy+245,viewW,oy+304);
  c.lineTo(viewW,viewH);c.lineTo(0,viewH);c.fill();
  // A trilha sai da imagem central e continua na parte inferior da tela.
  if(scene==='forest'||scene==='meadow'){
    c.save();c.beginPath();c.moveTo(ox+105,viewH+40);
    c.quadraticCurveTo(ox-3,oy+570,ox+108,oy+490);
    c.strokeStyle='#dec899';c.lineWidth=100;c.lineCap='round';c.stroke();
    c.strokeStyle='#f1ddaf';c.lineWidth=83;c.stroke();c.restore();
  }
  for(let i=0;i<36;i++){
    const x=(i*163+27)%viewW;
    const span=Math.max(160,viewH-oy-350);
    const y=Math.min(viewH-18,oy+345+(i*79)%span);
    leaf(c,x,y,.33+(i%3)*.13,i%3?'#9dc989':'#c5df9c',i*.34);
  }
  for(let i=0;i<23;i++){
    const x=(i*211+46)%viewW;
    const y=Math.min(viewH-22,oy+410+(i*109)%Math.max(140,viewH-oy-415));
    flower(c,x,y,.29+(i%3)*.07,i%2?'#f2b5ad':'#f4df94',t+i);
  }
  if(oy>110){tree(c,ox+55,oy+220,.54,t);tree(c,ox+W-58,oy+205,.5,t);}
  if(viewH-oy-H>90){tree(c,Math.max(40,ox+58),viewH-90,.58,t);tree(c,Math.min(viewW-40,ox+W-70),viewH-98,.49,t);}
}
function roundedPath(c,points,color,w,dash=[]){
  c.save();c.beginPath();c.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length-1;i++){const mx=(points[i][0]+points[i+1][0])/2,my=(points[i][1]+points[i+1][1])/2;c.quadraticCurveTo(points[i][0],points[i][1],mx,my);}
  c.lineTo(points.at(-1)[0],points.at(-1)[1]);
  c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.setLineDash(dash);c.stroke();c.restore();
}
function label(c,text,x,y,fill='#fffef7'){
  c.save();c.font='700 19px Fredoka, sans-serif';const m=c.measureText(text).width;
  rounded(c,x-m/2-16,y-24,m+32,40,19,fill);c.fillStyle='#456c50';c.textAlign='center';c.fillText(text,x,y+2);c.restore();
}
function badge(c,symbol,x,y,t,active=true){
  if(!active)return;const pulse=1+Math.sin(t*3)*.08;
  ellipse(c,x,y,41*pulse,37*pulse,'rgba(255,255,255,.7)');
  c.save();c.font='38px serif';c.textAlign='center';c.fillText(symbol,x,y+13);c.restore();
}
function drawForest(c,s,t){
  roundedPath(c,[[85,490],[175,375],[370,390],[475,220],[605,422]],'#e7cf9a',82);
  roundedPath(c,[[85,490],[175,375],[370,390],[475,220],[605,422]],'#f4e2b8',65);
  tree(c,80,325,1.05,t);tree(c,618,282,.85,t);tree(c,360,200,.68,t);
  for(const x of [125,250,400,515]){leaf(c,x,520,.8);leaf(c,x+28,512,.5)}
  CLUES.forEach(cl=>badge(c,cl.symbol,cl.x,cl.y+Math.sin(t*3+cl.x)*4,t,!s.clues.includes(cl.id)));
  label(c,'Siga as pegadinhas',345,88);
  for(const [x,y] of [[126,468],[155,446],[290,390],[330,385],[405,310],[442,275]]){
    c.save();c.translate(x,y);c.rotate(-.4);ellipse(c,-9,-3,9,12,'rgba(141,103,70,.3)');
    for(const d of [-13,-4,7])ellipse(c,d,-18,4,5,'rgba(141,103,70,.3)');c.restore();
  }
}
function drawRiver(c,s,t){
  // Rio vertical com reflexos animados, pedras e duas opções de travessia.
  c.fillStyle='#d6c49a';c.fillRect(250,0,220,H);
  c.fillStyle='#81cbd5';c.fillRect(264,0,193,H);
  c.fillStyle='rgba(42,131,161,.15)';for(let i=0;i<7;i++)rounded(c,280+(i*61)%160,(i*107+Math.sin(t*2+i)*15)%H,60,7,5,'rgba(249,255,255,.55)');
  tree(c,96,255,.78,t);tree(c,610,255,.8,t);
  roundedPath(c,[[48,360],[205,326],[300,302],[412,302],[665,337]],'#e4d0a6',73);
  // Clarificar que o rio continua sob as peças (desenhar água novamente no meio).
  c.fillStyle='#83c9d9';c.fillRect(267,240,190,141);
  for(let i=0;i<3;i++){
    const p=BRIDGE_SOCKETS[i],done=s.pieces.includes(i);
    if(!done){ellipse(c,p.x,p.y,51,38,'rgba(255,255,255,.65)');ellipse(c,p.x,p.y,37,25,'rgba(94,167,169,.31)')}
    else drawPiece(c,s.bridge,p.x,p.y,t);
  }
  // Peças colocadas na margem: troncos ou folhas. É possível experimentar ambas.
  for(const method of ['logs','lilies'])for(let i=0;i<3;i++){
    if(s.bridge===method && s.pieces.includes(i))continue;
    const p=sourceFor(method,i);drawPiece(c,method,p.x,p.y,t);
  }
  label(c,'Faça uma ponte',350,84);
  bunny(c,603,394,t);badge(c,'🦆',550,465,t);
}
function sourceFor(method,index){
  return method==='logs'?{x:88+index*58,y:470+index%2*4}:{x:500+index*60,y:480-index%2*3};
}
function drawPiece(c,method,x,y,t){
  c.save();c.translate(x,y);
  if(method==='logs'){
    c.rotate(-.09);rounded(c,-52,-14,104,30,14,'#9f754a');rounded(c,-51,-13,104,11,8,'#c79c62');
    ellipse(c,-43,0,8,12,'#dfbd80');c.strokeStyle='#805b40';c.lineWidth=2;c.beginPath();c.arc(-43,0,4,0,6.28);c.stroke();
  }else{
    ellipse(c,0,3,43,27,'#5aaf7b');ellipse(c,-6,-2,36,21,'#87c786');
    c.strokeStyle='#caeb9b';c.lineWidth=2;c.beginPath();c.moveTo(-24,10);c.lineTo(28,-7);c.stroke();
    c.font='24px serif';c.fillText('🌼',2,-4);
  }
  c.restore();
}
function drawMeadow(c,s,t,pipo){
  roundedPath(c,[[85,457],[212,390],[357,370],[520,385],[615,452]],'#e0c495',90);
  roundedPath(c,[[85,457],[212,390],[357,370],[520,385],[615,452]],'#f3ddb5',73);
  tree(c,85,245,.8,t);tree(c,613,252,.86,t);
  // Caminho bloqueado até a criança arrastar o galho.
  if(!s.obstacle){c.save();c.translate(348,368);c.rotate(-.13);
    rounded(c,-80,-14,160,28,12,'#92734f');c.strokeStyle='#6b583d';c.lineWidth=7;
    for(const sign of [-1,1]){c.beginPath();c.moveTo(0,0);c.lineTo(sign*58,-55);c.stroke();leaf(c,sign*58,-55,1.7)}c.restore();
    badge(c,'👆',361,293,t);
  }
  if(!s.friend){bunny(c,548,332,t);badge(c,'💛',555,243,t)}else{bunny(c,pipo.x,pipo.y,t);}
  // Casa com iluminação e porta que abre quando Pipo se aproxima.
  rounded(c,578,385,92,95,12,'#ffe6aa');
  path(c,[[565,390],[625,331],[684,390]],'#cb8175');
  rounded(c,611,424,29,55,12,s.escorted?'#8dc88c':'#9a735c');
  ellipse(c,635,450,3,3,'#eed584');
  label(c,s.friend?'Leve o Pipo para casa':'Vamos ajudar o Pipo',348,84);
  flower(c,510,472,1.1,'#f2a7c0',t);flower(c,235,475,1.1,'#ffe39e',t);
}
function drawParty(c,s,t){
  roundedPath(c,[[88,500],[200,405],[351,385],[510,406],[626,495]],'#e2cda7',130);
  tree(c,75,276,.85,t);tree(c,627,277,.9,t);
  rounded(c,285,275,131,112,13,'#fff0bc');
  path(c,[[272,285],[350,212],[429,285]],'#db8a79');
  rounded(c,335,332,30,55,9,'#947659');
  bunny(c,435,400,t);pup(c,255,413,t,true);
  c.save();c.strokeStyle='#e5a7b5';c.lineWidth=4;c.beginPath();c.moveTo(70,170);c.quadraticCurveTo(355,240,630,170);c.stroke();c.restore();
  for(let i=0;i<8;i++){const x=85+i*77,y=173+Math.sin(i/7*Math.PI)*34;badge(c,['🌼','⭐','🎈'][i%3],x,y,t*.5,true)}
  for(const d of DECOR){
    const placed=s.decorations.includes(d.id);
    if(placed)badge(c,d.symbol,d.x,d.y,t);
    else{const src=partySource(d.id);badge(c,d.symbol,src.x,src.y,t)}
  }
  label(c,'Nossa festa!',348,84);
}
function partySource(id){return { flower:{x:160,y:516},lantern:{x:350,y:516},ribbon:{x:540,y:516} }[id];}

export function createTrailMission(ctx) {
  return function trail(cur) {
    if (ctx.state().trail?.finished) ctx.update(s=>({ ...s, trail:initialTrail() }));
    else if (!ctx.state().trail) ctx.update(s=>({...s,trail:initialTrail()}));
    let s=sanitizeTrail(ctx.state().trail);
    const body=ctx.body();
    body.innerHTML='<div class="trail-wrap"><div class="trail-ribbon"><span class="trail-chapter"></span><span class="trail-progress"></span></div>'
      +'<div class="trail-board"><canvas class="trail-canvas" width="700" height="580" role="img" aria-label="Mapa interativo da missão: mova o cão pelo cenário com o dedo ou clique nos objetos."></canvas>'
      +'<div class="trail-toast" aria-live="polite" hidden></div></div>'
      +'<div class="trail-actions"><button type="button" class="trail-hint">💡 Me ajuda</button>'
      +'<button type="button" class="trail-alternate" hidden>Outra ponte</button>'
      +'<button type="button" class="trail-next" hidden>Vamos lá! ➜</button></div></div>';
    const wrap=body.querySelector('.trail-wrap'), canvas=body.querySelector('.trail-canvas'), c=canvas.getContext('2d');
    const hint=body.querySelector('.trail-hint'), alternate=body.querySelector('.trail-alternate');
    const next=body.querySelector('.trail-next'), bubble=body.querySelector('.trail-toast');
    if (!c) {body.textContent='Este aparelho não conseguiu abrir a missão.';return;}
    const dog={x:100,y:460,tx:100,ty:460}, friend={x:548,y:332};
    const drag={id:null,index:-1,method:'',x:0,y:0,moving:false};
    let raf=0, last=0, time=0, disposed=false, messageTimeout=0, surprise=0;
    let viewW=W, viewH=H, offsetX=0, offsetY=0, waypoint=null;
    const board=body.querySelector('.trail-board');
    function resizeCanvas(){
      const rect=board.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const ratio=rect.width/rect.height;
      const w=Math.max(W,Math.round(H*ratio));
      const h=Math.max(H,Math.round(W/ratio));
      if(viewW===w&&viewH===h)return;
      viewW=w;viewH=h;offsetX=(w-W)/2;offsetY=(h-H)*.38;
      canvas.width=w;canvas.height=h;
      canvas.dataset.sceneOffsetX=String(offsetX);
      canvas.dataset.sceneOffsetY=String(offsetY);
    }
    resizeCanvas();
    const resizer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(resizeCanvas);
    resizer?.observe(board);
    const alive=()=>!disposed && ctx.current()===cur;
    const store=fn=>{
      if(!alive())return;
      const prev=s.scene;
      ctx.update(state=>({ ...state, trail:fn(state.trail) }));
      s=sanitizeTrail(ctx.state().trail);
      if(s.scene!==prev){
        dog.x=100;dog.y=460;dog.tx=100;dog.ty=460;friend.x=548;friend.y=332;
        ctx.audio.good();ctx.react('happy');sayScene();
      }
      refresh();
    };
    const say=(spoken,visual=spoken)=>{
      if(!alive())return;
      ctx.instruct(visual,spoken);
    };
    function note(text){
      bubble.textContent=text;bubble.hidden=false;clearTimeout(messageTimeout);
      messageTimeout=setTimeout(()=>{if(alive())bubble.hidden=true},2000);
    }
    const sayScene=()=>say(SCENE_VOICES[s.scene]);
    function refresh(){
      const count={forest:s.clues.length,river:s.pieces.length,meadow:Number(s.obstacle)+Number(s.friend)+Number(s.escorted),party:s.decorations.length}[s.scene];
      wrap.querySelector('.trail-chapter').textContent=SCENE_LABEL[s.scene];
      wrap.querySelector('.trail-progress').textContent='●'.repeat(count)+'○'.repeat(3-count);
      alternate.hidden=s.scene!=='river' || !s.bridge || s.pieces.length===3;
      next.hidden=true;
      next.textContent='Vamos lá! ➜';
      if(s.scene==='party'&&s.decorations.length===3){next.hidden=false;next.textContent='Presentear o Pipo 🌸'}
    }
    function effect(words){ctx.audio.sparkle();ctx.audio.haptic(12);note(words);}
    function target(x,y){dog.tx=clamp(x,58,644);dog.ty=clamp(y,185,505);waypoint={x:dog.tx,y:dog.ty,at:time};}
    function hintAction(){
      if(s.scene==='forest'){
        const cl=CLUES.find(x=>!s.clues.includes(x.id));
        if(cl)target(cl.x,cl.y);
        say('Vamos farejar uma pista. Siga a bolinha brilhante!');
      }else if(s.scene==='river'){
        if(!s.bridge){say('Você pode usar troncos ou folhas. Arraste uma peça sobre o rio!');return;}
        const i=[0,1,2].find(x=>!s.pieces.includes(x));
        if(i!==undefined){store(a=>placeTrailPiece(a,s.bridge,i));effect('Encaixou!')}
      }else if(s.scene==='meadow'){
        if(!s.obstacle){store(moveTrailBranch);effect('O caminho abriu!');say('Você tirou o galho. Agora chegue perto do Pipo!')}
        else if(!s.friend){target(548,332);say('Vá até o Pipo para buscá-lo!')}
        else{target(617,470);say('Leve o Pipo até a porta da casinha!')}
      }else say('Arraste os presentes da mesa para os círculos de festa!');
    }
    hint.addEventListener('click',hintAction);
    alternate.addEventListener('click',()=>{store(changeTrailBridge);effect('Você pode experimentar outro jeito!');say(SCENE_VOICES.river)});
    next.addEventListener('click',()=>{
      if(!alive()||s.scene!=='party'||s.decorations.length!==3)return;
      store(finishTrail);
      cur.cleanup?.();
      document.querySelector('#activity-modal .activity-card')?.classList.add('trail-finished');
      ctx.success('trail','Você encontrou o Pipo, atravessou o rio e preparou uma festa juntos!','🐾');
    });
    const local=e=>{
      const r=canvas.getBoundingClientRect();
      return { x:clamp((e.clientX-r.left)/r.width*viewW-offsetX,0,W),y:clamp((e.clientY-r.top)/r.height*viewH-offsetY,0,H) };
    };
    const pick=(p)=>{
      if(s.scene==='river'){
        let nearest=null,dist=72;
        for(const method of ['logs','lilies'])for(let i=0;i<3;i++){
          if(s.bridge && s.bridge!==method || s.pieces.includes(i))continue;
          const pt=sourceFor(method,i), d=distance(p,pt);
          if(d<dist){dist=d;nearest={id:'bridge',method,index:i,...pt}}
        }
        return nearest;
      }
      if(s.scene==='meadow'&&!s.obstacle&&distance(p,{x:350,y:368})<103)
        return {id:'branch',x:350,y:368};
      if(s.scene==='party'){
        for(const item of DECOR){
          const pt=partySource(item.id);
          if(!s.decorations.includes(item.id)&&distance(p,pt)<61)return {id:'decor',method:item.id,...pt};
        }
      }
      return null;
    };
    canvas.addEventListener('pointerdown',e=>{
      if(!alive()||(e.pointerType==='mouse'&&e.button!==0))return;
      e.preventDefault();canvas.setPointerCapture?.(e.pointerId);
      const p=local(e),obj=pick(p);
      drag.id=obj?.id||'walk';drag.method=obj?.method||'';drag.index=obj?.index??-1;
      drag.x=p.x;drag.y=p.y;drag.moving=false;
      if(drag.id==='walk')target(p.x,p.y);
    });
    canvas.addEventListener('pointermove',e=>{
      if(!drag.id||!alive())return;
      e.preventDefault();const p=local(e);
      drag.moving ||=distance({x:drag.x,y:drag.y},p)>12;
      if(drag.id==='walk'){target(p.x,p.y)} else if(drag.moving){drag.x=p.x;drag.y=p.y}
    });
    const endDrag=e=>{
      if(!drag.id||!alive())return;
      const p=local(e),id=drag.id,method=drag.method,index=drag.index,moved=drag.moving;
      drag.id=null;
      if(id==='bridge'){
        let best=-1,bestDist=105;
        for(let i=0;i<3;i++){const d=distance(p,BRIDGE_SOCKETS[i]);if(!s.pieces.includes(i)&&d<bestDist){best=i;bestDist=d}}
        if(!moved)best=[0,1,2].find(i=>!s.pieces.includes(i))??-1;
        if(best>=0){store(a=>placeTrailPiece(a,method,best));effect('Boa! A ponte está crescendo!');if(s.scene==='meadow')note('Os patinhos conseguiram atravessar!')}
        else note('Experimente soltar no círculo brilhante!');
      }else if(id==='branch'){
        if(!moved||distance(p,{x:350,y:368})>100){store(moveTrailBranch);effect('Você abriu o caminho!');say('Agora vá encontrar o Pipo!')}
        else note('Puxe o galho para o lado!');
      }else if(id==='decor'){
        const slot=DECOR.find(d=>d.id===method);
        if(!moved||distance(p,slot)<110){store(a=>decorateTrail(a,method));effect('Que bonito!');if(s.decorations.length===3)say('A festa ficou linda! Toque em Presentear o Pipo quando quiser.')}
        else note('Coloque o presente sobre o círculo brilhante!');
      }
    };
    canvas.addEventListener('pointerup',endDrag);
    canvas.addEventListener('pointercancel',()=>{drag.id=null});
    // Funciona também com teclado / tecnologias assistivas sem exigir precisão motora.
    canvas.tabIndex=0;
    canvas.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();hintAction()}});
    function update(dt){
      if(!alive())return;
      const d=distance(dog,{x:dog.tx,y:dog.ty});
      if(s.scene==='forest'||s.scene==='meadow'){
        const speed=(reduceMotion()?300:190)*dt;
        if(d>2){const k=Math.min(1,speed/d);dog.x+=(dog.tx-dog.x)*k;dog.y+=(dog.ty-dog.y)*k}
      }
      if(s.scene==='forest'){
        for(const cl of CLUES){
          if(!s.clues.includes(cl.id)&&distance(dog,cl)<67){
            store(a=>discoverTrailClue(a,cl.id));effect('Pista encontrada!');
            if(s.scene==='forest')ctx.audio.say(cl.voice);
          }
        }
      }
      if(s.scene==='meadow'&&s.obstacle){
        if(!s.friend&&distance(dog,{x:548,y:332})<87){
          store(meetTrailFriend);effect('Encontramos o Pipo!');say('Que alegria! Agora leve o Pipo até a casinha.');
        }
        if(s.friend&&!s.escorted){
          const follow=0.055;friend.x+=(dog.x-65-friend.x)*follow;friend.y+=(dog.y-15-friend.y)*follow;
          if(distance(dog,{x:617,y:470})<81&&distance(friend,{x:617,y:470})<120){
            store(escortTrailFriend);effect('O Pipo está em casa!');say(SCENE_VOICES.party);
          }
        }
      }
    }
    const render=(now)=>{
      if(!alive())return;
      const dt=Math.min(.05,((now-last)||33)/1000);
      if(last&&now-last<32){raf=requestAnimationFrame(render);return;}
      last=now;
      if(!document.hidden){
        time+=reduceMotion()?0:dt;
        update(dt);
        c.setTransform(1,0,0,1,0,0);
        paintBackdrop(c,s.scene,time,viewW,viewH,offsetX,offsetY);
        c.save();c.translate(offsetX,offsetY);
        if(s.scene==='forest')drawForest(c,s,time);
        if(s.scene==='river')drawRiver(c,s,time);
        if(s.scene==='meadow')drawMeadow(c,s,time,friend);
        if(s.scene==='party')drawParty(c,s,time);
        if(waypoint&&(s.scene==='forest'||s.scene==='meadow')){
          const elapsed=time-waypoint.at;
          if(elapsed<1.2){
            c.save();c.globalAlpha=Math.max(0,1-elapsed/1.2);
            c.strokeStyle='#fffdf0';c.lineWidth=4;
            c.beginPath();c.arc(waypoint.x,waypoint.y,17+elapsed*27,0,2*Math.PI);c.stroke();
            c.restore();
          }
        }
        if(s.scene==='forest'||s.scene==='meadow')pup(c,dog.x,dog.y,time,distance(dog,{x:dog.tx,y:dog.ty})>5);
        if(drag.id==='bridge')drawPiece(c,drag.method,drag.x,drag.y,time);
        if(drag.id==='decor')badge(c,DECOR.find(d=>d.id===drag.method)?.symbol,drag.x,drag.y,time);
        if(drag.id==='branch')label(c,'Puxe para o lado!',350,120);
        c.restore();
      }
      raf=requestAnimationFrame(render);
    };
    cur.cleanup=()=>{disposed=true;resizer?.disconnect();cancelAnimationFrame(raf);clearTimeout(messageTimeout)};
    document.querySelector('#activity-modal .activity-card')?.classList.remove('trail-finished');
    refresh();sayScene();raf=requestAnimationFrame(render);
  };
}
