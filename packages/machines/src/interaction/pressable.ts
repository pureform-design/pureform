// What a pressable element emits, for the parts that are their own buttons or links (a tab, a
// navigation destination): it's pressed by the pointer, Enter, or Space (Enter only on a link), and
// hovered and focused.

import type { NormalizeProps, PropTypes } from "@zag-js/types";

import type { InteractionEmitter } from "./emitter";
import { chainProps, isOwnFocusEvent } from "./zag";

const isPressKey = (key: string, element: Element) =>
    key === "Enter" || (key === " " && !element.matches("a[href]"));

/** `props` with the handlers that emit an element's interactions to `emitter` chained after its
 *  own. */
export function pressableItemProps<P, T extends PropTypes>(
    props: P,
    emitter: InteractionEmitter,
    disabled: boolean,
    normalize: NormalizeProps<T>,
): P {
    return chainProps(
        props,
        normalize.element({
            onPointerDown(event) {
                if (disabled) return;
                emitter.pointerDown(event, event.currentTarget);
            },
            onPointerMove(event) {
                if (disabled) return;
                emitter.pointerOver(event, event.currentTarget);
            },
            onPointerLeave(event) {
                emitter.hoverExit(event.currentTarget);
            },
            onKeyDown(event) {
                if (disabled || !isPressKey(event.key, event.currentTarget)) {
                    return;
                }
                emitter.keyDown(event, event.currentTarget);
            },
            onKeyUp(event) {
                if (!isPressKey(event.key, event.currentTarget)) return;
                emitter.keyUp(event.currentTarget);
            },
            onFocus(event) {
                if (!isOwnFocusEvent(event)) return;
                emitter.focusIn(event.currentTarget);
            },
            onBlur(event) {
                if (!isOwnFocusEvent(event)) return;
                emitter.blur(event.currentTarget);
            },
        }),
    );
}
