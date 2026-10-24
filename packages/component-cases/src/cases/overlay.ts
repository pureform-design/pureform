// What the overlay cases share: the trigger, whether the overlay shows (its trigger and surface
// agreeing), and waiting for it to be placed, which Zag does a frame or two after opening, and for
// it to finish entering. Read through ARIA, so every renderer's overlay reads the same: the trigger
// by its role and name and its `aria-expanded`, the surface by its role anywhere in the document
// (React Native Web's modals draw at the end of the body).

import { animationsDone } from "../animations";
import { allByRole, byRole } from "../aria";
import type { ActOptions, OverlayCase } from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** How the cases find an overlay's trigger and surface without test ids. */
export interface OverlayAria {
    /** The surface's role: `dialog`, `menu`, `tooltip`, … */
    readonly role: string;
    /** The trigger's accessible name: it's the button with this name. */
    readonly name?: string | RegExp;
    /** Or the trigger itself, when it isn't a button found by its name. */
    readonly trigger?: (host: HTMLElement) => HTMLElement;
    /** `false` for a trigger that doesn't say `aria-expanded` (a search view's bar, which
     *  stays where it is under the view): the state is whether the surface shows and isn't
     *  `leaving`. */
    readonly expands?: false;
    /** With `expands: false`, whether a surface still drawn is on its way out. */
    readonly leaving?: (surface: HTMLElement) => boolean;
}

/** The button inside `host` that says whether what it opens is open (`aria-expanded`): a FAB
 *  menu's FAB, a split button's trailing button; among several, the one with `aria-haspopup`. */
export const expandingTrigger = (host: HTMLElement): HTMLElement => {
    const expanding = allByRole(host, "button").filter((element) =>
        element.hasAttribute("aria-expanded"),
    );
    // Among several (a calendar's month and year buttons), the one that opens a popup.
    const found =
        expanding.length > 1
            ? expanding.filter((element) =>
                  element.hasAttribute("aria-haspopup"),
              )
            : expanding;
    if (found.length !== 1) {
        throw new Error(`${found.length} buttons say aria-expanded`);
    }
    return found[0]!;
};

/** What `find` finds once it's drawn, waiting up to 30 frames: a list's options a few frames
 *  after it opens. */
export const drawn = async <T>(find: () => T): Promise<T> => {
    for (let i = 0; ; i++) {
        try {
            return find();
        } catch (error) {
            if (i >= 30) throw error;
            await frame();
        }
    }
};

/** Whether an element is drawn: not hidden, nor inside something hidden or not displayed. */
const visible = (element: HTMLElement) =>
    element.checkVisibility({ visibilityProperty: true });

/** An overlay's trigger and surface: by their role and name (`aria`), and the web's by their
 *  test ids for the overlays suite, which runs in the web bindings alone. */
export const overlayParts = (
    ids: {
        readonly trigger: string;
        readonly content: string;
    },
    aria: OverlayAria,
) => {
    const trigger = (host: HTMLElement): HTMLElement =>
        aria.trigger
            ? aria.trigger(host)
            : byRole(host, "button", { name: aria.name });
    const content = (host: HTMLElement) => byTestId(host, ids.content);
    /** The surfaces with the overlay's role that are drawn. */
    const surfaces = (host: HTMLElement) =>
        allByRole(host.ownerDocument.body, aria.role).filter(visible);
    /** Shown: a surface with its role is drawn. */
    const shown = (host: HTMLElement) => surfaces(host).length > 0;
    /** Whether it's open: the trigger's `aria-expanded`, throwing if it's open and no surface
     *  shows. A closed one's surface may still show while it leaves. */
    const read = (host: HTMLElement): boolean => {
        if (aria.expands === false) {
            return surfaces(host).some((surface) => !aria.leaving?.(surface));
        }
        const expanded = trigger(host).getAttribute("aria-expanded");
        if (expanded !== "true" && expanded !== "false") {
            throw new Error(`aria-expanded is ${String(expanded)}`);
        }
        const open = expanded === "true";
        if (open && !shown(host)) {
            throw new Error(
                `the trigger says it's open, but no ${aria.role} shows`,
            );
        }
        return open;
    };
    /** Clicks the trigger, then waits for the overlay to be placed if it opened. */
    const click = async (host: HTMLElement, options: ActOptions = {}) => {
        await userEvent.click(trigger(host), options);
        await placed(host);
    };
    /** Waits a few frames for the overlay to open and be placed, then for it to finish
     *  entering. */
    const placed = async (host: HTMLElement) => {
        for (let i = 0; i < 3; i++) await frame();
        if (shown(host)) {
            await frame();
            await frame();
            await animationsDone();
        }
    };
    /** How it comes and goes: the surface, and its positioner (with `parts`, others). */
    const overlay = (
        extra: Partial<OverlayCase> & {
            readonly also?: (host: HTMLElement) => readonly HTMLElement[];
        } = {},
    ): OverlayCase => {
        const { also, ...rest } = extra;
        return {
            surface: content,
            parts: (host) => [
                content(host).parentElement!,
                ...(also?.(host) ?? []),
            ],
            ...rest,
        };
    };
    return { trigger, content, shown, read, click, placed, overlay };
};

/** A tooltip's state: its trigger described by it (`aria-describedby`), throwing if it's
 *  described and no tooltip shows. A hidden one may still show while it leaves. */
export const tooltipRead =
    (parts: Pick<ReturnType<typeof overlayParts>, "trigger" | "shown">) =>
    (host: HTMLElement): boolean => {
        const described = parts.trigger(host).hasAttribute("aria-describedby");
        if (described && !parts.shown(host)) {
            throw new Error("the trigger is described, but no tooltip shows");
        }
        return described;
    };
