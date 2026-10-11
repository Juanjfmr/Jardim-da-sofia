// Histórias curtas, sem cronômetro, sem punição e totalmente offline.
// Cada etapa aproveita uma brincadeira já existente no Jardim.
export const ADVENTURES = [
  {
    id: 'picnic', emoji: '🧺', title: 'O piquenique do Pipo',
    intro: 'Pipo quer preparar um piquenique cheio de cores e música.',
    ending: 'O piquenique ficou lindo! Pipo adorou dividir esse momento com você.',
    steps: [
      { activity: 'count', label: 'Colher cenouras', story: 'Vamos encher a cestinha do Pipo!' },
      { activity: 'colors', label: 'Escolher flores coloridas', story: 'O piquenique precisa de flores alegres.' },
      { activity: 'music', label: 'Tocar uma canção', story: 'Agora uma música para celebrar!' },
    ],
  },
  {
    id: 'garden-party', emoji: '🎉', title: 'Uma festa no jardim',
    intro: 'Pipo está preparando uma festinha surpresa para os amigos.',
    ending: 'Surpresa! Todos os amigos ficaram felizes com a festa do jardim.',
    steps: [
      { activity: 'shapes', label: 'Criar um brinquedo', story: 'Vamos preparar um presente especial.' },
      { activity: 'letters', label: 'Montar uma palavra', story: 'Uma palavra bonita para o convite.' },
      { activity: 'music', label: 'Fazer a música da festa', story: 'Hora de colocar a festa para dançar!' },
    ],
  },
  {
    id: 'magic-garden', emoji: '🌷', title: 'O segredo das flores',
    intro: 'Pipo descobriu um cantinho mágico que precisa da sua ajuda.',
    ending: 'As flores ganharam vida e o jardim ficou ainda mais encantado!',
    steps: [
      { activity: 'garden', label: 'Cuidar das flores', story: 'As sementinhas precisam de carinho.' },
      { activity: 'colors', label: 'Descobrir suas cores', story: 'Quais cores vão aparecer nas flores?' },
      { activity: 'count', label: 'Contar a colheita', story: 'Vamos contar os presentes da horta.' },
    ],
  },
];

export function findAdventure(id) {
  return ADVENTURES.find(adventure => adventure.id === id) || null;
}

export function sanitizeAdventure(value) {
  if (!value || typeof value !== 'object') return null;
  const story = findAdventure(value.id);
  return story && Number.isInteger(value.step) && value.step >= 0 && value.step < story.steps.length
    ? { id: story.id, step: value.step }
    : null;
}

export function sanitizeFinishedAdventures(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(id => typeof id === 'string' && findAdventure(id)))];
}

export function adventureProgress(state) {
  const active = sanitizeAdventure(state?.adventure);
  const story = active && findAdventure(active.id);
  if (!story) return null;
  return { story, index: active.step, step: story.steps[active.step], total: story.steps.length };
}

export function startAdventure(state, id) {
  const story = findAdventure(id);
  if (!story) return state;
  return { ...state, adventure: { id: story.id, step: 0 } };
}

// Somente a conclusão da etapa esperada avança a narrativa.
// Outras atividades continuam livres e nunca causam perda de progresso.
export function recordAdventureActivity(state, activity) {
  const progress = adventureProgress(state);
  if (!progress || progress.step.activity !== activity) return { state, advanced: false };
  const { story, index } = progress;
  if (index + 1 === story.steps.length) {
    return {
      state: {
        ...state,
        adventure: null,
        finishedAdventures: sanitizeFinishedAdventures([...(state.finishedAdventures || []), story.id]),
      },
      advanced: true, finished: true, story, nextActivity: null,
    };
  }
  return {
    state: { ...state, adventure: { id: story.id, step: index + 1 } },
    advanced: true, finished: false, story,
    nextActivity: story.steps[index + 1].activity,
  };
}
