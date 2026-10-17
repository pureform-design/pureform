import * as zagCheckbox from "@zag-js/checkbox";
import * as zagDialog from "@zag-js/dialog";
import * as zagMenu from "@zag-js/menu";
import * as zagRadioGroup from "@zag-js/radio-group";
import * as zagSelect from "@zag-js/select";
import * as zagSwitch from "@zag-js/switch";
import * as zagTabs from "@zag-js/tabs";
import * as zagTooltip from "@zag-js/tooltip";
import { describe, expect, it } from "vitest";

import * as machines from ".";

describe("@pureform/machines", () => {
    it("re-exports Zag's machines unchanged, but for the form rules of the switch, radio group, and select", () => {
        expect(machines.checkbox.machine).toBe(zagCheckbox.machine);
        expect(machines.checkbox.connect).toBe(zagCheckbox.connect);
        expect(machines.menu.machine).toBe(zagMenu.machine);
        expect(machines.dialog.machine).toBe(zagDialog.machine);
        expect(machines.tooltip.machine).toBe(zagTooltip.machine);
        expect(machines.tabs.machine).toBe(zagTabs.machine);
        expect(machines.switchControl.connect).toBe(zagSwitch.connect);
        expect(machines.switchControl.machine.on).toBe(zagSwitch.machine.on);
        expect(machines.radioGroup.connect).toBe(zagRadioGroup.connect);
        expect(machines.radioGroup.itemProps).toBe(zagRadioGroup.itemProps);
        expect(machines.radioGroup.machine.states).toBe(
            zagRadioGroup.machine.states,
        );
        expect(machines.select.connect).toBe(zagSelect.connect);
        expect(machines.select.collection).toBe(zagSelect.collection);
        expect(machines.select.machine.states).toBe(zagSelect.machine.states);
        expect(
            machines.select.machine.implementations?.effects
                ?.trackFormControlState,
        ).not.toBe(
            zagSelect.machine.implementations?.effects?.trackFormControlState,
        );
        expect(
            machines.radioGroup.machine.implementations?.effects
                ?.trackFormControlState,
        ).not.toBe(
            zagRadioGroup.machine.implementations?.effects
                ?.trackFormControlState,
        );
    });

    it("gives every machine Zag's shape", () => {
        for (const name of [
            "button",
            "checkbox",
            "dialog",
            "menu",
            "navigation",
            "radioGroup",
            "ripple",
            "select",
            "slider",
            "snackbar",
            "switchControl",
            "tabs",
            "textField",
            "tooltip",
        ] as const) {
            const machine = machines[name];
            expect(typeof machine.machine.initialState, name).toBe("function");
            expect(typeof machine.connect, name).toBe("function");
            expect(typeof machine.anatomy.build, name).toBe("function");
            expect(Array.isArray(machine.props), name).toBe(true);
        }
    });
});
