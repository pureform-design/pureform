/// <reference types="vite/client" />

// The design docs quote how many components and compound variants the preset has. This keeps
// those numbers equal to the code's, each counted by the rule written next to it in the doc.

import { describe, expect, it } from "vitest";

import { pureform } from "./pureform";

const DOCS = import.meta.glob<string>("../../../docs/design/*.md", {
    query: "?raw",
    import: "default",
    eager: true,
});

const doc = (name: string): string => {
    const text = DOCS[`../../../docs/design/${name}`];
    if (text === undefined) throw new Error(`no doc ${name}`);
    return text;
};

const quoted = (text: string, pattern: RegExp): number => {
    const match = pattern.exec(text);
    if (!match?.[1]) throw new Error(`no count matching ${pattern}`);
    return Number(match[1]);
};

describe("the design docs' counts", () => {
    const components = Object.values(pureform().components ?? {});

    it("gap analysis §1.8: every entry of pureform().components", () => {
        expect(
            quoted(
                doc("component-gap-analysis.md"),
                /\| Our preset components\s*\|\s*(\d+), every entry of `pureform\(\)\.components`/,
            ),
        ).toBe(components.length);
    });

    it("component-architecture §5.5: every compoundVariants entry in pureform()", () => {
        const compounds = components.reduce(
            (total, component) =>
                total +
                ((
                    component as {
                        recipe?: { compoundVariants?: readonly unknown[] };
                    }
                ).recipe?.compoundVariants?.length ?? 0),
            0,
        );
        expect(
            quoted(
                doc("component-architecture.md"),
                /(\d+) across the preset, counting every\s+`compoundVariants` entry/,
            ),
        ).toBe(compounds);
    });
});
