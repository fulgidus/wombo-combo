/**
 * settings-screen.tsx — Interactive settings screen for the TUI.
 *
 * SettingsScreen is a full TUI screen that shows config.json values grouped
 * by category. Users can navigate fields, edit values inline, cycle theme
 * presets, select locale, and reset to defaults.
 *
 * Components:
 *   SettingsField    — a single label + value row
 *   SettingsSection  — a titled group of fields
 *   SettingsScreen   — the full screen (register in SCREEN_MAP as "settings")
 *
 * Integration:
 *   Register in your SCREEN_MAP:
 *     { settings: SettingsScreen }
 *   Navigate to it from EscMenu via:
 *     onNavigate("settings") → push("settings", { config, onSave })
 */

import React, {
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Box, Text } from "ink";
import { useI18n, type TFunction } from "./i18n";
import { AVAILABLE_LOCALES } from "../lib/i18n";
import type { ThemeName } from "./theme";
import { saveConfig } from "../config";
import { useScreenInput } from "./esc-menu";

// ---------------------------------------------------------------------------
// Partial config shape (only TUI-editable fields for now)
// ---------------------------------------------------------------------------

export interface SettingsScreenConfig {
  tui?: {
    theme?: string;
    locale?: string;
    checkForUpdates?: boolean;
    autoInstallUpdates?: boolean;
  };
  devMode?: boolean;
  /** Named agent profiles (read-only here; edit them in config.json) */
  agentProfiles?: Record<string, { harness: string; model?: string | null; provider?: string | null }>;
  /** Which profile handles work by default */
  routing?: { default?: string };
  /** Per-task-weight model (null = session model) */
  modelRouting?: { light?: string | null; medium?: string | null; heavy?: string | null };
}

/** Next option after `current`, wrapping; an unknown current value yields the first option. */
export function cycleOption<T>(options: readonly T[], current: T, dir: 1 | -1 = 1): T {
  const idx = options.indexOf(current);
  if (idx < 0) return options[0];
  return options[(idx + dir + options.length) % options.length];
}

/** Models selectable for modelRouting: session default (null), models used by profiles, and the current value. */
export function modelOptions(cfg: SettingsScreenConfig, current: string | null | undefined): (string | null)[] {
  const options: (string | null)[] = [null];
  const add = (m: string | null | undefined) => {
    if (m && !options.includes(m)) options.push(m);
  };
  for (const p of Object.values(cfg.agentProfiles ?? {})) add(p.model);
  add(current);
  return options;
}

// ---------------------------------------------------------------------------
// SettingsField
// ---------------------------------------------------------------------------

export interface SettingsFieldProps {
  label: string;
  value: string;
  selected: boolean;
  onEdit: () => void;
  /** Optional hint shown below the value when selected */
  hint?: string;
}

/**
 * A single label / value row in the settings screen.
 * Shows ">" cursor when selected.
 */
