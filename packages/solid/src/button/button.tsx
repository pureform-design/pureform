// The button: Root on the button machine (press, focus, and an optional toggle on `selected`),
// its Label, Icon, and TouchTarget parts, and the ready-made Button over them.

import { buttonAnatomy } from "@pureform/anatomy";
import {
    BUTTON_CONTENT_PROPS,
    BUTTON_ROOT_PROPS,
    buttonMachineProps,
    buttonSelection,
} from "@pureform/binding-core";
import type {
    ButtonContentProps,
    ButtonRootOwnProps,
} from "@pureform/binding-core";
import * as button from "@pureform/machines/button";
import type { JSX, ValidComponent } from "@solidjs/web";
import { type Accessor, createMemo, createUniqueId, omit } from "solid-js";

import { useControllable } from "../controllable";
import { useOwnInteractionSource } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, optionalPart, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof buttonAnatomy;

/** What Root shares with its parts. */
interface ButtonContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<button.Api<PropTypes>>;
}

const context = createPartContext<ButtonContextValue>("Button");

/** Root's props: the variants and tokens, the machine's props (`disabled`, `type`, `selected`,
 *  …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface ButtonRootProps
    extends Omit<PartProps, keyof ButtonRootOwnProps>, ButtonRootOwnProps {
    /** Another element or component to render instead of `<button>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface ButtonPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The icon's props: a part's, and `mirror` to flip a pointing icon under right to left. */
export interface ButtonIconProps extends ButtonPartProps {
    readonly mirror?: boolean | undefined;
}

/** The button's root: a native `<button>` that runs the machine and shares it with its parts. */
function Root(props: ButtonRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const selected = useControllable("Button", "selected", props);
    const source = useOwnInteractionSource(() => props.interactionSource);
    const service = useMachine(button.machine, () => ({
        id,
        interactionSource: source(),
        dir: dir(),
        ...buttonMachineProps(props),
        ...selected.machineProps(),
    }));
    const api = createMemo(() => button.connect(service, normalizeProps));
    const scope = useComponent(buttonAnatomy, {
        selection: () => buttonSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
        interactionSource: source,
    });
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "button",
                as: () => props.as,
                machine: () => api().getRootProps(),
                states: () => ({ pressed: api().pressed }),
                props: omit(props, "as", ...BUTTON_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The button's text. */
function Label(props: ButtonPartProps): JSX.Element {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "span",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The icon's box, hidden from assistive technology. Render it only when there's an icon. */
function Icon(props: ButtonIconProps): JSX.Element {
    return renderIcon(props, false);
}

// The ready-made's icon, only while it has one, which it builds once.
const OptionalIcon = (props: ButtonIconProps): JSX.Element =>
    renderIcon(props, true);

function renderIcon(props: ButtonIconProps, optional: boolean): JSX.Element {
    const { scope, api } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: () => api().getIconProps(),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
        optional,
    });
}

/** The 48px touch target around a smaller button. Empty. */
function TouchTarget(props: ButtonPartProps): JSX.Element {
    const { scope } = context.use("TouchTarget");
    return scope.render("touchTarget", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made button's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  and the label and icon as content. */
export interface ButtonProps
    extends
        Omit<ButtonRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        ButtonContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...BUTTON_CONTENT_PROPS,
] as const;

/** The ready-made button: Root, its touch target, the icon when given, and the label. */
function ReadyMade(props: ButtonProps): JSX.Element {
    // The icon part builds the icon once, inside its own context, so `useIconStyle()` works in it.
    const IconPart = optionalPart(props, "icon", Icon, OptionalIcon);
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as ButtonRootProps;
    // The root's slot props are an element's, whose `id` also takes `false`.
    const root = slots("root") as object;
    const touchTarget = slots("touchTarget");
    const icon = slots("icon");
    const label = slots("label");
    return (
        <Root {...own} {...root}>
            <TouchTarget {...touchTarget} />
            <IconPart mirror={props.mirrorIcon} {...icon}>
                {props.icon}
            </IconPart>
            <Label {...label}>{props.label}</Label>
        </Root>
    );
}

/** Material's common button. Use it ready-made, `<Button label="Save" />`, or compose its parts:
 *  `<Button.Root><Button.TouchTarget /><Button.Label>Save</Button.Label></Button.Root>`. */
export const Button = Object.assign(ReadyMade, {
    Root,
    Label,
    Icon,
    TouchTarget,
});
