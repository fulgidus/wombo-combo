/**
 * tui-question-popup.ts — Modal overlay for answering agent HITL questions.
 *
 * Shows a queue of pending questions from agents. The human can navigate
 * between questions (when multiple agents are waiting) and type an answer.
 *
 * Layout:
 *   +----------------------------------------------+
 *   | ? HITL Questions (2 pending)                  |
 *   +----------------------------------------------+
 *   | Agent: my-feature-task                        |
 *   | Asked: 2 minutes ago                          |
 *   +----------------------------------------------+
 *   | Question:                                     |
 *   | How should I handle the edge case where the   |
 *   | user provides an empty array?                 |
 *   |                                               |
 *   | Context:                                      |
 *   | Working on input validation in parser.ts      |
 *   +----------------------------------------------+
 *   | Your answer:                                  |
 *   | [____________________________________]        |
 *   +----------------------------------------------+
 *   | Enter submit | Tab next | S-Tab prev | Esc    |
 *   +----------------------------------------------+
 */

import blessed from "neo-blessed";
import type { Widgets } from "neo-blessed";
import type { HitlQuestion } from "./hitl-channel.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestionPopupCallbacks {
  /** Called when the user submits an answer to a question. */
  onAnswer: (agentId: string, questionId: string, answerText: string) => void;
  /** Called when the popup is closed (Esc). */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeBlessedTags(text: string): string {
  return text.replace(/\{/g, "\uFF5B").replace(/\}/g, "\uFF5D");
}

