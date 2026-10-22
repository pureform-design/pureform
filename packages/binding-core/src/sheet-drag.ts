// Dragging a bottom sheet down by its drag handle: the sheet follows the pointer down (never up
// past where it rests), and a drag past a quarter of its height, or a quick flick, closes it,
// leaving from where the drag let go of it. Shorter drags, and a close the app refuses, put it
// back. An app asked whether to close (`onClose`) may answer later: the sheet holds where it was
// let go until then. The press that ends a real drag doesn't also count as a click on the
// handle, so a handle that closes on a press closes only once.

import { swallowNextClick } from "./drag-click";

/** How far down, as a share of the sheet's height, a drag closes it. */
export const SHEET_DISMISS_SHARE = 0.25;
/** How fast, in pixels per millisecond, a downward flick closes it however short. */
export const SHEET_FLICK_SPEED = 0.5;
// Moves shorter than this are a press, not a drag.
const SLOP = 4;

/** Lets `handle` drag `sheet` down (give the handle `sheetDragHandleLayout` too, so touch moves
 *  drag rather than scroll), calling `dismiss` when a drag should close it. Given `onClose`, it
 *  asks first: the sheet holds where it was let go until the answer, then leaves on `true` and
 *  settles back on `false` (or a rejection). Returns what stops it. */
export const dragToDismiss = (
    handle: HTMLElement,
    sheet: () => HTMLElement | null | undefined,
    dismiss: () => void,
    onClose?: () => boolean | Promise<boolean>,
): (() => void) => {
    let start: { y: number; time: number; id: number } | undefined;
    let offset = 0;
    let dragged = false;
    // A drag ends with a click on the handle; it was a drag, not a press.
    let swallow: (() => void) | undefined;

    const move = (y: number) => {
        offset = Math.max(0, y - start!.y);
        if (offset > SLOP) dragged = true;
        const surface = sheet();
        if (surface && dragged) {
            surface.style.translate = `0 ${offset}px`;
            surface.style.transition = "none";
        }
    };
    // Counts the questions asked, so an answer after another drag (or after it stops) is moot.
    let asking = 0;
    let watching: MutationObserver | undefined;
    let checking = 0;
    const stopWatching = () => {
        watching?.disconnect();
        watching = undefined;
        cancelAnimationFrame(checking);
    };
    // Back to rest, settling on the sheet's own transition.
    const release = () => {
        stopWatching();
        const surface = sheet();
        surface?.style.removeProperty("translate");
        surface?.style.removeProperty("transition");
    };
    // Back to rest at once, before it next opens, so it opens from its edge.
    const reset = (surface: HTMLElement) => {
        stopWatching();
        surface.style.removeProperty("translate");
        void getComputedStyle(surface).translate;
        surface.style.removeProperty("transition");
    };
    // Closing: it holds where the drag let go of it, and its exit runs from there. If it's still
    // open a frame later, the app refused the close, so it settles back; otherwise it goes back
    // to rest once it opens again.
    const close = (surface: HTMLElement | null | undefined) => {
        dismiss();
        if (!surface) return;
        checking = requestAnimationFrame(() => {
            if (surface.getAttribute("data-state") !== "closed") {
                release();
                return;
            }
            watching = new MutationObserver(() => {
                if (surface.getAttribute("data-state") !== "closed")
                    reset(surface);
            });
            watching.observe(surface, {
                attributes: true,
                attributeFilter: ["data-state"],
            });
        });
    };

    const leave = (surface: HTMLElement | null | undefined) => {
        const answer = onClose?.() ?? true;
        if (typeof answer === "boolean") {
            if (answer) close(surface);
            else release();
            return;
        }
        const asked = ++asking;
        answer.then(
            (yes) => {
                if (asked !== asking) return;
                if (yes) close(surface);
                else release();
            },
            () => {
                if (asked === asking) release();
            },
        );
    };

    const onDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        asking++;
        swallow?.();
        stopWatching();
        start = {
            y: event.clientY,
            time: event.timeStamp,
            id: event.pointerId,
        };
        offset = 0;
        dragged = false;
        handle.setPointerCapture?.(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
        if (start?.id === event.pointerId) move(event.clientY);
    };
    const onUp = (event: PointerEvent) => {
        if (start?.id !== event.pointerId) return;
        const surface = sheet();
        const height = surface?.getBoundingClientRect().height ?? 0;
        const speed = offset / Math.max(1, event.timeStamp - start.time);
        start = undefined;
        if (dragged) swallow = swallowNextClick(handle);
        if (
            dragged &&
            (offset > height * SHEET_DISMISS_SHARE || speed > SHEET_FLICK_SPEED)
        ) {
            leave(surface);
        } else {
            release();
        }
    };
    const onCancel = () => {
        start = undefined;
        dragged = false;
        release();
    };

    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onCancel);
    return () => {
        handle.removeEventListener("pointerdown", onDown);
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onCancel);
        swallow?.();
        asking++;
        release();
    };
};
