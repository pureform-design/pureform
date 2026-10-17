// The chip: a pressable root with its touch target, an icon when given, and its label; `selected`
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
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

const [INDICATION] = chipAnatomy.indication!;

export interface ChipProps extends ChipVariantProps, InteractiveProps {
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
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled: props.disabled,
    });
    const { styles: s, selected } = useComponentSlots(
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
        <engine.Pressable
            {...indication.handlers}
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
            {indication.layer(selected)}
        </engine.Pressable>
    );
}

/** Material's chip: `<Chip label="Nearby" selected={on} onPress={toggle} />`. */
export const Chip = withEngine(ChipImpl, "Chip");
