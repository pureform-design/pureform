import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "@typescript/typescript6";
import { describe, expect, it } from "vitest";

import { argTypeFor, propControls, propsTypeOf } from "./prop-controls.ts";

const FIXTURES = join(
    dirname(fileURLToPath(import.meta.url)),
    "__fixtures__/prop-controls",
);

const controls = () => {
    const entry = join(FIXTURES, "component.ts");
    const program = ts.createProgram([entry], {
        noEmit: true,
        strict: true,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ESNext,
    });
    const checker = program.getTypeChecker();
    const module = checker.getSymbolAtLocation(program.getSourceFile(entry)!)!;
    const fixture = checker
        .getExportsOfModule(module)
        .find((s) => s.name === "Fixture")!;
    const props = propsTypeOf(checker, fixture)!;
    return new Map(
        propControls(checker, props, (file) =>
            file.includes("/binding-core/"),
        ).map((p) => [p.name, p]),
    );
};

describe("prop controls", () => {
    const byName = controls();

    it("keeps only props declared in binding-core", () => {
        for (const name of ["title", "hidden", "as", "children"]) {
            expect(byName.has(name), name).toBe(false);
        }
    });

    it("keeps a mapped type's props, declared in binding-core", () => {
        expect(byName.get("selected")).toMatchObject({ control: "boolean" });
    });

    it("gives a string-literal union a select of its values", () => {
        expect(byName.get("size")).toMatchObject({
            control: "select",
            options: ["small", "large"],
        });
    });

    it("gives boolean, string and number their controls", () => {
        expect(byName.get("disabled")?.control).toBe("boolean");
        expect(byName.get("placeholder")?.control).toBe("text");
        expect(byName.get("max")?.control).toBe("number");
    });

    it("gives functions, nodes, objects, arrays and mixed unions none", () => {
        for (const name of ["onChange", "label", "ids", "items", "mixed"]) {
            expect(byName.get(name)?.control, name).toBe("none");
        }
    });

    it("reads a VariantProp's group from the alias, through indexed accesses", () => {
        expect(byName.get("textStyle")?.variant).toBe("style");
        expect(byName.get("tone")?.variant).toBe("tone");
        expect(byName.get("color")?.variant).toBe("tone");
        expect(byName.get("size")?.variant).toBeUndefined();
    });

    it("lets a @control tag override the type", () => {
        expect(byName.get("id")).toMatchObject({
            control: "none",
            tagged: true,
        });
        expect(byName.get("locale")).toMatchObject({
            control: "text",
            tagged: true,
        });
        expect(byName.get("placeholder")?.tagged).toBeUndefined();
    });
});

describe("arg types", () => {
    const variants = { style: ["body", "title"], scrolled: ["false", "true"] };

    it("takes a variant prop's values from the anatomy's group", () => {
        expect(
            argTypeFor(
                { name: "textStyle", control: "none", variant: "style" },
                variants,
            ),
        ).toEqual({ control: "select", options: ["body", "title"] });
        expect(
            argTypeFor(
                { name: "scrolled", control: "none", variant: "scrolled" },
                variants,
            ),
        ).toEqual({ control: "boolean" });
    });

    it("follows the type, or a tag over the anatomy", () => {
        expect(
            argTypeFor(
                { name: "size", control: "select", options: ["s", "l"] },
                variants,
            ),
        ).toEqual({ control: "select", options: ["s", "l"] });
        expect(
            argTypeFor(
                {
                    name: "textStyle",
                    control: "none",
                    variant: "style",
                    tagged: true,
                },
                variants,
            ),
        ).toEqual({ control: false });
        expect(
            argTypeFor({ name: "label", control: "text" }, variants),
        ).toEqual({
            control: "text",
        });
    });
});
