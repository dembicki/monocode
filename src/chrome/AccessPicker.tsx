import { ChevronDown, Lock, LockOpen, Pencil, Sparkles } from "./icons";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  RUNTIME_MODE_HINT,
  RUNTIME_MODE_LABEL,
  RUNTIME_MODES,
  type RuntimeMode,
} from "../lib/session";
import { Popover } from "./Popover";
import { navigateModelControl } from "./modelControlNavigation";

type Props = {
  value: RuntimeMode;
  onChange: (mode: RuntimeMode) => void;
  onClose?: () => void;
};

const MENU_WIDTH = 288;

const ICONS: Record<RuntimeMode, typeof Lock> = {
  supervised: Lock,
  "auto-accept-edits": Pencil,
  auto: Sparkles,
  "full-access": LockOpen,
};

export function AccessPicker({ value, onChange, onClose }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() =>
    Math.max(0, RUNTIME_MODES.indexOf(value)),
  );
  const root = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const Icon = ICONS[value];

  const dismiss = (restore: boolean) => {
    setOpen(false);
    if (restore) onCloseRef.current?.();
  };

  useEffect(() => {
    setActive(Math.max(0, RUNTIME_MODES.indexOf(value)));
  }, [value]);

  const pick = (mode: RuntimeMode) => {
    onChange(mode);
    dismiss(true);
  };

  const onPickerKey = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === "Tab") {
      const trigger = root.current?.querySelector<HTMLElement>(
        "[data-model-control]",
      );
      if (navigateModelControl(trigger ?? null, e.shiftKey)) {
        e.preventDefault();
        dismiss(false);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) =>
        Math.min(
          RUNTIME_MODES.length - 1,
          open ? i + 1 : RUNTIME_MODES.indexOf(value) + 1,
        ),
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) =>
        Math.max(0, open ? i - 1 : RUNTIME_MODES.indexOf(value) - 1),
      );
      return;
    }
    if (e.key === "Enter" && open) {
      e.preventDefault();
      const mode = RUNTIME_MODES[active];
      if (mode) pick(mode);
    }
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        title={RUNTIME_MODE_HINT[value]}
        aria-label={RUNTIME_MODE_LABEL[value]}
        aria-expanded={open}
        aria-haspopup="listbox"
        data-model-control
        onMouseDown={(e) => e.preventDefault()}
        onKeyDown={onPickerKey}
        onClick={() => {
          if (open) {
            dismiss(true);
            return;
          }
          setOpen(true);
        }}
        className={`flex h-6.5 max-w-52 items-center gap-1 rounded-md px-1.5 outline-none ${
          open
            ? "bg-content/10 text-content"
            : "bg-content/10 text-content hover:bg-content/15"
        }`}
      >
        <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
        <span className="min-w-0 truncate text-[11px]">
          {RUNTIME_MODE_LABEL[value]}
        </span>
        <ChevronDown
          className={`size-3 shrink-0 text-content/50 ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
      </button>
      {open ? (
        <Popover
          anchor={root}
          side="top"
          width={MENU_WIDTH}
          autoFocus
          onDismiss={(reason) => dismiss(reason === "escape")}
          role="listbox"
          aria-label="Access"
          data-access-picker
          tabIndex={-1}
          onKeyDown={onPickerKey}
          className="p-1"
        >
          {RUNTIME_MODES.map((mode, index) => {
            const ModeIcon = ICONS[mode];
            const selected = mode === value;
            const highlighted = index === active;
            return (
              <button
                key={mode}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(mode)}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left ${
                  highlighted || selected
                    ? "bg-content/10 text-content"
                    : "text-content hover:bg-content/5"
                }`}
              >
                <ModeIcon
                  className="mt-0.5 size-3.5 shrink-0 text-content/70"
                  strokeWidth={1.75}
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium leading-5">
                    {RUNTIME_MODE_LABEL[mode]}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-content/50">
                    {RUNTIME_MODE_HINT[mode]}
                  </span>
                </span>
              </button>
            );
          })}
        </Popover>
      ) : null}
    </div>
  );
}
