import { describe, expect, it } from 'vitest';

import { parseErdsl } from '../parser';
import { generateArtifacts } from './index';

describe('generateArtifacts', () => {
  it('generates both SQL targets when Generate is All', () => {
    const parsed = parseErdsl(`Domain Billing;
Entities {
  Invoice { invoiceId int isIdentifier }
};
Relationships {
};
`);
    if (!parsed.ok) {
      throw new Error('Expected parse success.');
    }
    const artifacts = generateArtifacts(parsed.ast);
    expect(artifacts.mysql).toContain('CREATE TABLE');
    expect(artifacts.postgresql).toContain('CREATE TABLE');
  });

  it('honors Generate target filtering', () => {
    const parsed = parseErdsl(`Generate PostgreSQL;
Domain Billing;
Entities {
  Invoice { invoiceId int isIdentifier }
};
Relationships {
};
`);
    if (!parsed.ok) {
      throw new Error('Expected parse success.');
    }
    const artifacts = generateArtifacts(parsed.ast);
    expect(artifacts.postgresql).toContain('CREATE TABLE');
    expect(artifacts.mysql).toBeUndefined();
  });

  it('maps ERDSL types to compatible MySQL/PostgreSQL column types', () => {
    const parsed = parseErdsl(`Generate All;
Domain TypeMapping;
Entities {
  Attachment {
    attachmentId int isIdentifier,
    amount money,
    rating double,
    payload file,
    isArchived boolean
  }
};
Relationships {
};
`);
    if (!parsed.ok) {
      throw new Error('Expected parse success.');
    }

    const artifacts = generateArtifacts(parsed.ast);
    expect(artifacts.mysql).toContain('`amount` DECIMAL(19,4)');
    expect(artifacts.mysql).toContain('`rating` DOUBLE');
    expect(artifacts.mysql).toContain('`payload` LONGBLOB');
    expect(artifacts.mysql).toContain('`is_archived` TINYINT(1)');

    expect(artifacts.postgresql).toContain('"amount" MONEY');
    expect(artifacts.postgresql).toContain('"rating" DOUBLE PRECISION');
    expect(artifacts.postgresql).toContain('"payload" BYTEA');
    expect(artifacts.postgresql).toContain('"is_archived" BOOLEAN');
  });

  it('throws when a table has no columns to avoid invalid CREATE TABLE syntax', () => {
    const ast: any = {
      id: 'document',
      kind: 'ErdslDocument',
      span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
      generate: { id: 'generate', kind: 'GenerateBlock', target: 'MySQL', span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } } },
      domain: { id: 'domain', kind: 'DomainBlock', name: 'EmptyTable', span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } } },
      entities: {
        id: 'entities',
        kind: 'EntitiesBlock',
        entities: [
          {
            id: 'entity:audit_log',
            kind: 'Entity',
            name: 'AuditLog',
            generalization: null,
            superEntity: null,
            attributes: [],
            span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } }
          }
        ],
        span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } }
      },
      relationships: {
        id: 'relationships',
        kind: 'RelationshipsBlock',
        relationships: [],
        span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } }
      }
    };

    expect(() => generateArtifacts(ast)).toThrow(
      'Cannot generate MySQL SQL for table "audit_log" without columns.'
    );
  });

  it('generates propagated relationship and inheritance constraints into SQL output', () => {
    const parsed = parseErdsl(`Generate PostgreSQL;
Domain SocialNetwork;
Entities {
  User { idUser int isIdentifier }
  People is total/disjoint User { birthday datetime }
  Group { idGroup int isIdentifier }
  Role { idRole int isIdentifier }
};
Relationships {
  Membership [ User (0:N) relates (0:N) Group ]
  RoleInMembership [ Role (1:1) relates (1:N) Membership ]
};
`);
    if (!parsed.ok) {
      throw new Error('Expected parse success.');
    }
    const artifacts = generateArtifacts(parsed.ast);
    expect(artifacts.postgresql).toContain('CONSTRAINT "fk_people_inherits_user"');
    expect(artifacts.postgresql).toContain('CONSTRAINT "fk_role_in_membership_role_user_1"');
    expect(artifacts.postgresql).toContain('CONSTRAINT "fk_role_in_membership_role_group_3"');
    expect(artifacts.mysql).toBeUndefined();
  });
});
