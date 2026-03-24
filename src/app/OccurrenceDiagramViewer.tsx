import type { OccurrenceData } from '../modules/generators';

interface OccurrenceDiagramViewerProps {
  readonly occurrenceData?: OccurrenceData[];
}

export function OccurrenceDiagramViewer({ occurrenceData }: OccurrenceDiagramViewerProps) {
  if (!occurrenceData) {
    return <pre>Não gerado para o alvo atual.</pre>;
  }

  if (occurrenceData.length === 0) {
    return <pre>Nenhum relacionamento encontrado no diagrama atual.</pre>;
  }

  return (
    <div className="occurrence-diagrams-container">
      {occurrenceData.map((rel) => {
        const spacing = 40;
        const paddingTop = 80;
        const paddingBottom = 40;
        
        const maxInstances = Math.max(rel.source.instances.length, rel.target.instances.length);
        const height = maxInstances * spacing + paddingTop + paddingBottom;
        const width = 400;

        const sourceX = 100;
        const targetX = 300;

        const getSourceY = (index: number) => paddingTop + index * spacing;
        const getTargetY = (index: number) => paddingTop + index * spacing;

        const sourceHeight = Math.max(0, rel.source.instances.length - 1) * spacing;
        const sourceRy = Math.max(sourceHeight / 2 + 20, 30);
        const sourceCy = paddingTop + sourceHeight / 2;

        const targetHeight = Math.max(0, rel.target.instances.length - 1) * spacing;
        const targetRy = Math.max(targetHeight / 2 + 20, 30);
        const targetCy = paddingTop + targetHeight / 2;

        return (
          <div key={rel.relationshipId} className="occurrence-diagram-wrapper">
            <h4 className="occurrence-diagram-title">Relacionamento: {rel.relationshipName}</h4>
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="occurrence-diagram-svg">
              {/* Nome do Relacionamento */}
              <text x={width / 2} y={30} textAnchor="middle" className="occurrence-diagram-label">
                {rel.relationshipName}
              </text>
              
              {/* Entidade Origem (Elipse/Container) */}
              <ellipse cx={sourceX} cy={sourceCy} rx={60} ry={sourceRy} className="occurrence-diagram-entity-bg occurrence-diagram-source" />
              <text x={sourceX} y={sourceCy - sourceRy - 10} textAnchor="middle" className="occurrence-diagram-entity-name occurrence-diagram-source-text">
                {rel.source.name}
              </text>
              
              {/* Entidade Destino (Elipse/Container) */}
              <ellipse cx={targetX} cy={targetCy} rx={60} ry={targetRy} className="occurrence-diagram-entity-bg occurrence-diagram-target" />
              <text x={targetX} y={targetCy - targetRy - 10} textAnchor="middle" className="occurrence-diagram-entity-name occurrence-diagram-target-text">
                {rel.target.name}
              </text>

              {/* Ligações (linhas conectando instâncias) */}
              {rel.links.map((link, i) => {
                const srcIndex = rel.source.instances.indexOf(link.sourceId);
                const tgtIndex = rel.target.instances.indexOf(link.targetId);
                
                // Pular caso não encontre o índice
                if (srcIndex === -1 || tgtIndex === -1) return null;
                
                return (
                  <line 
                    key={`${link.sourceId}-${link.targetId}-${i}`}
                    x1={sourceX} y1={getSourceY(srcIndex)} 
                    x2={targetX} y2={getTargetY(tgtIndex)} 
                    className="occurrence-diagram-link"
                  />
                );
              })}

              {/* Instâncias Origem (pontinhos) */}
              {rel.source.instances.map((inst, i) => (
                <g key={inst}>
                  <circle cx={sourceX} cy={getSourceY(i)} r={6} className="occurrence-diagram-instance occurrence-diagram-source-fill" />
                  <text x={sourceX - 15} y={getSourceY(i) + 4} textAnchor="end" className="occurrence-diagram-instance-label">
                    {inst}
                  </text>
                </g>
              ))}

              {/* Instâncias Destino (pontinhos) */}
              {rel.target.instances.map((inst, i) => (
                <g key={inst}>
                  <circle cx={targetX} cy={getTargetY(i)} r={6} className="occurrence-diagram-instance occurrence-diagram-target-fill" />
                  <text x={targetX + 15} y={getTargetY(i) + 4} textAnchor="start" className="occurrence-diagram-instance-label">
                    {inst}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        );
      })}
    </div>
  );
}
