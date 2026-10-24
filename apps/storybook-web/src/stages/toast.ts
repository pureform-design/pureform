// The toast's case gives data, not props: `toasts` go into a toaster (`src/<renderer>/scenes.ts`),
// beside a button that adds a toast each press. Its `Opened` stories draw them, so their play
// checks a toast is drawn for each; the base stories' play adds one with the button and swipes
// it away.

import { testIds } from "@pureform/anatomy";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { isBaseStory, type StoryHooks } from "../renderers/hooks";
import { ADD_TOAST_LABEL } from "../renderers/scenes";

const ROOT = `[data-testid="${testIds.toast.root}"]`;

/** A sideways drag of `by` pixels on `element`, by a mouse: pointer events, which the web's
 *  toasts follow, and mouse events, which React Native Web's responder (its pan) follows. */
const swipe = (element: HTMLElement, by: number) => {
    const box = element.getBoundingClientRect();
    const y = box.top + box.height / 2;
    const x = box.left + 40;
    const at = (type: string, clientX: number, buttons: number) => {
        const init = {
            bubbles: true,
            cancelable: true,
            button: 0,
            buttons,
            clientX,
            clientY: y,
        };
        element.dispatchEvent(
            new PointerEvent(`pointer${type}`, {
                ...init,
                pointerId: 9,
                pointerType: "mouse",
                isPrimary: true,
            }),
        );
        element.dispatchEvent(new MouseEvent(`mouse${type}`, init));
    };
    at("down", x, 1);
    for (let step = 1; step <= 6; step++) at("move", x + (by * step) / 6, 1);
    at("up", x + by, 0);
};

/** Whether a toast shows and isn't leaving: the web's say `data-state="open"`; React Native's
 *  have no state of their own and are gone once dismissed. */
const isOpen = (toast: HTMLElement) =>
    toast.isConnected &&
    (!toast.hasAttribute("data-state") ||
        toast.getAttribute("data-state") === "open");

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
                            ...canvasElement.querySelectorAll<HTMLElement>(
                                ROOT,
                            ),
                        ].filter(isOpen);
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
                    await waitFor(() => expect(isOpen(added)).toBe(false));
                },
            }
          : story;
