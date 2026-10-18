// The attributes a binding writes on each part, and the test id rules: `pf-<component>-<part>` by
// default, or the `testId` given to Root, as a prefix for every part or per part.

import type { ComponentAnatomy, PartAnatomy, PartName } from "./types";

/** The attribute naming a part (`data-pf-part="label"`). */
export const PART_ATTRIBUTE = "data-pf-part";

/** The attribute naming the component a part belongs to (`data-scope="icon-button"`). */
export const SCOPE_ATTRIBUTE = "data-scope";

/** The attribute holding a part's test id on the web. */
export const TEST_ID_ATTRIBUTE = "data-testid";

/** The prefix of every default test id. */
export const TEST_ID_PREFIX = "pf";

/** A name in kebab case: `touchTarget` → `touch-target`. */
export const kebabCase = (name: string): string =>
    name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** The `testId` a component's Root takes: a prefix for every part (`"save"` gives `save-root`,
 *  `save-label`), or test ids by part, the rest keeping their defaults. */
export type TestIdOverride<P extends string = string> =
    | string
    | { readonly [K in P]?: string };

/** A part's test id: its default, or what `testId` sets for it. */
export const partTestId = <A extends ComponentAnatomy>(
    component: A,
    part: PartName<A>,
    testId?: TestIdOverride<PartName<A>>,
): string => {
    const anatomy = (component.parts as ComponentAnatomy["parts"])[part];
    if (!anatomy) {
        throw new Error(
            `pureform: ${component.name} has no part "${part}" (it has ${component.partNames.join(", ")})`,
        );
    }
    if (typeof testId === "string") return `${testId}-${anatomy.attribute}`;
    return (
        (testId as Partial<Record<string, string>> | undefined)?.[part] ??
        anatomy.testId
    );
};

/** The attributes every part carries on the web. */
export interface PartAttributes {
    readonly [SCOPE_ATTRIBUTE]: string;
    readonly [PART_ATTRIBUTE]: string;
    readonly [TEST_ID_ATTRIBUTE]: string;
}

// A part's attributes with its default test id, made once per anatomy and part: every instance
// without a `testId` shares them.
const defaultAttributes = new WeakMap<
    ComponentAnatomy,
    Map<string, PartAttributes>
>();

/** A part's `data-scope`, `data-pf-part`, and `data-testid`. With no `testId`, the same frozen
 *  object for the same anatomy and part. */
export const partAttributes = <A extends ComponentAnatomy>(
    component: A,
    part: PartName<A>,
    testId?: TestIdOverride<PartName<A>>,
): PartAttributes => {
    if (testId !== undefined) return attributesOf(component, part, testId);
    let byPart = defaultAttributes.get(component);
    if (!byPart) {
        byPart = new Map();
        defaultAttributes.set(component, byPart);
    }
    let attributes = byPart.get(part);
    if (!attributes) {
        attributes = Object.freeze(attributesOf(component, part));
        byPart.set(part, attributes);
    }
    return attributes;
};

const attributesOf = <A extends ComponentAnatomy>(
    component: A,
    part: PartName<A>,
    testId?: TestIdOverride<PartName<A>>,
): PartAttributes => ({
    [SCOPE_ATTRIBUTE]: component.scope,
    [PART_ATTRIBUTE]: (component.parts as ComponentAnatomy["parts"])[part]!
        .attribute,
    [TEST_ID_ATTRIBUTE]: partTestId(component, part, testId),
});

/** The registry slot a part reads its classes and the provider's `slotProps` from: its `slot`, else
 *  its name. `null` when it has none. */
export const partSlot = (part: PartAnatomy): string | null =>
    part.slot === undefined ? part.name : part.slot;
