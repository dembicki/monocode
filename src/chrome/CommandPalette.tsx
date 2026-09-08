import { Search } from "./icons";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { fuzzyMatch } from "../lib/fuzzy";
import { LAYER } from "../lib/layers";
import { useLockOverscroll } from "../hooks/useLockOverscroll";
import { MatchText } from "./MatchText";

type PromptSpec = {
  placeholder: string;
  submitLabel?: string;
  onSubmit: (value: string) => Promise<void> | void;
};

type ConfirmSpec = {
  /** May be async (e.g. fetch ahead/behind counts before showing the prompt). */
  describe: () => Promise<string> | string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
};

export type PaletteCommand = {
  id: string;
  label: string;
  shortcut?: string;
} & (
  | { run: () => void; prompt?: undefined; confirm?: undefined }
  | { run?: undefined; prompt: PromptSpec; confirm?: undefined }
  | { run?: undefined; prompt?: undefined; confirm: ConfirmSpec }
);

type RankedCommand = PaletteCommand & {
  score: number;
  positions: number[];
};

type Mode =
  | { kind: "list" }
  | { kind: "prompt"; command: RankedCommand & { prompt: PromptSpec } }
  | {
      kind: "confirm";
      command: RankedCommand & { confirm: ConfirmSpec };
      description: string;
      loading: boolean;
    };

type Props = {
  open: boolean;
  commands: PaletteCommand[];
  onClose: () => void;
};

