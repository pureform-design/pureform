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
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import {
    testIdOf,
    unselectable,
    useControllable,
    useInk,
    usePress,
    withEngine,
    withInk,
} from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

export interface IconButtonProps
    extends IconButtonVariantProps, IconButtonContentProps<ReactNode> {
    /** What the button does, for assistive technology: an icon alone says nothing. */
    readonly "aria-label": string;
    readonly disabled?: boolean | undefined;
    /** Whether a toggle is on. Giving it, or `defaultSelected`, makes the button a toggle. */
    readonly selected?: boolean | undefined;
    readonly defaultSelected?: boolean | undefined;
    readonly onSelectedChange?:
        | ((details: ChangeDetails<"selected", boolean>) => void)
        | undefined;
    readonly onPress?: (() => void) | undefined;
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
    const { state, handlers } = usePress({
        disabled,
        ...(toggle ? { selected } : {}),
        ...(props.mirrorIcon ? { mirrored: true } : {}),
    });
    const { styles: s, selected: slots } = useComponentSlots(
        "iconButton",
        iconButtonSelection(props),
        state,
    );
    const ink = useInk(slots, { slot: "container", centered: true, disabled });
    const Drawing = engine.Drawing;
    const id = (part: IconButtonPart) =>
        testIdOf(iconButtonAnatomy, part, props.testId);
    return (
        <engine.Pressable
            {...withInk(handlers, ink)}
            role="button"
            aria-label={props["aria-label"]}
            {...(toggle ? { "aria-checked": selected } : {})}
            disabled={props.disabled}
            onPress={() => {
                if (toggle) setSelected(!selected);
                props.onPress?.();
            }}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            <engine.View
                pointerEvents="none"
                style={s.touchTarget}
                testID={id("touchTarget")}
            />
            <engine.View style={s.container} testID={id("container")}>
                {Drawing ? (
                    <Drawing drawing={slots.drawings.container} />
                ) : null}
                <engine.View style={s.icon} testID={id("icon")}>
                    <IconSlot {...iconSlot(slots, "icon")} motion={s.icon}>
                        {props.icon}
                    </IconSlot>
                </engine.View>
                {ink.layer}
            </engine.View>
            {props.variant === "outlined" ? (
                <engine.View
                    pointerEvents="none"
                    style={s.outline}
                    testID={id("outline")}
                >
                    {Drawing ? (
                        <Drawing drawing={slots.drawings.outline} />
                    ) : null}
                </engine.View>
            ) : null}
        </engine.Pressable>
    );
}

/** Material's icon button: `<IconButton icon={<Glyph glyph="✎" />} aria-label="Edit" />`. */
export const IconButton = withEngine(IconButtonImpl, "IconButton");
