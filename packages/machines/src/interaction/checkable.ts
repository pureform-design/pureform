// What a checkbox and a switch emit, the same for both: their root (the label around the control)
// is pressed and hovered, and their native input takes focus and the Space key.

import type { NormalizeProps, PropTypes } from "@zag-js/types";

import type { InteractionEmitter } from "./emitter";
import { chainProps, isOwnFocusEvent } from "./zag";

interface CheckableApi {
    getRootProps(): unknown;
    getHiddenInputProps(): unknown;
}

/** `api` with its root and hidden input emitting to `emitter`. */
export function checkableInteraction<
    A extends CheckableApi,
    T extends PropTypes,
>(
    api: A,
    emitter: InteractionEmitter,
    disabled: boolean,
    normalize: NormalizeProps<T>,
): A {
    return {
        ...api,
        getRootProps: () =>
            chainProps(
                api.getRootProps(),
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
                }),
            ),
        getHiddenInputProps: () =>
            chainProps(
                api.getHiddenInputProps(),
                normalize.element({
                    onKeyDown(event) {
                        if (disabled || event.key !== " ") return;
                        emitter.keyDown(event, event.currentTarget);
                    },
                    onKeyUp(event) {
                        if (event.key !== " ") return;
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
            ),
    };
}
