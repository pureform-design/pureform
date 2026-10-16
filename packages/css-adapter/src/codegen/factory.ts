// A component's `ClassFactory` module with its classes written out: each slot's class string as
// a template over the selection, one cached result per selection, and instance tokens as the
// component's CSS vars on the root. It needs no class name runtime and no manifest: the classes
// are the ones `componentClasses` gives for the component's manifest.

import { tokenValue } from "@pureform/core";
import type { AnyComponentSpec } from "@pureform/core/types";
import { varName } from "@pureform/css-lowering";
import type { VarPrefix } from "@pureform/css-lowering";

import type { ComponentManifest } from "../runtime";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const key = (name: string): string =>
    IDENTIFIER.test(name) ? name : JSON.stringify(name);

const access = (object: string, name: string): string =>
    IDENTIFIER.test(name)
        ? `${object}.${name}`
        : `${object}[${JSON.stringify(name)}]`;

// Text inside a template literal, taken literally.
const literal = (text: string): string => text.replace(/[\\`$]/g, "\\$&");

/** Each instance token's CSS var: a `dynamic` token's own path, else the component's var for
 *  it, as a theme override names it. The same vars the Panda adapter's factories set. */
export const tokenVars = (
    name: string,
    spec: AnyComponentSpec,
    prefix: VarPrefix | undefined,
): Record<string, string> =>
    Object.fromEntries(
        Object.entries(spec.tokens ?? {}).map(([token, entry]) => {
            const node = tokenValue(entry) as {
                type?: string;
                path?: string[];
            };
            const path =
                node.type === "dynamic" && node.path
                    ? node.path
                    : ["components", name, token];
            return [token, varName(path, prefix)];
        }),
    );

/** A slot's class expression over the normalized selection `s`: its own class, then
 *  `<class>--<group>_<value>` for each group, in the manifest's order. A group with no default
 *  can be missing from the selection, and then adds nothing. */
export const classExpression = (
    base: string,
    manifest: Pick<ComponentManifest, "variants" | "defaultVariants">,
): string => {
    const groups = Object.keys(manifest.variants);
    if (groups.length === 0) return JSON.stringify(base);
    const parts = groups.map((group) => {
        const value = access("s", group);
        const text = ` ${literal(`${base}--${group}_`)}\${${value}}`;
        return manifest.defaultVariants[group] === undefined
            ? `\${${value} === undefined ? "" : \`${text}\`}`
            : text;
    });
    return `\`${literal(base)}${parts.join("")}\``;
};

const record = (
    entries: readonly (readonly [string, string])[],
    indent: string,
): string =>
    entries.length === 0
        ? "{}"
        : `{\n${entries.map(([name, value]) => `${indent}    ${key(name)}: ${JSON.stringify(value)},`).join("\n")}\n${indent}}`;

/** What a factory module needs to know about its component. */
export interface FactoryModuleInput {
    /** The registry name, which the module exports. */
    readonly name: string;
    /** The component's classes, variants, and defaults (`manifestOf`). A manifest without
     *  slots is a single-slot component, whose class is the root's. */
    readonly manifest: ComponentManifest;
    /** Each instance token's CSS var. */
    readonly vars: Readonly<Record<string, string>>;
}

/** The factory module's source. */
export const factoryModule = (input: FactoryModuleInput): string => {
    const { name, manifest } = input;
    const component = JSON.stringify(name);
    const vars = Object.entries(input.vars);
    const groups = Object.keys(manifest.variants);
    const defaults = Object.entries(manifest.defaultVariants).map(
        ([group, value]) => [group, String(value)] as const,
    );
    const slots: [slot: string, base: string][] = manifest.slots
        ? manifest.slots.map((slot) => [slot, `${manifest.className}__${slot}`])
        : [["root", manifest.className]];
    return [
        `import { selectionCache${vars.length > 0 ? ", withTokenStyle" : ""} } from "@pureform/styling";`,
        'import type { ClassFactory, ClassSlots, Selection } from "@pureform/styling";',
        "",
        ...(vars.length > 0
            ? [`const vars = ${record(vars, "")} as const;`, ""]
            : []),
        `const classes = selectionCache<Selection<${component}>, ClassSlots<${component}>>(`,
        "    {",
        `        variants: [${groups.map((group) => JSON.stringify(group)).join(", ")}],`,
        ...(defaults.length > 0
            ? [`        defaults: ${record(defaults, "        ")},`]
            : []),
        "    },",
        `    (${groups.length > 0 ? "s" : ""}) => ({`,
        ...slots.flatMap(([slot, base]) => [
            `        ${key(slot)}: {`,
            `            class: ${classExpression(base, manifest)},`,
            "        },",
        ]),
        "    }),",
        ");",
        "",
        vars.length > 0
            ? `export const ${name}: ClassFactory<${component}> = (s) =>\n    withTokenStyle(classes(s), s.tokens, vars);`
            : `export const ${name}: ClassFactory<${component}> = classes;`,
        "",
    ].join("\n");
};
