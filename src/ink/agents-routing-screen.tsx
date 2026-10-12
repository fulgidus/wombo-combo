/**
 * agents-routing-screen.tsx — Edit config.agentProfiles and config.routing.
 *
 * Three views (tab cycles them):
 *   profiles   — create, edit and delete agent profiles
 *   routing    — point default / weight / difficulty / operation / fallback
 *                slots at existing profile names
 *   harnesses  — read-only: binary on PATH, provider-reported cost, configured
 *
 * Edits stay in a draft until `s` saves. Saving goes through the config
 * validator, so a dangling profile reference is refused and nothing is written.
 * Cost availability comes from each adapter's capabilities, never a price table.
 * The implicit legacy "default" profile (agent.bin / modelRouting) is shown as
 * configured and is never something the user is asked to set up.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Text } from "ink";
import type { AgentProfile, WomboConfig } from "../config";
import { HARNESS_IDS, type HarnessId } from "../lib/harness";
import {
  deleteProfile,
  draftFromConfig,
  getRoute,
  harnessRows,
  routeSlots,
  saveDraft,
  setRoute,
  upsertProfile,
  type Draft,
  type RouteSlot,
} from "../lib/agents-routing";
import { ConfirmDialog } from "./confirm";
import { useScreenInput } from "./esc-menu";
import { useI18n } from "./i18n";
import { cycleOption } from "./settings-screen";
import { Spinner } from "./spinner";
import { TextInput } from "./text-input";
import { useTerminalSize } from "./use-terminal-size";

export interface AgentsRoutingScreenProps {
  config: WomboConfig;
  /** Project root; without it the screen cannot save */
  projectRoot?: string;
  onBack: () => void;
  /** Called with the saved draft so the parent can refresh its config snapshot */
  onSaved?: (draft: Draft) => void;
  /** Screen height in rows (default: terminal rows minus the persistent chrome) */
  height?: number;
  /** PATH probe override (tests) */
  binExists?: (bin: string) => boolean;
}

type View = "profiles" | "routing" | "harnesses";
const VIEWS: View[] = ["profiles", "routing", "harnesses"];
/** pi is an ultralight harness and leads the picker */
const HARNESS_PICKER: HarnessId[] = ["pi", ...HARNESS_IDS.filter((h) => h !== "pi")];
const NAME_RE = /^[a-z0-9][a-z0-9_-]*$/;
/** Rows used by title, tabs, status line and footer */
const FRAME_ROWS = 5;
/** Rows taken by the persistent top and bottom chrome bars */
const CHROME_ROWS = 4;

type EditField = "name" | "harness" | "bin" | "model" | "provider";

interface EditState {
  isNew: boolean;
  name: string;
  base: AgentProfile;
  harness: HarnessId;
  bin: string;
  model: string;
  provider: string;
  field: number;
}

function startEdit(name: string | null, profile?: AgentProfile): EditState {
  return {
    isNew: name === null,
    name: name ?? "",
    base: profile ?? { harness: "pi" },
    harness: profile?.harness ?? "pi",
    bin: profile?.bin ?? "",
    model: profile?.model ?? "",
    provider: profile?.provider ?? "",
    field: 0,
  };
}

const editFields = (e: EditState): EditField[] =>
  e.isNew ? ["name", "harness", "bin", "model", "provider"] : ["harness", "bin", "model", "provider"];

/** First visible index so the cursor stays inside a window of `size` rows. */
export function windowStart(cursor: number, total: number, size: number): number {
  return Math.min(Math.max(0, cursor - Math.floor(size / 2)), Math.max(0, total - size));
}

interface ListRow {
  key: string;
  label: string;
  value: string;
  dim?: boolean;
}

