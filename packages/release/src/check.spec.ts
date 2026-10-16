import { describe, expect, test } from "vitest";

import { checkRelease, type WorkspacePackage } from "./check";
import { CORE_TRAIN, type CogPackage } from "./cog";

const train = (...paths: string[]): CogPackage => ({
    name: CORE_TRAIN,
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
            train("packages/core", "packages/theme"),
            own("@scope/solid", "packages/solid"),
        ];
        expect(checkRelease(cog, WORKSPACE)).toEqual([]);
    });

    test("needs a train", () => {
        expect(checkRelease([], WORKSPACE)).toEqual([
            "cog.toml has no core-train package",
        ]);
    });

    test("finds a package in no group", () => {
        const cog = [
            train("packages/core"),
            own("@scope/solid", "packages/solid"),
        ];
        expect(checkRelease(cog, WORKSPACE)).toEqual([
            "@scope/theme (packages/theme) is in no release group; add it to the core-train or give it a cog.toml package",
        ]);
    });

    test("finds a package in both groups", () => {
        const cog = [
            train("packages/core", "packages/theme"),
            own("@scope/theme", "packages/theme"),
            own("@scope/solid", "packages/solid"),
        ];
        expect(checkRelease(cog, WORKSPACE)).toEqual([
            "@scope/theme is in the core-train and has its own cog.toml package; keep one",
        ]);
    });

    test("finds entries that name no package, or the wrong one", () => {
        const cog = [
            {
                ...train("packages/core", "packages/theme"),
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
            "core-train includes packages/gone, which isn't a workspace package",
            'core-train includes "packages/*.ts"; use "<package dir>/**"',
            'cog.toml package @scope/react has path "packages/react", which isn\'t a workspace package',
            "cog.toml package @scope/renamed is named @scope/demo in apps/demo/package.json",
        ]);
    });

    test("finds train packages whose versions differ", () => {
        const cog = [
            train("packages/core", "packages/theme"),
            own("@scope/solid", "packages/solid"),
        ];
        const workspace = [
            ...WORKSPACE.slice(1),
            pkg("packages/core", "@scope/core", "0.2.0"),
        ];
        expect(checkRelease(cog, workspace)).toEqual([
            "the core-train's packages differ in version: 0.2.0 (@scope/core); 0.1.0 (@scope/theme)",
        ]);
    });
});
