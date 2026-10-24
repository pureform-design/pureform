// The split button: Root, the menu's Root (Zag's menu machine, an unstyled element) around the
// split button's own root; the leading button, which runs the main action; the trailing button,
// the menu's trigger, with its icon; and the menu it opens (`Menu`: Zag's positioner and the menu
// component's surface), holding the menu component's items. The ready-made SplitButton composes
// them from data.

import { splitButtonAnatomy } from "@pureform/anatomy";
import type { menuOverlayAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    SPLIT_BUTTON_MENU_LABEL,
    SPLIT_BUTTON_ROOT_PROPS,
    splitButtonMachineProps,
    splitButtonSelection,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    SplitButtonContentProps,
    SplitButtonRootOwnProps,
} from "@pureform/binding-core";
import type { ElementType, ReactNode } from "react";

import { DropDownArrow } from "../glyphs";
import {
    useInteractionHandlers,
    useMachineButton,
    useOwnInteractionSource,
} from "../interaction";
import { Menu } from "../menu";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, InnerPropsOf, SlotKeyedProps } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";

type Anatomy = typeof splitButtonAnatomy;

/** What Root shares with its parts. */
interface SplitButtonContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly disabled: boolean;
}

const context = createPartContext<SplitButtonContextValue>("SplitButton");

/** Root's props: the variants and tokens, the menu machine's props (`open`, `onSelect`,
 *  `positioning`, …), `disabled`, `testId` and `unstyled` for every part, `as`, and the element's
 *  own props. */
export interface SplitButtonRootProps
    extends
        Omit<PartProps, keyof SplitButtonRootOwnProps>,
        SplitButtonRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
    /** The menu's own props: `testId`, `unstyled`, `tokens`, and its root's `className`,
     *  `style` and `slotProps` (the ready-made also reaches the menu's other parts). */
    readonly menuProps?: InnerPropsOf<MenuAnatomy> | undefined;
}

type MenuAnatomy = typeof menuOverlayAnatomy;

const NO_MENU_PROPS: InnerPropsOf<MenuAnatomy> = {};

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SplitButtonPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A button's props: a part's, and the interaction source its presses are emitted to. */
export interface SplitButtonButtonProps
    extends SplitButtonPartProps, InteractionSourceProps {}

/** The trailing icon's props: a part's, and `mirror` to flip it under `rtl`. */
export interface SplitButtonIconProps extends SplitButtonPartProps {
    readonly mirror?: boolean | undefined;
}

/** The split button's root, a `<div>` holding both buttons and the menu, inside the menu's Root,
 *  which runs the menu machine. */
function Root(props: SplitButtonRootProps): ReactNode {
    const scope = useComponent(splitButtonAnatomy, {
        selection: splitButtonSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
    });
    const {
        as,
        menuProps = NO_MENU_PROPS,
        ...rest
    } = omitProps(props, SPLIT_BUTTON_ROOT_PROPS);
    const menuSlot = useSlotProps(menuProps);
    return (
        <context.Provider value={{ scope, disabled: !!props.disabled }}>
            <Menu.Root
                {...(menuSlot("root") as object)}
                open={props.open}
                defaultOpen={props.defaultOpen}
                onOpenChange={props.onOpenChange}
                onSelect={props.onSelect}
                closeOnSelect={props.closeOnSelect}
                loopFocus={props.loopFocus}
                typeahead={props.typeahead}
                aria-label={props["aria-label"]}
                ids={props.ids}
                positioning={splitButtonMachineProps(props).positioning}
                indication={props.indication}
                testId={menuProps.testId}
                unstyled={menuProps.unstyled}
                tokens={menuProps.tokens}
            >
                {scope.render("root", { element: "div", as, props: rest })}
            </Menu.Root>
        </context.Provider>
    );
}

/** The leading button, a `<button>` for the main action. */
function LeadingButton(props: SplitButtonButtonProps): ReactNode {
    const { scope, disabled } = context.use("LeadingButton");
    return scope.render(
        "leadingButton",
        useMachineButton(
            props,
            [{ type: "button", disabled: disabled || undefined }],
            disabled,
        ),
    );
}

