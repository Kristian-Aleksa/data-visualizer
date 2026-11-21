// Builds one small standalone script per chart (/runtime/<ID>.js) for code exports.
// In dev it bundles on request (always fresh); in production builds it writes them to dist/.

import { build } from 'esbuild';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

const FAMILIES = ['basics', 'glance', 'editorial', 'maps', 'networks', 'extras'];

function chartFiles(root: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const fam of FAMILIES) {
    const dir = join(root, 'src/charts', fam);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const m = /^([A-Z]\d{2})\.ts$/.exec(f);
      if (m) out.set(m[1], join(dir, f));
    }
  }
  return out;
}

export async function bundleRuntime(root: string, chartFile: string): Promise<string> {
  const standalone = resolve(root, 'src/runtime/standalone.ts');
  const entry = [
    `import chart from ${JSON.stringify(chartFile)};`,
    `import { createRuntime } from ${JSON.stringify(standalone)};`,
    `const rt = createRuntime(chart);`,
    `export const id = rt.id;`,
    `export const mount = rt.mount;`,
    `export const mountInto = rt.mountInto;`,
    `export const addTextFont = rt.addTextFont;`,
  ].join('\n');
  const res = await build({
    stdin: { contents: entry, resolveDir: root, loader: 'ts', sourcefile: 'runtime-entry.ts' },
    bundle: true,
    format: 'iife',
    globalName: 'GraphitRuntime',
    minify: true,
    target: 'es2020',
    platform: 'browser',
    legalComments: 'none',
    write: false,
    logLevel: 'silent',
  });
  return res.outputFiles[0].text;
}

export function runtimePlugin(): Plugin {
  let root = process.cwd();
  let outDir = 'dist';
  return {
    name: 'graphit-runtime',
    configResolved(cfg) {
      root = cfg.root;
      outDir = resolve(cfg.root, cfg.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const m = /^\/runtime\/([A-Za-z]\d{2})\.js(?:\?.*)?$/.exec(req.url ?? '');
        if (!m) return next();
        const file = chartFiles(root).get(m[1].toUpperCase());
        if (!file) return next();
        try {
          const code = await bundleRuntime(root, file);
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(code);
        } catch (err) {
          res.statusCode = 500;
          res.end(`/* runtime build failed: ${String(err)} */`);
        }
      });
    },
    async closeBundle() {
      if (!existsSync(outDir)) return;
      const dir = join(outDir, 'runtime');
      mkdirSync(dir, { recursive: true });
      for (const [id, file] of chartFiles(root)) writeFileSync(join(dir, `${id}.js`), await bundleRuntime(root, file));
    },
  };
}
