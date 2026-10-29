// The chip set: a row the registry styles, holding a chip per item, each with the set's variants
// under its own. A selectable set makes them filter chips: a press turns one on, and in a
// single-select set the others off. A single-line set scrolls sideways (the adapter drops
// `overflow: auto`).

import { chipSetAnatomy } from "@pureform/anatomy";
import {
    chipSetChipVariants,
    chipSetSelection,
    toggleSelection,
} from "@pureform/binding-core";
import type {
    ChipSetContentProps,
    ChipSetItem,
    ChipSetPart,
    ChipSetRootOwnProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";
import { ScrollView } from "react-native";

import { Chip } from "../chip/chip";
import type { ChipProps } from "../chip/chip";
import { overDefaults } from "../defaults";
import { testIdOf, useControllable, withEngine } from "../parts";
import { useNativeSlotReader } from "../slot-props";
import type { InnerPropsOf, NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface ChipSetHosts {
    readonly root: "View";
}

export interface ChipSetProps
    extends
        Omit<ChipSetRootOwnProps, "unstyled">,
        Omit<ChipSetContentProps<ReactNode>, "items">,
        NativeSlotProps<ChipSetHosts> {
    readonly "aria-label"?: string | undefined;
    /** The chips, in order: each its data and its own `style`, `slotProps` and `tokens`, over
     *  `chipProps`. */
    readonly items?: readonly ChipSetEntry[] | undefined;
    /** Every chip's `style`, `slotProps`, `tokens` and `testId`; an item's own `testId` wins. */
    readonly chipProps?: InnerPropsOf<ChipProps> | undefined;
}

/** One chip of the ready-made set: its data, and its own customizing props, over `chipProps`. */
export type ChipSetEntry = ChipSetItem<ReactNode> &
    Omit<InnerPropsOf<ChipProps>, "testId">;

function ChipSetImpl(props: ChipSetProps): ReactNode {
    const nativeSlots = useNativeSlotReader("chipSet");
    const slot = nativeSlots(props);
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
            {...slot.props("root")}
            role="group"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={slot.style("root", s.root)}
            testID={testIdOf(chipSetAnatomy, "root", props.testId)}
        >
            {items.map((item, index) => {
                const key = item.value ?? String(index);
                return (
                    <Chip
                        key={key}
                        {...overDefaults(props.chipProps, {
                            style: item.style,
                            slotProps: item.slotProps,
                            tokens: item.tokens,
                        } as InnerPropsOf<ChipProps>)}
                        {...variants}
                        label={item.label}
                        icon={item.icon}
                        trailingIcon={item.trailingIcon}
                        disabled={item.disabled || props.disabled}
                        selected={selectable ? value.includes(key) : undefined}
                        onPress={() => {
                            if (selectable)
                                setValue(
                                    toggleSelection(
                                        value,
                                        key,
                                        props.selectable === "multiple",
                                        props.deselectable ?? true,
                                    ),
                                );
                            item.onClick?.();
                        }}
                        testId={item.testId ?? props.chipProps?.testId}
                        indication={props.indication}
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
