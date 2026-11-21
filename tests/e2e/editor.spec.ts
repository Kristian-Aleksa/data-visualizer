import { expect, test, type Page } from '@playwright/test';
import { transform } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Three charts, one per family style, tested in depth through the editor and every export. */
const DEEP = ['B01', 'G01', 'N01'];
const PRESETS = ['mono', 'porcelain', 'palm', 'wire'] as const;

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** Run an export function inside the app (Vite serves the TS modules). */
async function inApp<T>(page: Page, fn: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(
    async ([src, a]) => {
      // These paths are served by the Vite dev server inside the browser.
      const paths = ['/src/charts/registry.ts', '/src/core/theme.ts', '/src/export/svg.ts', '/src/export/code.ts', '/src/export/video.ts', '/src/state/share.ts'];
      const [reg, theme, svg, code, video, share] = await Promise.all(paths.map((p) => import(/* @vite-ignore */ p)));
      const f = new Function('ctx', `return (${src})(ctx, ...ctx.args)`);
      return f({ reg, theme, svg, code, video, share, args: a });
    },
    [fn, args] as const,
  ) as Promise<T>;
}

test('gallery lists all 65 charts and recolours with the palette switcher', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.locator('.g-card')).toHaveCount(65);
  const thumb = page.locator('a.g-card').first().locator('svg');
  await expect(thumb).toBeVisible();
  const before = await thumb.innerHTML();
  await page.getByRole('button', { name: 'Wire' }).click();
  await expect.poll(async () => thumb.innerHTML()).not.toBe(before);
  await page.getByRole('button', { name: 'Glance' }).click();
  await expect(page.locator('.g-card')).toHaveCount(20);
  expect(errors).toEqual([]);
});

