# Tasks
- [x] Task 1: Refatorar a base do arquivo `styles.css` introduzindo Variáveis CSS (Design Tokens).
  - [x] SubTask 1.1: Definir paleta de cores (primária, fundo, texto neutro, bordas, cores semânticas como erro/sucesso).
  - [x] SubTask 1.2: Definir variáveis de espaçamento, arredondamento (radius) e sombras (box-shadow).
  - [x] SubTask 1.3: Atualizar o seletor `:root` e o estilo do `body` com os novos tokens.
- [x] Task 2: Aplicar novo visual em elementos globais (botões, inputs e formulários).
  - [x] SubTask 2.1: Estilizar controles genéricos com bordas suaves, cor de fundo consistente e transições (`transition: all 0.2s ease-in-out`).
  - [x] SubTask 2.2: Configurar os estados visuais para interações (`:hover`, `:focus-visible`, `:disabled`).
- [x] Task 3: Revitalizar os componentes da `ModelingToolPage`.
  - [x] SubTask 3.1: Atualizar `.tool-header` e navegação (`.tool-nav`) para um visual mais limpo e destacado.
  - [x] SubTask 3.2: Modernizar a área do `.template-selector` (gradientes sutis, sombras suaves).
  - [x] SubTask 3.3: Melhorar as caixas dos painéis principais (`.tool-panel`, `.dsl-editor`, `.diagram-canvas-viewport`, `.output-panel`) com fundos e bordas que destaquem as áreas de conteúdo.
  - [x] SubTask 3.4: Ajustar barras de ferramentas do diagrama e controles de zoom para o novo design de botões.
- [x] Task 4: Revitalizar a `StartupTemplatePage` (Tela de Início).
  - [x] SubTask 4.1: Estilizar adequadamente a `.startup-page` com tipografia envolvente e bom respiro.
  - [x] SubTask 4.2: Atualizar o design das "linhas" do template (`.template-line`, `.fold-marker`) e syntax highlighting para se integrarem ao visual mais suave.
- [x] Task 5: Validação e Testes.
  - [x] SubTask 5.1: Executar localmente a aplicação e validar o layout responsivo em resoluções menores (`@media (max-width: 768px)`).
  - [x] SubTask 5.2: Garantir que os testes E2E e de UI continuem passando após as alterações de classes/cores (Vitest/Playwright).

# Task Dependencies
- Task 2 depende de Task 1.
- Task 3 depende de Task 2.
- Task 4 depende de Task 2.
- Task 5 depende de todas as tarefas anteriores.
