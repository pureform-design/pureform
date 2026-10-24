// What every sideways drag on the web shares (the side sheet's drag to dismiss, the toast's swipe):
// a pointer goes down, and once it has moved past the slop it's a drag if it went mostly sideways
// (then the element captures the pointer and follows it) or the page's if it went mostly up or
// down (the browser scrolls natively: `touch-action: pan-y`, which the element renders). Let go,
// the drag hears how far it went and how fast, and the click that ends it is swallowed.

import { createDragVelocity } from "@pureform/binding-core";

import { swallowNextClick } from "./drag-click";

export interface SidewaysDragHooks {
    /** Moves shorter than this (px, either axis) are a press, not a drag. */
    readonly slop: number;
    /** Whether a pointer going down may start a drag. */
    readonly accepts: (event: PointerEvent) => boolean;
    /** A pointer it accepted went down. */
    readonly down?: ((event: PointerEvent) => void) | undefined;
    /** The pointer moved past the slop mostly sideways: the drag starts. */
    readonly start?: ((event: PointerEvent) => void) | undefined;
    /** The drag moved: `dx` px along the screen from where it went down. */
    readonly move: (dx: number, event: PointerEvent) => void;
    /** The drag let go (or the browser took the pointer, `cancelled`): `dx` from where it went
     *  down, `velocity` along the screen in px/ms. */
    readonly release: (
        dx: number,
        velocity: number,
        cancelled: boolean,
    ) => void;
}

/** Follows sideways drags on `element` through `hooks`; returns what stops it. */
export const sidewaysDrag = (
    element: HTMLElement,
    hooks: SidewaysDragHooks,
): (() => void) => {
    let start:
        | { x: number; y: number; id: number; dragging?: boolean }
        | undefined;
    const speed = createDragVelocity();
    let swallow: (() => void) | undefined;
    const onDown = (event: PointerEvent) => {
        if (!hooks.accepts(event)) return;
        swallow?.();
        swallow = undefined;
        start = { x: event.clientX, y: event.clientY, id: event.pointerId };
        speed.reset();
        speed.add(0, event.timeStamp);
        hooks.down?.(event);
    };
    const onMove = (event: PointerEvent) => {
        if (start?.id !== event.pointerId || start.dragging === false) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (start.dragging === undefined) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < hooks.slop) return;
            // Mostly up or down: the page's native scroll, not a drag.
            start.dragging = Math.abs(dx) > Math.abs(dy);
            if (!start.dragging) return;
            // A pointer no longer active (or a synthetic one) can't be captured; the drag still
            // follows the moves the element hears.
            try {
                element.setPointerCapture?.(event.pointerId);
            } catch {}
            hooks.start?.(event);
        }
        event.preventDefault();
        speed.add(dx, event.timeStamp);
        hooks.move(dx, event);
    };
    const end = (event: PointerEvent, cancelled: boolean) => {
        if (start?.id !== event.pointerId) return;
        const { dragging, x } = start;
        start = undefined;
        if (dragging !== true) return;
        const dx = event.clientX - x;
        if (!cancelled) {
            speed.add(dx, event.timeStamp);
            swallow = swallowNextClick(element);
        }
        hooks.release(dx, speed.velocity() / 1000, cancelled);
    };
    const onUp = (event: PointerEvent) => end(event, false);
    const onCancel = (event: PointerEvent) => end(event, true);
    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onCancel);
    return () => {
        element.removeEventListener("pointerdown", onDown);
        element.removeEventListener("pointermove", onMove);
        element.removeEventListener("pointerup", onUp);
        element.removeEventListener("pointercancel", onCancel);
        swallow?.();
    };
};
