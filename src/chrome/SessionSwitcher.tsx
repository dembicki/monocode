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
import { projectName } from "../lib/paths";
import { sessionDisplayTitle } from "../lib/session";
import type { SessionSummary } from "../lib/sessionStore";
import { useLockOverscroll } from "../hooks/useLockOverscroll";
import { HarnessIcon } from "./HarnessIcon";
import { MatchText } from "./MatchText";

const MAX_RESULTS = 80;

type Candidate = {
  summary: SessionSummary;
  title: string;
  project: string;
};

type RankedSession = Candidate & {
  score: number;
  titlePositions: number[];
  projectPositions: number[];
};

type Props = {
  open: boolean;
  sessions: SessionSummary[];
  activeSessionId?: string;
  onSelectSession: (id: string) => void;
  onClose: () => void;
};

export function SessionSwitcher({
  open,
  sessions,
  activeSessionId,
  onSelectSession,
  onClose,
}: Props) {
  const search = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const candidates = useMemo<Candidate[]>(
    () =>
      sessions
        .filter((summary) => summary.id !== activeSessionId)
        .map((summary) => ({
          summary,
          title: sessionDisplayTitle(summary.title, summary.harness),
          project: projectName(summary.cwd),
        })),
    [sessions, activeSessionId],
  );

  const results = useMemo<RankedSession[]>(() => {
    if (!query.trim()) {
      return candidates.slice(0, MAX_RESULTS).map((entry) => ({
        ...entry,
        score: 0,
        titlePositions: [],
        projectPositions: [],
      }));
    }
    const scored: RankedSession[] = [];
    for (const entry of candidates) {
      const titleHit = fuzzyMatch(query, entry.title);
      const projectHit = fuzzyMatch(query, entry.project);
      if (!titleHit && !projectHit) continue;
      const score = Math.max(
        titleHit ? titleHit.score + 400 : -Infinity,
        projectHit ? projectHit.score : -Infinity,
      );
      scored.push({
        ...entry,
        score,
        titlePositions: titleHit?.positions ?? [],
        projectPositions: projectHit?.positions ?? [],
      });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_RESULTS);
  }, [candidates, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
  }, [open]);

  useEffect(() => {
    setActive((index) =>
      results.length === 0 ? 0 : Math.min(index, results.length - 1),
    );
  }, [results.length]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (!open) return null;

  const pick = (entry: RankedSession) => {
    onSelectSession(entry.summary.id);
    onClose();
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
      if (entry) pick(entry);
      return;
    }
    if (e.key === "Tab") e.preventDefault();
  };

  const empty =
    candidates.length === 0
      ? "No other sessions"
      : results.length === 0 && query.trim()
        ? "No matching sessions"
        : null;

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: LAYER.dialog }}>
      <div className="absolute inset-0" onMouseDown={onClose} />
      <div
        role="dialog"
        aria-label="Switch Session"
        data-session-switcher
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-[12%] flex w-[min(560px,calc(100vw-24px))] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-content/10 bg-content/5 backdrop-blur-xl"
      >
        <div className="pb-1.5">
          <label className="flex items-center gap-2 border-b border-content/10 px-2 py-2.5 text-content/50">
            <Search className="size-3.5 shrink-0" strokeWidth={1.75} />
            <input
              ref={search}
              type="text"
              value={query}
              placeholder="Switch Session"
              aria-label="Switch Session"
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
          </label>
        </div>
        {empty ? (
          <p className="px-3 pb-3 pt-1 text-[12px] text-content/50">{empty}</p>
        ) : (
          <SessionList
            entries={results}
            active={active}
            query={query}
            onActive={setActive}
            onPick={pick}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

function SessionList({
  entries,
  active,
  query,
  onActive,
  onPick,
}: {
  entries: RankedSession[];
  active: number;
  query: string;
  onActive: (index: number) => void;
  onPick: (entry: RankedSession) => void;
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
      aria-label="Sessions"
      onMouseMove={onListMouseMove}
      className="max-h-[min(380px,50vh)] overflow-y-auto overscroll-none px-1.5 pb-1.5"
    >
      {entries.map((entry, index) => {
        const highlighted = index === active;
        return (
          <button
            key={entry.summary.id}
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
            <span className="shrink-0">
              <HarnessIcon
                harness={entry.summary.harness}
                className="size-3.5"
              />
            </span>
            <span className="min-w-0 flex-1 truncate">
              <MatchText
                text={entry.title}
                positions={entry.titlePositions}
                active={Boolean(query.trim())}
              />
            </span>
            <span className="min-w-0 max-w-[45%] shrink-0 truncate font-mono text-[11px] text-content/40">
              <MatchText
                text={entry.project}
                positions={entry.projectPositions}
                active={Boolean(query.trim())}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
