# Tasks
- [x] Task 1: Atualização da Gramática e Parser
  - [x] SubTask 1.1: Em `src/modules/ast/index.ts`, adicione `'OccurrenceDiagram'` ao tipo `GenerateTarget`.
  - [x] SubTask 1.2: Em `src/modules/parser/index.ts`, atualize `ERDSL_GRAMMAR` e `GENERATE_TARGETS` para incluir `'OccurrenceDiagram'`.
  - [x] SubTask 1.3: Em `src/app/ModelingToolPage.tsx`, adicione a opção `'OccurrenceDiagram'` em `GENERATE_OPTIONS`.
  - [x] SubTask 1.4: Adicione testes/atualize os existentes no parser para validar `Generate OccurrenceDiagram;`.

- [x] Task 2: Lógica de Geração do Diagrama de Ocorrências
  - [x] SubTask 2.1: Crie o arquivo `src/modules/generators/occurrenceGenerator.ts`.
  - [x] SubTask 2.2: Implemente a função `generateOccurrenceData(relationships)` que para cada relacionamento mapeia instâncias de exemplo e as conexões entre elas respeitando as cardinalidades `(0:1), (1:1), (0:N), (1:N)`.
  - [x] SubTask 2.3: Exporte a tipagem `OccurrenceData` (relacionamento, entidades, instâncias, links).
  - [x] SubTask 2.4: Atualize `src/app/modelingToolPageGeneration.ts` e/ou `src/modules/generators/index.ts` para retornar os dados de ocorrência se o target for `All` ou `OccurrenceDiagram`.

- [x] Task 3: Componente Visual (UI)
  - [x] SubTask 3.1: Crie o componente `src/app/OccurrenceDiagramViewer.tsx` que recebe a lista de `OccurrenceData`.
  - [x] SubTask 3.2: Renderize gráficos SVG para cada relacionamento, exibindo um contêiner para cada entidade com pontos dentro (representando as instâncias) e linhas ligando os pontos de acordo com os `links` gerados.
  - [x] SubTask 3.3: Estilize usando `styles.css`.
  - [x] SubTask 3.4: Integre o componente na `GeneratedOutputsPanel` em `src/app/ModelingToolPage.tsx` exibindo-o na interface.

- [x] Task 4: Testes de Validação
  - [x] SubTask 4.1: Escreva testes unitários para a lógica de geração de ocorrências (`occurrenceGenerator.test.ts`), garantindo que as cardinalidades estão sendo respeitadas.

# Task Dependencies
- [Task 1] não possui dependências.
- [Task 2] depende da Task 1.
- [Task 3] depende da Task 2.
- [Task 4] depende da Task 2.