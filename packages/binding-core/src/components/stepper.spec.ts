import { describe, expect, it } from "vitest";

import {
    STEPPER_ROOT_PROPS,
    stepperIndicator,
    stepperMachineProps,
    stepperSelection,
    stepperTriggerDisabled,
    stepperTriggerProps,
} from "./stepper";

describe("the stepper's contract", () => {
    it("selects the variants and tokens from Root's props", () => {
        expect(
            stepperSelection({
                orientation: "vertical",
                density: "-1",
            } as never),
        ).toEqual({
            orientation: "vertical",
            density: "-1",
            tokens: undefined,
        });
        expect(STEPPER_ROOT_PROPS).toContain("onStepChange");
    });

    it("takes the machine's orientation from the variant, a row for any other value", () => {
        expect(
            stepperMachineProps({ orientation: "vertical" }).orientation,
        ).toBe("vertical");
        expect(stepperMachineProps({}).orientation).toBe("horizontal");
        expect(
            stepperMachineProps({ id: "s", ids: { list: "l" }, count: 3 }),
        ).toMatchObject({ count: 3, ids: { root: "s", list: "l" } });
    });

    it("drops aria-controls from a header with no content to name", () => {
        const props = { id: "t", "aria-controls": "c" };
        expect(stepperTriggerProps(props, { controls: true })).toBe(props);
        expect(stepperTriggerProps(props, { controls: false })).toEqual({
            id: "t",
        });
    });

    it("disables a header that is disabled, or done and not editable", () => {
        expect(stepperTriggerDisabled({}, true)).toBe(false);
        expect(stepperTriggerDisabled({ disabled: true }, false)).toBe(true);
        expect(stepperTriggerDisabled({ editable: false }, true)).toBe(true);
        expect(stepperTriggerDisabled({ editable: false }, false)).toBe(false);
    });

    it("shows an error over a check, a check over an icon, and the number last", () => {
        const state = (completed: boolean, hasIcon: boolean) => ({
            completed,
            hasIcon,
        });
        expect(stepperIndicator({ error: true }, state(true, true))).toBe(
            "error",
        );
        expect(stepperIndicator({}, state(true, true))).toBe("check");
        expect(stepperIndicator({}, state(false, true))).toBe("icon");
        expect(stepperIndicator({}, state(false, false))).toBe("number");
    });
});
