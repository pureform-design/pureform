// The toast's case gives data, not props: `toasts` go into a toaster (`src/<renderer>/scenes.ts`),
// beside a button that adds a toast each press. Its `Opened` stories draw them, so their play
// checks a toast is drawn for each; the base stories' play adds one with the button and swipes
// it away.

import { testIds } from "@pureform/anatomy";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { isBaseStory, type StoryHooks } from "../renderers/hooks";
import { ADD_TOAST_LABEL } from "../renderers/scenes";

const ROOT = `[data-testid="${testIds.toast.root}"]`;

/** A sideways drag of `by` pixels on `element`, by a mouse. */
const swipe = (element: HTMLElement, by: number) => {
    const box = element.getBoundingClientRect();
    const y = box.top + box.height / 2;
    const x = box.left + 40;
    const at = (type: string, clientX: number) =>
        element.dispatchEvent(
            new PointerEvent(type, {
                bubbles: true,
                cancelable: true,
                pointerId: 9,
                pointerType: "mouse",
                isPrimary: true,
                button: 0,
                clientX,
                clientY: y,
            }),
        );
    at("pointerdown", x);
    for (let step = 1; step <= 6; step++) at("pointermove", x + (by * step) / 6);
    at("pointerup", x + by);
};

export const extendStory: NonNullable<StoryHooks["extendStory"]> = (
    name,
    story,
) =>
    name.story.startsWith("Opened")
        ? {
              ...story,
              play: async ({ args, canvasElement }) => {
                  const toasts = (args["toasts"] as readonly object[]).length;
                  await expect(toasts).toBeGreaterThan(0);
                  await waitFor(() =>
                      expect(canvasElement.querySelectorAll(ROOT)).toHaveLength(
                          toasts,
                      ),
                  );
              },
          }
        : isBaseStory(name)
          ? {
                ...story,
                play: async (context) => {
                    await story.play?.(context);
                    const { canvasElement } = context;
                    const open = () =>
                        [
                            ...canvasElement.querySelectorAll<HTMLElement>(ROOT),
                        ].filter(
                            (toast) =>
                                toast.getAttribute("data-state") === "open",
                        );
                    const before = open().length;
                    await userEvent.click(
                        await within(canvasElement).findByRole("button", {
                            name: ADD_TOAST_LABEL,
                        }),
                    );
                    const added = await waitFor(() => {
                        const now = open();
                        void expect(now).toHaveLength(before + 1);
                        return now.find((toast) =>
                            toast.textContent?.includes("Toast 1"),
                        )!;
                    });
                    // Past half its width: it goes, and closes.
                    swipe(added, added.offsetWidth * 0.75);
                    await waitFor(() =>
                        expect(added.getAttribute("data-state")).not.toBe(
                            "open",
                        ),
                    );
                },
            }
          : story;
