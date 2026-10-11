/**
 * Direção de arte "livro de histórias": o jardim é um pequeno cenário
 * esculpido, não uma coleção de cubos e bolas soltas.
 *
 * Somente apresentação: nenhuma malha daqui entra no raycast das atividades.
 * Materiais e geometrias repetidos passam pelo instancing de GardenWorld.
 */

const PALETTE = Object.freeze({
  bark: '#a77a59', barkLight: '#ce9b6e', leaves: ['#79b684','#98c991','#b6d89b','#6fa989'],
  rose: '#e990a6', roseLight: '#f8b4b7', lavender: '#bca7d9', golden: '#f6d58c',
  roof: '#c97e79', roofLight: '#e9a395', plaster: '#fff0d4', timber: '#b88e72',
  path: '#e8c9a5', pathLight: '#f5e4c8',
});
const wave = (i, n) => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1;
const rnd = (i, n) => Math.abs(wave(i, n));
const vec = (T, p) => new T.Vector3(...p);

function beam(world, THREE, parent, a, b, radius, color, r2 = radius) {
  const start = vec(THREE, a), end = vec(THREE, b);
  const direction = end.clone().sub(start);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, radius, direction.length(), 10), world.mat(color));
  m.position.copy(start.add(end).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  m.castShadow = true;
  parent.add(m);
  return m;
}
function dot(world, parent, color, x, y, z, sx, sy, sz) {
  return world.mesh('sphere', color, x, y, z, sx, sy, sz, parent);
}
function foliage(world, parent, x, y, z, s, idx) {
  // O desenho assimétrico e as nervuras quebram a antiga silhueta de "6 esferas".
  const colors = PALETTE.leaves;
  for (let j = 0; j < 5; j++) {
    const a = j * 2.399 + idx * 0.17;
    const r = j === 0 ? 0 : 0.24 + rnd(j, idx) * 0.16;
    const leaf = dot(world, parent, colors[(idx + j) % colors.length],
      x + Math.sin(a) * r, y + Math.cos(j * 2) * 0.10,
      z + Math.cos(a) * r * 0.65, s * (0.65 + rnd(idx, j) * 0.15),
      s * (0.77 + rnd(j, idx + 8) * 0.22), s * 0.62);
    leaf.rotation.z = Math.sin(a) * 0.2;
  }
  // Pequenos reflexos "pintados" só na frente da copa.
  for (let k = 0; k < 3; k++) {
    const a = idx * 1.9 + k * 2.1;
    dot(world, parent, '#d6e5b2', x + Math.sin(a) * s * 0.43,
      y + Math.cos(a) * s * 0.36, z + s * 0.48, s * 0.13, s * 0.08, s * 0.035);
  }
}

