import { Component, Fragment, useState, type ErrorInfo, type ReactNode } from 'react';

import { createAstStateEngine, type AstCommand, type GenerateTarget, type ParserDiagnostic } from '../modules/ast';
import { parseErdsl } from '../modules/parser';
import { createSyncCoordinator } from '../modules/sync';
import { mapDiagramSemanticToAstCommands, type DiagramSemanticCommand } from '../modules/ui';
import { exportDiagramBundle } from '../modules/ui/exporters';
import { DiagramCanvas } from './DiagramCanvas';
import { LogicalSchemaViewer } from './LogicalSchemaViewer';
import { OccurrenceDiagramViewer } from './OccurrenceDiagramViewer';
import { generateArtifactsSafely } from './modelingToolPageGeneration';
import {
  resolveInitialTemplateId,
  TEMPLATE_SELECTOR_OPTIONS
} from './modelingTemplateSelector';
import { starterDsl } from './sampleDsl';
import { loadTemplateThroughSyncPipeline } from './templateLoading';
import { getTemplateDefinition } from './templateRegistry';

const GENERATE_OPTIONS: readonly { label: string; value: GenerateTarget }[] = [
  { label: 'Todos', value: 'All' },
  { label: 'Diagrama', value: 'Diagram' },
  { label: 'Diagrama de Ocorrências', value: 'OccurrenceDiagram' },
  { label: 'Esquema lógico', value: 'LogicalSchema' },
  { label: 'MySQL', value: 'MySQL' },
  { label: 'PostgreSQL', value: 'PostgreSQL' }
];

const TEMPLATE_SELECT_ID = 'template-selector';

interface RuntimeContext {
  readonly engine: ReturnType<typeof createAstStateEngine>;
  readonly coordinator: ReturnType<typeof createSyncCoordinator>;
}

interface GeneratedOutputsPanelProps {
  readonly generation: ReturnType<typeof generateArtifactsSafely>;
  readonly hasParserDiagnostics: boolean;
}

interface GeneratedOutputsErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onRetry?: () => void;
}

interface GeneratedOutputsErrorBoundaryState {
  readonly hasError: boolean;
  readonly retryVersion: number;
}

