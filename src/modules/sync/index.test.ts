import { describe, expect, it } from 'vitest';

import { createAstStateEngine } from '../ast';
import { parseErdsl } from '../parser';
import { createSyncCoordinator } from './index';

const source = `Generate Diagram;
Domain Sales;
Entities {
  Customer { customerId int isIdentifier }
  VipCustomer is total/disjoint Customer { loyaltyTier string }
  Order { orderId int isIdentifier }
  Promotion { promotionId int isIdentifier }
};
Relationships {
  Places [ Customer (1:1) relates (0:N) Order ]
  DiscountedBy [ Order (1:1) relates (0:N) Promotion ]
  VipOffer [ VipCustomer (1:1) relates (1:N) DiscountedBy ]
};
`;

function createCoordinator() {
  const parsed = parseErdsl(source);
  if (!parsed.ok) {
    throw new Error('Failed to parse fixture.');
  }
  const engine = createAstStateEngine(parsed.ast);
  return createSyncCoordinator({ engine });
}

describe('createSyncCoordinator', () => {
  it('rejects stale parse results', () => {
    const coordinator = createCoordinator();
    const staleRevision = coordinator.getRevision();
    coordinator.commitDiagram([{ kind: 'setGenerateTarget', target: 'MySQL' }], staleRevision);
    const staleResult = coordinator.commitText(source, staleRevision);
    expect(staleResult.ok).toBe(false);
    if (staleResult.ok) {
      throw new Error('Expected stale revision rejection.');
    }
    expect(staleResult.reason).toBe('stale_revision');
  });

  it('produces canonical text and diagram projections', () => {
    const coordinator = createCoordinator();
    const text = coordinator.projectText();
    const diagram = coordinator.projectDiagram();
    expect(text).toContain('Generate Diagram;');
    expect(text).toContain('Places [ Customer (1:1) relates (0:N) Order ]');
    expect(diagram.entities).toHaveLength(4);
    expect(diagram.relationships[0].participants).toHaveLength(2);
    const vipOffer = diagram.relationships.find((relationship) => relationship.name === 'VipOffer');
    expect(vipOffer?.participants.map((participant) => participant.entityName)).toEqual([
      'VipCustomer',
      'Order',
      'Promotion'
    ]);
    expect(diagram.specializations).toEqual([
      {
        id: 'entity:vipcustomer',
        name: 'Customer -> VipCustomer',
        superEntityId: 'entity:customer',
        subEntityId: 'entity:vipcustomer',
        generalization: 'total/disjoint'
      }
    ]);
  });
});
