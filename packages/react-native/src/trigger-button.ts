// A trigger an overlay draws as a `Button` (a menu's, a dialog's, a popover's from a label),
// reached by the overlay's `trigger` key as the web's `asRoot` does: the key's style and slot
// props go on the button's root, and its test id is the button's root's.

import type { TestIdOverride } from "@pureform/anatomy";

import type { ButtonProps } from "./button";
import type { PartSlots } from "./slot-props";

type TriggerButtonProps = Pick<ButtonProps, "style" | "slotProps" | "testId">;

const roots = new WeakMap<object, { readonly root: object }>();

const asRoot = (value: object): { readonly root: object } => {
    let root = roots.get(value);
    if (!root) roots.set(value, (root = { root: value }));
    return root;
};

/** The trigger's test id from the overlay's `testId`: a prefix's (`menu` → `menu-trigger`), or
 *  its `trigger` key's. Without either, the button keeps its own. */
export const triggerTestId = (
    testId: TestIdOverride<string> | undefined,
): string | undefined =>
    typeof testId === "string" ? `${testId}-trigger` : testId?.["trigger"];

/** The `style`, `slotProps` and `testId` of the `Button` an overlay draws for its trigger, from
 *  the overlay's `trigger` key and `testId`. The same objects while the user's are. */
export const triggerButtonProps = (
    slot: PartSlots,
    testId: TestIdOverride<string> | undefined,
): TriggerButtonProps => {
    const testID = triggerTestId(testId);
    const style = slot.style("trigger", undefined as object | undefined);
    const props = slot.props("trigger");
    return {
        ...(style == null ? {} : { style: asRoot(style) }),
        ...(Object.keys(props).length === 0
            ? {}
            : { slotProps: asRoot(props) }),
        ...(testID === undefined ? {} : { testId: { root: testID } }),
    } as TriggerButtonProps;
};
