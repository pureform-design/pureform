// A component's `ClassFactory` module over the recipe function Panda's codegen writes: one
// cached result per selection, each slot's class string as `{ class }`, and instance tokens as
// the component's CSS vars on the root.

import { instanceTokenVars } from "@pureform/css-lowering";
import type { ComponentShape } from "@pureform/generate";

/** The file Panda writes a recipe to, under `<outdir>/recipes/`: the name split into words at
 *  each capital and at anything not a letter or digit, lowercased, and joined by `-`
 *  (`iconButton` → `icon-button`, `fabXL` → `fab-x-l`). */
export const recipeFile = (name: string): string =>
    name
        .split(/(?=[A-Z])|[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((word) => word.toLowerCase())
        .join("-");

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const key = (name: string): string =>
    IDENTIFIER.test(name) ? name : JSON.stringify(name);

const access = (object: string, name: string): string =>
    IDENTIFIER.test(name)
        ? `${object}.${name}`
        : `${object}[${JSON.stringify(name)}]`;

/** Each instance token's CSS var (`instanceTokenVars`, which every web adapter's factories
 *  share). */
export const tokenVars = instanceTokenVars;

// Panda types a group with `"true"` or `"false"` values as a boolean and compares selections
// strictly, while the cache hands over strings, so those values go back to booleans.
const recipeArgument = (shape: ComponentShape): string => {
    const flags = Object.entries(shape.variants).filter(
        ([, values]) => values.includes("true") || values.includes("false"),
    );
    if (flags.length === 0) return "s";
    const entries = flags.map(([group, values]) => {
        const value = access("s", group);
        const cases = [
            ...(values.includes("true") ? [`${value} === "true" ? true`] : []),
            ...(values.includes("false")
                ? [`${value} === "false" ? false`]
                : []),
        ];
        return `${key(group)}: ${cases.join(" : ")} : ${value}`;
    });
    return `{\n            ...s,\n${entries.map((entry) => `            ${entry},`).join("\n")}\n        }`;
};

const list = (values: readonly string[]): string =>
    `[${values.map((value) => JSON.stringify(value)).join(", ")}]`;

const record = (
    entries: readonly (readonly [string, string])[],
    indent: string,
): string =>
    entries.length === 0
        ? "{}"
        : `{\n${entries.map(([name, value]) => `${indent}    ${key(name)}: ${JSON.stringify(value)},`).join("\n")}\n${indent}}`;

/** What a factory module needs to know about its component. */
export interface FactoryModuleInput {
    readonly name: string;
    readonly shape: ComponentShape;
    /** Single-slot recipes return a class string; slot recipes, a string per slot. */
    readonly slotted: boolean;
    /** The recipe module's import specifier from the factory module. */
    readonly recipe: string;
    /** Each instance token's CSS var. */
    readonly vars: Readonly<Record<string, string>>;
    /** Each spring token's role var prefix (`instanceSpringVars`). Default none. */
    readonly springs?: Readonly<Record<string, string>>;
}

/** The factory module's source. */
export const factoryModule = (input: FactoryModuleInput): string => {
    const { name, shape, slotted } = input;
    const component = JSON.stringify(name);
    const vars = Object.entries(input.vars);
    const springs = Object.entries(input.springs ?? {});
    const argument = recipeArgument(shape);
    const defaults = Object.entries(shape.defaults);
    const order = [
        "    {",
        `        variants: ${list(Object.keys(shape.variants))},`,
        ...(defaults.length > 0
            ? [`        defaults: ${record(defaults, "        ")},`]
            : []),
        "    },",
    ];
    const compute = slotted
        ? [
              "    (s) => {",
              `        const slots = recipe(${argument});`,
              "        return {",
              ...shape.slots.map(
                  (slot) =>
                      `            ${key(slot)}: { class: ${access("slots", slot)} },`,
              ),
              "        };",
              "    },",
          ]
        : argument === "s"
          ? ["    (s) => ({ root: { class: recipe(s) } }),"]
          : [
                "    (s) => {",
                `        const root = recipe(${argument});`,
                "        return { root: { class: root } };",
                "    },",
            ];
    return [
        'import { selectionCache } from "@pureform/styling";',
        'import type { Selection } from "@pureform/styling";',
        ...(vars.length > 0
            ? ['import { withTokenStyle } from "@pureform/styling-web";']
            : []),
        'import type { ClassFactory, ClassSlots } from "@pureform/styling-web";',
        "",
        `import { ${name} as recipe } from ${JSON.stringify(input.recipe)};`,
        "",
        ...(vars.length > 0
            ? [`const vars = ${record(vars, "")} as const;`, ""]
            : []),
        ...(springs.length > 0
            ? [`const springs = ${record(springs, "")} as const;`, ""]
            : []),
        `const classes = selectionCache<Selection<${component}>, ClassSlots<${component}>>(`,
        ...order,
        ...compute,
        ");",
        "",
        vars.length > 0
            ? `export const ${name}: ClassFactory<${component}> = (s) =>\n    withTokenStyle(classes(s), s.tokens, vars${springs.length > 0 ? ', "root", springs' : ""});`
            : `export const ${name}: ClassFactory<${component}> = classes;`,
        "",
    ].join("\n");
};
