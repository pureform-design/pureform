// Dragging a bottom sheet down by its drag handle: the sheet follows the pointer down (never up
// past where it rests), and a drag past a quarter of its height, or a quick flick, closes it.
// Shorter drags put it back. The press that ends a real drag doesn't also count as a click on the
// handle, so a handle that closes on a press closes only once.

/** How far down, as a share of the sheet's height, a drag closes it. */
export const SHEET_DISMISS_SHARE = 0.25;
/** How fast, in pixels per millisecond, a downward flick closes it however short. */
export const SHEET_FLICK_SPEED = 0.5;
// Moves shorter than this are a press, not a drag.
const SLOP = 4;

/** Lets `handle` drag `sheet` down, calling `dismiss` when a drag should close it. Returns what
 *  stops it. */
export const dragToDismiss = (
    handle: HTMLElement,
    sheet: () => HTMLElement | null | undefined,
    dismiss: () => void,
): (() => void) => {
    let start: { y: number; time: number; id: number } | undefined;
    let offset = 0;
    let dragged = false;

    const move = (y: number) => {
        offset = Math.max(0, y - start!.y);
        if (offset > SLOP) dragged = true;
        const surface = sheet();
        if (surface && dragged) {
            surface.style.translate = `0 ${offset}px`;
            surface.style.transition = "none";
        }
    };
    const release = () => {
        const surface = sheet();
        surface?.style.removeProperty("translate");
        surface?.style.removeProperty("transition");
    };

    const onDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
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
        const height = sheet()?.getBoundingClientRect().height ?? 0;
        const speed = offset / Math.max(1, event.timeStamp - start.time);
        start = undefined;
        release();
        if (
            dragged &&
            (offset > height * SHEET_DISMISS_SHARE || speed > SHEET_FLICK_SPEED)
        ) {
            dismiss();
        }
    };
    const onCancel = () => {
        start = undefined;
        dragged = false;
        release();
    };
    // A drag ends with a click on the handle; it was a drag, not a press.
    const onClick = (event: MouseEvent) => {
        if (!dragged) return;
        dragged = false;
        event.preventDefault();
        event.stopImmediatePropagation();
    };

    // Touch moves drag the sheet rather than scroll the page.
    handle.style.touchAction = "none";
    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onCancel);
    handle.addEventListener("click", onClick, true);
    return () => {
        handle.removeEventListener("pointerdown", onDown);
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onCancel);
        handle.removeEventListener("click", onClick, true);
        release();
    };
};
