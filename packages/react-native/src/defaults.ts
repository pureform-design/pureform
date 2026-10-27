import {
    mergeKeyedDefaults,
    mergeShallowDefaults,
    overDefaults as traverseDefaults,
} from "@pureform/binding-core";
import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

const record = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

// A part's style: plain objects merge as before; arrays and registered styles are flattened first
// rather than replaced. An unset side leaves the other as-is.
const mergeStyle = (base: unknown, own: unknown): unknown =>
    base == null || own == null
        ? own
        : record(base) && record(own)
          ? { ...base, ...own }
          : {
                ...StyleSheet.flatten(base as StyleProp<ViewStyle>),
                ...StyleSheet.flatten(own as StyleProp<ViewStyle>),
            };

/** A child's own props over its container's defaults for it (a list item's over the list's
 *  `listItemProps`): the child's own win; `style` (any `StyleProp`) and `slotProps` merge per
 *  part, `tokens` shallowly. Returns `own` or `defaults` as-is when the other is empty. Doesn't
 *  change `nativeSlots`' handler composition or caches. */
export const overDefaults = <P extends object>(
    defaults: P | undefined,
    own: P,
): P =>
    traverseDefaults(defaults, own, (key, base, value) =>
        key === "style"
            ? mergeKeyedDefaults(base, value, mergeStyle)
            : key === "slotProps"
              ? mergeKeyedDefaults(base, value, mergeShallowDefaults)
              : value,
    );
