// The web bindings' customization channels, independent of React renders or Solid tracking.
// Native styles and host props deliberately do not pass through this web contract.

import { forInstance } from "@pureform/binding-core";

type Dict = Readonly<Record<string, unknown>>;

/** The ready-made's keyed customization channels, with the binding's class prop normalized. */
export interface WebSlotCustomization {
    readonly slotProps?: object | undefined;
    readonly class?: object | undefined;
    readonly style?: object | undefined;
    readonly unstyled?: unknown;
}

/** One part's customization, before the binding combines classes, styles and handlers. */
export interface ResolvedWebSlotCustomization {
    readonly props: Dict | undefined;
    readonly class: unknown;
    readonly style: unknown;
    readonly unstyled: true | undefined;
}

/** Resolve only the requested part. Read the instance at most once, and only if a channel is a
 *  function of the copy. The caller supplies its tracking scope (or React render). Global
 *  `unstyled` is handled by Root; only a keyed override belongs to this part. */
export function resolveWebSlotCustomization(
    input: WebSlotCustomization,
    part: string,
    instance?: () => unknown,
): ResolvedWebSlotCustomization {
    let read = false;
    let value: unknown;
    const one = (keyed: object | undefined) => {
        const entry = (keyed as Dict | undefined)?.[part];
        if (typeof entry !== "function") return entry;
        if (!read) {
            value = instance?.();
            read = true;
        }
        return forInstance(entry, value);
    };
    const props = one(input.slotProps) as Dict | undefined;
    const classes = one(input.class);
    const style = one(input.style);
    const unstyled =
        typeof input.unstyled === "object" && input.unstyled !== null
            ? one(input.unstyled)
            : undefined;
    return {
        props,
        class: classes,
        style,
        unstyled: unstyled === true ? true : undefined,
    };
}
