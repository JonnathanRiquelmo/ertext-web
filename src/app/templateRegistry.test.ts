import { describe, expect, it } from 'vitest';

import type { ErdslDocumentNode } from '../modules/ast';
import { generateArtifacts } from '../modules/generators';
import { parseErdsl } from '../modules/parser';
import { projectAstToDiagram } from '../modules/sync';
import { getTemplateDefinition, listTemplateDefinitions } from './templateRegistry';

interface ExpectedParticipantProjection {
  readonly entityName: string;
  readonly min: number;
  readonly max: number | '*';
}

interface ExpectedRelationshipProjection {
  readonly name: string;
  readonly participants: readonly ExpectedParticipantProjection[];
}

interface ExpectedTemplateDiagramProjection {
  readonly entities: readonly string[];
  readonly relationships: readonly ExpectedRelationshipProjection[];
  readonly specializations: readonly string[];
}

type AdvancedConstruct = 'ternary' | 'multiple' | 'self' | 'generalization';

function collectAdvancedConstructs(document: ErdslDocumentNode): Set<AdvancedConstruct> {
  const constructs = new Set<AdvancedConstruct>();
  const entityPairRelationshipCounts = new Map<string, number>();

  for (const entity of document.entities.entities) {
    if (entity.generalization !== null) {
      constructs.add('generalization');
      break;
    }
  }

  for (const relationship of document.relationships.relationships) {
    if (relationship.leftSide.targetKind === 'Relation' || relationship.rightSide.targetKind === 'Relation') {
      constructs.add('ternary');
    }

    if (
      relationship.leftSide.targetKind === 'Entity' &&
      relationship.rightSide.targetKind === 'Entity' &&
      relationship.leftSide.target === relationship.rightSide.target
    ) {
      constructs.add('self');
    }

    if (relationship.leftSide.targetKind === 'Entity' && relationship.rightSide.targetKind === 'Entity') {
      const pairKey = [relationship.leftSide.target, relationship.rightSide.target].sort().join('::');
      const count = (entityPairRelationshipCounts.get(pairKey) ?? 0) + 1;
      entityPairRelationshipCounts.set(pairKey, count);
      if (count > 1) {
        constructs.add('multiple');
      }
    }
  }

  return constructs;
}

const EXPECTED_TEMPLATE_DIAGRAM_PROJECTIONS: Record<string, ExpectedTemplateDiagramProjection> = {
  'university-courses': {
    entities: ['Student', 'Course', 'Instructor'],
    specializations: [],
    relationships: [
      {
        name: 'Enrollment',
        participants: [
          { entityName: 'Student', min: 0, max: '*' },
          { entityName: 'Course', min: 0, max: '*' }
        ]
      },
      {
        name: 'TeachingAssignment',
        participants: [
          { entityName: 'Instructor', min: 1, max: 1 },
          { entityName: 'Course', min: 0, max: '*' }
        ]
      },
      {
        name: 'Mentors',
        participants: [
          { entityName: 'Instructor', min: 0, max: 1 },
          { entityName: 'Instructor', min: 0, max: '*' }
        ]
      }
    ]
  },
  'social-network': {
    entities: ['User', 'People', 'Organization', 'Posts', 'Photos', 'Groups', 'Roles'],
    specializations: ['User -> People', 'User -> Organization'],
    relationships: [
      {
        name: 'Friendship',
        participants: [
          { entityName: 'User', min: 0, max: '*' },
          { entityName: 'User', min: 1, max: '*' }
        ]
      },
      {
        name: 'PostSharing',
        participants: [
          { entityName: 'User', min: 1, max: 1 },
          { entityName: 'Posts', min: 0, max: '*' }
        ]
      },
      {
        name: 'photoPost',
        participants: [
          { entityName: 'Posts', min: 1, max: 1 },
          { entityName: 'Photos', min: 0, max: '*' }
        ]
      },
      {
        name: 'BelongsToGroup',
        participants: [
          { entityName: 'User', min: 0, max: '*' },
          { entityName: 'Groups', min: 0, max: '*' }
        ]
      },
      {
        name: 'RoleInTheGroup',
        participants: [
          { entityName: 'Roles', min: 1, max: 1 },
          { entityName: 'User', min: 0, max: '*' },
          { entityName: 'Groups', min: 0, max: '*' }
        ]
      }
    ]
  },
  'artificial-intelligence': {
    entities: ['Model', 'Dataset', 'Experiment', 'TrainingRun'],
    specializations: [],
    relationships: [
      {
        name: 'UsesDataset',
        participants: [
          { entityName: 'Experiment', min: 1, max: 1 },
          { entityName: 'Dataset', min: 0, max: '*' }
        ]
      },
      {
        name: 'TrainsModel',
        participants: [
          { entityName: 'Experiment', min: 1, max: 1 },
          { entityName: 'Model', min: 1, max: 1 }
        ]
      },
      {
        name: 'ExecutesRun',
        participants: [
          { entityName: 'TrainingRun', min: 1, max: 1 },
          { entityName: 'Experiment', min: 0, max: '*' }
        ]
      },
      {
        name: 'ModelLineage',
        participants: [
          { entityName: 'Model', min: 0, max: 1 },
          { entityName: 'Model', min: 0, max: '*' }
        ]
      }
    ]
  },
  'supply-chain-logistics': {
    entities: ['Party', 'Individual', 'Company', 'PartnerCompany', 'Warehouse', 'Product', 'Shipment'],
    specializations: ['Party -> Individual', 'Party -> Company', 'Company -> PartnerCompany'],
    relationships: [
      {
        name: 'ReportsTo',
        participants: [
          { entityName: 'Individual', min: 0, max: 1 },
          { entityName: 'Individual', min: 0, max: '*' }
        ]
      },
      {
        name: 'Stores',
        participants: [
          { entityName: 'Warehouse', min: 1, max: 1 },
          { entityName: 'Product', min: 0, max: '*' }
        ]
      },
      {
        name: 'Ships',
        participants: [
          { entityName: 'Shipment', min: 1, max: 1 },
          { entityName: 'Product', min: 1, max: '*' }
        ]
      },
      {
        name: 'Supplies',
        participants: [
          { entityName: 'Company', min: 0, max: '*' },
          { entityName: 'Warehouse', min: 0, max: '*' }
        ]
      }
    ]
  }
};

