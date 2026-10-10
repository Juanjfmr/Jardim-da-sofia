# Jardim da Sofia

**Jogar:** https://juanjfmr.github.io/jardim-da-sofia/

No celular, abra o link e use **Instalar app** (Chrome no Android) ou **Compartilhar › Adicionar à Tela de Início** (Safari no iPhone). Depois da primeira visita, o jogo funciona sem internet.

Jogo de bichinho virtual para crianças de **3 a 5 anos**, feito em Three.js 0.180.0 para tocar no celular, tablet ou computador. O coelhinho Pipo vive num jardim 3D com seis brincadeiras de letras, números, cores, formas, música e plantas. Tudo é local: modelos, sons, fonte e bibliotecas. Não depende de CDN e não chama serviços externos.

## Pensado para quem ainda não lê

- **Poucos botões grandes.** O menu tem só cinco botões: Comer, Banho, Brincar (estrela), Bolhas e Dormir. A estrela abre seis cartões grandes, um para cada brincadeira. No cenário, cada estação também tem um balão com ícone.
- **Tudo é falado.** O Pipo explica cada brincadeira com a voz do aparelho e diz o nome das letras (“ésse”), os números e as cores. O balão de fala tem um botão para ouvir de novo.
- **Ajuda automática.** Se a criança fica parada ou erra duas vezes, a resposta certa pulsa, uma mãozinha 👆 aponta para ela e o Pipo repete o pedido. A espera muda com o desafio (6, 9 ou 14 segundos).
- **Errar não frustra.** A peça balança, volta para o lugar com uma mola e o Pipo diz o que ela é (“Essa é a letra ó. Procure a ésse.”).
- **O Pipo mostra o que precisa.** Um balãozinho sobre a cabeça dele (🥕 🫧 🎈 💤) aparece quando ele está com fome, sujo, querendo brincar ou com sono. Tocar no balão já resolve.
- **Recompensa visível.** Cada brincadeira concluída dá uma flor 🌸, que voa até o contador. As flores liberam enfeites para o Pipo (flor, laço, coroa, chapéu de festa e óculos), e a própria criança escolhe o enfeite tocando no contador.

## Brincadeiras

- **Carinho:** o Pipo segue o dedo com o olhar e “amassa” no toque. Vários toques seguidos fazem risadinha e, depois, um giro.
- **Comer:** arraste a fruta até a boca do Pipo (ele abre a boca quando ela chega perto) ou só toque nela. Quando está cheio, ele recusa com carinho.
- **Banho:** passe o dedo no Pipo para fazer espuma, que gruda no pelo, e toque no chuveiro para enxaguar.
- **Bolhas:** bolhas grandes sobem pela tela; estoure cinco.
- **Dormir:** a noite tem lua, estrelas, vaga-lumes, janela acesa e canção de ninar.
- **Letras:** monte o nome da criança e palavras com figura (☀️ SOL, 🌙 LUA, ⚽ BOLA…), tocando ou arrastando as letras.
- **Contar:** colha de 1 a 3, 5 ou 10 cenouras, com contagem falada e bolinhas para contar.
- **Cores:** 3, 4 ou 6 cores, conforme o desafio.
- **Formas:** monte a caixa de encaixes do Pipo com 3, 4 ou 5 peças, conforme o desafio. Na primeira visita, ele demonstra como encaixar; o botão “Ver o Pipo” repete a ajuda e “Minha vez” permite começar imediatamente. Dá para tocar ou arrastar até a sombra destacada. Cada peça permanece no lugar e o brinquedo pronto continua visível na comemoração.
- **Música:** xilofone livre ou “Imitar o Pipo”, com melodias de 2, 3 ou 4 notas.
- **Plantar:** quatro canteiros que guardam o progresso: semente, broto, crescimento e flor.

## Cantinho da família

Fica protegido: só abre **segurando a engrenagem por 2 segundos**. Um toque rápido não abre.

- Nome da criança e artigo (“Jardim da Sofia”, “Jardim do Pedro”, “Jardim de Ana”). Também dá para deixar sem nome.
- Desafio: Descobrir, Explorar ou Desafiar.
- Voz do Pipo, efeitos sonoros e vibração, música de fundo (baixinha, abaixa sozinha quando o Pipo fala).
- Tela cheia ao começar.
- Tempo de brincadeira por dia: livre, 15, 30 ou 45 minutos. Quando acaba, o Pipo vai dormir e só um adulto libera, segurando o botão.

O jardim fica salvo no `localStorage` de cada aparelho. Saves da versão anterior continuam funcionando. As necessidades só avançam com a página visível, com um ritmo calmo (cerca de 20 minutos até o Pipo pedir comida). Não há passagem de tempo offline, morte do bichinho, compras nem anúncios.

## Celular

- Pode ser **instalado na tela inicial** (manifest e ícones). Depois da primeira visita, funciona **sem internet** (service worker).
- Bloqueia zoom por pinça e toque duplo, menu de toque longo, seleção de texto e “puxar para atualizar”.
- O enquadramento da câmera é calculado para o espaço livre de cada tela: no celular o Pipo e as estações ficam grandes; no tablet aparece o jardim inteiro; deitado, o jardim se afasta do balão de fala.
- A qualidade se ajusta sozinha: se o aparelho não acompanha, baixa a resolução e depois as sombras. Atrás das janelas de atividade, o 3D quase não desenha, para poupar bateria.

## Desenvolvimento

```sh
npm ci
npm run build
npm test
```

`npm test` reconstrói `dist` e executa 26 testes: estado, a jornada completa da interface em DOM simulado, demonstração e encaixes de Formas, geometria do Pipo e o enquadramento 3D em sete tamanhos de tela. Os testes de DOM não renderizam WebGL; o visual foi conferido em Chromium real, em celular, celular deitado, tablet e computador.

Para jogar localmente, sirva `dist` por HTTP (o jogo usa módulos JavaScript, então `file://` não funciona):

```sh
python3 -m http.server 8080 --directory dist
```

## Publicação

A cada mudança na `main`, o GitHub Actions roda os testes e publica a versão nova no GitHub Pages sozinho (`.github/workflows/pages.yml`). Os pull requests também são testados. Quem já tem o jogo instalado recebe a atualização na próxima vez que abrir com internet.

## Acesso

Qualquer pessoa com o link pode jogar sem conta. O HTML, o `robots.txt` e os cabeçalhos pedem para buscadores não indexarem, mas isso não é autenticação. Não coloque dados sensíveis no jogo.

A fala usa a voz em português disponível no aparelho; o jogo escolhe a melhor que encontrar. Quando o WebGL não está disponível, as brincadeiras continuam com um Pipo desenhado e botões simples.

Licenças: Three.js (MIT) em `dist/vendor/THREE-LICENSE.txt`; fonte Fredoka (OFL 1.1) em `dist/fonts/FREDOKA-LICENSE.txt`.
