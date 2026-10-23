// Dragging a side sheet toward its edge, as MDC-Android's `SideSheetBehavior` lets a sheet be
// dragged sideways and dismissed by sliding it off the screen: a touch or a pen dragging mostly
// sideways anywhere on the sheet moves it (never in past open), and where it's let go, with how
// fast, picks whether it goes or settles back (`sideSheetRelease`). Leaving, it goes from where the
// drag let go of it; settling, it starts at the drag's speed (`settleTransition`). A drag that
// starts mostly up or down is left to the browser, which scrolls the sheet's content natively
// (`touch-action: pan-y`), and a mouse selects text as ever. An app asked whether to close
// (`onClose`) may answer later: the sheet holds where it was let go until then. A coplanar sheet
// sits in the page's layout: as it moves out, the element holding its place (`layout()`) gives
// the room up, so the content beside it widens as MDC's coplanar sheet lets it.

import type { CloseQuestion } from "./components/dialog";
import { closeAsker, sideSheetRelease } from "./components/sheet";
import type { CloseAsker } from "./components/sheet";
import { createDragVelocity } from "./drag";
import { swallowNextClick } from "./drag-click";
import { settleTransition } from "./settle";

// Moves shorter than this are a press, not a drag.
const SLOP = 8;

/** Lets touch and pen drags move `sheet` toward the edge it's on (the end edge: the right, or
 *  the left when `rtl()`), calling `dismiss` when a drag should close it. `dismiss` closes the
 *  sheet and, once the binding has rendered that, calls `kept` if the sheet is still open (the
 *  app kept it), which settles it back. Given `onClose`, it asks first, through `asker`: the
 *  sheet holds where it was let go until the answer, then leaves on `true` and settles back on
 *  `false` (or a rejection). Given `layout()` (a coplanar sheet's positioner, in the page's
 *  flow), its end margin follows the sheet out, so what's beside it takes the room. Returns what
 *  stops it. */
