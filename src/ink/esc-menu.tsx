/**
 * esc-menu.tsx — Global ESC-triggered floating overlay menu.
 *
 * Provides a floating overlay that appears when Escape is pressed anywhere
 * in the TUI (unless a more specific Escape handler fires first).
 *
 * Components:
 *   EscMenuItem      — a single selectable menu row
 *   EscMenu          — the floating menu box (controlled: open/closed)
 *   EscMenuProvider  — wraps the TUI root; owns keyboard listener + state
 *
 * Hooks:
 *   useEscMenu()     — returns { open, openMenu, closeMenu } from context
 *
 * Integration:
 *   Wrap your TUI root in <EscMenuProvider> (inside ScreenRouter so it can
 *   call useNavigation()). EscMenuProvider renders <EscMenu> on top of
 *   children when open.
 *
 *   <ScreenRouter screens={...} initialScreen="dashboard">
 *     <EscMenuProvider>
 *       <ChromeLayout ...>
 *         {children}
 *       </ChromeLayout>
 *     </EscMenuProvider>
 *   </ScreenRouter>
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { Box, Text, useInput } from "ink";
import { t } from "./i18n";
import { useTerminalSize } from "./use-terminal-size";

// ---------------------------------------------------------------------------
// EscMenuContext
// ---------------------------------------------------------------------------

export interface EscMenuState {
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const defaultEscMenuState: EscMenuState = {
  open: false,
  openMenu: () => {},
  closeMenu: () => {},
};

const EscMenuContext = createContext<EscMenuState>(defaultEscMenuState);

/**
 * Hook to access the ESC menu open/close controls from anywhere in the tree.
 * Returns default no-op values if used outside an EscMenuProvider.
 */
export function useEscMenu(): EscMenuState {
  return useContext(EscMenuContext);
}

/**
 * useScreenInput — Ink's useInput, gated while the global ESC menu is open.
 *
 * Screens rendered under EscMenuProvider must not act on keys while the
 * overlay owns input, otherwise menu selections also drive the screen beneath.
 * Behaves exactly like useInput when the menu is closed (or outside a provider,
 * where the default context reports open=false).
 */
export function useScreenInput(
  inputHandler: Parameters<typeof useInput>[0],
  options: Parameters<typeof useInput>[1] = {},
): void {
  const { open } = useEscMenu();
  // Ink applies `isActive` in an effect, which can run after the frame that
  // already shows the menu. Track `open` during render (the frame's own render)
  // and gate synchronously too, so keys sent with the menu on screen can't leak.
  const openRef = useRef(open);
  openRef.current = open;
  useInput(
    (input, key) => {
      if (openRef.current) return;
      inputHandler(input, key);
    },
    { ...options, isActive: (options.isActive ?? true) && !open },
  );
}

// ---------------------------------------------------------------------------
// ASCII art title
// ---------------------------------------------------------------------------

const MENU_LINES = [
  "███╗   ███╗███████╗███╗   ██╗██╗   ██╗",
  "████╗ ████║██╔════╝████╗  ██║██║   ██║",
  "██╔████╔██║█████╗  ██╔██╗ ██║██║   ██║",
  "██║╚██╔╝██║██╔══╝  ██║╚██╗██║██║   ██║",
  "██║ ╚═╝ ██║███████╗██║ ╚████║╚██████╔╝",
  "╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝ ╚═════╝",
];

// ---------------------------------------------------------------------------
// Gradient utilities
// ---------------------------------------------------------------------------

/** HSL → #rrggbb */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

// ---------------------------------------------------------------------------
// MenuTitle
// ---------------------------------------------------------------------------

