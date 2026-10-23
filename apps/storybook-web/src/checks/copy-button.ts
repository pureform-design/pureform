// A click copies and shows the check. The generated plays' click handler used to cancel every
// click (for links), and the copy button skips a cancelled click, so the check never showed
// (fix-storybook-5a). The clipboard is stubbed: the test is the button's, not the browser's
// permission.

import { testIds } from "@pureform/anatomy";
import { expect, spyOn, userEvent, waitFor } from "storybook/test";

import { isBaseStory, type StoryHooks } from "../renderers/hooks";

export const extendStory: NonNullable<StoryHooks["extendStory"]> = (
    name,
    story,
) =>
    isBaseStory(name)
        ? {
              ...story,
              play: async (context) => {
                  await story.play?.(context);
                  const { canvasElement } = context;
                  const button = await waitFor(() => {
                      const found = canvasElement.querySelector<HTMLElement>(
                          `[data-testid="${testIds.iconButton.root}"]`,
                      );
                      void expect(found).toBeTruthy();
                      return found!;
                  });
                  const write = spyOn(
                      navigator.clipboard,
                      "writeText",
                  ).mockResolvedValue();
                  try {
                      await userEvent.click(button);
                      await waitFor(() =>
                          expect(button.hasAttribute("data-copied")).toBe(true),
                      );
                      await expect(write).toHaveBeenCalledWith("pureform");
                  } finally {
                      write.mockRestore();
                  }
              },
          }
        : story;
