/**
 * wishlist.ts — Citty command definition for `woco wishlist`.
 *
 * Defines the wishlist parent command with all subcommands using citty's
 * native subCommands support.
 *
 * Subcommands:
 *   add (a)     — Add a wishlist item
 *   list (ls)   — List all wishlist items
 *   move (mv)   — Move a wishlist item to a new position
 *   delete (rm, del, d) — Delete a wishlist item
 */

import { defineCommand } from "citty";
import { resolve } from "node:path";
import { loadConfig, validateConfig, isProjectInitialized, WOMBO_DIR } from "../../config";
import { resolveOutputFormat, output, outputError } from "../../lib/output";
import { msg, t } from "../../lib/i18n";
import {
  addItem as addWishlistItem,
  deleteItem as deleteWishlistItem,
  listItems as listWishlistItems,
  moveItem as moveWishlistItem,
} from "../../lib/wishlist-store";

// ---------------------------------------------------------------------------
// Shared: load config, validate
// ---------------------------------------------------------------------------

function ensureInitialized(projectRoot: string) {
  if (!isProjectInitialized(projectRoot)) {
    console.error(t("cli.common.notInitialized", { dir: WOMBO_DIR }));
    process.exit(1);
  }
  const config = loadConfig(projectRoot);
  validateConfig(config);
  return config;
}

// ---------------------------------------------------------------------------
// Subcommand: add
// ---------------------------------------------------------------------------

