import type { DiagramProjection } from '../sync';

export interface OccurrenceEntity {
  readonly id: string;
  readonly name: string;
  readonly instances: readonly string[];
}

export interface OccurrenceLink {
  readonly sourceId: string;
  readonly targetId: string;
}

export interface OccurrenceData {
  readonly relationshipId: string;
  readonly relationshipName: string;
  readonly source: OccurrenceEntity;
  readonly target: OccurrenceEntity;
  readonly links: readonly OccurrenceLink[];
}

/**
 * Obtém o prefixo de nomeação baseado na entidade (ex: "Usuario" -> "U").
 */
function getPrefix(name: string): string {
  return name.charAt(0).toUpperCase() || 'E';
}

/**
 * Gera instâncias fictícias para a entidade fornecida.
 */
function generateInstances(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);
}

/**
 * Gera os dados do diagrama de ocorrências baseado na projeção do diagrama ER.
 * Para cada relacionamento binário, cria instâncias mockadas e seus vínculos (links)
 * respeitando as cardinalidades min e max dos participantes.
 *
 * @param diagram O diagrama de entidade-relacionamento projetado.
 * @returns Lista de ocorrências geradas para os relacionamentos.
 */
export function generateOccurrenceData(diagram: DiagramProjection): OccurrenceData[] {
  const result: OccurrenceData[] = [];

  for (const rel of diagram.relationships) {
    if (rel.participants.length !== 2) {
      continue;
    }

    const [sourceParticipant, targetParticipant] = rel.participants;
    if (!sourceParticipant || !targetParticipant) {
      continue;
    }

    // Cria 3 a 4 instâncias para origem e destino
    const sourceCount = Math.floor(Math.random() * 2) + 3;
    const targetCount = Math.floor(Math.random() * 2) + 3;

    const sourcePrefix = getPrefix(sourceParticipant.entityName);
    const targetPrefix = sourceParticipant.entityName === targetParticipant.entityName
      ? `${sourcePrefix}'`
      : getPrefix(targetParticipant.entityName);

    const sourceInstances = generateInstances(sourcePrefix, sourceCount);
    const targetInstances = generateInstances(targetPrefix, targetCount);

    const links: OccurrenceLink[] = [];
    let currentTargetIndex = 0;

    // Conectar Origem -> Destino
    for (let i = 0; i < sourceInstances.length; i++) {
      const src = sourceInstances[i];

      // Se a cardinalidade mínima de destino for 0, permite deixar o último elemento de origem sem vínculos
      if (targetParticipant.min === 0 && i === sourceInstances.length - 1) {
        continue;
      }

      // Define a quantidade de ligações que esta instância de origem precisa fazer.
      // Se targetParticipant.max for '*', tentamos vincular a mais de um (ex: 2).
      const linksToCreate = targetParticipant.max === '*' ? 2 : (targetParticipant.max as number);

      for (let l = 0; l < linksToCreate; l++) {
        let tgt = targetInstances[currentTargetIndex % targetInstances.length];
        let tgtLinks = links.filter((lk) => lk.targetId === tgt).length;
        const maxTgt = sourceParticipant.max === '*' ? Infinity : (sourceParticipant.max as number);

        let attempts = 0;
        // Busca um destino que não tenha atingido seu limite e não tenha ligação com essa origem
        while (
          (tgtLinks >= maxTgt || links.some((lk) => lk.sourceId === src && lk.targetId === tgt)) &&
          attempts < targetInstances.length
        ) {
          currentTargetIndex++;
          tgt = targetInstances[currentTargetIndex % targetInstances.length];
          tgtLinks = links.filter((lk) => lk.targetId === tgt).length;
          attempts++;
        }

        if (tgtLinks < maxTgt && !links.some((lk) => lk.sourceId === src && lk.targetId === tgt)) {
          links.push({ sourceId: src, targetId: tgt });

          if (sourceParticipant.max === '*') {
            // Se o destino pode ter várias origens, deixamos ele receber 2 antes de avançar
            if (links.filter((lk) => lk.targetId === tgt).length >= 2) {
              currentTargetIndex++;
            }
          } else {
            // Avança para 1:1 ou outros casos finitos
            currentTargetIndex++;
          }
        }
      }
    }

    // Passagem secundária: Garantir restrição de cardinalidade mínima da origem (para os destinos)
    for (let j = 0; j < targetInstances.length; j++) {
      const tgt = targetInstances[j];
      const tgtLinks = links.filter((lk) => lk.targetId === tgt).length;

      // Se a cardinalidade mínima de origem for 0, permite deixar o último elemento de destino sem vínculos
      if (sourceParticipant.min === 0 && j === targetInstances.length - 1 && tgtLinks === 0) {
        continue;
      }

      const minRequired = sourceParticipant.min;
      let currentLinks = tgtLinks;

      for (let i = 0; currentLinks < minRequired && i < sourceInstances.length; i++) {
        const src = sourceInstances[i];
        const srcLinks = links.filter((lk) => lk.sourceId === src).length;
        const maxSrc = targetParticipant.max === '*' ? Infinity : (targetParticipant.max as number);

        if (!links.some((lk) => lk.sourceId === src && lk.targetId === tgt) && srcLinks < maxSrc) {
          links.push({ sourceId: src, targetId: tgt });
          currentLinks++;
        }
      }
    }

    result.push({
      relationshipId: rel.id,
      relationshipName: rel.name,
      source: {
        id: sourceParticipant.entityId,
        name: sourceParticipant.entityName,
        instances: sourceInstances
      },
      target: {
        id: targetParticipant.entityId,
        name: targetParticipant.entityName,
        instances: targetInstances
      },
      links
    });
  }

  return result;
}
