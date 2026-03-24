# Tasks
- [x] Task 1: Mapear estado atual e lacunas de edição no diagrama
  - [x] Levantar interações já suportadas e limitações para edição por clique
  - [x] Identificar pontos de extensão em canvas, comandos semânticos e sincronização

- [x] Task 2: Definir modelo de interação por clique
  - [x] Especificar fluxo de renomear entidades e relacionamentos diretamente no canvas
  - [x] Especificar fluxo de edição de atributos por interação inline
  - [x] Especificar fluxo de criação rápida de entidades e criação de relacionamentos por clique

- [x] Task 3: Definir regras de validação e feedback de UX
  - [x] Definir regras para nomes válidos e mensagens de erro amigáveis
  - [x] Definir estados visuais de edição, confirmação, cancelamento e erro
  - [x] Definir comportamento para entradas inválidas sem quebrar geração e visualização

- [x] Task 4: Criar roadmap incremental de implementação
  - [x] Organizar fases de entrega com escopo reduzido por etapa
  - [x] Definir critérios de aceite técnicos e de UX por fase
  - [x] Definir estratégia de testes por fase (unitário, integração, regressão)

- [x] Task 5: Consolidar plano de ação final
  - [x] Publicar plano consolidado com riscos, mitigação e dependências
  - [x] Validar que o plano pode ser executado sem regressão da sincronização AST/DSL/outputs

- [x] Task 6: Implementar interações de clique direto no diagrama
  - [x] Permitir criação de entidade por duplo clique em área vazia do canvas
  - [x] Permitir criação de relacionamento por duplo clique sequencial em entidades
  - [x] Atualizar dicas visuais de uso no toolbar do diagrama
  - [x] Cobrir nova lógica com testes unitários do DiagramCanvas
  - [x] Validar com lint, testes direcionados e build

- [x] Task 7: Implementar renomeação direta por interação no diagrama
  - [x] Permitir renomear entidade por duplo clique no título do card
  - [x] Permitir renomear relacionamento por duplo clique no rótulo/conexão
  - [x] Integrar comandos semânticos de renomeação com sincronização AST/DSL
  - [x] Cobrir mapeamento de comandos de renomeação em testes do diagramEditor
  - [x] Validar com lint, testes direcionados e build

- [x] Task 8: Implementar auto-organização e controles de zoom no DiagramCanvas
  - [x] Adicionar botão Auto-organizar para recalcular layout em grade das entidades
  - [x] Adicionar controles de zoom (+, -, reset) com limites seguros e feedback claro do percentual
  - [x] Persistir estado de zoom e layout no localStorage com fallback seguro
  - [x] Ajustar interação de arraste para respeitar fator de zoom aplicado
  - [x] Atualizar testes unitários do DiagramCanvas para cobrir auto-layout e limites de zoom
  - [x] Validar com lint, testes direcionados e build

# Task Dependencies
- Task 2 depende de Task 1
- Task 3 depende de Task 2
- Task 4 depende de Task 1 e Task 3
- Task 5 depende de Task 2, Task 3 e Task 4
- Task 6 depende de Task 5
- Task 7 depende de Task 6
- Task 8 depende de Task 7
