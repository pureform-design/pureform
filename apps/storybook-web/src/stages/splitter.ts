// The splitter fills its parent, and a stacked one has no height of its own to divide, so its
// stories put it in a frame with room both ways.

import { testIds } from "@pureform/anatomy";
import { expect, userEvent, waitFor } from "storybook/test";

import { isBaseStory, type StoryHooks } from "../renderers/hooks";
import { frame } from "./stage";

export const decorators = [frame({ width: "100%", height: "240px" })];

const panels = (canvas: HTMLElement) => [
    ...canvas.querySelectorAll<HTMLElement>(
        `[data-testid="${testIds.splitter.panel}"]`,
    ),
];

export const extendStory: NonNullable<StoryHooks["extendStory"]> = (
    name,
    story,
) =>
    // Every renderer draws these, React Native too: they read only the layout.
    isBaseStory(name) || name.story === "Vertical"
        ? {
              ...story,
              play: async (context) => {
                  await story.play?.(context);
                  const { canvasElement } = context;
                  const vertical = name.story === "Vertical";
                  const length = (element: HTMLElement) =>
                      vertical
                          ? element.getBoundingClientRect().height
                          : element.getBoundingClientRect().width;
                  // The panes share the frame's room along the axis (the case's play may have
                  // moved the divider a little).
                  await waitFor(() => {
                      void expect(panels(canvasElement).length).toBeGreaterThan(1);
                      for (const panel of panels(canvasElement))
                          void expect(length(panel)).toBeGreaterThan(80);
                  });
                  if (!vertical) return;
                  const before = length(panels(canvasElement)[0]!);
                  canvasElement
                      .querySelector<HTMLElement>(
                          `[data-testid="${testIds.splitter.resizeTrigger}"]`,
                      )!
                      .focus();
                  await userEvent.keyboard("{ArrowDown}");
                  await waitFor(() =>
                      expect(
                          length(panels(canvasElement)[0]!),
                      ).toBeGreaterThan(before),
                  );
              },
          }
        : story;
