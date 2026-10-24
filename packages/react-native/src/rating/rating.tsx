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
    RatingPart,
    RatingVariantProps,
} from "@pureform/binding-core";
import { useRef } from "react";
import type { ReactNode } from "react";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";

import { Glyph, IconSlot, iconSlot } from "../icon-style";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useDirection } from "../provider";
import { useComponentSlots } from "../styles";

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
        RatingContentProps<ReactNode> {
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
    const text = props.valueText ?? defaultText;
    const star = props.icon ?? <Glyph glyph="★" />;
    const pick = (index: number, event: GestureResponderEvent) => {
        const width = widths.current[index];
        // A key's press (React Native Web's Enter) has no position.
        const x = event.nativeEvent?.locationX;
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
        <v.root.View style={s.root} testID={id("root")}>
            {isPresent(props.label) ? (
                <v.label.Text
                    selectable={false}
                    style={s.label}
                    testID={id("label")}
                >
                    {props.label}
                </v.label.Text>
            ) : null}
            <v.control.View
                accessibilityLabel={
                    typeof props.label === "string" ? props.label : undefined
                }
                role="radiogroup"
                style={s.control}
                testID={id("control")}
            >
                {Array.from({ length: count }, (_, at) => at + 1).map(
                    (index) => {
                        const reached = Math.ceil(value) === index;
                        const half = reached && value - index === -0.5;
                        const full = index <= value || (reached && !half);
                        return (
                            <v.item.Pressable
                                key={index}
                                aria-checked={
                                    reached || (value <= 0 && index === 1)
                                }
                                aria-disabled={props.disabled}
                                aria-label={text(index)}
                                disabled={!interactive}
                                onLayout={(event: LayoutChangeEvent) => {
                                    widths.current[index] =
                                        event.nativeEvent.layout.width;
                                }}
                                onPress={(event: GestureResponderEvent) =>
                                    pick(index, event)
                                }
                                role="radio"
                                style={{ ...s.item, ...unselectable }}
                                testID={id("item")}
                            >
                                <v.icon.View style={s.icon} testID={id("icon")}>
                                    <IconSlot
                                        {...iconSlot(slots, "icon")}
                                        motion={s.icon}
                                    >
                                        {star}
                                    </IconSlot>
                                </v.icon.View>
                                {full ? (
                                    <v.fill.View
                                        pointerEvents="none"
                                        style={s.fill}
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
                                        pointerEvents="none"
                                        style={s.halfFill}
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
