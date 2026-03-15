/**
 * tui-genesis-review.ts — Genesis plan review view for the wombo-combo TUI.
 *
 * Shows proposed quests from the genesis planner agent, allowing the user
 * to accept, reject, edit, reorder, and approve the genesis plan.
 *
 * Layout:
 *   +-----------------------------------------------------------+
 *   | WOMBO-COMBO Genesis Review  | 6 quests                    |
 *   +---------------------------+-------------------------------+
 *   |   1. auth-system    HIGH  | Title: Authentication System   |
 *   | > 2. api-layer      MED   | Priority: medium               |
 *   |   3. admin-ui       MED   | Difficulty: hard               |
 *   |   4. deploy-setup   LOW   | HITL: cautious                 |
 *   |   5. [REJECTED]          | Depends: auth-system             |
 *   |                           | Goal:                          |
 *   |                           |   Implement OAuth2...          |
 *   +---------------------------+-------------------------------+
 *   | Space:toggle  E:edit  U/D:move  A:approve  Q:cancel       |
 *   +-----------------------------------------------------------+
 *
 * Keybinds:
 *   Space      — toggle accept/reject for the selected quest
 *   E          — edit selected quest fields (inline modal)
 *   K / Up     — move selected quest up in order
 *   J / Down   — move selected quest down in order
 *   A          — approve plan (create quests from accepted proposals)
 *   V          — view validation issues
 *   R          — toggle all accept/reject
 *   Q / Esc    — cancel and discard plan
 */

import blessed from "neo-blessed";
import type { Widgets } from "neo-blessed";
import type { ProposedQuest, GenesisResult, GenesisValidationIssue } from "./genesis-planner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GenesisReviewAction =
  | { type: "approve"; quests: ProposedQuest[]; knowledge: string | null }
  | { type: "cancel" };

export interface GenesisReviewOptions {
  /** The genesis planner result to review */
  genesisResult: GenesisResult;
  /** Called when user approves the plan */
  onApprove: (quests: ProposedQuest[], knowledge: string | null) => void;
  /** Called when user cancels/discards the plan */
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const PRIORITY_ABBREV: Record<string, string> = {
  critical: "CRIT",
  high: "HIGH",
  medium: "MED ",
  low: "LOW ",
  wishlist: "WISH",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "red",
  high: "yellow",
  medium: "white",
  low: "gray",
  wishlist: "gray",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  trivial: "gray",
  easy: "green",
  medium: "white",
  hard: "yellow",
  very_hard: "red",
};

const HITL_COLORS: Record<string, string> = {
  yolo: "green",
  cautious: "yellow",
  supervised: "red",
};

function escapeBlessedTags(text: string): string {
  return text.replace(/\{/g, "\uFF5B").replace(/\}/g, "\uFF5D");
}

// ---------------------------------------------------------------------------
// Internal quest wrapper with accept/reject state
// ---------------------------------------------------------------------------

interface ReviewQuest {
  quest: ProposedQuest;
  accepted: boolean;
}

// ---------------------------------------------------------------------------
// GenesisReview Class
// ---------------------------------------------------------------------------

export class GenesisReview {
  private screen: Widgets.Screen;
  private headerBox: Widgets.BoxElement;
  private questList: Widgets.ListElement;
  private detailBox: Widgets.BoxElement;
  private statusBar: Widgets.BoxElement;

  private genesisResult: GenesisResult;
  private onApprove: (quests: ProposedQuest[], knowledge: string | null) => void;
  private onCancel: () => void;

  private items: ReviewQuest[] = [];
  private selectedIndex: number = 0;

  /** Whether a modal is currently showing (blocks other key handlers) */
  private modalOpen = false;

  constructor(opts: GenesisReviewOptions) {
    this.genesisResult = opts.genesisResult;
    this.onApprove = opts.onApprove;
    this.onCancel = opts.onCancel;

    // Initialize review items — all accepted by default
    this.items = opts.genesisResult.quests.map((quest) => ({
      quest: { ...quest },
      accepted: true,
    }));

    // Create screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: "wombo-combo -- Genesis Review",
      fullUnicode: true,
    });

