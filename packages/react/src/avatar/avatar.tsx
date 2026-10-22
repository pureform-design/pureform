// The avatar: Root on Zag's avatar machine, its `image` (the picture, shown once loaded) and
// `fallback` (initials or an icon, shown until then and when the picture fails), and the
// ready-made Avatar over them. `label` names it; without one it's decorative.

import { avatarAnatomy } from "@pureform/anatomy";
import {
    AVATAR_ROOT_PROPS,
    avatarMachineProps,
    avatarRootProps,
    avatarSelection,
} from "@pureform/binding-core";
import type {
    AvatarContentProps,
    AvatarRootOwnProps,
} from "@pureform/binding-core";
import * as avatar from "@pureform/machines/avatar";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import type { ElementType, ReactNode } from "react";
import { useId } from "react";

import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof avatarAnatomy;

/** What Root shares with its parts. */
interface AvatarContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: avatar.Api<PropTypes>;
}

const context = createPartContext<AvatarContextValue>("Avatar");

/** Root's props: the variants and tokens, `label`, `onStatusChange`, `testId` and `unstyled` for
 *  every part, `as`, and the element's own props. */
export interface AvatarRootProps
    extends Omit<PartProps, keyof AvatarRootOwnProps>, AvatarRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface AvatarPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The picture's props: the element's own (`src`), and the part's `unstyled`. */
export interface AvatarImageProps extends AvatarPartProps {
    readonly src?: string | undefined;
}

/** The avatar's root: it runs the machine that tracks whether the picture has loaded. */
function Root(props: AvatarRootProps): ReactNode {
    const generated = useId();
    const dir = useDirection();
    const service = useMachine(avatar.machine, {
        dir,
        ...avatarMachineProps({ id: generated, ...props }),
    });
    const api = avatar.connect(service, normalizeProps);
    const scope = useComponent(avatarAnatomy, {
        selection: avatarSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, AVATAR_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "span",
                as,
                machine: combinePartProps([
                    api.getRootProps(),
                    avatarRootProps(props),
                ]),
                props: rest,
            })}
        </context.Provider>
    );
}

/** The picture, which shows once it has loaded. It is decorative: the root names the avatar. */
function Image({ unstyled, ...props }: AvatarImageProps): ReactNode {
    const { scope, api } = context.use("Image");
    return scope.render("image", {
        element: "img",
        machine: { ...api.getImageProps(), alt: "" },
        unstyled,
        props,
    });
}

/** What stands in for the picture, initials or an icon, until it has loaded and if it fails. */
function Fallback({ unstyled, ...props }: AvatarPartProps): ReactNode {
    const { scope, api } = context.use("Fallback");
    return scope.render("fallback", {
        element: "span",
        machine: api.getFallbackProps(),
        unstyled,
        props,
    });
}

/** The ready-made avatar's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, and its content. */
export interface AvatarProps
    extends
        Omit<AvatarRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        AvatarContentProps<ReactNode> {}

/** The ready-made avatar: the picture (with a `src`) and its fallback. */
function ReadyMade(props: AvatarProps): ReactNode {
    const slot = useSlotProps(props);
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        src,
        children,
        ...rootProps
    } = props;
    return (
        <Root {...rootProps} {...slot("root")}>
            {src !== undefined && <Image {...slot("image")} src={src} />}
            <Fallback {...slot("fallback")}>{children}</Fallback>
        </Root>
    );
}

/** Material's avatar: `<Avatar src="/ada.png" label="Ada Lovelace">AL</Avatar>`, the initials
 *  showing until the picture has loaded (or without one), or compose its parts under
 *  `Avatar.Root`: `Image` and `Fallback`. */
export const Avatar = Object.assign(ReadyMade, { Root, Image, Fallback });
