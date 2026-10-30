// The radio group and its radios. A radio is a pressable root with its touch target and its ring,
// which holds the dot, and ripples from its center. In a `RadioGroup`, a radio is checked when its
// value is the group's, and a press picks it; on its own, it takes `checked` and `onPress`.

import { compositeTestIds, radioAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { radioSelection } from "@pureform/binding-core";
import type {
    ChangeDetails,
    InteractiveProps,
    RadioGroupItem,
    RadioPart,
    RadioGroupVariantProps,
    RadioVariantProps,
} from "@pureform/binding-core";
import type { Indication } from "@pureform/binding-core/indication";
import { createContext, memo, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import { useCheckKeys } from "../check-keys";
import { overDefaults } from "../defaults";
import { useSurfaceIndication } from "../indication";
import {
    testIdOf,
    useControllable,
    useStableCallback,
    useStableSelection,
    withEngine,
} from "../parts";
import { usePureform } from "../provider";
import { useNativeSlotReader, withUnselectable } from "../slot-props";
import type { InnerPropsOf, NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import { touchTargetSlopOf } from "../touch-slop";

const [INDICATION] = radioAnatomy.indication!;

interface GroupContext extends RadioGroupVariantProps {
    readonly value: string | null;
    readonly disabled: boolean;
    readonly invalid: boolean;
    readonly indication: Indication | undefined;
    readonly pick: (value: string) => void;
}

const RadioGroupContext = createContext<GroupContext | undefined>(undefined);

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface RadioHosts {
    readonly root: "Pressable";
    readonly touchTarget: "View";
    readonly ring: "View";
    readonly dot: "View";
}

export interface RadioProps
    extends RadioVariantProps, InteractiveProps, NativeSlotProps<RadioHosts> {
    /** The radio's value in its group. */
    readonly value?: string | undefined;
    /** Whether it's checked, outside a group. */
    readonly checked?: boolean | undefined;
    readonly onPress?: (() => void) | undefined;
    readonly disabled?: boolean | undefined;
    readonly invalid?: boolean | undefined;
    /** What the radio picks, for assistive technology. */
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<RadioPart> | undefined;
}

function RadioImpl(props: RadioProps): ReactNode {
    const nativeSlots = useNativeSlotReader("radio");
    const group = useContext(RadioGroupContext);
    const checked =
        group && props.value !== undefined
            ? group.value === props.value
            : (props.checked ?? false);
    const disabled = (props.disabled ?? false) || (group?.disabled ?? false);
    const invalid = (props.invalid ?? false) || (group?.invalid ?? false);
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication ?? group?.indication,
        interactionSource: props.interactionSource,
        disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<RadioPart>(
        "radio",
        indication.select(radioSelection(group ?? {}, props)),
        indication.states({
            checked,
            ...(disabled ? { disabled: true } : {}),
            ...(invalid ? { invalid: true } : {}),
        }),
    );
    const id = (part: RadioPart) => testIdOf(radioAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const keys = useCheckKeys(
        () => {
            if (group && props.value !== undefined) group.pick(props.value);
            props.onPress?.();
        },
        disabled,
        indication.handlers.onPressIn,
    );
    const slop = touchTargetSlopOf(s.root ?? {}, s.touchTarget);
    return (
        <v.root.Pressable
            {...slot.props("root")}
            hitSlop={slop}
            {...slot.with("root", indication.handlers)}
            {...slot.with("root", keys)}
            role="radio"
            aria-checked={checked}
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            disabled={disabled || undefined}
            style={slot.style("root", withUnselectable(s.root))}
            testID={id("root")}
        >
            <v.touchTarget.View
                {...slot.props("touchTarget")}
                pointerEvents="none"
                style={slot.style("touchTarget", s.touchTarget)}
                testID={id("touchTarget")}
            />
            <v.ring.View
                {...slot.props("ring")}
                style={slot.style("ring", s.ring)}
                testID={id("ring")}
            >
                <v.dot.View
                    {...slot.props("dot")}
                    style={slot.style("dot", s.dot)}
                    testID={id("dot")}
                />
            </v.ring.View>
            {indication.layer(selected)}
        </v.root.Pressable>
    );
}

/** Material's radio button: in a `RadioGroup` by `value`, or on its own with `checked`. It renders
 *  again only when its props, its group, or the provider change. */
export const Radio = memo(withEngine(RadioImpl, "Radio"));

/** What each part of the group renders as, for its keyed `style` and `slotProps`. */
export interface RadioGroupHosts {
    readonly root: "View";
}

export interface RadioGroupProps
    extends RadioGroupVariantProps, NativeSlotProps<RadioGroupHosts> {
    /** Every ready-made radio's `style`, `slotProps`, `tokens` and `testId`; an item's own
     *  `testId` wins. */
    readonly radioProps?: InnerPropsOf<RadioProps> | undefined;
    /** The radios' indication, over the provider's; a radio's own `indication` goes over it. */
    readonly indication?: Indication | undefined;
    /** The checked radio's value, `null` for none. Controlled when defined. */
    readonly value?: string | null | undefined;
    readonly defaultValue?: string | null | undefined;
    readonly onValueChange?:
        | ((details: ChangeDetails<"value", string | null>) => void)
        | undefined;
    readonly disabled?: boolean | undefined;
    readonly invalid?: boolean | undefined;
    /** Radios to render, each named by its label, with its own `style`, `slotProps` and `tokens`
     *  over `radioProps`; or give `Radio`s as children. */
    readonly items?: readonly RadioGroupEntry[] | undefined;
    /** Visual and semantic orientation; vertical by default, as on web. */
    readonly orientation?: "horizontal" | "vertical" | undefined;
    readonly "aria-label"?: string | undefined;
    readonly children?: ReactNode;
}

/** One radio of the ready-made group: its data, and its own customizing props, over `radioProps`. */
export type RadioGroupEntry = RadioGroupItem &
    Omit<InnerPropsOf<RadioProps>, "testId">;

/** A group of radios, one of which is checked: `<RadioGroup items={sizes} defaultValue="m" />`,
 *  or with `Radio` children. */
export function RadioGroup(props: RadioGroupProps): ReactNode {
    const nativeSlots = useNativeSlotReader("radioGroup");
    const { defaults } = usePureform();
    const orientation =
        (props.orientation ?? defaults.radioGroup?.orientation) === "horizontal"
            ? "horizontal"
            : "vertical";
    const { styles: s, views: v } = useComponentSlots<"root">("radioGroup", {
        orientation: props.orientation,
    });
    const [value, setValue] = useControllable<"value", string | null>(
        "RadioGroup",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        null,
    );
    const pick = useStableCallback((next: string) => {
        if (next !== value) setValue(next);
    });
    const variants = useStableSelection({
        ...(props.color === undefined ? {} : { color: props.color }),
        ...(props.density === undefined ? {} : { density: props.density }),
    });
    // Kept while the radios' defaults hold the same values, so a memoized radio skips the render.
    const radioDefaults = useStableSelection({
        style: props.radioProps?.style,
        slotProps: props.radioProps?.slotProps,
        tokens: props.radioProps?.tokens,
        testId: props.radioProps?.testId,
    }) as InnerPropsOf<RadioProps>;
    const disabled = props.disabled ?? false;
    const invalid = props.invalid ?? false;
    // The radios render again with the group only when what they read from it changes.
    const context = useMemo<GroupContext>(
        () => ({
            ...variants,
            value,
            disabled,
            invalid,
            indication: props.indication,
            pick,
        }),
        [variants, value, disabled, invalid, props.indication, pick],
    );
    const slot = nativeSlots(props);
    return (
        <v.root.View
            {...slot.props("root")}
            role="radiogroup"
            aria-orientation={orientation}
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={slot.style("root", s.root)}
            testID={compositeTestIds.radioGroup.root}
        >
            <RadioGroupContext value={context}>
                {props.items?.map((item) => {
                    const own = overDefaults(radioDefaults, {
                        style: item.style,
                        slotProps: item.slotProps,
                        tokens: item.tokens,
                    } as InnerPropsOf<RadioProps>);
                    return (
                        <Radio
                            key={item.value}
                            value={item.value}
                            aria-label={item.label}
                            {...(item.disabled ? { disabled: true } : {})}
                            {...(item.invalid ? { invalid: true } : {})}
                            {...(item.interactionSource === undefined
                                ? {}
                                : {
                                      interactionSource: item.interactionSource,
                                  })}
                            {...(own.tokens === undefined
                                ? {}
                                : { tokens: own.tokens })}
                            {...(own.style === undefined
                                ? {}
                                : { style: own.style })}
                            {...(own.slotProps === undefined
                                ? {}
                                : { slotProps: own.slotProps })}
                            {...((item.testId ?? radioDefaults.testId) ===
                            undefined
                                ? {}
                                : {
                                      testId:
                                          item.testId ?? radioDefaults.testId,
                                  })}
                        />
                    );
                })}
                {props.children}
            </RadioGroupContext>
        </v.root.View>
    );
}
