// A swipeable list item's state and gesture: how far the row has slid, whether its action is
// revealed (controlled by `revealed`, or kept from `defaultRevealed`), the pointer drag that
// slides it and the keys that open and close it.

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
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { useRef, useState } from "react";

import { useDirection } from "../provider";

// A press on these is theirs, not the start of a swipe.
const OWN_GESTURES = "button, a, input, select, textarea, [role='button']";

/** What a swipeable list item reads and sets. */
export interface Swipe {
    /** Whether the action is uncovered. */
    readonly revealed: boolean;
    /** Whether a drag holds the row. */
    readonly dragging: boolean;
    /** The instance tokens that slide the row, over the item's own. */
    readonly tokens: Record<string, number>;
    /** Root's element props: the pointer and key handlers, and the touch action. */
    readonly rootProps: (interactive: boolean) => Record<string, unknown>;
}

/** A row's swipe state, `undefined` for a row that doesn't swipe. The hook runs for every row
 *  (hooks can't be skipped); a row that doesn't swipe keeps no state of its own. */
export function useSwipe(
    props: ListItemSwipeProps,
    swipeable: boolean,
): Swipe | undefined {
    const rtl = useDirection() === "rtl";
    const width = props.swipeWidth ?? LIST_ITEM_SWIPE_WIDTH;
    const [own, setOwn] = useState(props.defaultRevealed ?? false);
    const revealed = props.revealed ?? own;
    // Where the pointer holds the row, as its slid offset; `undefined` when it doesn't.
    const [drag, setDrag] = useState<number | undefined>(undefined);
    const offset = drag ?? swipeRestOffset(revealed, width);
    const gesture = useRef<{
        from: number;
        startOffset: number;
        offset: number;
        moved: boolean;
    }>(undefined);
    const dragged = useRef(false);
    if (!swipeable) return undefined;
    const setRevealed = (next: boolean) => {
        if (next === revealed) return;
        if (props.revealed === undefined) setOwn(next);
        props.onRevealedChange?.({ revealed: next });
    };
    return {
        revealed,
        dragging: drag !== undefined,
        tokens: swipeTokens(offset, width),
        rootProps: (interactive) => ({
            style: { touchAction: "pan-y" },
            tabIndex: interactive ? undefined : 0,
            onPointerDown: (event: PointerEvent<HTMLElement>) => {
                if (event.pointerType === "mouse" && event.button !== 0) return;
                const target = (event.target as Element).closest(OWN_GESTURES);
                if (target && target !== event.currentTarget) return;
                gesture.current = {
                    from: event.clientX,
                    startOffset: offset,
                    offset,
                    moved: false,
                };
            },
            onPointerMove: (event: PointerEvent<HTMLElement>) => {
                const held = gesture.current;
                if (!held) return;
                const dx = event.clientX - held.from;
                if (!held.moved && Math.abs(dx) < LIST_ITEM_SWIPE_SLOP) return;
                if (!held.moved) {
                    held.moved = true;
                    // A pointer that has already gone can't be captured.
                    try {
                        event.currentTarget.setPointerCapture(event.pointerId);
                    } catch {}
                }
                held.offset = swipeOffsetOf(
                    held.startOffset,
                    held.from,
                    event.clientX,
                    width,
                    rtl,
                );
                setDrag(held.offset);
            },
            onPointerUp: () => {
                const held = gesture.current;
                gesture.current = undefined;
                if (!held?.moved) return;
                dragged.current = true;
                setRevealed(swipeSettlesOpen(held.offset, width));
                setDrag(undefined);
            },
            onPointerCancel: () => {
                gesture.current = undefined;
                setDrag(undefined);
            },
            // A drag isn't a click on the row.
            onClickCapture: (event: MouseEvent<HTMLElement>) => {
                if (!dragged.current) return;
                dragged.current = false;
                event.preventDefault();
                event.stopPropagation();
            },
            onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
                if (event.target !== event.currentTarget) return;
                const action = swipeKeyAction(event.key, rtl);
                if (!action) return;
                event.preventDefault();
                setRevealed(action === "reveal");
            },
        }),
    };
}
