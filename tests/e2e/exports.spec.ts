// "Paste-ready" checks: exported code must work when pasted into someone else's page or app,
// unchanged. Pages here are deliberately hostile (aggressive global CSS) and charts are pasted
// more than once.

import { expect, test, type Page } from '@playwright/test';
import { transform } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function exportCode(page: Page, kind: 'snippet' | 'react' | 'js' | 'ts', id: string, fonts: 'none' | 'embed' | 'google', extra: Record<string, unknown> = {}): Promise<string> {
  return page.evaluate(
    async ([k, chartId, f, settings]) => {
      const paths = ['/src/charts/registry.ts', '/src/core/theme.ts', '/src/export/code.ts'];
      const [reg, theme, code] = await Promise.all(paths.map((p) => import(/* @vite-ignore */ p)));
      const c = { def: reg.getChart(chartId), data: undefined, settings, theme: theme.PRESETS.porcelain };
      if (k === 'snippet') return code.htmlSnippet(c, f);
      if (k === 'react') return code.reactExport(c, f, 'tsx');
      return code.jsModuleExport(c, f, k === 'ts' ? 'ts' : 'js');
    },
    [kind, id, fonts, extra] as const,
  );
}

/** CSS that tries hard to break anything pasted into the page. */
const HOSTILE_CSS = `
html { font-size: 30px; }
body { font-family: Georgia, serif; text-transform: uppercase; letter-spacing: 4px; word-spacing: 9px; line-height: 3; color: red; fill: red; margin: 40px; }
div { padding: 25px; border: 4px dashed red; background: yellow; }
svg { height: 100px !important; width: 50px; }
svg text, text { fill: red !important; font-size: 40px !important; font-family: Georgia !important; }
svg *, circle, path, line, rect { stroke: red !important; fill: lime !important; opacity: .5 !important; }
* { box-sizing: content-box; transition: all 2s; }
`;

test('HTML snippet works pasted twice into a hostile page, next to other charts', async ({ page, context }) => {
  await page.goto('/');
  const b01 = await exportCode(page, 'snippet', 'B01', 'none', { title: 'First paste' });
  const b01b = await exportCode(page, 'snippet', 'B01', 'none', { title: 'Second paste' });
  const g01 = await exportCode(page, 'snippet', 'G01', 'embed');
  const n01 = await exportCode(page, 'snippet', 'N01', 'none');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${HOSTILE_CSS}</style></head><body>
    <h1>Somebody's website</h1><p>Some text before.</p>${b01}<p>Between.</p>${g01}${b01b}<section>${n01}</section><p>After.</p></body></html>`;
  const file = test.info().outputPath('hostile.html');
  writeFileSync(file, html);
  const p = await context.newPage();
  const errors = trackErrors(p);
  await p.setViewportSize({ width: 1300, height: 900 });
  await p.goto(pathToFileURL(file).href);
  await expect.poll(() => p.evaluate(() => document.querySelectorAll('[data-cs-ready]').length)).toBe(4);
  // Charts below the fold wait on their first frame and play once scrolled into view.
  const marks = () => p.evaluate(() => document.querySelectorAll('[data-cs-chart]')[1].shadowRoot!.querySelectorAll('svg path').length);
  const waiting = await marks();
  for (let i = 0; i < 4; i++) {
    await p.evaluate((n) => document.querySelectorAll('[data-cs-chart]')[n].scrollIntoView({ block: 'center' }), i);
    await p.waitForTimeout(250);
  }
  await p.waitForTimeout(4000); // longest intro (the network settling) is 3.5 s
  expect(await marks()).toBeGreaterThan(waiting);
  await p.screenshot({ path: test.info().outputPath('hostile.png'), fullPage: true });
  const report = await p.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-cs-chart]')].map((host) => {
      const svg = host.shadowRoot!.querySelector('svg')!;
      const text = svg.querySelector('text')!;
      const shape = svg.querySelector('line, circle, path, rect')!;
      const ts = getComputedStyle(text);
      const hs = getComputedStyle(host);
      const box = host.getBoundingClientRect();
      const [, , vw, vh] = svg.getAttribute('viewBox')!.split(' ').map(Number);
      return {
        chart: host.getAttribute('data-cs-chart'),
        elements: svg.querySelectorAll('*').length,
        title: svg.querySelector('text')?.textContent,
        font: ts.fontFamily,
        fontSize: ts.fontSize,
        transform: ts.textTransform,
        textFill: ts.fill,
        shapeStroke: getComputedStyle(shape).stroke,
        shapeOpacity: getComputedStyle(shape).opacity,
        padding: hs.paddingTop,
        border: hs.borderTopWidth,
        ratio: box.width / box.height,
        expected: vw / vh,
      };
    }),
  );
  expect(report.map((r) => r.chart)).toEqual(['b01', 'g01', 'b01', 'n01']);
  expect(report[0].title).toBe('First paste');
  expect(report[2].title).toBe('Second paste');
  for (const r of report) {
    expect(r.elements).toBeGreaterThan(20);
    expect(r.font).toContain('Inter');
    expect(r.transform).toBe('none');
    expect(r.textFill).not.toBe('rgb(255, 0, 0)');
    expect(r.shapeStroke).not.toBe('rgb(255, 0, 0)');
    expect(r.shapeOpacity).not.toBe('0.5');
    expect(r.fontSize).not.toBe('40px');
    expect(r.padding).toBe('0px');
    expect(r.border).toBe('0px');
    expect(Math.abs(r.ratio - r.expected)).toBeLessThan(0.02);
  }
  // embedded fonts arrive without any network access
  expect(await p.evaluate(() => document.fonts.check('700 16px Inter'))).toBe(true);
  // tooltips work through the shadow root
  const target = await p.evaluate(() => {
    const host = document.querySelector('[data-cs-chart="b01"]')!;
    host.scrollIntoView({ block: 'center' });
    const mark = host.shadowRoot!.querySelector('[data-tip]')!;
    const r = mark.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: mark.getAttribute('data-tip')! };
  });
  await p.mouse.move(target.x - 5, target.y);
  await p.mouse.move(target.x, target.y);
  await expect
    .poll(() => p.evaluate(() => [...document.querySelectorAll<HTMLElement>('div[role="tooltip"]')].filter((t) => t.style.opacity === '1').map((t) => t.textContent)))
    .toEqual([target.text]);
  expect(errors).toEqual([]);
});

