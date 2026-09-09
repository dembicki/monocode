const CONTROL_SELECTOR = "[data-model-control]";

export function toggleValueForArrow(key: string): string | null {
  if (key === "ArrowUp") return "false";
  if (key === "ArrowDown") return "true";
  return null;
}

export function navigateModelControl(
  current: HTMLElement | null,
  reverse: boolean,
) {
  const toolbar = current?.closest<HTMLElement>(".composer-toolbar");
  if (!toolbar || !current) return false;

  const controls = Array.from(
    toolbar.querySelectorAll<HTMLElement>(CONTROL_SELECTOR),
  ).filter((control) => !control.matches(":disabled, [aria-disabled='true']"));
  const index = controls.indexOf(current);
  if (index < 0 || controls.length < 2) return false;

  const offset = reverse ? -1 : 1;
  const next = controls[(index + offset + controls.length) % controls.length];
  next.focus();
  if (next.hasAttribute("aria-haspopup")) next.click();
  return true;
}
