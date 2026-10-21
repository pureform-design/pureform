import * as zagCarousel from "@zag-js/carousel";
import * as zagCheckbox from "@zag-js/checkbox";
import * as zagCombobox from "@zag-js/combobox";
import * as zagDateInput from "@zag-js/date-input";
import * as zagDatePicker from "@zag-js/date-picker";
import * as zagDialog from "@zag-js/dialog";
import * as zagMenu from "@zag-js/menu";
import * as zagRadioGroup from "@zag-js/radio-group";
import * as zagSelect from "@zag-js/select";
import * as zagSwitch from "@zag-js/switch";
import * as zagTabs from "@zag-js/tabs";
import * as zagTagsInput from "@zag-js/tags-input";
import * as zagTooltip from "@zag-js/tooltip";
import { describe, expect, it } from "vitest";

import * as machines from ".";

describe("@pureform/machines", () => {
    it("re-exports Zag's tooltip unchanged, and its dialog with its states and transitions", () => {
        expect(machines.dialog.machine.states).toBe(zagDialog.machine.states);
        expect(machines.dialog.connect).toBe(zagDialog.connect);
        expect(machines.tooltip.machine).toBe(zagTooltip.machine);
        expect(machines.tooltip.connect).toBe(zagTooltip.connect);
    });

    it("re-exports Zag's date picker and date input unchanged", () => {
        expect(machines.datePicker.machine).toBe(zagDatePicker.machine);
        expect(machines.datePicker.connect).toBe(zagDatePicker.connect);
        expect(machines.dateInput.machine).toBe(zagDateInput.machine);
        expect(machines.dateInput.connect).toBe(zagDateInput.connect);
        expect(
            machines.datePicker.toISO(machines.datePicker.parse("2026-08-17")!),
        ).toBe("2026-08-17");
    });

    it("keeps Zag's states and transitions for the machines that emit to an interaction source", () => {
        const zag = {
            carousel: zagCarousel,
            checkbox: zagCheckbox,
            combobox: zagCombobox,
            menu: zagMenu,
            radioGroup: zagRadioGroup,
            select: zagSelect,
            switchControl: zagSwitch,
            tabs: zagTabs,
            tagsInput: zagTagsInput,
        };
        for (const [name, own] of Object.entries(zag)) {
            const ours = machines[name as keyof typeof zag];
            expect(ours.machine.states, name).toBe(own.machine.states);
            expect(ours.machine.on, name).toBe(own.machine.on);
            // The select's context leaves its selected items to a computed value.
            if (name !== "select")
                expect(ours.machine.context, name).toBe(own.machine.context);
            expect(ours.machine, name).not.toBe(own.machine);
            expect(ours.connect, name).not.toBe(own.connect);
        }
        expect(machines.radioGroup.itemProps).toBe(zagRadioGroup.itemProps);
        expect(machines.select.collection).toBe(zagSelect.collection);
    });

    it("swaps the form rules of the switch, radio group, and select", () => {
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
        expect(
            machines.checkbox.machine.implementations?.effects
                ?.trackFormControlState,
        ).toBe(
            zagCheckbox.machine.implementations?.effects?.trackFormControlState,
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
