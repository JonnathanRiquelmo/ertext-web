import type { GenerateTarget } from '../modules/ast';

export type SupportedModelingFeature =
  | 'Entities'
  | 'Referential Attribute'
  | 'Descriptive Attribute'
  | 'Binary Relationship'
  | 'Ternary Relationship'
  | 'Self-relationship'
  | 'Relationship Attributes'
  | 'Cardinalities'
  | 'Generalization';

export const SUPPORTED_MODELING_FEATURE_TEMPLATE_MAP: Record<
  SupportedModelingFeature,
  readonly string[]
> = {
  Entities: ['university-courses', 'social-network', 'artificial-intelligence', 'supply-chain-logistics'],
  'Referential Attribute': ['university-courses', 'social-network', 'artificial-intelligence', 'supply-chain-logistics'],
  'Descriptive Attribute': ['university-courses', 'social-network', 'artificial-intelligence', 'supply-chain-logistics'],
  'Binary Relationship': ['university-courses', 'social-network', 'artificial-intelligence', 'supply-chain-logistics'],
  'Ternary Relationship': ['social-network'],
  'Self-relationship': ['supply-chain-logistics'],
  'Relationship Attributes': ['university-courses', 'supply-chain-logistics'],
  Cardinalities: ['university-courses', 'social-network', 'artificial-intelligence', 'supply-chain-logistics'],
  Generalization: ['social-network', 'supply-chain-logistics']
};

export type GenerationCoverageTarget = Exclude<GenerateTarget, 'All'>;

export const SUPPORTED_GENERATION_FEATURE_TARGET_MAP: Record<
  'Conceptual Diagram' | 'Occurrence Diagram' | 'Logical Model' | 'Physical Model',
  readonly GenerationCoverageTarget[]
> = {
  'Conceptual Diagram': ['Diagram'],
  'Occurrence Diagram': ['OccurrenceDiagram'],
  'Logical Model': ['LogicalSchema'],
  'Physical Model': ['MySQL', 'PostgreSQL']
};

export const GENERATION_TARGET_TEMPLATE_MAP: Record<GenerationCoverageTarget, readonly string[]> = {
  Diagram: ['social-network'],
  OccurrenceDiagram: ['social-network'],
  LogicalSchema: ['university-courses'],
  MySQL: ['supply-chain-logistics'],
  PostgreSQL: ['artificial-intelligence']
};
