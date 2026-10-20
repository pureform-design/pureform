// The badge: a dot (`small`) or a short label or count (`large`, its children) in the error color.
// `label` names it for assistive technology. Styling only; `placement="anchored"` puts it on the
// corner of its positioned parent.

import { badgeAnatomy } from "@pureform/anatomy";
import {
    BADGE_ROOT_PROPS,
    badgeRootProps,
    badgeSelection,
} from "@pureform/binding-core";
import type { BadgeRootOwnProps } from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";

import type { PartProps } from "../props";
import { createSinglePart } from "../single-part";

/** The badge's props: its own (variants, tokens, `testId`, `unstyled`), `as`, and the
 *  element's own props. */
export interface BadgeProps
    extends Omit<PartProps, keyof BadgeRootOwnProps>, BadgeRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ValidComponent | undefined;
}

const Root = createSinglePart({
    anatomy: badgeAnatomy,
    element: (_props: BadgeProps) => "span",
    ownProps: BADGE_ROOT_PROPS,
    selection: badgeSelection,
    machine: (props) => badgeRootProps(props),
});

/** Material's badge: `<Badge>3</Badge>`, or a dot, `<Badge size="small" />`. */
export const Badge: ((props: BadgeProps) => JSX.Element) & {
    readonly Root: (props: BadgeProps) => JSX.Element;
} = Object.assign(Root, { Root });
