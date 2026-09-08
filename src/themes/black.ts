import type { ThemeDefinition } from "./types";

export const blackTheme = {
  id: "black",
  label: "Black",
  description: "True black surfaces with high-contrast text and no color tint.",
} as const satisfies ThemeDefinition;
