/**
 * completion.ts — Citty command definition for `woco completion`.
 *
 * Wraps the existing cmdCompletion(), installCompletions(), and
 * uninstallCompletions() with citty's defineCommand() for typed args.
 * Config-independent: does not require project initialization.
 *
 * Routes sub-actions:
 *   - `woco completion install`     → installCompletions()
 *   - `woco completion uninstall`   → uninstallCompletions()
 *   - `woco completion bash|zsh|fish` → cmdCompletion({ shell })
 */

import { defineCommand } from "citty";
import { cmdCompletion, installCompletions, uninstallCompletions } from "../completion";

export const completionCommand = defineCommand({
  meta: {
    name: "completion",
    description: "Generate or install shell completion scripts",
  },
  args: {
    shell: {
      type: "positional",
      description: "Shell name (bash, zsh, fish) or action (install, uninstall)",
      required: false,
    },
  },
  async run({ args }) {
    const action = args.shell;

    if (action === "install") {
      installCompletions();
      return;
    }

    if (action === "uninstall") {
      uninstallCompletions();
      return;
    }

    // Generate completion script for the specified shell
    cmdCompletion({ shell: action });
  },
});
