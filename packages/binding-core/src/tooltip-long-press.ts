// A touch held on a tooltip's trigger shows the tooltip, as React Native's long press does: Zag's
// tooltip opens on hover and focus, and leaves touch pointers out. Once the press ends, a plain
// tooltip goes a while after; an interactive (rich) one stays for its actions. The browser's own
// long-press menu and the press's click are kept from the trigger meanwhile.

import { swallowNextClick } from "./drag-click";

/** How long a touch is held before the tooltip shows, as React Native's `delayLongPress`. */
export const TOOLTIP_LONG_PRESS_MS = 500;
/** How long a plain tooltip stays after the long press ends, as React Native's. */
export const TOOLTIP_LONG_PRESS_STAY_MS = 1500;
/** How far the touch can move before the press counts as a scroll instead. */
const SLOP = 10;
const LEAVES = ["pointerleave", "pointerout", "pointercancel"] as const;

export interface TooltipLongPressOptions {
    /** Shows or hides the tooltip. */
    readonly setOpen: (open: boolean) => void;
    /** Whether the tooltip stays after the press (the rich tooltip's actions). */
    readonly interactive: () => boolean;
    /** Whether the tooltip is disabled. A disabled trigger (`:disabled`, `data-disabled`) shows
     *  none either way. */
    readonly disabled?: (() => boolean) | undefined;
}

/** Shows the tooltip on a touch held on `trigger`; returns the cleanup. */
export const tooltipLongPress = (
    trigger: HTMLElement,
    options: TooltipLongPressOptions,
): (() => void) => {
    const doc = trigger.ownerDocument;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let start: { id: number; x: number; y: number } | undefined;
    let shown = false;
    // The touch that showed it: its leave (which follows its release) is kept from Zag.
    let pressing: number | undefined;
    const clear = () => {
        clearTimeout(timer);
        timer = undefined;
    };
    // While shown by a long press, the touch's own leave isn't Zag's to close it on (React reads
    // a leave from `pointerout`).
    const keepLeave = (event: PointerEvent) => {
        if (
            event.pointerId === pressing &&
            event.target instanceof Node &&
            trigger.contains(event.target) &&
            event.pointerType === "touch"
        ) {
            event.stopPropagation();
            // Stopped here, it won't reach the document's own listener.
            if (event.type === "pointercancel" && start) up(event);
        }
    };
    const end = () => {
        clear();
        start = undefined;
        if (!shown) return;
        if (options.interactive()) {
            shown = false;
            return;
        }
        timer = setTimeout(() => {
            shown = false;
            options.setOpen(false);
        }, TOOLTIP_LONG_PRESS_STAY_MS);
    };
    const down = (event: PointerEvent) => {
        if (
            event.pointerType !== "touch" ||
            options.disabled?.() ||
            trigger.matches(":disabled, [data-disabled]")
        )
            return;
        clear();
        pressing = undefined;
        start = { id: event.pointerId, x: event.clientX, y: event.clientY };
        const id = event.pointerId;
        timer = setTimeout(() => {
            timer = undefined;
            shown = true;
            pressing = id;
            swallowNextClick(trigger);
            options.setOpen(true);
        }, TOOLTIP_LONG_PRESS_MS);
    };
    const move = (event: PointerEvent) => {
        if (!start || event.pointerId !== start.id || shown) return;
        if (
            Math.hypot(event.clientX - start.x, event.clientY - start.y) > SLOP
        ) {
            clear();
            start = undefined;
        }
    };
    const up = (event: PointerEvent) => {
        if (start && event.pointerId === start.id) end();
    };
    const menu = (event: Event) => {
        if (start || shown) event.preventDefault();
    };
    trigger.addEventListener("pointerdown", down);
    trigger.addEventListener("pointermove", move);
    trigger.addEventListener("contextmenu", menu);
    doc.addEventListener("pointerup", up);
    doc.addEventListener("pointercancel", up);
    for (const type of LEAVES)
        doc.addEventListener(type, keepLeave, { capture: true });
    return () => {
        clear();
        trigger.removeEventListener("pointerdown", down);
        trigger.removeEventListener("pointermove", move);
        trigger.removeEventListener("contextmenu", menu);
        doc.removeEventListener("pointerup", up);
        doc.removeEventListener("pointercancel", up);
        for (const type of LEAVES)
            doc.removeEventListener(type, keepLeave, { capture: true });
    };
};
