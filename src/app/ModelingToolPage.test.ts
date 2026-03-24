import { createElement, isValidElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { parseErdsl } from '../modules/parser';
import { GeneratedOutputsErrorBoundary, GeneratedOutputsPanel } from './ModelingToolPage';
import { generateArtifactsSafely } from './modelingToolPageGeneration';
import {
  buildTemplateOptionLabel,
  resolveInitialTemplateId,
  TEMPLATE_SELECTOR_OPTIONS
} from './modelingTemplateSelector';

interface PatchedBoundaryInstance {
  state: { hasError: boolean; retryVersion: number };
  props: unknown;
  setState: unknown;
}

function patchSetStateForUnmountedBoundary(instance: PatchedBoundaryInstance): void {
  instance.setState = ((
    updater:
      | Record<string, unknown>
      | ((state: { hasError: boolean; retryVersion: number }, props: unknown) => Record<string, unknown>),
    callback?: () => void
  ) => {
    const nextState =
      typeof updater === 'function' ? updater(instance.state, instance.props) : updater ?? {};
    instance.state = { ...instance.state, ...nextState };
    callback?.();
  }) as typeof instance.setState;
}

function findRetryButton(element: ReactElement): ReactElement {
  const children = Array.isArray(element.props.children)
    ? element.props.children
    : [element.props.children];

  const retryButton = children.find(
    (child: unknown) => isValidElement(child) && typeof child.type === 'string' && child.type === 'button'
  );

  if (!isValidElement(retryButton)) {
    throw new Error('Expected retry button in fallback.');
  }

  return retryButton;
}

describe('modelingToolPage template selector', () => {
  it('exposes themed options with readable labels', () => {
    const options = TEMPLATE_SELECTOR_OPTIONS;

    expect(options.map((option) => option.id)).toEqual([
      'university-courses',
      'social-network',
      'artificial-intelligence',
      'supply-chain-logistics'
    ]);
    expect(options.every((option) => option.label.includes('Tema:'))).toBe(true);
  });

  it('uses the first registered template as default selection', () => {
    expect(resolveInitialTemplateId()).toBe(TEMPLATE_SELECTOR_OPTIONS[0]?.id);
  });

  it('formats labels with template and theme names', () => {
    expect(buildTemplateOptionLabel('Rede Social', 'Grafo de Pessoas')).toBe(
      'Rede Social — Tema: Grafo de Pessoas'
    );
  });

  it('keeps UI-safe artifacts when generation fails for intermediate entity typing', () => {
    // We construct a synthetic AST to simulate a generator failure (e.g. table without columns),
    // because the parser now correctly catches entities without identifiers early.
    const ast: any = {
      id: 'document',
      kind: 'ErdslDocument',
      span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
      generate: { id: 'generate', kind: 'GenerateBlock', target: 'All', span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } } },
      domain: { id: 'domain', kind: 'DomainBlock', name: 'Test', span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } } },
      entities: {
        id: 'entities',
        kind: 'EntitiesBlock',
        entities: [
          {
            id: 'entity:a',
            kind: 'Entity',
            name: 'A',
            generalization: null,
            superEntity: null,
            attributes: [],
            span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } }
          }
        ],
        span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } }
      },
      relationships: {
        id: 'relationships',
        kind: 'RelationshipsBlock',
        relationships: [],
        span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } }
      }
    };

    const result = generateArtifactsSafely(ast);
    expect(result.errorMessage).toContain('Cannot generate MySQL SQL for table "a" without columns.');
    expect(result.artifacts.logicalSchema!.tables.some((table) => table.name === 'a')).toBe(true);
    expect(result.artifacts.mysql).toBeUndefined();
    expect(result.artifacts.postgresql).toBeUndefined();
  });
});

describe('GeneratedOutputsErrorBoundary', () => {
  it('switches to error state after child render failure', () => {
    expect(GeneratedOutputsErrorBoundary.getDerivedStateFromError()).toEqual({
      hasError: true
    });
  });

  it('shows fallback with retry guidance when boundary is in error state', () => {
    const boundary = new GeneratedOutputsErrorBoundary({
      children: createElement('div', null, 'safe content')
    });
    Object.defineProperty(boundary, 'state', {
      value: { hasError: true, retryVersion: 0 },
      writable: true
    });

    const fallback = boundary.render() as ReactElement;
    const retryButton = findRetryButton(fallback);

    expect(fallback.props.role).toBe('alert');
    expect(retryButton.props.children).toBe('Tentar novamente');
  });

  it('resets boundary state and calls retry callback when retry is triggered', () => {
    const onRetry = vi.fn();
    const boundary = new GeneratedOutputsErrorBoundary({
      children: createElement('div', null, 'safe content'),
      onRetry
    });
    Object.defineProperty(boundary, 'state', {
      value: { hasError: true, retryVersion: 2 },
      writable: true
    });
    patchSetStateForUnmountedBoundary(boundary as unknown as PatchedBoundaryInstance);

    const fallback = boundary.render() as ReactElement;
    const retryButton = findRetryButton(fallback);
    retryButton.props.onClick();

    expect(boundary.state).toEqual({ hasError: false, retryVersion: 3 });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('GeneratedOutputsPanel', () => {
  it('shows alert fallback when safe generation includes a generation error', () => {
    const ast: any = {
      id: 'document',
      kind: 'ErdslDocument',
      span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
      generate: { id: 'generate', kind: 'GenerateBlock', target: 'All', span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } } },
      domain: { id: 'domain', kind: 'DomainBlock', name: 'Test', span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } } },
      entities: {
        id: 'entities',
        kind: 'EntitiesBlock',
        entities: [
          {
            id: 'entity:a',
            kind: 'Entity',
            name: 'A',
            generalization: null,
            superEntity: null,
            attributes: [],
            span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } }
          }
        ],
        span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } }
      },
      relationships: {
        id: 'relationships',
        kind: 'RelationshipsBlock',
        relationships: [],
        span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } }
      }
    };
    const generation = generateArtifactsSafely(ast);
    const panel = GeneratedOutputsPanel({ generation, hasParserDiagnostics: false }) as ReactElement;
    const children = Array.isArray(panel.props.children) ? panel.props.children : [panel.props.children];
    const fallback = children.find(
      (child: unknown) => isValidElement(child) && typeof child.type === 'string' && child.type === 'section'
    ) as ReactElement | undefined;

    expect(fallback?.props.role).toBe('alert');
    const fallbackChildren = Array.isArray(fallback?.props.children)
      ? fallback.props.children
      : [fallback?.props.children];
    const heading = fallbackChildren[0] as ReactElement | undefined;
    expect(heading?.props.children).toBe('As saídas geradas estão temporariamente indisponíveis.');
  });

  it('pauses outputs and shows alert when parser diagnostics exist', () => {
    const parsed = parseErdsl(`Generate All;
Domain University_Courses;
Entities {
  Student { studentId int isIdentifier }
};
Relationships {
};
`);
    if (!parsed.ok) {
      throw new Error('Expected parse success.');
    }
    const generation = generateArtifactsSafely(parsed.ast);
    const panel = GeneratedOutputsPanel({ generation, hasParserDiagnostics: true }) as ReactElement;
    expect(panel.props.role).toBe('alert');
    const children = Array.isArray(panel.props.children) ? panel.props.children : [panel.props.children];
    const heading = children[0] as ReactElement | undefined;
    expect(heading?.props.children).toBe('As saídas geradas estão pausadas devido a erros de validação da DSL.');
  });
});
