# Tasks
- [x] Task 1: Evoluir o canvas para manipulação visual dinâmica
  - [x] Implementar arrastar e reposicionar nós com persistência de layout
  - [x] Implementar criação visual de entidades no canvas
  - [x] Implementar criação de conexões para relacionamentos entre entidades
  - [x] Implementar criação de entidade por duplo clique em área vazia do canvas
  - [x] Implementar criação de relacionamento por sequência de duplo clique em duas entidades

- [x] Task 2: Habilitar edição visual de relacionamentos
  - [x] Implementar edição de cardinalidades em conexões
  - [x] Implementar edição de atributos de relacionamento na UI gráfica
  - [x] Sincronizar comandos semânticos do diagrama com AST sem lógica duplicada

- [x] Task 3: Melhorar representação visual do diagrama
  - [x] Criar componentes visuais claros para entidade, relacionamento e rótulos
  - [x] Diferenciar visualmente cardinalidades e direções de conexão
  - [x] Garantir feedback imediato em seleção, foco e estados de edição

- [x] Task 4: Tornar interface totalmente responsiva
  - [x] Adaptar layout para desktop, tablet e mobile
  - [x] Ajustar painéis e área do canvas com breakpoints consistentes
  - [x] Garantir usabilidade por toque e alvos clicáveis adequados

- [x] Task 5: Validar sincronização e qualidade
  - [x] Criar testes para operações de arrastar, conectar e editar cardinalidade
  - [x] Criar testes unitários para ações de duplo clique no canvas
  - [x] Criar cenário fim-a-fim diagrama→AST→DSL sob edições contínuas
  - [x] Executar lint, testes e build garantindo estabilidade

# Task Dependencies
- Task 2 depende de Task 1
- Task 3 depende de Task 1
- Task 4 pode ocorrer em paralelo com Task 2 e Task 3
- Task 5 depende de Task 2, Task 3 e Task 4

# Parallelization Notes
- Task 2 e Task 3 podem ser executadas em paralelo após Task 1
- Task 4 pode ser iniciada logo após Task 1, em paralelo
