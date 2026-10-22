// Storybook's own UI theme from the system's color scheme.

import { themes } from "storybook/theming";

export const DARK_QUERY = "(prefers-color-scheme: dark)";

export const systemTheme = () =>
    globalThis.matchMedia?.(DARK_QUERY).matches ? themes.dark : themes.light;
