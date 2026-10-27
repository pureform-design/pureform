import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { CORE_PACKAGE } from "./cog";
import {
    checkRepository,
    findRoot,
    readCog,
    readWorkspace,
    releasePaths,
    setVersion,
} from "./workspace";

const COG = `
[monorepo.packages.core]
path = "."
include = [
    "packages/core/**",
    "packages/theme/**",
]

[monorepo.packages."@scope/solid"]
path = "packages/solid"
include = ["packages/solid/**"]
`;

function manifest(name: string): string {
    return `{\n    "name": "${name}",\n    "version": "0.1.0"\n}\n`;
}

function lockEntry(path: string, name: string): string {
    return `    "${path}": {\n      "name": "${name}",\n      "version": "0.1.0",\n    },\n`;
}

function fixture(): string {
    const root = mkdtempSync(join(tmpdir(), "pureform-release-"));
    const packages = [
        ["packages/core", "@scope/core"],
        ["packages/theme", "@scope/theme"],
        ["packages/solid", "@scope/solid"],
        ["apps/demo", "@scope/demo"],
    ] as const;
    writeFileSync(join(root, "cog.toml"), COG);
    writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
            name: "@scope/root",
            workspaces: ["packages/*", "apps/*", "tests/*"],
        }),
    );
    let lock = '{\n  "workspaces": {\n';
    for (const [path, name] of packages) {
        mkdirSync(join(root, path), { recursive: true });
        writeFileSync(join(root, path, "package.json"), manifest(name));
        lock += lockEntry(path, name);
    }
    writeFileSync(join(root, "bun.lock"), `${lock}  },\n}\n`);
    mkdirSync(join(root, "packages/core/src"));
    writeFileSync(
        join(root, "packages/core/src/package-version.ts"),
        'export const VERSION = "0.1.0";\n',
    );
    return root;
}

const read = (root: string, file: string) =>
    readFileSync(join(root, file), "utf8");
const versionOf = (root: string, path: string) =>
    (JSON.parse(read(root, `${path}/package.json`)) as { version: string })
        .version;

describe("setVersion", () => {
    test("sets every core package and its lockfile entries together", () => {
        const root = fixture();
        expect(setVersion(root, CORE_PACKAGE, "0.2.0")).toEqual([
            "packages/core/package.json",
            "packages/core/src/package-version.ts",
            "packages/theme/package.json",
            "bun.lock",
        ]);
        expect(versionOf(root, "packages/core")).toBe("0.2.0");
        expect(read(root, "packages/core/src/package-version.ts")).toBe(
            'export const VERSION = "0.2.0";\n',
        );
        expect(versionOf(root, "packages/theme")).toBe("0.2.0");
        expect(versionOf(root, "packages/solid")).toBe("0.1.0");
        expect(read(root, "bun.lock")).toContain(
            '"name": "@scope/theme",\n      "version": "0.2.0"',
        );
        expect(read(root, "bun.lock")).toContain(
            '"name": "@scope/solid",\n      "version": "0.1.0"',
        );
    });

    test("sets a binding alone", () => {
        const root = fixture();
        expect(setVersion(root, "@scope/solid", "0.4.0")).toEqual([
            "packages/solid/package.json",
            "bun.lock",
        ]);
        expect(versionOf(root, "packages/solid")).toBe("0.4.0");
        expect(versionOf(root, "packages/core")).toBe("0.1.0");
    });

    test("writes nothing in a dry run", () => {
        const root = fixture();
        expect(
            setVersion(root, CORE_PACKAGE, "0.2.0", { dryRun: true }),
        ).toHaveLength(4);
        expect(versionOf(root, "packages/core")).toBe("0.1.0");
        expect(read(root, "bun.lock")).not.toContain("0.2.0");
    });

    test("fails for a package cog.toml doesn't know", () => {
        expect(() => setVersion(fixture(), "@scope/demo", "0.2.0")).toThrow(
            "no package @scope/demo",
        );
    });
});

describe("readWorkspace", () => {
    test("reads each package's src/package-version.ts when it has one", () => {
        const packages = readWorkspace(fixture());
        expect(
            packages.find((entry) => entry.path === "packages/core"),
        ).toEqual({
            path: "packages/core",
            name: "@scope/core",
            version: "0.1.0",
            sourceVersion: "0.1.0",
        });
        expect(
            packages.find((entry) => entry.path === "packages/theme"),
        ).not.toHaveProperty("sourceVersion");
    });
});

describe("findRoot", () => {
    test("walks up to the directory holding cog.toml", () => {
        const root = fixture();
        expect(findRoot(join(root, "packages/core"))).toBe(root);
    });
});

describe("this repository", () => {
    const root = findRoot(fileURLToPath(new URL(".", import.meta.url)));

    test("cog.toml and the workspace agree", () => {
        expect(checkRepository(root)).toEqual([]);
    });

    test("the core holds the packages the design lists", () => {
        const names = new Map(
            readWorkspace(root).map((entry) => [entry.path, entry.name]),
        );
        const core = releasePaths(readCog(root), CORE_PACKAGE).map((path) =>
            names.get(path),
        );
        expect(core).toEqual(
            expect.arrayContaining([
                "@pureform/core",
                "@pureform/web-contracts",
                "@pureform/theme",
                "@pureform/material",
                "@pureform/preset",
                "@pureform/css-lowering",
                "@pureform/css-adapter",
                "@pureform/panda-adapter",
                "@pureform/tailwind-adapter",
                "@pureform/rn-adapter",
                "@pureform/js-effects",
                "@pureform/utils",
                "@pureform/type-utils",
                "@pureform/styling",
                "@pureform/styling-web",
                "@pureform/anatomy",
                "@pureform/machines",
                "@pureform/binding-core",
                "@pureform/generate",
            ]),
        );
    });

    test("bindings keep their own versions", () => {
        const names = new Set(readCog(root).map((entry) => entry.name));
        expect(names).toContain("@pureform/solid");
        const core = releasePaths(readCog(root), CORE_PACKAGE);
        expect(core).not.toContain("packages/solid");
    });
});
