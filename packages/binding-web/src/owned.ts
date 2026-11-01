// Which keys of a part's props the component owns. A provider's `slotProps` can't set them: one
// entry reaches every instance, and the machine finds its elements by `id`, reads its state back
// from `aria-*` and `data-state`, while the anatomy's attributes are the contract tests and
// styles select on. An instance's own props are not held back: a part drawn `as` another
// component receives the outer part's merged props (its `id`, `data-testid`), which must win.
// Handlers, classes and styles still combine, and the keys in `OVERRIDABLE_KEYS` stay settable.

import { ownedKeysIn } from "@pureform/binding-core";
import {
    PART_ATTRIBUTE,
    SCOPE_ATTRIBUTE,
    TEST_ID_ATTRIBUTE,
} from "@pureform/web-contracts";

type Dict = Readonly<Record<string, unknown>>;

/** What a user may set even when the machine sets it too: a label or role for their own use, a
 *  tooltip, a custom tab order. */
export const OVERRIDABLE_KEYS: ReadonlySet<string> = new Set([
    "tabIndex",
    "role",
    "aria-label",
    "aria-description",
    "aria-describedby",
    "title",
]);

/** The style properties that place a floating part: a machine's values for them hold, the rest of
 *  its `style` joins like any other. Custom properties (`--x`, `--transform-origin`) hold too. Kept
 *  hyphenated; a name in either form (`zIndex`, `z-index`) is checked as hyphenated, since Solid's
 *  machine props arrive hyphenated and React's camel-cased. */
const POSITIONING_STYLE = new Set([
    "position",
    "top",
    "left",
    "right",
    "bottom",
    "inset",
    "transform",
    "translate",
    "transform-origin",
    "will-change",
    "z-index",
    "offset-path",
    "offset-distance",
    "offset-rotate",
    "offset-anchor",
]);

const hyphenated = (property: string): string =>
    property.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const isPositioningStyle = (property: string): boolean =>
    property.startsWith("--") || POSITIONING_STYLE.has(hyphenated(property));

const HANDLER_KEY = /^on[A-Z]/;
const CLASS_KEYS = new Set(["class", "className"]);

/** The anatomy's own attributes, and every `data-pf-*` state attribute. */
export const isReservedAttribute = (key: string): boolean =>
    key === SCOPE_ATTRIBUTE ||
    key === PART_ATTRIBUTE ||
    key === TEST_ID_ATTRIBUTE ||
    key.startsWith("data-pf-");

/** The machine's props for a part: all but the style that places it (`rest`), the keys it owns
 *  (`owned`: what a provider can't set), and its positioning `style`, which wins where it conflicts
 *  so a floating part's placement holds. The escape hatch is to style a wrapper, or the part's
 *  `positioning` options, not the placement properties. */
export interface MachineSplit {
    readonly rest: Dict | undefined;
    readonly owned: Dict | undefined;
    readonly style: Dict | undefined;
}

export const splitMachine = (machine: Dict | undefined): MachineSplit => {
    if (!machine)
        return { rest: undefined, owned: undefined, style: undefined };
    const rest: Record<string, unknown> = {};
    const owned: Record<string, unknown> = {};
    let style: Dict | undefined;
    for (const key of Object.keys(machine)) {
        const value = machine[key];
        if (key === "style" && value && typeof value === "object") {
            const placed: Record<string, unknown> = {};
            const others: Record<string, unknown> = {};
            for (const [property, v] of Object.entries(value)) {
                (isPositioningStyle(property) ? placed : others)[property] = v;
            }
            if (Object.keys(placed).length > 0) style = { style: placed };
            if (Object.keys(others).length > 0) rest["style"] = others;
            continue;
        }
        rest[key] = value;
        if (
            value !== undefined &&
            !HANDLER_KEY.test(key) &&
            !CLASS_KEYS.has(key) &&
            !OVERRIDABLE_KEYS.has(key)
        )
            owned[key] = value;
    }
    return { rest, owned, style };
};

/** `source` without the keys the component owns, and the keys that were dropped. `source` itself
 *  when nothing is. */
export const withoutOwned = (
    source: Dict | undefined,
    owned: Dict | undefined,
): {
    readonly source: Dict | undefined;
    readonly dropped: readonly string[];
} => {
    const dropped = ownedKeysIn(
        source,
        (key) =>
            isReservedAttribute(key) || (owned !== undefined && key in owned),
    );
    if (!source || dropped.length === 0) return { source, dropped };
    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
        if (!dropped.includes(key)) clean[key] = source[key];
    }
    return { source: clean, dropped };
};

/** The props a provider's `slotProps` can't set, as the types know them: what the machine sets for
 *  an element's identity and state. The rest of the owned keys (`data-*`, a component's other
 *  `aria-*`) aren't typed props, and a provider that sets one is warned in development. */
export type OwnedPartKeys =
    | "id"
    | "disabled"
    | "hidden"
    | "aria-expanded"
    | "aria-pressed"
    | "aria-selected"
    | "aria-checked"
    | "aria-disabled"
    | "aria-hidden"
    | "aria-controls"
    | "aria-activedescendant"
    | "aria-labelledby";

const APPEARANCE_KEYS = new Set(["className", "class", "style"]);

/** Marks an instance's `slotProps` that a part drawn `as` a button forwards to it (`asRoot`): its
 *  `root` carries the part's own `className` and `style`, which no keyed prop can, since the part's
 *  merge joins them as plain values. It's a symbol, so spreading keeps it and `Object.keys` doesn't
 *  see it. */
export const FORWARDED_SLOT_PROPS: unique symbol = Symbol.for(
    "pureform.forwardedSlotProps",
);

/** Whether `slotProps` were forwarded by `asRoot`, not written by the user. */
export const isForwardedSlotProps = (slotProps: unknown): boolean =>
    typeof slotProps === "object" &&
    slotProps !== null &&
    (slotProps as Record<symbol, unknown>)[FORWARDED_SLOT_PROPS] === true;

/** An instance's `slotProps` entry without `className`, `class` and `style`, which the keyed props
 *  set (`className={{ label: "caps" }}`): an instance has one channel for appearance, and
 *  `slotProps` carries a part's attributes and handlers. The keys that were dropped come with it.
 *  `source` itself when it has none. A provider has no keyed props, so its `slotProps` keep them. */
export const withoutAppearance = (
    source: Dict | undefined,
): {
    readonly source: Dict | undefined;
    readonly dropped: readonly string[];
} => {
    const dropped = ownedKeysIn(source, (key) => APPEARANCE_KEYS.has(key));
    if (!source || dropped.length === 0) return { source, dropped };
    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
        if (!APPEARANCE_KEYS.has(key)) clean[key] = source[key];
    }
    return { source: clean, dropped };
};

/** The development warning for appearance set in an instance's `slotProps`. */
export const appearanceMessage = (
    part: string,
    dropped: readonly string[],
): string =>
    `pureform: slotProps.${part} ignored ${dropped.map((key) => `"${key}"`).join(", ")}: style a part with the keyed props (\`className={{ ${part}: … }}\`, \`style={{ ${part}: … }}\`); \`slotProps\` is for its attributes and handlers.`;
