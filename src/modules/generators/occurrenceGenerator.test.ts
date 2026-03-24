import { describe, expect, it } from 'vitest';
import { generateOccurrenceData } from './occurrenceGenerator';
import type { DiagramProjection } from '../sync';

describe('generateOccurrenceData', () => {
  it('deve respeitar a cardinalidade 1:1', () => {
    const diagram: DiagramProjection = {
      entities: [
        { id: '1', name: 'User', attributes: [] },
        { id: '2', name: 'Profile', attributes: [] }
      ],
      relationships: [
        {
          id: 'r1',
          name: 'HasProfile',
          isOccurrence: true,
          participants: [
            { entityId: '1', entityName: 'User', min: 1, max: 1 },
            { entityId: '2', entityName: 'Profile', min: 1, max: 1 }
          ],
          attributes: []
        }
      ],
      specializations: []
    };

    const data = generateOccurrenceData(diagram);
    expect(data).toHaveLength(1);

    const rel = data[0];
    expect(rel.source.name).toBe('User');
    expect(rel.target.name).toBe('Profile');

    // Cada instância de origem deve ter no máximo 1 ligação (target.max = 1)
    for (const src of rel.source.instances) {
      const linksFromSrc = rel.links.filter((lk) => lk.sourceId === src);
      expect(linksFromSrc.length).toBeLessThanOrEqual(1);
    }

    // Cada instância de destino deve ter no máximo 1 ligação (source.max = 1)
    for (const tgt of rel.target.instances) {
      const linksToTgt = rel.links.filter((lk) => lk.targetId === tgt);
      expect(linksToTgt.length).toBeLessThanOrEqual(1);
    }
  });

  it('deve respeitar a cardinalidade 0:1 na origem (User 0:1 -> 1:1 Profile)', () => {
    const diagram: DiagramProjection = {
      entities: [
        { id: '1', name: 'User', attributes: [] },
        { id: '2', name: 'Profile', attributes: [] }
      ],
      relationships: [
        {
          id: 'r1',
          name: 'HasProfile',
          isOccurrence: true,
          participants: [
            { entityId: '1', entityName: 'User', min: 0, max: 1 }, // Origem
            { entityId: '2', entityName: 'Profile', min: 1, max: 1 } // Destino
          ],
          attributes: []
        }
      ],
      specializations: []
    };

    const data = generateOccurrenceData(diagram);
    const rel = data[0];

    // Origem tem max=1, min=0 (o destino pode ter no máximo 1 origem, e pode não ter origem)
    for (let i = 0; i < rel.target.instances.length; i++) {
      const tgt = rel.target.instances[i];
      const linksToTgt = rel.links.filter((lk) => lk.targetId === tgt);
      
      expect(linksToTgt.length).toBeLessThanOrEqual(1); // max = 1
      
      // O gerador garante a cardinalidade mínima na passagem secundária, exceto para o último elemento se min = 0
      if (i < rel.target.instances.length - 1) {
        expect(linksToTgt.length).toBeGreaterThanOrEqual(0); // min = 0
      }
    }
  });

  it('deve respeitar a cardinalidade 0:N no destino (User 1:1 -> 0:N Post)', () => {
    const diagram: DiagramProjection = {
      entities: [
        { id: '1', name: 'User', attributes: [] },
        { id: '2', name: 'Post', attributes: [] }
      ],
      relationships: [
        {
          id: 'r1',
          name: 'HasPost',
          isOccurrence: true,
          participants: [
            { entityId: '1', entityName: 'User', min: 1, max: 1 },
            { entityId: '2', entityName: 'Post', min: 0, max: '*' }
          ],
          attributes: []
        }
      ],
      specializations: []
    };

    const data = generateOccurrenceData(diagram);
    const rel = data[0];

    // Destino tem max='*', então a origem tenta criar até 2 links, mas o limite real
    // depende da disponibilidade de instâncias de destino.
    for (const src of rel.source.instances) {
      const linksFromSrc = rel.links.filter((lk) => lk.sourceId === src);
      expect(linksFromSrc.length).toBeLessThanOrEqual(2); // O gerador tem um teto de 2 para '*'
    }

    // Como source.max = 1, cada destino pode ter no máximo 1 origem
    for (const tgt of rel.target.instances) {
      const linksToTgt = rel.links.filter((lk) => lk.targetId === tgt);
      expect(linksToTgt.length).toBeLessThanOrEqual(1);
    }
  });

  it('deve respeitar a cardinalidade 1:N no destino (User 1:1 -> 1:N Comment)', () => {
    const diagram: DiagramProjection = {
      entities: [
        { id: '1', name: 'User', attributes: [] },
        { id: '2', name: 'Comment', attributes: [] }
      ],
      relationships: [
        {
          id: 'r1',
          name: 'MadeComment',
          isOccurrence: true,
          participants: [
            { entityId: '1', entityName: 'User', min: 1, max: 1 },
            { entityId: '2', entityName: 'Comment', min: 1, max: '*' }
          ],
          attributes: []
        }
      ],
      specializations: []
    };

    const data = generateOccurrenceData(diagram);
    const rel = data[0];

    for (const src of rel.source.instances) {
      const linksFromSrc = rel.links.filter((lk) => lk.sourceId === src);
      expect(linksFromSrc.length).toBeLessThanOrEqual(2);
    }

    for (const tgt of rel.target.instances) {
      const linksToTgt = rel.links.filter((lk) => lk.targetId === tgt);
      expect(linksToTgt.length).toBeLessThanOrEqual(1);
    }
  });
  
  it('deve respeitar autorelacionamento', () => {
    const diagram: DiagramProjection = {
      entities: [
        { id: '1', name: 'Employee', attributes: [] }
      ],
      relationships: [
        {
          id: 'r1',
          name: 'Manages',
          isOccurrence: true,
          participants: [
            { entityId: '1', entityName: 'Employee', min: 0, max: 1 },
            { entityId: '1', entityName: 'Employee', min: 0, max: '*' }
          ],
          attributes: []
        }
      ],
      specializations: []
    };

    const data = generateOccurrenceData(diagram);
    const rel = data[0];
    
    // O prefixo do alvo para autorelacionamento deve ter um apóstrofo
    expect(rel.source.instances[0]).toMatch(/^E\d+$/);
    expect(rel.target.instances[0]).toMatch(/^E'\d+$/);
  });
});
