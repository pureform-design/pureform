import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { tempRoot, writeTree } from "./__fixtures__/project";
import { loadConfig } from "./config";
import { isGenerateError } from "./errors";

const fixtures = fileURLToPath(new URL("./__fixtures__", import.meta.url));

const rejection = async (promise: Promise<unknown>) => {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    throw new Error("expected a rejection");
};

describe("loadConfig", () => {
    it("loads a TypeScript config importing pureform packages", async () => {
        const loaded = await loadConfig("pureform.config.ts", {
            root: fixtures,
        });
        expect(Object.keys(loaded.config.components)).toEqual(["divider"]);
        expect(loaded.file).toBe(join(fixtures, "pureform.config.ts"));
        expect(loaded.dependencies).toEqual([
            join(fixtures, "pureform.config.ts"),
            join(fixtures, "divider.ts"),
        ]);
    });

    it("loads fresh each time, so edits show", async () => {
        const root = tempRoot();
        const write = (name: string) =>
            writeTree(root, {
                "pureform.config.ts": `import { components } from "./components";\nexport default { tokens: {}, semanticTokens: {}, components };\n`,
                "components.ts": `export const components = { ${name}: { kind: "component", name: "${name}", recipe: { base: {} } } };\n`,
            });
        write("first");
        const first = await loadConfig(join(root, "pureform.config.ts"));
        expect(Object.keys(first.config.components)).toEqual(["first"]);
        write("second");
        const second = await loadConfig(join(root, "pureform.config.ts"));
        expect(Object.keys(second.config.components)).toEqual(["second"]);
    });

    it("fails on a missing file", async () => {
        const error = await rejection(
            loadConfig("pureform.config.ts", { root: tempRoot() }),
        );
        expect(isGenerateError(error, "config-not-found")).toBe(true);
        expect((error as Error).message).toContain("no config at");
    });

    it("fails on a config that breaks the import rules, unless the check is off", async () => {
        const root = tempRoot();
        writeTree(root, {
            "pureform.config.ts": `import { join } from "node:path";\nexport default { tokens: {}, semanticTokens: {}, components: {}, at: join("a", "b") };\n`,
        });
        const error = await rejection(
            loadConfig("pureform.config.ts", { root }),
        );
        expect(isGenerateError(error, "config-imports")).toBe(true);
        expect((error as Error).message).toContain(
            'pureform.config.ts:1:1 imports the Node built-in "node:path"',
        );
        const loaded = await loadConfig("pureform.config.ts", {
            root,
            imports: false,
        });
        expect(loaded.config.components).toEqual({});
    });

    it("fails on a default export that isn't a config", async () => {
        const root = tempRoot();
        writeTree(root, {
            "pureform.config.ts": "export const config = {};\n",
        });
        const error = await rejection(
            loadConfig("pureform.config.ts", { root }),
        );
        expect(isGenerateError(error, "config-export")).toBe(true);
        expect((error as Error).message).toContain("exported nothing");
    });

    it("wraps an error thrown while loading", async () => {
        const root = tempRoot();
        writeTree(root, {
            "pureform.config.ts": 'throw new Error("broken config");\n',
        });
        const error = await rejection(
            loadConfig("pureform.config.ts", { root }),
        );
        expect(isGenerateError(error, "config-load")).toBe(true);
        expect((error as Error).message).toContain("broken config");
    });
});
