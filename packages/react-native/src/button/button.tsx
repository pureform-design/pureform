// The button: a pressable root with its touch target, its icons when given, and its label, styled
// by the registry's button factory, rippling when pressed.

import { buttonAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { buttonSelection, isToggle } from "@pureform/binding-core";
import type {
    ButtonContentProps,
    ButtonPart,
    ButtonVariantProps,
    ChangeDetails,
    InteractiveProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, useControllable, withEngine } from "../parts";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

const [INDICATION] = buttonAnatomy.indication!;

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface ButtonHosts {
    readonly secondaryIcon: "View";
    readonly root: "Pressable";
    readonly touchTarget: "View";
    readonly icon: "View";
    readonly label: "Text";
}

export interface ButtonProps
    extends
        ButtonVariantProps,
        ButtonContentProps<ReactNode>,
        InteractiveProps,
        NativeSlotProps<ButtonHosts> {
    readonly disabled?: boolean | undefined;
    /** Whether a toggle is on, as a selectable button group sets it. Giving it, or
     *  `defaultSelected`, makes the button a toggle: a press flips it, reported with
     *  `aria-pressed`. */
    readonly selected?: boolean | undefined;
    readonly defaultSelected?: boolean | undefined;
    readonly onSelectedChange?:
        | ((details: ChangeDetails<"selected", boolean>) => void)
        | undefined;
    readonly onPress?: ((event: GestureResponderEvent) => void) | undefined;
    /** A long press: given it, a long press calls it rather than pressing (a tooltip's trigger
     *  shows its tooltip so). */
    readonly onLongPress?: (() => void) | undefined;
    /** What a press opens, as an overlay's trigger says: `menu`, `dialog`, … */
    readonly "aria-haspopup"?: "menu" | "dialog" | "listbox" | true | undefined;
    /** Whether what it opens is open. */
    readonly "aria-expanded"?: boolean | undefined;
    /** The element that describes it, by `nativeID`: a tooltip showing for it. */
    readonly "aria-describedby"?: string | undefined;
    /** A prefix for every part's test id (`save` → `save-root`), or ids by part. */
    readonly testId?: TestIdOverride<ButtonPart> | undefined;
}

const TRIGGER_ARIA = [
    "aria-haspopup",
    "aria-expanded",
    "aria-describedby",
] as const;

const pick = <P extends object, K extends keyof P>(
    props: P,
    keys: readonly K[],
): Partial<Pick<P, K>> =>
    Object.fromEntries(
        keys
            .filter((key) => props[key] !== undefined)
            .map((key) => [key, props[key]]),
    ) as Partial<Pick<P, K>>;

function ButtonImpl(props: ButtonProps): ReactNode {
    const disabled = props.disabled ?? false;
    const toggle = isToggle(props);
    const [on, setOn] = useControllable(
        "Button",
        "selected",
        props.selected,
        props.defaultSelected,
        props.onSelectedChange,
        false,
    );
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<ButtonPart>(
        "button",
        indication.select(buttonSelection(props)),
        indication.states({
            disabled,
            ...(toggle ? { selected: on } : {}),
            ...(props.mirrorIcon ? { mirrored: true } : {}),
        }),
    );
    const id = (part: ButtonPart) =>
        testIdOf(buttonAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const secondary =
        props.secondaryIcon != null && props.secondaryIcon !== false ? (
            <v.secondaryIcon.View
                {...slot.props("secondaryIcon")}
                style={slot.style("secondaryIcon", s.secondaryIcon)}
                testID={id("secondaryIcon")}
            >
                <IconSlot
                    {...iconSlot(selected, "secondaryIcon")}
                    motion={s.secondaryIcon}
                >
                    {props.secondaryIcon}
                </IconSlot>
            </v.secondaryIcon.View>
        ) : null;
    const start = props.secondaryIconPosition === "start";
    return (
        <v.root.Pressable
            {...slot.props("root")}
            {...slot.with("root", indication.handlers)}
            role="button"
            {...(toggle ? { "aria-pressed": on } : {})}
            {...pick(props, TRIGGER_ARIA)}
            disabled={props.disabled}
            onLongPress={slot.on("root", "onLongPress", props.onLongPress)}
            onPress={slot.on(
                "root",
                "onPress",
                (event: GestureResponderEvent) => {
                    if (toggle) setOn(!on);
                    props.onPress?.(event);
                },
            )}
            style={slot.style("root", withUnselectable(s.root))}
            testID={id("root")}
        >
            <v.touchTarget.View
                {...slot.props("touchTarget")}
                pointerEvents="none"
                style={slot.style("touchTarget", s.touchTarget)}
                testID={id("touchTarget")}
            />
            {start ? secondary : null}
            {props.icon != null && props.icon !== false ? (
                <v.icon.View
                    {...slot.props("icon")}
                    style={slot.style("icon", s.icon)}
                    testID={id("icon")}
                >
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {props.icon}
                    </IconSlot>
                </v.icon.View>
            ) : null}
            <v.label.Text
                {...slot.props("label")}
                selectable={false}
                style={slot.style("label", s.label)}
                testID={id("label")}
            >
                {props.label}
            </v.label.Text>
            {start ? null : secondary}
            {indication.layer(selected)}
        </v.root.Pressable>
    );
}

/** Material's common button: `<Button label="Save" variant="tonal" onPress={save} />`. */
export const Button = withEngine(ButtonImpl, "Button");