/** Silhueta orgânica, casca, ramos e pequenos frutos. */
export function makeStoryTree(world, THREE, x, z, scale = 1) {
  const g = new THREE.Group();
  g.name = 'Arvore de conto';
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  world.environment.add(g);
  beam(world, THREE, g, [0, 0, 0], [-0.04, 1.05, 0], 0.29, PALETTE.bark, 0.23);
  beam(world, THREE, g, [-0.04, 1.05, 0], [0.10, 2.27, 0], 0.23, PALETTE.bark, 0.10);
  beam(world, THREE, g, [0.01, 1.65, 0], [-0.92, 2.48, -0.12], 0.14, PALETTE.bark, 0.07);
  beam(world, THREE, g, [0.04, 1.82, 0], [0.89, 2.58, -0.19], 0.14, PALETTE.bark, 0.07);
  beam(world, THREE, g, [-0.08, 0.13, 0], [-0.48, 0.02, 0.4], 0.13, PALETTE.bark);
  beam(world, THREE, g, [0.07, 0.16, 0], [0.49, 0.02, -0.30], 0.13, PALETTE.bark);
  // Sulcos de casca visíveis no tronco e um nó em relevo.
  for (let k = 0; k < 3; k++) beam(world, THREE, g,
    [0.15 - k * 0.04, 0.35 + k * 0.44, 0.245 - k * 0.02],
    [0.09 + k * 0.02, 0.60 + k * 0.44, 0.22 - k * 0.025], 0.012, PALETTE.barkLight, 0.009);
  dot(world, g, PALETTE.barkLight, 0.1, 1.06, 0.23, 0.08, 0.13, 0.027);
  const positions = [
    [-0.88,2.55,0.02,0.71], [0.82,2.65,-0.05,0.73], [0,3.12,0,0.84],
    [-0.43,3.42,0.04,0.62], [0.48,3.45,-0.12,0.65],
    [-1.12,3.07,-0.09,0.56], [1.17,3.05,-0.18,0.57],
  ];
  positions.forEach(([px,py,pz,s],i) => foliage(world,g,px,py,pz,s,i));
  for (let k = 0; k < 8; k++) {
    const x0 = Math.sin(k * 2.4) * 1.15;
    const y0 = 2.5 + (k % 4) * 0.23;
    const z0 = 0.57 + Math.cos(k) * 0.12;
    dot(world,g,k % 3 ? '#eb8885' : '#f6aa92',x0,y0,z0,0.10,0.11,0.09);
    beam(world, THREE,g,[x0,y0+0.06,z0],[x0-0.02,y0+0.20,z0],0.012,'#668d59');
  }
  // Folhagens serão agrupadas em instâncias pelo renderizador; não animar só o tronco.
  return g;
}