describe('templateRegistry', () => {
  it('registers all required template themes', () => {
    const templates = listTemplateDefinitions();
    expect(templates).toHaveLength(4);
    expect(templates.map((template) => template.metadata.id)).toEqual([
      'university-courses',
      'social-network',
      'artificial-intelligence',
      'supply-chain-logistics'
    ]);
  });

  it('stores reusable metadata and content contracts for each template', () => {
    const templates = listTemplateDefinitions();
    for (const template of templates) {
      expect(template.metadata.name.length).toBeGreaterThan(0);
      expect(template.metadata.themeLabel.length).toBeGreaterThan(0);
      expect(template.content.dsl.length).toBeGreaterThan(0);
    }
  });

  it('validates semantic correctness and generation for every shipped template', () => {
    const templates = listTemplateDefinitions();
    for (const template of templates) {
      const result = parseErdsl(template.content.dsl);
      if (!result.ok) {
        throw new Error(`Template ${template.metadata.id} is invalid: ${result.diagnostics[0]?.message ?? 'unknown'}`);
      }
      const artifacts = generateArtifacts(result.ast);
      expect(result.diagnostics).toHaveLength(0);
      expect(artifacts.logicalSchema!.tables.length).toBeGreaterThan(0);
      expect(artifacts.mysql).toBeDefined();
      expect(artifacts.postgresql).toBeDefined();
      expect(artifacts.mysql).toContain('CREATE TABLE');
      expect(artifacts.postgresql).toContain('CREATE TABLE');
      expect(result.ok).toBe(true);
    }
  });

  it('ensures each shipped template includes at least one advanced construct', () => {
    const templates = listTemplateDefinitions();

    for (const template of templates) {
      const result = parseErdsl(template.content.dsl);
      if (!result.ok) {
        throw new Error(`Template ${template.metadata.id} is invalid: ${result.diagnostics[0]?.message ?? 'unknown'}`);
      }

      const advancedConstructs = collectAdvancedConstructs(result.ast);
      expect(
        advancedConstructs.size,
        `Template "${template.metadata.id}" must include at least one advanced construct (ternary/multiple/self/generalization).`
      ).toBeGreaterThan(0);
    }
  });

  it('projects expected diagram entities, relationships, participants, and cardinalities for every template', () => {
    const templates = listTemplateDefinitions();

    for (const template of templates) {
      const parseResult = parseErdsl(template.content.dsl);
      if (!parseResult.ok) {
        throw new Error(`Template ${template.metadata.id} is invalid: ${parseResult.diagnostics[0]?.message ?? 'unknown'}`);
      }

      const expectedProjection = EXPECTED_TEMPLATE_DIAGRAM_PROJECTIONS[template.metadata.id];
      expect(expectedProjection).toBeDefined();

      const projection = projectAstToDiagram(parseResult.ast);
      const projectedEntities = projection.entities.map((entity) => entity.name).sort();
      const expectedEntities = [...expectedProjection.entities].sort();
      expect(projectedEntities).toEqual(expectedEntities);
      const projectedSpecializations = projection.specializations.map((specialization) => specialization.name).sort();
      const expectedSpecializations = [...expectedProjection.specializations].sort();
      expect(projectedSpecializations).toEqual(expectedSpecializations);

      expect(projection.relationships).toHaveLength(expectedProjection.relationships.length);
      for (const expectedRelationship of expectedProjection.relationships) {
        const relationship = projection.relationships.find((item) => item.name === expectedRelationship.name);
        expect(relationship).toBeDefined();
        if (!relationship) {
          continue;
        }

        const projectedParticipants = relationship.participants.map((participant) => ({
          entityName: participant.entityName,
          min: participant.min,
          max: participant.max
        }));
        expect(projectedParticipants).toEqual(expectedRelationship.participants);
      }
    }
  });

  it('resolves definitions by id and rejects unknown ids', () => {
    expect(getTemplateDefinition('social-network').metadata.name).toBe('Rede Social');
    expect(() => getTemplateDefinition('unknown-template')).toThrow('Unknown template id: unknown-template');
  });
});
