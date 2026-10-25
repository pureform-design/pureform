import { fileURLToPath } from "node:url";

import {
    CORE_PACKAGE,
    findRoot,
    readCog,
    readWorkspace,
    releasePaths,
} from "@pureform/release";
import { describe, expect, it } from "vitest";

import { installed, tempRoot, writeTree } from "./__fixtures__/project";
import {
    BINDING_PACKAGES,
    checkVersions,
    CORE_PACKAGES,
    findInstalled,
} from "./version-check";
import type { InstalledPackage } from "./version-check";

const pkg = (
    name: string,
    version: string,
    peerDependencies?: Record<string, string>,
): InstalledPackage => ({
    name,
    version,
    dir: `/app/node_modules/${name}`,
    ...(peerDependencies ? { peerDependencies } : {}),
});

describe("CORE_TRAIN_PACKAGES", () => {
    it("lists the packages in cog.toml's core train", () => {
        const root = findRoot(fileURLToPath(new URL(".", import.meta.url)));
        const names = new Map(
            readWorkspace(root).map((entry) => [entry.path, entry.name]),
        );
        const train = releasePaths(readCog(root), CORE_PACKAGE)
            .map((path) => names.get(path))
            .sort();
        expect([...CORE_PACKAGES]).toEqual(train);
    });

    it("leaves the bindings out", () => {
        for (const binding of BINDING_PACKAGES) {
            expect(CORE_PACKAGES).not.toContain(binding);
        }
    });
});

describe("findInstalled", () => {
    it("finds the nearest install of each package, from the root up", () => {
        const root = tempRoot();
        writeTree(root, {
            ...installed("@pureform/core", "0.4.0"),
            ...installed("@pureform/styling", "0.4.0"),
            ...Object.fromEntries(
                Object.entries(installed("@pureform/styling", "0.3.0")).map(
                    ([path, json]) => [`app/${path}`, json],
                ),
            ),
            ...installed("@pureform/solid", "0.2.0", {
                peerDependencies: { "@pureform/styling": "^0.4" },
            }),
            "app/package.json": { name: "app" },
        });
        const found = findInstalled(`${root}/app`);
        expect(found.map((entry) => [entry.name, entry.version])).toEqual([
            ["@pureform/core", "0.4.0"],
            ["@pureform/styling", "0.3.0"],
            ["@pureform/solid", "0.2.0"],
        ]);
        expect(found[2]?.peerDependencies).toEqual({
            "@pureform/styling": "^0.4",
        });
    });
});

describe("checkTrain", () => {
    it("passes one version, and bindings whose ranges include it", () => {
        const check = checkVersions([
            pkg("@pureform/core", "0.4.1"),
            pkg("@pureform/styling", "0.4.1"),
            pkg("@pureform/solid", "0.2.0", {
                "@pureform/styling": "^0.4",
                "solid-js": "2.0.0-rc.15",
            }),
        ]);
        expect(check).toEqual({
            version: "0.4.1",
            problems: [],
            message: undefined,
        });
    });

    it("passes nothing installed, and ranges that aren't semver", () => {
        expect(checkVersions([]).version).toBeUndefined();
        expect(
            checkVersions([
                pkg("@pureform/styling", "0.0.0-semantically-released"),
                pkg("@pureform/solid", "0.0.0-semantically-released", {
                    "@pureform/styling": "workspace:^",
                }),
            ]).problems,
        ).toEqual([]);
    });

    it("names the train packages behind the newest, and the version to install", () => {
        const check = checkVersions([
            pkg("@pureform/core", "0.3.2"),
            pkg("@pureform/styling", "0.4.1"),
            pkg("@pureform/preset", "0.4.0"),
        ]);
        expect(check.version).toBe("0.4.1");
        expect(check.problems).toEqual([
            {
                kind: "version",
                name: "@pureform/core",
                version: "0.3.2",
                expected: "0.4.1",
            },
            {
                kind: "version",
                name: "@pureform/preset",
                version: "0.4.0",
                expected: "0.4.1",
            },
        ]);
        expect(check.message).toBe(
            [
                "pureform: the installed pureform packages don't match the core train, 0.4.1.",
                "Core-train packages share one version, and these differ:",
                "  @pureform/core 0.3.2",
                "  @pureform/preset 0.4.0",
                "Install them at 0.4.1:",
                "  @pureform/core@0.4.1 @pureform/preset@0.4.1",
            ].join("\n"),
        );
    });

    it("names a binding whose peer range excludes the train", () => {
        const check = checkVersions([
            pkg("@pureform/styling", "0.5.0"),
            pkg("@pureform/react", "0.2.3", { "@pureform/styling": "^0.4" }),
        ]);
        expect(check.problems).toEqual([
            {
                kind: "peer",
                name: "@pureform/react",
                version: "0.2.3",
                peer: "@pureform/styling",
                range: "^0.4",
                installed: "0.5.0",
            },
        ]);
        expect(check.message).toContain(
            "@pureform/react 0.2.3 works with @pureform/styling ^0.4, not 0.5.0.",
        );
        expect(check.message).toContain(
            "Install a @pureform/react release made for core-train 0.5.0 (@pureform/react@latest), or install the core train at a version in ^0.4.",
        );
    });
});
