// Atmosfera de livro ilustrado: pétalas leves, sem interação e com um único draw call.
// Nenhum efeito aqui entra na lista de alvos clicáveis ou no estado salvo.
const COLORS = ['#fff0da', '#f9c6cb', '#f4d9ed', '#fbe3ab', '#dfe9c9'];
export const MAX_PETALS = 24;

export function petalPose(index, time = 0) {
  const i = Math.max(0, Math.min(100, Math.floor(Number(index) || 0)));
  const t = Number.isFinite(time) ? time : 0;
  const side = i % 2 ? -1 : 1;
  const phase = i * 2.39996;
  // Nas bordas do jardim: o centro continua livre para ver e tocar o Pipo.
  return {
    x: side * (2.9 + (i % 5) * 0.24) + Math.sin(t * 0.36 + phase) * 0.35,
    y: 0.95 + (i % 7) * 0.27 + Math.sin(t * 0.68 + phase) * 0.23,
    z: -3.8 + (i % 9) * 0.91 + Math.sin(t * 0.19 + i) * 0.21,
    rx: Math.sin(t * 0.45 + phase) * 0.5,
    ry: t * (0.19 + (i % 4) * 0.04) + phase,
    rz: Math.sin(t * 0.64 + phase) * 0.8,
    size: 0.1 + (i % 4) * 0.018,
  };
}

export function createPetalField(THREE, scene, count = 20) {
  const total = Math.max(0, Math.min(MAX_PETALS, Math.floor(Number(count) || 0)));
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(-0.76, 0.75, 0, 1.9);
  shape.quadraticCurveTo(0.84, 0.85, 0, 0);
  const geometry = new THREE.ShapeGeometry(shape, 5);
  const material = new THREE.MeshBasicMaterial({
    color: '#ffffff', transparent: true, opacity: 0.83,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, total);
  mesh.name = 'Petalas do Jardim';
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.decorative = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < total; i++) mesh.setColorAt(i, new THREE.Color(COLORS[i % COLORS.length]));
  if (total) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);
  const field = { mesh, dummy, total, frozen: false };
  updatePetalField(field, 0);
  return field;
}

export function updatePetalField(field, time, still = false) {
  if (!field || !field.mesh || !field.total) return;
  if (still && field.frozen) return;
  const { mesh, dummy, total } = field;
  for (let i = 0; i < total; i++) {
    const p = petalPose(i, still ? 0 : time);
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(p.rx, p.ry, p.rz);
    dummy.scale.setScalar(p.size);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  field.frozen = !!still;
}

export function atmosphereStep(blend, night, deltaSeconds, reducedMotion = false) {
  const target = night ? 1 : 0;
  const current = Number.isFinite(blend) ? Math.max(0, Math.min(1, blend)) : target;
  if (reducedMotion) return target;
  const dt = Math.max(0, Math.min(0.1, Number(deltaSeconds) || 0));
  return current + (target - current) * (1 - Math.exp(-dt * 1.7));
}
