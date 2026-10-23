// A disabled switch doesn't morph: its handle keeps its size while pressed. The root (a label)
// still matches `:active` over a disabled input, which grew the handle (fix-components-2).

import { testIds } from "@pureform/anatomy";
import { expect, userEvent, waitFor } from "storybook/test";

import type { StoryHooks } from "../renderers/hooks";

export const extendStory: NonNullable<StoryHooks["extendStory"]> = (
    name,
    story,
) =>
    name.story === "Disabled" || name.story === "DisabledAndOn"
        ? {
              ...story,
              play: async (context) => {
                  await story.play?.(context);
                  // React Native's disabled switch takes no pointer at all.
                  if (context.globals["renderer"] === "native") return;
                  const { canvasElement } = context;
                  const part = (id: string) =>
                      canvasElement.querySelector<HTMLElement>(
                          `[data-testid="${id}"]`,
                      );
                  const handle = await waitFor(() => {
                      const found = part(testIds.switchControl.handle);
                      void expect(found).toBeTruthy();
                      return found!;
                  });
                  const size = handle.getBoundingClientRect().width;
                  await userEvent.pointer({
                      keys: "[MouseLeft>]",
                      target: part(testIds.switchControl.root)!,
                  });
                  // Past the handle's spring, had it moved.
                  await new Promise((resolve) => setTimeout(resolve, 400));
                  await expect(handle.getBoundingClientRect().width).toBe(size);
                  await userEvent.pointer({ keys: "[/MouseLeft]" });
              },
          }
        : story;
