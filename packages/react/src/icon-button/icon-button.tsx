// The icon button: Root on the button machine (press, focus, and a toggle on `selected`), its
// TouchTarget, Container, Icon, and Outline parts, and the ready-made IconButton over them. A
// toggle icon button selects the preset's `toggle` variant, which draws Material's toggle colors
// and fills the icon while selected.

import { iconButtonAnatomy } from "@pureform/anatomy";
import {
    buttonMachineProps,
    hasAccessibleName,
    ICON_BUTTON_ROOT_PROPS,
    iconButtonSelection,
    missingNameMessage,
    warnOnce,
} from "@pureform/binding-core";
import type {
    IconButtonContentProps,
    IconButtonRootOwnProps,
    IconOnlyName,
} from "@pureform/binding-core";
import type * as button from "@pureform/machines/button";
import type { PropTypes } from "@zag-js/react";
import type { ElementType, ReactNode } from "react";

import { isDev } from "../env";
import { createPartContext } from "../part-context";
import { slotPartProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePressable } from "../pressable";
import { omitProps } from "../props";
import type { PartProps } from "../props";

type Anatomy = typeof iconButtonAnatomy;

/** What Root shares with its parts. */
interface IconButtonContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: button.Api<PropTypes>;
}

const context = createPartContext<IconButtonContextValue>("IconButton");

/** Root's props: the variants and tokens, the machine's props (`disabled`, `selected`, …),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. Name it with
 *  `aria-label` or `aria-labelledby`: its icon is hidden from assistive technology. */
export interface IconButtonRootProps
    extends
        Omit<PartProps, keyof IconButtonRootOwnProps>,
        IconButtonRootOwnProps {
    /** Another element or component to render instead of `<button>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface IconButtonPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The icon's props: a part's, and `mirror` to flip a pointing icon under right to left. */
export interface IconButtonIconProps extends IconButtonPartProps {
    readonly mirror?: boolean | undefined;
}

/** The icon button's root: a native `<button>` that runs the machine and shares it with its
 *  parts. Given `selected` or `defaultSelected`, it toggles, reports it with `aria-pressed`, and
 *  draws as a toggle. */
function Root(props: IconButtonRootProps): ReactNode {
    if (isDev && !hasAccessibleName(props)) {
        warnOnce(missingNameMessage("IconButton"));
    }
    const api = usePressable("IconButton", props, buttonMachineProps(props));
    const scope = useComponent(iconButtonAnatomy, {
        selection: iconButtonSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, ICON_BUTTON_ROOT_PROPS);
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

/** The 48px touch target around a smaller button. Empty. */
function TouchTarget({ unstyled, ...props }: IconButtonPartProps): ReactNode {
    const { scope } = context.use("TouchTarget");
    return scope.render("touchTarget", { element: "span", unstyled, props });
}

/** The container, which takes the fill and the shape, and holds the icon. */
function Container({ unstyled, ...props }: IconButtonPartProps): ReactNode {
    const { scope } = context.use("Container");
    return scope.render("container", { element: "span", unstyled, props });
}

/** The icon's box, hidden from assistive technology. */
function Icon({ unstyled, mirror, ...props }: IconButtonIconProps): ReactNode {
    const { scope, api } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: api.getIconProps(),
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The outline an outlined icon button draws over its container. Empty. */
function Outline({ unstyled, ...props }: IconButtonPartProps): ReactNode {
    const { scope } = context.use("Outline");
    return scope.render("outline", { element: "span", unstyled, props });
}

/** The ready-made icon button's props: Root's, with `className`, `style`, and `slotProps` keyed
 *  by part, the icon as content, and an accessible name. */
export type IconButtonProps = Omit<
    IconButtonRootProps,
    keyof SlotKeyedProps<Anatomy> | "children" | keyof IconOnlyName
> &
    SlotKeyedProps<Anatomy> &
    IconButtonContentProps<ReactNode> &
    IconOnlyName;

/** The ready-made icon button: Root, its touch target, the container holding the icon, and the
 *  outline. */
function ReadyMade(props: IconButtonProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        icon,
        mirrorIcon,
        ...rootProps
    } = props;
    return (
        <Root {...rootProps} {...slotPartProps(props, "root")}>
            <TouchTarget {...slotPartProps(props, "touchTarget")} />
            <Container {...slotPartProps(props, "container")}>
                <Icon mirror={mirrorIcon} {...slotPartProps(props, "icon")}>
                    {icon}
                </Icon>
            </Container>
            <Outline {...slotPartProps(props, "outline")} />
        </Root>
    );
}

/** Material's icon button, plain or toggle. Use it ready-made,
 *  `<IconButton icon={<StarIcon />} aria-label="Favorite" defaultSelected={false} />`, or compose
 *  its parts under `IconButton.Root`: `TouchTarget`, `Container` holding `Icon`, and `Outline`. */
export const IconButton = Object.assign(ReadyMade, {
    Root,
    TouchTarget,
    Container,
    Icon,
    Outline,
});
