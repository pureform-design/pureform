import * as anatomy from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import * as core from ".";
import { COMPONENT_USAGE } from "./usage";
import type { ComponentSubpath } from "./usage";

// The bindings' component sources, by path from this folder.
const SOURCES = import.meta.glob<string>(
    [
        "../../{solid,react}/src/*/*.{ts,tsx}",
        "../../{solid,react}/src/{navigation,text-input,single-part}.tsx",
        "!../../{solid,react}/src/*/*.spec.*",
    ],
    { query: "?raw", import: "default", eager: true },
);

const PACKAGES = import.meta.glob<{ exports: Record<string, unknown> }>(
    "../../{solid,react}/package.json",
    { import: "default", eager: true },
);

// The registry selection each entry of each component gets from its props.
const select = (
    subpath: ComponentSubpath,
    entry: string,
    props: Record<string, unknown>,
): Record<string, unknown> => {
    const p = props as never;
    switch (`${subpath}:${entry}`) {
        case "card:card":
            return core.cardSelection(p, "div");
        case "list-item:listItem":
            return core.listItemSelection(p, "div");
        case "circular-progress:circularProgress":
        case "linear-progress:linearProgress":
            return core.progressSelection(p);
        case "navigation-bar:navigationBar":
        case "navigation-rail:navigationRail":
            return core.navigationSelection(p);
        case "radio-group:radio":
            return core.radioSelection(p, {});
        case "select:menu":
            return core.selectMenuSelection(p);
        case "slider:slider":
            return core.sliderSelection(p, 0);
        case "switch:switchControl":
            return core.switchSelection(p);
        case "text-area:textArea":
            return core.textAreaSelection(p);
        default: {
            const name = `${entry}Selection` as keyof typeof core;
            return (core[name] as (props: never) => Record<string, unknown>)(p);
        }
    }
};

const sources = (binding: "solid" | "react", subpath: string): string[] =>
    Object.entries(SOURCES)
        .filter(([path]) => path.startsWith(`../../${binding}/src/${subpath}/`))
        .map(([, text]) => text);

// Files several components share, and the components that use them.
const SHARED: Readonly<Record<string, readonly string[]>> = {
    "navigation.tsx": ["navigation-bar", "navigation-rail"],
    "text-input.tsx": ["text-field", "text-area"],
    "single-part.tsx": [
        "avatar",
        "icon",
        "media",
        "scrim",
        "separator",
        "supporting-text",
        "text",
        "touch-target",
    ],
};

const sharedSources = (binding: "solid" | "react", subpath: string) =>
    Object.entries(SHARED)
        .filter(([, users]) => users.includes(subpath))
        .map(([file]) => SOURCES[`../../${binding}/src/${file}`]!);

const anatomyNames = new Map(
    Object.entries(anatomy).flatMap(([key, value]) =>
        value && typeof value === "object" && "partNames" in value
            ? [
                  [
                      key,
                      {
                          name: (value as { name: string }).name,
                          // Drawn when any part is styled.
                          styled: Object.values(
                              (
                                  value as {
                                      parts: Record<
                                          string,
                                          { styled: boolean }
                                      >;
                                  }
                              ).parts,
                          ).some((part) => part.styled),
                      },
                  ],
              ]
            : [],
    ),
);

describe("COMPONENT_USAGE", () => {
    it("names every component subpath both bindings export", () => {
        for (const binding of ["solid", "react"]) {
            const exports = Object.keys(
                PACKAGES[`../../${binding}/package.json`]!.exports,
            )
                .map((key) => key.replace(/^\.\/?/, ""))
                .filter((key) => key && !key.startsWith("internal/"));
            expect(exports.sort()).toEqual(Object.keys(COMPONENT_USAGE).sort());
        }
    });

    it("passes each listed group to the registry from its prop, as given", () => {
        for (const [subpath, { entries }] of Object.entries(COMPONENT_USAGE)) {
            for (const [entry, groups] of Object.entries(entries)) {
                for (const [group, prop] of Object.entries(
                    groups as Record<string, string>,
                )) {
                    const at = `${subpath}: ${entry}.${group}`;
                    expect(
                        select(subpath as ComponentSubpath, entry, {
                            [prop]: "given",
                        })[group],
                        at,
                    ).toBe("given");
                    expect(
                        select(subpath as ComponentSubpath, entry, {})[group],
                        at,
                    ).toBeUndefined();
                }
            }
        }
    });

    for (const binding of ["solid", "react"] as const) {
        it(`lists every entry the ${binding} components draw`, () => {
            for (const [subpath, { entries }] of Object.entries(
                COMPONENT_USAGE,
            )) {
                const text = sources(binding, subpath).join("\n");
                const drawn = new Set<string>();
                for (const [, key] of text.matchAll(/\b(\w+Anatomy)\b/g)) {
                    const found = anatomyNames.get(key!);
                    if (found?.styled) drawn.add(found.name);
                }
                if (/\bas=\{Button\}/.test(text)) drawn.add("button");
                const own = Object.keys(entries);
                expect(own.sort(), subpath).toEqual([...drawn].sort());
            }
        });

        it(`sets no listed group from anything but its own prop in the ${binding} components`, () => {
            for (const [subpath, { entries }] of Object.entries(
                COMPONENT_USAGE,
            )) {
                const props = new Set(
                    Object.values(entries).flatMap((groups) =>
                        Object.values(groups as Record<string, string>),
                    ),
                );
                const text = [
                    ...sources(binding, subpath),
                    ...sharedSources(binding, subpath),
                ].join("\n");
                for (const [, prop, value] of text.matchAll(
                    /\s(\w+)=\{([^}]*)\}/g,
                )) {
                    if (!props.has(prop!)) continue;
                    expect(
                        value!.trim(),
                        `${binding}/${subpath}: ${prop}={${value}}`,
                    ).toMatch(new RegExp(`^(?:props\\.|local\\.)?${prop}$`));
                }
            }
        });
    }
});