for (const id of DEEP) {
  test.describe(id, () => {
    test('renders in all four palettes without errors', async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto(`/chart/${id.toLowerCase()}`);
      const svg = page.locator('.artboard svg');
      await expect(svg.locator('text').first()).toBeVisible();
      for (const [i, p] of PRESETS.entries()) {
        await page.keyboard.press(String(i + 1));
        await expect(page.locator(`.pal[aria-pressed="true"]`)).toContainText(p, { ignoreCase: true });
        await expect(svg.locator('text').first()).toBeVisible();
      }
      expect(errors).toEqual([]);
    });

    test('SVG export is clean (final, scrubbed, transparent and outlined)', async ({ page }) => {
      await page.goto('/');
      for (const preset of PRESETS) {
        for (const opts of [
          { frame: 'final', progress: 1, background: 'fill', text: 'editable' },
          { frame: 'current', progress: 0.4, background: 'transparent', text: 'editable' },
          { frame: 'final', progress: 1, background: 'fill', text: 'outlined' },
        ]) {
          const out = await inApp<{ ok: boolean; viewBox: string | null; texts: number; paths: number; markup: string }>(
            page,
            `async ({ reg, theme, svg }, id, preset, opts) => {
              const def = reg.getChart(id);
              const markup = await svg.exportSvg(def, { theme: theme.PRESETS[preset] }, opts);
              const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
              const root = doc.documentElement;
              return { ok: !doc.querySelector('parsererror') && root.tagName === 'svg', viewBox: root.getAttribute('viewBox'),
                texts: doc.querySelectorAll('text').length, paths: doc.querySelectorAll('path').length, markup };
            }`,
            id, preset, opts,
          );
          expect(out.ok).toBe(true);
          expect(out.viewBox).toMatch(/^0 0 \d+ \d+$/);
          expect(out.markup).not.toContain('var(--');
          expect(out.markup).not.toContain('<foreignObject');
          expect(out.markup).not.toMatch(/href="(?!#)/);
          if (opts.text === 'outlined') {
            expect(out.texts).toBe(0);
            expect(out.paths).toBeGreaterThan(5);
          } else expect(out.texts).toBeGreaterThan(3);
        }
      }
    });

    test('standalone HTML export opens by itself and draws the chart', async ({ page, context }) => {
      await page.goto('/');
      const html = await inApp<string>(
        page,
        `async ({ reg, theme, code }, id) => code.htmlPage({ def: reg.getChart(id), data: undefined, settings: { title: 'Exported title' }, theme: theme.PRESETS.palm }, 'embed')`,
        id,
      );
      expect(html.startsWith('<!--')).toBe(true);
      expect(html).toContain('Made with Graphit.');
      expect(html).not.toContain('polyform');
      const file = test.info().outputPath(`${id}.html`);
      writeFileSync(file, html);
      const p2 = await context.newPage();
      const errors = trackErrors(p2);
      await p2.goto(pathToFileURL(file).href);
      await expect.poll(() => p2.evaluate(() => document.querySelector('[data-cs-chart]')?.shadowRoot?.querySelectorAll('svg text').length ?? 0)).toBeGreaterThan(3);
      expect(await p2.evaluate(() => document.querySelector('[data-cs-chart]')!.shadowRoot!.textContent)).toContain('Exported title');
      expect(errors).toEqual([]);
    });

    test('React export is valid TSX and says where it was made', async ({ page }) => {
      await page.goto('/');
      const tsx = await inApp<string>(page, `async ({ reg, theme, code }, id) => code.reactExport({ def: reg.getChart(id), data: undefined, settings: {}, theme: theme.PRESETS.mono }, 'google', 'tsx')`, id);
      expect(tsx.startsWith('// ')).toBe(true);
      expect(tsx).toContain('// Made with Graphit.');
      expect(tsx).not.toContain('polyform');
      const out = await transform(tsx, { loader: 'tsx', jsx: 'automatic', format: 'esm' });
      expect(out.code).toContain('GraphitRuntime');
      expect(tsx).toContain("'use client';");
    });

    test('embed page and settings file round-trip', async ({ page, context }) => {
      await page.goto('/');
      const r = await inApp<{ hash: string; json: string; back: { id: string; doc: { settings: Record<string, unknown> } } }>(
        page,
        `async ({ reg, share }, id) => {
          const def = reg.getChart(id);
          const doc = { settings: { title: 'Shared title', animEnabled: false }, themeId: 'porcelain' };
          const json = share.settingsFile(id, def.name, doc, def.defaultData, { ...def.defaultSettings, ...doc.settings });
          return { hash: share.encodeState(id, doc), json, back: share.parseSettingsFile(json) };
        }`,
        id,
      );
      expect(r.json).not.toContain('polyform');
      expect(r.back.id).toBe(id);
      expect(r.back.doc.settings.title).toBe('Shared title');
      const embed = await context.newPage();
      const errors = trackErrors(embed);
      await embed.goto(`/embed/${id.toLowerCase()}#s=${r.hash}`);
      await expect(embed.locator('svg')).toContainText('Shared title');
      expect(errors).toEqual([]);
    });

    test('bad data shows a friendly message instead of crashing', async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto(`/chart/${id.toLowerCase()}`);
      const cell = page.getByLabel('Row 1, Value');
      await cell.fill('lots');
      await expect(page.locator('.notice').first()).toContainText('should be a number');
      for (let r = 2; r <= 4; r++) await page.getByLabel(`Row ${r}, Value`).fill('');
      await expect(page.locator('.artboard svg')).toBeVisible();
      await page.getByRole('button', { name: 'Demo data' }).click();
      await expect(page.getByLabel('Row 1, Value')).not.toHaveValue('lots');
      expect(errors).toEqual([]);
    });

    test('undo/redo and single-key shortcuts', async ({ page }) => {
      await page.goto(`/chart/${id.toLowerCase()}`);
      const title = page.getByLabel('Title', { exact: true });
      const original = await title.inputValue();
      await title.fill('Changed');
      await expect(page.locator('.artboard svg')).toContainText('Changed');
      await page.locator('.stage-view').click({ position: { x: 5, y: 5 } });
      await page.keyboard.press('Control+z');
      await expect(title).toHaveValue(original);
      await page.keyboard.press('Control+Shift+z');
      await expect(title).toHaveValue('Changed');
      await page.keyboard.press('4');
      await expect(page.locator('.pal[aria-pressed="true"]')).toContainText('Wire');
      // typing in a box must not trigger shortcuts
      await title.fill('');
      await title.type('R1');
      await expect(page.locator('.pal[aria-pressed="true"]')).toContainText('Wire');
      await page.getByRole('button', { name: 'Reset to defaults' }).click();
    });
  });
}

