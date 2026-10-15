import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const reset = await readFile(new URL("../reset.css", import.meta.url), "utf8");

describe("reset.css", () => {
    it("sits in the reset layer, ahead of the components", () => {
        expect(reset).toMatch(/^@layer pureform\.reset \{$/m);
    });

    it("lets components draw a border by its width", () => {
        expect(reset).toContain("border: 0 solid;");
    });

    it("credits each source with its license", () => {
        for (const source of [
            "Panda CSS preflight",
            "modern-normalize",
            "A (more) Modern CSS Reset",
            "Josh W. Comeau",
        ]) {
            expect(reset).toContain(source);
        }
    });

    it("balances its braces", () => {
        let depth = 0;
        for (const char of reset.replace(/\/\*[\s\S]*?\*\//g, "")) {
            if (char === "{") depth++;
            if (char === "}") depth--;
            expect(depth).toBeGreaterThanOrEqual(0);
        }
        expect(depth).toBe(0);
    });
});