function roundedBox(THREE,w,h,d,r=0.09) {
  const shape = new THREE.Shape();
  const x=-w/2, y=-h/2;
  shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);
  shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);
  shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:0.012,bevelThickness:0.012,bevelSegments:2,curveSegments:4});
  geo.computeVertexNormals();return geo;
}
/** Uma casinha com telhas em escamas, alpendre, venezianas e jardim de janela. */
export function makeStoryCottage(world, THREE, x, z) {
  const g=new THREE.Group();g.name='Casa do Pipo';g.position.set(x,0,z);world.environment.add(g);
  world.mesh('box','#d1ad88',0,0.12,0.10,2.6,0.22,2.22,g);
  const wall = new THREE.Mesh(roundedBox(THREE,2.20,1.98,1.76,0.15),world.mat(PALETTE.plaster));
  wall.position.set(0,1.02,-0.88);wall.castShadow=true;wall.receiveShadow=true;g.add(wall);
  // Vigas aparentes: um contraste de madeira no reboco.
  for(const side of [-1,1]){
    world.mesh('box',PALETTE.timber,side*1.04,1.08,0.98,0.085,1.90,0.08,g);
    world.mesh('box','#e8c5a2',side*1.08,0.12,0.06,0.16,0.16,2.0,g);
  }
  world.mesh('box',PALETTE.timber,0,1.94,0.96,2.08,0.12,0.12,g);

  const roofShape = new THREE.Shape();
  roofShape.moveTo(-1.38,0);roofShape.lineTo(1.38,0);roofShape.lineTo(0,1.10);roofShape.closePath();
  const roof=new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape,{depth:2.22,bevelEnabled:true,bevelThickness:0.04,bevelSize:0.045,bevelSegments:3}),world.mat(PALETTE.roof));
  roof.position.set(0,1.94,-1.14);roof.castShadow=true;g.add(roof);
  // Fileiras sobrepostas de telhas brilhantes, arredondadas em vez de um bloco liso.
  for(const side of [-1,1]) for(let row=0;row<5;row++) for(let col=0;col<8;col++){
    const xx=side*(0.18+row*0.264);
    const yy=3.01-(0.18+row*0.264)*0.80+0.05;
    const zz=-0.93+col*0.27+(row%2?0.09:0);
    const tile=dot(world,g,(row+col)%4===0?PALETTE.roofLight:row%2?'#d98c83':PALETTE.roof,
      xx,yy,zz,0.172,0.045,0.195);
    tile.rotation.z=-side*0.65;
    tile.castShadow=false;
  }
  beam(world,THREE,g,[0,3.03,-1.16],[0,3.03,1.12],0.078,'#f7c9a6');

  // Porta: formato de arco e relevo de madeira com dobradiças.
  const doorShape=new THREE.Shape();
  doorShape.moveTo(-0.42,0);doorShape.lineTo(0.42,0);doorShape.lineTo(0.42,0.98);
  doorShape.absarc(0,0.98,0.42,0,Math.PI,false);doorShape.lineTo(-0.42,0);
  const door=new THREE.Mesh(new THREE.ShapeGeometry(doorShape),world.mat('#a97567'));
  door.position.set(-0.05,0.16,1.04);g.add(door);
  for(const dx of [-0.27,0,0.27])world.mesh('box','#bc8d74',dx-0.05,0.61,1.067,0.03,0.72,0.025,g);
  dot(world,g,'#ffdf85',0.20,0.72,1.12,0.047,0.05,0.041);
  world.mesh('box','#eed3a7',-0.06,0.12,1.31,1.14,0.17,0.70,g);
  // Toldinho, vigas e vasos junto à porta.
  for(const side of [-1,1]){
    beam(world,THREE,g,[side*0.83,0.14,1.27],[side*0.83,1.82,1.27],0.050,PALETTE.timber);
    dot(world,g,'#f3e0bd',side*0.83,1.83,1.27,0.07,0.07,0.07);
  }

  function window(x0,y0,z0,light=false) {
    const outer=new THREE.Mesh(roundedBox(THREE,0.44,0.57,0.05),world.mat('#edd7b4'));
    outer.position.set(x0,y0,z0);g.add(outer);
    const pane=new THREE.Mesh(new THREE.PlaneGeometry(0.33,0.44),
      new THREE.MeshBasicMaterial({color:light?'#cfe3ee':'#a8d7d4'}));
    pane.position.set(x0,y0,z0+0.075);g.add(pane);
    if(light)world.windowLight=pane;
    world.mesh('box',PALETTE.timber,x0,y0,z0+0.10,0.04,0.49,0.044,g);
    world.mesh('box',PALETTE.timber,x0,y0,z0+0.10,0.38,0.035,0.044,g);
    for(const side of [-1,1]){
      const shutter=world.mesh('box','#90b5a7',x0+side*0.31,y0,z0+0.01,0.14,0.59,0.07,g);
      shutter.rotation.y=side*0.22;
    }
    world.mesh('box',PALETTE.timber,x0,y0-0.35,z0+0.11,0.62,0.09,0.26,g);
    for(let n=0;n<4;n++) {
      const fx=x0-0.2+n*0.13, fy=y0-0.22+(n%2)*0.045, fz=z0+0.18;
      beam(world,THREE,g,[fx,y0-0.33,fz],[fx,fy+0.10,fz],0.017,'#81b27c');
      dot(world,g,n%2?'#f0a1ae':'#e8b4dd',fx,fy+0.12,fz,0.07,0.07,0.045);
    }
  }
  window(-0.75,1.35,1.02,false);window(0.75,1.35,1.02,true);
  const chimney=world.mesh('box','#db9b80',0.70,2.83,-0.46,0.29,0.92,0.33,g);
  chimney.rotation.z=-0.1;
  world.mesh('box','#f6d0ac',0.70,3.33,-0.46,0.40,0.13,0.43,g);
  // Volume de toque único: as dezenas de telhas continuam disponíveis para instancing.
  const touch=new THREE.Mesh(new THREE.BoxGeometry(2.38,2.84,2.14),
    new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,color:'#ffffff'}));
  touch.position.set(0,1.55,0.04);touch.castShadow=false;
  g.add(touch);world.register(touch,'sleep');
  return g;
}