export function AgentsRoutingScreen({
  config,
  projectRoot,
  onBack,
  onSaved,
  height,
  binExists,
}: AgentsRoutingScreenProps): React.ReactElement {
  const t = useI18n();
  const { rows: termRows } = useTerminalSize();
  const totalRows = height ?? Math.max(10, termRows - CHROME_ROWS);
  const windowSize = Math.max(3, totalRows - FRAME_ROWS);

  const [baseline, setBaseline] = useState<Draft>(() => draftFromConfig(config));
  const [draft, setDraft] = useState<Draft>(baseline);
  const [view, setView] = useState<View>("profiles");
  const [cursors, setCursors] = useState<Record<View, number>>({ profiles: 0, routing: 0, harnesses: 0 });
  const [edit, setEdit] = useState<EditState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);
  const [discardArmed, setDiscardArmed] = useState(false);
  const [probed, setProbed] = useState(false);

  // PATH probing runs after the first paint so the screen opens immediately.
  useEffect(() => {
    const id = setTimeout(() => setProbed(true), 0);
    return () => clearTimeout(id);
  }, []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const names = Object.keys(draft.profiles);
  const slots = useMemo(() => routeSlots(draft), [draft]);
  const harnesses = useMemo(
    () => (probed ? harnessRows(config, { binExists }, draft.profiles) : []),
    [probed, config, binExists, draft.profiles],
  );
  const showLegacy = !draft.profiles.default;

  // --- view rows -----------------------------------------------------------

  const profileRows: ListRow[] = [
    ...names.map((n): ListRow => {
      const p = draft.profiles[n];
      return { key: n, label: n, value: [p.harness, p.bin, p.provider, p.model].filter(Boolean).join(" / ") };
    }),
    ...(showLegacy
      ? [{ key: "\0legacy", label: t("agents.legacyProfile"), value: t("agents.legacyNote"), dim: true } as ListRow]
      : []),
    { key: "\0new", label: t("agents.newProfile"), value: "" },
  ];

  const slotLabel = (s: RouteSlot): string => t(`agents.slot.${s.kind}`, { key: "key" in s ? s.key : "" });
  const routeRows: ListRow[] = slots.map((s) => ({
    key: `${s.kind}:${"key" in s ? s.key : ""}`,
    label: slotLabel(s),
    value: getRoute(draft, s) ?? (s.kind === "default" ? t("agents.unset") : "-"),
  }));

  const rowsFor = (v: View): number =>
    v === "profiles" ? profileRows.length : v === "routing" ? routeRows.length : harnesses.length;

  const move = (delta: number): void =>
    setCursors((c) => ({ ...c, [view]: Math.max(0, Math.min(rowsFor(view) - 1, c[view] + delta)) }));

  // --- actions -------------------------------------------------------------

  const save = useCallback(() => {
    if (!projectRoot) {
      setStatus({ text: "no project root", error: true });
      return;
    }
    const error = saveDraft(projectRoot, config, draft);
    if (error) {
      setStatus({ text: error, error: true });
      return;
    }
    setBaseline(draft);
    setStatus({ text: t("agents.saved"), error: false });
    onSaved?.(draft);
  }, [projectRoot, config, draft, onSaved, t]);

  const commitEdit = (e: EditState): void => {
    const name = e.name.trim();
    if (e.isNew) {
      if (!name) return setStatus({ text: t("agents.nameRequired"), error: true });
      if (!NAME_RE.test(name)) return setStatus({ text: t("agents.nameInvalid"), error: true });
      if (draft.profiles[name]) return setStatus({ text: t("agents.nameTaken", { name }), error: true });
    }
    const target = e.isNew ? name : e.name;
    setDraft(upsertProfile(draft, target, { ...e.base, harness: e.harness, bin: e.bin, model: e.model, provider: e.provider }));
    setEdit(null);
    setStatus(null);
  };

  const stepRoute = (slot: RouteSlot, dir: 1 | -1): void => {
    const options: (string | null)[] = [null, ...names];
    setDraft(setRoute(draft, slot, cycleOption(options, getRoute(draft, slot), dir)));
  };

  const stepProfileHarness = (name: string, dir: 1 | -1): void => {
    const p = draft.profiles[name];
    setDraft(upsertProfile(draft, name, { ...p, harness: cycleOption(HARNESS_PICKER, p.harness, dir) }));
  };

  // --- input ---------------------------------------------------------------

  useScreenInput((input, key) => {
    if (confirmDelete) return; // ConfirmDialog owns the keys
    if (edit) {
      const fields = editFields(edit);
      const field = fields[edit.field];
      if (key.escape) return setEdit(null);
      if (key.return) return commitEdit(edit);
      if (key.upArrow) return setEdit({ ...edit, field: Math.max(0, edit.field - 1) });
      if (key.downArrow) return setEdit({ ...edit, field: Math.min(fields.length - 1, edit.field + 1) });
      if (field === "harness" && (key.leftArrow || key.rightArrow)) {
        return setEdit({ ...edit, harness: cycleOption(HARNESS_PICKER, edit.harness, key.rightArrow ? 1 : -1) });
      }
      return; // text fields are handled by their TextInput
    }

    const wasArmed = discardArmed;
    setDiscardArmed(false);
    if (key.escape) {
      if (dirty && !wasArmed) {
        setDiscardArmed(true);
        return;
      }
      return onBack();
    }
    if (key.tab) {
      setView(VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length]);
      return;
    }
    if (key.upArrow) return move(-1);
    if (key.downArrow) return move(1);
    if (input === "s") return save();

    const cursor = cursors[view];
    if (view === "profiles") {
      const row = profileRows[cursor];
      const isProfile = !!row && !row.key.startsWith("\0");
      if (input === "n" || (key.return && row?.key === "\0new")) return setEdit(startEdit(null));
      if (!isProfile) return;
      if (key.leftArrow || key.rightArrow) return stepProfileHarness(row.key, key.rightArrow ? 1 : -1);
      if (key.return) return setEdit(startEdit(row.key, draft.profiles[row.key]));
      if (input === "d") return setConfirmDelete(row.key);
    } else if (view === "routing") {
      const slot = slots[cursor];
      if (slot && (key.leftArrow || key.rightArrow)) stepRoute(slot, key.rightArrow ? 1 : -1);
    }
  });

  // --- render --------------------------------------------------------------

  const renderRows = (rows: ListRow[], cursor: number): React.ReactElement => {
    const start = windowStart(cursor, rows.length, windowSize);
    const visible = rows.slice(start, start + windowSize);
    return (
      <Box flexDirection="column">
        {visible.map((row, i) => {
          const selected = start + i === cursor;
          return (
            <Box key={row.key} gap={1}>
              <Text color={selected ? "cyan" : undefined}>{selected ? ">" : " "}</Text>
              <Box minWidth={26}>
                <Text color={selected ? "cyan" : undefined} bold={selected} dimColor={row.dim}>
                  {row.label}
                </Text>
              </Box>
              <Text color={selected ? "white" : "gray"}>{row.value}</Text>
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderHarnesses = (): React.ReactElement => {
    if (!probed) {
      return (
        <Box gap={1}>
          <Spinner color="cyan" />
          <Text dimColor>{t("agents.checking")}</Text>
        </Box>
      );
    }
    const cursor = cursors.harnesses;
    const start = windowStart(cursor, harnesses.length, windowSize);
    return (
      <Box flexDirection="column">
        {harnesses.slice(start, start + windowSize).map((h) => (
          <Box key={h.id} gap={1}>
            <Text> </Text>
            <Box minWidth={12}>
              <Text bold>{h.id}</Text>
            </Box>
            <Text color={h.onPath ? "green" : "red"}>{h.onPath ? t("agents.path.yes") : t("agents.path.no")}</Text>
            <Text color={h.reportsCost ? "green" : "gray"}>{h.reportsCost ? t("agents.cost.yes") : t("agents.cost.no")}</Text>
            <Text color={h.configured ? "green" : "gray"}>
              {h.configured ? `${t("agents.configured")} (${h.profiles.join(", ")})` : t("agents.notConfigured")}
            </Text>
          </Box>
        ))}
      </Box>
    );
  };

  const renderEdit = (e: EditState): React.ReactElement => {
    const fields = editFields(e);
    const setText = (field: "name" | "bin" | "model" | "provider") => (v: string) => setEdit({ ...e, [field]: v });
    return (
      <Box flexDirection="column">
        {fields.map((f, i) => {
          const selected = i === e.field;
          return (
            <Box key={f} gap={1}>
              <Text color={selected ? "cyan" : undefined}>{selected ? ">" : " "}</Text>
              <Box minWidth={12}>
                <Text color={selected ? "cyan" : undefined} bold={selected}>
                  {t(`agents.field.${f}`)}
                </Text>
              </Box>
              {f === "harness" ? (
                <Text>{e.harness}</Text>
              ) : (
                <TextInput value={e[f]} onChange={setText(f)} focus={selected} />
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  if (confirmDelete) {
    return (
      <ConfirmDialog
        title={t("agents.deleteTitle")}
        message={t("agents.deleteMessage", { name: confirmDelete })}
        onConfirm={(yes) => {
          if (yes) setDraft(deleteProfile(draft, confirmDelete));
          setConfirmDelete(null);
          setCursors((c) => ({ ...c, profiles: 0 }));
        }}
      />
    );
  }

  const hint = edit ? t("agents.hint.edit") : t(`agents.hint.${view}`);
  const statusText = discardArmed ? t("agents.discardHint") : status?.text;

  return (
    <Box flexDirection="column" height={totalRows} paddingX={1}>
      <Box>
        <Text bold color="cyan">
          {t("agents.title")}
        </Text>
        {dirty ? <Text color="yellow">  {t("agents.dirty")}</Text> : null}
      </Box>
      <Box gap={2}>
        {VIEWS.map((v) => (
          <Text key={v} bold={v === view} color={v === view ? "yellow" : "gray"} underline={v === view}>
            {t(`agents.tab.${v}`)}
          </Text>
        ))}
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {edit ? renderEdit(edit) : view === "profiles" ? renderRows(profileRows, cursors.profiles) : view === "routing" ? renderRows(routeRows, cursors.routing) : renderHarnesses()}
      </Box>
      <Box>
        <Text color={status?.error && !discardArmed ? "red" : "green"}>{statusText ?? " "}</Text>
      </Box>
      <Box>
        <Text dimColor>{hint}</Text>
      </Box>
    </Box>
  );
}
