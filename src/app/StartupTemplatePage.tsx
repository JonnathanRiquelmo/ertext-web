import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { getTemplateDefinition } from './templateRegistry';

interface TemplateLine {
  readonly id: string;
  readonly text: string;
}

const TOKEN_PATTERN =
  /\b(Domain|Entities|Relationships|int|string|datetime|file|isIdentifier|relates)\b|total\/disjoint|\((?:0|1):(?:1|N)\)/g;

const startupTemplate = getTemplateDefinition('social-network');

const startupPreviewDsl = startupTemplate.content.startupPreviewDsl ?? startupTemplate.content.dsl;

const templateLines: readonly TemplateLine[] = startupPreviewDsl
  .split('\n')
  .map((line, index) => ({
    id: `line-${String(index + 1).padStart(2, '0')}`,
    text: line
  }));

const foldRanges = startupTemplate.content.startupFoldRanges ?? [];

function highlightDslTokens(line: string): ReactNode[] {
  TOKEN_PATTERN.lastIndex = 0;
  const fragments: ReactNode[] = [];
  let cursor = 0;
  let tokenMatch = TOKEN_PATTERN.exec(line);

  while (tokenMatch !== null) {
    if (tokenMatch.index > cursor) {
      fragments.push(line.slice(cursor, tokenMatch.index));
    }
    fragments.push(
      <span className="dsl-token" key={`${tokenMatch.index}-${tokenMatch[0]}`}>
        {tokenMatch[0]}
      </span>
    );
    cursor = tokenMatch.index + tokenMatch[0].length;
    tokenMatch = TOKEN_PATTERN.exec(line);
  }

  if (cursor < line.length) {
    fragments.push(line.slice(cursor));
  }

  return fragments;
}

export function StartupTemplatePage() {
  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);
  const [collapsedRanges, setCollapsedRanges] = useState<ReadonlySet<number>>(new Set());

  const foldStartByLine = useMemo(() => {
    const foldMap = new Map<number, readonly [start: number, end: number]>();
    for (const foldRange of foldRanges) {
      foldMap.set(foldRange[0], foldRange);
    }
    return foldMap;
  }, []);

  const isLineVisible = (lineIndex: number): boolean => {
    for (const start of collapsedRanges) {
      const foldRange = foldStartByLine.get(start);
      if (!foldRange) {
        continue;
      }
      const [rangeStart, rangeEnd] = foldRange;
      if (lineIndex > rangeStart && lineIndex <= rangeEnd) {
        return false;
      }
    }
    return true;
  };

  const toggleFold = (lineIndex: number) => {
    const nextCollapsedRanges = new Set(collapsedRanges);
    if (nextCollapsedRanges.has(lineIndex)) {
      nextCollapsedRanges.delete(lineIndex);
      setCollapsedRanges(nextCollapsedRanges);
      return;
    }
    nextCollapsedRanges.add(lineIndex);
    setCollapsedRanges(nextCollapsedRanges);
  };

  return (
    <main className="startup-page" data-testid="startup-template">
      <h1 className="template-caption">
        {startupTemplate.content.startupPreviewCaption ?? startupTemplate.metadata.name}
      </h1>
      <section aria-label="Modelo inicial ERDSL" className="template-paper">
        {templateLines.map((line, lineIndex) => {
          if (!isLineVisible(lineIndex)) {
            return null;
          }

          const foldRange = foldStartByLine.get(lineIndex);
          const isFolded = foldRange ? collapsedRanges.has(lineIndex) : false;
          const lineClasses = ['template-line'];
          if (activeLineIndex === lineIndex) {
            lineClasses.push('is-active');
          }

          return (
            <div className={lineClasses.join(' ')} key={line.id}>
              <div className="template-line-gutter">
                {foldRange ? (
                  <button
                    aria-label={isFolded ? 'Expandir bloco' : 'Recolher bloco'}
                    className="fold-marker"
                    onClick={() => toggleFold(lineIndex)}
                    type="button"
                  >
                    {isFolded ? '+' : '−'}
                  </button>
                ) : null}
              </div>
              <button
                className="template-line-content"
                onClick={() => setActiveLineIndex(lineIndex)}
                type="button"
              >
                {highlightDslTokens(line.text)}
                {isFolded ? <Fragment> …</Fragment> : null}
              </button>
            </div>
          );
        })}
      </section>
    </main>
  );
}
