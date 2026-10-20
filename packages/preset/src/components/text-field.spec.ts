import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { textField } from "./text-field";

const FOCUS = ":is(:focus-within)";
const FILLED =
    ":is(:is(input, textarea):not(:placeholder-shown), :has(:is(input, textarea):not(:placeholder-shown)), [data-pf-filled])";
const INVALID = ":is([aria-invalid=true], :has([aria-invalid=true]))";

const compiled = () =>
    compilePreset(configWith(textField)).theme?.slotRecipes?.textField;

describe("textField", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(textField)).not.toThrow();
    });

    it("declares how its slots nest", () => {
        expect(textField.structure).toEqual({
            root: ["container", "supportingRow"],
            container: [
                "leadingIcon",
                "prefixText",
                "input",
                "suffixText",
                "label",
                "trailingIcon",
            ],
            supportingRow: ["supportingText", "counter"],
        });
    });

    it("makes room for icons and floats an outlined label clear of the leading one", () => {
        const recipe = compiled();
        expect(recipe?.variants?.leadingIcon?.true?.input).toEqual({
            paddingInlineStart:
                "calc(var(--components-textField-textInsetWithIcon, 52px) + calc(calc(0px - var(--components-textField-textInsetWithIcon, 52px)) * var(--components-textField-prefixed, 0)))",
        });
        const outlinedIcon = recipe?.compoundVariants?.find(
            (c) => c.variant === "outlined" && c.leadingIcon === true,
        );
        const css = outlinedIcon?.css as Record<
            string,
            Record<string, unknown>
        >;
        const inset = css.label?.insetInlineStart as Record<string, string>;
        expect(inset.base).toContain("textInsetWithIcon");
        expect(inset[`.textField__container${FOCUS}${FOCUS} &`]).toContain(
            "paddingInline",
        );
    });

    it("turns the trailing icon to the error color with the field", () => {
        const icon = compiled()?.base?.trailingIcon as Record<
            string,
            Record<string, string>
        >;
        expect(
            icon.color?.[
                `.textField__container${INVALID}${INVALID}${INVALID}${INVALID} &`
            ],
        ).toContain("errorColor");
    });

    it("floats the label to the small body style on focus or a value", () => {
        const label = compiled()?.base?.label as Record<
            string,
            Record<string, string>
        >;
        expect(label.fontSize).toEqual({
            base: "token(fontSizes.bodyLarge)",
            [`.textField__container${FILLED} &`]: "token(fontSizes.bodySmall)",
            [`.textField__container${FOCUS}${FOCUS} &`]:
                "token(fontSizes.bodySmall)",
        });
    });

    it("thickens the filled indicator on focus, and keeps it thick with an error", () => {
        const container = compiled()?.variants?.variant?.filled
            ?.container as Record<string, Record<string, unknown>>;
        const shadow = container.boxShadow ?? {};
        expect(shadow[`&${FOCUS}${FOCUS}`]).toContain(
            "0px calc(var(--components-textField-focusIndicatorWidth, 2px) * -1)",
        );
        const invalid = `${INVALID}${INVALID}${INVALID}${INVALID}`;
        expect(shadow[`&${invalid}`]).toContain("errorColor");
        expect(shadow[`&${invalid}${FOCUS}${FOCUS}`]).toContain(
            "focusIndicatorWidth",
        );
    });

    it("colors the label from the container and the supporting text from the root", () => {
        const base = compiled()?.base as Record<
            string,
            Record<string, Record<string, string>>
        >;
        const label = `.textField__container${INVALID}${INVALID}${INVALID}${INVALID} &`;
        const helper = `.textField__root${INVALID}${INVALID}${INVALID}${INVALID} &`;
        expect(base.label?.color?.[label]).toContain("errorColor");
        expect(base.supportingText?.color?.[helper]).toContain("errorColor");
    });

    it("hands the input's inline padding to a prefix or a suffix", () => {
        const recipe = compiled();
        const flag = (side: "prefixed" | "suffixed") =>
            recipe?.variants?.[
                side === "prefixed" ? "prefixText" : "suffixText"
            ]?.true?.root as Record<string, unknown>;
        expect(flag("prefixed")).toEqual({
            "--components-textField-prefixed": "1",
        });
        expect(flag("suffixed")).toEqual({
            "--components-textField-suffixed": "1",
        });
        const input = recipe?.base?.input as Record<string, string>;
        expect(input.paddingInlineStart).toContain("prefixed");
        expect(input.paddingInlineEnd).toContain("suffixed");
        // The icon's room moves to the affix on its side.
        expect(recipe?.variants?.leadingIcon?.true?.prefixText).toEqual({
            paddingInlineStart:
                "var(--components-textField-textInsetWithIcon, 52px)",
        });
        expect(recipe?.variants?.trailingIcon?.true?.suffixText).toEqual({
            paddingInlineEnd:
                "var(--components-textField-textInsetWithIcon, 52px)",
        });
    });

    it("shows the prefix and suffix once the label floats", () => {
        const base = compiled()?.base as Record<
            string,
            Record<string, Record<string, string>>
        >;
        for (const part of ["prefixText", "suffixText"]) {
            expect(base[part]?.opacity).toEqual({
                base: "0",
                [`.textField__container${FILLED} &`]: "1",
                [`.textField__container${FOCUS}${FOCUS} &`]: "1",
            });
        }
    });

    it("puts the counter at the end of the supporting row, in the error color with the field", () => {
        const base = compiled()?.base as Record<
            string,
            Record<string, Record<string, string> | string>
        >;
        const helper = `.textField__root${INVALID}${INVALID}${INVALID}${INVALID} &`;
        expect(base.supportingRow).toMatchObject({
            display: "flex",
            flexDirection: "row",
        });
        expect(base.counter?.marginInlineStart).toBe("auto");
        expect(
            (base.counter!.color as Record<string, string>)[helper],
        ).toContain("errorColor");
    });

    it("draws the secure field's trailing icon as a button with a focus ring", () => {
        const icon = compiled()?.variants?.secure?.true?.trailingIcon as Record<
            string,
            unknown
        >;
        expect(icon).toMatchObject({
            cursor: "pointer",
            backgroundColor: "transparent",
            borderWidth: "0px",
        });
        expect(JSON.stringify(icon.outlineStyle)).toContain("focus-visible");
        expect(String(icon.borderRadius)).toContain("full");
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
