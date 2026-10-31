// Portable part identities and test id rules: `pf-<component>-<part>` by
// default, or the `testId` given to Root, as a prefix for every part or per part.

import type { ComponentAnatomy, PartAnatomy, PartName } from "./types";

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

/** The registry slot a part reads its classes from: its `slot`, else its name. `null` when it has
 *  none. Not the key a provider's `slotProps` or an instance's props use: those are the part's name. */
export const partSlot = (part: PartAnatomy): string | null =>
    part.slot === undefined ? part.name : part.slot;
