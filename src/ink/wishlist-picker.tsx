/**
 * wishlist-picker.tsx — Full-screen Ink component for browsing and promoting
 * wishlist items.
 *
 * Layout:
 *   ┌───────────────────────────────────────────────────────┐
 *   │ wombo-combo Wishlist  │ 5 items                       │
 *   ├──────────────────────────┬────────────────────────────┤
 *   │ • Fix login timeout...   │ Description: Fix login...  │
 *   │ • Add dark mode support  │                            │
 *   │ • Refactor DB layer      │ Tags: auth, ux             │
 *   │                          │ Created: 2025-01-15        │
 *   ├──────────────────────────┴────────────────────────────┤
 *   │ E:errand  P:quest  G:genesis  D:delete  Esc:back Q:quit│
 *   └───────────────────────────────────────────────────────┘
 *
 * Keybinds:
 *   E         — promote selected item to errand
 *   P         — promote selected item to quest
 *   G         — promote selected item to genesis
 *   D / Del   — delete selected item
 *   S-Up/Down — move selected item up/down in order
 *   Up/Down   — navigate items
 *   Esc       — go back
 *   Q         — quit
 */

import React from "react";
import { Box, Text } from "ink";
import type { WishlistItem } from "../lib/wishlist-store";
import { useWishlistStore } from "./use-wishlist-store";
import { formatDate, truncateText } from "./wishlist-helpers";
import { useScreenInput } from "./esc-menu";
import { useI18n } from "./i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WishlistPickerProps {
  /** Project root directory. */
  projectRoot: string;
  /** Called when the user promotes an item to errand (E key). */
  onPromoteErrand: (item: WishlistItem) => void;
  /** Called when the user promotes an item to genesis (G key). */
  onPromoteGenesis: (item: WishlistItem) => void;
  /** Called when the user promotes an item to quest (P key). */
  onPromoteQuest: (item: WishlistItem) => void;
  /** Called when the user presses Esc to go back. */
  onBack: () => void;
  /** Called when the user presses Q to quit. */
  onQuit: () => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Header — displays app name, "Wishlist" label, and item count.
 */
function Header({ itemCount }: { itemCount: number }): React.ReactElement {
  const t = useI18n();
  return (
    <Box flexDirection="column" marginBottom={0}>
      <Box>
        <Text bold color="white">
          wombo-combo
        </Text>
        <Text> </Text>
        <Text bold color="yellow">
          {t("wishlist.picker.title")}
        </Text>
        <Text dimColor> | </Text>
        <Text>{t("wishlist.picker.items", { count: itemCount })}</Text>
      </Box>
      <Text dimColor>
        {t("wishlist.picker.subtitle")}
      </Text>
    </Box>
  );
}

/**
 * ItemList — left pane showing all wishlist items.
 */
