// The chip: Root on the button machine (press, focus, and a toggle on `selected` for a filter
// chip), its TouchTarget, Icon, and Label parts, and the ready-made Chip over them.

import { chipAnatomy } from "@pureform/anatomy";
import {
    BUTTON_CONTENT_PROPS,
    buttonMachineProps,
    CHIP_ROOT_PROPS,
    chipSelection,
} from "@pureform/binding-core";
import type {
    ButtonContentProps,
    ChipRootOwnProps,
} from "@pureform/binding-core";
import type * as button from "@pureform/machines/button";
import type { JSX, ValidComponent } from "@solidjs/web";
import { type Accessor, omit } from "solid-js";

import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, optionalPart, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePressable } from "../pressable";
import type { PartProps } from "../props";

type Anatomy = typeof chipAnatomy;

/** What Root shares with its parts. */
interface ChipContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<button.Api<PropTypes>>;
}

const context = createPartContext<ChipContextValue>("Chip");

/** Root's props: the variants and tokens, the machine's props (`disabled`, `selected`, …),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface ChipRootProps
    extends Omit<PartProps, keyof ChipRootOwnProps>, ChipRootOwnProps {
    /** Another element or component to render instead of `<button>`. */
    readonly as?: ValidComponent | undefined;
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
function Root(props: ChipRootProps): JSX.Element {
    const { api, source } = usePressable("Chip", props, () =>
        buttonMachineProps(props),
    );
    const scope = useComponent(chipAnatomy, {
        selection: () => chipSelection(props),
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
                props: omit(props, "as", ...CHIP_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The 48px touch target around the chip. Empty. */
function TouchTarget(props: ChipPartProps): JSX.Element {
    const { scope } = context.use("TouchTarget");
    return scope.render("touchTarget", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The leading icon's box, hidden from assistive technology. Render it only when there's an
 *  icon. */
function Icon(props: ChipIconProps): JSX.Element {
    return renderIcon(props, false);
}

// The ready-made's icon, only while it has one, which it builds once.
const OptionalIcon = (props: ChipIconProps): JSX.Element =>
    renderIcon(props, true);

function renderIcon(props: ChipIconProps, optional: boolean): JSX.Element {
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

/** The chip's text. */
function Label(props: ChipPartProps): JSX.Element {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "span",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made chip's props: Root's, with `class`, `style`, and `slotProps` keyed by part, and
 *  the label and icon as content. */
export interface ChipProps
    extends
        Omit<ChipRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        ButtonContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...BUTTON_CONTENT_PROPS,
] as const;

/** The ready-made chip: Root, its touch target, the icon when given, and the label. */
function ReadyMade(props: ChipProps): JSX.Element {
    // The icon part builds the icon once, inside its own context, so `useIconStyle()` works in it.
    const IconPart = optionalPart(props, "icon", Icon, OptionalIcon);
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as ChipRootProps;
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

/** Material's chip: assist, filter (with `selected`), input, or suggestion. Use it ready-made,
 *  `<Chip label="Vegan" defaultSelected={false} />`, or compose its parts under `Chip.Root`:
 *  `TouchTarget`, `Icon`, and `Label`. */
export const Chip = Object.assign(ReadyMade, {
    Root,
    TouchTarget,
    Icon,
    Label,
});
