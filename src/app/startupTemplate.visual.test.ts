import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';

const EXPECTED_TEMPLATE_PATH = resolve(process.cwd(), '.trae', 'template example.png');
const ACTUAL_TEMPLATE_PATH = resolve(process.cwd(), '.trae', 'visual', 'startup-template.actual.png');
const DIFF_TEMPLATE_PATH = resolve(process.cwd(), '.trae', 'visual', 'startup-template.diff.png');
const MAX_ALLOWED_DIFF_RATIO = 0.05;

let viteServer: ViteDevServer | undefined;

async function launchViteServer(): Promise<string> {
  viteServer = await createServer({
    configFile: false,
    root: process.cwd(),
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 4175,
      strictPort: true
    }
  });
  await viteServer.listen();
  return 'http://127.0.0.1:4175';
}

describe('startup template visual regression', () => {
  let serverOrigin = '';

  beforeAll(async () => {
    serverOrigin = await launchViteServer();
  });

  afterAll(async () => {
    await viteServer?.close();
  });

  it('matches baseline PNG in .trae/template example.png', async () => {
    const expectedImage = PNG.sync.read(readFileSync(EXPECTED_TEMPLATE_PATH));
    const browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: {
        width: expectedImage.width,
        height: expectedImage.height
      }
    });

    await page.goto(`${serverOrigin}/template`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="startup-template"]');

    const actualBuffer = await page.screenshot({
      fullPage: false
    });

    await browser.close();

    const actualImage = PNG.sync.read(actualBuffer);
    expect(actualImage.width).toBe(expectedImage.width);
    expect(actualImage.height).toBe(expectedImage.height);

    const diffImage = new PNG({ width: expectedImage.width, height: expectedImage.height });
    const diffPixels = pixelmatch(
      expectedImage.data,
      actualImage.data,
      diffImage.data,
      expectedImage.width,
      expectedImage.height,
      { threshold: 0.12 }
    );

    mkdirSync(dirname(ACTUAL_TEMPLATE_PATH), { recursive: true });
    writeFileSync(ACTUAL_TEMPLATE_PATH, PNG.sync.write(actualImage));
    writeFileSync(DIFF_TEMPLATE_PATH, PNG.sync.write(diffImage));

    const totalPixels = expectedImage.width * expectedImage.height;
    const diffRatio = diffPixels / totalPixels;

    expect(diffRatio).toBeLessThanOrEqual(MAX_ALLOWED_DIFF_RATIO);
  }, 60_000);
});
