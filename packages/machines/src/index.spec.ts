import * as zagCheckbox from "@zag-js/checkbox";
import * as zagRadioGroup from "@zag-js/radio-group";
import * as zagSwitch from "@zag-js/switch";
import { describe, expect, it } from "vitest";

import * as machines from ".";

describe("@pureform/machines", () => {
    it("re-exports Zag's machines unchanged", () => {
        expect(machines.checkbox.machine).toBe(zagCheckbox.machine);
        expect(machines.checkbox.connect).toBe(zagCheckbox.connect);
        expect(machines.switchControl.machine).toBe(zagSwitch.machine);
        expect(machines.radioGroup.machine).toBe(zagRadioGroup.machine);
        expect(machines.radioGroup.itemProps).toBe(zagRadioGroup.itemProps);
    });

    it("gives every machine Zag's shape", () => {
        for (const name of [
            "button",
            "checkbox",
            "radioGroup",
            "ripple",
            "slider",
            "switchControl",
            "textField",
        ] as const) {
            const machine = machines[name];
            expect(typeof machine.machine.initialState, name).toBe("function");
            expect(typeof machine.connect, name).toBe("function");
            expect(typeof machine.anatomy.build, name).toBe("function");
            expect(Array.isArray(machine.props), name).toBe(true);
        }
    });
});
