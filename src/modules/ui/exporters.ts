import type { DiagramProjection } from '../sync';

export interface DiagramExportBundle {
  readonly svg: string;
  readonly pngDataUrl: string;
}

function encodeBase64(value: string): string {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value);
  }
  return Buffer.from(value).toString('base64');
}

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function exportDiagramAsSvg(diagram: DiagramProjection): string {
  const rowHeight = 28;
  const width = 900;
  const height = Math.max(220, 80 + diagram.entities.length * rowHeight + diagram.relationships.length * 36);
  const labels = [
    ...diagram.entities.map((entity, index) => ({
      x: 24,
      y: 48 + index * rowHeight,
      text: `Entity: ${entity.name}`
    })),
    ...diagram.relationships.map((relationship, index) => ({
      x: 420,
      y: 48 + index * 36,
      text: `Relationship: ${relationship.name}`
    }))
  ];

  const labelElements = labels
    .map(
      (label) =>
        `<text x="${label.x}" y="${label.y}" font-size="14" fill="#1f2937">${esc(label.text)}</text>`
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#f8fafc"/><text x="24" y="24" font-size="16" fill="#111827">ERDSL Diagram Export</text>${labelElements}</svg>`;
}

export function exportDiagramAsPngDataUrl(diagram: DiagramProjection): string {
  const svg = exportDiagramAsSvg(diagram);
  const encoded = encodeBase64(svg);
  return `data:image/png;base64,${encoded}`;
}

export function exportDiagramBundle(diagram: DiagramProjection): DiagramExportBundle {
  const svg = exportDiagramAsSvg(diagram);
  return {
    svg,
    pngDataUrl: `data:image/png;base64,${encodeBase64(svg)}`
  };
}
