// The shared hook: applies to every story in every renderer, before the renderer's hook and the
// component's (see the README). The generated stories import it; the codegen reads
// `transformSource` from it too, so nothing here may touch the page while it's imported.

import type { Decorator } from "@storybook/html-vite";

import type { TransformSource } from "./renderers/hooks";
import { parseTheme } from "./renderers/multi-render";

/** The page's scheme from the `theme` global, as the class the Panda target's dark condition
 *  reads; React Native takes it from its provider's `scheme` instead. */
const withScheme: Decorator = (story, context) => {
    const { scheme } = parseTheme(context.globals["theme"]);
    const root = document.documentElement;
    root.classList.toggle("dark", scheme === "dark");
    root.classList.toggle("light", scheme === "light");
    return story();
};

export const decorators = [withScheme];

export const args = { disabled: false };

/** Marks the generated file as such. */
export const transformSource: TransformSource = (component, source) =>
    `// Generated from stories.config.ts (${component}) by scripts/generate-stories.ts. Don't edit:\n// write a hand-written story in src/stories/ instead, which replaces this file.\n\n${source}`;
