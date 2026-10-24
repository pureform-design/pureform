// A click copies and shows it did: the accessible name says so (with the check icon). The
// generated plays' click handler used to cancel every click (for links), and the copy button
// skips a cancelled click, so it never showed (fix-storybook-5a). The clipboard is stubbed: the
// test is the button's, not the browser's permission. Read through ARIA, so every renderer runs it.

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
                          expect(button.getAttribute("aria-label")).toBe(
                              "Copied to clipboard",
                          ),
                      );
                      await expect(write).toHaveBeenCalledWith("pureform");
                  } finally {
                      write.mockRestore();
                  }
              },
          }
        : story;
