// What a list of highlightable items emits (a menu's items, a select's options): the highlighted
// item hovers, whether the pointer or the keyboard moved the highlight, an item is pressed by the
// pointer, and Enter or Space presses the highlighted item while focus stays on the list. The key
// chooses the item as it goes down, so its press is released at once.

import type { Params } from "@zag-js/core";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import type { InteractionEmitters } from "./emitter";
import { chainProps } from "./zag";

type HighlightParams = Pick<Params<any>, "track" | "context">;

/** Watches a machine's `highlightedValue`: the item it names hovers, and the one before stops.
 *  Everything ends when `open()` turns false. A highlight's hover has no origin element, since the
 *  item itself may not be hovered. */
export function trackHighlight(
    { track, context }: HighlightParams,
    emitters: InteractionEmitters,
    open: () => boolean,
): void {
    track([() => context.get("highlightedValue") as string | null], () => {
        const next = (context.get("highlightedValue") as string | null) ?? null;
        const previous = emitters.highlighted;
        if (previous !== null && previous !== next) {
            emitters.item(previous).hoverExit();
        }
        if (next !== null) emitters.item(next).hoverEnter();
        emitters.highlighted = next;
    });
    track([open], () => {
        if (open()) return;
        emitters.end();
        emitters.highlighted = null;
    });
}

const isPressKey = (key: string) => key === "Enter" || key === " ";

/** An item's props with a pointer press emitting to its emitter. */
export function itemPressProps<P, T extends PropTypes>(
    props: P,
    emitters: InteractionEmitters,
    value: string,
    disabled: boolean,
    normalize: NormalizeProps<T>,
): P {
    const emitter = emitters.item(value);
    if (disabled) emitter.disabled();
    return chainProps(
        props,
        normalize.element({
            onPointerDown(event) {
                if (disabled) return;
                emitter.pointerDown(event, event.currentTarget);
            },
        }),
    );
}

/** The list's props with Enter and Space pressing and releasing the highlighted item, from its
 *  center. */
export function highlightedPressProps<P, T extends PropTypes>(
    props: P,
    emitters: InteractionEmitters,
    highlighted: string | null,
    normalize: NormalizeProps<T>,
): P {
    return chainProps(
        props,
        normalize.element({
            onKeyDown(event) {
                if (highlighted === null || !isPressKey(event.key)) return;
                const emitter = emitters.item(highlighted);
                if (emitter.keyDown(event, undefined)) emitter.keyUp();
            },
        }),
    );
}
