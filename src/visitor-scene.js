// Um modelo 3D por vez, leve para celulares e sem acesso a servidores externos.
// As miniatividades continuam nos botões tradicionais do Jardim.
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { validateGlb } from './visitor-models.js';

function safeGltfDocument(buffer) {
  validateGlb(buffer);
  const view = new DataView(buffer);
  const jsonLength = view.getUint32(12, true);
  if (jsonLength > 2_000_000 || 20 + jsonLength > buffer.byteLength) throw new Error('Modelo GLB muito complexo.');
  let data;
  try { data = JSON.parse(new TextDecoder('utf-8').decode(new Uint8Array(buffer, 20, jsonLength))); }
  catch { throw new Error('A descrição do modelo está corrompida.'); }
  if (!data?.asset?.version?.startsWith('2.')) throw new Error('O modelo precisa usar glTF 2.');
  // GLTFLoader pode carregar URIs externos. Bloqueamos esses links antes do parse.
  const refs = [...(data.buffers || []), ...(data.images || [])];
  if (refs.some(entry => entry.uri && !entry.uri.startsWith('data:'))) {
    throw new Error('Use um GLB independente, com texturas dentro do arquivo.');
  }
  return data;
}

export class VisitorAvatar {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.root = null;
    this.mixer = null;
    this.time = 0;
    this.ticket = 0;
    this.reducedMotion = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  }
  remove() {
    this.ticket++;
    if (this.mixer) this.mixer.stopAllAction();
    this.mixer = null;
    if (this.root) {
      this.scene.remove(this.root);
      this.root.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        for (const mat of mats) {
          for (const v of Object.values(mat)) if (v?.isTexture) v.dispose();
          mat.dispose?.();
        }
      });
      this.root = null;
    }
  }
  async show(buffer) {
    safeGltfDocument(buffer);
    this.remove();
    const ticket = this.ticket;
    const gltf = await new Promise((resolve, reject) =>
      this.loader.parse(buffer, '', resolve, reject));
    if (ticket !== this.ticket) return false;
    const root = gltf.scene;
    let vertices = 0;
    root.traverse(child => {
      if (child.isMesh) {
        vertices += child.geometry?.attributes?.position?.count || 0;
        child.castShadow = vertices < 50000;
        child.receiveShadow = false;
      }
    });
    if (vertices > 140000) throw new Error('O modelo é pesado para o celular. Use uma versão otimizada.');
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y < 0.001) throw new Error('Modelo 3D sem tamanho válido.');
    const height = 2.15;
    const scale = height / Math.max(size.x, size.y, size.z);
    root.scale.multiplyScalar(scale);
    const aligned = new THREE.Box3().setFromObject(root);
    const center = aligned.getCenter(new THREE.Vector3());
    root.position.set(1.6 - center.x, 0.03 - aligned.min.y, 1.55 - center.z);
    root.rotation.y = -0.3;
    root.name = 'Visitante escolhido';
    this.scene.add(root);
    this.root = root;
    if (gltf.animations?.length) {
      this.mixer = new THREE.AnimationMixer(root);
      this.mixer.clipAction(gltf.animations[0]).play();
    }
    this.time = 0;
    return true;
  }
  update(dt) {
    if (!this.root || this.reducedMotion) return;
    this.time += dt;
    this.mixer?.update(dt);
    if (!this.mixer) this.root.rotation.y = -0.3 + Math.sin(this.time * 0.56) * 0.09;
  }
}
