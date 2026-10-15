import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { textField } from "./text-field";

const FLOATED =
    ":is(:focus-within, :has(:is(input, textarea):not(:placeholder-shown))) > &";

const compiled = () =>
    compilePreset(configWith(textField)).theme?.slotRecipes?.textField;

describe("textField", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(textField)).not.toThrow();
    });

    it("floats the label to the small body style on focus or a value", () => {
        const label = compiled()?.base?.label as Record<
            string,
            Record<string, string>
        >;
        expect(label.fontSize).toEqual({
            base: "token(fontSizes.bodyLarge)",
            [FLOATED]: "token(fontSizes.bodySmall)",
        });
    });

    it("thickens the filled indicator on focus, outranking hover", () => {
        const container = compiled()?.variants?.variant?.filled
            ?.container as Record<string, Record<string, string>>;
        expect(container.boxShadow?.["&:focus-within:focus-within"]).toContain(
            "0px calc(var(--components-textField-focusIndicatorWidth, 2px) * -1)",
        );
    });

    it("colors the label and supporting text from the input's error", () => {
        const base = compiled()?.base as Record<
            string,
            Record<string, Record<string, string>>
        >;
        const errored = ":has([aria-invalid=true][aria-invalid=true]) > &";
        expect(base.label?.color?.[errored]).toContain("errorColor");
        expect(base.supportingText?.color?.[errored]).toContain("errorColor");
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
