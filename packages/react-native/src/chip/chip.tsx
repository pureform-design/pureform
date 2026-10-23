// The chip: a pressable root with its touch target, an icon when given, its label, and a trailing icon when given; `selected`
// marks a filter chip that's on.

import { chipAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { chipSelection } from "@pureform/binding-core";
import type {
    ChipPart,
    ChipVariantProps,
    InteractiveProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, withEngine } from "../parts";
import { useComponentSlots, withUserStyle } from "../styles";
import type { RootStyleProps } from "../styles";

const [INDICATION] = chipAnatomy.indication!;

export interface ChipProps
    extends ChipVariantProps, InteractiveProps, RootStyleProps {
    readonly label?: ReactNode;
    /** An icon before the label. */
    readonly icon?: ReactNode;
    /** A trailing icon after the label, such as a filter chip's dropdown arrow. */
    readonly trailingIcon?: ReactNode;
    /** Flips a pointing icon under right to left. */
    readonly mirrorIcon?: boolean | undefined;
    /** A filter chip that's on. */
    readonly selected?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    readonly onPress?: (() => void) | undefined;
    /** A long press: given it, a long press calls it rather than pressing (a tooltip's trigger
     *  shows its tooltip so). */
    readonly onLongPress?: (() => void) | undefined;
    readonly testId?: TestIdOverride<ChipPart> | undefined;
}

function ChipImpl(props: ChipProps): ReactNode {
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
            selected: props.selected ?? false,
            ...(props.disabled ? { disabled: true } : {}),
            ...(props.mirrorIcon ? { mirrored: true } : {}),
        }),
    );
    const id = (part: ChipPart) => testIdOf(chipAnatomy, part, props.testId);
    return (
        <v.root.Pressable
            {...indication.handlers}
            role="button"
            disabled={props.disabled}
            onLongPress={props.onLongPress}
            onPress={props.onPress}
            style={withUserStyle({ ...s.root, ...unselectable }, props.style)}
            testID={id("root")}
        >
            <v.touchTarget.View
                pointerEvents="none"
                style={s.touchTarget}
                testID={id("touchTarget")}
            />
            {props.icon != null && props.icon !== false ? (
                <v.icon.View style={s.icon} testID={id("icon")}>
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {props.icon}
                    </IconSlot>
                </v.icon.View>
            ) : null}
            <v.label.Text
                selectable={false}
                style={s.label}
                testID={id("label")}
            >
                {props.label}
            </v.label.Text>
            {props.trailingIcon != null && props.trailingIcon !== false ? (
                <v.trailingIcon.View
                    style={s.trailingIcon}
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
