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
                  // Layout can land after the scrim is found (React Native's views size late).
                  await waitFor(() => {
                      const dims = scrim.getBoundingClientRect();
                      void expect(dims.width).toBe(area.width - 2);
                      void expect(dims.height).toBe(area.height - 2);
                  });
                  // It covers the page content, and takes the pointer there, unless it lets
                  // it through (React Native's scrim doesn't take presses).
                  const page =
                      frame!.firstElementChild!.getBoundingClientRect();
                  const dims = scrim.getBoundingClientRect();
                  await expect(dims.left).toBeLessThanOrEqual(page.left);
                  await expect(dims.top).toBeLessThanOrEqual(page.top);
                  await expect(dims.right).toBeGreaterThanOrEqual(page.right);
                  await expect(dims.bottom).toBeGreaterThanOrEqual(page.bottom);
                  if (getComputedStyle(scrim).pointerEvents !== "none") {
                      const top = document.elementFromPoint(
                          area.left + 40,
                          area.top + 40,
                      );
                      await expect(top).toBe(scrim);
                  }
              },
          }
        : story;
