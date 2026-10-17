// The suites' own indication, the same in the browser and on the server, which each binding's
// scene gives for the name `"custom"`: its own state-layer opacities and focus indicator, and
// Material's ripple with an effect that marks the surface while a press it hears lasts.

import type { Indication } from "@pureform/solid";

/** The attribute the custom indication's effect sets on a surface while it's pressed. */
export const CUSTOM_PRESSED = "data-suite-pressed";

/** The custom indication's tokens: stronger tints than Material's, a thicker focus indicator. */
export const CUSTOM_TOKENS = {
    stateHoverOpacity: 0.3,
    stateFocusOpacity: 0.3,
    statePressedOpacity: 0.4,
    stateDraggedOpacity: 0.4,
    focusIndicatorThickness: 6,
    focusIndicatorColor: "rgb(0, 128, 0)",
} as const;

/** The custom indication over the binding's `materialIndication()`, whose ripple it draws. */
export const customIndication = (material: Indication): Indication => ({
    name: "app:suites",
    tokens: CUSTOM_TOKENS,
    layer: true,
    web: (target, source, context) => {
        const ripple = material.web?.(target, source, context);
        const unsubscribe = source.subscribe((_, state) => {
            target.surface.toggleAttribute(CUSTOM_PRESSED, state.pressed);
        });
        return () => {
            ripple?.();
            unsubscribe();
        };
    },
});
