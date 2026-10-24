// Dragging a bottom sheet by its drag handle: the sheet follows the pointer (never up past fully
// open), and where it's let go, with how fast, picks where it goes (`sheetRelease`): back to where
// it rests, between partly and fully open on a sheet that can rest partly open, or away. Leaving,
// it goes from where the drag let go of it; settling, it starts at the drag's speed
// (`settleTransition`). An app asked whether to close (`onClose`) may answer later: the sheet
// holds where it was let go until then. Whether the app kept it open is decided once the binding
// has rendered the close (it calls back), as on React Native, not a frame later. The press that
// ends a real drag doesn't also count as a click on the handle, so a handle that closes on a
// press closes only once; on a sheet resting partly open, a press opens it fully, and on one
// fully open, puts it back partly open. A sheet resting partly open is placed again when it or
// the window changes size.

import type { CloseQuestion } from "@pureform/binding-core";
import {
    closeAsker,
    sheetPartialOffset,
    sheetRelease,
} from "@pureform/binding-core";
import type { CloseAsker, SheetRest } from "@pureform/binding-core";
import { createDragVelocity } from "@pureform/binding-core";

import { swallowNextClick } from "./drag-click";
import { settleTransition } from "./settle";

export {
    SHEET_POSITIONAL_THRESHOLD,
    SHEET_VELOCITY_THRESHOLD,
} from "@pureform/binding-core";

// Moves shorter than this are a press, not a drag.
const SLOP = 4;

/** What `dragToDismiss` takes besides the handle, the sheet, and what closes it. */
export interface SheetDragOptions {
    /** Whether the sheet can rest partly open, read at each open and each release. */
    readonly partial?: (() => boolean) | undefined;
    /** Where a sheet that can rest partly open rests as it opens (`sheetOpeningRest`), read at
     *  each open. @default "partial" */
    readonly opening?: (() => SheetRest) | undefined;
    /** Called when where it rests changes (partly or fully open), and each time it opens, with
     *  whether it can move between the two (it's tall enough to rest partly open), and whether
     *  the user moved it (a drag let go, or a press on the handle), not an opening, a resize or
     *  a controlled `expanded`: only those report `onExpandedChange`. */
    readonly onRest?:
        | ((rest: SheetRest, movable: boolean, byUser: boolean) => void)
        | undefined;
    /** The var of the spring the sheet settles on (`springRoleVar(registry, "spatialDefault")`),
     *  so a settle samples it exactly rather than fitting one to its curve. */
    readonly spring?: string | undefined;
}

/** What stops `dragToDismiss`, and moves the sheet to rest partly or fully open, as a
 *  controlled `expanded` asks (nothing when it's closed, already there, or too short to rest
 *  partly open; `onRest` hears it). */
export interface SheetDrag {
    (): void;
    readonly rest: (rest: SheetRest) => void;
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
): SheetDrag => {
    let start: { y: number; id: number } | undefined;
    // The pointer's recent positions, for the release's speed.
    const speed = createDragVelocity();
    let offset = 0;
    let dragged = false;
    let rest: SheetRest = "expanded";
    // A drag ends with a click on the handle; it was a drag, not a press.
    let swallow: (() => void) | undefined;
    let stopSettle: (() => void) | undefined;

    let movable = false;
    const setRest = (next: SheetRest, opening = false, byUser = false) => {
        const surface = sheet();
        const canMove = surface ? partialOffset(surface) !== undefined : false;
        if (next === rest && canMove === movable && !opening) return;
        rest = next;
        movable = canMove;
        options.onRest?.(next, canMove, byUser);
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
    // Where `place` last put it.
    let placed = 0;
    const place = (surface: HTMLElement, at: number) => {
        placed = at;
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
            options.spring,
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
                partialOffset(surface) === undefined
                    ? "expanded"
                    : (options.opening?.() ?? "partial"),
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
        if (typeof ResizeObserver !== "undefined") {
            resizes = new ResizeObserver(replace);
            resizes.observe(surface);
        }
        view = surface.ownerDocument.defaultView ?? undefined;
        view?.addEventListener("resize", replace);
    };
    // A resize (its content, or the window) moves where it rests partly open, or leaves it too
    // short to: it's placed there again at once, unless it's being dragged.
    let resizes: ResizeObserver | undefined;
    let view: Window | undefined;
    const replace = () => {
        const surface = sheet();
        if (!surface || start || surface.getAttribute("data-state") !== "open")
            return;
        setRest(partialOffset(surface) === undefined ? "expanded" : rest);
        const to = restOffset(surface);
        if (to === placed) return;
        stopSettle?.();
        surface.style.transition = "none";
        place(surface, restOffset(surface));
        void getComputedStyle(surface).translate;
        surface.style.removeProperty("transition");
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
        speed.reset();
        speed.add(event.clientY, event.timeStamp);
        const surface = sheet();
        offset = surface ? restOffset(surface) : 0;
        dragged = false;
        handle.setPointerCapture?.(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
        if (start?.id !== event.pointerId) return;
        speed.add(event.clientY, event.timeStamp);
        move(event.clientY);
    };
    const onUp = (event: PointerEvent) => {
        if (start?.id !== event.pointerId) return;
        const surface = sheet();
        const height = surface?.getBoundingClientRect().height ?? 0;
        speed.add(event.clientY, event.timeStamp);
        // In pixels per millisecond.
        const velocity = speed.velocity() / 1000;
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
            setRest(to, false, true);
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
        setRest(rest === "partial" ? "expanded" : "partial", false, true);
        settleTo(0);
    };

    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onCancel);
    handle.addEventListener("click", onClick);
    const stop = () => {
        handle.removeEventListener("pointerdown", onDown);
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onCancel);
        handle.removeEventListener("click", onClick);
        opens?.disconnect();
        resizes?.disconnect();
        view?.removeEventListener("resize", replace);
        stopSettle?.();
        swallow?.();
        asker.cancel();
        const surface = sheet();
        surface?.style.removeProperty("translate");
        surface?.style.removeProperty("transition");
    };
    const moveTo = (next: SheetRest) => {
        const surface = sheet();
        if (!surface || start || surface.getAttribute("data-state") !== "open")
            return;
        if (next === rest || partialOffset(surface) === undefined) return;
        offset = restOffset(surface);
        setRest(next);
        settleTo(0);
    };
    return Object.assign(stop, { rest: moveTo });
};
