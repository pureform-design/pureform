import * as zagAccordion from "@zag-js/accordion";
import * as zagAvatar from "@zag-js/avatar";
import * as zagCarousel from "@zag-js/carousel";
import * as zagCheckbox from "@zag-js/checkbox";
import * as zagCombobox from "@zag-js/combobox";
import * as zagDateInput from "@zag-js/date-input";
import * as zagDatePicker from "@zag-js/date-picker";
import * as zagDialog from "@zag-js/dialog";
import * as zagListbox from "@zag-js/listbox";
import * as zagMenu from "@zag-js/menu";
import * as zagNumberInput from "@zag-js/number-input";
import * as zagPinInput from "@zag-js/pin-input";
import * as zagRadioGroup from "@zag-js/radio-group";
import * as zagSelect from "@zag-js/select";
import * as zagSplitter from "@zag-js/splitter";
import * as zagSteps from "@zag-js/steps";
import * as zagSwitch from "@zag-js/switch";
import * as zagTabs from "@zag-js/tabs";
import * as zagTagsInput from "@zag-js/tags-input";
import * as zagTooltip from "@zag-js/tooltip";
import * as zagTreeView from "@zag-js/tree-view";
import { describe, expect, it } from "vitest";

import * as machines from ".";

describe("@pureform/machines", () => {
    it("re-exports Zag's tooltip unchanged, and its dialog with its states and transitions", () => {
        expect(machines.dialog.machine.states).toBe(zagDialog.machine.states);
        expect(machines.dialog.connect).toBe(zagDialog.connect);
        expect(machines.tooltip.machine).toBe(zagTooltip.machine);
        expect(machines.tooltip.connect).toBe(zagTooltip.connect);
    });

    it("re-exports Zag's avatar unchanged, with the parts the preset draws", () => {
        expect(machines.avatar.machine).toBe(zagAvatar.machine);
        expect(machines.avatar.connect).toBe(zagAvatar.connect);
        expect(machines.avatar.anatomy.keys()).toEqual([
            "root",
            "image",
            "fallback",
        ]);
    });

    it("re-exports Zag's splitter, measuring only when something changed, with the parts the preset draws", () => {
        expect(machines.splitter.machine.states).toBe(
            zagSplitter.machine.states,
        );
        expect(
            machines.splitter.machine.implementations?.actions?.["syncSize"],
        ).not.toBe(zagSplitter.machine.implementations?.actions?.["syncSize"]);
        expect(machines.splitter.connect).toBe(zagSplitter.connect);
        expect(machines.splitter.anatomy.keys()).toEqual([
            "root",
            "panel",
            "resizeTrigger",
            "resizeTriggerIndicator",
        ]);
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

    it("re-exports Zag's number input (a press ending wherever the pointer is released) and pin input, with the parts the preset's number and code fields draw", () => {
        expect(machines.numberInput.machine).toBe(zagNumberInput.machine);
        expect(machines.numberInput.connect).not.toBe(zagNumberInput.connect);
        expect(machines.numberInput.anatomy.keys()).toEqual(
            expect.arrayContaining([
                "container",
                "control",
                "decrementTrigger",
                "incrementTrigger",
                "supportingText",
            ]),
        );
        expect(machines.pinInput.machine.context).toBe(
            zagPinInput.machine.context,
        );
        expect(machines.pinInput.machine).not.toBe(zagPinInput.machine);
        expect(machines.pinInput.connect).toBe(zagPinInput.connect);
        expect(machines.pinInput.anatomy.keys()).toEqual([
            "root",
            "label",
            "input",
            "control",
            "supportingText",
        ]);
    });

    it("keeps Zag's states and transitions for the machines that emit to an interaction source", () => {
        const zag = {
            accordion: zagAccordion,
            carousel: zagCarousel,
            checkbox: zagCheckbox,
            combobox: zagCombobox,
            menu: zagMenu,
            radioGroup: zagRadioGroup,
            select: zagSelect,
            selectionList: zagListbox,
            stepper: zagSteps,
            switchControl: zagSwitch,
            tabs: zagTabs,
            tagsInput: zagTagsInput,
            treeView: zagTreeView,
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
        expect(machines.selectionList.collection).toBe(zagListbox.collection);
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
            "selectionList",
            "slider",
            "snackbar",
            "stepper",
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
