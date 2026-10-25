import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { codegenSource, tempApp, writeTree } from "./__fixtures__/app";
import {
    findCodegenFile,
    loadCodegenOptions,
    resolveCodegenOptions,
} from "./codegen-file";

describe("findCodegenFile", () => {
    it("finds the first codegen file in the root", () => {
        const root = tempApp(["chip"], false);
        expect(findCodegenFile(root)).toBeUndefined();
        writeTree(root, { "pureform.codegen.mjs": codegenSource() });
        expect(findCodegenFile(root)).toBe(join(root, "pureform.codegen.mjs"));
        writeTree(root, { "pureform.codegen.ts": codegenSource() });
        expect(findCodegenFile(root)).toBe(join(root, "pureform.codegen.ts"));
    });
});

describe("loadCodegenOptions", () => {
    it("reads the codegen export, or the default export", async () => {
        const root = tempApp(["chip"], false);
        writeTree(root, {
            "named.ts": codegenSource({ components: ["chip"] }),
            "default.ts": codegenSource({ lazy: ["chip"] }, "default"),
        });
        expect(await loadCodegenOptions(join(root, "named.ts"))).toMatchObject({
            components: ["chip"],
            target: { name: "fake" },
        });
        expect(
            await loadCodegenOptions(join(root, "default.ts")),
        ).toMatchObject({
            lazy: ["chip"],
        });
    });

    it("explains a file that doesn't load or export the options", async () => {
        const root = tempApp(["chip"], false);
        writeTree(root, {
            "broken.ts": "export const codegen = {",
            "empty.ts": "",
        });
        await expect(
            loadCodegenOptions(join(root, "broken.ts")),
        ).rejects.toThrow(
            /^pureform: loading the codegen options at .*broken\.ts failed/,
        );
        await expect(
            loadCodegenOptions(join(root, "empty.ts")),
        ).rejects.toThrow("should export the generate options as `codegen`");
    });
});

describe("resolveCodegenOptions", () => {
    it("settles the codegen file's options with the defaults", async () => {
        const root = tempApp(["chip"], { options: { prefix: "x-" } });
        const { options, file } = await resolveCodegenOptions({}, root);
        expect(file).toBe(join(root, "pureform.codegen.ts"));
        expect(options).toMatchObject({
            config: "pureform.config.ts",
            root,
            options: { prefix: "x-" },
            target: { name: "fake" },
        });
        expect(options).not.toHaveProperty("check");
        expect(options).not.toHaveProperty("components");
    });

    it("takes the flags over the codegen file", async () => {
        const root = tempApp(["chip"], {
            options: { prefix: "x-", size: 1 },
            components: ["chip"],
            versionCheck: true,
        });
        const { options } = await resolveCodegenOptions(
            {
                target: "css",
                options: '{"prefix":"y-"}',
                components: "a, b,",
                lazy: "b",
                outDir: "out",
                config: "other.config.ts",
                versionCheck: false,
                check: true,
            },
            root,
        );
        expect(options).toEqual({
            config: "other.config.ts",
            target: "css",
            root,
            options: { prefix: "y-", size: 1 },
            components: ["a", "b"],
            lazy: ["b"],
            outDir: "out",
            versionCheck: false,
            check: true,
        });
    });

    it("finds the codegen file and config in --root, and resolves the codegen file's root against its folder", async () => {
        const root = tempApp(["chip"], false);
        mkdirSync(join(root, "app"));
        writeFileSync(
            join(root, "app/pureform.codegen.ts"),
            codegenSource({ root: ".." }),
        );
        writeFileSync(
            join(root, "app/pureform.config.mjs"),
            "export default {}",
        );

        const fromRoot = await resolveCodegenOptions({ root: "app" }, root);
        expect(fromRoot.options.root).toBe(join(root, "app"));
        expect(fromRoot.options.config).toBe("pureform.config.mjs");

        const fromFile = await resolveCodegenOptions(
            { codegen: "app/pureform.codegen.ts" },
            root,
        );
        expect(fromFile.options.root).toBe(root);
        expect(fromFile.options.config).toBe("pureform.config.ts");
    });

    it("explains a missing target, a missing codegen file, and bad --options", async () => {
        const root = tempApp(["chip"], false);
        await expect(resolveCodegenOptions({}, root)).rejects.toThrow(
            /^pureform: no target to generate for\. Pass --target \(panda, css, tailwind, native\)/,
        );
        await expect(
            resolveCodegenOptions({ codegen: "nope.ts" }, root),
        ).rejects.toThrow(
            `pureform: no codegen options at ${join(root, "nope.ts")}.`,
        );
        await expect(
            resolveCodegenOptions({ target: "panda", options: "{" }, root),
        ).rejects.toThrow(/^pureform: --options isn't valid JSON/);
        await expect(
            resolveCodegenOptions({ target: "panda", options: "[1]" }, root),
        ).rejects.toThrow("pureform: --options should be a JSON object");
    });
});
