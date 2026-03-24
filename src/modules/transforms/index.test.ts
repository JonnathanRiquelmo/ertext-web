import { describe, expect, it } from 'vitest';

import { parseErdsl } from '../parser';
import { transformConceptualToLogical } from './index';

const source = `Generate All;
Domain Logistics;
Entities {
  Warehouse { warehouseId int isIdentifier, name string }
  Package { packageId int isIdentifier }
};
Relationships {
  Ships [ Warehouse (1:1) relates (0:N) Package ]
};
`;

describe('transformConceptualToLogical', () => {
  it('maps entities and binary relationships deterministically', () => {
    const parsed = parseErdsl(source);
    if (!parsed.ok) {
      throw new Error('Expected parse success.');
    }

    const schema = transformConceptualToLogical(parsed.ast);
    expect(schema.domain).toBe('Logistics');
    expect(schema.tables.map((table) => table.name)).toEqual(['package', 'warehouse']);

    const packageTable = schema.tables.find((table) => table.name === 'package');
    expect(packageTable?.foreignKeys.some((fk) => fk.referencesTable === 'warehouse')).toBe(true);
    expect(packageTable?.columns.find((column) => column.name === 'warehouse_warehouse_id')?.dataType).toBe('int');
  });

  it('propagates generalization keys and relationship references to descendants', () => {
    const parsed = parseErdsl(`Generate All;
Domain Logistics;
Entities {
  Party { partyId int isIdentifier }
  Person is total/disjoint Party { name string }
  Company is partial/overlapped Party { legalName string }
  PartnerCompany is total/overlapped Company { partnershipSince datetime }
  Shipment { shipmentId int isIdentifier }
};
Relationships {
  AssignedTo [ Party (1:1) relates (0:N) Shipment ]
};
`);
    if (!parsed.ok) {
      throw new Error('Expected parse success.');
    }

    const schema = transformConceptualToLogical(parsed.ast);
    const personTable = schema.tables.find((table) => table.name === 'person');
    const companyTable = schema.tables.find((table) => table.name === 'company');
    const partnerCompanyTable = schema.tables.find((table) => table.name === 'partner_company');
    const shipmentTable = schema.tables.find((table) => table.name === 'shipment');

    expect(personTable?.primaryKey).toContain('party_party_id');
    expect(companyTable?.primaryKey).toContain('party_party_id');
    expect(partnerCompanyTable?.primaryKey).toContain('company_party_party_id');
    expect(personTable?.foreignKeys.some((fk) => fk.referencesTable === 'party')).toBe(true);
    expect(companyTable?.foreignKeys.some((fk) => fk.referencesTable === 'party')).toBe(true);
    expect(partnerCompanyTable?.foreignKeys.some((fk) => fk.referencesTable === 'company')).toBe(true);
    expect(shipmentTable?.foreignKeys.some((fk) => fk.referencesTable === 'party')).toBe(true);
    expect(shipmentTable?.foreignKeys.some((fk) => fk.referencesTable === 'person')).toBe(true);
    expect(shipmentTable?.foreignKeys.some((fk) => fk.referencesTable === 'company')).toBe(true);
    expect(shipmentTable?.foreignKeys.some((fk) => fk.referencesTable === 'partner_company')).toBe(true);
  });

  it('propagates relation-target participants into logical foreign keys', () => {
    const parsed = parseErdsl(`Generate All;
Domain Social;
Entities {
  User { userId int isIdentifier }
  Group { groupId int isIdentifier }
  Role { roleId int isIdentifier }
};
Relationships {
  Membership [ User (0:N) relates (0:N) Group ]
  RoleAssignment [ Role (1:1) relates (1:N) Membership ]
};
`);
    if (!parsed.ok) {
      throw new Error('Expected parse success.');
    }

    const schema = transformConceptualToLogical(parsed.ast);
    const userTable = schema.tables.find((table) => table.name === 'user');
    const groupTable = schema.tables.find((table) => table.name === 'group');
    expect(userTable?.foreignKeys.some((fk) => fk.referencesTable === 'role')).toBe(true);
    expect(groupTable?.foreignKeys.some((fk) => fk.referencesTable === 'role')).toBe(true);
  });
});