/** The trailing button the menu's trigger renders, as its part: the trigger's props, without the
 *  menu's own attributes. */
function TrailingButtonPart({
    unstyled,
    interactionSource,
    children,
    "data-scope": _scope,
    "data-pf-part": _part,
    "data-testid": _testId,
    ...trigger
}: SplitButtonButtonProps & Record<string, unknown>): ReactNode {
    const { scope, disabled } = context.use("TrailingButton");
    const source = useOwnInteractionSource(
        interactionSource as SplitButtonButtonProps["interactionSource"],
    );
    const handlers = useInteractionHandlers(source, disabled);
    return scope.render("trailingButton", {
        element: "button",
        interactionSource: source,
        machine: combinePartProps([
            trigger as Readonly<Record<string, unknown>>,
            { disabled: disabled || undefined },
            handlers,
        ]),
        unstyled: unstyled as boolean | undefined,
        props: { children: children as ReactNode },
    });
}

/** The trailing button, which opens the menu: name it with `aria-label`. */
function TrailingButton(props: SplitButtonButtonProps): ReactNode {
    return <Menu.Trigger as={TrailingButtonPart} {...props} />;
}

/** The trailing button's icon, which turns over while the menu is open, hidden from assistive
 *  technology. */
function TrailingIcon({
    unstyled,
    mirror,
    ...props
}: SplitButtonIconProps): ReactNode {
    const { scope } = context.use("TrailingIcon");
    return scope.render("trailingIcon", {
        element: "span",
        machine: { "aria-hidden": "true" },
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The menu the trailing button opens: Zag's positioner and the menu component's surface. Put
 *  `Menu.Item`s in it. */
function SplitButtonMenu(props: SplitButtonPartProps): ReactNode {
    context.use("Menu");
    return (
        <Menu.Positioner>
            <Menu.Content {...props} />
        </Menu.Positioner>
    );
}

/** The ready-made split button's props: Root's, with `className`, `style`, and `slotProps` keyed
 *  by part, and the label, icons, and items as content. */
export interface SplitButtonProps
    extends
        Omit<SplitButtonRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        SplitButtonContentProps<ReactNode> {}

/** The ready-made split button: the leading button with its icon and label, the trailing button
 *  with its arrow, and the menu with an item per entry of `items`. */
function ReadyMade(props: SplitButtonProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        label,
        icon,
        trailingIcon,
        menuLabel,
        onAction,
        items = [],
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    const menuSlot = useSlotProps(props.menuProps ?? NO_MENU_PROPS);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <LeadingButton
                onClick={() => onAction?.()}
                {...slot("leadingButton")}
            >
                {icon}
                {label}
            </LeadingButton>
            <TrailingButton
                aria-label={menuLabel ?? SPLIT_BUTTON_MENU_LABEL}
                {...slot("trailingButton")}
            >
                <TrailingIcon {...slot("trailingIcon")}>
                    {isPresent(trailingIcon) ? trailingIcon : <DropDownArrow />}
                </TrailingIcon>
            </TrailingButton>
            <Menu.Positioner {...menuSlot("positioner")}>
                <Menu.Content {...menuSlot("content")}>
                    {items.map((item) => (
                        <Menu.ItemEntry
                            key={item.value}
                            item={item}
                            slot={menuSlot}
                        />
                    ))}
                </Menu.Content>
            </Menu.Positioner>
        </Root>
    );
}

/** M3 Expressive's split button. Use it ready-made, `<SplitButton label="Save" items={[{ value:
 *  "draft", label: "Save as draft" }, …]} onAction={…} onSelect={…} />`, or compose its parts
 *  under `SplitButton.Root`: `LeadingButton`, `TrailingButton` holding `TrailingIcon`, and `Menu`
 *  holding the menu component's `Menu.Item`s. */
export const SplitButton = Object.assign(ReadyMade, {
    Root,
    LeadingButton,
    TrailingButton,
    TrailingIcon,
    Menu: SplitButtonMenu,
});
