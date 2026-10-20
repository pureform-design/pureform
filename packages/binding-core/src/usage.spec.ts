import * as anatomy from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import * as core from ".";
import { COMPONENT_USAGE } from "./usage";
import type { ComponentSubpath } from "./usage";

// The bindings' component sources, by path from this folder.
const SOURCES = import.meta.glob<string>(
    [
        "../../{solid,react,react-native}/src/*/*.{ts,tsx}",
        "../../{solid,react,react-native}/src/{navigation,text-input,single-part,progress}.tsx",
        "!../../{solid,react,react-native}/src/*/*.spec.*",
    ],
    { query: "?raw", import: "default", eager: true },
);

const PACKAGES = import.meta.glob<{ exports: Record<string, unknown> }>(
    "../../{solid,react,react-native}/package.json",
    { import: "default", eager: true },
);

type Binding = "solid" | "react" | "react-native";

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
        case "list:listItem":
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

const sources = (binding: Binding, subpath: string): string[] =>
    Object.entries(SOURCES)
        .filter(([path]) => path.startsWith(`../../${binding}/src/${subpath}/`))
        .map(([, text]) => text);

// Files several components share, and the components that use them.
const SHARED: Readonly<Record<string, readonly string[]>> = {
    "navigation.tsx": ["navigation-bar", "navigation-rail"],
    "text-input.tsx": ["text-field", "text-area"],
    "single-part.tsx": [
        "avatar",
        "badge",
        "icon",
        "media",
        "scrim",
        "separator",
        "supporting-text",
        "text",
        "touch-target",
    ],
};

// React Native's shared files: its tabs share the navigation's, its progress indicators share one,
// and the select is a text input there.
const NATIVE_SHARED: Readonly<Record<string, readonly string[]>> = {
    ...SHARED,
    "navigation.tsx": ["tabs", "navigation-bar", "navigation-rail"],
    "text-input.tsx": ["text-field", "text-area", "select"],
    "progress.tsx": ["linear-progress", "circular-progress"],
    "single-part.tsx": [
        "avatar",
        "badge",
        "icon",
        "media",
        "scrim",
        "separator",
        "supporting-text",
        "text",
    ],
};

const sharedFiles = (binding: Binding) =>
    binding === "react-native" ? NATIVE_SHARED : SHARED;

const sharedSources = (binding: Binding, subpath: string) =>
    Object.entries(sharedFiles(binding))
        .filter(([, users]) => users.includes(subpath))
        .map(([file]) => SOURCES[`../../${binding}/src/${file}`]!);

// The entries a component's sources draw by the anatomies they name.
const anatomiesIn = (text: string): Set<string> => {
    const drawn = new Set<string>();
    for (const [, key] of text.matchAll(/\b(\w+Anatomy)\b/g)) {
        const found = anatomyNames.get(key!);
        if (found?.styled) drawn.add(found.name);
        // A surface that shows indication holds the ripple's layer.
        if (found?.indicated) drawn.add("ripple");
    }
    return drawn;
};

// The entries a component's sources draw: by the anatomies they name, a trigger drawn as a button,
// and the components they render (`import { ListItem } from "../list-item/list-item"`), by those
// components' anatomies.
const drawnBy = (binding: Binding, text: string): Set<string> => {
    const drawn = anatomiesIn(text);
    if (/\bas=\{Button\}/.test(text)) drawn.add("button").add("ripple");
    for (const [, subpath] of text.matchAll(
        /^import \{[^}]*\} from "\.\.\/([a-z-]+)(?:\/[a-z-]+)?";$/gm,
    )) {
        for (const entry of anatomiesIn(sources(binding, subpath!).join("\n")))
            drawn.add(entry);
    }
    return drawn;
};

const anatomyNames = new Map(
    Object.entries(anatomy).flatMap(([key, value]) =>
        value && typeof value === "object" && "partNames" in value
            ? [
                  [
                      key,
                      {
                          name: (value as { name: string }).name,
                          indicated:
                              ((value as { indication?: readonly unknown[] })
                                  .indication?.length ?? 0) > 0,
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

    it("names only component subpaths for react-native, besides its engines", () => {
        const exports = Object.keys(
            PACKAGES["../../react-native/package.json"]!.exports,
        )
            .map((key) => key.replace(/^\.\/?/, ""))
            .filter(
                (key) =>
                    key &&
                    !["svg", "reanimated", "reanimated-svg"].includes(key),
            );
        expect(exports.length).toBeGreaterThan(0);
        for (const subpath of exports) {
            expect(Object.keys(COMPONENT_USAGE), subpath).toContain(subpath);
        }
    });

    it("lists every entry the react-native components draw", () => {
        const exports = Object.keys(
            PACKAGES["../../react-native/package.json"]!.exports,
        ).map((key) => key.replace(/^\.\/?/, ""));
        for (const [subpath, { entries }] of Object.entries(COMPONENT_USAGE)) {
            if (!exports.includes(subpath)) continue;
            // A file several components share draws each of theirs.
            const users = new Set([
                subpath,
                ...Object.values(NATIVE_SHARED)
                    .filter((list) => list.includes(subpath))
                    .flat(),
            ]);
            const listed = new Set(
                [...users].flatMap((user) =>
                    Object.keys(
                        COMPONENT_USAGE[user as ComponentSubpath].entries,
                    ),
                ),
            );
            const drawn = drawnBy(
                "react-native",
                [
                    ...sources("react-native", subpath),
                    ...sharedSources("react-native", subpath),
                ].join("\n"),
            );
            expect(Object.keys(entries).length + drawn.size).toBeGreaterThan(0);
            for (const entry of drawn) expect(listed, subpath).toContain(entry);
        }
    });

    for (const binding of ["solid", "react", "react-native"] as const) {
        if (binding !== "react-native")
            it(`lists every entry the ${binding} components draw`, () => {
                for (const [subpath, { entries }] of Object.entries(
                    COMPONENT_USAGE,
                )) {
                    const drawn = drawnBy(
                        binding,
                        sources(binding, subpath).join("\n"),
                    );
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
