/**
 * version.ts — Citty command definition for `woco version`.
 *
 * This is a proof-of-concept citty command definition that replaces the
 * hand-rolled version handling in index.ts. It demonstrates the pattern
 * for migrating commands to citty.
 */

import { defineCommand } from "citty";
import { dirname, resolve } from "node:path";

/**
 * Read the version string from wombo-combo's package.json.
 *
 * Walks up from this module's directory so it works both from source
 * (src/commands/citty/) and from the bundled dist/index.js.
 */
async function getPackageVersion(): Promise<string> {
  let dir = import.meta.dir;
  while (true) {
    try {
      const pkg = await Bun.file(resolve(dir, "package.json")).json();
      if (pkg.name === "wombo-combo") return pkg.version ?? "(unknown version)";
    } catch {
      // no package.json here — keep walking up
    }
    const parent = dirname(dir);
    if (parent === dir) return "(unknown version)";
    dir = parent;
  }
}

export const versionCommand = defineCommand({
  meta: async () => {
    const version = await getPackageVersion();
    return {
      name: "version",
      version,
      description: "Print version and exit (also: -v, -V)",
    };
  },
  async run() {
    const version = await getPackageVersion();
    console.log(`wombo-combo ${version}`);
  },
});
