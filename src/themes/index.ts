import { darkTheme } from "./dark";
import { blackTheme } from "./black";
import { transparentTheme } from "./transparent";

export const THEMES = [darkTheme, blackTheme, transparentTheme] as const;
export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME_ID: ThemeId = darkTheme.id;

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}