function timeAgo(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

// ---------------------------------------------------------------------------
// QuestionPopup
// ---------------------------------------------------------------------------

export class QuestionPopup {
  private modal: Widgets.BoxElement;
  private headerBox: Widgets.BoxElement;
  private questionBox: Widgets.BoxElement;
  private answerLabel: Widgets.BoxElement;
  private answerInput: Widgets.TextareaElement;
  private footerBox: Widgets.BoxElement;

  private screen: Widgets.Screen;
  private questions: HitlQuestion[];
  private currentIndex: number = 0;
  private callbacks: QuestionPopupCallbacks;
  private destroyed: boolean = false;

  constructor(
    screen: Widgets.Screen,
    questions: HitlQuestion[],
    callbacks: QuestionPopupCallbacks
  ) {
    this.screen = screen;
    this.questions = questions;
    this.callbacks = callbacks;

    // --- Modal container ---
    this.modal = blessed.box({
      parent: screen,
      top: "center",
      left: "center",
      width: "75%",
      height: "80%",
      tags: true,
      border: { type: "line" },
      style: {
        border: { fg: "yellow" },
        fg: "white",
        bg: "black",
      },
      label: this.buildLabel(),
      shadow: true,
    });

    // --- Header: agent info ---
    this.headerBox = blessed.box({
      parent: this.modal,
      top: 0,
      left: 1,
      right: 1,
      height: 2,
      tags: true,
      style: { fg: "white", bg: "black" },
    });

    // --- Question display area ---
    this.questionBox = blessed.box({
      parent: this.modal,
      top: 3,
      left: 1,
      right: 1,
      height: "100%-12",
      tags: true,
      scrollable: true,
      mouse: true,
      scrollbar: {
        ch: "\u2502",
        style: { fg: "yellow" },
      },
      style: {
        fg: "white",
        bg: "black",
      },
    });

    // --- Answer label ---
    this.answerLabel = blessed.box({
      parent: this.modal,
      bottom: 4,
      left: 1,
      right: 1,
      height: 1,
      tags: true,
      style: { fg: "yellow", bg: "black" },
      content: " {bold}Your answer:{/bold}",
    });

    // --- Answer text input ---
    this.answerInput = blessed.textarea({
      parent: this.modal,
      bottom: 2,
      left: 1,
      right: 1,
      height: 3,
      border: { type: "line" },
      style: {
        border: { fg: "cyan" },
        fg: "white",
        bg: "black",
        focus: { border: { fg: "yellow" } },
      },
      inputOnFocus: true,
      mouse: true,
      keys: true,
    });

    // --- Footer: keybind hints ---
    this.footerBox = blessed.box({
      parent: this.modal,
      bottom: 0,
      left: 1,
      right: 1,
      height: 1,
      tags: true,
      style: { fg: "gray", bg: "black" },
    });

    this.refreshContent();
    this.bindKeys();
    this.answerInput.focus();
    this.screen.render();
  }

  // -------------------------------------------------------------------------
  // Key Bindings
  // -------------------------------------------------------------------------

  private bindKeys(): void {
    // Submit answer on C-s (Ctrl+S) — we can't intercept bare Enter inside
    // a textarea (blessed uses it for newlines), so Ctrl+S is the submit key.
    this.answerInput.key(["C-s"], () => {
      this.submitCurrentAnswer();
    });

    // Also support Escape from the textarea to close
    this.answerInput.key(["escape"], () => {
      this.close();
    });

    // Tab — next question
    this.answerInput.key(["tab"], () => {
      if (this.questions.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.questions.length;
        this.refreshContent();
        this.screen.render();
      }
    });

    // S-tab — previous question
    this.answerInput.key(["S-tab"], () => {
      if (this.questions.length > 1) {
        this.currentIndex =
          (this.currentIndex - 1 + this.questions.length) %
          this.questions.length;
        this.refreshContent();
        this.screen.render();
      }
    });

    // Escape on modal itself (if focus is somehow elsewhere)
    this.modal.key(["escape"], () => {
      this.close();
    });
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private buildLabel(): string {
    const count = this.questions.length;
    return ` {yellow-fg}? HITL Questions{/yellow-fg} (${count} pending) `;
  }

  private refreshContent(): void {
    if (this.questions.length === 0) {
      this.headerBox.setContent(
        "{gray-fg}No pending questions.{/gray-fg}"
      );
      this.questionBox.setContent("");
      this.footerBox.setContent(" {gray-fg}Esc{/gray-fg} close");
      return;
    }

    const q = this.questions[this.currentIndex];

    // Header: agent info + timestamp
    const agentLine = `{bold}Agent:{/bold} {cyan-fg}${escapeBlessedTags(q.agentId)}{/cyan-fg}`;
    const timeLine = `{bold}Asked:{/bold} {gray-fg}${timeAgo(q.timestamp)}{/gray-fg}`;
    this.headerBox.setContent(`${agentLine}    ${timeLine}`);

    // Question body
    let body = `{bold}{yellow-fg}Question:{/yellow-fg}{/bold}\n`;
    body += escapeBlessedTags(q.text);

    if (q.context) {
      body += `\n\n{bold}{gray-fg}Context:{/gray-fg}{/bold}\n`;
      body += `{gray-fg}${escapeBlessedTags(q.context)}{/gray-fg}`;
    }

    this.questionBox.setContent(body);

    // Footer
    const nav =
      this.questions.length > 1
        ? `{gray-fg}Tab{/gray-fg} next  {gray-fg}S-Tab{/gray-fg} prev  (${this.currentIndex + 1}/${this.questions.length})  `
        : "";
    this.footerBox.setContent(
      ` ${nav}{gray-fg}Ctrl+S{/gray-fg} submit  {gray-fg}Esc{/gray-fg} close`
    );

    // Update label
    this.modal.setLabel(this.buildLabel());

    // Clear answer input
    this.answerInput.clearValue();
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  private submitCurrentAnswer(): void {
    if (this.destroyed) return;
    if (this.questions.length === 0) return;

    const answerText = this.answerInput.getValue().trim();
    if (!answerText) {
      // Flash the border red briefly to indicate empty answer
      this.answerInput.style.border = { fg: "red" } as any;
      this.screen.render();
      setTimeout(() => {
        if (!this.destroyed) {
          this.answerInput.style.border = { fg: "cyan" } as any;
          this.screen.render();
        }
      }, 500);
      return;
    }

    const q = this.questions[this.currentIndex];

    // Fire callback
    this.callbacks.onAnswer(q.agentId, q.id, answerText);

    // Remove this question from the list
    this.questions.splice(this.currentIndex, 1);

    if (this.questions.length === 0) {
      // No more questions — close popup
      this.close();
      return;
    }

    // Adjust index if needed
    if (this.currentIndex >= this.questions.length) {
      this.currentIndex = 0;
    }

    this.refreshContent();
    this.answerInput.focus();
    this.screen.render();
  }

  /**
   * Update the question list (e.g. when new questions arrive while popup is open).
   */
  updateQuestions(questions: HitlQuestion[]): void {
    if (this.destroyed) return;

    // Preserve current question selection if possible
    const currentQ =
      this.questions.length > 0
        ? this.questions[this.currentIndex]
        : null;

    this.questions = questions;

    if (currentQ) {
      // Try to find the same question in the new list
      const idx = questions.findIndex(
        (q) => q.id === currentQ.id && q.agentId === currentQ.agentId
      );
      this.currentIndex = idx >= 0 ? idx : 0;
    } else {
      this.currentIndex = 0;
    }

    this.refreshContent();
    this.modal.setLabel(this.buildLabel());
    this.screen.render();
  }

  /**
   * Close and destroy the popup.
   */
  close(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.modal.destroy();
    this.callbacks.onClose();
    this.screen.render();
  }

  /**
   * Whether the popup has been destroyed.
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }
}
