// The chip: a pressable root with its touch target, an icon when given, and its label; `selected`
// marks a filter chip that's on.

import { chipAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { chipSelection } from "@pureform/binding-core";
import type { ChipPart, ChipVariantProps } from "@pureform/binding-core";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import {
    testIdOf,
    unselectable,
    useInk,
    usePress,
    withEngine,
    withInk,
} from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

export interface ChipProps extends ChipVariantProps {
    readonly label?: ReactNode;
    /** An icon before the label. */
    readonly icon?: ReactNode;
    /** Flips a pointing icon under right to left. */
    readonly mirrorIcon?: boolean | undefined;
    /** A filter chip that's on. */
    readonly selected?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    readonly onPress?: (() => void) | undefined;
    readonly testId?: TestIdOverride<ChipPart> | undefined;
}

function ChipImpl(props: ChipProps): ReactNode {
    const engine = useEngine();
    const { state, handlers } = usePress({
        selected: props.selected ?? false,
        ...(props.disabled ? { disabled: true } : {}),
        ...(props.mirrorIcon ? { mirrored: true } : {}),
    });
    const { styles: s, selected } = useComponentSlots(
        "chip",
        chipSelection(props),
        state,
    );
    const ink = useInk(selected, { disabled: props.disabled ?? false });
    const id = (part: ChipPart) => testIdOf(chipAnatomy, part, props.testId);
    return (
        <engine.Pressable
            {...withInk(handlers, ink)}
            role="button"
            disabled={props.disabled}
            onPress={props.onPress}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            <engine.View
                pointerEvents="none"
                style={s.touchTarget}
                testID={id("touchTarget")}
            />
            {props.icon != null && props.icon !== false ? (
                <engine.View style={s.icon} testID={id("icon")}>
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {props.icon}
                    </IconSlot>
                </engine.View>
            ) : null}
            <engine.Text
                selectable={false}
                style={s.label}
                testID={id("label")}
            >
                {props.label}
            </engine.Text>
            {ink.layer}
        </engine.Pressable>
    );
}

/** Material's chip: `<Chip label="Nearby" selected={on} onPress={toggle} />`. */
export const Chip = withEngine(ChipImpl, "Chip");