export function SettingsField({
  label,
  value,
  selected,
  hint,
}: SettingsFieldProps): React.ReactElement {
  return (
    <Box flexDirection="row" gap={1} marginLeft={1}>
      <Text color={selected ? "cyan" : undefined}>{selected ? ">" : " "}</Text>
      <Box flexDirection="row" minWidth={24}>
        <Text color={selected ? "cyan" : undefined} bold={selected}>
          {label}
        </Text>
      </Box>
      <Text color={selected ? "white" : "gray"}>{value}</Text>
      {selected && hint ? (
        <Text dimColor> ({hint})</Text>
      ) : null}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// SettingsSection
// ---------------------------------------------------------------------------

export interface SettingsSectionProps {
  title: string;
  children?: ReactNode;
}

/**
 * A titled group of settings fields.
 */
export function SettingsSection({
  title,
  children,
}: SettingsSectionProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box paddingX={1}>
        <Text bold underline color="yellow">
          {title}
        </Text>
      </Box>
      {children}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// SettingsScreen
// ---------------------------------------------------------------------------

const THEME_OPTIONS: ThemeName[] = ["default", "high-contrast", "minimal"];
const LOCALE_OPTIONS = ["auto", ...AVAILABLE_LOCALES];

export interface SettingsScreenProps {
  /** Partial (or full) current config — only TUI-relevant fields used */
  config: SettingsScreenConfig;
  /** Called with the patched config object when user saves */
  onSave: (patched: SettingsScreenConfig) => void;
  /** Called when user presses Back / Escape */
  onBack: () => void;
  /** Project root — required to persist settings to disk */
  projectRoot?: string;
}

type ModelWeight = "light" | "medium" | "heavy";
type FieldId =
  | "theme"
  | "locale"
  | "checkForUpdates"
  | "autoInstallUpdates"
  | "devMode"
  | "routingDefault"
  | "modelLight"
  | "modelMedium"
  | "modelHeavy"
  | "reset";

const MODEL_FIELD_WEIGHT: Partial<Record<FieldId, ModelWeight>> = {
  modelLight: "light",
  modelMedium: "medium",
  modelHeavy: "heavy",
};

interface FieldDef {
  id: FieldId;
  /** Locale key of the label (resolved at render so the active locale applies). */
  labelKey: string;
  getValue: (cfg: SettingsScreenConfig, t: TFunction) => string;
}

const FIELDS: FieldDef[] = [
  {
    id: "theme",
    labelKey: "settings.theme",
    getValue: (cfg) => cfg.tui?.theme ?? "default",
  },
  {
    id: "locale",
    labelKey: "settings.locale",
    getValue: (cfg) => cfg.tui?.locale ?? "auto",
  },
  {
    id: "checkForUpdates",
    labelKey: "settings.checkForUpdates",
    getValue: (cfg, t) => (cfg.tui?.checkForUpdates ?? true) ? t("settings.on") : t("settings.off"),
  },
  {
    id: "autoInstallUpdates",
    labelKey: "settings.autoInstallUpdates",
    getValue: (cfg, t) => (cfg.tui?.autoInstallUpdates ? t("settings.on") : t("settings.off")),
  },
  {
    id: "devMode",
    labelKey: "settings.devMode",
    getValue: (cfg, t) => (cfg.devMode ? t("settings.on") : t("settings.off")),
  },
  {
    id: "routingDefault",
    labelKey: "settings.routingDefault",
    getValue: (cfg, t) => cfg.routing?.default ?? t("settings.none"),
  },
  ...(["light", "medium", "heavy"] as const).map((w): FieldDef => ({
    id: `model${w[0].toUpperCase()}${w.slice(1)}` as FieldId,
    labelKey: `settings.model.${w}`,
    getValue: (cfg, t) => cfg.modelRouting?.[w] ?? t("settings.sessionModel"),
  })),
  {
    id: "reset",
    labelKey: "settings.reset",
    getValue: () => "",
  },
];

// Indices for the render sections
const APPEARANCE_FIELD_IDS: FieldId[] = ["theme", "locale"];
const GENERAL_FIELD_IDS: FieldId[] = ["checkForUpdates", "autoInstallUpdates", "devMode"];
const PROVIDER_FIELD_IDS: FieldId[] = ["routingDefault", "modelLight", "modelMedium", "modelHeavy"];
const RESET_IDX = FIELDS.length - 1;

/**
 * Full settings TUI screen.
 *
 * Navigation: up/down move the cursor, left/right (or Enter) change the value,
 * Escape goes back.
 */
export function SettingsScreen({
  config: initialConfig,
  onSave,
  onBack,
  projectRoot,
}: SettingsScreenProps): React.ReactElement {
  const t = useI18n();
  const [cfg, setCfg] = useState<SettingsScreenConfig>(initialConfig);
  const [cursor, setCursor] = useState(0);
  const [saved, setSaved] = useState(false);

  const persist = useCallback(
    (patched: SettingsScreenConfig) => {
      onSave(patched);
      if (projectRoot) {
        try {
          saveConfig(projectRoot, patched as any);
        } catch {
          // Best-effort: if we can't write, in-memory change still applies
        }
      }
      setSaved(true);
    },
    [onSave, projectRoot]
  );

  /** Step the value of a field: dir=+1 next option, dir=-1 previous (booleans just toggle). */
  const stepField = useCallback(
    (field: FieldDef, dir: 1 | -1) => {
      let patched: SettingsScreenConfig | undefined;
      if (field.id === "theme") {
        const idx = THEME_OPTIONS.indexOf((cfg.tui?.theme ?? "default") as ThemeName);
        const next = THEME_OPTIONS[(idx + dir + THEME_OPTIONS.length) % THEME_OPTIONS.length];
        patched = { ...cfg, tui: { ...cfg.tui, theme: next } };
      } else if (field.id === "locale") {
        const idx = LOCALE_OPTIONS.indexOf(cfg.tui?.locale ?? "auto");
        const next = LOCALE_OPTIONS[(idx + dir + LOCALE_OPTIONS.length) % LOCALE_OPTIONS.length];
        patched = { ...cfg, tui: { ...cfg.tui, locale: next } };
      } else if (field.id === "checkForUpdates") {
        patched = { ...cfg, tui: { ...cfg.tui, checkForUpdates: !(cfg.tui?.checkForUpdates ?? true) } };
      } else if (field.id === "autoInstallUpdates") {
        patched = { ...cfg, tui: { ...cfg.tui, autoInstallUpdates: !(cfg.tui?.autoInstallUpdates ?? false) } };
      } else if (field.id === "devMode") {
        patched = { ...cfg, devMode: !cfg.devMode };
      } else if (field.id === "routingDefault") {
        const names = Object.keys(cfg.agentProfiles ?? {});
        if (names.length === 0) return;
        const next = cycleOption(names, cfg.routing?.default ?? "", dir);
        patched = { ...cfg, routing: { ...cfg.routing, default: next } };
      } else if (MODEL_FIELD_WEIGHT[field.id]) {
        const weight = MODEL_FIELD_WEIGHT[field.id]!;
        const current = cfg.modelRouting?.[weight] ?? null;
        const next = cycleOption(modelOptions(cfg, current), current, dir);
        patched = { ...cfg, modelRouting: { ...cfg.modelRouting, [weight]: next } };
      }
      if (patched) {
        setCfg(patched);
        persist(patched);
      }
    },
    [cfg, persist]
  );

  const handleInput = useCallback(
    (
      _input: string,
      key: { upArrow: boolean; downArrow: boolean; leftArrow: boolean; rightArrow: boolean; return: boolean; escape: boolean }
    ) => {
      if (key.upArrow) {
        setCursor((c) => Math.max(0, c - 1));
        return;
      }
      if (key.downArrow) {
        setCursor((c) => Math.min(FIELDS.length - 1, c + 1));
        return;
      }
      if (key.escape) {
        onBack();
        return;
      }
      const field = FIELDS[cursor];
      if (key.leftArrow) {
        stepField(field, -1);
        return;
      }
      if (key.rightArrow) {
        stepField(field, 1);
        return;
      }
      if (key.return) {
        if (field.id === "reset") {
          // Destructive: Enter only, never an arrow key.
          const reset: SettingsScreenConfig = {};
          setCfg(reset);
          persist(reset);
          return;
        }
        stepField(field, 1);
      }
    },
    [cursor, stepField, persist, onBack]
  );

  useScreenInput(handleInput);

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {t("settings.title")}
        </Text>
        {saved && (
          <Text color="green">  {t("settings.saved")}</Text>
        )}
      </Box>

      {/* TUI / Appearance section */}
      <SettingsSection title={t("settings.sectionAppearance")}>
        {FIELDS.filter((f) => APPEARANCE_FIELD_IDS.includes(f.id)).map((field) => {
          const idx = FIELDS.findIndex((x) => x.id === field.id);
          return (
            <SettingsField
              key={field.id}
              label={t(field.labelKey)}
              value={field.getValue(cfg, t)}
              selected={cursor === idx}
              onEdit={() => {}}
              hint={t("settings.hintCycle")}
            />
          );
        })}
      </SettingsSection>

      {/* General section */}
      <SettingsSection title={t("settings.sectionGeneral")}>
        {FIELDS.filter((f) => GENERAL_FIELD_IDS.includes(f.id)).map((field) => {
          const idx = FIELDS.findIndex((x) => x.id === field.id);
          return (
            <SettingsField
              key={field.id}
              label={t(field.labelKey)}
              value={field.getValue(cfg, t)}
              selected={cursor === idx}
              onEdit={() => {}}
              hint={t("settings.hintToggle")}
            />
          );
        })}
      </SettingsSection>

      {/* Providers & models section */}
      <SettingsSection title={t("settings.sectionProviders")}>
        {Object.entries(cfg.agentProfiles ?? {}).map(([name, p]) => (
          <Box key={name} marginLeft={3}>
            <Text dimColor>
              {name}: {[p.harness, p.provider, p.model].filter(Boolean).join(" / ")}
            </Text>
          </Box>
        ))}
        {FIELDS.filter((f) => PROVIDER_FIELD_IDS.includes(f.id)).map((field) => {
          const idx = FIELDS.findIndex((x) => x.id === field.id);
          return (
            <SettingsField
              key={field.id}
              label={t(field.labelKey)}
              value={field.getValue(cfg, t)}
              selected={cursor === idx}
              onEdit={() => {}}
              hint={t("settings.hintCycle")}
            />
          );
        })}
      </SettingsSection>

      {/* Reset option */}
      <Box marginTop={1} marginLeft={2}>
        <Box flexDirection="row" gap={1}>
          <Text color={cursor === RESET_IDX ? "red" : undefined}>{cursor === RESET_IDX ? ">" : " "}</Text>
          <Text color={cursor === RESET_IDX ? "red" : "gray"} bold={cursor === RESET_IDX}>
            {t("settings.reset")}
          </Text>
        </Box>
      </Box>

      {/* Footer hint */}
      <Box marginTop={1}>
        <Text dimColor>{t("settings.footer")}</Text>
      </Box>
    </Box>
  );
}
