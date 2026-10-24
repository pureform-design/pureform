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
    RadioVariantProps,
} from "@pureform/binding-core";
import type { Indication } from "@pureform/binding-core/indication";
import { createContext, memo, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useCheckKeys } from "../check-keys";
import { useSurfaceIndication } from "../indication";
import {
    testIdOf,
    unselectable,
    useControllable,
    useStableCallback,
    useStableSelection,
    withEngine,
} from "../parts";
import { useComponentSlots, withUserStyle } from "../styles";
import type { RootStyleProps } from "../styles";
import { touchTargetSlopOf } from "../touch-slop";

const [INDICATION] = radioAnatomy.indication!;

interface GroupContext extends RadioVariantProps {
    readonly value: string | null;
    readonly disabled: boolean;
    readonly invalid: boolean;
    readonly indication: Indication | undefined;
    readonly pick: (value: string) => void;
}

const RadioGroupContext = createContext<GroupContext | undefined>(undefined);

export interface RadioProps
    extends RadioVariantProps, InteractiveProps, RootStyleProps {
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
            hitSlop={slop}
            {...indication.handlers}
            {...keys}
            role="radio"
            aria-checked={checked}
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            disabled={disabled || undefined}
            style={withUserStyle({ ...s.root, ...unselectable }, props.style)}
            testID={id("root")}
        >
            <v.touchTarget.View
                pointerEvents="none"
                style={s.touchTarget}
                testID={id("touchTarget")}
            />
            <v.ring.View style={s.ring} testID={id("ring")}>
                <v.dot.View style={s.dot} testID={id("dot")} />
            </v.ring.View>
            {indication.layer(selected)}
        </v.root.Pressable>
    );
}

/** Material's radio button: in a `RadioGroup` by `value`, or on its own with `checked`. It renders
 *  again only when its props, its group, or the provider change. */
export const Radio = memo(withEngine(RadioImpl, "Radio"));

export interface RadioGroupProps extends RadioVariantProps {
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
    /** Radios to render, each named by its label; or give `Radio`s as children. */
    readonly items?: readonly RadioGroupItem[] | undefined;
    readonly "aria-label"?: string | undefined;
    readonly style?: StyleProp<ViewStyle>;
    readonly children?: ReactNode;
}

/** A group of radios, one of which is checked: `<RadioGroup items={sizes} defaultValue="m" />`,
 *  or with `Radio` children. */
export function RadioGroup(props: RadioGroupProps): ReactNode {
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
        ...(props.tokens === undefined ? {} : { tokens: props.tokens }),
    });
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
    return (
        <View
            role="radiogroup"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={props.style}
            testID={compositeTestIds.radioGroup.root}
        >
            <RadioGroupContext value={context}>
                {props.items?.map((item) => (
                    <Radio
                        key={item.value}
                        value={item.value}
                        aria-label={item.label}
                        {...(item.disabled ? { disabled: true } : {})}
                        {...(item.invalid ? { invalid: true } : {})}
                        {...(item.interactionSource === undefined
                            ? {}
                            : { interactionSource: item.interactionSource })}
                        {...(item.testId === undefined
                            ? {}
                            : { testId: item.testId })}
                    />
                ))}
                {props.children}
            </RadioGroupContext>
        </View>
    );
}
