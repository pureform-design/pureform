import {
    mergeKeyedDefaults,
    mergeShallowDefaults,
    overDefaults as traverseDefaults,
} from "@pureform/binding-core";

const record = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const joinClass = (defaults: unknown, own: unknown): unknown =>
    defaults == null || defaults === ""
        ? own
        : own == null || own === ""
          ? defaults
          : typeof defaults === "string" && typeof own === "string"
            ? `${defaults} ${own}`
            : [defaults, own];

/** A child's own props over its container's defaults for it (a list item's over the list's
 *  `listItemProps`), with the web's precedence: the child's own win; classes (`class`,
 *  `className`) join, part by part when keyed; `style`, `slotProps` and `tokens` merge shallowly
 *  per part. Returns `own` or `defaults` as-is when the other is empty. */
export const overDefaults = <P extends object>(
    defaults: P | undefined,
    own: P,
): P =>
    traverseDefaults(defaults, own, (key, base, value) => {
        if (key === "className" || key === "class") {
            if (!record(base) && !record(value)) return joinClass(base, value);
            return mergeKeyedDefaults(
                record(base) ? base : { root: base },
                record(value) ? value : { root: value },
                joinClass,
            );
        }
        return key === "style" || key === "slotProps"
            ? mergeKeyedDefaults(base, value, mergeShallowDefaults)
            : value;
    });
