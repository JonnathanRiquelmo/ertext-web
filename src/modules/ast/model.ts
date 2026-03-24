export interface SourcePosition {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
}

export interface SourceSpan {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

export interface AstNodeBase {
  readonly id: string;
  readonly kind: string;
  readonly span: SourceSpan;
}

export type GenerateTarget =
  | 'All'
  | 'Diagram'
  | 'LogicalSchema'
  | 'MySQL'
  | 'PostgreSQL'
  | 'OccurrenceDiagram';

export interface GenerateBlockNode extends AstNodeBase {
  readonly kind: 'GenerateBlock';
  readonly target: GenerateTarget;
}

export interface DomainBlockNode extends AstNodeBase {
  readonly kind: 'DomainBlock';
  readonly name: string;
}

export interface AttributeNode extends AstNodeBase {
  readonly kind: 'Attribute';
  readonly name: string;
  readonly dataType: DataType;
  readonly isIdentifier: boolean;
}

export type DataType = 'int' | 'double' | 'money' | 'string' | 'boolean' | 'datetime' | 'file';
export type EntityGeneralization =
  | 'total/disjoint'
  | 'total/overlapped'
  | 'partial/disjoint'
  | 'partial/overlapped';

export interface EntityNode extends AstNodeBase {
  readonly kind: 'Entity';
  readonly name: string;
  readonly generalization: EntityGeneralization | null;
  readonly superEntity: string | null;
  readonly attributes: readonly AttributeNode[];
}

export type RelationCardinality = '(0:1)' | '(1:1)' | '(0:N)' | '(1:N)';
export type RelationTargetKind = 'Entity' | 'Relation';

export interface RelationSideNode extends AstNodeBase {
  readonly kind: 'RelationSide';
  readonly target: string;
  readonly cardinality: RelationCardinality;
  readonly targetKind: RelationTargetKind | null;
}

export interface RelationshipNode extends AstNodeBase {
  readonly kind: 'Relationship';
  readonly name: string;
  readonly leftSide: RelationSideNode;
  readonly rightSide: RelationSideNode;
  readonly attributes: readonly AttributeNode[];
  readonly occurrence: boolean;
}

export interface EntitiesBlockNode extends AstNodeBase {
  readonly kind: 'EntitiesBlock';
  readonly entities: readonly EntityNode[];
}

export interface RelationshipsBlockNode extends AstNodeBase {
  readonly kind: 'RelationshipsBlock';
  readonly relationships: readonly RelationshipNode[];
}

export interface ErdslDocumentNode extends AstNodeBase {
  readonly kind: 'ErdslDocument';
  readonly generate: GenerateBlockNode | null;
  readonly domain: DomainBlockNode;
  readonly entities: EntitiesBlockNode;
  readonly relationships: RelationshipsBlockNode;
}

export interface ParserDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly line: number;
  readonly column: number;
}

export interface ParseSuccess {
  readonly ok: true;
  readonly ast: ErdslDocumentNode;
  readonly diagnostics: readonly [];
}

export interface ParseFailure {
  readonly ok: false;
  readonly ast: null;
  readonly diagnostics: readonly ParserDiagnostic[];
}

export type ParseResult = ParseSuccess | ParseFailure;
