// The scrim: a translucent layer that dims what sits behind a modal surface, hidden from assistive
// technology. Place it inside a positioned container.

import { scrimAnatomy } from "@pureform/anatomy";
import { SCRIM_ROOT_PROPS, scrimSelection } from "@pureform/binding-core";
import type { ScrimRootOwnProps } from "@pureform/binding-core";
import type { ElementType, ReactNode } from "react";

import type { PartProps } from "../props";
import { createSinglePart } from "../single-part";

const SCRIM_ELEMENT_PROPS = { "aria-hidden": "true" } as const;

/** The scrim's props: its own (variants, tokens, `testId`, `unstyled`), `as`, and the
 *  element's own props. */
export interface ScrimProps
    extends Omit<PartProps, keyof ScrimRootOwnProps>, ScrimRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

const Root = createSinglePart({
    anatomy: scrimAnatomy,
    element: (_props: ScrimProps) => "div",
    ownProps: SCRIM_ROOT_PROPS,
    selection: scrimSelection,
    machine: () => SCRIM_ELEMENT_PROPS,
});

/** Material's scrim: `<Scrim onClick={close} />` inside a positioned container, under a modal
 *  surface. */
export const Scrim: ((props: ScrimProps) => ReactNode) & {
    readonly Root: (props: ScrimProps) => ReactNode;
} = Object.assign(Root, { Root });