    // Header
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: "100%",
      height: 3,
      tags: true,
      style: { fg: "white", bg: "black" },
    });

    // Quest list (left pane)
    this.questList = blessed.list({
      top: 3,
      left: 0,
      width: "50%",
      height: "100%-6",
      tags: true,
      scrollable: true,
      mouse: true,
      keys: true,
      vi: true,
      border: { type: "line" },
      style: {
        border: { fg: "gray" },
        selected: { bg: "blue", fg: "white", bold: true },
        item: { fg: "white" },
      },
      label: " Proposed Quests ",
    });

    // Detail pane (right pane)
    this.detailBox = blessed.box({
      top: 3,
      left: "50%",
      width: "50%",
      height: "100%-6",
      tags: true,
      scrollable: true,
      mouse: true,
      border: { type: "line" },
      style: {
        border: { fg: "gray" },
        fg: "white",
      },
      label: " Details ",
    });

    // Status bar
    this.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: "100%",
      height: 3,
      tags: true,
      style: { fg: "white", bg: "black" },
    });

    // Assemble
    this.screen.append(this.headerBox);
    this.screen.append(this.questList);
    this.screen.append(this.detailBox);
    this.screen.append(this.statusBar);
    this.questList.focus();

    this.bindKeys();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  start(): void {
    this.refreshAll();
    this.screen.render();
  }

  stop(): void {
    this.screen.destroy();
  }

  destroy(): void {
    this.screen.destroy();
    process.stdout.write("\x1B[2J\x1B[H");
  }

  // -----------------------------------------------------------------------
  // Key Bindings
  // -----------------------------------------------------------------------

  private bindKeys(): void {
    // Navigate
    this.questList.on("select item", (_item: any, index: number) => {
      this.selectedIndex = index;
      this.refreshDetail();
      this.screen.render();
    });

    // Cancel / Back
    this.screen.key(["q", "escape", "C-c"], () => {
      if (this.modalOpen) return;
      this.destroy();
      this.onCancel();
    });

    // Space — toggle accept/reject
    this.screen.key(["space"], () => {
      if (this.modalOpen) return;
      this.toggleAccept();
    });

    // E — edit selected quest
    this.screen.key(["e"], () => {
      if (this.modalOpen) return;
      this.showEditModal();
    });

    // Shift+K — move quest up in order
    this.screen.key(["S-k"], () => {
      if (this.modalOpen) return;
      this.moveQuest(-1);
    });

    // Shift+J — move quest down in order
    this.screen.key(["S-j"], () => {
      if (this.modalOpen) return;
      this.moveQuest(1);
    });

    // A — approve plan
    this.screen.key(["a"], () => {
      if (this.modalOpen) return;
      this.approvePlan();
    });

    // V — view validation issues
    this.screen.key(["v"], () => {
      if (this.modalOpen) return;
      this.showValidationIssues();
    });

    // R — reject all / accept all toggle
    this.screen.key(["r"], () => {
      if (this.modalOpen) return;
      this.toggleAll();
    });
  }

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  private toggleAccept(): void {
    const item = this.items[this.selectedIndex];
    if (!item) return;
    item.accepted = !item.accepted;
    this.refreshList();
    this.refreshDetail();
    this.refreshHeader();
    this.screen.render();
  }

  private toggleAll(): void {
    const allAccepted = this.items.every((i) => i.accepted);
    for (const item of this.items) {
      item.accepted = !allAccepted;
    }
    this.refreshAll();
    this.screen.render();
  }

  private moveQuest(direction: -1 | 1): void {
    const idx = this.selectedIndex;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= this.items.length) return;

    // Swap
    const temp = this.items[idx];
    this.items[idx] = this.items[newIdx];
    this.items[newIdx] = temp;

    this.selectedIndex = newIdx;
    this.refreshList();
    this.refreshDetail();
    this.questList.select(newIdx);
    this.screen.render();
  }

  private approvePlan(): void {
    const accepted = this.items.filter((i) => i.accepted).map((i) => i.quest);

    if (accepted.length === 0) {
      this.showMessagePopup(
        "No Quests Accepted",
        "You must accept at least one quest before approving the plan.\n\n" +
        "Use {bold}Space{/bold} to toggle quests, or {bold}R{/bold} to accept all.",
        "yellow"
      );
      return;
    }

    // Re-validate: check if accepted quests have valid dependencies
    const acceptedIds = new Set(accepted.map((q) => q.id));
    const brokenDeps: string[] = [];
    for (const quest of accepted) {
      for (const dep of quest.depends_on) {
        if (!acceptedIds.has(dep)) {
          brokenDeps.push(`"${quest.id}" depends on rejected quest "${dep}"`);
        }
      }
    }

    if (brokenDeps.length > 0) {
      this.showMessagePopup(
        "Broken Dependencies",
        "The following accepted quests depend on rejected quests:\n\n" +
        brokenDeps.map((b) => `  - ${b}`).join("\n") +
        "\n\nEither accept the dependencies or remove the depends_on references " +
        "by editing the quests (E key).",
        "red"
      );
      return;
    }

    // Confirm
    this.showConfirmPopup(
      "Approve Genesis Plan",
      `Create ${accepted.length} quest${accepted.length !== 1 ? "s" : ""}?\n\n` +
      "This will:\n" +
      "  - Create quest files in the quest store\n" +
      "  - Set all quests to 'draft' status\n" +
      "  - Save any genesis knowledge\n\n" +
      "You can then activate and plan each quest individually.",
      () => {
        this.destroy();
        this.onApprove(accepted, this.genesisResult.knowledge);
      }
    );
  }

  // -----------------------------------------------------------------------
  // Edit Modal
  // -----------------------------------------------------------------------

  private showEditModal(): void {
    const item = this.items[this.selectedIndex];
    if (!item) return;
    this.modalOpen = true;

    const quest = item.quest;

    type EditField = "title" | "priority" | "difficulty" | "hitl_mode" | "depends_on" | "goal";
    const fields: EditField[] = ["title", "priority", "difficulty", "hitl_mode", "depends_on", "goal"];
    let fieldIdx = 0;

    const modal = blessed.box({
      parent: this.screen,
      top: "center",
      left: "center",
      width: "70%",
      height: "80%",
      tags: true,
      border: { type: "line" },
      style: {
        border: { fg: "magenta" },
        fg: "white",
        bg: "black",
      },
      label: ` {magenta-fg}Edit: ${escapeBlessedTags(quest.id)}{/magenta-fg} `,
      shadow: true,
    });

    const content = blessed.box({
      parent: modal,
      top: 0,
      left: 1,
      right: 1,
      height: 3,
      tags: true,
      style: { fg: "white", bg: "black" },
    });

    const textbox = blessed.textbox({
      parent: modal,
      top: 3,
      left: 1,
      right: 1,
      height: 3,
      border: { type: "line" },
      style: {
        border: { fg: "cyan" },
        fg: "white",
        bg: "black",
        focus: { border: { fg: "magenta" } },
      },
      inputOnFocus: true,
    });

    const textarea = blessed.textarea({
      parent: modal,
      top: 3,
      left: 1,
      right: 1,
      height: 10,
      border: { type: "line" },
      style: {
        border: { fg: "cyan" },
        fg: "white",
        bg: "black",
        focus: { border: { fg: "magenta" } },
      },
      inputOnFocus: true,
      hidden: true,
    });

    const selectList = blessed.list({
      parent: modal,
      top: 3,
      left: 1,
      right: 1,
      height: "100%-8",
      tags: true,
      keys: true,
      vi: true,
      border: { type: "line" },
      style: {
        border: { fg: "cyan" },
        selected: { bg: "blue", fg: "white", bold: true },
        item: { fg: "white" },
        bg: "black",
      },
      hidden: true,
    });

    const statusLine = blessed.box({
      parent: modal,
      bottom: 0,
      left: 1,
      right: 1,
      height: 1,
      tags: true,
      style: { fg: "gray", bg: "black" },
    });

    const cleanup = () => {
      modal.destroy();
      this.modalOpen = false;
      this.refreshAll();
      this.questList.focus();
      this.screen.render();
    };

    const PRIORITIES = ["critical", "high", "medium", "low", "wishlist"];
    const DIFFICULTIES = ["trivial", "easy", "medium", "hard", "very_hard"];
    const HITL_MODES = ["yolo", "cautious", "supervised"];

    const showField = (field: EditField) => {
      textbox.hide();
      textarea.hide();
      selectList.hide();

      const stepLabel = `Field ${fieldIdx + 1}/${fields.length}`;

      switch (field) {
        case "title":
          content.setContent(
            `{bold}${stepLabel} \u2014 Title{/bold}\n` +
            `{gray-fg}Current: ${escapeBlessedTags(quest.title)}{/gray-fg}\n` +
            `{gray-fg}Enter to save, Esc to skip{/gray-fg}`
          );
          statusLine.setContent(`{gray-fg}Edit quest title{/gray-fg}`);
          textbox.setValue(quest.title);
          textbox.show();
          textbox.focus();
          break;

        case "priority":
          content.setContent(
            `{bold}${stepLabel} \u2014 Priority{/bold}\n` +
            `{gray-fg}Current: ${quest.priority}{/gray-fg}\n` +
            `{gray-fg}Enter to select, Esc to skip{/gray-fg}`
          );
          statusLine.setContent(`{gray-fg}Select priority level{/gray-fg}`);
          selectList.setItems(
            PRIORITIES.map((p) => {
              const dot = PRIORITY_COLORS[p] ?? "white";
              const marker = p === quest.priority ? " {cyan-fg}(current){/cyan-fg}" : "";
              return `  {${dot}-fg}\u25CF{/${dot}-fg}  ${p}${marker}`;
            }) as any
          );
          selectList.select(PRIORITIES.indexOf(quest.priority));
          selectList.show();
          selectList.focus();
          break;

        case "difficulty":
          content.setContent(
            `{bold}${stepLabel} \u2014 Difficulty{/bold}\n` +
            `{gray-fg}Current: ${quest.difficulty}{/gray-fg}\n` +
            `{gray-fg}Enter to select, Esc to skip{/gray-fg}`
          );
          statusLine.setContent(`{gray-fg}Select difficulty level{/gray-fg}`);
          selectList.setItems(
            DIFFICULTIES.map((d) => {
              const marker = d === quest.difficulty ? " {cyan-fg}(current){/cyan-fg}" : "";
              return `  ${d}${marker}`;
            }) as any
          );
          selectList.select(DIFFICULTIES.indexOf(quest.difficulty));
          selectList.show();
          selectList.focus();
          break;

        case "hitl_mode":
          content.setContent(
            `{bold}${stepLabel} \u2014 HITL Mode{/bold}\n` +
            `{gray-fg}Current: ${quest.hitl_mode}{/gray-fg}\n` +
            `{gray-fg}Enter to select, Esc to skip{/gray-fg}`
          );
          statusLine.setContent(`{gray-fg}Select human-in-the-loop mode{/gray-fg}`);
          selectList.setItems(
            HITL_MODES.map((h) => {
              const hColor = HITL_COLORS[h] ?? "white";
              const marker = h === quest.hitl_mode ? " {cyan-fg}(current){/cyan-fg}" : "";
              const desc = h === "yolo" ? "full autonomy"
                : h === "cautious" ? "agent blocks on questions"
                : "agent asks before major decisions";
              return `  {${hColor}-fg}\u25CF{/${hColor}-fg}  ${h} {gray-fg}(${desc})${marker}{/gray-fg}`;
            }) as any
          );
          selectList.select(HITL_MODES.indexOf(quest.hitl_mode));
          selectList.show();
          selectList.focus();
          break;

        case "depends_on":
          content.setContent(
            `{bold}${stepLabel} \u2014 Dependencies{/bold}\n` +
            `{gray-fg}Current: ${quest.depends_on.length > 0 ? quest.depends_on.join(", ") : "(none)"}{/gray-fg}\n` +
            `{gray-fg}Comma-separated quest IDs, Enter to save, Esc to skip{/gray-fg}`
          );
          statusLine.setContent(`{gray-fg}Edit dependency list{/gray-fg}`);
          textbox.setValue(quest.depends_on.join(", "));
          textbox.show();
          textbox.focus();
          break;

        case "goal":
          content.setContent(
            `{bold}${stepLabel} \u2014 Goal{/bold}\n` +
            `{gray-fg}Enter to save, Esc to skip{/gray-fg}`
          );
          statusLine.setContent(`{gray-fg}Edit quest goal (Ctrl+S to submit in textarea){/gray-fg}`);
          textarea.setValue(quest.goal);
          textarea.show();
          textarea.focus();
          break;
      }

      this.screen.render();
    };

    const nextField = () => {
      fieldIdx++;
      if (fieldIdx >= fields.length) {
        cleanup();
        return;
      }
      showField(fields[fieldIdx]);
    };

    // --- Textbox handlers (title, depends_on) ---
    textbox.on("submit", (value: string) => {
      const trimmed = (value ?? "").trim();
      const field = fields[fieldIdx];

      if (field === "title" && trimmed) {
        quest.title = trimmed;
      } else if (field === "depends_on") {
        if (trimmed) {
          quest.depends_on = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
        } else {
          quest.depends_on = [];
        }
      }
      nextField();
    });

    textbox.on("cancel", () => {
      nextField(); // Skip this field
    });

    // --- Textarea handlers (goal) ---
    textarea.key(["enter"], () => {
      const val = (textarea.getValue() ?? "").trim();
      if (val) {
        quest.goal = val;
      }
      nextField();
    });

    textarea.key(["escape"], () => {
      nextField(); // Skip
    });

    // --- Select list handlers (priority, difficulty, hitl_mode) ---
    selectList.key(["enter", "space"], () => {
      const field = fields[fieldIdx];
      const idx = (selectList as any).selected ?? 0;

      if (field === "priority") {
        quest.priority = PRIORITIES[idx] as any;
      } else if (field === "difficulty") {
        quest.difficulty = DIFFICULTIES[idx] as any;
      } else if (field === "hitl_mode") {
        quest.hitl_mode = HITL_MODES[idx] as any;
      }
      nextField();
    });

    selectList.key(["escape"], () => {
      nextField(); // Skip
    });

    // Global escape for the modal itself
    modal.key(["escape"], () => {
      cleanup();
    });

    // Start editing
    showField(fields[0]);
  }

  // -----------------------------------------------------------------------
  // Validation Issues Popup
  // -----------------------------------------------------------------------

  private showValidationIssues(): void {
    const issues = this.genesisResult.issues;
    if (issues.length === 0) {
      this.showMessagePopup(
        "Validation",
        "No validation issues found. The genesis plan looks good!",
        "green"
      );
      return;
    }

    const lines: string[] = [];
    const errors = issues.filter((i) => i.level === "error");
    const warnings = issues.filter((i) => i.level === "warning");

    if (errors.length > 0) {
      lines.push(`{red-fg}{bold}Errors (${errors.length}):{/bold}{/red-fg}`);
      for (const e of errors) {
        const prefix = e.questId ? `[${e.questId}] ` : "";
        lines.push(`  {red-fg}\u2718{/red-fg} ${prefix}${escapeBlessedTags(e.message)}`);
      }
      lines.push("");
    }

    if (warnings.length > 0) {
      lines.push(`{yellow-fg}{bold}Warnings (${warnings.length}):{/bold}{/yellow-fg}`);
      for (const w of warnings) {
        const prefix = w.questId ? `[${w.questId}] ` : "";
        lines.push(`  {yellow-fg}\u26A0{/yellow-fg} ${prefix}${escapeBlessedTags(w.message)}`);
      }
    }

    this.showMessagePopup(
      "Validation Issues",
      lines.join("\n"),
      errors.length > 0 ? "red" : "yellow"
    );
  }

  // -----------------------------------------------------------------------
  // Generic Popups
  // -----------------------------------------------------------------------

  private showMessagePopup(title: string, body: string, borderColor: string): void {
    this.modalOpen = true;

    const popup = blessed.box({
      parent: this.screen,
      top: "center",
      left: "center",
      width: "60%",
      height: "60%",
      tags: true,
      scrollable: true,
      mouse: true,
      border: { type: "line" },
      style: {
        border: { fg: borderColor },
        fg: "white",
        bg: "black",
      },
      label: ` {${borderColor}-fg}${title}{/${borderColor}-fg} `,
      shadow: true,
      content: `\n${body}\n\n{gray-fg}Press Esc or Enter to close{/gray-fg}`,
    });

    popup.focus();

    popup.key(["escape", "enter", "q"], () => {
      popup.destroy();
      this.modalOpen = false;
      this.questList.focus();
      this.screen.render();
    });

    this.screen.render();
  }

  private showConfirmPopup(
    title: string,
    body: string,
    onConfirm: () => void
  ): void {
    this.modalOpen = true;

    const popup = blessed.box({
      parent: this.screen,
      top: "center",
      left: "center",
      width: "60%",
      height: "50%",
      tags: true,
      border: { type: "line" },
      style: {
        border: { fg: "green" },
        fg: "white",
        bg: "black",
      },
      label: ` {green-fg}${title}{/green-fg} `,
      shadow: true,
      content:
        `\n${body}\n\n` +
        `{bold}{green-fg}Y{/green-fg}{/bold} \u2014 Confirm  |  ` +
        `{bold}{red-fg}N{/red-fg}{/bold} / Esc \u2014 Cancel`,
    });

    popup.focus();

    popup.key(["y"], () => {
      popup.destroy();
      this.modalOpen = false;
      onConfirm();
    });

    popup.key(["n", "escape", "q"], () => {
      popup.destroy();
      this.modalOpen = false;
      this.questList.focus();
      this.screen.render();
    });

    this.screen.render();
  }

  // -----------------------------------------------------------------------
  // Refresh Logic
  // -----------------------------------------------------------------------

  private refreshAll(): void {
    this.refreshHeader();
    this.refreshList();
    this.refreshDetail();
    this.refreshStatusBar();
  }

  private refreshHeader(): void {
    const total = this.items.length;
    const accepted = this.items.filter((i) => i.accepted).length;
    const rejected = total - accepted;

    let line1 = ` {bold}wombo-combo{/bold} {magenta-fg}Genesis Review{/magenta-fg}`;
    line1 += `  {gray-fg}|{/gray-fg}  {green-fg}${accepted}{/green-fg} accepted`;
    if (rejected > 0) {
      line1 += `  {red-fg}${rejected}{/red-fg} rejected`;
    }

    const hasErrors = this.genesisResult.issues.some((i) => i.level === "error");
    const warnCount = this.genesisResult.issues.filter((i) => i.level === "warning").length;
    const errCount = this.genesisResult.issues.filter((i) => i.level === "error").length;

    let line2 = ` {gray-fg}Genesis: Project Decomposition{/gray-fg}`;
    if (errCount > 0) {
      line2 += `  {red-fg}${errCount} error${errCount !== 1 ? "s" : ""}{/red-fg}`;
    }
    if (warnCount > 0) {
      line2 += `  {yellow-fg}${warnCount} warning${warnCount !== 1 ? "s" : ""}{/yellow-fg}`;
    }

    this.headerBox.setContent(`${line1}\n${line2}`);
  }

  private refreshList(): void {
    const listItems: string[] = [];

    for (let i = 0; i < this.items.length; i++) {
      const { quest, accepted } = this.items[i];

      const num = `${i + 1}.`.padEnd(4);

      const indicator = accepted
        ? `{green-fg}\u2714{/green-fg}`
        : `{red-fg}\u2718{/red-fg}`;

      const pColor = PRIORITY_COLORS[quest.priority] ?? "white";
      const pAbbr = PRIORITY_ABBREV[quest.priority] ?? quest.priority.slice(0, 4).toUpperCase();
      const prioBadge = `{${pColor}-fg}${pAbbr}{/${pColor}-fg}`;

      const maxIdLen = 24;
      const id = quest.id.length > maxIdLen
        ? quest.id.slice(0, maxIdLen - 1) + "\u2026"
        : quest.id.padEnd(maxIdLen);

      const depIcon = quest.depends_on.length > 0
        ? ` {gray-fg}\u2192${quest.depends_on.length}{/gray-fg}`
        : "";

      const hColor = HITL_COLORS[quest.hitl_mode] ?? "white";
      const hitlBadge = ` {${hColor}-fg}${quest.hitl_mode}{/${hColor}-fg}`;

      if (accepted) {
        listItems.push(` ${indicator} ${num} ${id} ${prioBadge}${hitlBadge}${depIcon}`);
      } else {
        listItems.push(` ${indicator} ${num} {gray-fg}${escapeBlessedTags(quest.id)}{/gray-fg} {red-fg}REJECTED{/red-fg}`);
      }
    }

    if (listItems.length === 0) {
      listItems.push(" {gray-fg}No quests in plan{/gray-fg}");
    }

    const prevSelected = this.selectedIndex;
    this.questList.setItems(listItems as any);
    if (prevSelected < listItems.length) {
      this.questList.select(prevSelected);
    }
  }

  private refreshDetail(): void {
    const item = this.items[this.selectedIndex];
    if (!item) {
      this.detailBox.setContent("{gray-fg}No quest selected{/gray-fg}");
      this.detailBox.setLabel(" Details ");
      return;
    }

    const { quest, accepted } = item;
    const lines: string[] = [];

    // Title
    lines.push(`{bold}{white-fg}${escapeBlessedTags(quest.title)}{/white-fg}{/bold}`);
    lines.push("");

    // Status
    if (accepted) {
      lines.push(`  Status:     {green-fg}ACCEPTED{/green-fg}`);
    } else {
      lines.push(`  Status:     {red-fg}REJECTED{/red-fg}`);
    }

    // Priority
    const pColor = PRIORITY_COLORS[quest.priority] ?? "white";
    lines.push(`  Priority:   {${pColor}-fg}${quest.priority}{/${pColor}-fg}`);

    // Difficulty
    const dColor = DIFFICULTY_COLORS[quest.difficulty] ?? "white";
    lines.push(`  Difficulty: {${dColor}-fg}${quest.difficulty}{/${dColor}-fg}`);

    // HITL mode
    const hColor = HITL_COLORS[quest.hitl_mode] ?? "white";
    lines.push(`  HITL Mode:  {${hColor}-fg}${quest.hitl_mode}{/${hColor}-fg}`);

    lines.push("");

    // Dependencies
    if (quest.depends_on.length > 0) {
      lines.push("{bold}Depends on:{/bold}");
      for (const dep of quest.depends_on) {
        const depItem = this.items.find((i) => i.quest.id === dep);
        if (depItem) {
          const icon = depItem.accepted ? "{green-fg}\u2714{/green-fg}" : "{red-fg}\u2718{/red-fg}";
          lines.push(`  ${icon} ${dep}`);
        } else {
          lines.push(`  {yellow-fg}?{/yellow-fg} ${dep} {gray-fg}(unknown){/gray-fg}`);
        }
      }
      lines.push("");
    }

    // Goal
    if (quest.goal) {
      lines.push("{bold}Goal:{/bold}");
      const goalText = escapeBlessedTags(quest.goal.trim());
      const words = goalText.split(/\s+/);
      let line = " ";
      for (const w of words) {
        if (line.length + w.length > 42) {
          lines.push(line);
          line = " " + w;
        } else {
          line += " " + w;
        }
      }
      if (line.trim()) lines.push(line);
      lines.push("");
    }

    // Constraints
    if (quest.constraints.add.length > 0) {
      lines.push("{bold}Constraints:{/bold}");
      for (const c of quest.constraints.add) {
        lines.push(`  + ${escapeBlessedTags(c)}`);
      }
      lines.push("");
    }

    // Banned
    if (quest.constraints.ban.length > 0) {
      lines.push("{bold}Forbidden:{/bold}");
      for (const f of quest.constraints.ban) {
        lines.push(`  - ${escapeBlessedTags(f)}`);
      }
      lines.push("");
    }

    // Notes
    if (quest.notes.length > 0) {
      lines.push("{bold}Notes:{/bold}");
      for (const n of quest.notes) {
        lines.push(`  ${escapeBlessedTags(n)}`);
      }
      lines.push("");
    }

    // Validation issues for this quest
    const questIssues = this.genesisResult.issues.filter(
      (i) => i.questId === quest.id
    );
    if (questIssues.length > 0) {
      lines.push("{bold}Validation Issues:{/bold}");
      for (const issue of questIssues) {
        const icon = issue.level === "error"
          ? "{red-fg}\u2718{/red-fg}"
          : "{yellow-fg}\u26A0{/yellow-fg}";
        lines.push(`  ${icon} ${escapeBlessedTags(issue.message)}`);
      }
    }

    this.detailBox.setContent(lines.join("\n"));
    this.detailBox.setLabel(` ${quest.id} `);
  }

  private refreshStatusBar(): void {
    let line1 = ` {bold}Keys:{/bold}`;
    line1 += `  {gray-fg}Space{/gray-fg} toggle`;
    line1 += `  {gray-fg}E{/gray-fg} edit`;
    line1 += `  {gray-fg}Shift+J/K{/gray-fg} reorder`;
    line1 += `  {gray-fg}R{/gray-fg} toggle all`;
    line1 += `  {gray-fg}V{/gray-fg} validation`;
    line1 += `  {gray-fg}A{/gray-fg} approve`;
    line1 += `  {gray-fg}Q{/gray-fg} cancel`;

    const accepted = this.items.filter((i) => i.accepted).length;
    let line2 = ` {gray-fg}${accepted} quest${accepted !== 1 ? "s" : ""} will be created on approval{/gray-fg}`;

    const hasErrors = this.genesisResult.issues.some((i) => i.level === "error");
    if (hasErrors) {
      line2 += `  {red-fg}| Plan has validation errors \u2014 review with V{/red-fg}`;
    }

    this.statusBar.setContent(`${line1}\n${line2}`);
  }
}
