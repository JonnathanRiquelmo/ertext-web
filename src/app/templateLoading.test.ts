import { describe, expect, it } from 'vitest';

import { createAstStateEngine } from '../modules/ast';
import { parseErdsl } from '../modules/parser';
import { createSyncCoordinator } from '../modules/sync';
import { starterDsl } from './sampleDsl';
import { loadTemplateThroughSyncPipeline } from './templateLoading';
import { getTemplateDefinition } from './templateRegistry';

function createRuntime() {
  const parsedStarter = parseErdsl(starterDsl);
  if (!parsedStarter.ok) {
    throw new Error(`Invalid starter DSL fixture: ${parsedStarter.diagnostics[0]?.message ?? 'unknown error'}`);
  }
  const engine = createAstStateEngine(parsedStarter.ast);
  const coordinator = createSyncCoordinator({ engine });
  return { engine, coordinator };
}

describe('loadTemplateThroughSyncPipeline', () => {
  it('loads template DSL through sync pipeline and refreshes DSL, diagram, and generated outputs', () => {
    const runtime = createRuntime();
    const baselineDiagram = runtime.coordinator.projectDiagram();
    const baselineOutputs = runtime.engine.snapshot.document;
    const selectedTemplate = getTemplateDefinition('social-network');

    const result = loadTemplateThroughSyncPipeline(selectedTemplate.content.dsl, {
      coordinator: runtime.coordinator,
      readCurrentDocument: () => runtime.engine.snapshot.document
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.projection.dslText).toBe(selectedTemplate.content.dsl);
    expect(result.projection.revision).toBeGreaterThan(0);
    expect(result.projection.diagram.entities.map((entity) => entity.name)).toEqual(
      expect.arrayContaining(['User', 'People', 'Organization'])
    );
    expect(result.projection.diagram.entities.map((entity) => entity.name)).not.toEqual(
      expect.arrayContaining(['Student'])
    );
    expect(result.projection.diagram.entities).not.toEqual(baselineDiagram.entities);
    expect(result.projection.diagram.specializations.map((item) => item.name)).toEqual(
      expect.arrayContaining(['User -> People', 'User -> Organization'])
    );
    const roleInTheGroup = result.projection.diagram.relationships.find(
      (relationship) => relationship.name === 'RoleInTheGroup'
    );
    expect(roleInTheGroup?.participants.map((participant) => participant.entityName)).toEqual([
      'Roles',
      'User',
      'Groups'
    ]);
    expect(result.projection.outputs.logicalSchema!.tables.length).toBeGreaterThan(0);
    expect(result.projection.outputs.mysql).toBeDefined();
    expect(result.projection.outputs.postgresql).toBeDefined();
    expect(result.projection.outputs.mysql ?? '').toContain('CREATE TABLE');
    expect(result.projection.outputs.postgresql ?? '').toContain('CREATE TABLE');
    expect(runtime.engine.snapshot.document).not.toEqual(baselineOutputs);
  });

  it('returns parser diagnostics and keeps revision unchanged when template DSL is invalid', () => {
    const runtime = createRuntime();
    const initialRevision = runtime.coordinator.getRevision();
    const invalidTemplateDsl = 'Domain Broken';

    const result = loadTemplateThroughSyncPipeline(invalidTemplateDsl, {
      coordinator: runtime.coordinator,
      readCurrentDocument: () => runtime.engine.snapshot.document
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(runtime.coordinator.getRevision()).toBe(initialRevision);
  });
});