const addCommand = defineCommand({
  meta: {
    name: "add",
    description: "Add a wishlist item (also: a)",
  },
  args: {
    text: {
      type: "positional",
      description: "Idea text",
      required: true,
    },
    tag: {
      type: "string",
      description: "Categorization tag (pass multiple times with separate --tag flags)",
      required: false,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output format: text (default), json, or toon",
      required: false,
    },
  },
  async run({ args, rawArgs }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    const fmt = resolveOutputFormat(args.output);

    if (!args.text) {
      outputError(fmt, msg("cli.wishlist.add.usage"));
      return;
    }

    // Collect multiple --tag flags from rawArgs since citty
    // only returns the last value for non-array string types
    const tags: string[] = [];
    for (let i = 0; i < rawArgs.length; i++) {
      if (rawArgs[i] === "--tag" && i + 1 < rawArgs.length) {
        tags.push(rawArgs[i + 1]);
        i++;
      }
    }

    try {
      const item = addWishlistItem(projectRoot, args.text, tags.length > 0 ? tags : undefined);
      output(
        fmt,
        item,
        () => {
          console.log(t("cli.wishlist.add.added", { text: item.text }));
          console.log(t("cli.wishlist.add.id", { id: item.id }));
          if (item.tags.length > 0) {
            console.log(t("cli.wishlist.add.tags", { tags: item.tags.join(", ") }));
          }
        }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      outputError(fmt, msg("cli.wishlist.add.failed", { message }));
    }
  },
});

// ---------------------------------------------------------------------------
// Subcommand: list
// ---------------------------------------------------------------------------

const listCommand = defineCommand({
  meta: {
    name: "list",
    description: "List all wishlist items (also: ls)",
  },
  args: {
    output: {
      type: "string",
      alias: "o",
      description: "Output format: text (default), json, or toon",
      required: false,
    },
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    const fmt = resolveOutputFormat(args.output);

    const items = listWishlistItems(projectRoot);
    output(
      fmt,
      items,
      () => {
        if (items.length === 0) {
          console.log(t("cli.wishlist.list.empty"));
          return;
        }
        console.log(`${t("cli.wishlist.list.heading", { count: items.length })}\n`);
        for (const item of items) {
          const tagStr = item.tags.length > 0 ? ` [${item.tags.join(", ")}]` : "";
          const date = new Date(item.created_at).toLocaleDateString();
          console.log(`  ${item.id.slice(0, 8)}  ${item.text}${tagStr}  (${date})`);
        }
      }
    );
  },
});

// ---------------------------------------------------------------------------
// Subcommand: move
// ---------------------------------------------------------------------------

const moveCommand = defineCommand({
  meta: {
    name: "move",
    description: "Move a wishlist item to a new position (also: mv)",
  },
  args: {
    id: {
      type: "positional",
      description: "Wishlist item ID (or prefix)",
      required: true,
    },
    position: {
      type: "positional",
      description: "Target position (1-indexed)",
      required: true,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output format: text (default), json, or toon",
      required: false,
    },
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    const fmt = resolveOutputFormat(args.output);

    if (!args.id || !args.position) {
      outputError(fmt, msg("cli.wishlist.move.usage"));
      return;
    }

    const newPos = parseInt(args.position, 10);
    if (isNaN(newPos) || newPos < 1) {
      outputError(fmt, msg("cli.wishlist.move.badPosition"));
      return;
    }

    // Support both full UUIDs and short prefixes
    const items = listWishlistItems(projectRoot);
    const match = items.find(
      (item) => item.id === args.id || item.id.startsWith(args.id!)
    );

    if (!match) {
      outputError(fmt, msg("cli.wishlist.noMatch", { id: args.id }));
      return;
    }

    const moved = moveWishlistItem(projectRoot, match.id, newPos);
    if (moved) {
      output(
        fmt,
        { moved: true, id: moved.id, text: moved.text, order: moved.order },
        () => {
          console.log(t("cli.wishlist.move.moved", { text: moved.text, order: moved.order }));
        }
      );
    } else {
      outputError(fmt, msg("cli.wishlist.move.failed", { id: match.id }));
    }
  },
});

// ---------------------------------------------------------------------------
// Subcommand: delete
// ---------------------------------------------------------------------------

const deleteCommand = defineCommand({
  meta: {
    name: "delete",
    description: "Delete a wishlist item (also: rm, del, d)",
  },
  args: {
    id: {
      type: "positional",
      description: "Wishlist item ID (or prefix)",
      required: true,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output format: text (default), json, or toon",
      required: false,
    },
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    const fmt = resolveOutputFormat(args.output);

    if (!args.id) {
      outputError(fmt, msg("cli.wishlist.delete.usage"));
      return;
    }

    // Support both full UUIDs and short prefixes
    const items = listWishlistItems(projectRoot);
    const match = items.find(
      (item) => item.id === args.id || item.id.startsWith(args.id!)
    );

    if (!match) {
      outputError(fmt, msg("cli.wishlist.noMatch", { id: args.id }));
      return;
    }

    const deleted = deleteWishlistItem(projectRoot, match.id);
    if (deleted) {
      output(
        fmt,
        { deleted: true, id: match.id, text: match.text },
        () => {
          console.log(t("cli.wishlist.delete.deleted", { text: match.text }));
        }
      );
    } else {
      outputError(fmt, msg("cli.wishlist.delete.failed", { id: match.id }));
    }
  },
});

// ---------------------------------------------------------------------------
// Parent command: wishlist
// ---------------------------------------------------------------------------

/**
 * Wishlist parent command with all subcommands.
 * Citty handles subcommand routing natively via `subCommands`.
 * Aliases are registered as additional keys in the subCommands map.
 */
export const wishlistCommand = defineCommand({
  meta: {
    name: "wishlist",
    description: "Quick-capture ideas for later (also: w, wl)",
  },
  // NOTE: No run() handler here. Default "list" is injected by the router
  // when no subcommand is given. Having run() here causes citty to execute
  // BOTH the subcommand and this handler, producing double output.
  subCommands: {
    // Canonical names
    add: addCommand,
    list: listCommand,
    move: moveCommand,
    delete: deleteCommand,
    // Aliases
    a: addCommand,
    ls: listCommand,
    mv: moveCommand,
    rm: deleteCommand,
    del: deleteCommand,
    d: deleteCommand,
  },
});
