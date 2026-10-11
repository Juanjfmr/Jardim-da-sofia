import { $, makeButton } from './ui.js';
import { VISITORS, saveVisitorGlb, deleteVisitorGlb, getVisitorGlb, installedVisitors } from './visitor-models.js';

// Os modelos não são distribuídos, copiados para o repositório nem enviados
// a servidores: ficam no IndexedDB do próprio aparelho.
export function setupVisitorUI({ getWorld, getMode, say }) {
  const settings = $('visitor-settings');
  const toolbar = $('visitor-buttons');
  const status = $('visitor-status');
  const installed = new Set();
  let chosen = null;
  let loading = false;
  const sayStatus = message => { status.textContent = message; };
  const visibility = () => {
    const appReady = $('welcome').hidden && $('parent-modal').hidden
      && $('activity-modal').hidden && $('rest-screen').hidden;
    const home = appReady && getMode() === 'home';
    toolbar.hidden = !(home && installed.size && getWorld());
  };
  const choices = new Map();

  async function choose(id) {
    if (loading || !installed.has(id)) return;
    const visitor = VISITORS.find(v => v.id === id);
    const world = getWorld();
    if (!visitor || !world?.visitorAvatar) {
      sayStatus('Seu celular precisa permitir 3D para mostrar os visitantes.');
      return;
    }
    loading = true;
    try {
      const buffer = await getVisitorGlb(id);
      await world.visitorAvatar.show(buffer);
      chosen = id;
      toolbar.querySelectorAll('button').forEach(button =>
        button.setAttribute('aria-pressed', String(button.dataset.visitor === id)));
      say(visitor.greeting);
      sayStatus(visitor.name + ' já está brincando com o Pipo!');
    } catch (error) {
      sayStatus('Não foi possível abrir ' + visitor.name + ': ' + (error?.message || 'Arquivo incompatível.'));
    } finally { loading = false; }
  }

  for (const visitor of VISITORS) {
    const card = document.createElement('div');
    card.className = 'visitor-setting';
    const info = document.createElement('span');
    info.className = 'visitor-setting-name';
    info.textContent = visitor.emoji + ' ' + visitor.name;
    const caption = document.createElement('span');
    caption.className = 'visitor-setting-caption';
    caption.textContent = 'Nenhum modelo instalado';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,model/gltf-binary';
    input.hidden = true;
    input.setAttribute('aria-label', 'Escolher arquivo GLB para ' + visitor.name);
    const importBtn = makeButton('visitor-import', 'Importar GLB', () => input.click(), 'Importar modelo 3D do ' + visitor.name);
    const removeBtn = makeButton('visitor-remove', 'Apagar', async () => {
      try {
        await deleteVisitorGlb(visitor.id);
        installed.delete(visitor.id);
        if (chosen === visitor.id) {
          getWorld()?.visitorAvatar?.remove();
          chosen = null;
        }
        render();
        sayStatus(visitor.name + ' foi retirado deste celular.');
      } catch (error) { sayStatus(error.message); }
    }, 'Apagar modelo local de ' + visitor.name);
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      importBtn.disabled = true;
      try {
        await saveVisitorGlb(visitor.id, file);
        installed.add(visitor.id);
        render();
        sayStatus(visitor.name + ' instalado apenas neste aparelho. Agora escolha o visitante no jardim.');
      } catch (error) { sayStatus('Arquivo não importado: ' + error.message); }
      finally { input.value = ''; importBtn.disabled = false; }
    });
    const actions = document.createElement('div');
    actions.className = 'visitor-setting-actions';
    actions.append(importBtn, removeBtn);
    card.append(info, caption, actions, input);
    settings.append(card);
    const choice = makeButton('visitor-choice', visitor.emoji + ' ' + visitor.name,
      () => choose(visitor.id), 'Brincar com ' + visitor.name);
    choice.dataset.visitor = visitor.id;
    choice.setAttribute('aria-pressed', 'false');
    toolbar.append(choice);
    choices.set(visitor.id, {caption, removeBtn, choice});
  }
  function render() {
    for (const v of VISITORS) {
      const ready = installed.has(v.id);
      const nodes = choices.get(v.id);
      nodes.caption.textContent = ready ? 'Modelo guardado no celular' : 'Nenhum modelo instalado';
      nodes.removeBtn.hidden = !ready;
      nodes.choice.hidden = !ready;
    }
    visibility();
  }
  async function installBundledModels() {
    // Apenas arquivos LOCAIS, empacotados no próprio APK. Nada é baixado de
    // plataformas externas, e uma importação do adulto nunca é substituída.
    if (!globalThis.indexedDB || typeof globalThis.fetch !== 'function') return;
    let response;
    try { response = await fetch('./family-models/manifest.json'); }
    catch { return; }
    if (!response.ok) return; // APK normal: nenhum pacote incorporado.
    const manifest = await response.json();
    if (manifest.version !== 1 || !Array.isArray(manifest.ids)) return;
    let installedNow = 0;
    for (const id of VISITORS.map(v => v.id)) {
      if (!manifest.ids.includes(id) || installed.has(id)) continue;
      try {
        const file = await fetch('./family-models/' + id + '.glb');
        if (!file.ok) throw new Error('Modelo não encontrado no pacote.');
        const bytes = await file.blob();
        await saveVisitorGlb(id, bytes);
        installed.add(id);
        installedNow++;
      } catch (error) {
        sayStatus('Não foi possível instalar ' + id + ': ' + (error?.message || 'Erro de leitura.'));
      }
    }
    if (installedNow) sayStatus('Os visitantes do pacote familiar estão prontos para brincar.');
  }
  async function refresh() {
    try {
      const have = await installedVisitors();
      installed.clear();
      have.forEach(v => installed.add(v.id));
      await installBundledModels();
      render();
    } catch (error) {
      render();
      sayStatus('O armazenamento de modelos 3D não está disponível neste navegador.');
    }
  }
  render();
  void refresh();
  return { refresh, updateVisibility: visibility, choose };
}
