# Edição Direta no Diagrama Spec

## Why
Atualmente o diagrama já permite algumas interações visuais, mas ainda depende muito do fluxo textual para alterações finas. É necessário validar a viabilidade e definir um plano de ação para edição direta por cliques no próprio canvas, com menor fricção para o usuário.

## What Changes
- Definir um plano técnico para edição inline de nomes de entidades, atributos e relacionamentos via clique no diagrama.
- Definir estratégia para criação de entidades e relacionamentos por interação direta no canvas.
- Mapear impactos na sincronização Diagrama → AST → DSL → geração de saídas.
- Propor rollout incremental com critérios de aceite, riscos e estratégia de testes.

## Impact
- Affected specs: edição visual de diagrama, sincronização semântica com AST, validação de entradas, UX de modelagem.
- Affected code: `src/app/DiagramCanvas.tsx`, `src/modules/ui/diagramEditor.ts`, `src/modules/sync/index.ts`, `src/app/ModelingToolPage.tsx`, testes de integração e UI.

## Diagnóstico de Viabilidade
### Capacidades já disponíveis (alto reaproveitamento)
- Seleção e foco de relacionamentos no canvas com eventos de clique e teclado.
- Atualização semântica de cardinalidade com propagação para AST e sincronização textual.
- Criação semântica de entidades e relacionamentos por comandos tipados.
- Pipeline de commit com tratamento de diagnóstico e rollback lógico por revisão.

### Lacunas para edição direta por clique
- Edição inline de texto no canvas ainda não possui componente/estado dedicado.
- Não há fluxo unificado para renomear entidade, relacionamento e atributo.
- Não existe camada explícita de validação UX antes de disparar comando semântico.
- Falta padronização de feedback visual para sucesso, erro e cancelamento.

### Conclusão de viabilidade
- Viabilidade técnica: **Alta**, com foco em extensão incremental do `DiagramCanvas` e dos comandos semânticos.
- Viabilidade de UX: **Média/Alta**, condicionada à validação imediata, affordances visuais claras e prevenção de erro.
- Estratégia recomendada: implementar por fases curtas para reduzir risco de regressão na sincronização Diagrama → AST → DSL.

## ADDED Requirements
### Requirement: Plano de Viabilidade para Edição Direta
O sistema SHALL produzir uma análise de viabilidade técnica para edição direta no diagrama com foco em cliques e edição inline.

#### Scenario: Viabilidade confirmada por capacidade atual
- **WHEN** as capacidades atuais do editor gráfico forem analisadas
- **THEN** deve existir um diagnóstico de lacunas e reaproveitamento de módulos existentes
- **AND** o diagnóstico deve indicar riscos técnicos e de UX

### Requirement: Plano de Interações de Usuário no Canvas
O sistema SHALL definir o comportamento esperado para cliques no diagrama para renomear entidades, editar atributos, editar relacionamentos, criar entidades e criar relacionamentos.

#### Scenario: Especificação de interações por clique
- **WHEN** o plano for concluído
- **THEN** cada ação de usuário deve ter fluxo de entrada, validação e feedback visual definidos
- **AND** os fluxos devem prever cancelamento, confirmação e tratamento de erro

#### Scenario: Fluxos por clique definidos ponta a ponta
- **WHEN** o usuário clicar no nome de uma entidade
- **THEN** o sistema deve abrir editor inline com valor atual e atalhos de confirmar/cancelar
- **AND** ao confirmar deve validar nome e aplicar comando de rename com atualização no DSL

- **WHEN** o usuário clicar no nome de um relacionamento
- **THEN** o sistema deve habilitar edição inline com pré-validação local
- **AND** ao confirmar deve persistir no AST e refletir no canvas sem recarregar a tela

- **WHEN** o usuário clicar para editar atributo de relacionamento
- **THEN** o sistema deve permitir alterar nome e tipo com validação de formato e duplicidade
- **AND** ao erro deve exibir mensagem contextual e manter estado editável

- **WHEN** o usuário clicar em ação de criar entidade no canvas
- **THEN** o sistema deve posicionar a nova entidade no layout e abrir edição do nome
- **AND** ao confirmar deve gerar comando semântico e sincronizar projeção textual

- **WHEN** o usuário iniciar criação de relacionamento por clique em origem/destino
- **THEN** o sistema deve mostrar estado visual de conexão em progresso
- **AND** ao concluir deve criar relacionamento com cardinalidade padrão editável

