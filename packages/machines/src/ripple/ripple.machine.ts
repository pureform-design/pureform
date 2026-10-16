import { ripple } from "@pureform/js-effects";
import type { RippleOptions } from "@pureform/js-effects";
import { createMachine } from "@zag-js/core";

import * as dom from "./ripple.dom";
import type { RippleSchema } from "./ripple.types";

// The ripple of `@pureform/js-effects`, run as a machine so bindings treat it like the others.
// Prop changes apply without restarting it.
export const machine = createMachine<RippleSchema>({
    props({ props }) {
        return { variant: "ink-well", ...props };
    },

    initialState() {
        return "ready";
    },

    states: {
        ready: {
            effects: ["trackRipple"],
        },
    },

    implementations: {
        effects: {
            trackRipple({ prop, scope }) {
                const layer = dom.getLayerEl(scope);
                if (!layer) return;
                const surface =
                    prop("getSurfaceEl")?.(layer) ?? layer.parentElement;
                if (!surface) return;
                // Getters, since js-effects reads each option at the press that needs it.
                const options = {
                    getRippleLayer: () => dom.getLayerEl(scope),
                    disabled: () =>
                        !!prop("disabled") || prop("reducedMotion") === true,
                    get variant() {
                        return prop("variant");
                    },
                    get centerOrigin() {
                        return prop("centered") ?? false;
                    },
                    get class() {
                        return prop("rippleClass") ?? "";
                    },
                    get allowPropagation() {
                        return prop("allowPropagation") ?? false;
                    },
                    // A binding's own setting replaces the media query.
                    get respectReducedMotion() {
                        return prop("reducedMotion") === undefined;
                    },
                    get color() {
                        return prop("color");
                    },
                    get timing() {
                        return prop("timing");
                    },
                    get sparkle() {
                        return prop("sparkle");
                    },
                } as RippleOptions;
                return ripple(surface, options);
            },
        },
    },
});
