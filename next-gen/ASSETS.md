# Proveniência dos modelos 3D do protótipo

A pasta `assets/` do projeto Godot é preenchida pelo script `tools/fetch_assets.sh`. Não usa extração de outros jogos, imagens geradas ou formas procedurais para simular o Pipo.

| Elemento | Fonte | Licença | Situação |
| --- | --- | --- | --- |
| Coelho estático `pipo.glb` | [Innerscene: Domestic rabbit](https://www.innerscene.com/tools/library/3d-parts/domestic-rabbit-d5cbd890) | CC0 conforme autor | Provisório, **não é modelo animado** |
| `TreeLow001`, `TreeMed001`, `Bush001`, `Rock001`, `Grass001` | [Gobkit Free 3D Assets](https://github.com/Ariescar/gobkit-free-assets/tree/main/nature) | CC0 conforme autores | Modelos estáticos de vegetação/cenário |

- O movimento de repouso/salto do coelho é aplicado à cena como um todo; isso não substitui um rig articulado.
- Não concluir que o modelo do Pipo está aprovado: a aparência e a rigagem serão avaliadas antes da próxima etapa.
- Os GLB são empacotados offline na distribuição da nova edição Godot.
- A versão Three.js/PWA existente permanece em `src/` e **não é alterada**.
