// React Native's adapter stays off the web's half: `@pureform/binding-dom` needs the DOM, so
// neither the package nor its source may import it.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");

const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return sources(path);
        return /\.tsx?$/.test(entry.name) && !entry.name.includes(".spec.")
            ? [path]
            : [];
    });

const DEPENDENCY_FIELDS = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
] as const;

describe("@pureform/rn-adapter without the DOM", () => {
    it("never imports @pureform/binding-dom", () => {
        const files = sources(join(ROOT, "src"));
        expect(files.length).toBeGreaterThan(10);
        const importing = files.filter((path) =>
            readFileSync(path, "utf8").includes("@pureform/binding-dom"),
        );
        expect(importing).toEqual([]);
    });

    it("doesn't depend on @pureform/binding-dom", () => {
        const packageJson = JSON.parse(
            readFileSync(join(ROOT, "package.json"), "utf8"),
        ) as Partial<Record<string, Record<string, string>>>;
        for (const field of DEPENDENCY_FIELDS) {
            expect(Object.keys(packageJson[field] ?? {})).not.toContain(
                "@pureform/binding-dom",
            );
        }
    });
});
