import { describe, expect, test } from "vitest";

import { checkRelease, type WorkspacePackage } from "./check";
import { CORE_PACKAGE, type CogPackage } from "./cog";

const corePackage = (...paths: string[]): CogPackage => ({
    name: CORE_PACKAGE,
    path: ".",
    include: paths.map((path) => `${path}/**`),
});
const own = (name: string, path: string): CogPackage => ({
    name,
    path,
    include: [`${path}/**`],
});
const pkg = (
    path: string,
    name: string,
    version = "0.1.0",
): WorkspacePackage => ({
    path,
    name,
    version,
});

const WORKSPACE = [
    pkg("packages/core", "@scope/core"),
    pkg("packages/theme", "@scope/theme"),
    pkg("packages/solid", "@scope/solid", "0.3.0"),
    pkg("apps/demo", "@scope/demo"),
];

describe("checkRelease", () => {
    test("passes when every package is in one group", () => {
        const cog = [
            corePackage("packages/core", "packages/theme"),
            own("@scope/solid", "packages/solid"),
        ];
        expect(checkRelease(cog, WORKSPACE)).toEqual([]);
    });

    test("needs a core package", () => {
        expect(checkRelease([], WORKSPACE)).toEqual([
            "cog.toml has no core package",
        ]);
    });

    test("finds a package in no group", () => {
        const cog = [
            corePackage("packages/core"),
            own("@scope/solid", "packages/solid"),
        ];
        expect(checkRelease(cog, WORKSPACE)).toEqual([
            "@scope/theme (packages/theme) is in no release group; add it to the core or give it a cog.toml package",
        ]);
    });

    test("finds a package in both groups", () => {
        const cog = [
            corePackage("packages/core", "packages/theme"),
            own("@scope/theme", "packages/theme"),
            own("@scope/solid", "packages/solid"),
        ];
        expect(checkRelease(cog, WORKSPACE)).toEqual([
            "@scope/theme is in the core and has its own cog.toml package; keep one",
        ]);
    });

    test("finds entries that name no package, or the wrong one", () => {
        const cog = [
            {
                ...corePackage("packages/core", "packages/theme"),
                include: [
                    "packages/core/**",
                    "packages/theme/**",
                    "packages/gone/**",
                    "packages/*.ts",
                ],
            },
            own("@scope/solid", "packages/solid"),
            own("@scope/react", "packages/react"),
            own("@scope/renamed", "apps/demo"),
        ];
        expect(checkRelease(cog, WORKSPACE)).toEqual([
            "core includes packages/gone, which isn't a workspace package",
            'core includes "packages/*.ts"; use "<package dir>/**"',
            'cog.toml package @scope/react has path "packages/react", which isn\'t a workspace package',
            "cog.toml package @scope/renamed is named @scope/demo in apps/demo/package.json",
        ]);
    });

    test("finds core packages whose versions differ", () => {
        const cog = [
            corePackage("packages/core", "packages/theme"),
            own("@scope/solid", "packages/solid"),
        ];
        const workspace = [
            ...WORKSPACE.slice(1),
            pkg("packages/core", "@scope/core", "0.2.0"),
        ];
        expect(checkRelease(cog, workspace)).toEqual([
            "the core's packages differ in version: 0.2.0 (@scope/core); 0.1.0 (@scope/theme)",
        ]);
    });

    test("finds a src/package-version.ts that differs from package.json", () => {
        const cog = [
            corePackage("packages/core", "packages/theme"),
            own("@scope/solid", "packages/solid"),
        ];
        const workspace = [
            ...WORKSPACE.slice(1),
            { ...pkg("packages/core", "@scope/core"), sourceVersion: "0.0.9" },
        ];
        expect(checkRelease(cog, workspace)).toEqual([
            "@scope/core's src/package-version.ts says 0.0.9, and its package.json 0.1.0",
        ]);
    });
});
