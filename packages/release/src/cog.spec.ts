import { describe, expect, test } from "vitest";

import { CORE_PACKAGE, parseCogPackages, corePackagesPaths } from "./cog";

const COG = `
from_latest_tag = false
pre_package_bump_hooks = [
    "bun cli.ts set-version {{package}} {{version}}",
]

[changelog]
path = "CHANGELOG.md"

# The core packages.
[monorepo.packages.core]
path = "."
changelog_path = "CHANGELOG.md"
include = [
    "packages/core/**", # the AST
    "packages/theme/**",
    # @anchor:new-core-package
]

[monorepo.packages."@scope/solid"]
path = "packages/solid"
include = ["packages/solid/**"]
`;

describe("parseCogPackages", () => {
    test("reads each package's name, path, and include globs", () => {
        expect(parseCogPackages(COG)).toEqual([
            {
                name: CORE_PACKAGE,
                path: ".",
                include: ["packages/core/**", "packages/theme/**"],
            },
            {
                name: "@scope/solid",
                path: "packages/solid",
                include: ["packages/solid/**"],
            },
        ]);
    });

    test("ignores sections other than monorepo packages", () => {
        expect(parseCogPackages('[changelog]\npath = "x"\n')).toEqual([]);
    });
});

describe("corePackagesPaths", () => {
    test("turns the core's globs into package directories", () => {
        expect(corePackagesPaths(parseCogPackages(COG))).toEqual([
            "packages/core",
            "packages/theme",
        ]);
    });

    test("rejects a glob that isn't a whole package directory", () => {
        const packages = [
            {
                name: CORE_PACKAGE,
                path: ".",
                include: ["packages/core/src/*.ts"],
            },
        ];
        expect(() => corePackagesPaths(packages)).toThrow(
            'use "<package dir>/**"',
        );
    });

    test("fails without a core package", () => {
        expect(() => corePackagesPaths([])).toThrow("no core package");
    });
});