export const sideSheetDragToDismiss = (
    sheet: HTMLElement,
    rtl: () => boolean,
    dismiss: (kept: () => void) => void,
    onClose?: CloseQuestion,
    asker: CloseAsker = closeAsker(),
    layout: () => HTMLElement | null | undefined = () => undefined,
): (() => void) => {
    // Where the pointer went down, and whether it's dragging the sheet yet (`undefined` while
    // it hasn't moved past the slop either way).
    let start:
        | { x: number; y: number; id: number; dragging?: boolean }
        | undefined;
    const speed = createDragVelocity();
    // How far toward its edge it is, in pixels.
    let offset = 0;
    let swallow: (() => void) | undefined;
    let stopSettle: (() => void) | undefined;
    // Toward the edge: right, or left under right to left.
    const outward = () => (rtl() ? -1 : 1);
    // The coplanar sheet's place in the layout, while a drag moves it.
    let holder: HTMLElement | undefined;
    const place = (at: number) => {
        if (at === 0) sheet.style.removeProperty("translate");
        else sheet.style.translate = `${at * outward()}px 0`;
        if (!holder) return;
        if (at === 0) holder.style.removeProperty("margin-inline-end");
        else holder.style.marginInlineEnd = `${-at}px`;
    };
    const release = () => {
        if (!holder) return;
        holder.style.removeProperty("margin-inline-end");
        holder.style.removeProperty("transition");
        holder = undefined;
    };
    const settleBack = (velocity: number) => {
        stopSettle?.();
        sheet.style.removeProperty("transition");
        // Back is inward: a release moving out still settles from its speed, the other way.
        const stopSheet = settleTransition(sheet, "translate", -offset, -velocity);
        const settling = holder;
        if (settling) {
            // The margin settles on the sheet's own curve.
            const transition = getComputedStyle(sheet).transition;
            settling.style.transition = transition.replace(
                /\btranslate\b/g,
                "margin-inline-end",
            );
            settling.addEventListener(
                "transitionend",
                () => {
                    if (holder === undefined)
                        settling.style.removeProperty("transition");
                },
                { once: true },
            );
        }
        stopSettle = () => {
            stopSheet();
            if (settling) settling.style.removeProperty("transition");
        };
        offset = 0;
        place(0);
        holder = undefined;
    };
    const leave = (velocity: number) =>
        asker.ask(
            onClose,
            () => dismiss(() => settleBack(0)),
            () => settleBack(velocity),
        );

    const onDown = (event: PointerEvent) => {
        if (event.button !== 0 || event.pointerType === "mouse") return;
        if (sheet.getAttribute("data-state") !== "open") return;
        asker.cancel();
        swallow?.();
        start = { x: event.clientX, y: event.clientY, id: event.pointerId };
        speed.reset();
        speed.add(event.clientX * outward(), event.timeStamp);
        offset = 0;
    };
    const onMove = (event: PointerEvent) => {
        if (start?.id !== event.pointerId || start.dragging === false) return;
        const dx = (event.clientX - start.x) * outward();
        const dy = event.clientY - start.y;
        if (start.dragging === undefined) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < SLOP) return;
            // Mostly up or down: the content's native scroll, not a drag.
            start.dragging = Math.abs(dx) > Math.abs(dy);
            if (!start.dragging) return;
            // A pointer no longer active (or a synthetic one) can't be captured; the drag
            // still follows the moves the sheet hears.
            try {
                sheet.setPointerCapture?.(event.pointerId);
            } catch {}
            stopSettle?.();
            holder = layout() ?? undefined;
            if (holder) holder.style.transition = "none";
        }
        speed.add(event.clientX * outward(), event.timeStamp);
        offset = Math.max(0, dx);
        sheet.style.transition = "none";
        place(offset);
    };
    const onUp = (event: PointerEvent) => {
        if (start?.id !== event.pointerId) return;
        const dragging = start.dragging === true;
        start = undefined;
        if (!dragging) return;
        speed.add(event.clientX * outward(), event.timeStamp);
        // In pixels per millisecond, toward the edge.
        const velocity = speed.velocity() / 1000;
        swallow = swallowNextClick(sheet);
        const to = sideSheetRelease({
            offset,
            velocity,
            width: sheet.getBoundingClientRect().width,
        });
        if (to === "closed") leave(velocity);
        else settleBack(velocity);
    };
    const onCancel = (event: PointerEvent) => {
        if (start?.id !== event.pointerId) return;
        const dragging = start.dragging === true;
        start = undefined;
        if (dragging) settleBack(0);
    };

    // Each time it opens again, it starts open, wherever a drag let it go last time.
    const opens = new MutationObserver((records) => {
        if (
            sheet.getAttribute("data-state") === "open" &&
            records.some((record) => record.oldValue !== "open")
        ) {
            stopSettle?.();
            offset = 0;
            sheet.style.removeProperty("translate");
            sheet.style.removeProperty("transition");
            release();
            layout()?.style.removeProperty("margin-inline-end");
        }
    });
    opens.observe(sheet, {
        attributes: true,
        attributeFilter: ["data-state"],
        attributeOldValue: true,
    });
    // Sideways moves are the sheet's; up and down still scroll natively. The bindings render it
    // (`sideSheetContentLayout`), so a hydrated sheet doesn't change.
    const touchAction = sheet.style.touchAction;
    if (touchAction !== "pan-y") sheet.style.touchAction = "pan-y";
    sheet.addEventListener("pointerdown", onDown);
    sheet.addEventListener("pointermove", onMove);
    sheet.addEventListener("pointerup", onUp);
    sheet.addEventListener("pointercancel", onCancel);
    return () => {
        sheet.removeEventListener("pointerdown", onDown);
        sheet.removeEventListener("pointermove", onMove);
        sheet.removeEventListener("pointerup", onUp);
        sheet.removeEventListener("pointercancel", onCancel);
        opens.disconnect();
        if (touchAction !== "pan-y") sheet.style.touchAction = touchAction;
        stopSettle?.();
        swallow?.();
        asker.cancel();
        sheet.style.removeProperty("translate");
        sheet.style.removeProperty("transition");
        release();
    };
};
