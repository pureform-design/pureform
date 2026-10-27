// HTML projection of portable anatomy identities and test ids.
import type {
    ComponentAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import { partTestId } from "@pureform/anatomy";
import {
    PART_ATTRIBUTE,
    SCOPE_ATTRIBUTE,
    TEST_ID_ATTRIBUTE,
} from "@pureform/web-contracts";
import type { PartAttributes } from "@pureform/web-contracts";

// The default attributes are shared by every instance of the same anatomy and part.
const defaultAttributes = new WeakMap<
    ComponentAnatomy,
    Map<string, PartAttributes>
>();

/** A part's HTML attributes. Default attributes share the same frozen object. */
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
