// The built-in indications, without their live halves. Material's draws the state layer and the
// focus indicator through the preset's styles, at the theme's values, and holds a layer element
// for the ripple, which each platform draws (`@pureform/binding-web` on the web, the engine's
// press ripple on React Native); no indication sets the state layer's opacities to 0 and keeps
// the focus indicator.

import type { SlotClasses } from "@pureform/styling";

import type { Indication } from "./indication";
import type { AnyRegistry } from "./provider";

/** The ripple Material's indication draws: the ink well, the newer sparkle, or none. */
export type MaterialRipple = "ink-well" | "ink-sparkle" | false;

/** What `materialIndication` takes. */
export interface MaterialIndicationOptions {
    /** The ripple a press draws. @default "ink-well" */
    readonly ripple?: MaterialRipple | undefined;
}

/** The ripple's slots, from the registry's `ripple` entry: the layer (`root`) and each ripple
 *  element (`ripple`). */
export interface RippleClasses {
    readonly root?: SlotClasses | undefined;
    readonly ripple?: SlotClasses | undefined;
}

const rippleClassCache = new WeakMap<AnyRegistry, RippleClasses | null>();

/** The ripple's classes from the registry's `ripple` entry; `undefined` when the registry has no
 *  static `ripple` entry (left out, or loaded on demand). The same object for a registry. */
export const rippleClasses = (
    registry: AnyRegistry | undefined,
): RippleClasses | undefined => {
    if (!registry) return undefined;
    let classes = rippleClassCache.get(registry);
    if (classes === undefined) {
        classes = null;
        if (registry.has("ripple")) {
            const entry = registry.entry("ripple");
            if (entry.kind === "static") {
                classes = (
                    entry.factory as (selection: object) => RippleClasses
                )({});
            }
        }
        rippleClassCache.set(registry, classes);
    }
    return classes ?? undefined;
};

const materialIndications = new Map<MaterialRipple, Indication>();

/** Material's indication, the default: the state layer at the theme's opacities, a layer element
 *  inside each surface for the ripple, and the focus indicator. This is the platform-neutral one,
 *  with no live half: the bindings draw its ripple (`@pureform/binding-web`'s
 *  `materialIndication` on the web, React Native's own). The same object for the same options. */
export const materialIndication = (
    options: MaterialIndicationOptions = {},
): Indication => {
    const ripple = options.ripple ?? "ink-well";
    let indication = materialIndications.get(ripple);
    if (!indication) {
        indication = Object.freeze(
            ripple === false
                ? { name: "material:no-ripple" }
                : {
                      name:
                          ripple === "ink-well"
                              ? "material"
                              : `material:${ripple}`,
                      layer: true,
                  },
        );
        materialIndications.set(ripple, indication);
    }
    return indication;
};

/** No indication: the state layer's opacities at 0 and no ripple. It keeps the focus indicator,
 *  which keyboard users need. */
export const noIndication: Indication = Object.freeze({
    name: "none",
    tokens: Object.freeze({
        stateHoverOpacity: 0,
        stateFocusOpacity: 0,
        statePressedOpacity: 0,
        stateDraggedOpacity: 0,
    }),
});

/** The indication with no provider or component choosing one: Material's, with the ink well. */
export const DEFAULT_INDICATION: Indication = materialIndication();
