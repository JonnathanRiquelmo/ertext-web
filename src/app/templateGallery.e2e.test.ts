import { chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';

import { getTemplateDefinition, listTemplateDefinitions } from './templateRegistry';

const SERVER_ORIGIN = 'http://127.0.0.1:4176';
const MODELING_TOOL_URL = `${SERVER_ORIGIN}/`;

let viteServer: ViteDevServer | undefined;

const EXPECTED_TEMPLATE_ENTITY_BY_ID: Readonly<Record<string, string>> = {
  'university-courses': 'Student',
  'social-network': 'User',
  'artificial-intelligence': 'Model',
  'supply-chain-logistics': 'Party'
};

function extractDomainName(dsl: string): string {
  const domainMatch = dsl.match(/Domain\s+([A-Za-z_][A-Za-z0-9_]*)\s*;/u);
  if (!domainMatch) {
    throw new Error('Unable to extract domain name from template DSL.');
  }
  return domainMatch[1];
}

async function launchViteServer(): Promise<void> {
  viteServer = await createServer({
    configFile: false,
    root: process.cwd(),
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 4176,
      strictPort: true
    }
  });
  await viteServer.listen();
}

describe('template gallery end-to-end flow', () => {
  beforeAll(async () => {
    await launchViteServer();
  });

  afterAll(async () => {
    await viteServer?.close();
  });

  it('loads selected template and updates DSL, diagram, and generated outputs', async () => {
    const selectedTemplate = getTemplateDefinition('social-network');
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

    try {
      await page.goto(MODELING_TOOL_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="modeling-tool"]');

      await page.selectOption('#template-selector', selectedTemplate.metadata.id);
      await page.getByRole('button', { name: 'Carregar modelo' }).click();

      await page.waitForFunction(
        (expectedDsl) => {
          const editor = document.querySelector('textarea[aria-label="Editor ERDSL"]');
          return editor instanceof HTMLTextAreaElement && editor.value === expectedDsl;
        },
        selectedTemplate.content.dsl
      );

      const dslEditorValue = await page.locator('textarea[aria-label="Editor ERDSL"]').inputValue();
      expect(dslEditorValue).toBe(selectedTemplate.content.dsl);
      expect(dslEditorValue).toContain('Domain Social_Network;');
      expect(dslEditorValue).not.toContain('Domain University_Courses;');

      const diagramText = await page.locator('[aria-label="Canvas do diagrama"]').innerText();
      expect(diagramText).toContain('User');
      expect(diagramText).toContain('Organization');
      expect(diagramText).not.toContain('Student');

      const outputsText = await page.locator('article.output-panel').innerText();
      expect(outputsText).toContain(`Domain: ${extractDomainName(selectedTemplate.content.dsl)}`);
      expect(outputsText).toContain('CREATE TABLE `user`');
      expect(outputsText).toContain('CREATE TABLE "user"');
      expect(outputsText).not.toContain('"domain": "University_Courses"');
    } finally {
      await browser.close();
    }
  }, 60_000);

  it('keeps DSL, diagram, and outputs synchronized when loading all expanded templates sequentially', async () => {
    const templates = listTemplateDefinitions();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

    try {
      await page.goto(MODELING_TOOL_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="modeling-tool"]');

      let previousDomainName: string | null = null;
      for (const template of templates) {
        const expectedEntity = EXPECTED_TEMPLATE_ENTITY_BY_ID[template.metadata.id];
        expect(expectedEntity).toBeDefined();

        await page.selectOption('#template-selector', template.metadata.id);
        await page.getByRole('button', { name: 'Carregar modelo' }).click();

        await page.waitForFunction(
          (expectedDsl) => {
            const editor = document.querySelector('textarea[aria-label="Editor ERDSL"]');
            return editor instanceof HTMLTextAreaElement && editor.value === expectedDsl;
          },
          template.content.dsl
        );

        const dslEditorValue = await page.locator('textarea[aria-label="Editor ERDSL"]').inputValue();
        expect(dslEditorValue).toBe(template.content.dsl);

        const diagramText = await page.locator('[aria-label="Canvas do diagrama"]').innerText();
        expect(diagramText).toContain(expectedEntity);

        const outputsText = await page.locator('article.output-panel').innerText();
        const currentDomainName = extractDomainName(template.content.dsl);
        expect(outputsText).toContain(`Domain: ${currentDomainName}`);
        expect(outputsText).toContain('CREATE TABLE');
        if (previousDomainName !== null) {
          expect(outputsText).not.toContain(`"domain": "${previousDomainName}"`);
        }

        previousDomainName = currentDomainName;
      }
    } finally {
      await browser.close();
    }
  }, 90_000);
});
