// The ripple draws in a layer over a surface and grows from each press on it, so its stories sit
// in a surface to press: the frame, which the ripple's `getSurfaceEl` names (by default the
// layer's parent, which is the provider's `display: contents` element here, and gets no press
// of its own).

import { expect, waitFor } from "storybook/test";

import { isBaseStory, type StoryHooks } from "../renderers/hooks";
import { STAGE_ATTRIBUTE, stage, text } from "./stage";

export const args = {
    getSurfaceEl: (layer: HTMLElement) =>
        layer.closest<HTMLElement>(`[${STAGE_ATTRIBUTE}]`),
};

export const decorators = [
    stage(
        {
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            userSelect: "none",
            background: "color-mix(in srgb, currentColor 6%, transparent)",
        },
        () => text("span", "Press anywhere on this surface"),
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
                  await expect(frame).not.toBeNull();
                  const layer = await waitFor(() => {
                      const found = frame!.querySelector<HTMLElement>(
                          "[data-ripple-layer]",
                      );
                      void expect(found).not.toBeNull();
                      return found!;
                  });
                  // The layer fills the surface the press is read on.
                  await expect(args.getSurfaceEl(layer)).toBe(frame);
                  const area = frame!.getBoundingClientRect();
                  const filled = layer.getBoundingClientRect();
                  await expect(filled.width).toBe(area.width - 2);
                  await expect(filled.height).toBe(area.height - 2);
                  // A press anywhere on the frame draws a ripple in the layer.
                  const x = area.left + 40;
                  const y = area.top + 40;
                  const hit = document.elementFromPoint(x, y)!;
                  await expect(frame!.contains(hit)).toBe(true);
                  hit.dispatchEvent(
                      new PointerEvent("pointerdown", {
                          bubbles: true,
                          clientX: x,
                          clientY: y,
                          pointerId: 1,
                          isPrimary: true,
                          button: 0,
                          buttons: 1,
                      }),
                  );
                  await waitFor(() =>
                      expect(
                          layer.querySelector("[data-ripple]"),
                      ).not.toBeNull(),
                  );
                  hit.dispatchEvent(
                      new PointerEvent("pointerup", {
                          bubbles: true,
                          clientX: x,
                          clientY: y,
                          pointerId: 1,
                          isPrimary: true,
                      }),
                  );
              },
          }
        : story;
