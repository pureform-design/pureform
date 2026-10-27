// The button: Root on the button machine (press, focus, and an optional toggle on `selected`),
// its Label, Icon, SecondaryIcon, and TouchTarget parts, and the ready-made Button over them.

import { buttonAnatomy } from "@pureform/anatomy";
import {
    BUTTON_ROOT_PROPS,
    buttonSelection,
    isPresent,
} from "@pureform/binding-core";
import type {
    ButtonContentProps,
    ButtonRootOwnProps,
} from "@pureform/binding-core";
import { buttonMachineProps } from "@pureform/binding-web";
import * as button from "@pureform/machines/button";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId } from "react";

import { useControllable } from "../controllable";
import { useOwnInteractionSource } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof buttonAnatomy;

/** What Root shares with its parts. */
interface ButtonContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: button.Api<PropTypes>;
}

const context = createPartContext<ButtonContextValue>("Button");

/** Root's props: the variants and tokens, the machine's props (`disabled`, `type`, `selected`,
 *  …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface ButtonRootProps
    extends Omit<PartProps, keyof ButtonRootOwnProps>, ButtonRootOwnProps {
    /** Another element or component to render instead of `<button>`. */
    readonly as?: ElementType | undefined;
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
function Root(props: ButtonRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const selected = useControllable("Button", "selected", props);
    const source = useOwnInteractionSource(props.interactionSource);
    const service = useMachine(button.machine, {
        id,
        interactionSource: source,
        dir,
        ...buttonMachineProps(props),
        ...selected.machineProps,
    });
    const api = button.connect(service, normalizeProps);
    const scope = useComponent(buttonAnatomy, {
        selection: buttonSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
        interactionSource: source,
    });
    const { as, ...rest } = omitProps(props, BUTTON_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "button",
                as,
                machine: api.getRootProps(),
                states: { pressed: api.pressed },
                props: rest,
            })}
        </context.Provider>
    );
}

/** The button's text. */
function Label({ unstyled, ...props }: ButtonPartProps): ReactNode {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "span",
        machine: api.getLabelProps(),
        unstyled,
        props,
    });
}

/** The icon's box, hidden from assistive technology. Render it only when there's an icon. */
function Icon({ unstyled, mirror, ...props }: ButtonIconProps): ReactNode {
    const { scope, api } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: api.getIconProps(),
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The secondary icon's box (a dropdown arrow, say), hidden from assistive technology. Render it
 *  only when there's one, on the side `secondaryIconPosition` names. */
function SecondaryIcon({
    unstyled,
    mirror,
    ...props
}: ButtonIconProps): ReactNode {
    const { scope, api } = context.use("SecondaryIcon");
    return scope.render("secondaryIcon", {
        element: "span",
        machine: api.getSecondaryIconProps(),
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The 48px touch target around a smaller button. Empty. */
function TouchTarget({ unstyled, ...props }: ButtonPartProps): ReactNode {
    const { scope } = context.use("TouchTarget");
    return scope.render("touchTarget", { element: "span", unstyled, props });
}

/** The ready-made button's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, and the label and icon as content. */
export interface ButtonProps
    extends
        Omit<ButtonRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        ButtonContentProps<ReactNode> {}

/** The ready-made button: Root, its touch target, the icons when given, and the label. */
function ReadyMade(props: ButtonProps): ReactNode {
    const slot = useSlotProps(props);
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        label,
        icon,
        secondaryIcon,
        mirrorIcon,
        ...rootProps
    } = props;
    const secondary = isPresent(secondaryIcon) ? (
        <SecondaryIcon mirror={mirrorIcon} {...slot("secondaryIcon")}>
            {secondaryIcon}
        </SecondaryIcon>
    ) : null;
    const start = rootProps.secondaryIconPosition === "start";
    return (
        <Root {...rootProps} {...slot("root")}>
            <TouchTarget {...slot("touchTarget")} />
            {start ? secondary : null}
            {icon != null && icon !== false ? (
                <Icon mirror={mirrorIcon} {...slot("icon")}>
                    {icon}
                </Icon>
            ) : null}
            <Label {...slot("label")}>{label}</Label>
            {start ? null : secondary}
        </Root>
    );
}

/** Material's common button. Use it ready-made, `<Button label="Save" />`, or compose its parts:
 *  `<Button.Root><Button.TouchTarget /><Button.Label>Save</Button.Label></Button.Root>`. */
export const Button = Object.assign(ReadyMade, {
    Root,
    Label,
    Icon,
    SecondaryIcon,
    TouchTarget,
});
