import type { ErdslDocumentNode, ParserDiagnostic } from '../modules/ast';
import { generateArtifacts, type GenerationArtifacts } from '../modules/generators';
import type { DiagramProjection, SyncCoordinator } from '../modules/sync';

export interface TemplateLoadProjection {
  readonly dslText: string;
  readonly diagram: DiagramProjection;
  readonly outputs: GenerationArtifacts;
  readonly revision: number;
}

export interface TemplateLoadSucceeded {
  readonly ok: true;
  readonly projection: TemplateLoadProjection;
}

export interface TemplateLoadFailed {
  readonly ok: false;
  readonly diagnostics: readonly ParserDiagnostic[];
}

export type TemplateLoadResult = TemplateLoadSucceeded | TemplateLoadFailed;

export interface TemplateLoadDependencies {
  readonly coordinator: SyncCoordinator;
  readonly readCurrentDocument: () => ErdslDocumentNode;
}

export function loadTemplateThroughSyncPipeline(
  templateDsl: string,
  dependencies: TemplateLoadDependencies
): TemplateLoadResult {
  const { coordinator, readCurrentDocument } = dependencies;
  const commitResult = coordinator.commitText(templateDsl, coordinator.getRevision());
  if (!commitResult.ok) {
    return {
      ok: false,
      diagnostics: commitResult.diagnostics
    };
  }

  const document = readCurrentDocument();
  return {
    ok: true,
    projection: {
      dslText: templateDsl,
      diagram: coordinator.projectDiagram(),
      outputs: generateArtifacts(document),
      revision: commitResult.revision
    }
  };
}
