/**
 * Builds dist/index.js for the Node and Bun runtimes.
 *
 * Two build-time fixes make the bundle load under Node:
 *
 * 1. react-devtools-core is aliased to scripts/stubs/react-devtools-core.ts
 *    rather than marked external. An external import is evaluated at load time
 *    under Node and crashes with "self is not defined".
 *
 * 2. `import.meta.dir` (Bun-only, undefined under Node) is rewritten to
 *    `import.meta.dirname`, which Bun and Node 20.11+ both provide and which
 *    resolves to the same directory (dist/) the bundle sees today.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");

const result = await Bun.build({
  entrypoints: [resolve(root, "src/index.ts")],
  outdir: resolve(root, "dist"),
  target: "node",
  plugins: [
    {
      name: "alias-react-devtools-core",
      setup(build) {
        build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
          path: resolve(root, "scripts/stubs/react-devtools-core.ts"),
        }));
      },
    },
    {
      name: "bun-dir-to-dirname",
      setup(build) {
        build.onLoad({ filter: /\.tsx?$/ }, (args) => {
          const source = readFileSync(args.path, "utf-8");
          if (!/\bimport\.meta\.dir\b/.test(source)) return undefined;
          const contents = source.replace(/\bimport\.meta\.dir\b/g, "import.meta.dirname");
          return { contents, loader: args.path.endsWith(".tsx") ? "tsx" : "ts" };
        });
      },
    },
  ],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log(`Bundled ${result.outputs.length} output file(s) to dist/`);
