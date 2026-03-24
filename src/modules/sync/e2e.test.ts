import { describe, expect, it } from 'vitest';

import { createAstStateEngine } from '../ast';
import { generateArtifacts } from '../generators';
import { parseErdsl } from '../parser';
import { mapDiagramSemanticToAstCommands, type DiagramSemanticCommand } from '../ui';
import { createSyncCoordinator } from './index';

const text = `Generate All;
Domain Retail;
Entities {
  Customer { customerId int isIdentifier }
  Order { orderId int isIdentifier }
};
Relationships {
  Places [ Customer (1:1) relates (0:N) Order ]
};
`;

describe('e2e sync and generation', () => {
  it('keeps text and diagram synchronized and generates SQL', () => {
    const parsed = parseErdsl(text);
    if (!parsed.ok) {
      throw new Error('Fixture parsing failed.');
    }
    const engine = createAstStateEngine(parsed.ast);
    const coordinator = createSyncCoordinator({ engine });

    const firstRevision = coordinator.getRevision();
    const diagramResult = coordinator.commitDiagram(
      [
        {
          kind: 'setGenerateTarget',
          target: 'PostgreSQL'
        }
      ],
      firstRevision
    );

    expect(diagramResult.ok).toBe(true);
    const projectedText = coordinator.projectText();
    expect(projectedText).toContain('Generate PostgreSQL;');
    const textResult = coordinator.commitText(projectedText, coordinator.getRevision());
    expect(textResult.ok).toBe(true);

    const artifacts = generateArtifacts(engine.snapshot.document);
    expect(artifacts.postgresql).toContain('customer');
    expect(artifacts.mysql).toBeUndefined();
  });

  it('keeps diagram->AST->DSL consistent under continuous edits', () => {
    const parsed = parseErdsl(text);
    if (!parsed.ok) {
      throw new Error('Fixture parsing failed.');
    }
    const engine = createAstStateEngine(parsed.ast);
    const coordinator = createSyncCoordinator({ engine });

    const commitSemantic = (commands: readonly DiagramSemanticCommand[]) => {
      const astCommands = mapDiagramSemanticToAstCommands(commands, {
        projection: coordinator.projectDiagram(),
        document: engine.snapshot.document
      });
      expect(astCommands.length).toBeGreaterThan(0);
      const result = coordinator.commitDiagram(astCommands, coordinator.getRevision());
      expect(result.ok).toBe(true);
    };

    commitSemantic([{ kind: 'createEntity', preferredName: 'Invoice' }]);

    const projectionAfterEntities = coordinator.projectDiagram();
    const customer = projectionAfterEntities.entities.find((entity) => entity.name === 'Customer');
    const invoice = projectionAfterEntities.entities.find((entity) => entity.name === 'Invoice');
    if (!customer || !invoice) {
      throw new Error('Required entities not found.');
    }

    commitSemantic([
      {
        kind: 'createRelationship',
        sourceEntityId: customer.id,
        targetEntityId: invoice.id
      }
    ]);

    let relationship = coordinator
      .projectDiagram()
      .relationships.find((item) => item.participants.some((participant) => participant.entityName === 'Invoice'));
    if (!relationship) {
      throw new Error('Created relationship not found.');
    }

    const invoiceParticipant = relationship.participants.find(
      (participant) => participant.entityId === invoice.id
    );
    if (!invoiceParticipant) {
      throw new Error('Invoice participant not found.');
    }

    commitSemantic([
      {
        kind: 'updateRelationshipCardinality',
        relationshipId: relationship.id,
        participantEntityId: invoiceParticipant.entityId,
        cardinality: { min: 1, max: '*' }
      }
    ]);

    commitSemantic([
      {
        kind: 'upsertRelationshipAttribute',
        relationshipId: relationship.id,
        attributeName: 'createdAt',
        dataType: 'datetime'
      }
    ]);

    relationship = coordinator.projectDiagram().relationships.find((item) => item.id === relationship?.id);
    if (!relationship) {
      throw new Error('Expected relationship not found after updates.');
    }
    expect(relationship.attributes.some((attribute) => attribute.name === 'createdAt')).toBe(true);
    expect(
      relationship.participants.find((participant) => participant.entityId === invoice.id)
    ).toMatchObject({ min: 1, max: '*' });

    const canonicalText = coordinator.projectText();
    expect(canonicalText).toContain('CustomerToInvoice [ Customer (1:1) relates (1:N) Invoice ]');
    expect(canonicalText).toContain('{ createdAt datetime }');

    const textResult = coordinator.commitText(canonicalText, coordinator.getRevision());
    expect(textResult.ok).toBe(true);
    expect(coordinator.projectDiagram().entities.map((entity) => entity.name)).toEqual(
      expect.arrayContaining(['Customer', 'Order', 'Invoice'])
    );
  });
});