test.describe('N01 network interactions', () => {
  const node = (page: Page, i: number) => page.locator(`.artboard svg circle[data-cs-node="${i}"]`);
  const centre = async (page: Page, i: number) => {
    const b = (await node(page, i).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };

  test('hovering a node lights up its neighbours and links', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/chart/n01');
    await expect(node(page, 0)).toBeVisible();
    await page.waitForTimeout(3800); // let the layout settle
    const c = await centre(page, 0);
    await page.mouse.move(c.x, c.y);
    const svg = page.locator('.artboard svg');
    await expect(svg).toHaveClass(/cs-focus/);
    const hot = await page.evaluate(() => {
      const s = document.querySelector('.artboard svg')!;
      return {
        nodes: s.querySelectorAll('circle.cs-node.cs-hot').length,
        links: s.querySelectorAll('.cs-link.cs-hot').length,
        label: s.querySelectorAll('.cs-hover-label.cs-hot').length,
      };
    });
    expect(hot.nodes).toBeGreaterThan(5); // a hub and its services
    expect(hot.links).toBeGreaterThan(4);
    expect(hot.label).toBe(1);
    await page.mouse.move(5, 5);
    await expect(svg).not.toHaveClass(/cs-focus/);
    expect(errors).toEqual([]);
  });

  test('dragging a node saves every position into the data, and Clear brings the physics back', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/chart/n01');
    await expect(node(page, 0)).toBeVisible();
    await expect(page.getByLabel('Row 1, X')).toHaveValue('');
    const clear = page.getByRole('button', { name: 'Clear dragged positions' });
    await expect(clear).toBeDisabled();
    await page.waitForTimeout(3800); // nodes are small and moving until the layout settles
    const c = await centre(page, 3);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    for (let k = 1; k <= 12; k++) await page.mouse.move(c.x + k * 6, c.y + k * 4);
    await page.mouse.up();
    await expect(page.locator('[role="status"]')).toContainText('Positions saved', { timeout: 10_000 });
    await expect(page.getByLabel('Row 1, X')).not.toHaveValue('');
    await expect(page.getByLabel('Row 4, Y')).not.toHaveValue('');
    // the dragged node stays where it was dropped
    const after = await centre(page, 3);
    expect(Math.hypot(after.x - (c.x + 72), after.y - (c.y + 48))).toBeLessThan(6);
    // undo puts the automatic layout back
    await page.keyboard.press('Control+z');
    await expect(page.getByLabel('Row 1, X')).toHaveValue('');
    await page.keyboard.press('Control+Shift+z');
    await expect(page.getByLabel('Row 1, X')).not.toHaveValue('');
    await expect(clear).toBeEnabled();
    await clear.click();
    await expect(page.getByLabel('Row 1, X')).toHaveValue('');
    expect(errors).toEqual([]);
  });

  test('zoom works after clicking into the chart; double-click resets', async ({ page }) => {
    await page.goto('/chart/n01');
    await expect(node(page, 0)).toBeVisible();
    const viewport = page.locator('.artboard svg [data-cs-viewport]');
    const box = (await page.locator('.artboard svg').boundingBox())!;
    const spot = { x: box.x + box.width * 0.08, y: box.y + box.height * 0.5 }; // empty space
    await page.mouse.move(spot.x, spot.y);
    await page.mouse.wheel(0, -300);
    await expect(viewport).not.toHaveAttribute('transform', /.+/); // page scroll, not zoom
    await page.mouse.click(spot.x, spot.y);
    await page.mouse.wheel(0, -300);
    await expect(viewport).toHaveAttribute('transform', /scale\(/);
    await page.mouse.dblclick(spot.x, spot.y);
    await expect(viewport).not.toHaveAttribute('transform', /.+/);
  });
});

