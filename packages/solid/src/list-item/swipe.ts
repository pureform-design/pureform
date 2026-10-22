// A swipeable list item's state and gesture: how far the row has slid, whether its action is
// revealed (controlled by `revealed`, or kept from `defaultRevealed`), the pointer drag that
// slides it and the keys that open and close it. Built only for a row that is swipeable, when it
// is made, so the rows that aren't pay nothing.

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
import { type Accessor, createSignal, untrack } from "solid-js";

import { useDirection } from "../provider";

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
    let dragged = false;
    const rootProps = (interactive: boolean) => ({
        style: { "touch-action": "pan-y" },
        tabIndex: interactive ? undefined : 0,
        onPointerDown: (event: PointerEvent) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            const target = (event.target as Element).closest(OWN_GESTURES);
            if (target && target !== event.currentTarget) return;
            gesture = {
                from: event.clientX,
                startOffset: offset(),
                offset: offset(),
                moved: false,
            };
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
            setDrag(gesture.offset);
        },
        onPointerUp: () => {
            const held = gesture;
            gesture = undefined;
            if (!held?.moved) return;
            dragged = true;
            setRevealed(swipeSettlesOpen(held.offset, width()));
            setDrag(undefined);
        },
        onPointerCancel: () => {
            gesture = undefined;
            setDrag(undefined);
        },
        // A drag isn't a click on the row.
        onClickCapture: (event: MouseEvent) => {
            if (!dragged) return;
            dragged = false;
            event.preventDefault();
            event.stopPropagation();
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
