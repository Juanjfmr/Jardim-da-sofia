// Visitantes 3D exclusivos do aparelho. Nunca enviamos os arquivos pela rede.
// O jogo contém somente espaços vazios; famílias podem importar GLB obtidos legalmente.
export const VISITORS = Object.freeze([
  { id: 'chase', name: 'Chase', emoji: '🔍', greeting: 'O Chase chegou! Vamos encontrar pistas no jardim?' },
  { id: 'marshall', name: 'Marshall', emoji: '🚒', greeting: 'O Marshall chegou! Podemos ajudar nossos amigos!' },
  { id: 'skye', name: 'Skye', emoji: '🛩️', greeting: 'A Skye chegou! Vamos explorar o céu?' },
  { id: 'rubble', name: 'Rubble', emoji: '🧱', greeting: 'O Rubble chegou! Vamos construir juntos!' },
]);
export const MAX_VISITOR_BYTES = 15 * 1024 * 1024;
const DB_NAME = 'jardim-sofia-visitantes';
const STORE = 'glb';
export const visitorById = id => VISITORS.find(v => v.id === id) || null;

// GLB 2.0: cabeçalho mágico 'glTF', versão e comprimento do arquivo.
export function validateGlb(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20) throw new Error('Escolha um arquivo .glb completo.');
  if (buffer.byteLength > MAX_VISITOR_BYTES) throw new Error('O arquivo é muito grande. Limite: 15 MB.');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2
      || view.getUint32(8, true) !== buffer.byteLength) {
    throw new Error('Este não é um modelo GLB 2.0 válido.');
  }
  if (view.getUint32(12, true) < 2 || view.getUint32(16, true) !== 0x4e4f534a) {
    throw new Error('O arquivo GLB não contém a descrição do modelo.');
  }
  return true;
}

function openVisitorDB() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('O armazenamento local não está disponível.')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('Não foi possível abrir o armazenamento local.'));
    req.onblocked = () => reject(new Error('Feche outra janela do Jardim e tente novamente.'));
  });
}

async function transaction(mode, action) {
  const db = await openVisitorDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const req = action(store);
      let result;
      req.onsuccess = () => { result = req.result; };
      req.onerror = () => reject(new Error('Não foi possível salvar ou ler o arquivo.'));
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(new Error('Sem espaço disponível para guardar o modelo.'));
      tx.onerror = () => reject(new Error('Erro ao usar armazenamento local.'));
    });
  } finally {
    db.close();
  }
}

export async function getVisitorGlb(id) {
  if (!visitorById(id)) return null;
  const value = await transaction('readonly', store => store.get(id));
  if (!value) return null;
  validateGlb(value);
  return value;
}
export async function saveVisitorGlb(id, file) {
  if (!visitorById(id)) throw new Error('Personagem desconhecido.');
  if (!file || file.size > MAX_VISITOR_BYTES) throw new Error('Escolha um arquivo GLB de até 15 MB.');
  const buffer = await file.arrayBuffer();
  validateGlb(buffer);
  await transaction('readwrite', store => store.put(buffer, id));
  return buffer;
}
export async function deleteVisitorGlb(id) {
  if (!visitorById(id)) return;
  await transaction('readwrite', store => store.delete(id));
}
export async function installedVisitors() {
  const ids = await transaction('readonly', store => store.getAllKeys());
  return VISITORS.filter(v => ids.includes(v.id));
}