export function GeneratedOutputsPanel({ generation, hasParserDiagnostics }: GeneratedOutputsPanelProps) {
  const { artifacts, errorMessage } = generation;

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).catch((error) => {
      console.error('Failed to copy text:', error);
    });
  };

  if (hasParserDiagnostics) {
    return (
      <section className="output-panel-fallback" role="alert" aria-live="assertive">
        <h3>As saídas geradas estão pausadas devido a erros de validação da DSL.</h3>
        <p>Corrija os diagnósticos do parser no editor para regenerar as saídas lógica e SQL.</p>
      </section>
    );
  }
  return (
    <>
      {errorMessage ? (
        <section className="output-panel-fallback" role="alert" aria-live="assertive">
          <h3>As saídas geradas estão temporariamente indisponíveis.</h3>
          <p>{errorMessage}</p>
          <p>Continue editando a DSL e as saídas serão recuperadas automaticamente quando o modelo ficar válido.</p>
        </section>
      ) : null}
      <section>
        <div className="output-panel-header">
          <h3>Esquema Lógico</h3>
          {artifacts.logicalSchema && (
            <button
              type="button"
              className="copy-button"
              onClick={() => handleCopy(JSON.stringify(artifacts.logicalSchema, null, 2))}
              aria-label="Copiar Esquema Lógico"
              title="Copiar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          )}
        </div>
        {artifacts.logicalSchema ? <LogicalSchemaViewer schema={artifacts.logicalSchema} /> : <pre>Não gerado para o alvo atual.</pre>}
      </section>
      <section>
        <div className="output-panel-header">
          <h3>Diagrama de Ocorrências</h3>
        </div>
        {artifacts.occurrenceData ? <OccurrenceDiagramViewer occurrenceData={artifacts.occurrenceData} /> : <pre>Não gerado para o alvo atual.</pre>}
      </section>
      <section>
        <div className="output-panel-header">
          <h3>MySQL</h3>
          {artifacts.mysql && (
            <button
              type="button"
              className="copy-button"
              onClick={() => handleCopy(artifacts.mysql!)}
              aria-label="Copiar MySQL"
              title="Copiar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          )}
        </div>
        <pre>{artifacts.mysql ?? 'Não gerado para o alvo atual.'}</pre>
      </section>
      <section>
        <div className="output-panel-header">
          <h3>PostgreSQL</h3>
          {artifacts.postgresql && (
            <button
              type="button"
              className="copy-button"
              onClick={() => handleCopy(artifacts.postgresql!)}
              aria-label="Copiar PostgreSQL"
              title="Copiar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          )}
        </div>
        <pre>{artifacts.postgresql ?? 'Não gerado para o alvo atual.'}</pre>
      </section>
    </>
  );
}

export class GeneratedOutputsErrorBoundary extends Component<
  GeneratedOutputsErrorBoundaryProps,
  GeneratedOutputsErrorBoundaryState
> {
  public readonly state: GeneratedOutputsErrorBoundaryState = {
    hasError: false,
    retryVersion: 0
  };

  public static getDerivedStateFromError(): Pick<GeneratedOutputsErrorBoundaryState, 'hasError'> {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Generated outputs panel render failure.', error, errorInfo);
  }

  private readonly retryPanel = () => {
    this.setState(
      (currentState) => ({
        hasError: false,
        retryVersion: currentState.retryVersion + 1
      }),
      () => this.props.onRetry?.()
    );
  };

  public render() {
    if (this.state.hasError) {
      return (
        <section className="output-panel-fallback" role="alert" aria-live="assertive">
          <h3>As saídas geradas estão temporariamente indisponíveis.</h3>
          <p>Encontramos um erro inesperado de renderização neste painel.</p>
          <p>
            Orientação de nova tentativa: selecione <strong>Tentar novamente</strong>. Se o problema persistir,
            ajuste a DSL ou altere o alvo de geração e tente novamente.
          </p>
          <button type="button" onClick={this.retryPanel}>
            Tentar novamente
          </button>
        </section>
      );
    }

    return <Fragment key={this.state.retryVersion}>{this.props.children}</Fragment>;
  }
}

function createRuntimeContext(): RuntimeContext {
  const parsed = parseErdsl(starterDsl);
  if (!parsed.ok) {
    throw new Error(`Invalid startup DSL: ${parsed.diagnostics.map((item) => item.message).join(', ')}`);
  }
  const engine = createAstStateEngine(parsed.ast);
  const coordinator = createSyncCoordinator({ engine });
  return { engine, coordinator };
}

function downloadText(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ModelingToolPage() {
  const [runtime] = useState(createRuntimeContext);
  const [dslText, setDslText] = useState(() => runtime.coordinator.projectText());
  const [diagnostics, setDiagnostics] = useState<readonly ParserDiagnostic[]>([]);
  const [revision, setRevision] = useState(runtime.coordinator.getRevision());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(resolveInitialTemplateId);

  const snapshot = runtime.engine.snapshot;
  const diagram = runtime.coordinator.projectDiagram();
  const generation = generateArtifactsSafely(snapshot.document);

  const syncTextFromAst = () => {
    setDslText(runtime.coordinator.projectText());
    setDiagnostics([]);
    setRevision(runtime.coordinator.getRevision());
  };

  const commitText = (nextText: string) => {
    setDslText(nextText);
    const result = runtime.coordinator.commitText(nextText, runtime.coordinator.getRevision());
    if (result.ok) {
      setDiagnostics([]);
      setRevision(result.revision);
      return;
    }
    setDiagnostics(result.diagnostics);
  };

  const commitSemanticCommands = (semanticCommands: readonly DiagramSemanticCommand[]) => {
    const projection = runtime.coordinator.projectDiagram();
    const commands = mapDiagramSemanticToAstCommands(semanticCommands, {
      projection,
      document: runtime.engine.snapshot.document
    });
    if (commands.length === 0) {
      return;
    }
    const result = runtime.coordinator.commitDiagram(commands, runtime.coordinator.getRevision());
    if (!result.ok) {
      setDiagnostics(result.diagnostics);
      return;
    }
    syncTextFromAst();
  };

  const applySystemCommands = (commands: readonly AstCommand[]) => {
    if (commands.length === 0) {
      return;
    }
    runtime.engine.enqueue({
      id: `system-${Date.now()}`,
      source: 'system',
      commands
    });
    syncTextFromAst();
  };

  const loadSelectedTemplate = () => {
    const selectedTemplate = getTemplateDefinition(selectedTemplateId);
    const result = loadTemplateThroughSyncPipeline(selectedTemplate.content.dsl, {
      coordinator: runtime.coordinator,
      readCurrentDocument: () => runtime.engine.snapshot.document
    });
    if (!result.ok) {
      setDiagnostics(result.diagnostics);
      return;
    }
    setDslText(result.projection.dslText);
    setDiagnostics([]);
    setRevision(result.projection.revision);
  };

  const exportDiagram = () => {
    const bundle = exportDiagramBundle(diagram);
    downloadText('diagram.svg', bundle.svg, 'image/svg+xml');
    downloadText('diagram.png.txt', bundle.pngDataUrl, 'text/plain');
  };

  return (
    <main className="modeling-tool-page" data-testid="modeling-tool">
      <header className="tool-header">
        <div>
          <h1>Ferramenta de Modelagem ERText</h1>
          <p>
            Espaço de modelagem conceitual com DSL, diagrama e saídas de geração sincronizados. Revisão{' '}
            {revision}.
          </p>
        </div>
        <nav className="tool-nav" aria-label="Navegação principal">
          <a href="/">Área de trabalho</a>
          <a href="/template">Modelo</a>
        </nav>
      </header>

      <section className="template-selector" aria-label="Seletor de modelo">
        <div className="template-selector-copy">
          <h2>Comece a partir de um modelo</h2>
          <p>Selecione um modelo ERDSL temático e carregue-o na área de trabalho com um clique.</p>
        </div>
        <div className="template-selector-controls">
          <label htmlFor={TEMPLATE_SELECT_ID}>Galeria de modelos</label>
          <select
            id={TEMPLATE_SELECT_ID}
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
          >
            {TEMPLATE_SELECTOR_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={loadSelectedTemplate}>
            Carregar modelo
          </button>
        </div>
      </section>

      <section className="tool-menu" aria-label="Ações de modelagem">
        <button type="button" onClick={exportDiagram}>
          Exportar diagrama
        </button>
        <label>
          Gerar
          <select
            value={snapshot.document.generate?.target ?? 'All'}
            onChange={(event) => {
              const selected = event.target.value as GenerateTarget;
              applySystemCommands([{ kind: 'setGenerateTarget', target: selected }]);
            }}
          >
            {GENERATE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="tool-grid">
        <article className="tool-panel editor-panel">
          <div className="output-panel-header">
            <h2>Editor de DSL</h2>
            <button
              type="button"
              className="copy-button"
              onClick={() => {
                navigator.clipboard.writeText(dslText).catch((error) => {
                  console.error('Failed to copy text:', error);
                });
              }}
              aria-label="Copiar texto do editor"
              title="Copiar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
          <textarea
            aria-label="Editor ERDSL"
            value={dslText}
            onChange={(event) => commitText(event.target.value)}
            className="dsl-editor"
          />
          {diagnostics.length > 0 ? (
            <>
              <ul className="diagnostics-list" aria-label="Diagnósticos do parser">
                {diagnostics.map((diagnostic) => (
                  <li key={`${diagnostic.code}-${diagnostic.line}-${diagnostic.column}`}>
                    {diagnostic.code} — linha {diagnostic.line}, coluna {diagnostic.column}: {diagnostic.message}
                  </li>
                ))}
              </ul>
              <p className="status-error" role="status">
                Regra de identificador: use apenas letras, dígitos e "_" e nunca comece com um dígito.
              </p>
            </>
          ) : (
            <p className="status-ok">Parser sincronizado com a AST.</p>
          )}
        </article>

        <article className="tool-panel diagram-panel">
          <h2>Área de Trabalho do Diagrama</h2>
          <DiagramCanvas
            diagram={diagram}
            onCreateEntity={(entityName) =>
              commitSemanticCommands([{ kind: 'createEntity', preferredName: entityName }])
            }
            onRenameEntity={(entityId, nextName) =>
              commitSemanticCommands([{ kind: 'renameEntity', entityId, nextName }])
            }
            onRemoveEntity={(entityId) =>
              commitSemanticCommands([{ kind: 'removeEntity', entityId }])
            }
            onCreateRelationship={(sourceEntityId, targetEntityId) =>
              commitSemanticCommands([{ kind: 'createRelationship', sourceEntityId, targetEntityId }])
            }
            onRenameRelationship={(relationshipId, nextName) =>
              commitSemanticCommands([{ kind: 'renameRelationship', relationshipId, nextName }])
            }
            onRemoveRelationship={(relationshipId) =>
              commitSemanticCommands([{ kind: 'removeRelationship', relationshipId }])
            }
            onUpdateRelationshipCardinality={(relationshipId, participantEntityId, cardinality) =>
              commitSemanticCommands([
                { kind: 'updateRelationshipCardinality', relationshipId, participantEntityId, cardinality }
              ])
            }
            onUpsertRelationshipAttribute={(relationshipId, attributeName, dataType) =>
              commitSemanticCommands([
                { kind: 'upsertRelationshipAttribute', relationshipId, attributeName, dataType }
              ])
            }
            onRemoveRelationshipAttribute={(relationshipId, attributeName) =>
              commitSemanticCommands([{ kind: 'removeRelationshipAttribute', relationshipId, attributeName }])
            }
          />
        </article>

        <article className="tool-panel output-panel">
          <h2>Saídas Geradas</h2>
          <GeneratedOutputsErrorBoundary>
            <GeneratedOutputsPanel generation={generation} hasParserDiagnostics={diagnostics.length > 0} />
          </GeneratedOutputsErrorBoundary>
        </article>
      </section>
    </main>
  );
}
