# Contributing

Thanks for contributing to ERDSL Web.

## Development Workflow

1. Fork and create a feature branch from `main`.
2. Install dependencies with `npm install`.
3. Run `npm run lint` and `npm run build` before opening a PR.
4. Keep pull requests focused and include architectural rationale.

## Extensibility Conventions

- Add new capabilities inside the owning module (`src/modules/<module-name>`).
- Expose module APIs through the module `index.ts` only.
- Promote shared contracts to `src/shared` to avoid cyclic dependencies.
- Prefer interfaces and factory functions over concrete class coupling.

## Code Standards

- TypeScript strict mode is mandatory.
- Avoid hidden side effects and mutable shared state.
- Use semantic naming and keep functions small.
- Handle errors explicitly with actionable messages.
