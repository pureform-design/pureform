// The built-in indications, without their live halves. Material's draws the state layer and the
// focus indicator through the preset's styles, at the theme's values, and holds a layer element
// for the ripple, which each platform draws (`@pureform/binding-web` on the web, the engine's
// press ripple on React Native); no indication sets the state layer's opacities to 0 and keeps
// the focus indicator.

import type { Indication } from "./indication";

/** The ripple Material's indication draws: the ink well, the newer sparkle, or none. */
export type MaterialRipple = "ink-well" | "ink-sparkle" | false;

/** What `materialIndication` takes. */
export interface MaterialIndicationOptions {
    /** The ripple a press draws. @default "ink-well" */
    readonly ripple?: MaterialRipple | undefined;
}

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
