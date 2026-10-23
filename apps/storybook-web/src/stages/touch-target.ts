// The touch target is an invisible box that grows a small element's hit area, so on its own it
// draws nothing. Its stories put it in a small positioned element (an 18px dot, smaller than the
// theme's minimum target) and outline the target's area around it, the way the guidelines show it.

import { testIds } from "@pureform/anatomy";
import type { Decorator } from "@storybook/html-vite";
import { expect, waitFor } from "storybook/test";

import type { StoryHooks } from "../renderers/hooks";
import { STAGE_ATTRIBUTE, text } from "./stage";

/** The small element's size, in px. */
export const DOT = 18;

const DOT_ATTRIBUTE = "data-pf-dot";

const TARGET = `[${STAGE_ATTRIBUTE}] [data-testid="${testIds.touchTarget.root}"]`;

const highlight = (): HTMLStyleElement => {
    const style = document.createElement("style");
    style.textContent = `${TARGET} {
    outline: 1px dashed currentColor;
    background: color-mix(in srgb, currentColor 12%, transparent);
}`;
    return style;
};

export const decorators: Decorator[] = [
    (story) => {
        const el = story() as HTMLElement;
        el.setAttribute(DOT_ATTRIBUTE, "");
        Object.assign(el.style, {
            position: "relative",
            width: `${DOT}px`,
            height: `${DOT}px`,
            borderRadius: "50%",
            background: "currentColor",
        });
        const frame = document.createElement("div");
        frame.setAttribute(STAGE_ATTRIBUTE, "");
        Object.assign(frame.style, {
            display: "grid",
            justifyItems: "center",
            gap: "40px",
            padding: "32px",
        });
        frame.append(
            highlight(),
            el,
            text(
                "span",
                `The dashed area is the touch target around an ${DOT}px element.`,
            ),
        );
        return frame;
    },
];

export const extendStory: NonNullable<StoryHooks["extendStory"]> = (
    _name,
    story,
) => ({
    ...story,
    // The target is centred on the element and larger than it, and the stage draws its area.
    play: async (context) => {
        await story.play?.(context);
        const { canvasElement } = context;
        await waitFor(() => {
            const target = canvasElement.querySelector<HTMLElement>(
                `[data-testid="${testIds.touchTarget.root}"]`,
            );
            void expect(target).not.toBeNull();
            const box = target!.getBoundingClientRect();
            const dot = canvasElement
                .querySelector(`[${DOT_ATTRIBUTE}]`)!
                .getBoundingClientRect();
            void expect(box.width).toBeGreaterThan(DOT);
            void expect(box.height).toBeGreaterThan(DOT);
            void expect(box.left + box.width / 2).toBeCloseTo(
                dot.left + dot.width / 2,
                0,
            );
            void expect(getComputedStyle(target!).outlineStyle).toBe(
                "dashed",
            );
        });
    },
});
