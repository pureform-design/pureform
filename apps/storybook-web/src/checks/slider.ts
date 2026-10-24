// A click through the Interactions panel's user events (`user-event.ts`, which the story tests
// otherwise swap for Vitest's) lands where the slider is: the empty slider clicked in its middle
// holds a value, not the 0 a click with no pointer position gave (fix-storybook-4).

import { testIds } from "@pureform/anatomy";
import { expect, waitFor } from "storybook/test";

import type { StoryHooks } from "../renderers/hooks";
import { userEvent } from "../renderers/user-event";

export const extendStory: NonNullable<StoryHooks["extendStory"]> = (
    name,
    story,
) =>
    name.story === "Empty"
        ? {
              ...story,
              play: async (context) => {
                  await story.play?.(context);
                  // React Native Web's slider doesn't move for this synthetic press (the
                  // events reach its root with their position, but its responder sets no
                  // value; not traced further). Its state play's real click moves it.
                  if (context.globals["renderer"] === "native") return;
                  const { canvasElement } = context;
                  const part = (id: string) =>
                      canvasElement.querySelector<HTMLElement>(
                          `[data-testid="${id}"]`,
                      );
                  const root = await waitFor(() => {
                      const found = part(testIds.slider.root);
                      void expect(found).toBeTruthy();
                      return found!;
                  });
                  await userEvent.click(root);
                  await waitFor(() =>
                      expect(
                          Number(
                              part(testIds.slider.handle)!.getAttribute(
                                  "aria-valuenow",
                              ),
                          ),
                      ).toBeGreaterThan(0),
                  );
              },
          }
        : story;
