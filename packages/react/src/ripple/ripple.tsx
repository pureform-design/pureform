// The ripple: Root, the layer the ripples draw in, on pureform's ripple machine. Placed inside a
// positioned surface, it grows a ripple from each press on the surface, classed with the preset's
// `ripple` slot, and draws none while motion is reduced.

import { rippleAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import { rippleSelection } from "@pureform/binding-core";
import {
    RIPPLE_DOM_ROOT_PROPS,
    rippleDomMachineProps,
    styleRippleElement,
} from "@pureform/binding-web";
import type { RippleDomRootOwnProps } from "@pureform/binding-web";
import * as ripple from "@pureform/machines/ripple";
import { normalizeProps } from "@zag-js/react";
import { type ElementType, type ReactNode, useId } from "react";

import { useMachine } from "../machine";
import { useReducedMotion } from "../motion";
import { useComponent } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";

/** The ripple's props: the machine's (`disabled`, `centered`, `effect`, …), the tokens, `testId`
 *  and `unstyled`, `as`, and the element's own props. */
export interface RippleProps
    extends
        Omit<PartProps, keyof RippleDomRootOwnProps>,
        RippleDomRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ElementType | undefined;
    /** Layer props and decorative ink styling/identifying attributes; the renderer owns ink geometry.
     *  The ink has no keyed `className` or `style` (those are the layer element's own), so its
     *  `slotProps` take them. */
    readonly slotProps?: {
        readonly [P in PartName<typeof rippleAnatomy>]?: PartProps;
    };
}

/** The ripple's root: an empty layer over its surface, hidden from assistive technology. */
function Root(props: RippleProps): ReactNode {
    const id = useId();
    const reducedMotion = useReducedMotion();
    const scope = useComponent(rippleAnatomy, {
        selection: rippleSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const service = useMachine(ripple.machine, {
        id,
        reducedMotion,
        decorateElement: (element) =>
            styleRippleElement(
                element,
                scope.part("ripple", {
                    props: props.slotProps?.ripple,
                }),
            ),
        ...rippleDomMachineProps(props),
    });
    const api = ripple.connect(service, normalizeProps);
    const { as, slotProps, ...rest } = omitProps(props, RIPPLE_DOM_ROOT_PROPS);
    return scope.render("root", {
        element: "span",
        as,
        machine: api.getLayerProps(),
        props: combinePartProps([slotProps?.root, rest]),
    });
}

/** Material's press ripple: put `<Ripple />` inside a positioned surface (`position: relative`),
 *  and each press on the surface ripples. The ripple's color is the surface's text color. */
export const Ripple = Object.assign(Root, { Root });
