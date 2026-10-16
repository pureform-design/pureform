import { describe, expect, it } from "vitest";

import { compareVersions, isVersion, satisfies } from "./semver";

describe("compareVersions", () => {
    it("orders by major, minor, patch, then prerelease", () => {
        const sorted = [
            "1.0.0",
            "0.10.0",
            "0.4.1",
            "1.0.0-rc.1",
            "1.0.0-alpha",
            "1.0.0-rc.10",
            "0.4.0",
        ].sort(compareVersions);
        expect(sorted).toEqual([
            "0.4.0",
            "0.4.1",
            "0.10.0",
            "1.0.0-alpha",
            "1.0.0-rc.1",
            "1.0.0-rc.10",
            "1.0.0",
        ]);
    });

    it("tells versions from other strings", () => {
        expect(isVersion("0.0.0-semantically-released")).toBe(true);
        expect(isVersion("workspace:^")).toBe(false);
    });
});

describe("satisfies", () => {
    it.each([
        ["0.4.2", "^0.4", true],
        ["0.5.0", "^0.4", false],
        ["0.4.2", "^0.4.3", false],
        ["1.9.0", "^1.2.3", true],
        ["2.0.0-rc.1", "^1.2.3", false],
        ["0.0.4", "^0.0.3", false],
        ["1.2.9", "~1.2.3", true],
        ["1.3.0", "~1.2.3", false],
        ["1.4.0", "1.x", true],
        ["2.0.0", "1", false],
        ["1.5.0", ">=1.2 <2", true],
        ["2.0.0", ">=1.2 <2", false],
        ["1.3.0", ">1.2", true],
        ["1.2.5", ">1.2", false],
        ["1.2.5", "<=1.2", true],
        ["3.0.0", "^1 || ^3", true],
        ["1.5.0", "1.0.0 - 2.0.0", true],
        ["2.0.1", "1.0.0 - 2.0.0", false],
        ["4.0.0", "*", true],
        ["2.0.0-rc.15", "2.0.0-rc.15", true],
        ["0.4.0", ">= 0.4.0", true],
    ])("%s in %s: %s", (version, range, expected) => {
        expect(satisfies(version, range)).toBe(expected);
    });

    it("can't tell for ranges that aren't semver", () => {
        expect(satisfies("0.4.0", "workspace:^")).toBeUndefined();
        expect(satisfies("0.4.0", "catalog:")).toBeUndefined();
        expect(satisfies("next", "^1")).toBeUndefined();
    });
});
