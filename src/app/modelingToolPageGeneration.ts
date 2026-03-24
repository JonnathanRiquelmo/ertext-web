import type { ErdslDocumentNode } from '../modules/ast';
import { generateArtifacts, type GenerationArtifacts } from '../modules/generators';
import { transformConceptualToLogical } from '../modules/transforms';

export interface SafeGenerationResult {
  readonly artifacts: GenerationArtifacts;
  readonly errorMessage: string | null;
}

export function generateArtifactsSafely(document: ErdslDocumentNode): SafeGenerationResult {
  try {
    return {
      artifacts: generateArtifacts(document),
      errorMessage: null
    };
  } catch (error) {
    return {
      artifacts: {
        logicalSchema: transformConceptualToLogical(document),
        mysql: undefined,
        postgresql: undefined
      },
      errorMessage: error instanceof Error ? error.message : 'Unexpected generation error.'
    };
  }
}
