// The touch target: an invisible box that grows a small interactive element's hit area to the
// theme's minimum, hidden from assistive technology. Put it first inside a positioned, interactive
// element.

import { touchTargetAnatomy } from "@pureform/anatomy";
import { TOUCH_TARGET_ROOT_PROPS } from "@pureform/binding-core";
import type { TouchTargetRootOwnProps } from "@pureform/binding-core";
import type { ElementType, ReactNode } from "react";

import type { PartProps } from "../props";
import { createSinglePart } from "../single-part";

const TOUCH_TARGET_ELEMENT_PROPS = { "aria-hidden": "true" } as const;

/** The touch target's props: its own (variants, tokens, `testId`, `unstyled`), `as`, and the
 *  element's own props. */
export interface TouchTargetProps
    extends
        Omit<PartProps, keyof TouchTargetRootOwnProps>,
        TouchTargetRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ElementType | undefined;
}

const Root = createSinglePart({
    anatomy: touchTargetAnatomy,
    element: (_props: TouchTargetProps) => "span",
    ownProps: TOUCH_TARGET_ROOT_PROPS,
    selection: () => ({}),
    machine: () => TOUCH_TARGET_ELEMENT_PROPS,
});

/** Grows a small interactive element's hit area: `<button class="chip"><TouchTarget
 *  />Filter</button>`. */
export const TouchTarget: ((props: TouchTargetProps) => ReactNode) & {
    readonly Root: (props: TouchTargetProps) => ReactNode;
} = Object.assign(Root, { Root });
