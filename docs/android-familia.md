# Jardim da Sofia — versão familiar Android

Esta edição é **independente do site público**: somente a branch `mobile/family-visitors-apk` gera APK. O jogo permanece o Jardim da Sofia original, com Pipo, atividades e progresso local.

## Instalar

1. No GitHub, abra **Actions → Android familiar — APK offline** e a execução concluída com sucesso.
2. Em **Artifacts**, baixe `jardim-da-sofia-android-familiar`; descompacte o ZIP no celular e abra `app-debug.apk`.
3. No Android, autorize a instalação pelo aplicativo que abriu o arquivo. A instalação é local, não passa pela Play Store.
4. Abra o Jardim uma vez. As telas, fonte e biblioteca 3D são empacotadas no APK; não dependem de Wi-Fi.

## Adicionar os visitantes

O APK **não contém** modelos 3D da Patrulha Canina, imagens oficiais ou arquivos extraídos de jogos comerciais. Ele disponibiliza quatro espaços para importar modelos que a família já possui e tem permissão para usar: Chase, Marshall, Skye e Rubble.

1. Deixe um arquivo **GLB 2.0** por personagem no armazenamento do Android. Deve ser completo (texturas dentro do GLB), com até **15 MB por arquivo**. Se o formato for FBX/OBJ, converta localmente no Blender para GLB; não basta mudar a extensão.
2. No jogo, segure o botão **Cantinho da família** por dois segundos.
3. Em **Visitantes 3D da família**, escolha **Importar GLB** na ficha do personagem e selecione seu arquivo.
4. Volte ao jardim. Toque no botão do visitante para vê-lo com o Pipo. Se o modelo possuir clipes de animação, o jogo toca o primeiro.
5. Use **Apagar** para eliminar o modelo do próprio aparelho.

Arquivos importados ficam em **IndexedDB**, no armazenamento privado do aplicativo; não são enviados para GitHub ou outro serviço. Desinstalar o APK ou limpar os dados do aplicativo pode apagar personagens importados e o progresso. Não há sincronização de dados entre o site e este APK.

## Segurança e limites

- Fonte dos modelos: confirme os direitos do autor e dos personagens. Ser um arquivo marcado como *download gratuito* numa galeria não prova autorização dos detentores de direitos da série.
- Não publique capturas, APKs com modelos inclusos ou os modelos baixados como se fossem assets oficiais licenciados.
- Modelos independentes de até 15 MB: referências externas a imagens ou buffers são rejeitadas; arquivos com geometria acima do limite podem ser recusados para preservar o desempenho.
- Apenas um visitante 3D é carregado por vez. A qualidade gráfica continua adaptativa.
- O carregador renderiza os modelos, mas **a aparência e a qualidade das animações dependem do arquivo**. Não cria automaticamente um rig nem missões completas.
- O APK gerado é **debug**, destinado a teste doméstico, não assinatura ou distribuição comercial.
- Um build bem-sucedido não substitui o teste presencial no Android usado pela criança.