export function CommandPalette({ open, commands, onClose }: Props) {
  const search = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const results = useMemo<RankedCommand[]>(() => {
    if (!query.trim()) {
      return commands.map((entry) => ({
        ...entry,
        score: 0,
        positions: [],
      }));
    }
    const scored: RankedCommand[] = [];
    for (const entry of commands) {
      const hit = fuzzyMatch(query, entry.label);
      if (!hit) continue;
      scored.push({ ...entry, score: hit.score, positions: hit.positions });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    setMode({ kind: "list" });
    setValue("");
    setBusy(false);
    setError(null);
  }, [open]);

  useEffect(() => {
    setActive((index) =>
      results.length === 0 ? 0 : Math.min(index, results.length - 1),
    );
  }, [results.length]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
  }, [open, mode.kind]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (busyRef.current) return;
      if (modeRef.current.kind !== "list") {
        setMode({ kind: "list" });
        setError(null);
        return;
      }
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (!open) return null;

  const enterMode = (entry: RankedCommand) => {
    if (entry.run) {
      onClose();
      entry.run();
      return;
    }
    if (entry.prompt) {
      setMode({ kind: "prompt", command: entry as typeof entry & { prompt: PromptSpec } });
      setValue("");
      setError(null);
      return;
    }
    if (entry.confirm) {
      const command = entry as typeof entry & { confirm: ConfirmSpec };
      setMode({ kind: "confirm", command, description: "", loading: true });
      setError(null);
      Promise.resolve(command.confirm.describe()).then(
        (description) =>
          setMode((current) =>
            current.kind === "confirm" && current.command.id === command.id
              ? { ...current, description, loading: false }
              : current,
          ),
        (err) =>
          setMode((current) =>
            current.kind === "confirm" && current.command.id === command.id
              ? {
                  ...current,
                  description: err instanceof Error ? err.message : String(err),
                  loading: false,
                }
              : current,
          ),
      );
    }
  };

  const submitPrompt = async () => {
    if (mode.kind !== "prompt") return;
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await mode.command.prompt.onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const submitConfirm = async () => {
    if (mode.kind !== "confirm" || mode.loading || busy) return;
    setBusy(true);
    setError(null);
    try {
      await mode.command.confirm.onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const onSearchKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length === 0) return;
      setActive((index) => (index + 1) % results.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length === 0) return;
      setActive((index) => (index - 1 + results.length) % results.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const entry = results[active];
      if (entry) enterMode(entry);
      return;
    }
    if (e.key === "Tab") e.preventDefault();
  };

  const onModeKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (mode.kind === "prompt") void submitPrompt();
      else if (mode.kind === "confirm") void submitConfirm();
    }
  };

  const empty =
    results.length === 0 && query.trim() ? "No matching commands" : null;

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: LAYER.dialog }}>
      <div className="absolute inset-0" onMouseDown={busy ? undefined : onClose} />
      <div
        role="dialog"
        aria-label="Command Palette"
        data-command-palette
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-[12%] flex w-[min(560px,calc(100vw-24px))] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-content/10 bg-content/5 backdrop-blur-xl"
      >
        {mode.kind !== "list" ? (
          <div className="px-3 pt-2.5 text-[11px] uppercase tracking-wide text-content/40">
            {mode.command.label}
          </div>
        ) : null}
        <div className="pb-1.5">
          <label className="flex items-center gap-2 border-b border-content/10 px-2 py-2.5 text-content/50">
            <Search className="size-3.5 shrink-0" strokeWidth={1.75} />
            {mode.kind === "list" ? (
              <input
                ref={search}
                type="text"
                value={query}
                placeholder="Command Palette"
                aria-label="Command Palette"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-content outline-none placeholder:text-content/40"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onSearchKey}
              />
            ) : mode.kind === "prompt" ? (
              <input
                ref={search}
                type="text"
                value={value}
                placeholder={mode.command.prompt.placeholder}
                aria-label={mode.command.prompt.placeholder}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                disabled={busy}
                className="min-w-0 flex-1 bg-transparent text-[13px] text-content outline-none placeholder:text-content/40 disabled:opacity-50"
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onModeKey}
              />
            ) : (
              <input
                ref={search}
                type="text"
                readOnly
                value={
                  busy
                    ? "Working…"
                    : `Press Enter to ${(mode.command.confirm.confirmLabel ?? "confirm").toLowerCase()}, Escape to cancel`
                }
                aria-label="Confirm"
                className="min-w-0 flex-1 select-none bg-transparent text-[13px] text-content/70 outline-none"
                onKeyDown={onModeKey}
              />
            )}
          </label>
        </div>
        {mode.kind === "confirm" ? (
          <p className="px-3 pb-2 text-[12px] text-content/60">
            {mode.loading ? "Loading…" : mode.description}
          </p>
        ) : null}
        {error ? (
          <p className="px-3 pb-2 text-[12px] text-red-400">{error}</p>
        ) : null}
        {mode.kind === "list" ? (
          empty ? (
            <p className="px-3 pb-3 pt-1 text-[12px] text-content/50">
              {empty}
            </p>
          ) : (
            <CommandList
              entries={results}
              active={active}
              query={query}
              onActive={setActive}
              onPick={enterMode}
            />
          )
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function CommandList({
  entries,
  active,
  query,
  onActive,
  onPick,
}: {
  entries: RankedCommand[];
  active: number;
  query: string;
  onActive: (index: number) => void;
  onPick: (entry: RankedCommand) => void;
}) {
  const lockOverscroll = useLockOverscroll<HTMLDivElement>();
  const activeRef = useRef<HTMLButtonElement>(null);
  const pointer = useRef({ x: Number.NaN, y: Number.NaN, allow: false });
  const fromPointer = useRef(false);

  useEffect(() => {
    pointer.current.allow = false;
  }, [entries]);

  useEffect(() => {
    if (fromPointer.current) {
      fromPointer.current = false;
      return;
    }
    pointer.current.allow = false;
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onListMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.clientX === pointer.current.x && e.clientY === pointer.current.y) {
      return;
    }
    pointer.current = { x: e.clientX, y: e.clientY, allow: true };
  };

  const onRowEnter = (index: number) => {
    if (!pointer.current.allow) return;
    fromPointer.current = true;
    onActive(index);
  };

  return (
    <div
      ref={lockOverscroll}
      role="listbox"
      aria-label="Commands"
      onMouseMove={onListMouseMove}
      className="max-h-[min(380px,50vh)] overflow-y-auto overscroll-none px-1.5 pb-1.5"
    >
      {entries.map((entry, index) => {
        const highlighted = index === active;
        return (
          <button
            key={entry.id}
            ref={highlighted ? activeRef : undefined}
            type="button"
            role="option"
            aria-selected={highlighted}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => onRowEnter(index)}
            onClick={() => onPick(entry)}
            className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm leading-none ${
              highlighted ? "bg-content/10 text-content" : "text-content"
            }`}
          >
            <span className="min-w-0 flex-1 truncate">
              <MatchText
                text={entry.label}
                positions={entry.positions}
                active={Boolean(query.trim())}
              />
            </span>
            {entry.shortcut ? (
              <span className="min-w-0 shrink-0 truncate font-mono text-[11px] text-content/40">
                {entry.shortcut}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
