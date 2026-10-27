// A stage for a component that acts on what's around it: a frame, positioned, that the story's
// element sits in, with content of its own. The ripple needs a surface to press and the scrim
// content to dim; neither draws anything on its own. Used by the components' hook modules
// (`ripple.ts`, `scrim.ts`).

import type { Decorator } from "@storybook/html-vite";

/** Inline style properties, as an object literal gives them: a declaration's fields without the
 *  iteration over its property names, which spreading would ignore. */
type StyleProps = Partial<Omit<CSSStyleDeclaration, typeof Symbol.iterator>>;

/** The attribute the ripple's `getSurfaceEl` looks for. */
export const STAGE_ATTRIBUTE = "data-pf-stage";

/** A frame around the story's element, with `content` before it (so it's behind a layer that
 *  stacks above it). The frame is positioned, so an absolutely placed layer fills it. */
export const stage = (
    style: StyleProps,
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
    style: StyleProps = {},
): HTMLElement => {
    const node = document.createElement(tag);
    node.textContent = content;
    Object.assign(node.style, { margin: "0", ...style });
    return node;
};

/** A frame of a given size that the story's element fills, for a component that fills its
 *  parent: without one it takes the canvas's whole width, or no height at all. */
export const frame =
    (style: StyleProps): Decorator =>
    (story) => {
        const el = story() as HTMLElement;
        const box = document.createElement("div");
        box.setAttribute(STAGE_ATTRIBUTE, "");
        Object.assign(box.style, {
            display: "flex",
            flexDirection: "column",
            ...style,
        });
        Object.assign(el.style, {
            display: "flex",
            flexDirection: "column",
            flexGrow: "1",
            minHeight: "0",
        });
        box.append(el);
        return box;
    };
