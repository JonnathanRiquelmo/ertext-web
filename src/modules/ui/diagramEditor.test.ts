import { describe, expect, it } from 'vitest';

import { parseErdsl } from '../parser';
import { projectAstToDiagram } from '../sync';
import { mapDiagramSemanticToAstCommands } from './diagramEditor';

const fixture = `Generate Diagram;
Domain Sales;
Entities {
  Customer { customerId int isIdentifier }
  Order { orderId int isIdentifier }
};
Relationships {
  Places [ Customer (1:1) relates (0:N) Order ]
};
`;

function createContext() {
  const parsed = parseErdsl(fixture);
  if (!parsed.ok) {
    throw new Error('Failed to load test fixture.');
  }
  return {
    document: parsed.ast,
    projection: projectAstToDiagram(parsed.ast)
  };
}

describe('mapDiagramSemanticToAstCommands', () => {
  it('creates entity via semantic command', () => {
    const context = createContext();
    const commands = mapDiagramSemanticToAstCommands(
      [{ kind: 'createEntity', preferredName: 'Invoice' }],
      context
    );

    expect(commands).toHaveLength(1);
    expect(commands[0]?.kind).toBe('upsertEntity');
    if (commands[0]?.kind !== 'upsertEntity') {
      throw new Error('Expected upsertEntity command.');
    }
    expect(commands[0].entity.name).toBe('Invoice');
    expect(commands[0].entity.attributes[0]?.isIdentifier).toBe(true);
  });

  it('updates relationship cardinality via semantic command', () => {
    const context = createContext();
    const relationship = context.projection.relationships[0];
    const participant = relationship?.participants[1];
    if (!relationship || !participant) {
      throw new Error('Invalid fixture for relationship test.');
    }

    const commands = mapDiagramSemanticToAstCommands(
      [
        {
          kind: 'updateRelationshipCardinality',
          relationshipId: relationship.id,
          participantEntityId: participant.entityId,
          cardinality: { min: 1, max: '*' }
        }
      ],
      context
    );

    expect(commands).toHaveLength(1);
    expect(commands[0]?.kind).toBe('upsertRelationship');
    if (commands[0]?.kind !== 'upsertRelationship') {
      throw new Error('Expected upsertRelationship command.');
    }
    expect(commands[0].relationship.rightSide.cardinality).toBe('(1:N)');
  });

  it('creates relationship via semantic connection command', () => {
    const context = createContext();
    const source = context.projection.entities[0];
    const target = context.projection.entities[1];
    if (!source || !target) {
      throw new Error('Invalid fixture for relationship creation test.');
    }

    const commands = mapDiagramSemanticToAstCommands(
      [
        {
          kind: 'createRelationship',
          sourceEntityId: source.id,
          targetEntityId: target.id
        }
      ],
      context
    );

    expect(commands).toHaveLength(1);
    expect(commands[0]?.kind).toBe('upsertRelationship');
    if (commands[0]?.kind !== 'upsertRelationship') {
      throw new Error('Expected upsertRelationship command.');
    }
    expect(commands[0].relationship.leftSide.target).toBe(source.name);
    expect(commands[0].relationship.rightSide.target).toBe(target.name);
    expect(commands[0].relationship.leftSide.cardinality).toBe('(1:1)');
    expect(commands[0].relationship.rightSide.cardinality).toBe('(0:N)');
  });

  it('renames entity and updates relationship references', () => {
    const context = createContext();
    const source = context.projection.entities.find((entity) => entity.name === 'Customer');
    if (!source) {
      throw new Error('Missing Customer entity in fixture.');
    }

    const commands = mapDiagramSemanticToAstCommands(
      [
        {
          kind: 'renameEntity',
          entityId: source.id,
          nextName: 'Client'
        }
      ],
      context
    );

    expect(commands).toHaveLength(1);
    expect(commands[0]?.kind).toBe('setDocument');
    if (commands[0]?.kind !== 'setDocument') {
      throw new Error('Expected setDocument command.');
    }
    expect(commands[0].document.entities.entities.some((entity) => entity.name === 'Client')).toBe(true);
    expect(
      commands[0].document.relationships.relationships.some(
        (relationship) =>
          relationship.leftSide.target === 'Client' || relationship.rightSide.target === 'Client'
      )
    ).toBe(true);
  });

  it('renames relationship preserving semantic sides', () => {
    const context = createContext();
    const relationship = context.projection.relationships[0];
    if (!relationship) {
      throw new Error('Invalid fixture for relationship rename test.');
    }

    const commands = mapDiagramSemanticToAstCommands(
      [
        {
          kind: 'renameRelationship',
          relationshipId: relationship.id,
          nextName: 'Purchases'
        }
      ],
      context
    );

    expect(commands).toHaveLength(1);
    expect(commands[0]?.kind).toBe('setDocument');
    if (commands[0]?.kind !== 'setDocument') {
      throw new Error('Expected setDocument command.');
    }
    const renamed = commands[0].document.relationships.relationships.find(
      (item) => item.name === 'Purchases'
    );
    expect(renamed).toBeDefined();
    expect(renamed?.leftSide.target).toBe('Customer');
    expect(renamed?.rightSide.target).toBe('Order');
  });

  it('removes entity via semantic command using entity id', () => {
    const context = createContext();
    const entity = context.projection.entities.find((item) => item.name === 'Order');
    if (!entity) {
      throw new Error('Missing Order entity in fixture.');
    }

    const commands = mapDiagramSemanticToAstCommands(
      [{ kind: 'removeEntity', entityId: entity.id }],
      context
    );

    expect(commands).toHaveLength(1);
    expect(commands[0]).toEqual({ kind: 'removeEntity', entityName: 'Order' });
  });

  it('removes relationship via semantic command using relationship id', () => {
    const context = createContext();
    const relationship = context.projection.relationships[0];
    if (!relationship) {
      throw new Error('Invalid fixture for relationship removal test.');
    }

    const commands = mapDiagramSemanticToAstCommands(
      [{ kind: 'removeRelationship', relationshipId: relationship.id }],
      context
    );

    expect(commands).toHaveLength(1);
    expect(commands[0]).toEqual({ kind: 'removeRelationship', relationshipName: 'Places' });
  });

  it('adds and removes relationship attribute via semantic command', () => {
    const context = createContext();
    const relationship = context.projection.relationships[0];
    if (!relationship) {
      throw new Error('Invalid fixture for relationship attribute test.');
    }

    const upsertCommands = mapDiagramSemanticToAstCommands(
      [
        {
          kind: 'upsertRelationshipAttribute',
          relationshipId: relationship.id,
          attributeName: 'createdAt',
          dataType: 'datetime'
        }
      ],
      context
    );
    expect(upsertCommands[0]?.kind).toBe('upsertRelationship');
    if (upsertCommands[0]?.kind !== 'upsertRelationship') {
      throw new Error('Expected upsertRelationship command.');
    }
    expect(upsertCommands[0].relationship.attributes.some((item) => item.name === 'createdAt')).toBe(true);

    const removeCommands = mapDiagramSemanticToAstCommands(
      [
        {
          kind: 'removeRelationshipAttribute',
          relationshipId: relationship.id,
          attributeName: 'createdAt'
        }
      ],
      {
        ...context,
        document: {
          ...context.document,
          relationships: {
            ...context.document.relationships,
            relationships: [upsertCommands[0].relationship]
          }
        }
      }
    );
    expect(removeCommands[0]?.kind).toBe('upsertRelationship');
    if (removeCommands[0]?.kind !== 'upsertRelationship') {
      throw new Error('Expected upsertRelationship command.');
    }
    expect(removeCommands[0].relationship.attributes.some((item) => item.name === 'createdAt')).toBe(false);
  });
});
