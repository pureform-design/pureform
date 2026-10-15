import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { supportingText } from "./supporting-text";

const compiled = () =>
    compilePreset(configWith(supportingText)).theme?.recipes?.supportingText;

describe("supportingText", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(supportingText)).not.toThrow();
    });

    it("follows an invalid input in its parent", () => {
        const base = compiled()?.base as Record<string, Record<string, string>>;
        const color = base.color;
        expect(color?.base).toContain("components-supportingText-color");
        expect(
            color?.[":has([aria-invalid=true][aria-invalid=true]) > &"],
        ).toContain("components-supportingText-errorColor");
    });

    it("takes the error color from its tone", () => {
        expect(compiled()?.variants?.tone?.error).toEqual({
            color: "var(--components-supportingText-errorColor, token(colors.negative))",
        });
    });

    it("compiles to a stable Panda recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
