import { describe, expect, it } from 'vitest';

import { parseErdsl } from '../parser';
import { createAstStateEngine } from './state';

const source = `Generate All;
Domain Commerce;
Entities {
  Customer { customerId int isIdentifier }
};
Relationships {
};
`;

function createDocument() {
  const parsed = parseErdsl(source);
  if (!parsed.ok) {
    throw new Error(parsed.diagnostics[0]?.message ?? 'Fixture parsing failed.');
  }
  return parsed.ast;
}

describe('createAstStateEngine', () => {
  it('applies queued transactions with revision updates', () => {
    const engine = createAstStateEngine(createDocument());
    const snapshots: number[] = [];
    engine.subscribe((snapshot) => snapshots.push(snapshot.revision));

    engine.enqueue({
      id: 'tx-1',
      source: 'diagram',
      commands: [
        {
          kind: 'setGenerateTarget',
          target: 'PostgreSQL'
        }
      ]
    });

    expect(engine.snapshot.revision).toBe(1);
    expect(engine.snapshot.document.generate?.target).toBe('PostgreSQL');
    expect(snapshots).toEqual([0, 1]);
  });
});
