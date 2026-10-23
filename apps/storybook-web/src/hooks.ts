// The shared hook: applies to every story in every renderer, before the renderer's hook and the
// component's (see the README). The generated stories import it; the codegen reads
// `transformSource` from it too, so nothing here may touch the page while it's imported.

import type { Decorator } from "@storybook/html-vite";

import type { TransformSource } from "./renderers/hooks";
import { storyTheme } from "./renderers/multi-render";

/** The page's scheme from the `scheme` global, as the class the Panda target's dark condition
 *  reads; React Native takes it from its provider's `scheme` instead. `system` sets no class:
 *  the CSS's `prefers-color-scheme` query then decides, live. */
const withScheme: Decorator = (story, context) => {
    const { scheme } = storyTheme(context.globals);
    const root = document.documentElement;
    root.classList.toggle("dark", scheme === "dark");
    root.classList.toggle("light", scheme === "light");
    return story();
};

/** Room for an overlay: `parameters.pureform.height` (set by the codegen for a component whose
 *  case opens one) gives the canvas a minimum height, so a menu or a dialog opens inside it.
 *  `parameters.pureform.place: "bottom-end"` puts the story at the canvas's bottom end corner, as
 *  an app places a FAB menu, whose list opens above it. `parameters.pureform.width` fixes the
 *  canvas's width, for a component that sizes itself from it (the carousel), at the component
 *  suites' page width, so it lays out as it does there. */
const withHeight: Decorator = (story, context) => {
    const { height, width, place } =
        (context.parameters["pureform"] as
            | { height?: number; width?: number; place?: "bottom-end" }
            | undefined) ?? {};
    const el = story() as HTMLElement;
    if (!height && !width && !place) return el;
    const frame = document.createElement("div");
    frame.dataset["pfCanvas"] = "";
    if (height) frame.style.minHeight = `${height}px`;
    if (width) frame.style.width = `${width}px`;
    if (place === "bottom-end") {
        Object.assign(frame.style, {
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "flex-end",
        });
    }
    frame.append(el);
    return frame;
};

export const decorators = [withScheme, withHeight];

export const args = { disabled: false };

/** Marks the generated file as such. */
export const transformSource: TransformSource = (component, source) =>
    `// Generated from stories.config.ts (${component}) by scripts/generate-stories.ts. Don't edit:\n// write a hand-written story in src/stories/ instead, which replaces this file.\n\n${source}`;
