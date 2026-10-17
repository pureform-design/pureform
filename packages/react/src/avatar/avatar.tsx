// The avatar: a picture (`src`, an `<img>`), or initials or an icon (its children, in a `<span>`),
// in a color group's container. `label` names it; without one it's decorative.

import { avatarAnatomy } from "@pureform/anatomy";
import {
    AVATAR_ROOT_PROPS,
    avatarElement,
    avatarRootProps,
    avatarSelection,
} from "@pureform/binding-core";
import type { AvatarRootOwnProps } from "@pureform/binding-core";
import type { ElementType, ReactNode } from "react";

import type { PartProps } from "../props";
import { createSinglePart } from "../single-part";

/** The avatar's props: its own (variants, tokens, `testId`, `unstyled`), `as`, and the
 *  element's own props. */
export interface AvatarProps
    extends Omit<PartProps, keyof AvatarRootOwnProps>, AvatarRootOwnProps {
    /** Another element or component to render instead of `<img>` or `<span>`. */
    readonly as?: ElementType | undefined;
}

const Root = createSinglePart({
    anatomy: avatarAnatomy,
    element: (props: AvatarProps) => avatarElement({ src: props.src }),
    ownProps: AVATAR_ROOT_PROPS,
    selection: avatarSelection,
    machine: (props, element) => avatarRootProps(props, element),
});

/** Material's avatar: `<Avatar src="/ada.png" label="Ada Lovelace" />`, or initials, `<Avatar
 *  label="Ada Lovelace">AL</Avatar>`. */
export const Avatar: ((props: AvatarProps) => ReactNode) & {
    readonly Root: (props: AvatarProps) => ReactNode;
} = Object.assign(Root, { Root });