function ItemList({
  items,
  selectedIndex,
}: {
  items: WishlistItem[];
  selectedIndex: number;
}): React.ReactElement {
  const t = useI18n();
  if (items.length === 0) {
    return (
      <Box flexDirection="column" width="50%">
        <Text dimColor>{t("wishlist.picker.noItems")}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="50%">
      {items.map((item, i) => {
        const isSelected = i === selectedIndex;
        const pos = String(i + 1).padStart(2, " ");
        const text = truncateText(item.text, 38);
        const date = formatDate(item.created_at);
        const tagsBadge =
          item.tags.length > 0 ? ` [${item.tags.join(", ")}]` : "";

        return (
          <Box key={item.id}>
            {isSelected ? (
              <Text backgroundColor="blue" color="white" bold>
                {` ${pos}. \u2022 ${text}${tagsBadge} ${date} `}
              </Text>
            ) : (
              <Text>
                <Text dimColor>{` ${pos}. `}</Text>
                <Text color="yellow">{"\u2022"}</Text>
                <Text>{` ${text}`}</Text>
                <Text dimColor>{tagsBadge}</Text>
                <Text dimColor>{` ${date}`}</Text>
              </Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * DetailPane — right pane showing details of the selected item.
 */
function DetailPane({
  item,
  index,
  totalCount,
}: {
  item: WishlistItem | null;
  index: number;
  totalCount: number;
}): React.ReactElement {
  const t = useI18n();
  if (!item) {
    return (
      <Box flexDirection="column" width="50%" paddingLeft={2}>
        <Text bold color="yellow">
          {t("wishlist.picker.noItems")}
        </Text>
        <Text> </Text>
        <Text>{t("wishlist.picker.emptyLine")}</Text>
        <Text> </Text>
        <Text bold>{t("wishlist.picker.addFromCli")}</Text>
        <Text color="cyan">{'woco wishlist add "your idea"'}</Text>
        <Text> </Text>
        <Text bold>{t("wishlist.picker.orFromBrowser")}</Text>
        <Text>
          {t("wishlist.picker.pressW")}
        </Text>
        <Text>
          {t("wishlist.picker.pressA")}
        </Text>
        <Text> </Text>
        <Text dimColor>{t("wishlist.picker.escBack")}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="50%" paddingLeft={2}>
      <Text dimColor>
        {t("wishlist.picker.itemOf", { n: index + 1, total: totalCount })}
      </Text>
      <Text> </Text>

      {/* Description */}
      <Text bold>{t("taskBrowser.detail.description")}</Text>
      <Text> {item.text}</Text>
      <Text> </Text>

      {/* Tags */}
      {item.tags.length > 0 && (
        <>
          <Text bold>{t("wishlist.picker.tags")}</Text>
          <Box>
            <Text>{"  "}</Text>
            {item.tags.map((tag, i) => (
              <React.Fragment key={tag}>
                {i > 0 && <Text>{"  "}</Text>}
                <Text color="cyan">{tag}</Text>
              </React.Fragment>
            ))}
          </Box>
          <Text> </Text>
        </>
      )}

      {/* Created */}
      <Text bold>{t("wishlist.picker.created")}</Text>
      <Text>
        {"  "}
        {item.created_at.slice(0, 10)} {item.created_at.slice(11, 19)}
      </Text>
      <Text> </Text>

      {/* ID */}
      <Text bold>{t("wishlist.picker.id")}</Text>
      <Text dimColor>{"  "}{item.id}</Text>
      <Text> </Text>

      {/* Promote hints */}
      <Text bold>{t("wishlist.picker.promote")}</Text>
      <Text>
        {"  "}
        <Text color="green">E</Text>
        {` \u2192 ${t("wishlist.picker.promoteErrand")}`}
      </Text>
      <Text>
        {"  "}
        <Text color="cyan">P</Text>
        {` \u2192 ${t("wishlist.picker.promoteQuest")}`}
      </Text>
      <Text>
        {"  "}
        <Text color="magenta">G</Text>
        {` \u2192 ${t("wishlist.picker.promoteGenesis")}`}
      </Text>
    </Box>
  );
}

/**
 * StatusBar — bottom bar with keybind hints and selected item preview.
 */
function StatusBar({
  selectedItem,
}: {
  selectedItem: WishlistItem | null;
}): React.ReactElement {
  const t = useI18n();
  return (
    <Box flexDirection="column" marginTop={0}>
      <Box>
        <Text bold>{t("waveMonitor.keys")} </Text>
        <Text dimColor>e</Text>
        <Text> {t("taskBrowser.key.errand")}  </Text>
        <Text dimColor>p</Text>
        <Text> {t("wishlist.picker.keyQuest")}  </Text>
        <Text dimColor>g</Text>
        <Text> {t("questPicker.key.genesis")}  </Text>
        <Text dimColor>d</Text>
        <Text> {t("questPicker.key.delete")}  </Text>
        <Text dimColor>S-{"\u2191"}/{"\u2193"}</Text>
        <Text> {t("reviewList.key.reorder")}  </Text>
        <Text dimColor>Esc</Text>
        <Text> {t("taskBrowser.key.back")}  </Text>
        <Text dimColor>q</Text>
        <Text> {t("waveMonitor.quit")}</Text>
      </Box>
      <Box>
        {selectedItem ? (
          <Text>{truncateText(selectedItem.text, 60)}</Text>
        ) : (
          <Text dimColor>
            {t("wishlist.picker.addHint")}
          </Text>
        )}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * WishlistPicker — full-screen Ink component for browsing and promoting
 * wishlist items.
 */
export function WishlistPicker({
  projectRoot,
  onPromoteErrand,
  onPromoteGenesis,
  onPromoteQuest,
  onBack,
  onQuit,
}: WishlistPickerProps): React.ReactElement {
  const store = useWishlistStore({ projectRoot });

  useScreenInput((input, key) => {
    // Navigation
    if (key.downArrow && !key.shift) {
      store.selectNext();
      return;
    }
    if (key.upArrow && !key.shift) {
      store.selectPrev();
      return;
    }

    // Shift+Up/Down — reorder
    if (key.upArrow && key.shift) {
      store.moveSelectedUp();
      return;
    }
    if (key.downArrow && key.shift) {
      store.moveSelectedDown();
      return;
    }

    // E — promote to errand
    if (input === "e") {
      if (store.selectedItem) {
        onPromoteErrand(store.selectedItem);
      }
      return;
    }

    // G — promote to genesis
    if (input === "g") {
      if (store.selectedItem) {
        onPromoteGenesis(store.selectedItem);
      }
      return;
    }

    // P — promote to quest
    if (input === "p") {
      if (store.selectedItem) {
        onPromoteQuest(store.selectedItem);
      }
      return;
    }

    // D / Delete — delete selected item
    if (input === "d" || key.delete) {
      store.deleteSelected();
      return;
    }

    // Q — quit
    if (input === "q") {
      onQuit();
      return;
    }

    // Escape — go back
    if (key.escape) {
      onBack();
      return;
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Header itemCount={store.items.length} />

      {/* Main content: list + detail */}
      <Box marginTop={1} marginBottom={1}>
        <ItemList items={store.items} selectedIndex={store.selectedIndex} />
        <DetailPane
          item={store.selectedItem}
          index={store.selectedIndex}
          totalCount={store.items.length}
        />
      </Box>

      {/* Status bar */}
      <StatusBar selectedItem={store.selectedItem} />
    </Box>
  );
}
