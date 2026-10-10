# Jardim da Sofia: contexto para o Claude

Jogo infantil em português (pt-BR) para crianças de 3 a 5 anos, feito em Three.js. O centro da experiência é o coelhinho Pipo, um bichinho virtual, num jardim com brincadeiras de letras, números, cores, formas, música e plantas. O nome da criança é configurável; o padrão é “Sofia”.

## Como executar

Requer Node.js 20 ou posterior.

```sh
npm ci
npm run build   # gera dist/ (copia src, Three.js, fonte Fredoka e monta o service worker)
npm test        # reconstrói dist e roda os 26 testes
python3 -m http.server 8080 --directory dist
```

Não abra `index.html` por `file://`: o jogo usa módulos JavaScript. `dist/` não vai para o git.

## Estrutura

- `src/game.js`: controlador principal. Cuida do dock, dos modos de cuidado (comer, banho, bolhas, dormir), das folhas de brincadeiras e enfeites, da comemoração, do cantinho da família (portão de segurar), do tempo de tela e dos eventos globais.
- `src/activities.js`: as seis brincadeiras. Conversam com o jogo só pelo objeto `ctx`.
- `src/ui.js`: arrastar com mola (`installDrag`), confete, partículas, voo até o contador, botão de segurar e `Coach` (dicas automáticas).
- `src/world.js`: cenário Three.js. O enquadramento (`fitFrustum`) ajusta a câmera ao espaço livre da tela. Também tem nuvens, noite, bolhas, espuma, comida que voa até a boca, toque com área generosa e qualidade adaptativa.
- `src/pet.js`: modelo procedural e animações do Pipo (olhar, boca, squash & stretch, reações e enfeites).
- `src/state.js`: estado puro e testado. Necessidades, recompensas, enfeites, nome, níveis, palavras, cores, formas e tempo de tela.
- `src/audio.js`: efeitos sintetizados (marimba, pop, fanfarra…), música de fundo com ducking, escolha da melhor voz pt-BR e vibração.
- `src/icons.js`: ícones SVG e o rosto do Pipo (`pipoFace`).
- `src/index.html`, `src/style.css`: estrutura e visual. Fonte Fredoka local; modo noturno; layouts para celular, paisagem e tablet.
- `src/manifest.webmanifest`, `src/sw.js`, `src/icons/`, `src/favicon.svg`: PWA. O build preenche a versão e a lista de arquivos do service worker.
- `tests/`: `state.test.mjs` (regras), `ui.test.mjs` (jornada completa em linkedom, sem WebGL), `forms.test.mjs` (demonstração, encaixes e callbacks de rodadas antigas) e `world.test.mjs` (Pipo, bolhas e enquadramento).

## Princípios de design (mantenha ao mudar)

- A criança não lê: toda ação importante tem ícone grande e fala. O texto é para os adultos acompanharem.
- Alvos de toque com 56px ou mais (o dock tem cerca de 80px). Nada importante pode ficar escondido atrás do balão de fala ou dos botões.
- O erro nunca pune: a peça volta e o Pipo explica. A ajuda (`Coach`) aparece sozinha depois de um tempo parada ou de dois erros.
- Ajustes e desbloqueio do tempo de tela ficam atrás de “segurar 2 segundos”.
- Necessidades com piso de 25, sem deterioração offline, sem morte, compras ou anúncios.
- Saves antigos (`jardim-sofia-v1`) precisam continuar válidos: amplie `sanitizeState`, não troque a chave.
- Frases faladas devem servir para qualquer criança. Evite adjetivos com gênero sobre ela; o artigo do título é configurável.

## Validação

Os 26 testes passam. O visual e as interações foram conferidos em Chromium real (Playwright, WebGL por SwiftShader) em 390×844, 375×667, 844×390, 820×1180, 1180×820 e 1280×720. Foram testados: arrastar fruta até a boca, arrastar letra, mola ao soltar fora, estourar bolhas no 3D, banho completo, dica automática, portão dos adultos e tela de descanso. Formas também tem testes de demonstração, tabuleiro persistente, níveis e recompensa única. A voz depende do aparelho; teste num celular real com som ligado.

## Publicação

O workflow `.github/workflows/pages.yml` roda os testes em cada pull request. A cada push na `main`, ele testa, gera `dist/` e publica no GitHub Pages: https://juanjfmr.github.io/jardim-da-sofia/

No repositório, o Pages precisa estar com a origem **GitHub Actions** (Settings › Pages). Para publicar em outro lugar, hospede o conteúdo de `dist/` em qualquer serviço de sites estáticos com HTTPS. O HTTPS é necessário para o service worker e para instalar o jogo no celular.
