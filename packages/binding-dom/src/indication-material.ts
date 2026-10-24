// The web halves of the built-in indications: Material's ripple, drawn in the surface's layer
// element from the source's presses over `createRipple` from `@pureform/js-effects`. Binding-core's
// Material indications have no live half; `webIndication` gives them this one, as React Native
// gives them its own.

import {
    materialIndication as neutralMaterialIndication,
    rippleClasses,
} from "@pureform/binding-core/indication";
import type {
    Indication,
    IndicationContext,
    MaterialIndicationOptions,
} from "@pureform/binding-core/indication";
import { createRipple } from "@pureform/js-effects";
import type { RippleController } from "@pureform/js-effects";

// Draws the ripple in the target's layer from each press the source hears, whichever surface it
// came from; the controller is made on the first press.
const drawRipple =
    (variant: "ink-well" | "ink-sparkle"): NonNullable<Indication["web"]> =>
    (target, source, context: IndicationContext) => {
        let controller: RippleController | undefined;
        const held = new Set<number>();
        const unsubscribe = source.subscribe((interaction) => {
            switch (interaction.type) {
                case "press": {
                    if (!target.layer || context.reducedMotion()) return;
                    controller ??= createRipple(() => target.layer, {
                        variant,
                        get centerOrigin() {
                            return context.centered;
                        },
                        get class() {
                            return (
                                rippleClasses(context.registry)?.ripple
                                    ?.class ?? ""
                            );
                        },
                        // The context says whether motion is reduced.
                        respectReducedMotion: false,
                    });
                    held.add(interaction.id);
                    controller.press(
                        interaction.origin,
                        interaction.pointer === "touch",
                    );
                    return;
                }
                case "release":
                    if (held.delete(interaction.id)) controller?.release();
                    return;
                case "cancel":
                    if (held.delete(interaction.id)) controller?.cancel();
                    return;
            }
        });
        return () => {
            unsubscribe();
            held.clear();
            controller?.cancel();
        };
    };

const webs = new WeakMap<Indication, Indication>();

const neutralRipples = new Map<Indication, "ink-well" | "ink-sparkle">([
    [neutralMaterialIndication(), "ink-well"],
    [neutralMaterialIndication({ ripple: "ink-sparkle" }), "ink-sparkle"],
]);

/** An indication with its web half: binding-core's Material indications (which have no live
 *  half) get the ripple; any other is as given. The same object for the same indication. */
export const webIndication = (indication: Indication): Indication => {
    const variant = neutralRipples.get(indication);
    if (variant === undefined) return indication;
    let web = webs.get(indication);
    if (!web) {
        web = Object.freeze({ ...indication, web: drawRipple(variant) });
        webs.set(indication, web);
    }
    return web;
};

/** Material's indication, the default: the state layer at the theme's opacities, the ripple
 *  through the preset's `ripple` styles (in a layer element inside each surface), and the focus
 *  indicator. Named as binding-core's (`"material"`, `"material:ink-sparkle"`,
 *  `"material:no-ripple"`), and the same object for the same options. */
export const materialIndication = (
    options: MaterialIndicationOptions = {},
): Indication => webIndication(neutralMaterialIndication(options));

/** The indication with no provider or component choosing one: Material's, with the ink well. */
export const DEFAULT_INDICATION: Indication = materialIndication();
