// A badge keeps its own size in every renderer: React Native's lays out in a flex column, where
// it stretched across the canvas (fix-components-2).

import { testIds } from "@pureform/anatomy";
import { expect, waitFor } from "storybook/test";

import { isBaseStory, type StoryHooks } from "../renderers/hooks";

export const extendStory: NonNullable<StoryHooks["extendStory"]> = (
    name,
    story,
) =>
    isBaseStory(name) || name.story === "LongCount"
        ? {
              ...story,
              play: async (context) => {
                  await story.play?.(context);
                  await waitFor(() => {
                      const badge = context.canvasElement.querySelector(
                          `[data-testid="${testIds.badge.root}"]`,
                      );
                      void expect(
                          badge!.getBoundingClientRect().width,
                      ).toBeLessThan(48);
                  });
              },
          }
        : story;
