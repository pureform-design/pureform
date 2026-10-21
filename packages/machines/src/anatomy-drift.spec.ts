// Each own machine's anatomy has every part of the preset's anatomy for its component, so a
// part added to the preset fails here until the machine has it too.
import {
    accordionAnatomy,
    autocompleteAnatomy,
    buttonAnatomy,
    buttonGroupAnatomy,
    chipSetAnatomy,
    calendarCellAnatomy,
    carouselAnatomy,
    dateInputAnatomy,
    datePickerAnatomy,
    dockedDatePickerAnatomy,
    inputChipAnatomy,
    navigationBarAnatomy,
    navigationRailAnatomy,
    paginatorAnatomy,
    searchViewAnatomy,
    sliderAnatomy,
    snackbarAnatomy,
    stepperAnatomy,
    dataTableAnatomy,
    tagsInputAnatomy,
    textAreaAnatomy,
    textFieldAnatomy,
    timeInputAnatomy,
    timePickerAnatomy,
    toastAnatomy,
    treeAnatomy,
} from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { anatomy as accordion } from "./accordion/accordion.anatomy";
import { anatomy as buttonGroup } from "./button-group";
import { anatomy as button } from "./button/button.anatomy";
import { anatomy as carousel } from "./carousel/carousel.anatomy";
import {
    anatomy as autocomplete,
    searchViewAnatomy as searchView,
} from "./combobox/combobox.anatomy";
import { anatomy as dateInput } from "./date-input/date-input.anatomy";
import {
    anatomy as datePicker,
    cellAnatomy as calendarCell,
    dockedAnatomy as dockedDatePicker,
} from "./date-picker/date-picker.anatomy";
import { anatomy as navigation } from "./navigation/navigation.anatomy";
import { anatomy as paginator } from "./paginator/paginator.anatomy";
import { anatomy as slider } from "./slider/slider.anatomy";
import { anatomy as snackbar } from "./snackbar/snackbar.anatomy";
import { anatomy as stepper } from "./stepper/stepper.anatomy";
import { anatomy as table } from "./table/table.anatomy";
import {
    anatomy as tagsInput,
    chipAnatomy as inputChip,
} from "./tags-input/tags-input.anatomy";
import { anatomy as textField } from "./text-field/text-field.anatomy";
import {
    anatomy as timePicker,
    timeInputAnatomy as timeInput,
} from "./time-picker/time-picker.anatomy";
import { anatomy as toast } from "./toast";
import { anatomy as tree } from "./tree-view/tree-view.anatomy";

interface Pair {
    machine: { keys(): string[] };
    preset: { partNames: readonly string[] };
}

const pairs: Record<string, Pair> = {
    accordion: { machine: accordion, preset: accordionAnatomy },
    autocomplete: { machine: autocomplete, preset: autocompleteAnatomy },
    button: { machine: button, preset: buttonAnatomy },
    buttonGroup: { machine: buttonGroup, preset: buttonGroupAnatomy },
    chipSet: { machine: buttonGroup, preset: chipSetAnatomy },
    calendarCell: { machine: calendarCell, preset: calendarCellAnatomy },
    carousel: { machine: carousel, preset: carouselAnatomy },
    datePicker: { machine: datePicker, preset: datePickerAnatomy },
    dockedDatePicker: {
        machine: dockedDatePicker,
        preset: dockedDatePickerAnatomy,
    },
    dateInput: { machine: dateInput, preset: dateInputAnatomy },
    navigationBar: { machine: navigation, preset: navigationBarAnatomy },
    navigationRail: { machine: navigation, preset: navigationRailAnatomy },
    paginator: { machine: paginator, preset: paginatorAnatomy },
    searchView: { machine: searchView, preset: searchViewAnatomy },
    slider: { machine: slider, preset: sliderAnatomy },
    snackbar: { machine: snackbar, preset: snackbarAnatomy },
    stepper: { machine: stepper, preset: stepperAnatomy },
    dataTable: { machine: table, preset: dataTableAnatomy },
    tagsInput: { machine: tagsInput, preset: tagsInputAnatomy },
    inputChip: { machine: inputChip, preset: inputChipAnatomy },
    textField: { machine: textField, preset: textFieldAnatomy },
    textArea: { machine: textField, preset: textAreaAnatomy },
    timePicker: { machine: timePicker, preset: timePickerAnatomy },
    timeInput: { machine: timeInput, preset: timeInputAnatomy },
    toast: { machine: toast, preset: toastAnatomy },
    tree: { machine: tree, preset: treeAnatomy },
};

const missing = ({ machine, preset }: Pair) =>
    preset.partNames.filter((part) => !machine.keys().includes(part));

describe("machine anatomies against the preset's", () => {
    for (const [name, pair] of Object.entries(pairs)) {
        it(`${name} has every preset part`, () => {
            expect(missing(pair)).toEqual([]);
        });
    }
});
