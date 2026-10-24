import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ScriptTarget } from "typescript/ast";
import { API, ModuleKind, ModuleResolutionKind } from "typescript/sync";
import { describe, expect, it } from "vitest";

import {
    argTypeFor,
    controlFor,
    propControls,
    propsTypeOf,
    variantOrder,
} from "./prop-controls.ts";

const FIXTURES = join(
    dirname(fileURLToPath(import.meta.url)),
    "__fixtures__/prop-controls",
);

const controls = () => {
    const entry = join(FIXTURES, "component.ts");
    const api = new API({ cwd: FIXTURES });
    try {
        const program = api.createProgram([entry], {
            noEmit: true,
            strict: true,
            module: ModuleKind.ESNext,
            moduleResolution: ModuleResolutionKind.Bundler,
            target: ScriptTarget.ESNext,
        });
        const checker = program.getProject().checker;
        const module = checker.getSymbolOfSourceFile(entry)!;
        const fixture = checker
            .getExportsOfModule(module)
            .find((s) => s.name === "Fixture")!;
        const props = propsTypeOf(checker, fixture)!;
        const registry = variantOrder([
            program.getSourceFile(join(FIXTURES, "binding-core/props.ts")),
        ]);
        return new Map(
            propControls(
                checker,
                props,
                (file) => file.includes("/binding-core/"),
                registry,
            ).map((p) => [p.name, p]),
        );
    } finally {
        api.close();
    }
};

describe("prop controls", () => {
    const byName = controls();

    it("keeps only props declared in binding-core", () => {
        for (const name of ["title", "hidden", "as", "children"]) {
            expect(byName.has(name), name).toBe(false);
        }
    });

    it("lists props in declaration order: bases as written, then the type's own", () => {
        expect([...byName.keys()]).toEqual([
            "textStyle",
            "tone",
            "density",
            "selected",
            "defaultSelected",
            "size",
            "disabled",
            "placeholder",
            "max",
            "onChange",
            "label",
            "ids",
            "items",
            "mixed",
            "count",
            "scale",
            "wide",
            "pair",
            "computed",
            "flag",
            "loose",
            "tricky",
            "color",
            "id",
            "locale",
        ]);
    });

    it("lists a plain literal union's options as written", () => {
        expect(byName.get("scale")?.options).toEqual(["xs", "s", "m", "l"]);
        expect(byName.get("wide")?.options).toEqual(["a", "b", "c", "d"]);
    });

    it("lists a variant group's options in the registry's (the config's) order", () => {
        expect(byName.get("density")).toMatchObject({
            control: "select",
            variant: "density",
            options: ["inherit", "comfortable", "default", "compact", "dense"],
        });
    });

    it("sorts the options of a computed type by code point", () => {
        expect(byName.get("computed")?.options).toEqual(["a", "b", "c"]);
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

    it("reads the @control radio and select tags", () => {
        expect(byName.get("scale")).toMatchObject({
            control: "select",
            options: ["xs", "s", "m", "l"],
        });
        expect(byName.get("wide")).toMatchObject({
            control: "radio",
            tagged: true,
        });
        expect(byName.get("pair")).toMatchObject({
            control: "select",
            tagged: true,
        });
    });

    it("gives boolean, string and number their controls", () => {
        expect(byName.get("disabled")?.control).toBe("boolean");
        expect(byName.get("placeholder")?.control).toBe("text");
        expect(byName.get("max")?.control).toBe("number");
    });

    it("gives functions, nodes, objects, arrays and mixed unions none", () => {
        for (const name of [
            "onChange",
            "label",
            "ids",
            "items",
            "loose",
            "tricky",
        ]) {
            expect(byName.get(name)?.control, name).toBe("none");
        }
    });

    it("gives a union of literals a select with a mapping back to the values", () => {
        expect(byName.get("mixed")).toEqual({
            name: "mixed",
            control: "select",
            options: ["true", "false", "indeterminate"],
            mapping: { true: true, false: false },
        });
        expect(byName.get("count")).toMatchObject({
            control: "select",
            options: ["1", "2", "auto"],
            mapping: { "1": 1, "2": 2 },
        });
        expect(byName.get("flag")?.control).toBe("boolean");
    });

    it("tags a mapped type's default prop through its mapped type", () => {
        expect(byName.get("defaultSelected")).toMatchObject({
            control: "none",
            tagged: true,
        });
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
        ).toEqual({ control: "radio", options: ["body", "title"] });
        expect(
            argTypeFor(
                { name: "scrolled", control: "none", variant: "scrolled" },
                variants,
            ),
        ).toEqual({ control: "boolean" });
    });

    it("passes a select's mapping to Storybook", () => {
        expect(
            argTypeFor(
                {
                    name: "mixed",
                    control: "select",
                    options: ["true", "false", "indeterminate"],
                    mapping: { true: true, false: false },
                },
                variants,
            ),
        ).toEqual({
            control: "radio",
            options: ["true", "false", "indeterminate"],
            mapping: { true: true, false: false },
        });
    });

    it("draws a select of more than 3 options as a select, and a tag decides", () => {
        const four = ["xs", "s", "m", "l"];
        expect(
            argTypeFor(
                { name: "scale", control: "select", options: four },
                variants,
            ),
        ).toEqual({ control: "select", options: four });
        expect(
            argTypeFor(
                { name: "wide", control: "radio", options: four, tagged: true },
                variants,
            ),
        ).toEqual({ control: "radio", options: four });
        expect(
            argTypeFor(
                {
                    name: "pair",
                    control: "select",
                    options: ["a", "b"],
                    tagged: true,
                },
                variants,
            ),
        ).toEqual({ control: "select", options: ["a", "b"] });
        expect(controlFor(["a", "b", "c"]).control).toBe("radio");
        expect(controlFor(four).control).toBe("select");
    });

    it("follows the type, or a tag over the anatomy", () => {
        expect(
            argTypeFor(
                { name: "size", control: "select", options: ["s", "l"] },
                variants,
            ),
        ).toEqual({ control: "radio", options: ["s", "l"] });
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
        expect(
            argTypeFor(
                { name: "value", control: "color", tagged: true },
                variants,
            ),
        ).toEqual({ control: "color" });
    });
});
