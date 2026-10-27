// The FAB menu's hook: its opened stories check that the list, which opens above the FAB, is
// inside the canvas (the story sits at the canvas's bottom end, `stories.config.ts`).

import type { StoryObj } from "@storybook/html-vite";
import { expect, waitFor } from "storybook/test";

import type { StoryName } from "./renderers/hooks";

const inView = async (canvas: HTMLElement) => {
    const list = await waitFor(async () => {
        const found = canvas.querySelector<HTMLElement>(
            '[data-testid="pf-fab-menu-list"]',
        );
        await expect(found).not.toBeNull();
        return found!;
    });
    await waitFor(async () => {
        const box = list.getBoundingClientRect();
        await expect(box.height).toBeGreaterThan(0);
        await expect(box.top).toBeGreaterThanOrEqual(0);
        await expect(box.left).toBeGreaterThanOrEqual(0);
        await expect(box.right).toBeLessThanOrEqual(
            document.documentElement.clientWidth,
        );
    });
};

export const extendStory = (name: StoryName, story: StoryObj): StoryObj =>
    name.story.startsWith("Opened") && !story.play
        ? { ...story, play: ({ canvasElement }) => inView(canvasElement) }
        : story;