function MenuTitle({ tick }: { tick: number }): React.ReactElement {
  const totalLines = MENU_LINES.length;
  return (
    <Box flexDirection="column" alignItems="center">
      {MENU_LINES.map((line, lineIdx) => (
        <Text key={lineIdx}>
          {line.split("").map((char, x) => {
            const px = line.length > 1 ? x / (line.length - 1) : 0;
            const py = totalLines > 1 ? lineIdx / (totalLines - 1) : 0;
            const hue = ((px * 200 + py * 140 + tick * 4) % 360 + 360) % 360;
            const brightness = 58 + Math.sin(px * Math.PI * 4 + py * Math.PI * 2.5 + tick * 0.12) * 14;
            const l = Math.max(38, Math.min(82, brightness));
            return <Text key={x} color={hslToHex(hue, 100, l)}>{char}</Text>;
          })}
        </Text>
      ))}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// EscMenuItem
// ---------------------------------------------------------------------------

export interface EscMenuItemProps {
  label: string;
  onSelect: () => void;
  selected: boolean;
}

/**
 * A single selectable row inside the EscMenu.
 * Shows ">" prefix when selected.
 */
export function EscMenuItem({
  label,
  onSelect: _onSelect,
  selected,
}: EscMenuItemProps): React.ReactElement {
  return (
    <Box flexDirection="row" gap={1}>
      <Text color={selected ? "cyan" : undefined}>{selected ? ">" : " "}</Text>
      <Text color={selected ? "cyan" : undefined} bold={selected}>
        {label}
      </Text>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// EscMenu (controlled)
// ---------------------------------------------------------------------------

export interface EscMenuProps {
  /** Whether the menu is currently open. */
  open: boolean;
  /** Called when the user selects "Return to app" or presses Escape. */
  onClose: () => void;
  /**
   * Called when the user selects a navigation item.
   * Receives the action key: 'settings' | 'quit'.
   */
  onNavigate: (action: "settings" | "quit") => void;
  /**
   * Optional. When supplied, a Dashboard item is shown; selecting it closes
   * the menu first, then invokes this callback. Kept separate from
   * onNavigate so the settings/quit action union is unchanged.
   */
  onOpenDashboard?: () => void;
}

type MenuAction = "close" | "settings" | "quit" | "dashboard";

const MENU_ITEMS: Array<{ key: string; label: () => string; action: MenuAction }> = [
  { key: "return",    label: () => t("menu.returnToApp"), action: "close" },
  { key: "dashboard", label: () => t("screen.dashboard"), action: "dashboard" },
  { key: "settings",  label: () => t("menu.settings"),    action: "settings" },
  { key: "quit",      label: () => t("menu.quit"),        action: "quit" },
];

/**
 * Floating overlay menu. Renders null when open=false.
 *
 * This is a controlled component — pass open/onClose/onNavigate from outside.
 * For the full integrated experience with keyboard handling use EscMenuProvider.
 */
export function EscMenu({
  open,
  onClose,
  onNavigate,
  onOpenDashboard,
}: EscMenuProps): React.ReactElement | null {
  const [cursor, setCursor] = useState(0);
  const items = onOpenDashboard
    ? MENU_ITEMS
    : MENU_ITEMS.filter((item) => item.action !== "dashboard");

  const activate = (action: MenuAction): void => {
    if (action === "close") {
      onClose();
    } else if (action === "dashboard") {
      // Close the overlay before navigating.
      onClose();
      onOpenDashboard?.();
    } else {
      onNavigate(action);
    }
  };
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setTick(t => t + 1), 60);
    return () => clearInterval(id);
  }, [open]);

  // Keyboard: arrow keys + enter + escape
  useInput(
    (input, key) => {
      if (!open) return;
      if (key.upArrow) {
        setCursor((c) => Math.max(0, c - 1));
      } else if (key.downArrow) {
        setCursor((c) => Math.min(items.length - 1, c + 1));
      } else if (key.return) {
        const item = items[Math.min(cursor, items.length - 1)];
        if (item) activate(item.action);
      } else if (key.escape) {
        onClose();
      }
    },
    { isActive: open }
  );

  if (!open) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      minWidth={42}
      backgroundColor="black"
    >
      {/* Title */}
      <Box marginBottom={1} justifyContent="center">
        <MenuTitle tick={tick} />
      </Box>

      {/* Items */}
      {items.map((item, i) => (
        <EscMenuItem
          key={item.key}
          label={item.label()}
          selected={i === cursor}
          onSelect={() => activate(item.action)}
        />
      ))}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// EscMenuProvider
// ---------------------------------------------------------------------------

export interface EscMenuProviderProps {
  children?: ReactNode;
  /**
   * Optional callback when the user selects a navigation action.
   * If not provided, navigation items are still rendered but no-op.
   */
  onNavigate?: (action: "settings" | "quit") => void;
  /**
   * Optional. When supplied, the menu shows a Dashboard item that closes the
   * menu and then calls this.
   */
  onOpenDashboard?: () => void;
}

/**
 * EscMenuProvider — wraps the TUI root and owns the ESC menu state.
 *
 * Listens for Escape key globally (isActive=true) to toggle the menu.
 * Renders EscMenu on top of children when open.
 */
export function EscMenuProvider({
  children,
  onNavigate,
  onOpenDashboard,
}: EscMenuProviderProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const { rows, columns } = useTerminalSize();

  const openMenu = useCallback(() => setOpen(true), []);
  const closeMenu = useCallback(() => setOpen(false), []);

  // Global ESC handler (fires only when menu is closed; EscMenu handles ESC when open)
  useInput(
    (_input, key) => {
      if (key.escape && !open) {
        setOpen(true);
      }
    },
    { isActive: !open }
  );

  const handleNavigate = useCallback(
    (action: "settings" | "quit") => {
      setOpen(false);
      onNavigate?.(action);
    },
    [onNavigate]
  );

  const ctxValue: EscMenuState = { open, openMenu, closeMenu };

  return (
    <EscMenuContext.Provider value={ctxValue}>
      {children}
      {open && (
        <Box
          position="absolute"
          width={columns}
          height={rows}
          alignItems="center"
          justifyContent="center"
        >
          <EscMenu
            open={open}
            onClose={closeMenu}
            onNavigate={handleNavigate}
            onOpenDashboard={onOpenDashboard}
          />
        </Box>
      )}
    </EscMenuContext.Provider>
  );
}
