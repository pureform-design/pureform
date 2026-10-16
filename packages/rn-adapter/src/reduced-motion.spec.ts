// Under reduced motion, selection keeps the transitions that fade (colors, opacity, elevation)
// and drops the ones that move, as the web's computed `transition` does; and a token tween
// stops only for tokens that move something.

import { pureform } from "@pureform/preset";
import { describe, expect, it } from "vitest";

import { precompute } from "./build";
import { tokenTransitions } from "./motion";
import { stylesFor } from "./resolve";
import { selectWithTransitions } from "./select";
import type { Transition } from "./values";

const styles = stylesFor(
    precompute(pureform(), {
        components: [
            "button",
            "switchControl",
            "radio",
            "linearProgress",
            "circularProgress",
            "textField",
        ],
    }),
    "base:light",
);

const properties = (
    name: string,
    slot: string,
    reducedMotion: boolean,
    variants: Record<string, string> = {},
): string[] =>
    (
        selectWithTransitions(styles[name]!, variants, { reducedMotion })
            .transitions[slot] ?? []
    ).map((t) => t.property);

const STATE = [
    "backgroundColor",
    "color",
    "borderColor",
    "outlineColor",
    "boxShadow",
];

describe("selection under reduced motion", () => {
    it("keeps the state colors and elevation", () => {
        expect(properties("button", "root", false)).toEqual(STATE);
        expect(properties("button", "root", true)).toEqual(STATE);
    });

    it("drops a switch handle's movement and keeps its color", () => {
        expect(properties("switchControl", "handle", false)).toEqual([
            "start",
            "width",
            "height",
            "backgroundColor",
        ]);
        expect(properties("switchControl", "handle", true)).toEqual([
            "backgroundColor",
        ]);
    });

    it("drops a radio dot's growth and keeps its color", () => {
        const full = properties("radio", "dot", false);
        expect(full).toContain("transform");
        expect(properties("radio", "dot", true)).toEqual(["backgroundColor"]);
    });

    it("drops a text field label's float and keeps its colors", () => {
        const full = properties("textField", "label", false);
        expect(full).toContain("top");
        expect(full).toContain("fontSize");
        expect(properties("textField", "label", true)).toEqual([
            "backgroundColor",
            "color",
        ]);
    });

    it("drops a progress indicator's value tween", () => {
        expect(properties("linearProgress", "indicator", false)).toEqual([
            "width",
        ]);
        expect(properties("linearProgress", "indicator", true)).toEqual([]);
        expect(properties("circularProgress", "root", false)).toEqual([
            "--components.circularProgress.value",
        ]);
        expect(properties("circularProgress", "root", true)).toEqual([]);
    });
});

describe("tokenTransitions", () => {
    const tween = (
        property: string,
        valueType?: Transition["valueType"],
    ): Transition => ({
        property,
        duration: 100,
        easing: "linear",
        delay: 0,
        ...(valueType ? { valueType } : {}),
    });
    const transitions = {
        root: [
            tween("backgroundColor"),
            tween("--components.x.value", "number"),
            tween("--components.x.size", "length"),
            tween("--components.x.turn", "angle"),
            tween("--components.x.share", "percentage"),
            tween("--components.x.tint", "color"),
        ],
    };

    it("tweens every token whose own value transitions", () => {
        expect([...tokenTransitions(transitions, false).keys()]).toEqual([
            "components.x.value",
            "components.x.size",
            "components.x.turn",
            "components.x.share",
            "components.x.tint",
        ]);
    });

    it("keeps only color tokens under reduced motion", () => {
        expect([...tokenTransitions(transitions, true).keys()]).toEqual([
            "components.x.tint",
        ]);
    });

    it("carries the token's type from the lowering", () => {
        const [transition] = selectWithTransitions(
            styles.circularProgress!,
            {},
            {},
        ).transitions.root!;
        expect(transition?.valueType).toBe("number");
    });
});
