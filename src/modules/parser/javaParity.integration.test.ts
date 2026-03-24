import { describe, expect, it } from 'vitest';

import { generateArtifacts } from '../generators';
import { parseErdsl } from './index';

const javaParityDsl = `
Generate All;
Domain SocialNetwork;
Entities {
  User { idUser int isIdentifier, loginEmail string, loginPassword string }
  People is total/disjoint User { name string, birthday datetime }
  Organization is total/disjoint User { fantasyName string }
  Posts { idPost int isIdentifier, contents string, dateCreated datetime, dateModified datetime }
  Photos { idPhoto int isIdentifier, image file }
  Groups { idGroup int isIdentifier, title string, description string }
  Roles { idRole int isIdentifier, description string, permissionLevel int }
};
Relationships {
  Friendship [ User (0:N) relates (1:N) User ] { date datetime }
  PostSharing [ User (1:1) relates (0:N) Posts ]
  PhotoPost [ Posts (1:1) relates (0:N) Photos ]
  BelongsToGroup [ User (0:N) relates (0:N) Groups ]
  RoleInTheGroup [ Roles (1:1) relates (1:N) BelongsToGroup ] @generateOccurrenceDiagram
};
`;

describe('java parity integration', () => {
  it('parses the original grammar shape with inheritance, relation-to-relation targets, and occurrence flag', () => {
    const result = parseErdsl(javaParityDsl);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected parser success for Java parity DSL.');
    }

    expect(result.ast.generate?.target).toBe('All');
    expect(result.ast.entities.entities).toHaveLength(7);
    expect(result.ast.entities.entities[1]?.generalization).toBe('total/disjoint');
    expect(result.ast.relationships.relationships).toHaveLength(5);
    expect(result.ast.relationships.relationships[4]?.rightSide.targetKind).toBe('Relation');
    expect(result.ast.relationships.relationships[4]?.occurrence).toBe(true);
  });

  it('keeps parity for validation rules and deterministic diagnostics', () => {
    const invalidSource = `
Domain InvalidDataType;
Entities {
  User { idUser uuid isIdentifier }
};
Relationships {
};
`;

    const result = parseErdsl(invalidSource);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected parser failure for invalid datatype.');
    }

    expect(result.diagnostics[0]).toMatchObject({
      code: 'ERDSL_INVALID_DATA_TYPE',
      line: expect.any(Number),
      column: expect.any(Number)
    });
  });

  it('preserves generation parity from parsed conceptual model to logical and SQL artifacts', () => {
    const parseResult = parseErdsl(javaParityDsl);
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) {
      throw new Error('Expected parser success for artifact parity test.');
    }

    const artifacts = generateArtifacts(parseResult.ast);
    expect(artifacts.logicalSchema!.domain).toBe('SocialNetwork');
    expect(artifacts.logicalSchema!.tables.length).toBeGreaterThan(0);
    expect(artifacts.mysql).toContain('CREATE TABLE');
    expect(artifacts.postgresql).toContain('CREATE TABLE');
  });
});
