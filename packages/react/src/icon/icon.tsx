// The icon: a box at an icon size around whatever the app renders (an SVG, an icon font glyph),
// decorative unless given a `label`, flipped under `rtl` with `mirror`.

import { iconAnatomy } from "@pureform/anatomy";
import {
    ICON_ROOT_PROPS,
    iconRootProps,
    iconSelection,
} from "@pureform/binding-core";
import type { IconRootOwnProps } from "@pureform/binding-core";
import type { ElementType, ReactNode } from "react";

import type { PartProps } from "../props";
import { createSinglePart } from "../single-part";

/** The icon's props: its own (variants, tokens, `testId`, `unstyled`), `as`, and the
 *  element's own props. */
export interface IconProps
    extends Omit<PartProps, keyof IconRootOwnProps>, IconRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ElementType | undefined;
}

const Root = createSinglePart({
    anatomy: iconAnatomy,
    element: (_props: IconProps) => "span",
    ownProps: ICON_ROOT_PROPS,
    selection: iconSelection,
    machine: (props) => iconRootProps(props),
    states: (props) => ({ mirrored: props.mirror }),
});

/** An icon at an icon size: `<Icon size="large"><StarIcon /></Icon>`, or `<Icon
 *  label="Done">✓</Icon>` when it says something. Inside it, `useIconStyle()` gives its size and
 *  color. */
export const Icon: ((props: IconProps) => ReactNode) & {
    readonly Root: (props: IconProps) => ReactNode;
} = Object.assign(Root, { Root });
