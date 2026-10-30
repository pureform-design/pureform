// A standalone RN row is shown as one item in an app's list, including rows whose root is a
// button or link. Keep exactly one listitem wrapper, rather than nesting a second row role.

import { testIds } from "@pureform/anatomy";
import { expect, waitFor } from "storybook/test";

import type { StoryHooks } from "../renderers/hooks";

export const extendStory: NonNullable<StoryHooks["extendStory"]> = (
    _,
    story,
) => ({
    ...story,
    play: async (context) => {
        await story.play?.(context);
        if (context.globals["renderer"] !== "native") return;
        await waitFor(() => {
            const row = context.canvasElement.querySelector(
                `[data-testid="${testIds.listItem.root}"]`,
            );
            const list = context.canvasElement.querySelector('[role="list"]');
            void expect(list).not.toBeNull();
            void expect(
                list!.querySelectorAll('[role="listitem"]'),
            ).toHaveLength(1);
            void expect(row?.closest('[role="listitem"]')?.parentElement).toBe(
                list,
            );
        });
    },
});
