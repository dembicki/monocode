import type { ThemeDefinition } from "./types";

export const darkTheme = {
  id: "dark",
  label: "Dark",
  description: "Solid ink-and-violet surfaces with no window transparency.",
} as const satisfies ThemeDefinition;
