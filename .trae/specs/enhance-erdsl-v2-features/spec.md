# Enhance ERDSL v2 Features Spec

## Why
A fim de atingir paridade total e superioridade em relação à versão 1.0 (Java/Xtext) documentada na dissertação, precisamos implementar melhorias visuais e semânticas. O esquema lógico atualmente é exibido como um JSON cru, os relacionamentos ternários precisam de representação visual no canvas e a linguagem precisa de validações semânticas mais ricas voltadas para modelagem de banco de dados.

## What Changes
- **Visualização do Esquema Lógico:** Criação de um componente React para renderizar o esquema lógico (`LogicalSchema`) no formato de tabelas relacionais visuais (com indicadores de PK/FK).
- **Suporte a Relacionamentos Ternários/Ocorrências:** Atualização do `DiagramCanvas` para renderizar o símbolo de losango em relacionamentos com a flag `@generateOccurrenceDiagram`.
- **Validações Semânticas Ricas:** Inclusão de regras de negócio de banco de dados no parser (ex: identificar e alertar sobre entidades fracas sem relacionamentos identificadores).

## Impact
- Affected specs: N/A
- Affected code: 
  - `src/app/ModelingToolPage.tsx`
  - `src/app/LogicalSchemaViewer.tsx` (novo)
  - `src/app/DiagramCanvas.tsx`
  - `src/modules/parser/index.ts`

## ADDED Requirements
### Requirement: Apresentação Visual do Esquema Lógico
O sistema DEVE exibir o modelo lógico como tabelas visuais em vez de JSON bruto.
#### Scenario: Visualização do Esquema Lógico
- **WHEN** o usuário seleciona a visualização de "Esquema lógico" ou "Todos"
- **THEN** o painel de saídas renderiza as tabelas com colunas, tipos e ícones para chaves primárias e estrangeiras.

### Requirement: Renderização de Relacionamentos Ternários
O sistema DEVE renderizar relacionamentos com ocorrências de forma distinta no diagrama.
#### Scenario: Entidade associativa / Ocorrência
- **WHEN** um relacionamento possui a tag `@generateOccurrenceDiagram`
- **THEN** o diagrama o renderiza como um nó de relacionamento (losango) e o conecta adequadamente no canvas.

## MODIFIED Requirements
### Requirement: Validações Semânticas do Parser
O sistema DEVE emitir diagnósticos detalhados não apenas para erros sintáticos, mas para falhas de modelagem (erros semânticos).
#### Scenario: Entidade sem chave primária
- **WHEN** uma entidade é declarada sem atributo identificador (`isIdentifier`)
- **THEN** o parser deve emitir um diagnóstico (aviso ou erro semântico) informando que a entidade não possui identificador (pode ser entidade fraca e exigir relacionamento de dependência).
