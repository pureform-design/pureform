// The avatar: Root, its `image` (the picture, on Zag's avatar machine, shown once it has loaded)
// and `fallback` (initials or an icon, shown until then and when the picture fails), and the
// ready-made Avatar over them. `label` names it; without one it's decorative. The machine runs
// in the picture, so an avatar of initials, a row's usual, sets up no machine.

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
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createSignal,
    createUniqueId,
    omit,
    Show,
} from "solid-js";

import { normalizeProps, useMachine } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof avatarAnatomy;

/** What Root shares with its parts. */
interface AvatarContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly props: AvatarRootOwnProps;
    /** Whether the picture has loaded. */
    readonly loaded: Accessor<boolean>;
    readonly setLoaded: (loaded: boolean) => void;
}

const context = createPartContext<AvatarContextValue>("Avatar");

/** Root's props: the variants and tokens, `label`, `onStatusChange`, `testId` and `unstyled` for
 *  every part, `as`, and the element's own props. */
export interface AvatarRootProps
    extends Omit<PartProps, keyof AvatarRootOwnProps>, AvatarRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface AvatarPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The picture's props: the element's own (`src`), and the part's `unstyled`. */
export interface AvatarImageProps extends AvatarPartProps {
    readonly src?: string | undefined;
}

/** The avatar's root: it keeps whether the picture has loaded, which its fallback hides for. */
function Root(props: AvatarRootProps): JSX.Element {
    const [loaded, setLoaded] = createSignal(false);
    const scope = useComponent(avatarAnatomy, {
        selection: () => avatarSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope, props, loaded, setLoaded }}>
            {scope.render("root", {
                element: "span",
                as: () => props.as,
                machine: () => avatarRootProps(props),
                props: omit(props, "as", ...AVATAR_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The picture, which shows once it has loaded. It is decorative: the root names the avatar. */
function Image(props: AvatarImageProps): JSX.Element {
    const { scope, props: root, setLoaded } = context.use("Image");
    const id = createUniqueId();
    const dir = useDirection();
    const service = useMachine(avatar.machine, () => ({
        dir: dir(),
        ...avatarMachineProps({
            id,
            onStatusChange: (details: { status: "loaded" | "error" }) => {
                setLoaded(details.status === "loaded");
                root.onStatusChange?.(details);
            },
        }),
    }));
    const api = createMemo(() => avatar.connect(service, normalizeProps));
    return scope.render("image", {
        element: "img",
        machine: () => ({ ...api().getImageProps(), alt: "" }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** What stands in for the picture, initials or an icon, until it has loaded and if it fails. */
function Fallback(props: AvatarPartProps): JSX.Element {
    const { scope, loaded } = context.use("Fallback");
    return scope.render("fallback", {
        element: "span",
        machine: () => ({
            hidden: loaded(),
            "data-state": loaded() ? "hidden" : "visible",
        }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made avatar's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  and its content. */
export interface AvatarProps
    extends
        Omit<AvatarRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        AvatarContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "src",
    "children",
] as const;

/** The ready-made avatar: the picture and its fallback with a `src`, else the children in the
 *  root. */
function ReadyMade(props: AvatarProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as AvatarRootProps;
    const root = slots("root") as object;
    return (
        <Root {...own} {...root}>
            {/* Without a picture the children sit in the root, as an avatar of initials is. */}
            <Show when={props.src !== undefined} fallback={props.children}>
                <Image {...slots("image")} src={props.src} />
                <Fallback {...slots("fallback")}>{props.children}</Fallback>
            </Show>
        </Root>
    );
}

/** Material's avatar: `<Avatar src="/ada.png" label="Ada Lovelace">AL</Avatar>`, the initials
 *  showing until the picture has loaded (or without one), or compose its parts under
 *  `Avatar.Root`: `Image` and `Fallback`. */
export const Avatar = Object.assign(ReadyMade, { Root, Image, Fallback });
