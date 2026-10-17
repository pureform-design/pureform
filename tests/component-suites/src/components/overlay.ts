// What the overlay cases share: the trigger, whether the overlay shows (its trigger and surface
// agreeing), and waiting for Zag to place it, which it does a frame or two after opening.

import { userEvent } from "vitest/browser";

import type { ActOptions } from "./types";
import { byTestId } from "./types";

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** An overlay's trigger and surface, by their test ids. */
export const overlayParts = (ids: {
    readonly trigger: string;
    readonly content: string;
}) => {
    const trigger = (host: HTMLElement) =>
        byTestId<HTMLButtonElement>(host, ids.trigger);
    const content = (host: HTMLElement) => byTestId(host, ids.content);
    // Shown: the surface and its positioner aren't hidden.
    const shown = (host: HTMLElement) => {
        const surface = content(host);
        return !surface.hidden && !surface.parentElement!.hidden;
    };
    /** Whether it's open: shown, and the trigger says so, throwing if they disagree. */
    const read = (host: HTMLElement): boolean => {
        const open = shown(host);
        const expanded =
            trigger(host).getAttribute("aria-expanded") ??
            String(trigger(host).dataset.state === "open");
        if (expanded !== String(open)) {
            throw new Error(
                `the overlay ${open ? "shows" : "is hidden"}, its trigger says ${expanded}`,
            );
        }
        return open;
    };
    /** Clicks the trigger, then waits for the overlay to be placed if it opened. */
    const click = async (host: HTMLElement, options: ActOptions = {}) => {
        await userEvent.click(trigger(host), options);
        await placed(host);
    };
    /** Waits a few frames for the overlay to open and be placed. */
    const placed = async (host: HTMLElement) => {
        for (let i = 0; i < 3; i++) await frame();
        if (shown(host)) {
            await frame();
            await frame();
        }
    };
    return { trigger, content, shown, read, click, placed };
};
