// A stage for a component that acts on what's around it: a frame, positioned, that the story's
// element sits in, with content of its own. The ripple needs a surface to press and the scrim
// content to dim; neither draws anything on its own. Used by the components' hook modules
// (`ripple.ts`, `scrim.ts`).

import type { Decorator } from "@storybook/html-vite";

/** The attribute the ripple's `getSurfaceEl` looks for. */
export const STAGE_ATTRIBUTE = "data-pf-stage";

/** A frame around the story's element, with `content` before it (so it's behind a layer that
 *  stacks above it). The frame is positioned, so an absolutely placed layer fills it. */
export const stage = (
    style: Partial<CSSStyleDeclaration>,
    content: () => HTMLElement,
): Decorator => {
    return (story) => {
        const el = story() as HTMLElement;
        const frame = document.createElement("div");
        frame.setAttribute(STAGE_ATTRIBUTE, "");
        Object.assign(frame.style, {
            position: "relative",
            boxSizing: "border-box",
            width: "320px",
            height: "180px",
            overflow: "hidden",
            borderRadius: "16px",
            border: "1px solid color-mix(in srgb, currentColor 20%, transparent)",
            ...style,
        });
        frame.append(content(), el);
        return frame;
    };
};

/** An element with text, for a stage's content. */
export const text = (
    tag: string,
    content: string,
    style: Partial<CSSStyleDeclaration> = {},
): HTMLElement => {
    const node = document.createElement(tag);
    node.textContent = content;
    Object.assign(node.style, { margin: "0", ...style });
    return node;
};
