# Redesign da Página do Projeto Spec

## Why
O estilo atual da ferramenta é funcional, mas necessita de uma repaginada para se tornar mais moderno, agradável e profissional. Como o público-alvo inclui iniciantes em modelagem de dados, a interface deve ser convidativa, limpa e transmitir credibilidade. Um bom design reduz a carga cognitiva, melhora a usabilidade e torna a experiência de aprendizado mais fluida.

## What Changes
- **Criação de Design Tokens**: Substituição de cores, espaçamentos e bordas "hardcoded" (ex: hexadecimais espalhados) por variáveis CSS (`--color-primary`, `--spacing-md`, `--radius-lg`, etc.) na raiz (`:root`) do arquivo `styles.css`.
- **Nova Paleta de Cores**: Adoção de uma paleta moderna (ex: tons de Slate para neutros, e Blue/Indigo para ações) que passe um tom educacional, calmo e profissional.
- **Tipografia e Hierarquia**: Refinamento de tamanhos de fonte, pesos e alturas de linha para melhor legibilidade no editor e nos títulos.
- **Melhorias de Layout e Profundidade**: Ajuste de margens, paddings, arredondamento de bordas (`border-radius`) e adição de sombras sutis (`box-shadow`) nos painéis, modais e botões, criando uma hierarquia visual clara através de elevação.
- **Feedback Visual e Microinterações**: Adição de transições (`transition`) em botões, links e inputs para estados de `:hover`, `:focus` e `:active`.
- **Aprimoramento Visual das Páginas**:
  - `ModelingToolPage`: Melhor separação visual entre Header, Seletor de Templates, Editor DSL e o Diagrama.
  - `StartupTemplatePage`: Tornar a "folha" de código inicial mais imersiva e tipograficamente elegante.

## Impact
- Affected specs: Nenhum comportamento funcional ou regra de negócio é alterado. O impacto é puramente na camada de apresentação (UI/UX).
- Affected code:
  - `src/app/styles.css` (reestruturação completa das regras e adição de variáveis).
  - `src/app/ModelingToolPage.tsx` e `src/app/StartupTemplatePage.tsx` (apenas se for necessário ajustar alguma estrutura de DOM/classes para o novo CSS).

## ADDED Requirements
### Requirement: Design Tokens CSS
O sistema DEVE utilizar variáveis CSS para gerenciar o esquema de cores, tipografia e espaçamentos, permitindo fácil manutenção, consistência visual em todo o projeto e suporte futuro a temas (ex: Dark Mode).

### Requirement: Interface Moderna, Convidativa e Responsiva
O sistema DEVE apresentar painéis (ferramentas, editor, diagrama) com bordas suaves, sombras para profundidade e espaçamento consistente. Os controles devem ser facilmente clicáveis e a interface deve adaptar-se graciosamente a telas menores.

## MODIFIED Requirements
### Requirement: Estilização de Componentes Existentes
- **Header e Nav**: Atualizados para ter maior destaque, separação clara do conteúdo e links de navegação bem definidos.
- **Seletor de Templates**: Estilizado para atuar como uma área de destaque (destaque educacional) sem poluir o foco principal da ferramenta.
- **Botões e Inputs**: Devem possuir estados visuais consistentes (default, hover, focus, disabled) com contornos sutis e cores adequadas.
- **Editor e Diagrama**: O fundo e as bordas das áreas de trabalho devem diferenciar-se claramente do "fundo da página", usando contrastes leves.
