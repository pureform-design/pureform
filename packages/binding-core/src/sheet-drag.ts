// Dragging a bottom sheet by its drag handle: the sheet follows the pointer (never up past fully
// open), and where it's let go, with how fast, picks where it goes (`sheetRelease`): back to where
// it rests, between partly and fully open on a sheet that can rest partly open, or away. Leaving,
// it goes from where the drag let go of it; settling, it starts at the drag's speed
// (`settleTransition`). An app asked whether to close (`onClose`) may answer later: the sheet
// holds where it was let go until then. Whether the app kept it open is decided once the binding
// has rendered the close (it calls back), as on React Native, not a frame later. The press that
// ends a real drag doesn't also count as a click on the handle, so a handle that closes on a
// press closes only once; on a sheet resting partly open, a press opens it fully, and on one
// fully open, puts it back partly open.

import type { CloseQuestion } from "./components/dialog";
import {
    closeAsker,
    sheetPartialOffset,
    sheetRelease,
} from "./components/sheet";
import type { CloseAsker, SheetRest } from "./components/sheet";
import { swallowNextClick } from "./drag-click";
import { settleTransition } from "./settle";

export { SHEET_DISMISS_SHARE, SHEET_FLICK_SPEED } from "./components/sheet";

// Moves shorter than this are a press, not a drag.
const SLOP = 4;
// How far back, in ms, the release speed is measured.
const SPEED_WINDOW = 100;

/** What `dragToDismiss` takes besides the handle, the sheet, and what closes it. */
export interface SheetDragOptions {
    /** Whether the sheet can rest partly open, read at each open and each release. */
    readonly partial?: (() => boolean) | undefined;
    /** Called when where it rests changes (partly or fully open), and each time it opens, with
     *  whether it can move between the two (it's tall enough to rest partly open). */
    readonly onRest?: ((rest: SheetRest, movable: boolean) => void) | undefined;
}

/** Lets `handle` drag `sheet` (give the handle `sheetDragHandleLayout` too, so touch moves drag
 *  rather than scroll), calling `dismiss` when a drag should close it. `dismiss` closes the
 *  sheet and, once the binding has rendered that, calls `kept` if the sheet is still open (the
 *  app kept it), which settles it back. Given `onClose`, it asks first, through `asker` (the
 *  overlay's, so a later question from another way of closing makes this one moot): the sheet
 *  holds where it was let go until the answer, then leaves on `true` and settles back on
 *  `false` (or a rejection). Given `options.partial`, a sheet taller than half the viewport
 *  opens partly, and rests partly or fully open. Returns what stops it. */
