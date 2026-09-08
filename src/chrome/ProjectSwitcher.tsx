import { FolderPlus, Search } from "./icons";
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
import { projectSwitcherItems, type RecentProject } from "../lib/recents";
import { useLockOverscroll } from "../hooks/useLockOverscroll";
import { MatchText } from "./MatchText";
import { ProjectLogoIcon } from "./ProjectLogoIcon";

const MAX_RESULTS = 80;

type Candidate = {
  path: string;
  name: string;
};

type RankedProject = Candidate & {
  score: number;
  namePositions: number[];
  pathPositions: number[];
};

type Row = { kind: "browse" } | ({ kind: "project" } & RankedProject);

type Props = {
  open: boolean;
  recents: RecentProject[];
  currentCwd: string;
  onSelectProject: (path: string) => void;
  onBrowseFolder: () => void;
  onClose: () => void;
};

export function ProjectSwitcher({
  open,
  recents,
  currentCwd,
  onSelectProject,
  onBrowseFolder,
  onClose,
}: Props) {
  const search = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const candidates = useMemo<Candidate[]>(
    () =>
      projectSwitcherItems(recents, currentCwd).map((entry) => ({
        path: entry.path,
        name: projectName(entry.path),
      })),
    [recents, currentCwd],
  );

  const ranked = useMemo<RankedProject[]>(() => {
    if (!query.trim()) {
      return candidates.slice(0, MAX_RESULTS).map((entry) => ({
        ...entry,
        score: 0,
        namePositions: [],
        pathPositions: [],
      }));
    }
    const scored: RankedProject[] = [];
    for (const entry of candidates) {
      const nameHit = fuzzyMatch(query, entry.name);
      const pathHit = fuzzyMatch(query, entry.path);
      if (!nameHit && !pathHit) continue;
      const score = Math.max(
        nameHit ? nameHit.score + 400 : -Infinity,
        pathHit ? pathHit.score : -Infinity,
      );
      scored.push({
        ...entry,
        score,
        namePositions: nameHit?.positions ?? [],
        pathPositions: pathHit?.positions ?? [],
      });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_RESULTS);
  }, [candidates, query]);

  const rows = useMemo<Row[]>(
    () => [
      ...ranked.map((entry): Row => ({ kind: "project", ...entry })),
      { kind: "browse" },
    ],
    [ranked],
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
  }, [open]);

  useEffect(() => {
    setActive((index) => Math.min(index, rows.length - 1));
  }, [rows.length]);

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

  const pick = (row: Row) => {
    if (row.kind === "browse") {
      onBrowseFolder();
    } else {
      onSelectProject(row.path);
    }
    onClose();
  };

  const onSearchKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((index) => (index + 1) % rows.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((index) => (index - 1 + rows.length) % rows.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[active];
      if (row) pick(row);
      return;
    }
    if (e.key === "Tab") e.preventDefault();
  };

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: LAYER.dialog }}>
      <div className="absolute inset-0" onMouseDown={onClose} />
      <div
        role="dialog"
        aria-label="Switch Project"
        data-project-switcher
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
              placeholder="Switch Project"
              aria-label="Switch Project"
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
        <ProjectList
          rows={rows}
          active={active}
          query={query}
          onActive={setActive}
          onPick={pick}
        />
      </div>
    </div>,
    document.body,
  );
}

function ProjectList({
  rows,
  active,
  query,
  onActive,
  onPick,
}: {
  rows: Row[];
  active: number;
  query: string;
  onActive: (index: number) => void;
  onPick: (row: Row) => void;
}) {
  const lockOverscroll = useLockOverscroll<HTMLDivElement>();
  const activeRef = useRef<HTMLButtonElement>(null);
  const pointer = useRef({ x: Number.NaN, y: Number.NaN, allow: false });
  const fromPointer = useRef(false);

  useEffect(() => {
    pointer.current.allow = false;
  }, [rows]);

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
      aria-label="Projects"
      onMouseMove={onListMouseMove}
      className="max-h-[min(380px,50vh)] overflow-y-auto overscroll-none px-1.5 pb-1.5"
    >
      {rows.map((row, index) => {
        const highlighted = index === active;
        const key = row.kind === "browse" ? "__browse__" : row.path;
        return (
          <button
            key={key}
            ref={highlighted ? activeRef : undefined}
            type="button"
            role="option"
            aria-selected={highlighted}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => onRowEnter(index)}
            onClick={() => onPick(row)}
            className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm leading-none ${
              highlighted ? "bg-content/10 text-content" : "text-content"
            }`}
          >
            {row.kind === "browse" ? (
              <>
                <span className="shrink-0 text-content/50">
                  <FolderPlus className="size-3.5" strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1 truncate">
                  Open Project…
                </span>
              </>
            ) : (
              <>
                <span className="shrink-0">
                  <ProjectLogoIcon path={row.path} className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <MatchText
                    text={row.name}
                    positions={row.namePositions}
                    active={Boolean(query.trim())}
                  />
                </span>
                <span className="min-w-0 max-w-[45%] shrink-0 truncate font-mono text-[11px] text-content/40">
                  <MatchText
                    text={row.path}
                    positions={row.pathPositions}
                    active={Boolean(query.trim())}
                  />
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
