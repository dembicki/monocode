# Command Palette

`Cmd/Ctrl+Shift+P` opens a searchable command palette, styled and behaved
like the existing quick-pick overlays (`Cmd+F` file picker, `Cmd+P` session
switcher).

## What it does

- Fuzzy-searches a fixed list of app commands (go to file, switch session,
  switch project, search, find in files, open project, toggle sidebar,
  inbox/notes, new tab/terminal, split panes, close pane/tabs, switch model,
  settings).
- Arrow keys to navigate, `Enter` to run, `Escape` or click-outside to
  dismiss.
- Each row shows the command label and its existing keyboard shortcut (if
  any) on the right.
- Opening the palette closes any other overlay (file picker, session
  switcher, settings, search, inbox, notes), and vice versa — only one
  overlay is ever open at a time.

## Implementation

- **`src/chrome/CommandPalette.tsx`** (new) — the picker component, cloned
  from `SessionSwitcher.tsx`'s structure: portal-rendered dialog, local
  `query`/`active` state, fuzzy ranking via `lib/fuzzy.ts`, `role="listbox"`
  results list with keyboard/pointer active-row handling, marked with
  `data-command-palette` so global shortcut handlers know to suppress
  conflicting keys while it's open.
- **`src/App.tsx`**
  - `commandPaletteOpen` state + ref, `onOpenCommandPalette` callback
    (mutual-exclusion with every other overlay's open/close callback).
  - New `Cmd/Ctrl+Shift+P` branch in the global `keydown` handler.
  - `listen("command_palette", ...)` Tauri event listener, so the native
    menu item fires the same action as the in-app shortcut.
  - `paletteCommands` — a `useMemo`'d list of `{ id, label, shortcut, run }`
    entries built from the app's existing action callbacks (no new command
    logic; the palette just exposes what already exists).
  - `data-command-palette` added to the picker-exclusion CSS selectors used
    to suppress list-navigation shortcuts while any overlay is focused.
- **`src-tauri/src/menu.rs`** — added a `Command Palette…` item
  (`CmdOrCtrl+Shift+P`) to the File menu, next to `Go to File…` /
  `Switch Session…`, and added `command_palette` to the event-dispatch
  whitelist.

## Notes / open questions

- The command list is hand-maintained in `App.tsx`; there's no central
  command registry in the codebase yet (see `src-tauri/src/menu.rs` for the
  closest thing — id + label + accelerator per native menu item). If more
  commands are added to the menu, they won't automatically appear in the
  palette.
- Commands requiring an argument (e.g. focus-pane-direction) aren't
  exposed individually; only the two split-pane directions are, mirroring
  what the menu already exposes.
