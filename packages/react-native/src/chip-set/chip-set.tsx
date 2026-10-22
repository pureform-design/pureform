// The chip set: a row the registry styles, holding a chip per item, each with the set's variants
// under its own. A selectable set makes them filter chips: a press turns one on, and in a
// single-select set the others off. A single-line set scrolls sideways (the adapter drops
// `overflow: auto`).

import { chipSetAnatomy } from "@pureform/anatomy";
import { chipSetChipVariants, chipSetSelection } from "@pureform/binding-core";
import type {
    ChipSetContentProps,
    ChipSetPart,
    ChipSetRootOwnProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";
import { ScrollView } from "react-native";

import { Chip } from "../chip/chip";
import { testIdOf, useControllable, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

export interface ChipSetProps
    extends ChipSetRootOwnProps, ChipSetContentProps<ReactNode> {
    readonly "aria-label"?: string | undefined;
}

/** The value after pressing `value`, as a button group's. */
const pressed = (
    current: readonly string[],
    value: string,
    multiple: boolean,
    deselectable: boolean,
): string[] => {
    const on = current.includes(value);
    if (multiple)
        return on ? current.filter((v) => v !== value) : [...current, value];
    return on ? (deselectable ? [] : [...current]) : [value];
};

function ChipSetImpl(props: ChipSetProps): ReactNode {
    const { styles: s, views: v } = useComponentSlots<ChipSetPart>(
        "chipSet",
        chipSetSelection(props),
    );
    const [value, setValue] = useControllable(
        "ChipSet",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        [] as string[],
    );
    const items = props.items ?? [];
    const variants = chipSetChipVariants(props, {});
    const selectable = props.selectable !== undefined;
    const row = (
        <v.root.View
            role="group"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={s.root}
            testID={testIdOf(chipSetAnatomy, "root", props.testId)}
        >
            {items.map((item, index) => {
                const key = item.value ?? String(index);
                return (
                    <Chip
                        key={key}
                        {...variants}
                        label={item.label}
                        icon={item.icon}
                        trailingIcon={item.trailingIcon}
                        disabled={item.disabled || props.disabled}
                        selected={selectable ? value.includes(key) : undefined}
                        onPress={() => {
                            if (selectable)
                                setValue(
                                    pressed(
                                        value,
                                        key,
                                        props.selectable === "multiple",
                                        props.deselectable ?? true,
                                    ),
                                );
                            item.onClick?.();
                        }}
                        testId={item.testId}
                        interactionSource={item.interactionSource}
                    />
                );
            })}
        </v.root.View>
    );
    return props.singleLine ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {row}
        </ScrollView>
    ) : (
        row
    );
}

/** Material's chip set: `<ChipSet selectable="multiple" items={[{ value: "near", label:
 *  "Nearby" }]} />`. */
export const ChipSet = withEngine(ChipSetImpl, "ChipSet");
