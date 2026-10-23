// Swiping a toast sideways dismisses it, as Android's notifications and snackbars go: a drag
// mostly sideways moves the toast (a touch, a pen, or a mouse), and let go past half its width, or
// on a flick, it leaves that way and closes; short of that, it settles back. Up and down stay the
// page's to scroll (`touch-action: pan-y`). A press on its buttons (the action, the close button)
// isn't a drag, and a toast that can't be closed doesn't move. Its timer waits while it's held.

import { createDragVelocity } from "./drag";
import { swallowNextClick } from "./drag-click";

// Moves shorter than this are a press, not a swipe.
const SLOP = 8;
/** A flick this fast (px/ms) or faster dismisses however short the swipe. */
export const TOAST_SWIPE_VELOCITY_THRESHOLD = 0.5;
/** How long the toast takes to settle back, or to leave once let go. */
const SETTLE_MS = 200;
const EASING = "cubic-bezier(0.2, 0, 0, 1)";

export interface ToastSwipeOptions {
    /** Whether the toast can be closed: one that can't doesn't move. */
    readonly closable: () => boolean;
    /** Closes the toast. */
    readonly dismiss: () => void;
    /** Hold and let go of the toast's timer. */
    readonly pause: () => void;
    readonly resume: () => void;
}

/** Lets sideways drags on `toast` dismiss it; returns what stops it. */
export const toastSwipeToDismiss = (
    toast: HTMLElement,
    options: ToastSwipeOptions,
): (() => void) => {
    let start:
        | { x: number; y: number; id: number; dragging?: boolean }
        | undefined;
    let offset = 0;
    let settling: Animation | undefined;
    const speed = createDragVelocity();
    const place = (at: number) => {
        offset = at;
        if (at === 0) {
            toast.style.removeProperty("translate");
            toast.style.removeProperty("opacity");
            return;
        }
        toast.style.translate = `${at}px 0`;
        // Fades as it goes, gone at its own width.
        toast.style.opacity = String(
            Math.max(0, 1 - Math.abs(at) / toast.offsetWidth),
        );
    };
    const animate = (to: number, done: () => void) => {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
            done();
            return;
        }
        const from = offset;
        const fade = (at: number) =>
            String(Math.max(0, 1 - Math.abs(at) / (toast.offsetWidth || 1)));
        settling = toast.animate(
            [
                { translate: `${from}px 0`, opacity: fade(from) },
                { translate: `${to}px 0`, opacity: fade(to) },
            ],
            { duration: SETTLE_MS, easing: EASING },
        );
        settling.onfinish = () => {
            settling = undefined;
            done();
        };
    };
    const onDown = (event: PointerEvent) => {
        if (!event.isPrimary || event.button !== 0) return;
        if (!options.closable()) return;
        if ((event.target as Element | null)?.closest?.("button, a, input"))
            return;
        settling?.cancel();
        settling = undefined;
        start = { x: event.clientX, y: event.clientY, id: event.pointerId };
        speed.reset();
        speed.add(0, event.timeStamp);
    };
    const onMove = (event: PointerEvent) => {
        if (!start || event.pointerId !== start.id) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (start.dragging === undefined) {
            if (Math.hypot(dx, dy) < SLOP) return;
            start.dragging = Math.abs(dx) > Math.abs(dy);
            if (!start.dragging) {
                start = undefined;
                return;
            }
            // Keeps the drag when the pointer leaves the toast; a synthetic event has no pointer
            // to capture.
            try {
                toast.setPointerCapture(event.pointerId);
            } catch {
                // Not an active pointer.
            }
            options.pause();
        }
        event.preventDefault();
        speed.add(dx, event.timeStamp);
        place(dx);
    };
    const end = (event: PointerEvent, cancelled: boolean) => {
        if (!start || event.pointerId !== start.id) return;
        const dragging = start.dragging;
        start = undefined;
        if (!dragging) return;
        swallowNextClick(toast);
        const velocity = speed.velocity() / 1000;
        const width = toast.offsetWidth;
        const fling =
            Math.abs(velocity) >= TOAST_SWIPE_VELOCITY_THRESHOLD &&
            Math.sign(velocity) === Math.sign(offset);
        if (!cancelled && (Math.abs(offset) >= width / 2 || fling)) {
            const to = (Math.sign(offset) || 1) * width;
            animate(to, () => {
                place(to);
                options.dismiss();
            });
            return;
        }
        animate(0, () => place(0));
        options.resume();
    };
    const onUp = (event: PointerEvent) => end(event, false);
    const onCancel = (event: PointerEvent) => end(event, true);
    const touchAction = toast.style.touchAction;
    toast.style.touchAction = "pan-y";
    toast.addEventListener("pointerdown", onDown);
    toast.addEventListener("pointermove", onMove);
    toast.addEventListener("pointerup", onUp);
    toast.addEventListener("pointercancel", onCancel);
    return () => {
        toast.removeEventListener("pointerdown", onDown);
        toast.removeEventListener("pointermove", onMove);
        toast.removeEventListener("pointerup", onUp);
        toast.removeEventListener("pointercancel", onCancel);
        toast.style.touchAction = touchAction;
        settling?.cancel();
    };
};
