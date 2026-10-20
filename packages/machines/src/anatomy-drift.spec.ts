// Each own machine's anatomy has every part of the preset's anatomy for its component, so a
// part added to the preset fails here until the machine has it too.
import {
    buttonAnatomy,
    navigationBarAnatomy,
    navigationRailAnatomy,
    sliderAnatomy,
    snackbarAnatomy,
    textAreaAnatomy,
    textFieldAnatomy,
} from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { anatomy as button } from "./button/button.anatomy";
import { anatomy as navigation } from "./navigation/navigation.anatomy";
import { anatomy as slider } from "./slider/slider.anatomy";
import { anatomy as snackbar } from "./snackbar/snackbar.anatomy";
import { anatomy as textField } from "./text-field/text-field.anatomy";

interface Pair {
    machine: { keys(): string[] };
    preset: { partNames: readonly string[] };
}

const pairs: Record<string, Pair> = {
    button: { machine: button, preset: buttonAnatomy },
    navigationBar: { machine: navigation, preset: navigationBarAnatomy },
    navigationRail: { machine: navigation, preset: navigationRailAnatomy },
    slider: { machine: slider, preset: sliderAnatomy },
    snackbar: { machine: snackbar, preset: snackbarAnatomy },
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
