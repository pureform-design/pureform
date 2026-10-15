import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { textField } from "./text-field";

const FOCUS = ":is(:focus-within, [data-focused])";
const FILLED =
    ":is(:is(input, textarea):not(:placeholder-shown), :has(:is(input, textarea):not(:placeholder-shown)), [data-filled])";
const INVALID =
    ":is([aria-invalid=true], :has([aria-invalid=true]), [data-invalid])";

const compiled = () =>
    compilePreset(configWith(textField)).theme?.slotRecipes?.textField;

describe("textField", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(textField)).not.toThrow();
    });

    it("declares how its slots nest", () => {
        expect(textField.structure).toEqual({
            root: ["container", "supportingText"],
            container: ["leadingIcon", "input", "label", "trailingIcon"],
        });
    });

    it("makes room for icons and floats an outlined label clear of the leading one", () => {
        const recipe = compiled();
        expect(recipe?.variants?.leadingIcon?.true?.input).toEqual({
            paddingInlineStart:
                "var(--components-textField-textInsetWithIcon, 52px)",
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
        const errored = shadow[
            `&${INVALID}${INVALID}${INVALID}${INVALID}`
        ] as Record<string, string>;
        expect(errored.base).toContain("errorColor");
        expect(errored[`&${FOCUS}${FOCUS}`]).toContain("focusIndicatorWidth");
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

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