// Pedras irregulares, relva, cogumelos e maciços de flores nas bordas.
// Evitamos o centro, a cara do Pipo e as seis estações de brincadeira.
function addPath(world, THREE) {
  const points=[
    [-0.24,-4.95],[-0.17,-3.92],[0.47,-2.50],[0.19,-1.16],
    [0.10,0.50],[-0.08,1.80],[0.53,3.18],[0.34,4.65],
  ].map(([x,z])=>new THREE.Vector3(x,0.01,z));
  const curve=new THREE.CatmullRomCurve3(points);
  const vertices=[],colors=[],indices=[];
  for(let i=0;i<=52;i++){
    const t=i/52,pt=curve.getPoint(t),normal=curve.getTangent(t);
    const width=0.51+Math.sin(t*9)*0.09+Math.sin(t*17)*0.045;
    const x=-normal.z, z=normal.x;
    for(const side of [-1,1]){
      vertices.push(pt.x+side*width*x,0.012,pt.z+side*width*z);
      const c=new THREE.Color(i%5===0?PALETTE.path:PALETTE.pathLight);
      colors.push(c.r,c.g,c.b);
    }
    if(i<52){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const path=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1}));
  path.receiveShadow=true;
  world.environment.add(path);
}
function smallFlower(world, THREE, parent, x, z, scale, i) {
  const y=0.07;
  beam(world,THREE,parent,[x,y,z],[x,y+scale*0.40,z],0.017,'#6b9c6f',0.012);
  const pal=[PALETTE.rose,PALETTE.roseLight,PALETTE.golden,PALETTE.lavender,'#ffffff'];
  const color=pal[i%pal.length];
  for(let p=0;p<5;p++){
    const a=(p/5)*Math.PI*2;
    dot(world,parent,color,x+Math.cos(a)*0.10*scale,y+0.43*scale+Math.sin(a)*0.10*scale,z+0.03,0.09*scale,0.08*scale,0.05*scale);
  }
  dot(world,parent,'#f8d06a',x,y+0.43*scale,z+0.08*scale,0.059*scale,0.059*scale,0.04*scale);
}
function smallMushroom(world, THREE, parent, x,z,s,i){
  world.mesh('cylinder','#fff0d6',x,0.14*s,z,0.065*s,0.26*s,0.065*s,parent);
  dot(world,parent,i%2?'#efaa8d':'#dc8c89',x,0.29*s,z,0.19*s,0.10*s,0.19*s);
  for(let j=0;j<3;j++){const a=j*2.3;dot(world,parent,'#fff4d8',x+Math.cos(a)*0.10*s,0.34*s,z+Math.sin(a)*0.10*s,0.035*s,0.016*s,0.035*s);}
}

/** Vegetação com composição intencional, cobrindo o vazio sem cobrir toques. */
export function decorateStoryGarden(world,THREE) {
  addPath(world,THREE);
  // A antiga base recebia uma só cor; os canteiros agora têm pequenas manchas
  // de folhas alongadas e agrupamentos de flores desenhados à mão.
  for(let cluster=0;cluster<19;cluster++){
    const x=(cluster%2?-1:1)*(3.35+rnd(cluster,1)*0.89);
    const z=-4.8+Math.floor(cluster/2)*1.04;
    const parent=new THREE.Group();
    parent.position.set(0,0,0);
    world.environment.add(parent);
    for(let j=0;j<7;j++){
      const phi=j*2.399, radius=0.06+0.11*Math.sqrt(j);
      const px=x+Math.cos(phi)*radius, pz=z+Math.sin(phi)*radius;
      if(Math.abs(px)>4.55||Math.abs(pz)>5.12)continue;
      const leaf=dot(world,parent,j%2?'#76b47a':'#93c48a',px,0.16,pz,0.055,0.18+rnd(j,cluster)*0.08,0.038);
      leaf.rotation.z=(rnd(cluster,j)-0.5)*0.75;
    }
    if(cluster%2===0)smallFlower(world,THREE,parent,x,z,0.78,cluster);
    if(cluster%5===0)smallMushroom(world,THREE,parent,x+0.2,z-0.1,0.85,cluster);
  }
  for(let i=0;i<26;i++){
    const x=(i%2?-1:1)*(3.5+rnd(i,3)*0.55);
    const z=-4.65+Math.floor(i/2)*0.72;
    smallFlower(world,THREE,world.environment,x,z,0.48+rnd(i,2)*0.28,i);
  }
  // Quatro canteiros cenográficos de lavandas junto à cercadura.
  for(let c=0;c<4;c++){
    const px=c<2?-4.12:4.03, pz=c%2?4.13:-3.55;
    for(let j=0;j<4;j++){
      const x=px+(j-1.5)*0.17,z=pz+(j%2)*0.13;
      beam(world,THREE,world.environment,[x,0.08,z],[x,0.57+(j%2)*0.12,z],0.018,'#729c73',0.013);
      for(let k=0;k<4;k++)dot(world,world.environment,
        k%2?'#a899d6':'#c2b0e5',x,0.42+k*0.065,z,0.073-k*0.008,0.067,0.07-k*0.008);
    }
  }
}

