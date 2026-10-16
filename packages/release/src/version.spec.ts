import { describe, expect, test } from "vitest";

import { setLockVersion, setManifestVersion } from "./version";

describe("setManifestVersion", () => {
    test("replaces the top-level version and keeps the formatting", () => {
        const manifest =
            '{\n    "name": "@scope/a",\n    "version": "0.1.0",\n    "private": true\n}\n';
        expect(setManifestVersion(manifest, "0.2.0")).toBe(
            '{\n    "name": "@scope/a",\n    "version": "0.2.0",\n    "private": true\n}\n',
        );
    });

    test("refuses when a nested version comes first", () => {
        const manifest =
            '{\n    "engines": {\n        "version": "1"\n    },\n    "version": "0.1.0"\n}\n';
        expect(() => setManifestVersion(manifest, "0.2.0")).toThrow(
            "isn't the top-level one",
        );
    });

    test("fails without a version", () => {
        expect(() => setManifestVersion('{ "name": "a" }', "0.2.0")).toThrow(
            "no version",
        );
    });
});

describe("setLockVersion", () => {
    const lock = `{
  "workspaces": {
    "": {
      "name": "@scope/root",
    },
    "packages/core": {
      "name": "@scope/core",
      "version": "0.1.0",
    },
    "packages/core-extra": {
      "name": "@scope/core-extra",
      "version": "0.1.0",
    },
  },
}`;

    test("replaces only the named workspace's version", () => {
        const updated = setLockVersion(lock, "packages/core", "0.2.0");
        expect(updated).toContain(
            '"name": "@scope/core",\n      "version": "0.2.0"',
        );
        expect(updated).toContain(
            '"name": "@scope/core-extra",\n      "version": "0.1.0"',
        );
    });

    test("leaves a workspace without a version alone", () => {
        expect(setLockVersion(lock, "", "0.2.0")).toBe(lock);
        expect(setLockVersion(lock, "packages/missing", "0.2.0")).toBe(lock);
    });
});
