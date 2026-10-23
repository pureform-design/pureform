// Swiping a toast sideways dismisses it, as Android's notifications and snackbars go: a drag
// mostly sideways moves the toast (a touch, a pen, or a mouse), and let go past half its width, or
// on a flick, it leaves that way and closes; short of that, it settles back. Up and down stay the
// page's to scroll (`touch-action: pan-y`). A press on its buttons (the action, the close button)
// isn't a drag, and a toast that can't be closed doesn't move. Its timer waits while it's held.

import { toastSwipeRelease } from "./components/toast";
import { sidewaysDrag } from "./sideways-drag";

export { TOAST_SWIPE_VELOCITY_THRESHOLD } from "./components/toast";

// Moves shorter than this are a press, not a swipe.
const SLOP = 8;
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
    let offset = 0;
    let settling: Animation | undefined;
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
    const stop = sidewaysDrag(toast, {
        slop: SLOP,
        accepts: (event) =>
            event.isPrimary &&
            event.button === 0 &&
            options.closable() &&
            !(event.target as Element | null)?.closest?.("button, a, input"),
        down: () => {
            settling?.cancel();
            settling = undefined;
        },
        start: () => options.pause(),
        move: (dx) => place(dx),
        release: (_dx, velocity, cancelled) => {
            const width = toast.offsetWidth;
            if (
                !cancelled &&
                toastSwipeRelease({ offset, velocity, width }) === "dismissed"
            ) {
                const to = (Math.sign(offset) || 1) * width;
                animate(to, () => {
                    place(to);
                    options.dismiss();
                });
                return;
            }
            animate(0, () => place(0));
            options.resume();
        },
    });
    const touchAction = toast.style.touchAction;
    toast.style.touchAction = "pan-y";
    return () => {
        stop();
        toast.style.touchAction = touchAction;
        settling?.cancel();
    };
};
