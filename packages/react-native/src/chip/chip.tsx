// The chip: a pressable root with its touch target, an icon when given, its label, and a trailing icon when given; `selected`
// marks a filter chip that's on.

import { chipAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { chipSelection, isToggle } from "@pureform/binding-core";
import type {
    ChangeDetails,
    ChipPart,
    ChipVariantProps,
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
import { touchTargetSlopOf } from "../touch-slop";

const [INDICATION] = chipAnatomy.indication!;

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface ChipHosts {
    readonly root: "Pressable";
    readonly touchTarget: "View";
    readonly icon: "View";
    readonly label: "Text";
    readonly trailingIcon: "View";
}

export interface ChipProps
    extends ChipVariantProps, InteractiveProps, NativeSlotProps<ChipHosts> {
    readonly label?: ReactNode;
    /** An icon before the label. */
    readonly icon?: ReactNode;
    /** A trailing icon after the label, such as a filter chip's dropdown arrow. */
    readonly trailingIcon?: ReactNode;
    /** Flips a pointing icon under right to left. */
    readonly mirrorIcon?: boolean | undefined;
    /** A filter chip that's on. Giving it, or `defaultSelected`, makes the chip a filter chip:
     *  a press flips it, reported with `aria-pressed`. */
    readonly selected?: boolean | undefined;
    readonly defaultSelected?: boolean | undefined;
    readonly onSelectedChange?:
        | ((details: ChangeDetails<"selected", boolean>) => void)
        | undefined;
    readonly disabled?: boolean | undefined;
    readonly onPress?: ((event: GestureResponderEvent) => void) | undefined;
    /** A long press: given it, a long press calls it rather than pressing (a tooltip's trigger
     *  shows its tooltip so). */
    readonly onLongPress?: (() => void) | undefined;
    readonly testId?: TestIdOverride<ChipPart> | undefined;
}

function ChipImpl(props: ChipProps): ReactNode {
    const toggle = isToggle(props);
    const [on, setOn] = useControllable(
        "Chip",
        "selected",
        props.selected,
        props.defaultSelected,
        props.onSelectedChange,
        false,
    );
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled: props.disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<ChipPart>(
        "chip",
        indication.select(chipSelection(props)),
        indication.states({
            selected: toggle && on,
            ...(props.disabled ? { disabled: true } : {}),
            ...(props.mirrorIcon ? { mirrored: true } : {}),
        }),
    );
    const id = (part: ChipPart) => testIdOf(chipAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const slop = touchTargetSlopOf(s.root ?? {}, s.touchTarget);
    return (
        <v.root.Pressable
            {...slot.props("root")}
            hitSlop={slop}
            {...slot.with("root", indication.handlers)}
            role="button"
            {...(toggle ? { "aria-pressed": on } : {})}
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
            {props.trailingIcon != null && props.trailingIcon !== false ? (
                <v.trailingIcon.View
                    {...slot.props("trailingIcon")}
                    style={slot.style("trailingIcon", s.trailingIcon)}
                    testID={id("trailingIcon")}
                >
                    <IconSlot
                        {...iconSlot(selected, "trailingIcon")}
                        motion={s.trailingIcon}
                    >
                        {props.trailingIcon}
                    </IconSlot>
                </v.trailingIcon.View>
            ) : null}
            {indication.layer(selected)}
        </v.root.Pressable>
    );
}

/** Material's chip: `<Chip label="Nearby" selected={on} onPress={toggle} />`. */
export const Chip = withEngine(ChipImpl, "Chip");
