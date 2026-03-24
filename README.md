# ERText Web

Web-based modeling tool for Entity-Relationship DSL (ERDSL) providing bidirectional synchronization between text and diagrams.

## Quick Start

```bash
npm install
npm run dev
```

## Available Scripts

- `npm run dev`: Start Vite dev server.
- `npm run lint`: Run ESLint with zero warnings tolerance.
- `npm run build`: Type-check and produce production build.
- `npm run preview`: Preview production bundle.

## Project Structure

- `src/modules/parser`: Parser pipeline and grammar contracts.
- `src/modules/ast`: AST domain model and command engine.
- `src/modules/sync`: Text-diagram synchronization workflows.
- `src/modules/ui`: View layer orchestration and widgets.
- `src/modules/generators`: SQL and output generator plugins.
- `src/shared`: Shared contracts and cross-module primitives.

## Architecture Notes

- Keep module communication through typed contracts in `src/shared`.
- Favor composition and pure functions for deterministic behavior.
- Keep each module independently testable.

## Open Source Entry Points

- Contribution workflow: `CONTRIBUTING.md`
- Conduct expectations: `CODE_OF_CONDUCT.md`
- License: `LICENSE`
