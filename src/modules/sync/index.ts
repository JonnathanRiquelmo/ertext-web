import type { ModuleDescriptor } from '../../shared/types/contracts';
import type { AstCommand, AstCommandTransaction, AstStateEngine } from '../ast';
import type {
  EntityGeneralization,
  ErdslDocumentNode,
  ParserDiagnostic,
  RelationCardinality
} from '../ast';
import { parseErdsl } from '../parser';

export const SyncModule: ModuleDescriptor = {
  name: 'sync',
  status: 'ready'
};

export interface SyncParseRejected {
  readonly ok: false;
  readonly reason: 'stale_revision' | 'parse_error';
  readonly diagnostics: readonly ParserDiagnostic[];
}

export interface SyncCommitAccepted {
  readonly ok: true;
  readonly revision: number;
}

export type SyncCommitResult = SyncParseRejected | SyncCommitAccepted;

export interface DiagramEntityNode {
  readonly id: string;
  readonly name: string;
  readonly attributes: readonly { name: string; dataType: string; isIdentifier: boolean }[];
}

export interface DiagramRelationshipNode {
  readonly id: string;
  readonly name: string;
  readonly isOccurrence: boolean;
  readonly participants: readonly {
    entityId: string;
    entityName: string;
    min: number;
    max: number | '*';
  }[];
  readonly attributes: readonly {
    name: string;
    dataType: string;
  }[];
}

export interface DiagramSpecializationNode {
  readonly id: string;
  readonly name: string;
  readonly superEntityId: string;
  readonly subEntityId: string;
  readonly generalization: EntityGeneralization;
}

export interface DiagramProjection {
  readonly entities: readonly DiagramEntityNode[];
  readonly relationships: readonly DiagramRelationshipNode[];
  readonly specializations: readonly DiagramSpecializationNode[];
}

function cardinalityToRange(cardinality: RelationCardinality): { min: number; max: number | '*' } {
  switch (cardinality) {
    case '(0:1)':
      return { min: 0, max: 1 };
    case '(1:1)':
      return { min: 1, max: 1 };
    case '(0:N)':
      return { min: 0, max: '*' };
    case '(1:N)':
      return { min: 1, max: '*' };
  }
}

function rangeToCardinality(min: number, max: number | '*'): RelationCardinality {
  if (min === 0 && max === 1) {
    return '(0:1)';
  }
  if (min === 1 && max === 1) {
    return '(1:1)';
  }
  if (min === 0 && max === '*') {
    return '(0:N)';
  }
  return '(1:N)';
}

function formatEntityEntityLine(entity: ErdslDocumentNode['entities']['entities'][number]): string {
  const inheritance =
    entity.generalization && entity.superEntity
      ? ` is ${entity.generalization} ${entity.superEntity}`
      : '';

  if (entity.attributes.length === 0) {
    return `  ${entity.name}${inheritance}`;
  }

  const attributes = entity.attributes
    .map((attribute) =>
      `${attribute.name} ${attribute.dataType}${attribute.isIdentifier ? ' isIdentifier' : ''}`.trim()
    )
    .join(', ');
  return `  ${entity.name}${inheritance} { ${attributes} }`;
}

function formatRelationLine(relationship: ErdslDocumentNode['relationships']['relationships'][number]): string {
  const left = `${relationship.leftSide.target} ${relationship.leftSide.cardinality}`;
  const right = `${relationship.rightSide.cardinality} ${relationship.rightSide.target}`;
  const attributeGroups = relationship.attributes.length
    ? ` { ${relationship.attributes
        .map((attribute) =>
          `${attribute.name} ${attribute.dataType}${attribute.isIdentifier ? ' isIdentifier' : ''}`.trim()
        )
        .join(', ')} }`
    : '';
  const occurrence = relationship.occurrence ? ' @generateOccurrenceDiagram' : '';
  return `  ${relationship.name} [ ${left} relates ${right} ]${attributeGroups}${occurrence}`;
}

function resolveRelationshipParticipants(
  relationship: ErdslDocumentNode['relationships']['relationships'][number],
  relationshipsByName: Map<string, ErdslDocumentNode['relationships']['relationships'][number]>,
  entityIdByName: Map<string, string>,
  visitedRelationships: Set<string>
): readonly {
  entityId: string;
  entityName: string;
  min: number;
  max: number | '*';
}[] {
  const participants: {
    entityId: string;
    entityName: string;
    min: number;
    max: number | '*';
  }[] = [];

  const appendSideParticipants = (
    side: ErdslDocumentNode['relationships']['relationships'][number]['leftSide'] | ErdslDocumentNode['relationships']['relationships'][number]['rightSide']
  ): void => {
    const range = cardinalityToRange(side.cardinality);
    if (side.targetKind === 'Entity') {
      participants.push({
        entityId: entityIdByName.get(side.target) ?? side.target,
        entityName: side.target,
        min: range.min,
        max: range.max
      });
      return;
    }
    const nestedRelationship = relationshipsByName.get(side.target);
    if (!nestedRelationship || visitedRelationships.has(nestedRelationship.name)) {
      return;
    }
    const nestedParticipants = resolveRelationshipParticipants(
      nestedRelationship,
      relationshipsByName,
      entityIdByName,
      new Set([...visitedRelationships, nestedRelationship.name])
    );
    for (const nestedParticipant of nestedParticipants) {
      participants.push(nestedParticipant);
    }
  };

  appendSideParticipants(relationship.leftSide);
  appendSideParticipants(relationship.rightSide);
  return participants;
}

