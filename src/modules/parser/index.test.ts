import { describe, expect, it } from 'vitest';

import { getTemplateDefinition } from '../../app/templateRegistry';
import { parseErdsl } from './index';

const validDsl = `
Generate Diagram;
Domain Commerce;
Entities {
  Person { id int isIdentifier, name string }
  Customer is total/disjoint Person { loyaltyCode string }
  Order { orderId int isIdentifier }
};
Relationships {
  Places [ Customer (1:1) relates (0:N) Order ] { placedAt datetime } @generateOccurrenceDiagram
  OrderMeta [ Order (1:1) relates (1:1) Customer ]
};
`;

describe('parseErdsl', () => {
  it('parses valid grammar-aligned ERDSL with inheritance, relation attributes, and occurrence flag', () => {
    const result = parseErdsl(validDsl);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected parser success.');
    }

    expect(result.ast.generate?.target).toBe('Diagram');
    expect(result.ast.domain.name).toBe('Commerce');
    expect(result.ast.entities.entities[1]?.generalization).toBe('total/disjoint');
    expect(result.ast.relationships.relationships[0]?.leftSide.cardinality).toBe('(1:1)');
    expect(result.ast.relationships.relationships[0]?.rightSide.cardinality).toBe('(0:N)');
    expect(result.ast.relationships.relationships[0]?.occurrence).toBe(true);
  });

  it('accepts OccurrenceDiagram as generate target', () => {
    const source = `
      Generate OccurrenceDiagram;
      Domain OccurrenceTest;
      Entities {
        Product { productId int isIdentifier }
      };
      Relationships {
      };
    `;

    const result = parseErdsl(source);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected parser success.');
    }
    expect(result.ast.generate?.target).toBe('OccurrenceDiagram');
  });

  it('accepts omitted Generate block', () => {
    const source = `
      Domain Inventory;
      Entities {
        Product { productId int isIdentifier }
      };
      Relationships {
      };
    `;

    const result = parseErdsl(source);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected parser success.');
    }
    expect(result.ast.generate).toBeNull();
  });

  it('enforces strict cardinality tokens', () => {
    const source = `
      Domain InvalidCardinality;
      Entities {
        User { userId int isIdentifier }
      };
      Relationships {
        Owns [ User (2:5) relates (0:N) User ]
      };
    `;

    const result = parseErdsl(source);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected parser failure.');
    }

    expect(result.diagnostics[0]).toMatchObject({
      code: 'ERDSL_INVALID_CARDINALITY',
      line: expect.any(Number),
      column: expect.any(Number)
    });
  });

  it('fails when Entities block is empty', () => {
    const source = `
      Domain Empty;
      Entities {
      };
      Relationships {
      };
    `;

    const result = parseErdsl(source);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected parser failure.');
    }
    expect(result.diagnostics[0]?.code).toBe('ERDSL_ENTITIES_EMPTY');
  });

  it('fails unknown cross references deterministically', () => {
    const source = `
      Domain MissingTarget;
      Entities {
        User { userId int isIdentifier }
      };
      Relationships {
        Owns [ User (1:1) relates (0:N) MissingEntity ]
      };
    `;

    const result = parseErdsl(source);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected parser failure.');
    }
    expect(result.diagnostics[0]?.code).toBe('ERDSL_UNKNOWN_RELATION_TARGET');
  });

  it('reports case mismatch references with a deterministic diagnostic', () => {
    const source = `
      Domain SocialNetwork;
      Entities {
        User { idUser int isIdentifier }
      };
      Relationships {
        BelongsToGroup [ User (0:N) relates (0:N) User ]
        RoleInTheGroup [ User (1:1) relates (1:N) belongsToGroup ]
      };
    `;

    const result = parseErdsl(source);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected parser failure.');
    }

    expect(result.diagnostics[0]?.code).toBe('ERDSL_CASE_MISMATCH_REFERENCE');
    expect(result.diagnostics[0]?.message).toContain('BelongsToGroup');
  });

  it('rejects invalid identifier characters and combinations with parser diagnostics', () => {
    const invalidEntityNames = [
      'ç',
      'ã',
      'ó',
      '2Entity',
      '@Entity',
      '#Entity',
      '~Entity',
      '!Entity',
      '``Entity',
      '´´Entity',
      '"Entity',
      "'Entity"
    ];

    for (const invalidEntityName of invalidEntityNames) {
      const source = `
        Domain InvalidNames;
        Entities {
          ${invalidEntityName} { id int isIdentifier }
        };
        Relationships {
        };
      `;
      const result = parseErdsl(source);
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error(`Expected parser failure for identifier "${invalidEntityName}".`);
      }
      expect(['ERDSL_INVALID_IDENTIFIER', 'ERDSL_UNEXPECTED_CHARACTER']).toContain(
        result.diagnostics[0]?.code
      );
    }
  });

  it('fails when an entity does not have an identifier and does not inherit one', () => {
    const source = `
      Domain NoIdentifier;
      Entities {
        InvalidEntity { name string }
      };
      Relationships {
      };
    `;

    const result = parseErdsl(source);
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('ERDSL_MISSING_IDENTIFIER');
    expect(result.diagnostics[0]?.message).toBe('A entidade InvalidEntity não possui atributo identificador.');
  });

  it('allows an entity without an identifier if it inherits from a super-entity', () => {
    const source = `
      Domain InheritedIdentifier;
      Entities {
        User { id int isIdentifier }
        ValidEntity is total/disjoint User { name string }
      };
      Relationships {
      };
    `;

    const result = parseErdsl(source);
    expect(result.ok).toBe(true);
  });

  it('parses the shipped social network template without semantic reference errors', () => {
    const socialNetworkTemplate = getTemplateDefinition('social-network');
    const result = parseErdsl(socialNetworkTemplate.content.dsl);
    if (!result.ok) {
      throw new Error(`Expected parser success, got: ${result.diagnostics[0]?.message ?? 'unknown error'}`);
    }
    expect(result.ok).toBe(true);
  });
});
