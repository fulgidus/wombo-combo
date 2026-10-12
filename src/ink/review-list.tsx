/**
 * review-list.tsx — Shared ReviewList Ink component for genesis and plan review.
 *
 * Renders a split-pane layout with:
 *   - Header: title, subtitle, accepted/rejected counts, issue counts
 *   - Left pane: selectable list of items with accept/reject indicators
 *   - Right pane: detail view for the selected item
 *   - Status bar: keybind hints
 *
 * Supports keyboard navigation:
 *   Space      — toggle accept/reject for the selected item
 *   E          — edit selected item (opens edit modal)
 *   Shift+K/J  — move selected item up/down in order
 *   A          — approve plan (with confirmation)
 *   V          — view validation issues
 *   R          — toggle all accept/reject
 *   Q / Escape — cancel and discard
 *
 * The component is parameterized by ReviewListConfig to support both
 * genesis review (quests) and plan review (tasks).
 */

import React, { useState, useCallback } from "react";
import { Box, Text } from "ink";
import { useTerminalSize } from "./use-terminal-size";
import type {
  ReviewItem,
  ReviewListConfig,
  ReviewValidationIssue,
} from "./review-list-types";
import {
  PRIORITY_ABBREV,
  PRIORITY_COLORS,
  DIFFICULTY_COLORS,
} from "./review-list-types";
import {
  createReviewState,
  toggleAccept,
  toggleAll,
  moveItem,
  selectItem,
  updateItem,
  getAcceptedItems,
  getCounts,
  type ReviewState,
} from "./use-review-list";
import { useScreenInput } from "./esc-menu";
import { useI18n } from "./i18n";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ReviewListProps {
  /** Initial items to display in the review list. */
  items: ReviewItem[];
  /** Configuration for labels, callbacks, and edit fields. */
  config: ReviewListConfig;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Header showing title, subtitle, and counts. */
function ReviewHeader({
  config,
  accepted,
  rejected,
  issues,
}: {
  config: ReviewListConfig;
  accepted: number;
  rejected: number;
  issues: ReviewValidationIssue[];
}): React.ReactElement {
  const t = useI18n();
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  return (
    <Box flexDirection="column" marginBottom={0}>
      <Box>
        <Text bold color="cyan">
          wombo-combo
        </Text>
        <Text> </Text>
        <Text color="magenta" bold>
          {config.title}
        </Text>
        <Text dimColor>  |  </Text>
        <Text color="green">{accepted}</Text>
        <Text> {t("reviewList.accepted")}</Text>
        {rejected > 0 && (
          <>
            <Text>  </Text>
            <Text color="red">{rejected}</Text>
            <Text> {t("reviewList.rejected")}</Text>
          </>
        )}
      </Box>
      <Box>
        {config.subtitle && <Text dimColor>{config.subtitle}</Text>}
        {errors.length > 0 && (
          <>
            <Text>  </Text>
            <Text color="red">
              {errors.length} error{errors.length !== 1 ? "s" : ""}
            </Text>
          </>
        )}
        {warnings.length > 0 && (
          <>
            <Text>  </Text>
            <Text color="yellow">
              {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
            </Text>
          </>
        )}
      </Box>
    </Box>
  );
}

/** A single item row in the list pane. */
function ListItemRow({
  item,
  index,
  isSelected,
}: {
  item: ReviewItem;
  index: number;
  isSelected: boolean;
}): React.ReactElement {
  const t = useI18n();
  const num = `${index + 1}.`.padEnd(4);
  const pColor = PRIORITY_COLORS[item.priority] ?? "white";
  const pAbbr = PRIORITY_ABBREV[item.priority] ?? item.priority.slice(0, 4).toUpperCase();

  const maxIdLen = 24;
  const displayId = item.id.length > maxIdLen
    ? item.id.slice(0, maxIdLen - 1) + "\u2026"
    : item.id.padEnd(maxIdLen);

  if (!item.accepted) {
    return (
      <Box>
        <Text color={isSelected ? "cyan" : undefined}>
          {isSelected ? ">" : " "}
        </Text>
        <Text color="red"> ✘ </Text>
        <Text>{num} </Text>
        <Text dimColor>{item.id}</Text>
        <Text> </Text>
        <Text color="red">{t("reviewList.rejectedBadge")}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color={isSelected ? "cyan" : undefined}>
        {isSelected ? ">" : " "}
      </Text>
      <Text color="green"> ✔ </Text>
      <Text>{num} </Text>
      <Text bold={isSelected}>{displayId}</Text>
      <Text> </Text>
      <Text color={pColor as any}>{pAbbr}</Text>
      {item.dependsOn.length > 0 && (
        <Text dimColor> →{item.dependsOn.length}</Text>
      )}
    </Box>
  );
}

/** Detail pane for the selected item. */
function DetailPane({
  item,
  allItems,
  config,
}: {
  item: ReviewItem | undefined;
  allItems: ReviewItem[];
  config: ReviewListConfig;
}): React.ReactElement {
  const t = useI18n();
  const lbl = (key: string) => `  ${t(key)}:`.padEnd(14);
  if (!item) {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>{t("reviewList.noneSelected", { item: config.itemLabel })}</Text>
      </Box>
    );
  }

  const pColor = PRIORITY_COLORS[item.priority] ?? "white";
  const dColor = DIFFICULTY_COLORS[item.difficulty] ?? "white";

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Box marginBottom={0}>
        <Text bold>{item.title}</Text>
      </Box>

      {/* Status */}
      <Box>
        <Text>{lbl("taskBrowser.detail.status")}</Text>
        {item.accepted ? (
          <Text color="green">{t("reviewList.acceptedBadge")}</Text>
        ) : (
          <Text color="red">{t("reviewList.rejectedBadge")}</Text>
        )}
      </Box>

      {/* Priority */}
      <Box>
        <Text>{lbl("taskBrowser.detail.priority")}</Text>
        <Text color={pColor as any}>{item.priority}</Text>
      </Box>

      {/* Difficulty */}
      <Box>
        <Text>{lbl("taskBrowser.detail.difficulty")}</Text>
        <Text color={dColor as any}>{item.difficulty}</Text>
      </Box>

      {/* Extra detail fields */}
      {item.detailFields.map((field, i) => (
        <Box key={`field-${i}`}>
          <Text>  {field.label.padEnd(11)} </Text>
          <Text color={(field.color ?? "white") as any}>{field.value}</Text>
        </Box>
      ))}

      {/* Dependencies */}
      {item.dependsOn.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>{t("questPicker.dependsOn")}</Text>
          {item.dependsOn.map((dep) => {
            const depItem = allItems.find((i) => i.id === dep);
            const icon = depItem
              ? depItem.accepted
                ? "\u2714"
                : "\u2718"
              : "?";
            const iconColor = depItem
              ? depItem.accepted
                ? "green"
                : "red"
              : "yellow";
            return (
              <Box key={dep}>
                <Text>  </Text>
                <Text color={iconColor as any}>{icon}</Text>
                <Text> {dep}</Text>
                {!depItem && <Text dimColor> ({t("reviewList.unknown")})</Text>}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Detail sections */}
      {item.detailSections.map((section, i) => {
        if (section.items.length === 0) return null;
        return (
          <Box key={`section-${i}`} flexDirection="column" marginTop={1}>
            <Text bold>{section.label}:</Text>
            {section.items.map((text, j) => (
              <Box key={j}>
                <Text>  {section.prefix ?? ""} {text}</Text>
              </Box>
            ))}
          </Box>
        );
      })}

      {/* Validation issues for this item */}
      {config.issues.filter((i) => i.itemId === item.id).length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>{t("reviewList.validationIssues")}:</Text>
          {config.issues
            .filter((i) => i.itemId === item.id)
            .map((issue, i) => (
              <Box key={i}>
                <Text>  </Text>
                <Text color={issue.level === "error" ? "red" : "yellow"}>
                  {issue.level === "error" ? "\u2718" : "\u26A0"}
                </Text>
                <Text> {issue.message}</Text>
              </Box>
            ))}
        </Box>
      )}
    </Box>
  );
}

/** Status bar showing keybind hints. */
function StatusBar({
  config,
  accepted,
  hasErrors,
}: {
  config: ReviewListConfig;
  accepted: number;
  hasErrors: boolean;
}): React.ReactElement {
  const t = useI18n();
  return (
    <Box flexDirection="column" marginTop={0}>
      <Box>
        <Text bold>{t("waveMonitor.keys")} </Text>
        <Text dimColor>Space</Text>
        <Text> {t("reviewList.key.toggle")}  </Text>
        <Text dimColor>e</Text>
        <Text> {t("taskBrowser.key.edit")}  </Text>
        <Text dimColor>u/d</Text>
        <Text> {t("reviewList.key.reorder")}  </Text>
        <Text dimColor>r</Text>
        <Text> {t("reviewList.key.toggleAll")}  </Text>
        <Text dimColor>v</Text>
        <Text> {t("reviewList.key.validation")}  </Text>
        <Text dimColor>a</Text>
        <Text> {t("reviewList.key.approve")}  </Text>
        <Text dimColor>q</Text>
        <Text> {t("reviewList.key.cancel")}</Text>
      </Box>
      <Box>
        <Text dimColor>
          {t("reviewList.willBeCreated", { count: accepted, item: config.itemLabel, items: config.itemLabelPlural })}
        </Text>
        {hasErrors && (
          <Text color="red"> | {t("reviewList.hasErrors")}</Text>
        )}
      </Box>
    </Box>
  );
}

/** Validation issues popup content. */
function ValidationPopup({
  issues,
  onClose,
}: {
  issues: ReviewValidationIssue[];
  onClose: () => void;
}): React.ReactElement {
  const t = useI18n();
  useScreenInput((input, key) => {
    if (key.escape || key.return || input === "q") {
      onClose();
    }
  });

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={errors.length > 0 ? "red" : "yellow"} paddingX={1}>
      <Text bold color={errors.length > 0 ? "red" : "yellow"}>
        {t("reviewList.validationIssues")}
      </Text>

      {issues.length === 0 ? (
        <Text color="green">{t("reviewList.noIssues")}</Text>
      ) : (
        <>
          {errors.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold color="red">{t("reviewList.errors", { count: errors.length })}</Text>
              {errors.map((e, i) => (
                <Box key={i}>
                  <Text color="red">  ✘ </Text>
                  <Text>{e.itemId ? `[${e.itemId}] ` : ""}{e.message}</Text>
                </Box>
              ))}
            </Box>
          )}
          {warnings.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold color="yellow">{t("reviewList.warnings", { count: warnings.length })}</Text>
              {warnings.map((w, i) => (
                <Box key={i}>
                  <Text color="yellow">  ⚠ </Text>
                  <Text>{w.itemId ? `[${w.itemId}] ` : ""}{w.message}</Text>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}

      <Box marginTop={1}>
        <Text dimColor>{t("reviewList.pressToClose")}</Text>
      </Box>
    </Box>
  );
}

/** Message popup (e.g., "no items accepted"). */
function MessagePopup({
  title,
  message,
  color,
  onClose,
}: {
  title: string;
  message: string;
  color: string;
  onClose: () => void;
}): React.ReactElement {
  const t = useI18n();
  useScreenInput((input, key) => {
    if (key.escape || key.return || input === "q") {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={color} paddingX={1}>
      <Text bold color={color as any}>{title}</Text>
      <Box marginTop={1}>
        <Text>{message}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{t("reviewList.pressToClose")}</Text>
      </Box>
    </Box>
  );
}

/** Confirm popup for approve action. */
function ConfirmPopup({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}): React.ReactElement {
  const t = useI18n();
  useScreenInput((input, key) => {
    if (input === "y" || input === "Y") {
      onConfirm();
    } else if (input === "n" || input === "N" || key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
      <Text bold color="green">{title}</Text>
      <Box marginTop={1}>
        <Text>{message}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="green" bold>Y</Text>
        <Text> — {t("ui.confirm")}  |  </Text>
        <Text color="red" bold>N</Text>
        <Text> / Esc — {t("ui.cancel")}</Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Modal types
// ---------------------------------------------------------------------------

type ModalState =
  | { type: "none" }
  | { type: "validation" }
  | { type: "message"; title: string; message: string; color: string }
  | { type: "confirm"; title: string; message: string; onConfirm: () => void }
  | { type: "edit" };

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * ReviewList — shared Ink component for genesis and plan review screens.
 *
 * Renders a split-pane review interface with list, detail, and status bar.
 * All behavior is driven by the config prop.
 */
export function ReviewList({ items, config }: ReviewListProps): React.ReactElement {
  const t = useI18n();
  const [state, setState] = useState<ReviewState>(() =>
    createReviewState(items)
  );
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const counts = getCounts(state);
  const selectedItem = state.items[state.selectedIndex];
  const hasErrors = config.issues.some((i) => i.level === "error");

  // Scroll window: cap the list to the terminal height so long plans
  // scroll instead of growing the box past the screen
  const { rows } = useTerminalSize();
  const listHeight = Math.max(4, rows - 12);
  const winStart = Math.max(
    0,
    Math.min(
      state.selectedIndex - Math.floor(listHeight / 2),
      Math.max(0, state.items.length - listHeight)
    )
  );
  const visibleItems = state.items.slice(winStart, winStart + listHeight);

  // -----------------------------------------------------------------------
  // Input handling
  // -----------------------------------------------------------------------

  const handleInput = useCallback(
    (input: string, key: import("ink").Key) => {
      // Block input when a modal is open
      if (modal.type !== "none") return;

      // Q / Escape — cancel
      if (input === "q" || key.escape) {
        config.onCancel();
        return;
      }

      // Space — toggle accept/reject
      if (input === " ") {
        setState((s) => toggleAccept(s));
        return;
      }

      // R — toggle all
      if (input === "r") {
        setState((s) => toggleAll(s));
        return;
      }

      // A — approve
      if (input === "a") {
        const accepted = getAcceptedItems(state);

        if (accepted.length === 0) {
          setModal({
            type: "message",
            title: t("reviewList.noneAcceptedTitle", { items: config.itemLabelPlural }),
            message: t("reviewList.noneAcceptedMessage", { item: config.itemLabel, items: config.itemLabelPlural }),
            color: "yellow",
          });
          return;
        }

        // Check for broken dependencies
        const acceptedIds = new Set(accepted.map((i) => i.id));
        const brokenDeps: string[] = [];
        for (const item of accepted) {
          for (const dep of item.dependsOn) {
            if (!acceptedIds.has(dep)) {
              brokenDeps.push(t("reviewList.brokenDepLine", { id: item.id, item: config.itemLabel, dep }));
            }
          }
        }

        if (brokenDeps.length > 0) {
          setModal({
            type: "message",
            title: t("reviewList.brokenDepsTitle"),
            message: t("reviewList.brokenDepsMessage", { items: config.itemLabelPlural, list: brokenDeps.map((b) => `  - ${b}`).join("\n") }),
            color: "red",
          });
          return;
        }

        setModal({
          type: "confirm",
          title: config.approveTitle,
          message: config.approveBody(accepted.length),
          onConfirm: () => {
            config.onApprove(accepted);
          },
        });
        return;
      }

      // V — validation issues
      if (input === "v") {
        setModal({ type: "validation" });
        return;
      }

      // E — edit
      if (input === "e") {
        setModal({ type: "edit" });
        return;
      }

      // U — move item up
      if (input === "u") {
        setState((s) => moveItem(s, -1));
        return;
      }

      // D — move item down
      if (input === "d") {
        setState((s) => moveItem(s, 1));
        return;
      }

      // Arrow keys for navigation
      if (key.upArrow) {
        setState((s) => selectItem(s, s.selectedIndex - 1));
        return;
      }

      if (key.downArrow) {
        setState((s) => selectItem(s, s.selectedIndex + 1));
        return;
      }
    },
    [modal, state, config]
  );

  useScreenInput(handleInput, { isActive: modal.type === "none" });

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  // Modal overlays
  if (modal.type === "validation") {
    return (
      <ValidationPopup
        issues={config.issues}
        onClose={() => setModal({ type: "none" })}
      />
    );
  }

  if (modal.type === "message") {
    return (
      <MessagePopup
        title={modal.title}
        message={modal.message}
        color={modal.color}
        onClose={() => setModal({ type: "none" })}
      />
    );
  }

  if (modal.type === "confirm") {
    return (
      <ConfirmPopup
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal({ type: "none" })}
      />
    );
  }

  if (modal.type === "edit") {
    // Edit modal is handled by ReviewEditModal component (separate file)
    // For now, close immediately if no edit fields defined
    if (config.editFields.length === 0 || !selectedItem) {
      setModal({ type: "none" });
      return <Text>{t("reviewList.loading")}</Text>;
    }

    // Import and render the edit modal
    return (
      <ReviewEditModalInline
        item={selectedItem}
        config={config}
        onDone={(updatedItem) => {
          setState((s) => updateItem(s, s.selectedIndex, updatedItem));
          setModal({ type: "none" });
        }}
        onCancel={() => setModal({ type: "none" })}
      />
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <ReviewHeader
        config={config}
        accepted={counts.accepted}
        rejected={counts.rejected}
        issues={config.issues}
      />

      {/* Main content: list + detail */}
      <Box>
        {/* Left pane: item list */}
        <Box flexDirection="column" borderStyle="single" borderColor="gray" width="50%" paddingX={0}>
          <Text bold dimColor> {config.listLabel}</Text>
          {state.items.length === 0 ? (
            <Text dimColor> {t("reviewList.noneInPlan", { items: config.itemLabelPlural })}</Text>
          ) : (
            visibleItems.map((item, i) => (
              <ListItemRow
                key={item.id}
                item={item}
                index={winStart + i}
                isSelected={winStart + i === state.selectedIndex}
              />
            ))
          )}
        </Box>

        {/* Right pane: detail */}
        <Box width="50%">
          <DetailPane
            item={selectedItem}
            allItems={state.items}
            config={config}
          />
        </Box>
      </Box>

      {/* Status bar */}
      <StatusBar
        config={config}
        accepted={counts.accepted}
        hasErrors={hasErrors}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Inline Edit Modal (simple version — full version in review-edit-modal.tsx)
// ---------------------------------------------------------------------------

/** Inline edit modal that steps through editable fields. */
function ReviewEditModalInline({
  item,
  config,
  onDone,
  onCancel,
}: {
  item: ReviewItem;
  config: ReviewListConfig;
  onDone: (updated: ReviewItem) => void;
  onCancel: () => void;
}): React.ReactElement {
  const t = useI18n();
  const [fieldIdx, setFieldIdx] = useState(0);
  const [currentItem, setCurrentItem] = useState<ReviewItem>({ ...item });
  const [inputValue, setInputValue] = useState("");

  const field = config.editFields[fieldIdx];

  // Initialize input value for current field
  React.useEffect(() => {
    if (field) {
      setInputValue(config.getEditFieldValue(currentItem, field.key));
    }
  }, [fieldIdx]);

  const nextField = useCallback(() => {
    if (fieldIdx >= config.editFields.length - 1) {
      onDone(currentItem);
    } else {
      setFieldIdx((i) => i + 1);
    }
  }, [fieldIdx, config.editFields.length, currentItem, onDone]);

  const applyAndNext = useCallback(
    (value: string) => {
      if (field) {
        const updated = config.setEditFieldValue(currentItem, field.key, value);
        setCurrentItem(updated);
      }
      nextField();
    },
    [field, currentItem, config, nextField]
  );

  useScreenInput((input, key) => {
    if (!field) return;

    // Escape — skip field / cancel edit
    if (key.escape) {
      nextField();
      return;
    }

    if (field.type === "select" && field.options) {
      // For select fields, use up/down to change selection and Enter to confirm
      if (key.return || input === " ") {
        applyAndNext(inputValue);
        return;
      }

      if (key.upArrow) {
        const options = field.options;
        const currentIdx = options.findIndex((o) => o.value === inputValue);
        const newIdx = currentIdx <= 0 ? options.length - 1 : currentIdx - 1;
        setInputValue(options[newIdx].value);
        return;
      }

      if (key.downArrow) {
        const options = field.options;
        const currentIdx = options.findIndex((o) => o.value === inputValue);
        const newIdx = currentIdx >= options.length - 1 ? 0 : currentIdx + 1;
        setInputValue(options[newIdx].value);
        return;
      }
      return;
    }

    // Text/textarea fields
    if (key.return && field.type !== "textarea") {
      applyAndNext(inputValue);
      return;
    }

    // Ctrl+S to submit textarea
    if (key.ctrl && input === "s") {
      applyAndNext(inputValue);
      return;
    }

    if (key.backspace) {
      setInputValue((v) => v.slice(0, -1));
      return;
    }

    if (key.return && field.type === "textarea") {
      setInputValue((v) => v + "\n");
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setInputValue((v) => v + input);
    }
  });

  if (!field) {
    return <Text>{t("reviewList.loading")}</Text>;
  }

  const stepLabel = t("reviewList.fieldStep", { n: fieldIdx + 1, total: config.editFields.length });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1}>
      <Text bold color="magenta">
        {t("reviewList.editTitle", { id: item.id })}
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text bold>{stepLabel} — {field.label}</Text>
        {field.hint && <Text dimColor>{field.hint}</Text>}
        <Text dimColor>{t("reviewList.editHint")}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {field.type === "select" && field.options ? (
          // Select list
          field.options.map((opt) => (
            <Box key={opt.value}>
              <Text color={opt.value === inputValue ? "cyan" : undefined}>
                {opt.value === inputValue ? "\u276F " : "  "}
              </Text>
              <Text bold={opt.value === inputValue}>{opt.label}</Text>
            </Box>
          ))
        ) : (
          // Text/textarea input
          <Box borderStyle="single" borderColor="cyan" paddingX={1}>
            <Text>{inputValue || " "}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
