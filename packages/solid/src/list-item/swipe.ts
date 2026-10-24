// A swipeable list item's state and gesture: how far the row has slid, whether its action is
// revealed (controlled by `revealed`, or kept from `defaultRevealed`), the pointer drag that
// slides it and the keys that open and close it. Built only for a row that is swipeable, when it
// is made, so the rows that aren't pay nothing. Let go, the row settles from the drag's speed
// (`createSwipeSettle`).

import {
    LIST_ITEM_SWIPE_SLOP,
    LIST_ITEM_SWIPE_WIDTH,
    swipeKeyAction,
    swipeOffsetOf,
    swipeRestOffset,
    swipeSettlesOpen,
    swipeTokens,
} from "@pureform/binding-core";
import type { ListItemSwipeProps } from "@pureform/binding-core";
import { createSwipeSettle, swallowNextClick } from "@pureform/binding-dom";
import { type Accessor, createSignal, untrack } from "solid-js";

import { useDirection, usePureform } from "../provider";

// A press on these is theirs, not the start of a swipe.
const OWN_GESTURES = "button, a, input, select, textarea, [role='button']";

/** What a swipeable list item reads and sets. */
export interface Swipe {
    /** Whether the action is uncovered. */
    readonly revealed: Accessor<boolean>;
    /** Whether a drag holds the row. */
    readonly dragging: Accessor<boolean>;
    /** The instance tokens that slide the row, over the item's own. */
    readonly tokens: () => Record<string, number>;
    /** Root's element props: the pointer and key handlers, and the touch action. */
    readonly rootProps: (interactive: boolean) => Record<string, unknown>;
}

/** A swipeable row's state and handlers. */
export function createSwipe(props: ListItemSwipeProps): Swipe {
    const direction = useDirection();
    const width = () => props.swipeWidth ?? LIST_ITEM_SWIPE_WIDTH;
    const [own, setOwn] = createSignal(
        untrack(() => props.defaultRevealed ?? false),
    );
    const revealed = () => props.revealed ?? own();
    const setRevealed = (next: boolean) => {
        if (next === revealed()) return;
        if (props.revealed === undefined) setOwn(next);
        props.onRevealedChange?.({ revealed: next });
    };
    // Where the pointer holds the row, as its slid offset; `undefined` when it doesn't.
    const [drag, setDrag] = createSignal<number | undefined>(undefined);
    const offset = () => drag() ?? swipeRestOffset(revealed(), width());
    let gesture:
        | { from: number; startOffset: number; offset: number; moved: boolean }
        | undefined;
    // The click that ends a drag isn't a press on the row, nor on its own handlers (an
    // expandable row's): a capturing listener on the row swallows it. The next press takes the
    // listener back if no click came.
    let swallow: (() => void) | undefined;
    const state = usePureform();
    const settle = createSwipeSettle(() => state().registry);
    const rootProps = (interactive: boolean) => ({
        style: { "touch-action": "pan-y" },
        tabIndex: interactive ? undefined : 0,
        onPointerDown: (event: PointerEvent) => {
            swallow?.();
            if (event.pointerType === "mouse" && event.button !== 0) return;
            const target = (event.target as Element).closest(OWN_GESTURES);
            if (target && target !== event.currentTarget) return;
            gesture = {
                from: event.clientX,
                startOffset: offset(),
                offset: offset(),
                moved: false,
            };
            settle.start(
                event.currentTarget as HTMLElement,
                offset(),
                event.timeStamp,
            );
        },
        onPointerMove: (event: PointerEvent) => {
            if (!gesture) return;
            const dx = event.clientX - gesture.from;
            if (!gesture.moved && Math.abs(dx) < LIST_ITEM_SWIPE_SLOP) return;
            if (!gesture.moved) {
                gesture.moved = true;
                // A pointer that has already gone can't be captured.
                try {
                    (event.currentTarget as Element).setPointerCapture(
                        event.pointerId,
                    );
                } catch {}
            }
            gesture.offset = swipeOffsetOf(
                gesture.startOffset,
                gesture.from,
                event.clientX,
                width(),
                direction() === "rtl",
            );
            settle.move(gesture.offset, event.timeStamp);
            setDrag(gesture.offset);
        },
        onPointerUp: (event: PointerEvent) => {
            const held = gesture;
            gesture = undefined;
            if (!held?.moved) return;
            swallow = swallowNextClick(event.currentTarget as Element);
            const open = swipeSettlesOpen(held.offset, width());
            settle.release(
                event.currentTarget as HTMLElement,
                held.offset,
                swipeRestOffset(open, width()),
            );
            setRevealed(open);
            setDrag(undefined);
        },
        onPointerCancel: () => {
            gesture = undefined;
            setDrag(undefined);
        },
        onKeyDown: (event: KeyboardEvent) => {
            if (event.target !== event.currentTarget) return;
            const action = swipeKeyAction(event.key, direction() === "rtl");
            if (!action) return;
            event.preventDefault();
            setRevealed(action === "reveal");
        },
    });
    return {
        revealed,
        dragging: () => drag() !== undefined,
        tokens: () => swipeTokens(offset(), width()),
        rootProps,
    };
}
