// The files `generate` writes itself, around the adapter's modules: the registry index the app
// hands to `PureformProvider`, and the declarations that type it.

import type { ComponentShape } from "./adapter";

/** The registry index's file, relative to `outDir`. */
export const INDEX_FILE = "index.ts";
/** The declarations' file, relative to `outDir`. */
export const DECLARATIONS_FILE = "registry.d.ts";

/** A component as the index and the declarations see it. */
export interface GlueEntry {
    readonly name: string;
    /** The module, relative to `outDir`. */
    readonly path: string;
    readonly exportName: string;
    readonly lazy: boolean;
    readonly shape: ComponentShape;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** Whether a name can be a JavaScript binding and export. */
export const isIdentifier = (name: string): boolean => IDENTIFIER.test(name);

const key = (name: string): string =>
    isIdentifier(name) ? name : JSON.stringify(name);

/** A module's import specifier from the index: `"web/button.ts"` → `"./web/button"`. */
export const moduleSpecifier = (path: string): string =>
    `./${path.replace(/\.(?:tsx?|m?js)$/, "")}`;

/** The registry index: every entry, static by default, the train's version and the target's
 *  theme attribute, the theme names, and the component names as a type. */
export const registryIndex = (
    entries: readonly GlueEntry[],
    themes: readonly string[],
    version: string,
    themeAttribute?: string,
): string => {
    const imports = entries
        .filter((entry) => !entry.lazy)
        .map(
            (entry) =>
                `import { ${entry.exportName === entry.name ? entry.name : `${entry.exportName} as ${entry.name}`} } from ${JSON.stringify(moduleSpecifier(entry.path))};`,
        );
    const registry = entries.map((entry) => {
        if (!entry.lazy) return `        ${entry.name},`;
        const load = `import(${JSON.stringify(moduleSpecifier(entry.path))})`;
        return entry.exportName === entry.name
            ? `        ${entry.name}: { lazy: () => ${load} },`
            : `        ${entry.name}: { lazy: () => ${load}.then((module) => module.${entry.exportName}) },`;
    });
    const names = entries.map((entry) => JSON.stringify(entry.name));
    return [
        'import { createRegistry } from "@pureform/styling";',
        ...(imports.length > 0 ? ["", ...imports] : []),
        "",
        "/** The core train's version this glue was made with. */",
        `export const version = ${JSON.stringify(version)};`,
        "",
        "export const registry = createRegistry(",
        ...(registry.length > 0
            ? ["    {", ...registry, "    },"]
            : ["    {},"]),
        themeAttribute === undefined
            ? "    { version },"
            : `    { version, themeAttribute: ${JSON.stringify(themeAttribute)} },`,
        ");",
        "",
        `export const themes = [${themes.map((theme) => JSON.stringify(theme)).join(", ")}] as const;`,
        "",
        `export type Components = ${names.length > 0 ? names.join(" | ") : "never"};`,
        "",
    ].join("\n");
};

const union = (values: readonly string[]): string =>
    values.length > 0
        ? values.map((value) => JSON.stringify(value)).join(" | ")
        : "never";

/** The declarations augmenting `@pureform/styling`'s `ComponentRegistry` with each entry's
 *  shape. */
export const registryDeclarations = (entries: readonly GlueEntry[]): string => {
    const components = entries.flatMap((entry) => {
        const { shape } = entry;
        const groups = Object.entries(shape.variants);
        return [
            `        ${key(entry.name)}: {`,
            ...(groups.length > 0
                ? [
                      "            variants: {",
                      ...groups.map(
                          ([group, values]) =>
                              `                ${key(group)}: ${union(values)};`,
                      ),
                      "            };",
                  ]
                : []),
            `            slots: ${union(shape.slots)};`,
            ...(shape.states
                ? [`            states: ${union(shape.states)};`]
                : []),
            ...(shape.tokens.length > 0
                ? [`            tokens: ${union(shape.tokens)};`]
                : []),
            ...(entry.lazy ? ["            lazy: true;"] : []),
            "        };",
        ];
    });
    return [
        'declare module "@pureform/styling" {',
        "    interface ComponentRegistry {",
        ...components,
        "    }",
        "}",
        "",
        "export {};",
        "",
    ].join("\n");
};
