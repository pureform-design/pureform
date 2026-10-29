import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { fakeAdapter, tempRoot, writeTree } from "./__fixtures__/project";
import { isGenerateError } from "./errors";
import { CONFIG_FILES, createGenerateRunner, findConfigFile } from "./runner";

const config = (components: string) =>
    `import { ${components} } from "./parts";\nexport default { tokens: {}, semanticTokens: {}, components: { ${components} } };\n`;

const parts = `export const chip = { kind: "component", name: "chip", recipe: { base: {} } };\nexport const divider = { kind: "component", name: "divider", recipe: { base: {} } };\n`;

const rejection = async (promise: Promise<unknown>) => {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    throw new Error("expected a rejection");
};

describe("findConfigFile", () => {
    it("finds the first config file in the root", () => {
        const root = tempRoot();
        expect(findConfigFile(root)).toBe("pureform.config.ts");
        writeTree(root, { "pureform.config.mjs": "export default {};" });
        expect(findConfigFile(root)).toBe("pureform.config.mjs");
        writeTree(root, { "pureform.config.ts": "export default {};" });
        expect(findConfigFile(root)).toBe("pureform.config.ts");
        expect(CONFIG_FILES[0]).toBe("pureform.config.ts");
    });
});

describe("createGenerateRunner", () => {
    it("generates, and knows the config and its imports as dependencies", async () => {
        const root = tempRoot();
        writeTree(root, {
            "pureform.config.ts": config("chip"),
            "parts.ts": parts,
        });
        const runner = createGenerateRunner({
            root,
            config: "pureform.config.ts",
            target: fakeAdapter(),
        });
        expect(runner.last).toBeUndefined();
        expect(runner.dependencies).toEqual([join(root, "pureform.config.ts")]);
        const result = await runner.run();
        expect(runner.last).toBe(result);
        expect(runner.dependencies).toEqual([
            join(root, "pureform.config.ts"),
            join(root, "parts.ts"),
        ]);
        expect(runner.affects(join(root, "parts.ts"))).toBe(true);
        expect(runner.affects("parts.ts")).toBe(true);
        expect(runner.affects(join(root, ".pureform/index.ts"))).toBe(false);
    });

    it("folds calls made during a run into one more run", async () => {
        const root = tempRoot();
        writeTree(root, {
            "pureform.config.ts": config("chip"),
            "parts.ts": parts,
        });
        const adapter = fakeAdapter();
        const entered = Promise.withResolvers<void>();
        const release = Promise.withResolvers<void>();
        const runner = createGenerateRunner({
            root,
            config: "pureform.config.ts",
            target: {
                ...adapter,
                codegen: async (context) => {
                    const output = adapter.codegen(context);
                    if (adapter.calls.length === 1) {
                        entered.resolve();
                        await release.promise;
                    }
                    return output;
                },
            },
        });
        const first = runner.run();
        await entered.promise;
        writeFileSync(join(root, "pureform.config.ts"), config("divider"));
        const second = runner.run();
        const third = runner.run();
        expect(second).toBe(third);
        release.resolve();
        await Promise.all([first, second]);
        expect(adapter.calls.map((call) => call.components)).toEqual([
            ["chip"],
            ["divider"],
        ]);
        expect(runner.last).toBe(await third);
    });

    it("keeps the config as a dependency when a run fails, and runs again after", async () => {
        const root = tempRoot();
        writeTree(root, { "pureform.config.ts": "export default 1;\n" });
        const runner = createGenerateRunner({
            root,
            config: "pureform.config.ts",
            target: fakeAdapter(),
        });
        expect(
            isGenerateError(await rejection(runner.run()), "config-export"),
        ).toBe(true);
        expect(runner.dependencies).toEqual([join(root, "pureform.config.ts")]);
        writeTree(root, {
            "pureform.config.ts": config("chip"),
            "parts.ts": parts,
        });
        await runner.run();
        expect(runner.dependencies).toHaveLength(2);
    });
});
