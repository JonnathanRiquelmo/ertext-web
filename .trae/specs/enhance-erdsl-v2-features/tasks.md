# Tasks
- [x] Task 1: Apresentação Visual do Esquema Lógico
  - [x] SubTask 1.1: Criar o componente `LogicalSchemaViewer.tsx` que recebe a interface `LogicalSchema` e renderiza as tabelas de forma visual (usando CSS moderno e ícones para PK/FK).
  - [x] SubTask 1.2: Atualizar o componente `GeneratedOutputsPanel` em `src/app/ModelingToolPage.tsx` para usar o `LogicalSchemaViewer` ao invés de exibir o `JSON.stringify`.

- [x] Task 2: Suporte Visual a Relacionamentos Ternários / Ocorrências
  - [x] SubTask 2.1: Atualizar a extração do diagrama (projection) para garantir que a flag `occurrence` (`@generateOccurrenceDiagram`) seja passada para o canvas.
  - [x] SubTask 2.2: Modificar `DiagramCanvas.tsx` para adicionar a lógica de renderização SVG (formato de losango) para os relacionamentos marcados com `occurrence`.

- [x] Task 3: Validações Semânticas Ricas no Parser
  - [x] SubTask 3.1: Adicionar regras de negócio de banco de dados na função `validateReferences` (ou criar nova função) em `src/modules/parser/index.ts`.
  - [x] SubTask 3.2: Implementar a detecção de entidades sem chave primária (`isIdentifier`) para gerar um `ParserDiagnostic` orientando o usuário.

# Task Dependencies
- [Task 1] e [Task 2] podem ser feitas em paralelo.
- [Task 3] pode ser feita em paralelo às Tasks 1 e 2.