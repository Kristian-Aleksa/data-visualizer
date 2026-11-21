// Breadth checks over every registered chart (three charts get deeper tests in editor.spec.ts):
// the editor renders in all four palettes, bad data shows a message, and the standalone HTML
// export draws by itself.

import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

interface ChartInfo {
  id: string;
  name: string;
  /** label of the first number column in the first data table, for the bad-data check */
  numberColumn: string | null;
  tables: number;
}

let charts: ChartInfo[] = [];

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('/');
  charts = await page.evaluate(async () => {
    const path = '/src/charts/registry.ts'; // served by the Vite dev server
    const reg = await import(/* @vite-ignore */ path);
    return reg.CHARTS.map((c: { id: string; name: string; dataSchema: { tables: { columns: { type: string; label: string }[] }[] } }) => ({
      id: c.id,
      name: c.name,
      numberColumn: c.dataSchema.tables[0].columns.find((col) => col.type === 'number')?.label ?? null,
      tables: c.dataSchema.tables.length,
    }));
  });
  await page.close();
});

test('the gallery shows a live thumbnail for every chart', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.locator('.g-card')).toHaveCount(charts.length);
  // scroll through so every thumbnail renders
  for (let y = 0; y < 20000; y += 900) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(60);
  }
  await expect.poll(() => page.locator('a.g-card svg text').count()).toBeGreaterThan(charts.length);
  expect(errors).toEqual([]);
});

test('every chart opens in the editor in all four palettes without errors', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = trackErrors(page);
  for (const c of charts) {
    await page.goto(`/chart/${c.id.toLowerCase()}`);
    const svg = page.locator('.artboard svg');
    await expect(svg.locator('text').first(), c.id).toBeVisible();
    for (const [i, name] of ['Mono', 'Porcelain', 'Palm', 'Wire'].entries()) {
      await page.keyboard.press(String(i + 1));
      await expect(page.locator('.pal[aria-pressed="true"]'), c.id).toContainText(name);
    }
    await expect(svg.locator('text').first(), c.id).toBeVisible();
    expect(errors, c.id).toEqual([]);
  }
});

test('typing bad data into any chart shows a message instead of crashing', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = trackErrors(page);
  for (const c of charts.filter((x) => x.numberColumn)) {
    await page.goto(`/chart/${c.id.toLowerCase()}`);
    const cell = page.getByLabel(`Row 1, ${c.numberColumn}`, { exact: true }).first();
    await cell.fill('lots');
    await expect(page.locator('.notice').first(), c.id).toContainText('should be a number');
    await expect(page.locator('.artboard svg'), c.id).toBeVisible();
    await page.getByRole('button', { name: 'Demo data' }).first().click();
    expect(errors, c.id).toEqual([]);
  }
});

test('every chart’s standalone HTML export opens by itself and draws', async ({ page, context }) => {
  test.setTimeout(300_000);
  await page.goto('/');
  for (const c of charts) {
    const html = await page.evaluate(async (id) => {
      const paths = ['/src/charts/registry.ts', '/src/core/theme.ts', '/src/export/code.ts'];
      const [reg, theme, code] = await Promise.all(paths.map((p) => import(/* @vite-ignore */ p)));
      return code.htmlPage({ def: reg.getChart(id), data: undefined, settings: {}, theme: theme.PRESETS.porcelain }, 'none');
    }, c.id);
    expect(html, c.id).toContain('Made with Graphit.');
    expect(html, c.id).not.toMatch(/licen[cs]e|polyform/i);
    const file = test.info().outputPath(`${c.id}.html`);
    writeFileSync(file, html);
    const p2 = await context.newPage();
    const errors = trackErrors(p2);
    await p2.goto(pathToFileURL(file).href);
    await expect.poll(() => p2.evaluate(() => document.querySelector('[data-cs-chart]')?.shadowRoot?.querySelectorAll('svg *').length ?? 0), { message: c.id }).toBeGreaterThan(10);
    expect(errors, c.id).toEqual([]);
    await p2.close();
  }
});
