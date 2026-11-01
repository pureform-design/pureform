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
import type { JSX, ValidComponent } from "@solidjs/web";
import { createMemo, createUniqueId, merge, omit } from "solid-js";

import { normalizeProps, useMachine } from "../internal/zag";
import { useReducedMotion } from "../motion";
import { useComponent } from "../parts";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";

/** The ripple's props: the machine's (`disabled`, `centered`, `effect`, …), the tokens, `testId`
 *  and `unstyled`, `as`, and the element's own props. */
export interface RippleProps
    extends
        Omit<PartProps, keyof RippleDomRootOwnProps>,
        RippleDomRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ValidComponent | undefined;
    /** Layer props and decorative ink styling/identifying attributes; the renderer owns ink geometry. */
    /** The ink has no keyed `class` or `style` (those are the layer element's own), so its
     *  `slotProps` take them. */
    readonly slotProps?: {
        readonly [P in PartName<typeof rippleAnatomy>]?: PartProps;
    };
}

/** The ripple's root: an empty layer over its surface, hidden from assistive technology. */
function Root(props: RippleProps): JSX.Element {
    const id = createUniqueId();
    const reducedMotion = useReducedMotion();
    const scope = useComponent(rippleAnatomy, {
        selection: () => rippleSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const inkCustomization = merge(() => props.slotProps?.ripple ?? {});
    const inkProps = scope.part("ripple", { props: inkCustomization });
    const service = useMachine(ripple.machine, () => ({
        id,
        reducedMotion: reducedMotion(),
        decorateElement: (element) => styleRippleElement(element, inkProps),
        ...rippleDomMachineProps(props),
    }));
    const api = createMemo(() => ripple.connect(service, normalizeProps));
    const rest = omit(props, "as", "slotProps", ...RIPPLE_DOM_ROOT_PROPS);
    const rootProps = merge(() =>
        combinePartProps([props.slotProps?.root, rest]),
    );
    return scope.render("root", {
        element: "span",
        as: () => props.as,
        machine: () => api().getLayerProps(),
        props: rootProps,
    });
}

/** Material's press ripple: put `<Ripple />` inside a positioned surface (`position: relative`),
 *  and each press on the surface ripples. The ripple's color is the surface's text color. */
export const Ripple = Object.assign(Root, { Root });
