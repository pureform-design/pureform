// The split button: the leading button, which runs the main action, and the trailing button,
// which opens the menu component over the page, each a pressable that ripples when pressed. The
// trailing button is the menu's trigger: its icon turns over and its corners round while the menu
// is open.

import { splitButtonAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    SPLIT_BUTTON_MENU_LABEL,
    splitButtonPositioning,
    splitButtonSelection,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    IndicationProps,
    MenuItem,
    MenuSelectDetails,
    OverlayPositioning,
    SplitButtonContentProps,
    SplitButtonPart,
    SplitButtonVariantProps,
} from "@pureform/binding-core";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import type { ReactNode } from "react";
import { Text } from "react-native";

import { IconSlot, iconSlot, ownText } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { Menu } from "../menu";
import type { MenuProps, MenuTriggerProps } from "../menu";
import { testIdOf, withEngine } from "../parts";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { InnerPropsOf, NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

// The leading button's and the trailing button's.
const INDICATIONS = Object.fromEntries(
    splitButtonAnatomy.indication!.map((entry) => [entry.trigger, entry]),
);

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface SplitButtonHosts {
    readonly root: "View";
    readonly leadingButton: "Pressable";
    readonly trailingButton: "Pressable";
    readonly trailingIcon: "View";
}

export interface SplitButtonProps
    extends
        SplitButtonVariantProps,
        SplitButtonContentProps<ReactNode>,
        IndicationProps,
        NativeSlotProps<SplitButtonHosts> {
    /** The menu's `style`, `slotProps`, `tokens` and `testId`. */
    readonly menuProps?: InnerPropsOf<MenuProps> | undefined;
    /** Disables both buttons. */
    readonly disabled?: boolean | undefined;
    /** Whether the menu is open, controlled when defined. */
    readonly open?: boolean | undefined;
    readonly defaultOpen?: boolean | undefined;
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
    /** Whether picking an item closes the menu. Default true. */
    readonly closeOnSelect?: boolean | undefined;
    /** Where the menu opens. Default under the trailing button, at its end. */
    readonly positioning?: OverlayPositioning | undefined;
    /** An item was picked. */
    readonly onSelect?: ((details: MenuSelectDetails) => void) | undefined;
    /** The menu's name. */
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<SplitButtonPart> | undefined;
}

function SplitButtonButtonImpl(props: {
    readonly split: SplitButtonProps;
    readonly part: "leadingButton" | "trailingButton";
    readonly label?: string | undefined;
    readonly expanded?: boolean | undefined;
    readonly interactionSource?: MutableInteractionSource | undefined;
    readonly onPress: (() => void) | undefined;
    /** The leading button's icon, before its label. */
    readonly icon?: ReactNode;
    readonly children: ReactNode;
}): ReactNode {
    const slot = nativeSlots(props.split);
    const disabled = props.split.disabled ?? false;
    const indication = useSurfaceIndication(INDICATIONS[props.part]!, {
        indication: props.split.indication,
        interactionSource: props.interactionSource,
        disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<SplitButtonPart>(
        "splitButton",
        indication.select(splitButtonSelection(props.split)),
        indication.states({
            ...(disabled ? { disabled: true } : {}),
            ...(props.expanded ? { expanded: true } : {}),
        }),
    );
    const Surface = v[props.part];
    const id = (part: SplitButtonPart) =>
        testIdOf(splitButtonAnatomy, part, props.split.testId);
    return (
        <Surface.Pressable
            {...slot.props(props.part)}
            {...slot.with(props.part, indication.handlers)}
            role="button"
            {...(props.label === undefined
                ? {}
                : { "aria-label": props.label })}
            {...(props.part === "trailingButton"
                ? {
                      "aria-haspopup": "menu" as const,
                      "aria-expanded": props.expanded ?? false,
                  }
                : {})}
            disabled={disabled}
            onPress={slot.on(props.part, "onPress", props.onPress)}
            style={slot.style(props.part, withUnselectable(s[props.part]))}
            testID={id(props.part)}
        >
            {props.icon}
            {props.part === "trailingButton" ? (
                <v.trailingIcon.View
                    {...slot.props("trailingIcon")}
                    style={slot.style("trailingIcon", s.trailingIcon)}
                    testID={id("trailingIcon")}
                >
                    <IconSlot
                        {...iconSlot(selected, "trailingIcon")}
                        motion={s.trailingIcon}
                    >
                        {props.children}
                    </IconSlot>
                </v.trailingIcon.View>
            ) : typeof props.children === "string" ? (
                <Text selectable={false} style={ownText(s[props.part])}>
                    {props.children}
                </Text>
            ) : (
                props.children
            )}
            {indication.layer(selected)}
        </Surface.Pressable>
    );
}

const SplitButtonButton = withEngine(
    SplitButtonButtonImpl,
    "SplitButtonButton",
);

function SplitButtonImpl(props: SplitButtonProps): ReactNode {
    const slot = nativeSlots(props);
    const { styles: s, views: v } = useComponentSlots<SplitButtonPart>(
        "splitButton",
        splitButtonSelection(props),
    );
    const trigger = (given: MenuTriggerProps, state: { open: boolean }) => (
        <v.root.View
            {...slot.props("root")}
            style={slot.style("root", s.root)}
            testID={testIdOf(splitButtonAnatomy, "root", props.testId)}
        >
            <SplitButtonButton
                split={props}
                part="leadingButton"
                onPress={props.onAction}
                icon={props.icon}
            >
                {props.label}
            </SplitButtonButton>
            <SplitButtonButton
                split={props}
                part="trailingButton"
                label={props.menuLabel ?? SPLIT_BUTTON_MENU_LABEL}
                expanded={state.open}
                interactionSource={given.interactionSource}
                onPress={given.onPress}
            >
                {isPresent(props.trailingIcon) ? props.trailingIcon : "▾"}
            </SplitButtonButton>
        </v.root.View>
    );
    return (
        <Menu
            {...props.menuProps}
            items={props.items as readonly MenuItem<ReactNode>[] | undefined}
            trigger={trigger}
            open={props.open}
            defaultOpen={props.defaultOpen}
            onOpenChange={props.onOpenChange}
            closeOnSelect={props.closeOnSelect}
            positioning={splitButtonPositioning(props)}
            onSelect={props.onSelect}
            aria-label={props["aria-label"]}
            indication={props.indication}
        />
    );
}

/** M3 Expressive's split button: `<SplitButton label="Save" onAction={…} items={[{ value:
 *  "draft", label: "Save as draft" }]} onSelect={…} />`. */
export const SplitButton = withEngine(SplitButtonImpl, "SplitButton");
