// The ripple: Root, the layer the ripples draw in, on pureform's ripple machine. Placed inside a
// positioned surface, it grows a ripple from each press on the surface, classed with the preset's
// `ripple` slot, and draws none while motion is reduced.

import { rippleAnatomy } from "@pureform/anatomy";
import {
    isUnstyled,
    RIPPLE_ROOT_PROPS,
    rippleMachineProps,
    rippleSelection,
} from "@pureform/binding-core";
import type { RippleRootOwnProps } from "@pureform/binding-core";
import * as ripple from "@pureform/machines/ripple";
import { normalizeProps } from "@zag-js/react";
import { type ElementType, type ReactNode, useId } from "react";

import { useMachine } from "../machine";
import { useReducedMotion } from "../motion";
import { useComponent } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";

/** The ripple's props: the machine's (`disabled`, `centered`, `effect`, …), the tokens, `testId`
 *  and `unstyled`, `as`, and the element's own props. */
export interface RippleProps
    extends Omit<PartProps, keyof RippleRootOwnProps>, RippleRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ElementType | undefined;
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
        rippleClass: isUnstyled(props.unstyled, "ripple")
            ? undefined
            : scope.classes.ripple?.class,
        ...rippleMachineProps(props),
    });
    const api = ripple.connect(service, normalizeProps);
    const { as, ...rest } = omitProps(props, RIPPLE_ROOT_PROPS);
    return scope.render("root", {
        element: "span",
        as,
        machine: api.getLayerProps(),
        props: rest,
    });
}

/** Material's press ripple: put `<Ripple />` inside a positioned surface (`position: relative`),
 *  and each press on the surface ripples. The ripple's color is the surface's text color. */
export const Ripple = Object.assign(Root, { Root });
