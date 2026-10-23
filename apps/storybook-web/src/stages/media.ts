// Media fills its container's width, so on its own it takes the canvas's whole width (a portrait
// picture then runs far past the screen). Its stories put it in a card-wide frame, the way
// Material shows media inside a card.

import { testIds } from "@pureform/anatomy";
import { expect, waitFor } from "storybook/test";

import { isBaseStory, type StoryHooks } from "../renderers/hooks";
import { frame } from "./stage";

export const decorators = [frame({ width: "320px" })];

export const extendStory: NonNullable<StoryHooks["extendStory"]> = (
    name,
    story,
) =>
    isBaseStory(name)
        ? {
              ...story,
              // It fills the frame's width at the picture's own proportions (40×30), on every
              // renderer, React Native's too.
              play: async (context) => {
                  await story.play?.(context);
                  const { canvasElement } = context;
                  await waitFor(() => {
                      const media = canvasElement.querySelector<HTMLElement>(
                          `[data-testid="${testIds.media.root}"]`,
                      );
                      const box = media!.getBoundingClientRect();
                      void expect(box.width).toBe(320);
                      void expect(box.height).toBeCloseTo(240, 0);
                  });
              },
          }
        : story;
