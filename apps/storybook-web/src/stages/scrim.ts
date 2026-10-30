// The scrim dims what's behind it, and fills its positioned container, so its stories put it over
// page content in a frame.

import { testIds } from "@pureform/anatomy";
import { expect, waitFor } from "storybook/test";

import { isBaseStory, type StoryHooks } from "../renderers/hooks";
import { STAGE_ATTRIBUTE, stage, text } from "./stage";

export const decorators = [
    stage(
        { padding: "16px" },
        () => {
            const page = document.createElement("div");
            page.append(
                text("h3", "Page content", { fontSize: "20px" }),
                text(
                    "p",
                    "The scrim dims this text, and whatever else sits behind a modal surface.",
                    { marginTop: "8px" },
                ),
            );
            return page;
        },
        { fill: true },
    ),
];

export const extendStory: NonNullable<StoryHooks["extendStory"]> = (
    name,
    story,
) =>
    isBaseStory(name)
        ? {
              ...story,
              play: async ({ canvasElement }) => {
                  const frame = canvasElement.querySelector<HTMLElement>(
                      `[${STAGE_ATTRIBUTE}]`,
                  );
                  const scrim = await waitFor(() => {
                      const found = frame?.querySelector<HTMLElement>(
                          `[data-testid="${testIds.scrim.root}"]`,
                      );
                      void expect(found).toBeTruthy();
                      return found!;
                  });
                  // It covers the page content it dims, which is under it at its center.
                  const area = frame!.getBoundingClientRect();
                  const dims = scrim.getBoundingClientRect();
                  await expect(dims.width).toBe(area.width - 2);
                  await expect(dims.height).toBe(area.height - 2);
                  const top = document.elementFromPoint(
                      area.left + 40,
                      area.top + 40,
                  );
                  await expect(top).toBe(scrim);
              },
          }
        : story;