test('JavaScript module works as a custom element and through mountChart()', async ({ page, context }) => {
  await page.goto('/');
  const mod = await exportCode(page, 'js', 'G01', 'none');
  expect(mod.startsWith('// ')).toBe(true);
  const p = await context.newPage();
  const errors = trackErrors(p);
  await p.route('http://site.test/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/chart.js') return route.fulfill({ contentType: 'text/javascript', body: mod });
    return route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html><head><style>${HOSTILE_CSS}</style></head><body>
        <graphit-g01 id="tag"></graphit-g01>
        <div id="app"></div>
        <script type="module">
          import { mountChart } from './chart.js';
          window.__chart = mountChart(document.getElementById('app'), { settings: { title: 'From mountChart' } });
        </script>
        <script type="module" src="./chart.js"></script>
      </body></html>`,
    });
  });
  await p.goto('http://site.test/index.html');
  await expect.poll(() => p.evaluate(() => document.getElementById('tag')?.shadowRoot?.querySelectorAll('svg path').length ?? 0)).toBeGreaterThan(3);
  await expect.poll(() => p.evaluate(() => document.getElementById('app')?.shadowRoot?.textContent ?? '')).toContain('From mountChart');
  // removing the element cleans up
  await p.evaluate(() => document.getElementById('tag')!.remove());
  await p.evaluate(() => (window as unknown as { __chart: { destroy(): void } }).__chart.destroy());
  expect(await p.evaluate(() => document.getElementById('app')!.shadowRoot!.childNodes.length)).toBe(0);
  expect(errors).toEqual([]);
});

test('React component renders on the server (as in Next.js) without touching the DOM', async ({ page }) => {
  await page.goto('/');
  for (const id of ['B01', 'G01', 'N01']) {
    const tsx = await exportCode(page, 'react', id, 'google');
    const lines = tsx.split('\n');
    const firstCode = lines.find((l) => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('/*'));
    expect(firstCode).toBe("'use client';");
    const js = await transform(tsx, { loader: 'tsx', jsx: 'automatic', format: 'esm' });
    // write next to the project so `react` resolves from node_modules
    const dir = join(process.cwd(), 'test-results', 'ssr');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${id}.mjs`);
    writeFileSync(file, js.code);
    const mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`);
    const { renderToString } = await import('react-dom/server');
    const { createElement } = await import('react');
    const html = renderToString(createElement(mod.default));
    expect(html).toMatch(/^<div role="img" aria-label="[^"]+" style="display:block;max-width:\d+px/);
  }
});

test('TypeScript exports pass a strict type check, used exactly as their comments say', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  const dir = join(process.cwd(), 'test-results', 'strict-ts');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'ForceGraphDenseChart.tsx'), await exportCode(page, 'react', 'N01', 'google'));
  writeFileSync(join(dir, 'g01-chunky-bars.ts'), await exportCode(page, 'ts', 'G01', 'none'));
  writeFileSync(
    join(dir, 'use.tsx'),
    `import ForceGraphDenseChart from './ForceGraphDenseChart';
import { mountChart, type ChartOptions } from './g01-chunky-bars';

// data kept in a variable first (no annotation), as people often do
const myData = { nodes: [{ id: 'a', group: 'x', value: 1, type: 'hub' }, { id: 'b', group: 'x', value: 2 }], links: [{ source: 'a', target: 'b' }] };
export const plain = <ForceGraphDenseChart />;
export const fromVariable = <ForceGraphDenseChart data={myData} />;
export const custom = (
  <ForceGraphDenseChart
    data={{ nodes: [{ id: 'a', group: 'x', value: 1 }], links: [] }}
    settings={{ title: 'Mine', hubSize: 20, hubLabels: false }}
    autoplay={false}
    interactive
    className="c"
    style={{ margin: 0 }}
  />
);
const options: ChartOptions = { settings: { title: 'Mine' }, autoplay: 'visible' };
export const handle = mountChart('#chart', options);
handle.replay();
handle.destroy();
`,
  );
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true, noEmit: true, jsx: 'react-jsx', module: 'esnext', moduleResolution: 'bundler', target: 'es2022', lib: ['es2022', 'dom'],
        types: [], skipLibCheck: true, verbatimModuleSyntax: true, noUnusedLocals: true, noUnusedParameters: true, erasableSyntaxOnly: true,
      },
      include: ['*.ts', '*.tsx'],
    }),
  );
  const tsc = join(process.cwd(), 'node_modules', '.bin', 'tsc');
  let output = '';
  try {
    execFileSync(tsc, ['-p', dir], { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    output = String((e as { stdout?: string }).stdout ?? e);
  }
  expect(output).toBe('');
});

test('dragging a node in a pasted network chart moves that node, not the whole network', async ({ page, context }) => {
  await page.goto('/');
  const n01 = await exportCode(page, 'snippet', 'N01', 'none');
  const file = test.info().outputPath('network.html');
  writeFileSync(file, `<!doctype html><html><body style="margin:0;padding:20px">${n01}</body></html>`);
  const p = await context.newPage();
  const errors = trackErrors(p);
  await p.setViewportSize({ width: 1200, height: 900 });
  await p.goto(pathToFileURL(file).href);
  await p.waitForTimeout(4200); // the layout settles
  const positions = () =>
    p.evaluate(() =>
      [...document.querySelector('[data-cs-chart]')!.shadowRoot!.querySelectorAll('circle[data-cs-node]')].map((c) => {
        const r = c.getBoundingClientRect();
        return [r.x + r.width / 2, r.y + r.height / 2];
      }),
    );
  const before = await positions();
  const [x, y] = before[3];
  await p.mouse.move(x, y);
  await p.mouse.down();
  for (let k = 1; k <= 10; k++) await p.mouse.move(x + k * 6, y + k * 4);
  await p.mouse.up();
  await p.waitForTimeout(2500);
  const after = await positions();
  expect(Math.hypot(after[3][0] - (x + 60), after[3][1] - (y + 40))).toBeLessThan(4);
  const moved = before.map((b, i) => Math.hypot(after[i][0] - b[0], after[i][1] - b[1])).sort((a, b) => a - b);
  expect(moved[Math.floor(moved.length / 2)]).toBeLessThan(20); // most nodes only nudge
  expect(errors).toEqual([]);
});

test('a pasted small force graph follows the pointer while a node is held', async ({ page, context }) => {
  await page.goto('/');
  const g09 = await exportCode(page, 'snippet', 'G09', 'none');
  const file = test.info().outputPath('small-network.html');
  writeFileSync(file, `<!doctype html><html><body style="margin:0;padding:20px">${g09}</body></html>`);
  const p = await context.newPage();
  const errors = trackErrors(p);
  await p.setViewportSize({ width: 1000, height: 700 });
  await p.goto(pathToFileURL(file).href);
  await p.waitForTimeout(4800); // the physics settles in 4 s
  const positions = () =>
    p.evaluate(() =>
      [...document.querySelector('[data-cs-chart]')!.shadowRoot!.querySelectorAll('circle[data-cs-node]')].map((c) => {
        const r = c.getBoundingClientRect();
        return [r.x + r.width / 2, r.y + r.height / 2];
      }),
    );
  const before = await positions();
  const [x, y] = before[5];
  await p.mouse.move(x, y);
  await p.mouse.down();
  for (let k = 1; k <= 10; k++) await p.mouse.move(x - k * 5, y + k * 3);
  await p.waitForTimeout(300);
  const held = await positions();
  expect(Math.hypot(held[5][0] - (x - 50), held[5][1] - (y + 30))).toBeLessThan(4);
  await p.mouse.up();
  await p.waitForTimeout(4500); // let go: the web pushes back, then settles
  const after = await positions();
  const moved = before.map((b, i) => Math.hypot(after[i][0] - b[0], after[i][1] - b[1])).sort((a, b) => a - b);
  expect(moved[Math.floor(moved.length / 2)]).toBeLessThan(25); // the network stays together
  expect(errors).toEqual([]);
});