/** Adiciona planos de pelo e expressão sem alterar o rig nem a API de animação. */
export function addStoryBunnyDetails(THREE,{head,ears,torso,feet,arms}){
  const cream=new THREE.MeshStandardMaterial({color:'#fff9ed',roughness:0.96});
  const blush=new THREE.MeshStandardMaterial({color:'#efb8bb',roughness:0.88});
  const dark=new THREE.MeshStandardMaterial({color:'#b49b8e',roughness:0.94});
  const highlight=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:0.35});
  const sphere=new THREE.SphereGeometry(1,16,12);
  const small=new THREE.SphereGeometry(1,10,8);
  const tuft=(parent,material,p,s,angle=0)=>{
    const m=new THREE.Mesh(sphere,material);m.position.set(...p);m.scale.set(...s);m.rotation.z=angle;
    m.castShadow=true;parent.add(m);return m;
  };
  // Mechas de pelo na testa: abauladas e assimétricas, sem invadir as orelhas.
  tuft(head,cream,[-0.18,0.60,0.23],[0.24,0.16,0.24],-0.35);
  tuft(head,cream,[0.04,0.66,0.23],[0.19,0.17,0.24],0.22);
  tuft(head,cream,[0.24,0.55,0.23],[0.14,0.12,0.18],0.42);
  // Uma borda de pelo contorna o ouvido e a mancha rosada ganha brilho.
  for(const ear of ears){
    tuft(ear,cream,[0,0.50,0.09],[0.145,0.53,0.10]);
    tuft(ear,blush,[0,0.49,0.172],[0.092,0.44,0.026]);
    tuft(ear,highlight,[-0.033,0.63,0.196],[0.019,0.20,0.012],-0.08);
  }
  // Maçãs do rosto arredondadas e sardas discretas.
  for(const side of [-1,1]){
    tuft(head,cream,[side*0.55,-0.29,0.44],[0.19,0.18,0.17]);
    for(let k=0;k<3;k++){
      const x=side*(0.42+k*0.064);
      const m=new THREE.Mesh(small,dark);
      m.position.set(x,-0.22+((k+1)%2)*0.055,0.613-(k*0.035));
      m.scale.set(0.013,0.013,0.008);
      head.add(m);
    }
    // Brilho arredondado nos olhos, um pouco mais acima da esclera.
    tuft(head,highlight,[side*0.264,0.202,0.649],[0.025,0.031,0.014]);
  }
  // Pelinhos do peito/barriga. Ocultáveis sob roupas, sem criar nova categoria de roupa.
  for(let i=0;i<5;i++){
    const x=(i-2)*0.16;
    tuft(torso,cream,[x,-0.47+Math.abs(i-2)*0.03,0.49],[0.14,0.12,0.075],x*0.5);
  }
  // Dedinhos de pelúcia: dão leitura de pata em close sem virarem dedos humanos.
  for(const foot of feet){
    for(let k=-1;k<=1;k++)tuft(foot,cream,[k*0.11,-0.028,0.34],[0.11,0.13,0.15]);
  }
  for(const arm of arms) {
    for(let i=-1;i<=1;i++)tuft(arm,cream,[i*0.055,-0.45,0.24],[0.052,0.07,0.07]);
  }
}