export const dragToDismiss = (
    handle: HTMLElement,
    sheet: () => HTMLElement | null | undefined,
    dismiss: (kept: () => void) => void,
    onClose?: CloseQuestion,
    asker: CloseAsker = closeAsker(),
    options: SheetDragOptions = {},
): (() => void) => {
    let start: { y: number; id: number } | undefined;
    // The pointer's recent positions, for the release's speed.
    let samples: { y: number; time: number }[] = [];
    let offset = 0;
    let dragged = false;
    let rest: SheetRest = "expanded";
    // A drag ends with a click on the handle; it was a drag, not a press.
    let swallow: (() => void) | undefined;
    let stopSettle: (() => void) | undefined;

    const setRest = (next: SheetRest, opening = false) => {
        if (next === rest && !opening) return;
        rest = next;
        const surface = sheet();
        options.onRest?.(
            next,
            surface ? partialOffset(surface) !== undefined : false,
        );
    };
    // How far down the sheet rests partly open, or `undefined` when it can't (or is too short).
    const partialOffset = (surface: HTMLElement) => {
        if (!options.partial?.()) return undefined;
        const offset = sheetPartialOffset(
            surface.getBoundingClientRect().height,
            surface.ownerDocument.documentElement.clientHeight,
        );
        return offset > 0 ? offset : undefined;
    };
    const restOffset = (surface: HTMLElement) =>
        rest === "partial" ? (partialOffset(surface) ?? 0) : 0;
    const place = (surface: HTMLElement, at: number) => {
        if (at === 0) surface.style.removeProperty("translate");
        else surface.style.translate = `0 ${at}px`;
    };
    // Settles to where it rests, on the sheet's own transition started at `velocity` (pixels per
    // millisecond, down).
    const settleTo = (velocity: number) => {
        const surface = sheet();
        if (!surface) return;
        stopSettle?.();
        const to = restOffset(surface);
        surface.style.removeProperty("transition");
        stopSettle = settleTransition(
            surface,
            "translate",
            to - offset,
            velocity,
        );
        place(surface, to);
    };

    const move = (y: number) => {
        const surface = sheet();
        const from = surface ? restOffset(surface) : 0;
        offset = Math.max(0, from + y - start!.y);
        if (Math.abs(y - start!.y) > SLOP) dragged = true;
        if (surface && dragged) {
            stopSettle?.();
            surface.style.translate = `0 ${offset}px`;
            surface.style.transition = "none";
        }
    };
    // Each time it opens, it starts where it rests: partly open when it can, at once, so it
    // rises from its edge to there.
    let opens: MutationObserver | undefined;
    const watch = () => {
        const surface = sheet();
        if (!surface || opens) return;
        const open = () => {
            stopSettle?.();
            setRest(
                partialOffset(surface) === undefined ? "expanded" : "partial",
                true,
            );
            surface.style.transition = "none";
            place(surface, restOffset(surface));
            void getComputedStyle(surface).translate;
            surface.style.removeProperty("transition");
        };
        opens = new MutationObserver((records) => {
            const state = surface.getAttribute("data-state");
            if (
                state === "open" &&
                records.some((record) => record.oldValue !== "open")
            )
                open();
        });
        opens.observe(surface, {
            attributes: true,
            attributeFilter: ["data-state"],
            attributeOldValue: true,
        });
        if (surface.getAttribute("data-state") === "open") open();
    };
    // The handle can be in place before the binding has the sheet.
    queueMicrotask(watch);

    // Closing: it holds where the drag let go of it, and its exit runs from there. If the
    // binding finds it still open once it has rendered the close, the app refused it, so it
    // settles back; otherwise it's placed where it rests once it opens again.
    const leave = (velocity: number) =>
        asker.ask(
            onClose,
            () => dismiss(() => settleTo(0)),
            () => settleTo(velocity),
        );

    const onDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        watch();
        asker.cancel();
        swallow?.();
        start = { y: event.clientY, id: event.pointerId };
        samples = [{ y: event.clientY, time: event.timeStamp }];
        const surface = sheet();
        offset = surface ? restOffset(surface) : 0;
        dragged = false;
        handle.setPointerCapture?.(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
        if (start?.id !== event.pointerId) return;
        samples.push({ y: event.clientY, time: event.timeStamp });
        move(event.clientY);
    };
    const onUp = (event: PointerEvent) => {
        if (start?.id !== event.pointerId) return;
        const surface = sheet();
        const height = surface?.getBoundingClientRect().height ?? 0;
        // The speed since the oldest position within the window, or the last one before it.
        const since =
            samples.find(
                (sample) => event.timeStamp - sample.time <= SPEED_WINDOW,
            ) ?? samples.at(-1)!;
        const velocity =
            (event.clientY - since.y) /
            Math.max(1, event.timeStamp - since.time);
        start = undefined;
        if (!dragged) return;
        swallow = swallowNextClick(handle);
        const to = sheetRelease({
            offset,
            velocity,
            height,
            partial: surface ? partialOffset(surface) : undefined,
        });
        if (to === "closed") leave(velocity);
        else {
            setRest(to);
            settleTo(velocity);
        }
    };
    const onCancel = () => {
        start = undefined;
        if (dragged) settleTo(0);
        dragged = false;
    };
    // A press on a sheet that can rest partly open moves it between partly and fully open,
    // rather than closing it.
    const onClick = (event: MouseEvent) => {
        const surface = sheet();
        if (!surface || partialOffset(surface) === undefined) return;
        event.stopPropagation();
        offset = restOffset(surface);
        setRest(rest === "partial" ? "expanded" : "partial");
        settleTo(0);
    };

    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onCancel);
    handle.addEventListener("click", onClick);
    return () => {
        handle.removeEventListener("pointerdown", onDown);
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onCancel);
        handle.removeEventListener("click", onClick);
        opens?.disconnect();
        stopSettle?.();
        swallow?.();
        asker.cancel();
        const surface = sheet();
        surface?.style.removeProperty("translate");
        surface?.style.removeProperty("transition");
    };
};
