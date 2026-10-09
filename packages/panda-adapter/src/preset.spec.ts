import { buttonConfig } from "@pureform/core/fixtures/button";
import { describe, expect, it } from "vitest";

import { compilePreset } from "./preset";

/** Narrow an indexed lookup (strict mode adds `| undefined`) and fail loudly if absent. */
const req = <T>(value: T | undefined): T => {
    if (value === undefined) throw new Error("missing preset entry");
    return value;
};

type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => req(value) as Obj;

describe("compilePreset (canonical button)", () => {
    const preset = compilePreset(buttonConfig);
    const theme = obj(preset.theme);
    const button = () => obj(obj(theme.slotRecipes).button);

    it("produces a stable Panda preset shape", () => {
        expect(preset).toMatchSnapshot();
    });

    it("lowers primitive tokens into Panda categories", () => {
        const colors = obj(obj(theme.tokens).colors);
        expect(obj(colors.violet600).value).toBe("rgb(124 58 237)");
        const fontSizes = obj(obj(theme.tokens).fontSizes);
        expect(obj(fontSizes.md).value).toBe("16px");
    });

    it("emits semantic tokens as var-with-token-fallback and plain token refs", () => {
        const colors = obj(obj(theme.semanticTokens).colors);
        expect(obj(colors.brand).value).toBe(
            "var(--global-colors-brand, token(colors.violet600))",
        );
        expect(obj(colors.onBrand).value).toBe("token(colors.white)");
    });

    it("compiles the button as a slot recipe with its slots and variants", () => {
        const b = button();
        expect(b.slots).toEqual([
            "root",
            "label",
            "leadingIcon",
            "trailingIcon",
        ]);
        expect(b.className).toBe("btn");
        expect(b.jsx).toEqual(["Button"]);
        expect(Object.keys(obj(b.variants))).toEqual([
            "color",
            "variant",
            "size",
            "leading",
            "trailing",
        ]);
    });

    it("keeps recipe color refs as token() refs, not inlined colors", () => {
        const variants = obj(button().variants);
        const danger = obj(obj(obj(variants.color).danger).root);
        expect(danger.backgroundColor).toBe("token(colors.danger)");
    });

    it("lowers the dynamic component token to a var() chain in the recipe base", () => {
        const root = obj(obj(button().base).root);
        expect(root.backgroundColor).toBe(
            "var(--ui-button-bg, var(--components-button-bg, token(colors.brand)))",
        );
    });

    it("lowers the opacity conditional and disabled state block", () => {
        const root = obj(obj(button().base).root);
        expect(root.opacity).toEqual({ base: "1", _disabled: "0.38" });
        expect(root._disabled).toMatchObject({ cursor: "not-allowed" });
    });

    it("defines the elevation utility with its steps", () => {
        const util = obj(obj(preset.utilities).shadowElevation);
        expect(util.values).toEqual(["level0", "level1", "level2"]);
    });
});
