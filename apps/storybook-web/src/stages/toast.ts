// The toast's case gives data, not props: `toasts` go into a toaster (`src/<renderer>/scenes.ts`).
// Its `Opened` stories draw them, so their play checks a toast is drawn for each.

import { testIds } from "@pureform/anatomy";
import { expect, waitFor } from "storybook/test";

import type { StoryHooks } from "../renderers/hooks";

export const extendStory: NonNullable<StoryHooks["extendStory"]> = (
    name,
    story,
) =>
    name.story.startsWith("Opened")
        ? {
              ...story,
              play: async ({ args, canvasElement }) => {
                  const toasts = (args["toasts"] as readonly object[]).length;
                  await expect(toasts).toBeGreaterThan(0);
                  await waitFor(() =>
                      expect(
                          canvasElement.querySelectorAll(
                              `[data-testid="${testIds.toast.root}"]`,
                          ),
                      ).toHaveLength(toasts),
                  );
              },
          }
        : story;
