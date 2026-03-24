export interface SourceRange {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
}

export interface ModuleDescriptor {
  readonly name: string;
  readonly status: 'planned' | 'ready';
}
