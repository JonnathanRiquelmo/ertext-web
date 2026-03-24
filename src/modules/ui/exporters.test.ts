import { describe, expect, it } from 'vitest';

import { exportDiagramAsPngDataUrl, exportDiagramAsSvg } from './exporters';

describe('diagram exporters', () => {
  it('exports diagram as SVG and PNG data URL', () => {
    const diagram = {
      entities: [
        {
          id: 'entity:customer',
          name: 'Customer',
          attributes: [{ name: 'customerId', dataType: 'UUID', isIdentifier: true }]
        }
      ],
      relationships: [],
      specializations: []
    };
    const svg = exportDiagramAsSvg(diagram);
    const png = exportDiagramAsPngDataUrl(diagram);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(png.startsWith('data:image/png;base64,')).toBe(true);
  });
});
