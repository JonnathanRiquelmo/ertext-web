import type {
  ErdslDocumentNode,
  EntityNode,
  GenerateTarget,
  RelationshipNode
} from './model';

export type MutationSource = 'bootstrap' | 'text' | 'diagram' | 'system';

export interface AstStateSnapshot {
  readonly revision: number;
  readonly document: ErdslDocumentNode;
  readonly source: MutationSource;
}

export interface SetDocumentCommand {
  readonly kind: 'setDocument';
  readonly document: ErdslDocumentNode;
}

export interface UpsertEntityCommand {
  readonly kind: 'upsertEntity';
  readonly entity: EntityNode;
}

export interface RemoveEntityCommand {
  readonly kind: 'removeEntity';
  readonly entityName: string;
}

export interface UpsertRelationshipCommand {
  readonly kind: 'upsertRelationship';
  readonly relationship: RelationshipNode;
}

export interface RemoveRelationshipCommand {
  readonly kind: 'removeRelationship';
  readonly relationshipName: string;
}

export interface SetGenerateTargetCommand {
  readonly kind: 'setGenerateTarget';
  readonly target: GenerateTarget;
}

export type AstCommand =
  | SetDocumentCommand
  | UpsertEntityCommand
  | RemoveEntityCommand
  | UpsertRelationshipCommand
  | RemoveRelationshipCommand
  | SetGenerateTargetCommand;

export interface AstCommandTransaction {
  readonly id: string;
  readonly source: MutationSource;
  readonly commands: readonly AstCommand[];
}

export type AstSubscriber = (snapshot: AstStateSnapshot) => void;

function cloneDocument(document: ErdslDocumentNode): ErdslDocumentNode {
  return {
    ...document,
    generate: document.generate ? { ...document.generate } : null,
    domain: {
      ...document.domain
    },
    entities: {
      ...document.entities,
      entities: document.entities.entities.map((entity) => ({
        ...entity,
        attributes: entity.attributes.map((attribute) => ({ ...attribute }))
      }))
    },
    relationships: {
      ...document.relationships,
      relationships: document.relationships.relationships.map((relationship) => ({
        ...relationship,
        leftSide: { ...relationship.leftSide },
        rightSide: { ...relationship.rightSide },
        attributes: relationship.attributes.map((attribute) => ({ ...attribute }))
      }))
    }
  };
}

function reduceCommand(document: ErdslDocumentNode, command: AstCommand): ErdslDocumentNode {
  switch (command.kind) {
    case 'setDocument':
      return cloneDocument(command.document);
    case 'upsertEntity': {
      const existing = document.entities.entities;
      const entityIndex = existing.findIndex((item) => item.name === command.entity.name);
      const nextEntities = [...existing];
      if (entityIndex >= 0) {
        nextEntities[entityIndex] = command.entity;
      } else {
        nextEntities.push(command.entity);
      }
      nextEntities.sort((left, right) => left.name.localeCompare(right.name));
      return {
        ...document,
        entities: {
          ...document.entities,
          entities: nextEntities
        }
      };
    }
    case 'removeEntity':
      return {
        ...document,
        entities: {
          ...document.entities,
          entities: document.entities.entities.filter((entity) => entity.name !== command.entityName)
        },
        relationships: {
          ...document.relationships,
          relationships: document.relationships.relationships.filter(
            (relationship) =>
              relationship.leftSide.target !== command.entityName &&
              relationship.rightSide.target !== command.entityName
          )
        }
      };
    case 'upsertRelationship': {
      const existing = document.relationships.relationships;
      const relationshipIndex = existing.findIndex(
        (item) => item.name === command.relationship.name
      );
      const nextRelationships = [...existing];
      if (relationshipIndex >= 0) {
        nextRelationships[relationshipIndex] = command.relationship;
      } else {
        nextRelationships.push(command.relationship);
      }
      nextRelationships.sort((left, right) => left.name.localeCompare(right.name));
      return {
        ...document,
        relationships: {
          ...document.relationships,
          relationships: nextRelationships
        }
      };
    }
    case 'removeRelationship':
      return {
        ...document,
        relationships: {
          ...document.relationships,
          relationships: document.relationships.relationships.filter(
            (relationship) => relationship.name !== command.relationshipName
          )
        }
      };
    case 'setGenerateTarget':
      return {
        ...document,
        generate: {
          id: 'generate',
          kind: 'GenerateBlock',
          target: command.target,
          span: document.domain.span
        }
      };
    default:
      return document;
  }
}

function reduceTransaction(
  document: ErdslDocumentNode,
  transaction: AstCommandTransaction
): ErdslDocumentNode {
  return transaction.commands.reduce((accumulator, command) => reduceCommand(accumulator, command), document);
}

export interface AstStateEngine {
  readonly snapshot: AstStateSnapshot;
  subscribe(subscriber: AstSubscriber): () => void;
  enqueue(transaction: AstCommandTransaction): AstStateSnapshot;
}

export function createAstStateEngine(initialDocument: ErdslDocumentNode): AstStateEngine {
  let revision = 0;
  let document = cloneDocument(initialDocument);
  let source: MutationSource = 'bootstrap';
  let pendingTransactions: AstCommandTransaction[] = [];
  const subscribers = new Set<AstSubscriber>();

  const notify = (): AstStateSnapshot => {
    const snapshot: AstStateSnapshot = { revision, document, source };
    subscribers.forEach((subscriber) => subscriber(snapshot));
    return snapshot;
  };

  const applyQueue = (): AstStateSnapshot => {
    while (pendingTransactions.length > 0) {
      const transaction = pendingTransactions[0];
      pendingTransactions = pendingTransactions.slice(1);
      const before = cloneDocument(document);
      const after = reduceTransaction(before, transaction);
      if (JSON.stringify(before) === JSON.stringify(after)) {
        continue;
      }
      document = after;
      source = transaction.source;
      revision += 1;
    }
    return notify();
  };

  return {
    get snapshot() {
      return { revision, document, source };
    },
    subscribe(subscriber: AstSubscriber) {
      subscribers.add(subscriber);
      subscriber({ revision, document, source });
      return () => {
        subscribers.delete(subscriber);
      };
    },
    enqueue(transaction: AstCommandTransaction) {
      if (transaction.commands.length === 0) {
        return { revision, document, source };
      }
      pendingTransactions = [...pendingTransactions, transaction];
      return applyQueue();
    }
  };
}
