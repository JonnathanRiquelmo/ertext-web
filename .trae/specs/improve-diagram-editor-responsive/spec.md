# Melhoria do Editor de Diagrama Spec

## Why
O editor atual ainda não oferece uma experiência visual suficientemente dinâmica para modelagem direta no canvas. Esta mudança melhora manipulação gráfica e responsividade sem quebrar o fluxo AST-first já existente.

## What Changes
- Evoluir o editor de diagrama para operação visual interativa com criação e edição direta no canvas.
- Implementar arrastar e reposicionar elementos com persistência de layout por nó.
- Implementar criação visual de entidades e relacionamentos com conexão entre nós.
- Implementar edição visual de cardinalidades e atributos de relacionamento.
- Melhorar a representação visual de entidades, relacionamentos e rótulos de cardinalidade.
- Garantir sincronização determinística das operações gráficas para AST e regeneração textual.
- Tornar a interface web totalmente responsiva para desktop, tablet e mobile.
- Melhorar acessibilidade e usabilidade de controles visuais (alvos de toque, foco e atalhos básicos).

## Impact
- Affected specs: modelagem gráfica interativa, sincronização diagram→AST, layout responsivo, UX do canvas.
- Affected code: módulo de UI do diagrama, projeção de diagrama, camada de sincronização, shell da aplicação e estilos responsivos.

## ADDED Requirements
### Requirement: Edição Visual Interativa de Diagrama
O sistema SHALL permitir manipulação direta dos elementos do diagrama com operações de criar, arrastar e conectar.

#### Scenario: Criação e posicionamento de entidade
- **WHEN** o usuário cria uma entidade no canvas e a arrasta para uma nova posição
- **THEN** o estado do diagrama e o AST refletem a entidade e sua posição final sem perda de consistência

#### Scenario: Criação de relacionamento visual
- **WHEN** o usuário conecta entidades para criar um relacionamento
- **THEN** o AST recebe comandos semânticos equivalentes e o texto DSL é regenerado de forma canônica

### Requirement: Edição de Cardinalidades e Metadados
O sistema SHALL permitir editar cardinalidades e propriedades relevantes do relacionamento pela interface gráfica.

#### Scenario: Atualização de cardinalidade
- **WHEN** o usuário altera cardinalidade em uma conexão
- **THEN** a alteração é aplicada no AST e refletida em diagrama e DSL de forma determinística

### Requirement: Interface Web Totalmente Responsiva
O sistema SHALL adaptar layout, painel e canvas para múltiplas resoluções e entradas (mouse/toque).

#### Scenario: Uso em viewport reduzida
- **WHEN** o usuário abre o editor em resolução mobile ou tablet
- **THEN** a interface reorganiza painéis, preserva legibilidade e mantém operações principais acessíveis

### Requirement: Preservação do Contrato AST-First
O sistema SHALL manter AST como única fonte de verdade para qualquer edição gráfica.

#### Scenario: Operações visuais contínuas
- **WHEN** o usuário realiza múltiplas ações rápidas no diagrama
- **THEN** o pipeline rejeita atualizações obsoletas e preserva convergência entre texto e diagrama

## MODIFIED Requirements
### Requirement: Editor de Diagrama
O editor SHALL deixar de ser apenas uma projeção estática e passar a oferecer manipulação visual completa com feedback imediato, mantendo sincronização bidirecional via AST.

## REMOVED Requirements
### Requirement: Interação mínima no diagrama
**Reason**: Interação limitada reduz produtividade e não atende o objetivo de modelagem visual.
**Migration**: Substituir operações simplificadas por comandos semânticos de alto nível ligados ao pipeline AST.
