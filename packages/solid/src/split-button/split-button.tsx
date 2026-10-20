// The split button: Root, the menu's Root (Zag's menu machine, an unstyled element) around the
// split button's own root; the leading button, which runs the main action; the trailing button,
// the menu's trigger, with its icon; and the menu it opens (`Menu`: Zag's positioner and the menu
// component's surface), holding the menu component's items. The ready-made SplitButton composes
// them from data.

import { splitButtonAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    SPLIT_BUTTON_CONTENT_PROPS,
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
import type { JSX, ValidComponent } from "@solidjs/web";
import { type Accessor, omit } from "solid-js";

import { DropDownArrow } from "../glyphs";
import {
    useInteractionHandlers,
    useMachineButton,
    useOwnInteractionSource,
} from "../interaction";
import { Menu } from "../menu";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";

type Anatomy = typeof splitButtonAnatomy;

/** What Root shares with its parts. */
interface SplitButtonContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly disabled: Accessor<boolean>;
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
    readonly as?: ValidComponent | undefined;
}

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

// The menu's own attributes on its trigger, which the trailing button replaces with its part's.
const TRIGGER_ATTRIBUTES = ["data-scope", "data-pf-part", "data-testid"];

/** The split button's root, a `<div>` holding both buttons and the menu, inside the menu's Root,
 *  which runs the menu machine. */
function Root(props: SplitButtonRootProps): JSX.Element {
    const scope = useComponent(splitButtonAnatomy, {
        selection: () => splitButtonSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    return (
        <context.Provider value={{ scope, disabled: () => !!props.disabled }}>
            <Menu.Root
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
            >
                {scope.render("root", {
                    element: "div",
                    as: () => props.as,
                    props: omit(props, "as", ...SPLIT_BUTTON_ROOT_PROPS),
                })}
            </Menu.Root>
        </context.Provider>
    );
}

/** The leading button, a `<button>` for the main action. */
function LeadingButton(props: SplitButtonButtonProps): JSX.Element {
    const { scope, disabled } = context.use("LeadingButton");
    return scope.render(
        "leadingButton",
        useMachineButton(
            props,
            () => [{ type: "button", disabled: disabled() || undefined }],
            disabled,
        ),
    );
}

/** The trailing button the menu's trigger renders, as its part. */
function TrailingButtonPart(
    props: SplitButtonButtonProps & Record<string, unknown>,
): JSX.Element {
    const { scope, disabled } = context.use("TrailingButton");
    const source = useOwnInteractionSource(() => props.interactionSource);
    const handlers = useInteractionHandlers(source, disabled);
    const trigger = omit(
        props,
        "unstyled",
        "interactionSource",
        "children",
        ...TRIGGER_ATTRIBUTES,
    );
    return scope.render("trailingButton", {
        element: "button",
        interactionSource: source,
        machine: () =>
            combinePartProps([
                trigger as Readonly<Record<string, unknown>>,
                { disabled: disabled() || undefined },
                handlers(),
            ]),
        unstyled: () => props.unstyled as boolean | undefined,
        props: { children: props.children } as object,
    });
}

/** The trailing button, which opens the menu: name it with `aria-label`. */
function TrailingButton(props: SplitButtonButtonProps): JSX.Element {
    return <Menu.Trigger as={TrailingButtonPart} {...props} />;
}

/** The trailing button's icon, which turns over while the menu is open, hidden from assistive
 *  technology. */
function TrailingIcon(props: SplitButtonIconProps): JSX.Element {
    const { scope } = context.use("TrailingIcon");
    return scope.render("trailingIcon", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
    });
}

/** The menu the trailing button opens: Zag's positioner and the menu component's surface. Put
 *  `Menu.Item`s in it. */
function SplitButtonMenu(props: SplitButtonPartProps): JSX.Element {
    context.use("Menu");
    return (
        <Menu.Positioner>
            <Menu.Content {...props} />
        </Menu.Positioner>
    );
}

/** The ready-made split button's props: Root's, with `class`, `style`, and `slotProps` keyed by
 *  part, and the label, icons, and items as content. */
export interface SplitButtonProps
    extends
        Omit<SplitButtonRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        SplitButtonContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...SPLIT_BUTTON_CONTENT_PROPS,
] as const;

/** The ready-made split button: the leading button with its icon and label, the trailing button
 *  with its arrow, and the menu with an item per entry of `items`. */
function ReadyMade(props: SplitButtonProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as SplitButtonRootProps;
    const root = slots("root") as object;
    const leadingButton = slots("leadingButton");
    const trailingButton = slots("trailingButton");
    const trailingIcon = slots("trailingIcon");
    return (
        <Root {...own} {...root}>
            <LeadingButton
                onClick={() => props.onAction?.()}
                {...leadingButton}
            >
                {props.icon}
                {props.label}
            </LeadingButton>
            <TrailingButton
                aria-label={props.menuLabel ?? SPLIT_BUTTON_MENU_LABEL}
                {...trailingButton}
            >
                <TrailingIcon {...trailingIcon}>
                    {isPresent(props.trailingIcon) ? (
                        props.trailingIcon
                    ) : (
                        <DropDownArrow />
                    )}
                </TrailingIcon>
            </TrailingButton>
            <SplitButtonMenu>
                <Menu.Items items={props.items ?? []} />
            </SplitButtonMenu>
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
