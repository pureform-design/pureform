// The radio group and its radios. A radio is a pressable root with its touch target and its ring,
// which holds the dot. In a `RadioGroup`, a radio is checked when its value is the group's, and a
// press picks it; on its own, it takes `checked` and `onPress`.

import { radioAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { radioSelection } from "@pureform/binding-core";
import type {
    ChangeDetails,
    RadioGroupItem,
    RadioPart,
    RadioVariantProps,
} from "@pureform/binding-core";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import {
    testIdOf,
    unselectable,
    useControllable,
    usePress,
    withEngine,
} from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

interface GroupContext extends RadioVariantProps {
    readonly value: string | null;
    readonly disabled: boolean;
    readonly invalid: boolean;
    readonly pick: (value: string) => void;
}

const RadioGroupContext = createContext<GroupContext | undefined>(undefined);

export interface RadioProps extends RadioVariantProps {
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
    const engine = useEngine();
    const group = useContext(RadioGroupContext);
    const checked =
        group && props.value !== undefined
            ? group.value === props.value
            : (props.checked ?? false);
    const disabled = (props.disabled ?? false) || (group?.disabled ?? false);
    const invalid = (props.invalid ?? false) || (group?.invalid ?? false);
    const { state, handlers } = usePress({
        checked,
        ...(disabled ? { disabled: true } : {}),
        ...(invalid ? { invalid: true } : {}),
    });
    const { styles: s } = useComponentSlots(
        "radio",
        radioSelection(group ?? {}, props),
        state,
    );
    const id = (part: RadioPart) => testIdOf(radioAnatomy, part, props.testId);
    return (
        <engine.Pressable
            {...handlers}
            role="radio"
            aria-checked={checked}
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            disabled={disabled || undefined}
            onPress={() => {
                if (group && props.value !== undefined) group.pick(props.value);
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
            <engine.View style={s.ring} testID={id("ring")}>
                <engine.View style={s.dot} testID={id("dot")} />
            </engine.View>
        </engine.Pressable>
    );
}

/** Material's radio button: in a `RadioGroup` by `value`, or on its own with `checked`. */
export const Radio = withEngine(RadioImpl, "Radio");

export interface RadioGroupProps extends RadioVariantProps {
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
    const context: GroupContext = {
        value,
        disabled: props.disabled ?? false,
        invalid: props.invalid ?? false,
        pick: (next) => {
            if (next !== value) setValue(next);
        },
        ...(props.color === undefined ? {} : { color: props.color }),
        ...(props.density === undefined ? {} : { density: props.density }),
        ...(props.tokens === undefined ? {} : { tokens: props.tokens }),
    };
    return (
        <View
            role="radiogroup"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={props.style}
        >
            <RadioGroupContext value={context}>
                {props.items?.map((item) => (
                    <Radio
                        key={item.value}
                        value={item.value}
                        aria-label={item.label}
                        {...(item.disabled ? { disabled: true } : {})}
                        {...(item.invalid ? { invalid: true } : {})}
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