test('Aeonik: the font loads, outlines in SVG exports and is embedded in code exports', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/chart/b01');
  await page.getByLabel('Font', { exact: true }).selectOption('Aeonik');
  await expect(page.locator('.artboard svg').first()).toHaveAttribute('font-family', /^'Aeonik'/);
  await expect.poll(() => page.evaluate(() => document.fonts.load('700 16px Aeonik').then((f) => f.length))).toBeGreaterThan(0);
  const out = await inApp<{ texts: number; paths: number; google: boolean; embedded: boolean }>(
    page,
    `async ({ reg, theme, svg, code }, id) => {
      const def = reg.getChart(id);
      const input = { theme: theme.PRESETS.mono, settings: { fontFamily: 'Aeonik' } };
      const markup = await svg.exportSvg(def, input, { frame: 'final', progress: 1, background: 'fill', text: 'outlined' });
      const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
      const snippet = await code.htmlSnippet({ def, data: undefined, settings: { fontFamily: 'Aeonik' }, theme: theme.PRESETS.mono }, 'google');
      return { texts: doc.querySelectorAll('text').length, paths: doc.querySelectorAll('path').length,
        google: snippet.includes('fonts.googleapis.com'), embedded: snippet.includes("font-family:'Aeonik'") && snippet.includes('addTextFont("Aeonik"') };
    }`,
    'B01',
  );
  expect(out.texts).toBe(0);
  expect(out.paths).toBeGreaterThan(5);
  // Aeonik isn't on Google Fonts: asking for Google embeds the files instead
  expect(out.google).toBe(false);
  expect(out.embedded).toBe(true);
  expect(errors).toEqual([]);
});

test('the open-source fonts load, outline in SVG exports and link to Google Fonts in code exports', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/chart/b01');
  for (const family of ['Roboto', 'Fira Sans', 'Montserrat', 'IBM Plex Serif', 'PT Serif', 'JetBrains Mono', 'Cascadia Mono']) {
    await page.getByLabel('Font', { exact: true }).selectOption(family);
    await expect(page.locator('.artboard svg').first()).toHaveAttribute('font-family', new RegExp(`^'${family}'`));
    await expect.poll(() => page.evaluate((f) => document.fonts.load(`700 16px '${f}'`).then((l) => l.length), family), family).toBeGreaterThan(0);
    const out = await inApp<{ texts: number; paths: number; google: boolean; widths: boolean }>(
      page,
      `async ({ reg, theme, svg, code }, id, family) => {
        const def = reg.getChart(id);
        const input = { theme: theme.PRESETS.mono, settings: { fontFamily: family } };
        const markup = await svg.exportSvg(def, input, { frame: 'final', progress: 1, background: 'fill', text: 'outlined' });
        const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
        const snippet = await code.htmlSnippet({ def, data: undefined, settings: { fontFamily: family }, theme: theme.PRESETS.mono }, 'google');
        return { texts: doc.querySelectorAll('text').length, paths: doc.querySelectorAll('path').length,
          google: snippet.includes('fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+')),
          widths: snippet.includes('addTextFont(' + JSON.stringify(family)) };
      }`,
      'B01',
      family,
    );
    expect(out.texts, family).toBe(0);
    expect(out.paths, family).toBeGreaterThan(5);
    expect(out.google, family).toBe(true);
    expect(out.widths, family).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('video export writes real MP4 and WebM files with the requested settings', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/');
  for (const [id, format, fps, scale] of [['B01', 'mp4', 30, 1], ['G01', 'mp4', 60, 1], ['G01', 'webm', 30, 2]] as const) {
    const r = await inApp<{ probe: { duration: number; width: number; height: number; fps: number; codec: string }; expect: { seconds: number; width: number; height: number } }>(
      page,
      `async ({ reg, theme, video }, id, format, fps, scale) => {
        const def = reg.getChart(id);
        const res = await video.exportVideo(def, { theme: theme.PRESETS.wire }, { scale, fps, duration: 0, hold: 0.5, loops: 1, background: '', format }, () => {});
        const probe = await video.probeVideo(res.blob);
        return { probe, expect: { seconds: res.seconds, width: res.width, height: res.height } };
      }`,
      id, format, fps, scale,
    );
    expect(r.probe.width).toBe(r.expect.width);
    expect(r.probe.height).toBe(r.expect.height);
    expect(Math.abs(r.probe.duration - r.expect.seconds)).toBeLessThan(1.5 / fps);
    expect(Math.abs(r.probe.fps - fps)).toBeLessThan(1);
    expect(r.probe.codec).toBe(format === 'mp4' ? 'avc' : 'vp9');
  }
});
