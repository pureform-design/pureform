// The chip: Root on the button machine (press, focus, and a toggle on `selected` for a filter
// chip), its TouchTarget, Icon, and Label parts, and the ready-made Chip over them.

import { chipAnatomy } from "@pureform/anatomy";
import {
    buttonMachineProps,
    CHIP_ROOT_PROPS,
    chipSelection,
    isPresent,
} from "@pureform/binding-core";
import type {
    ButtonContentProps,
    ChipRootOwnProps,
} from "@pureform/binding-core";
import type * as button from "@pureform/machines/button";
import type { PropTypes } from "@zag-js/react";
import type { ElementType, ReactNode } from "react";

import { createPartContext } from "../part-context";
import { slotPartProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePressable } from "../pressable";
import { omitProps } from "../props";
import type { PartProps } from "../props";

type Anatomy = typeof chipAnatomy;

/** What Root shares with its parts. */
interface ChipContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: button.Api<PropTypes>;
}

const context = createPartContext<ChipContextValue>("Chip");

/** Root's props: the variants and tokens, the machine's props (`disabled`, `selected`, …),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface ChipRootProps
    extends Omit<PartProps, keyof ChipRootOwnProps>, ChipRootOwnProps {
    /** Another element or component to render instead of `<button>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface ChipPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The icon's props: a part's, and `mirror` to flip a pointing icon under right to left. */
export interface ChipIconProps extends ChipPartProps {
    readonly mirror?: boolean | undefined;
}

/** The chip's root: a native `<button>` that runs the machine and shares it with its parts. A
 *  filter chip, given `selected` or `defaultSelected`, toggles and reports it with
 *  `aria-pressed`. */
function Root(props: ChipRootProps): ReactNode {
    const { api, source } = usePressable(
        "Chip",
        props,
        buttonMachineProps(props),
    );
    const scope = useComponent(chipAnatomy, {
        selection: chipSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
        interactionSource: source,
    });
    const { as, ...rest } = omitProps(props, CHIP_ROOT_PROPS);
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

/** The 48px touch target around the chip. Empty. */
function TouchTarget({ unstyled, ...props }: ChipPartProps): ReactNode {
    const { scope } = context.use("TouchTarget");
    return scope.render("touchTarget", { element: "span", unstyled, props });
}

/** The leading icon's box, hidden from assistive technology. Render it only when there's an
 *  icon. */
function Icon({ unstyled, mirror, ...props }: ChipIconProps): ReactNode {
    const { scope, api } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: api.getIconProps(),
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The chip's text. */
function Label({ unstyled, ...props }: ChipPartProps): ReactNode {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "span",
        machine: api.getLabelProps(),
        unstyled,
        props,
    });
}

/** The ready-made chip's props: Root's, with `className`, `style`, and `slotProps` keyed by part,
 *  and the label and icon as content. */
export interface ChipProps
    extends
        Omit<ChipRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        ButtonContentProps<ReactNode> {}

/** The ready-made chip: Root, its touch target, the icon when given, and the label. */
function ReadyMade(props: ChipProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        label,
        icon,
        mirrorIcon,
        ...rootProps
    } = props;
    return (
        <Root {...rootProps} {...slotPartProps(props, "root")}>
            <TouchTarget {...slotPartProps(props, "touchTarget")} />
            {isPresent(icon) ? (
                <Icon mirror={mirrorIcon} {...slotPartProps(props, "icon")}>
                    {icon}
                </Icon>
            ) : null}
            <Label {...slotPartProps(props, "label")}>{label}</Label>
        </Root>
    );
}

/** Material's chip: assist, filter (with `selected`), input, or suggestion. Use it ready-made,
 *  `<Chip label="Vegan" defaultSelected={false} />`, or compose its parts under `Chip.Root`:
 *  `TouchTarget`, `Icon`, and `Label`. */
export const Chip = Object.assign(ReadyMade, {
    Root,
    TouchTarget,
    Icon,
    Label,
});
