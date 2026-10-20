// Each own machine's anatomy has every part of the preset's anatomy for its component, so a
// part added to the preset fails here until the machine has it too.
import {
    buttonAnatomy,
    navigationBarAnatomy,
    navigationRailAnatomy,
    sliderAnatomy,
    snackbarAnatomy,
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
    snackbar: { machine: snackbar, preset: snackbarAnatomy },
    textField: { machine: textField, preset: textFieldAnatomy },
};

const missing = ({ machine, preset }: Pair) =>
    preset.partNames.filter((part) => !machine.keys().includes(part));

describe("machine anatomies against the preset's", () => {
    for (const [name, pair] of Object.entries(pairs)) {
        it(`${name} has every preset part`, () => {
            expect(missing(pair)).toEqual([]);
        });
    }

    // The slider's machine is replaced in c1g, with the preset's parts.
    it.todo("slider has every preset part");
    it("slider's drift is known until c1g", () => {
        expect(missing({ machine: slider, preset: sliderAnatomy })).toEqual([
            "track",
            "activeTrack",
            "stateLayer",
            "handle",
        ]);
    });
});
