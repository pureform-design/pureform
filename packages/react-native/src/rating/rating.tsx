// The rating: a row of stars that picks a value. A press on a star sets it (on its inline-start
// half, half a star, with `allowHalf`); pressing the chosen value again leaves it. The stars the
// value reaches draw the filled star over the empty one. Assistive technology gets a radio group
// with a radio per star.

import { ratingAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { isPresent, ratingSelection } from "@pureform/binding-core";
import type {
    RatingBehaviorProps,
    RatingContentProps,
    RatingInstances,
    RatingPart,
    RatingStarInstance,
    RatingVariantProps,
} from "@pureform/binding-core";
import { useRef } from "react";
import type { ReactNode } from "react";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";

import { Glyph, IconSlot, iconSlot } from "../icon-style";
import { testIdOf, useControllable, withEngine } from "../parts";
import { useDirection } from "../provider";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface RatingHosts {
    readonly root: "View";
    readonly label: "Text";
    readonly control: "View";
    readonly item: "Pressable";
    readonly icon: "View";
    readonly fill: "View";
    readonly halfFill: "View";
}

export interface RatingProps
    extends
        RatingVariantProps,
        Pick<
            RatingBehaviorProps,
            | "value"
            | "defaultValue"
            | "onValueChange"
            | "count"
            | "allowHalf"
            | "readOnly"
            | "disabled"
            | "valueText"
        >,
        RatingContentProps<ReactNode>,
        NativeSlotProps<RatingHosts, RatingInstances> {
    /** A prefix for every part's test id (`quality` → `quality-item`), or ids by part. */
    readonly testId?: TestIdOverride<RatingPart> | undefined;
}

const defaultText = (index: number) => `${index} stars`;

function RatingImpl(props: RatingProps): ReactNode {
    const count = props.count ?? 5;
    const rtl = useDirection() === "rtl";
    const interactive = !props.readOnly && !props.disabled;
    const [value, setValue] = useControllable(
        "Rating",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        0,
    );
    const widths = useRef<Record<number, number>>({});
    const {
        styles: s,
        selected: slots,
        views: v,
    } = useComponentSlots<RatingPart>(
        "rating",
        ratingSelection(props),
        props.disabled ? { disabled: true } : {},
    );
    const id = (part: RatingPart) =>
        testIdOf(ratingAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const perStar =
        slot.each("item") ||
        slot.each("icon") ||
        slot.each("fill") ||
        slot.each("halfFill");
    const text = props.valueText ?? defaultText;
    const star = props.icon ?? <Glyph glyph="★" />;
    const pick = (index: number, event: GestureResponderEvent) => {
        const width = widths.current[index];
        // A key's press (React Native Web's Enter) has no position.
        // Native Web's Pressable delivers a click, not a responder's locationX. Measure against
        // currentTarget (the item), never offsetX, which is relative to the clicked glyph child.
        const click = event.nativeEvent as typeof event.nativeEvent & {
            clientX?: number;
            detail?: number;
        };
        const host = event.currentTarget as unknown as {
            getBoundingClientRect?: () => { left: number };
        };
        const bounds =
            click.detail && click.clientX !== undefined
                ? host.getBoundingClientRect?.()
                : undefined;
        const x =
            event.nativeEvent?.locationX ??
            (bounds ? click.clientX! - bounds.left : undefined);
        const first =
            props.allowHalf && width !== undefined && x !== undefined
                ? rtl
                    ? x >= width / 2
                    : x < width / 2
                : false;
        const next = first ? index - 0.5 : index;
        setValue(next === value ? 0 : next);
    };
    return (
        <v.root.View
            {...slot.props("root")}
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            {isPresent(props.label) ? (
                <v.label.Text
                    {...slot.props("label")}
                    selectable={false}
                    style={slot.style("label", s.label)}
                    testID={id("label")}
                >
                    {props.label}
                </v.label.Text>
            ) : null}
            <v.control.View
                {...slot.props("control")}
                accessibilityLabel={
                    typeof props.label === "string" ? props.label : undefined
                }
                role="radiogroup"
                style={slot.style("control", s.control)}
                testID={id("control")}
            >
                {Array.from({ length: count }, (_, at) => at + 1).map(
                    // oxlint-disable-next-line react/refs -- the handler reads the ref when it runs, after render
                    (index) => {
                        const reached = Math.ceil(value) === index;
                        const half = reached && value - index === -0.5;
                        const full = index <= value || (reached && !half);
                        const each: RatingStarInstance | undefined = perStar
                            ? {
                                  index,
                                  fill: half ? "half" : full ? "full" : "none",
                              }
                            : undefined;
                        return (
                            <v.item.Pressable
                                {...slot.props("item", each)}
                                key={index}
                                aria-checked={reached}
                                aria-disabled={props.disabled}
                                aria-label={text(index)}
                                disabled={!interactive}
                                onLayout={(event: LayoutChangeEvent) => {
                                    widths.current[index] =
                                        event.nativeEvent.layout.width;
                                }}
                                onPress={slot.on(
                                    "item",
                                    "onPress",
                                    (event: GestureResponderEvent) =>
                                        pick(index, event),
                                    each,
                                )}
                                role="radio"
                                style={slot.style(
                                    "item",
                                    withUnselectable(s.item),
                                    each,
                                )}
                                testID={id("item")}
                            >
                                <v.icon.View
                                    {...slot.props("icon", each)}
                                    style={slot.style("icon", s.icon, each)}
                                    testID={id("icon")}
                                >
                                    <IconSlot
                                        {...iconSlot(slots, "icon")}
                                        motion={s.icon}
                                    >
                                        {star}
                                    </IconSlot>
                                </v.icon.View>
                                {full ? (
                                    <v.fill.View
                                        {...slot.props("fill", each)}
                                        pointerEvents="none"
                                        style={slot.style("fill", s.fill, each)}
                                        testID={id("fill")}
                                    >
                                        <IconSlot
                                            {...iconSlot(slots, "fill")}
                                            motion={s.fill}
                                        >
                                            {star}
                                        </IconSlot>
                                    </v.fill.View>
                                ) : null}
                                {half ? (
                                    <v.halfFill.View
                                        {...slot.props("halfFill", each)}
                                        pointerEvents="none"
                                        style={slot.style(
                                            "halfFill",
                                            s.halfFill,
                                            each,
                                        )}
                                        testID={id("halfFill")}
                                    >
                                        <IconSlot
                                            {...iconSlot(slots, "halfFill")}
                                            motion={s.halfFill}
                                        >
                                            {star}
                                        </IconSlot>
                                    </v.halfFill.View>
                                ) : null}
                            </v.item.Pressable>
                        );
                    },
                )}
            </v.control.View>
        </v.root.View>
    );
}

/** A star rating: `<Rating label="Quality" allowHalf defaultValue={3.5} />`. */
export const Rating = withEngine(RatingImpl, "Rating");
