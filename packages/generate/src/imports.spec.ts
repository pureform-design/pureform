import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { tempRoot, writeTree } from "./__fixtures__/project";
import { formatImportViolations, scanConfigImports } from "./imports";

describe("scanConfigImports", () => {
    it("allows pureform packages, type-only imports, and its own data files, and lists them", () => {
        const root = tempRoot();
        writeTree(root, {
            "pureform.config.ts": [
                'import { defineConfig } from "@pureform/core";',
                'import type { Options } from "some-types";',
                'import { type Other } from "other-types";',
                'import { themes } from "./themes";',
                'import tokens from "./data/tokens.json";',
                "const read = () => process.env.LATER;",
                "export default defineConfig({ themes, tokens });",
            ].join("\n"),
            "themes.ts": 'export { teal as themes } from "./teal.js";\n',
            "teal.ts": "export const teal = { color: 1 };\n",
            "data/tokens.json": "{}",
        });
        const { files, violations } = scanConfigImports(
            join(root, "pureform.config.ts"),
        );
        expect(violations).toEqual([]);
        expect(files).toEqual([
            join(root, "pureform.config.ts"),
            join(root, "themes.ts"),
            join(root, "data/tokens.json"),
            join(root, "teal.ts"),
        ]);
    });

    it("finds Node built-ins, other packages, and top-level env reads, in imported files too", () => {
        const root = tempRoot();
        writeTree(root, {
            "pureform.config.ts": [
                'import { readFileSync } from "node:fs";',
                'import "./helper";',
                "export default { seed: process.env.SEED };",
            ].join("\n"),
            "helper.ts": [
                'import path from "path";',
                'import lodash from "lodash-es";',
                'const chroma = require("chroma-js");',
                "export const mode = import.meta.env.MODE;",
            ].join("\n"),
        });
        const { violations } = scanConfigImports(
            join(root, "pureform.config.ts"),
        );
        expect(
            violations.map((v) => [
                v.file.slice(root.length + 1),
                v.line,
                v.rule,
                v.specifier,
            ]),
        ).toEqual([
            ["pureform.config.ts", 1, "builtin", "node:fs"],
            ["pureform.config.ts", 3, "env", undefined],
            ["helper.ts", 1, "builtin", "path"],
            ["helper.ts", 2, "package", "lodash-es"],
            ["helper.ts", 3, "package", "chroma-js"],
            ["helper.ts", 4, "env", undefined],
        ]);
        const message = formatImportViolations(violations, root);
        expect(message).toContain(
            'helper.ts:2:1 imports "lodash-es"; the config may import only pureform packages',
        );
        expect(message).toContain(
            "pureform.config.ts:1:1 imports the Node built-in",
        );
    });

    it("allows packages the options name", () => {
        const root = tempRoot();
        writeTree(root, {
            "pureform.config.ts": [
                'import a from "lodash-es";',
                'import b from "@acme/palette/teal";',
                "export default {};",
            ].join("\n"),
        });
        expect(
            scanConfigImports(join(root, "pureform.config.ts"), {
                allow: ["lodash-es", /^@acme\//],
            }).violations,
        ).toEqual([]);
    });
});
