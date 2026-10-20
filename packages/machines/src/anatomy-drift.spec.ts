// Each own machine's anatomy has every part of the preset's anatomy for its component, so a
// part added to the preset fails here until the machine has it too.
import {
    autocompleteAnatomy,
    buttonAnatomy,
    buttonGroupAnatomy,
    inputChipAnatomy,
    navigationBarAnatomy,
    navigationRailAnatomy,
    searchViewAnatomy,
    sliderAnatomy,
    snackbarAnatomy,
    tagsInputAnatomy,
    textAreaAnatomy,
    textFieldAnatomy,
} from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { anatomy as buttonGroup } from "./button-group";
import { anatomy as button } from "./button/button.anatomy";
import {
    anatomy as autocomplete,
    searchViewAnatomy as searchView,
} from "./combobox/combobox.anatomy";
import { anatomy as navigation } from "./navigation/navigation.anatomy";
import { anatomy as slider } from "./slider/slider.anatomy";
import { anatomy as snackbar } from "./snackbar/snackbar.anatomy";
import {
    anatomy as tagsInput,
    chipAnatomy as inputChip,
} from "./tags-input/tags-input.anatomy";
import { anatomy as textField } from "./text-field/text-field.anatomy";

interface Pair {
    machine: { keys(): string[] };
    preset: { partNames: readonly string[] };
}

const pairs: Record<string, Pair> = {
    autocomplete: { machine: autocomplete, preset: autocompleteAnatomy },
    button: { machine: button, preset: buttonAnatomy },
    buttonGroup: { machine: buttonGroup, preset: buttonGroupAnatomy },
    navigationBar: { machine: navigation, preset: navigationBarAnatomy },
    navigationRail: { machine: navigation, preset: navigationRailAnatomy },
    searchView: { machine: searchView, preset: searchViewAnatomy },
    slider: { machine: slider, preset: sliderAnatomy },
    snackbar: { machine: snackbar, preset: snackbarAnatomy },
    tagsInput: { machine: tagsInput, preset: tagsInputAnatomy },
    inputChip: { machine: inputChip, preset: inputChipAnatomy },
    textField: { machine: textField, preset: textFieldAnatomy },
    textArea: { machine: textField, preset: textAreaAnatomy },
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
