// The ripple: Root, the layer the ripples draw in, on pureform's ripple machine. Placed inside a
// positioned surface, it grows a ripple from each press on the surface, classed with the preset's
// `ripple` slot, and draws none while motion is reduced.

import { rippleAnatomy } from "@pureform/anatomy";
import { isUnstyled, rippleSelection } from "@pureform/binding-core";
import {
    RIPPLE_DOM_ROOT_PROPS,
    rippleDomMachineProps,
} from "@pureform/binding-web";
import type { RippleDomRootOwnProps } from "@pureform/binding-web";
import * as ripple from "@pureform/machines/ripple";
import type { JSX, ValidComponent } from "@solidjs/web";
import { createMemo, createUniqueId, omit } from "solid-js";

import { normalizeProps, useMachine } from "../internal/zag";
import { useReducedMotion } from "../motion";
import { useComponent } from "../parts";
import type { PartProps } from "../props";

/** The ripple's props: the machine's (`disabled`, `centered`, `effect`, …), the tokens, `testId`
 *  and `unstyled`, `as`, and the element's own props. */
export interface RippleProps
    extends
        Omit<PartProps, keyof RippleDomRootOwnProps>,
        RippleDomRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ValidComponent | undefined;
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
    const service = useMachine(ripple.machine, () => ({
        id,
        reducedMotion: reducedMotion(),
        rippleClass: isUnstyled(props.unstyled, "ripple")
            ? undefined
            : scope.classes().ripple?.class,
        ...rippleDomMachineProps(props),
    }));
    const api = createMemo(() => ripple.connect(service, normalizeProps));
    const rest = omit(props, "as", ...RIPPLE_DOM_ROOT_PROPS);
    return scope.render("root", {
        element: "span",
        as: () => props.as,
        machine: () => api().getLayerProps(),
        props: rest,
    });
}

/** Material's press ripple: put `<Ripple />` inside a positioned surface (`position: relative`),
 *  and each press on the surface ripples. The ripple's color is the surface's text color. */
export const Ripple = Object.assign(Root, { Root });
