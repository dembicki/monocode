# Command Palette

`Cmd/Ctrl+Shift+P` opens a searchable command palette, styled and behaved
like the existing quick-pick overlays (`Cmd+F` file picker, `Cmd+P` session
switcher).

## What it does

- Fuzzy-searches a list of app commands (go to file, switch session, switch
  project, search, find in files, open project, toggle sidebar, inbox/notes,
  new tab/terminal, split panes, close pane/tabs, switch model, settings),
  plus git commands when the current project is a git repo (see below).
- Arrow keys to navigate, `Enter` to run, `Escape` or click-outside to
  dismiss.
- Each row shows the command label and its existing keyboard shortcut (if
  any) on the right.
- Opening the palette closes any other overlay (file picker, session
  switcher, settings, search, inbox, notes), and vice versa — only one
  overlay is ever open at a time.
- A command can require follow-up input instead of running immediately:
  - **Prompt mode** (`Git: Commit…`) — the search box turns into a text
    input for that command; `Enter` submits, `Escape` backs out to the
    command list (not a full close).
  - **Confirm mode** (`Git: Push`) — shows a short async description (e.g.
    "Push 3 commits from main to origin/main?") before `Enter` runs it;
    `Escape` backs out the same way.
  - Both modes show inline busy/error state under the input rather than a
    toast or `window.alert`.

## Git commands

Shown only when `isGitRepo` is true (derived from the existing
`useProjectBranches(sidebarCwd, ...)` result already used by
`BranchPicker`/`Sidebar` — `null` branches means "not a repo or not
answered yet", so the git rows simply don't render until confirmed):

- **Git: View Diff** — opens the existing working-tree diff tab
  (`openChangesTab` from `lib/layout.ts`, the same multi-file
  `UnifiedDiffView` used by the Source Control sidebar), no new viewer.
- **Git: Add** — `git add -u` (modifications/deletions to
  already-tracked files only, deliberately **not** `-A`, so new untracked
  files are left alone) via a new `gitStageTracked` Tauri command.
- **Git: Commit…** — prompt-mode command; submits via the existing
  `gitCommit(cwd, message)` wrapper.
- **Git: Push** — confirm-mode command; `describe()` calls `gitDiffIndex`
  to report ahead-count and remote/upstream before the user confirms, then
  runs the existing `gitPush(cwd)`.
- All four operate on `gitCwdRef.current` (same cwd resolution as the
  Source Control panel: session work cwd, else sidebar cwd) and call
  `notifyGitChanged()` on success so the Source Control panel / branch
  picker / other git UI stays in sync.

No new Rust git logic was needed except `git_stage_tracked` (`git add -u`)
in `src-tauri/src/fs.rs` + `src/lib/fs.ts` — diff, commit, and push already
existed as Tauri commands used by `GitChangesPanel.tsx`/`BranchPicker.tsx`.

## Implementation

- **`src/chrome/CommandPalette.tsx`** — the picker component, cloned
  from `SessionSwitcher.tsx`'s structure (portal-rendered dialog, fuzzy
  ranking via `lib/fuzzy.ts`, `role="listbox"` results with keyboard/pointer
  active-row handling, `data-command-palette` marker), extended with a
  `Mode` state machine (`list` / `prompt` / `confirm`) to support the git
  commands' follow-up input without a separate dialog component.
- **`src/App.tsx`**
  - `commandPaletteOpen` state + ref, `onOpenCommandPalette` callback
    (mutual-exclusion with every other overlay's open/close callback).
  - `Cmd/Ctrl+Shift+P` branch in the global `keydown` handler, plus a
    `listen("command_palette", ...)` Tauri event listener so the native
    menu item fires the same action as the in-app shortcut.
  - `paletteCommands` — a plain array (not memoized: it's cheap to rebuild,
    and memoizing it previously left a stale `loadNotesEnabled()` read
    behind an unrelated dependency list) of `{ id, label, shortcut, run }`
    or `{ ..., prompt }` / `{ ..., confirm }` entries, built from the app's
    existing action callbacks — no new non-git command logic.
  - `isGitRepo` — derived from the existing `projectBranches` value.
  - `data-command-palette` added to the picker-exclusion CSS selectors used
    to suppress list-navigation shortcuts while any overlay is focused.
- **`src-tauri/src/menu.rs`** — added a `Command Palette…` item
  (`CmdOrCtrl+Shift+P`) to the File menu and `command_palette` to the
  event-dispatch whitelist. (Git commands are palette-only, not mirrored
  into the native menu.)

## Notes / open questions

- The non-git command list is hand-maintained in `App.tsx`; there's no
  central command registry in the codebase (see `src-tauri/src/menu.rs`
  for the closest thing — id + label + accelerator per native menu item).
  New menu items don't automatically appear in the palette.
- Commands requiring an argument beyond the prompt/confirm cases (e.g.
  focus-pane-direction) aren't exposed individually; only the two
  split-pane directions are, mirroring what the menu already exposes.
- `isGitRepo` is keyed off `sidebarCwd` while the git actions themselves run
  against `gitCwdRef.current` (session work cwd when a session is active).
  These are usually the same path but can diverge for a session checked out
  into a worktree — worth revisiting if that mismatch ever hides/shows the
  wrong commands for a given session.
