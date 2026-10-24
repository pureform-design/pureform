// The icon button: a pressable root with its touch target, a container (drawn in its shape with
// SVG) holding the icon, and an outline for the outlined variant. Given `selected` or
// `defaultSelected`, it's a toggle: a press flips it, and Material draws it as one.

import { iconButtonAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { iconButtonSelection, isToggle } from "@pureform/binding-core";
import type {
    ChangeDetails,
    IconButtonContentProps,
    IconButtonPart,
    IconButtonVariantProps,
    InteractiveProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots, withUserStyle } from "../styles";
import type { RootStyleProps } from "../styles";
import { touchTargetSlopOf } from "../touch-target/touch-target";

const [INDICATION] = iconButtonAnatomy.indication!;

export interface IconButtonProps
    extends
        IconButtonVariantProps,
        IconButtonContentProps<ReactNode>,
        InteractiveProps,
        RootStyleProps {
    /** What the button does, for assistive technology: an icon alone says nothing. */
    readonly "aria-label": string;
    readonly disabled?: boolean | undefined;
    /** Whether a toggle is on. Giving it, or `defaultSelected`, makes the button a toggle. */
    readonly selected?: boolean | undefined;
    readonly defaultSelected?: boolean | undefined;
    readonly onSelectedChange?:
        | ((details: ChangeDetails<"selected", boolean>) => void)
        | undefined;
    readonly onPress?: ((event: GestureResponderEvent) => void) | undefined;
    /** A long press: given it, a long press calls it rather than pressing (a tooltip's trigger
     *  shows its tooltip so). */
    readonly onLongPress?: (() => void) | undefined;
    readonly testId?: TestIdOverride<IconButtonPart> | undefined;
}

function IconButtonImpl(props: IconButtonProps): ReactNode {
    const engine = useEngine();
    const disabled = props.disabled ?? false;
    const toggle = isToggle(props);
    const [selected, setSelected] = useControllable(
        "IconButton",
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
        selected: slots,
        views: v,
    } = useComponentSlots<IconButtonPart>(
        "iconButton",
        indication.select(iconButtonSelection(props)),
        indication.states({
            disabled,
            ...(toggle ? { selected } : {}),
            ...(props.mirrorIcon ? { mirrored: true } : {}),
        }),
    );
    const Drawing = engine.Drawing;
    const id = (part: IconButtonPart) =>
        testIdOf(iconButtonAnatomy, part, props.testId);
    const slop = touchTargetSlopOf(s.root ?? {}, s.touchTarget);
    return (
        <v.root.Pressable
            hitSlop={slop}
            {...indication.handlers}
            role="button"
            aria-label={props["aria-label"]}
            {...(toggle ? { "aria-pressed": selected } : {})}
            disabled={props.disabled}
            onLongPress={props.onLongPress}
            onPress={(event: GestureResponderEvent) => {
                if (toggle) setSelected(!selected);
                props.onPress?.(event);
            }}
            style={withUserStyle({ ...s.root, ...unselectable }, props.style)}
            testID={id("root")}
        >
            <v.touchTarget.View
                pointerEvents="none"
                style={s.touchTarget}
                testID={id("touchTarget")}
            />
            <v.container.View style={s.container} testID={id("container")}>
                {Drawing ? (
                    <Drawing drawing={slots.drawings.container} />
                ) : null}
                <v.icon.View style={s.icon} testID={id("icon")}>
                    <IconSlot {...iconSlot(slots, "icon")} motion={s.icon}>
                        {props.icon}
                    </IconSlot>
                </v.icon.View>
                {indication.layer(slots)}
            </v.container.View>
            {props.variant === "outlined" ? (
                <v.outline.View
                    pointerEvents="none"
                    style={s.outline}
                    testID={id("outline")}
                >
                    {Drawing ? (
                        <Drawing drawing={slots.drawings.outline} />
                    ) : null}
                </v.outline.View>
            ) : null}
        </v.root.Pressable>
    );
}

/** Material's icon button: `<IconButton icon={<Glyph glyph="✎" />} aria-label="Edit" />`. */
export const IconButton = withEngine(IconButtonImpl, "IconButton");