function isSpecializedEntity(
  entity: ErdslDocumentNode['entities']['entities'][number]
): entity is ErdslDocumentNode['entities']['entities'][number] & {
  generalization: EntityGeneralization;
  superEntity: string;
} {
  return entity.generalization !== null && entity.superEntity !== null;
}

export function projectAstToDiagram(document: ErdslDocumentNode): DiagramProjection {
  const entityIdByName = new Map(document.entities.entities.map((entity) => [entity.name, entity.id] as const));
  const relationshipsByName = new Map(
    document.relationships.relationships.map((relationship) => [relationship.name, relationship] as const)
  );

  return {
    entities: document.entities.entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      attributes: entity.attributes.map((attribute) => ({
        name: attribute.name,
        dataType: attribute.dataType,
        isIdentifier: attribute.isIdentifier
      }))
    })),
    relationships: document.relationships.relationships.map((relationship) => ({
        id: relationship.id,
        name: relationship.name,
        isOccurrence: !!relationship.occurrence,
        participants: resolveRelationshipParticipants(
          relationship,
          relationshipsByName,
          entityIdByName,
          new Set([relationship.name])
        ),
        attributes: relationship.attributes.map((attribute) => ({
          name: attribute.name,
          dataType: attribute.dataType
        }))
      })),
    specializations: document.entities.entities
      .filter(isSpecializedEntity)
      .map((entity) => ({
        id: entity.id,
        name: `${entity.superEntity} -> ${entity.name}`,
        superEntityId: entityIdByName.get(entity.superEntity) ?? entity.superEntity,
        subEntityId: entity.id,
        generalization: entity.generalization
      }))
  };
}

export function serializeAstToCanonicalText(document: ErdslDocumentNode): string {
  const lines: string[] = [];
  if (document.generate) {
    lines.push(`Generate ${document.generate.target};`);
  }
  lines.push(`Domain ${document.domain.name};`);
  lines.push('Entities {');
  for (const entity of document.entities.entities) {
    lines.push(formatEntityEntityLine(entity));
  }
  lines.push('};');
  lines.push('Relationships {');
  for (const relationship of document.relationships.relationships) {
    lines.push(formatRelationLine(relationship));
  }
  lines.push('};');
  return lines.join('\n');
}

interface SyncCoordinatorOptions {
  readonly engine: AstStateEngine;
}

export interface SyncCoordinator {
  getRevision(): number;
  commitText(source: string, baseRevision: number): SyncCommitResult;
  commitDiagram(commands: readonly AstCommand[], baseRevision: number): SyncCommitResult;
  projectText(): string;
  projectDiagram(): DiagramProjection;
}

function createTransaction(
  source: 'text' | 'diagram',
  commands: readonly AstCommand[]
): AstCommandTransaction {
  return {
    id: `${source}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    source,
    commands
  };
}

export function createSyncCoordinator(options: SyncCoordinatorOptions): SyncCoordinator {
  const { engine } = options;

  const rejectStaleIfNeeded = (baseRevision: number): SyncParseRejected | null => {
    if (baseRevision !== engine.snapshot.revision) {
      return {
        ok: false,
        reason: 'stale_revision',
        diagnostics: []
      };
    }
    return null;
  };

  return {
    getRevision() {
      return engine.snapshot.revision;
    },
    commitText(source, baseRevision) {
      const stale = rejectStaleIfNeeded(baseRevision);
      if (stale) {
        return stale;
      }
      const parseResult = parseErdsl(source);
      if (!parseResult.ok) {
        return {
          ok: false,
          reason: 'parse_error',
          diagnostics: parseResult.diagnostics
        };
      }
      const transaction = createTransaction('text', [
        { kind: 'setDocument', document: parseResult.ast }
      ]);
      const snapshot = engine.enqueue(transaction);
      return { ok: true, revision: snapshot.revision };
    },
    commitDiagram(commands, baseRevision) {
      const stale = rejectStaleIfNeeded(baseRevision);
      if (stale) {
        return stale;
      }
      const transaction = createTransaction('diagram', commands);
      const snapshot = engine.enqueue(transaction);
      return { ok: true, revision: snapshot.revision };
    },
    projectText() {
      return serializeAstToCanonicalText(engine.snapshot.document);
    },
    projectDiagram() {
      return projectAstToDiagram(engine.snapshot.document);
    }
  };
}

export { rangeToCardinality };
