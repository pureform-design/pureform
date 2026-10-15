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

    it("keeps one color, whatever its parent holds", () => {
        expect(compiled()?.base).toMatchObject({
            color: "var(--components-supportingText-color, token(colors.onSurfaceVariant))",
        });
    });

    it("takes the error color from its tone", () => {
        expect(compiled()?.variants?.tone?.error).toEqual({
            color: "var(--components-supportingText-errorColor, token(colors.error))",
        });
    });

    it("compiles to a stable Panda recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
