import type { ThemeDefinition } from "./types";

export const transparentTheme = {
  id: "transparent",
  label: "Transparent",
  description: "The original desktop glass and translucency treatment.",
} as const satisfies ThemeDefinition;
