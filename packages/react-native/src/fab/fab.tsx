// The floating action button: a pressable root with its touch target, a container (drawn in its
// shape with SVG) holding the icon, and the label of an extended FAB.

import { fabAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { fabSelection } from "@pureform/binding-core";
import type {
    FabContentProps,
    FabPart,
    FabVariantProps,
    InteractiveProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, withEngine } from "../parts";
import { useEngine } from "../provider";
import { useNativeSlotReader, withUnselectable } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

const [INDICATION] = fabAnatomy.indication!;

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface FabHosts {
    readonly root: "Pressable";
    readonly touchTarget: "View";
    readonly container: "View";
    readonly icon: "View";
    readonly label: "Text";
}

export interface FabProps
    extends
        FabVariantProps,
        FabContentProps<ReactNode>,
        InteractiveProps,
        NativeSlotProps<FabHosts> {
    /** What the button does, for assistive technology; the label's text by default. */
    readonly "aria-label"?: string | undefined;
    readonly disabled?: boolean | undefined;
    readonly onPress?: (() => void) | undefined;
    /** A long press: given it, a long press calls it rather than pressing (a tooltip's trigger
     *  shows its tooltip so). */
    readonly onLongPress?: (() => void) | undefined;
    readonly testId?: TestIdOverride<FabPart> | undefined;
}

const present = (node: ReactNode) => node != null && node !== false;

function FabImpl(props: FabProps): ReactNode {
    const nativeSlots = useNativeSlotReader("fab");
    const engine = useEngine();
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled: props.disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<FabPart>(
        "fab",
        indication.select(
            fabSelection({
                ...props,
                extended: props.extended ?? present(props.label),
            }),
        ),
        indication.states({
            ...(props.disabled ? { disabled: true } : {}),
            ...(props.mirrorIcon ? { mirrored: true } : {}),
        }),
    );
    const Drawing = engine.Drawing;
    const id = (part: FabPart) => testIdOf(fabAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const label =
        props["aria-label"] ??
        (typeof props.label === "string" ? props.label : undefined);
    return (
        <v.root.Pressable
            {...slot.props("root")}
            {...slot.with("root", indication.handlers)}
            role="button"
            {...(label === undefined ? {} : { "aria-label": label })}
            disabled={props.disabled}
            onLongPress={slot.on("root", "onLongPress", props.onLongPress)}
            onPress={slot.on("root", "onPress", props.onPress)}
            style={slot.style("root", withUnselectable(s.root))}
            testID={id("root")}
        >
            <v.touchTarget.View
                {...slot.props("touchTarget")}
                pointerEvents="none"
                style={slot.style("touchTarget", s.touchTarget)}
                testID={id("touchTarget")}
            />
            <v.container.View
                {...slot.props("container")}
                style={slot.style("container", s.container)}
                testID={id("container")}
            >
                {Drawing ? (
                    <Drawing drawing={selected.drawings.container} />
                ) : null}
                <v.icon.View
                    {...slot.props("icon")}
                    style={slot.style("icon", s.icon)}
                    testID={id("icon")}
                >
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {props.icon}
                    </IconSlot>
                </v.icon.View>
                {present(props.label) ? (
                    <v.label.Text
                        {...slot.props("label")}
                        selectable={false}
                        style={slot.style("label", s.label)}
                        testID={id("label")}
                    >
                        {props.label}
                    </v.label.Text>
                ) : null}
                {indication.layer(selected)}
            </v.container.View>
        </v.root.Pressable>
    );
}

/** Material's floating action button: `<Fab icon={<Glyph glyph="+" />} aria-label="New" />`,
 *  extended with a `label`. */
export const Fab = withEngine(FabImpl, "Fab");
