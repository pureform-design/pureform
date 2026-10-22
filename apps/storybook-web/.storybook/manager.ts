// The manager (sidebar, toolbar, panels) follows the system's color scheme, and switches live
// when it changes.

import { addons } from "storybook/manager-api";

import { DARK_QUERY, systemTheme } from "./system-theme";

addons.setConfig({ theme: systemTheme() });
matchMedia(DARK_QUERY).addEventListener("change", () =>
    addons.setConfig({ theme: systemTheme() }),
);