### Requirement: Validação de UX e Feedback de Erro
O sistema SHALL definir regras de validação de entrada e feedback visual imediato para evitar fricção e preservar consistência semântica.

#### Scenario: Regras de validação UX aplicadas antes do commit
- **WHEN** o usuário inserir nome vazio, inválido ou duplicado
- **THEN** a confirmação deve ser bloqueada com mensagem clara orientada à correção
- **AND** o estado de edição deve permanecer ativo sem perda do input

#### Scenario: Feedback visual consistente em todo fluxo
- **WHEN** ocorrer confirmação, cancelamento ou erro
- **THEN** o sistema deve aplicar estados visuais padronizados (editing, success, cancelled, error)
- **AND** mensagens devem ser curtas, acionáveis e contextualizadas ao elemento editado

### Requirement: Plano de Implementação Incremental
O sistema SHALL propor uma sequência incremental de implementação para reduzir risco e permitir validação contínua.

#### Scenario: Roadmap executável
- **WHEN** o plano de ação for publicado
- **THEN** ele deve conter fases, dependências e critérios de aceite por fase
- **AND** deve incluir estratégia de testes (unitário, integração e regressão UX)

#### Scenario: Roadmap incremental com entregas verificáveis
- **WHEN** o roadmap for detalhado
- **THEN** ele deve conter as fases abaixo com critérios objetivos:
- **AND** cada fase deve manter compatibilidade com fluxo atual de sincronização

Fase 1 — Fundação de edição inline
- Escopo: estado de edição no canvas, componente reutilizável de input inline, contratos de validação.
- Dependências: nenhuma além da base atual.
- Aceite: editar/cancelar em entidade sem regressão dos testes existentes.

Fase 2 — Renomeação de entidade e relacionamento
- Escopo: comandos semânticos de rename e integração no pipeline de commit.
- Dependências: Fase 1.
- Aceite: atualização refletida em AST/DSL/diagrama com tratamento de duplicidade.

Fase 3 — Edição de atributos no canvas
- Escopo: CRUD inline de atributos de relacionamento com validação de tipo e nome.
- Dependências: Fase 2.
- Aceite: fluxos cobertos por testes unitários e integração de sincronização.

Fase 4 — Criação por clique e conexão assistida
- Escopo: criação de entidade por clique e relacionamento por seleção origem/destino.
- Dependências: Fase 2.
- Aceite: feedback visual completo e persistência correta após confirmação.

Fase 5 — Hardening de UX e regressão
- Escopo: refinamento de mensagens, acessibilidade, atalhos, regressão end-to-end.
- Dependências: Fases 3 e 4.
- Aceite: suíte de regressão estável e checklist UX aprovado.

### Requirement: Gestão de Riscos e Mitigações
O sistema SHALL explicitar riscos técnicos e de UX com ações de mitigação e gatilhos de contingência.

#### Scenario: Riscos críticos controlados
- **WHEN** o plano final for consolidado
- **THEN** ele deve listar riscos, probabilidade, impacto e mitigação
- **AND** cada risco crítico deve possuir indicador de detecção antecipada

## Matriz de Riscos
- Risco: regressão na sincronização Diagrama → AST → DSL.
  - Probabilidade: média.
  - Impacto: alto.
  - Mitigação: testes de integração por commit semântico e validação por revisão.
- Risco: conflito de estado entre edição inline e eventos de drag.
  - Probabilidade: média.
  - Impacto: médio/alto.
  - Mitigação: máquina de estados explícita para modos `idle`, `dragging`, `editing`, `connecting`.
- Risco: baixa discoverability dos fluxos por clique.
  - Probabilidade: média.
  - Impacto: médio.
  - Mitigação: affordances visuais, microcopy contextual e testes de UX orientados a tarefa.
- Risco: aumento de complexidade no `DiagramCanvas.tsx`.
  - Probabilidade: alta.
  - Impacto: médio.
  - Mitigação: extração de hooks/componentes coesos e cobertura unitária por módulo.
- Risco: mensagens de erro inconsistentes entre camadas.
  - Probabilidade: média.
  - Impacto: médio.
  - Mitigação: contrato único de erro de validação e normalização no boundary de UI.

## MODIFIED Requirements
### Requirement: Escopo de Melhoria do Diagrama
O escopo de melhorias do diagrama passa a incluir edição direta por clique como próximo passo prioritário de UX, além das capacidades já existentes de arrastar, conectar e editar cardinalidade.

## REMOVED Requirements
- None.
