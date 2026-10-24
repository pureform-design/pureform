// React Native's bindings stay off the web's half: `@pureform/binding-dom` needs the DOM, so
// neither the package nor its source may import it.

import { describe, expect, it } from "vitest";

type Dependencies = Partial<Record<string, Record<string, string>>>;

const [packageJson] = Object.values(
    import.meta.glob<Dependencies>("../package.json", {
        import: "default",
        eager: true,
    }),
);

const SOURCES = import.meta.glob<string>(
    ["./**/*.{ts,tsx}", "!./**/*.spec.*"],
    {
        query: "?raw",
        import: "default",
        eager: true,
    },
);

const DEPENDENCY_FIELDS = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
] as const;

describe("@pureform/react-native without the DOM", () => {
    it("reads its source", () => {
        expect(Object.keys(SOURCES).length).toBeGreaterThan(10);
    });

    it("never imports @pureform/binding-dom", () => {
        const importing = Object.entries(SOURCES)
            .filter(([, source]) => source.includes("@pureform/binding-dom"))
            .map(([path]) => path);
        expect(importing).toEqual([]);
    });

    it("doesn't depend on @pureform/binding-dom", () => {
        expect(packageJson).toBeDefined();
        for (const field of DEPENDENCY_FIELDS) {
            expect(Object.keys(packageJson?.[field] ?? {})).not.toContain(
                "@pureform/binding-dom",
            );
        }
    });
});
