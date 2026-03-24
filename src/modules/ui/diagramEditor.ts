import type {
  AstCommand,
  AttributeNode,
  DataType,
  EntityNode,
  ErdslDocumentNode,
  RelationshipNode,
  SourceSpan
} from '../ast';
import { rangeToCardinality, type DiagramProjection } from '../sync';

export const diagramEngine = {
  name: 'DeterministicDiagramEngine',
  supports: ['cardinality']
} as const;

function normalizeId(prefix: string, name: string): string {
  return `${prefix}:${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function normalizeToken(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

const DEFAULT_SPAN: SourceSpan = {
  start: { line: 0, column: 0, offset: 0 },
  end: { line: 0, column: 0, offset: 0 }
};

const ALLOWED_DATA_TYPES = new Set<DataType>([
  'int',
  'double',
  'money',
  'string',
  'boolean',
  'datetime',
  'file'
]);

function resolveDocumentSpan(document: ErdslDocumentNode, block: 'entities' | 'relationships'): SourceSpan {
  if (block === 'entities') {
    return document.entities.span ?? DEFAULT_SPAN;
  }
  return document.relationships.span ?? DEFAULT_SPAN;
}

function buildUniqueName(existingNames: readonly string[], preferred: string, fallbackBase: string): string {
  const normalizedPreferred = normalizeToken(preferred);
  if (normalizedPreferred.length > 0 && !existingNames.includes(normalizedPreferred)) {
    return normalizedPreferred;
  }

  const normalizedFallback = normalizeToken(fallbackBase);
  if (!existingNames.includes(normalizedFallback)) {
    return normalizedFallback;
  }

  let suffix = 2;
  while (existingNames.includes(`${normalizedFallback}${suffix}`)) {
    suffix += 1;
  }
  return `${normalizedFallback}${suffix}`;
}

export function createEntityUpsertCommand(entity: Omit<EntityNode, 'kind' | 'id'>): AstCommand {
  return {
    kind: 'upsertEntity',
    entity: {
      ...entity,
      kind: 'Entity',
      id: normalizeId('entity', entity.name)
    }
  };
}

export function createRelationshipUpsertCommand(
  relationship: Omit<RelationshipNode, 'kind' | 'id'>
): AstCommand {
  return {
    kind: 'upsertRelationship',
    relationship: {
      ...relationship,
      kind: 'Relationship',
      id: normalizeId('relationship', relationship.name)
    }
  };
}

export type DiagramSemanticCommand =
  | {
      readonly kind: 'createEntity';
      readonly preferredName: string;
    }
  | {
      readonly kind: 'removeEntity';
      readonly entityId: string;
    }
  | {
      readonly kind: 'renameEntity';
      readonly entityId: string;
      readonly nextName: string;
    }
  | {
      readonly kind: 'createRelationship';
      readonly sourceEntityId: string;
      readonly targetEntityId: string;
    }
  | {
      readonly kind: 'removeRelationship';
      readonly relationshipId: string;
    }
  | {
      readonly kind: 'renameRelationship';
      readonly relationshipId: string;
      readonly nextName: string;
    }
  | {
      readonly kind: 'updateRelationshipCardinality';
      readonly relationshipId: string;
      readonly participantEntityId: string;
      readonly cardinality: {
        readonly min: number;
        readonly max: number | '*';
      };
    }
  | {
      readonly kind: 'upsertRelationshipAttribute';
      readonly relationshipId: string;
      readonly attributeName: string;
      readonly dataType: string;
    }
  | {
      readonly kind: 'removeRelationshipAttribute';
      readonly relationshipId: string;
      readonly attributeName: string;
    };

export interface DiagramSemanticContext {
  readonly projection: DiagramProjection;
  readonly document: ErdslDocumentNode;
}

function findRelationshipById(
  document: ErdslDocumentNode,
  relationshipId: string
): RelationshipNode | undefined {
  return document.relationships.relationships.find((relationship) => relationship.id === relationshipId);
}

function buildRelationshipAttributeId(relationshipName: string, attributeName: string): string {
  const relationshipToken = normalizeToken(relationshipName).toLowerCase();
  const attributeToken = normalizeToken(attributeName).toLowerCase();
  return `relationship:${relationshipToken}:attribute:${attributeToken}`;
}

function withUpdatedCardinality(
  relationship: RelationshipNode,
  participantEntityName: string,
  cardinality: { readonly min: number; readonly max: number | '*' }
): RelationshipNode {
  const token = rangeToCardinality(cardinality.min, cardinality.max);
  return {
    ...relationship,
    leftSide:
      relationship.leftSide.target === participantEntityName
        ? { ...relationship.leftSide, cardinality: token }
        : relationship.leftSide,
    rightSide:
      relationship.rightSide.target === participantEntityName
        ? { ...relationship.rightSide, cardinality: token }
        : relationship.rightSide
  };
}

function upsertRelationshipAttribute(
  relationship: RelationshipNode,
  attributeName: string,
  dataType: string
): RelationshipNode {
  const normalizedName = normalizeToken(attributeName);
  const normalizedType = normalizeToken(dataType).toLowerCase();
  const resolvedType: DataType = ALLOWED_DATA_TYPES.has(normalizedType as DataType)
    ? (normalizedType as DataType)
    : 'string';
  const existingIndex = relationship.attributes.findIndex(
    (attribute) => attribute.name === normalizedName
  );

  const span = relationship.span;
  const attribute: AttributeNode = {
    id:
      existingIndex >= 0
        ? relationship.attributes[existingIndex].id
        : buildRelationshipAttributeId(relationship.name, normalizedName),
    kind: 'Attribute',
    name: normalizedName,
    dataType: resolvedType,
    isIdentifier: false,
    span
  };

  if (existingIndex >= 0) {
    return {
      ...relationship,
      attributes: relationship.attributes.map((item, index) => (index === existingIndex ? attribute : item))
    };
  }
  return {
    ...relationship,
    attributes: [...relationship.attributes, attribute]
  };
}

function removeRelationshipAttribute(
  relationship: RelationshipNode,
  attributeName: string
): RelationshipNode {
  return {
    ...relationship,
    attributes: relationship.attributes.filter((attribute) => attribute.name !== normalizeToken(attributeName))
  };
}

function renameEntityInDocument(
  document: ErdslDocumentNode,
  currentEntityName: string,
  nextEntityName: string
): ErdslDocumentNode {
  if (currentEntityName === nextEntityName) {
    return document;
  }
  return {
    ...document,
    entities: {
      ...document.entities,
      entities: document.entities.entities.map((entity) => ({
        ...entity,
        id: entity.name === currentEntityName ? normalizeId('entity', nextEntityName) : entity.id,
        name: entity.name === currentEntityName ? nextEntityName : entity.name,
        superEntity: entity.superEntity === currentEntityName ? nextEntityName : entity.superEntity
      }))
    },
    relationships: {
      ...document.relationships,
      relationships: document.relationships.relationships.map((relationship) => ({
        ...relationship,
        leftSide:
          relationship.leftSide.target === currentEntityName
            ? { ...relationship.leftSide, target: nextEntityName }
            : relationship.leftSide,
        rightSide:
          relationship.rightSide.target === currentEntityName
            ? { ...relationship.rightSide, target: nextEntityName }
            : relationship.rightSide
      }))
    }
  };
}

function renameRelationshipInDocument(
  document: ErdslDocumentNode,
  currentRelationshipName: string,
  nextRelationshipName: string
): ErdslDocumentNode {
  if (currentRelationshipName === nextRelationshipName) {
    return document;
  }
  return {
    ...document,
    relationships: {
      ...document.relationships,
      relationships: document.relationships.relationships.map((relationship) => ({
        ...relationship,
        id:
          relationship.name === currentRelationshipName
            ? normalizeId('relationship', nextRelationshipName)
            : relationship.id,
        name: relationship.name === currentRelationshipName ? nextRelationshipName : relationship.name
      }))
    }
  };
}

export function mapDiagramSemanticToAstCommands(
  commands: readonly DiagramSemanticCommand[],
  context: DiagramSemanticContext
): AstCommand[] {
  return commands.flatMap((command) => {
    if (command.kind === 'createEntity') {
      const nextName = buildUniqueName(
        context.projection.entities.map((entity) => entity.name),
        command.preferredName,
        'Entity'
      );
      const span = resolveDocumentSpan(context.document, 'entities');
      return [
        createEntityUpsertCommand({
          name: nextName,
          generalization: null,
          superEntity: null,
          span,
          attributes: [
            {
              id: `attribute:${nextName.toLowerCase()}-id`,
              kind: 'Attribute',
              name: `${nextName.charAt(0).toLowerCase()}${nextName.slice(1)}Id`,
              dataType: 'int',
              isIdentifier: true,
              span
            }
          ]
        })
      ];
    }

    if (command.kind === 'renameEntity') {
      const entity = context.projection.entities.find((item) => item.id === command.entityId);
      if (!entity) {
        return [];
      }
      const candidateName = normalizeToken(command.nextName);
      if (!candidateName.length) {
        return [];
      }
      const nextName = buildUniqueName(
        context.projection.entities
          .filter((item) => item.id !== command.entityId)
          .map((item) => item.name),
        candidateName,
        entity.name
      );
      return [
        {
          kind: 'setDocument',
          document: renameEntityInDocument(context.document, entity.name, nextName)
        }
      ];
    }

    if (command.kind === 'removeEntity') {
      const entity = context.projection.entities.find((item) => item.id === command.entityId);
      if (!entity) {
        return [];
      }
      return [
        {
          kind: 'removeEntity',
          entityName: entity.name
        }
      ];
    }

    if (command.kind === 'createRelationship') {
      const source = context.projection.entities.find((entity) => entity.id === command.sourceEntityId);
      const target = context.projection.entities.find((entity) => entity.id === command.targetEntityId);
      if (!source || !target) {
        return [];
      }
      const relationshipName = buildUniqueName(
        context.projection.relationships.map((relationship) => relationship.name),
        `${source.name}To${target.name}`,
        'Relationship'
      );
      const span = resolveDocumentSpan(context.document, 'relationships');

      return [
        createRelationshipUpsertCommand({
          name: relationshipName,
          span,
          leftSide: {
            id: `relationship:${relationshipName.toLowerCase()}:left`,
            kind: 'RelationSide',
            target: source.name,
            cardinality: '(1:1)',
            targetKind: 'Entity',
            span
          },
          rightSide: {
            id: `relationship:${relationshipName.toLowerCase()}:right`,
            kind: 'RelationSide',
            target: target.name,
            cardinality: '(0:N)',
            targetKind: 'Entity',
            span
          },
          attributes: [],
          occurrence: false
        })
      ];
    }

    if (command.kind === 'renameRelationship') {
      const relationship = context.projection.relationships.find(
        (item) => item.id === command.relationshipId
      );
      if (!relationship) {
        return [];
      }
      const candidateName = normalizeToken(command.nextName);
      if (!candidateName.length) {
        return [];
      }
      const nextName = buildUniqueName(
        context.projection.relationships
          .filter((item) => item.id !== command.relationshipId)
          .map((item) => item.name),
        candidateName,
        relationship.name
      );
      return [
        {
          kind: 'setDocument',
          document: renameRelationshipInDocument(context.document, relationship.name, nextName)
        }
      ];
    }

    if (command.kind === 'removeRelationship') {
      const relationship = context.projection.relationships.find(
        (item) => item.id === command.relationshipId
      );
      if (!relationship) {
        return [];
      }
      return [
        {
          kind: 'removeRelationship',
          relationshipName: relationship.name
        }
      ];
    }

    if (command.kind === 'updateRelationshipCardinality') {
      const relationship = findRelationshipById(context.document, command.relationshipId);
      const projectionRelationship = context.projection.relationships.find(
        (item) => item.id === command.relationshipId
      );
      if (!relationship || !projectionRelationship) {
        return [];
      }
      const participant = projectionRelationship.participants.find(
        (item) => item.entityId === command.participantEntityId
      );
      if (!participant) {
        return [];
      }
      return [
        {
          kind: 'upsertRelationship',
          relationship: withUpdatedCardinality(relationship, participant.entityName, command.cardinality)
        }
      ];
    }

    if (command.kind === 'upsertRelationshipAttribute') {
      const relationship = findRelationshipById(context.document, command.relationshipId);
      if (!relationship) {
        return [];
      }
      const normalizedName = normalizeToken(command.attributeName);
      if (!normalizedName) {
        return [];
      }
      return [
        {
          kind: 'upsertRelationship',
          relationship: upsertRelationshipAttribute(relationship, normalizedName, command.dataType)
        }
      ];
    }

    if (command.kind === 'removeRelationshipAttribute') {
      const relationship = findRelationshipById(context.document, command.relationshipId);
      if (!relationship) {
        return [];
      }
      return [
        {
          kind: 'upsertRelationship',
          relationship: removeRelationshipAttribute(relationship, command.attributeName)
        }
      ];
    }

    return [];
  });
}

export interface DiagramSession {
  getProjection(): DiagramProjection;
  applyCommands(commands: readonly DiagramSemanticCommand[]): void;
}

interface DiagramSessionOptions {
  readonly projection: DiagramProjection;
  readonly onSemanticCommands: (commands: readonly DiagramSemanticCommand[]) => void;
}

export function createDiagramSession(options: DiagramSessionOptions): DiagramSession {
  const projection = options.projection;

  return {
    getProjection() {
      return projection;
    },
    applyCommands(commands) {
      options.onSemanticCommands(commands);
    }
  };
}
