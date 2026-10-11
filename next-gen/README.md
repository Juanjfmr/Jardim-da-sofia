# Jardim da Sofia — nova base 3D em Godot

**Primeiro marco técnico, separado da versão web existente.** Esta pasta contém um projeto Godot 4 para Android e desktop com coelho 3D *real*, natureza modelada em glTF e interações básicas de um bichinho virtual.

## Estado do trabalho

- Modelos pré-prontos: coelho CC0 da Innerscene e cinco modelos de vegetação/rochas CC0 da Gobkit.
- Câmera ortográfica, iluminação, cenário, toque no personagem, três ações (carinho, comida, descanso) e salvamento local.
- Não é uma reconstrução concluída: o coelho desta fase **não tem esqueleto nem animações faciais** e não foi aprovado como Pipo definitivo.
- A interface e os cenários ainda precisarão de direção de arte, animação avançada e validação com criança em aparelho físico.

## Executar no Godot 4.5.1

1. Execute `bash next-gen/tools/fetch_assets.sh` na raiz do repositório (download automático dos GLB CC0).
2. Importe `next-gen/project.godot` no Godot 4.5.1.
3. Execute F6/F5 para jogar. Use o toque no coelho ou Carinho, Comida e Descansar; feche e reabra para ver a persistência.
4. Para testar em Android, instale os templates oficiais e configure assinatura/Android SDK no editor. Ainda não há APK desta edição.

No GitHub Actions, o fluxo `Godot V2 — primeiro jardim 3D` baixa os mesmos GLB, importa a cena em Godot headless e disponibiliza o projeto ZIP como artefato para testes.

## Próximo marco (critério de aprovação)

Trocar o modelo provisório por um coelho **realmente animado**, com rig, idle, locomoção, comer, dormir e alegria. Comparar visualmente com o Pipo atual antes de avançar para outras brincadeiras.

Consulte [ASSETS.md](ASSETS.md) para origem e licença.
