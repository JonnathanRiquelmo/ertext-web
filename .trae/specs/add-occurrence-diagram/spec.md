# Add Occurrence Diagram Spec

## Why
O diagrama de ocorrências (Instance Diagram) é uma ferramenta didática valiosa para ilustrar como os relacionamentos e cardinalidades funcionam na prática, exibindo instâncias (ocorrências) de entidades e as conexões entre elas. O usuário deseja que esse diagrama seja gerado visualmente quando a diretiva `Generate` na DSL incluir `All` ou `OccurrenceDiagram`.

## What Changes
- **Atualização da Gramática e Parser:** Inclusão de `OccurrenceDiagram` como um alvo de geração válido (em `GenerateTarget`, `GENERATE_TARGETS`, e na `ERDSL_GRAMMAR` no parser).
- **Geração do Diagrama de Ocorrências:** Criação de um utilitário/função que gera dados simulados (instâncias e ligações) baseados na cardinalidade de cada relacionamento binário.
- **Componente Visual:** Criação do componente `src/app/OccurrenceDiagramViewer.tsx` que desenha um SVG ilustrando as instâncias (pontos) dentro de suas respectivas entidades (elipses/retângulos) e linhas conectando essas instâncias de acordo com a cardinalidade.
- **Integração na UI:** Atualização do `ModelingToolPage.tsx` para exibir a aba/seção de "Diagrama de Ocorrências" quando o alvo correspondente for ativado.

## Impact
- Affected specs: N/A
- Affected code:
  - `src/modules/ast/index.ts`
  - `src/modules/parser/index.ts`
  - `src/app/OccurrenceDiagramViewer.tsx` (novo)
  - `src/app/ModelingToolPage.tsx`
  - `src/app/modelingToolPageGeneration.ts`

## ADDED Requirements
### Requirement: Suporte ao alvo OccurrenceDiagram na DSL
O sistema DEVE reconhecer `Generate OccurrenceDiagram;` como válido e incluí-lo nos artefatos a serem gerados.

#### Scenario: Declaração na DSL
- **WHEN** o usuário digita `Generate OccurrenceDiagram;`
- **THEN** o parser aceita a declaração sem erros e adiciona o alvo ao AST.

### Requirement: Geração Visual de Ocorrências
O sistema DEVE exibir um diagrama gráfico para cada relacionamento binário do modelo, ilustrando como as instâncias se conectam com base nas cardinalidades.

#### Scenario: Visualização do Diagrama
- **WHEN** o documento contém relacionamentos e o alvo inclui `OccurrenceDiagram` ou `All`
- **THEN** o painel exibe um diagrama SVG para cada relacionamento com pontos conectados representando as instâncias.
