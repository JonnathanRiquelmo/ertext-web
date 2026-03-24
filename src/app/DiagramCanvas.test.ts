import { describe, expect, it } from 'vitest';

import { diagramCanvasTestKit } from './DiagramCanvas';

describe('diagramCanvasTestKit', () => {
  it('preserva posições já arrastadas e cria layout padrão para novas entidades', () => {
    const metrics = diagramCanvasTestKit.resolveCanvasMetrics(1366);
    const currentLayout = {
      'entity:customer': { x: 320, y: 260 }
    };

    const nextLayout = diagramCanvasTestKit.syncLayoutWithEntities(
      [{ id: 'entity:customer' }, { id: 'entity:order' }],
      currentLayout,
      metrics
    );

    expect(nextLayout['entity:customer']).toEqual({ x: 320, y: 260 });
    expect(nextLayout['entity:order']).toEqual(diagramCanvasTestKit.createDefaultPosition(1, metrics));
  });

  it('recalcula todo o layout em grade durante auto-organização', () => {
    const metrics = diagramCanvasTestKit.resolveCanvasMetrics(1366);

    const nextLayout = diagramCanvasTestKit.createAutoLayout(
      [{ id: 'entity:customer' }, { id: 'entity:order' }, { id: 'entity:payment' }],
      metrics
    );

    expect(nextLayout).toEqual({
      'entity:customer': diagramCanvasTestKit.createDefaultPosition(0, metrics),
      'entity:order': diagramCanvasTestKit.createDefaultPosition(1, metrics),
      'entity:payment': diagramCanvasTestKit.createDefaultPosition(2, metrics)
    });
  });

  it('limita posição de arraste aos limites do canvas', () => {
    const metrics = diagramCanvasTestKit.resolveCanvasMetrics(1366);

    const clamped = diagramCanvasTestKit.clampPosition({ x: -100, y: 9999 }, 900, 580, metrics);

    expect(clamped).toEqual({ x: 40, y: 408 });
  });

  it('creates a curved loop geometry for self relationships', () => {
    const metrics = diagramCanvasTestKit.resolveCanvasMetrics(1366);
    const loop = diagramCanvasTestKit.createSelfLoopGeometry({ x: 300, y: 260 }, metrics);

    expect(loop.path).toContain('C');
    expect(loop.labelY).toBeLessThan(260 - metrics.nodeHeight / 2);
    expect(loop.sourceCardinalityX).toBeGreaterThan(loop.targetCardinalityX);
  });

  it('resolves drawable specialization segments between subtype and supertype', () => {
    const metrics = diagramCanvasTestKit.resolveCanvasMetrics(1366);
    const layout = {
      'entity:customer': { x: 80, y: 80 },
      'entity:vipcustomer': { x: 80, y: 320 }
    };

    const segments = diagramCanvasTestKit.resolveSpecializationSegments(
      [
        {
          id: 'entity:vipcustomer',
          name: 'Customer -> VipCustomer',
          superEntityId: 'entity:customer',
          subEntityId: 'entity:vipcustomer',
          generalization: 'total/disjoint'
        }
      ],
      layout,
      metrics
    );

    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({
      id: 'entity:vipcustomer',
      name: 'Customer -> VipCustomer',
      superCenter: {
        x: 80 + metrics.nodeWidth / 2,
        y: 80 + metrics.nodeHeight / 2
      },
      subCenter: {
        x: 80 + metrics.nodeWidth / 2,
        y: 320 + metrics.nodeHeight / 2
      }
    });
  });

  it('starts relationship selection on first entity double click and connects on second', () => {
    expect(diagramCanvasTestKit.resolveDoubleClickRelationshipAction(null, 'entity:customer')).toEqual({
      nextSourceEntityId: 'entity:customer',
      shouldCreateRelationship: false,
      relationshipSourceEntityId: null
    });
    expect(
      diagramCanvasTestKit.resolveDoubleClickRelationshipAction('entity:customer', 'entity:order')
    ).toEqual({
      nextSourceEntityId: null,
      shouldCreateRelationship: true,
      relationshipSourceEntityId: 'entity:customer'
    });
  });

  it('uses sanitized entity name for canvas double click creation', () => {
    expect(diagramCanvasTestKit.resolveEntityNameForCreation('  Produto  ')).toBe('Produto');
    expect(diagramCanvasTestKit.resolveEntityNameForCreation('   ')).toBe('');
  });

  it('aplica limites seguros ao zoom', () => {
    expect(diagramCanvasTestKit.clampZoomLevel(0.1)).toBe(0.5);
    expect(diagramCanvasTestKit.clampZoomLevel(0.75)).toBe(0.75);
    expect(diagramCanvasTestKit.clampZoomLevel(3)).toBe(2);
  });
});
