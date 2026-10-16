// Reduced motion stops movement only, checked in Chromium against fixtures. For each web
// target (the Panda preset, the CSS adapter, and Tailwind through it), components render
// under each way of asking for reduced motion: the system's `prefers-reduced-motion`, and a
// provider's `data-pf-motion` attribute on an ancestor, which overrides the system either way
// and nests. Their computed `transition` keeps the color, opacity, and elevation fades, and
// drops position, size, and shape, or is `none` when nothing else is left.

import * as pandaRecipes from "$recipes";
import { MOTION_ATTRIBUTE } from "@pureform/core";
import { classesFor } from "@pureform/css-adapter";
import { afterAll, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { pureformConfig } from "../../../apps/solid-demo/panda.pureform";
import type { Adapter } from "./commands";

import pandaCss from "#/App.css?inline";

const OPTIONS = { prefix: "pf", themeAttribute: "data-panda-theme" };

type ClassFn = (selection: object) => string | Record<string, string>;

/** The components checked, each by the slot whose transition is read. */
const FIXTURES = [
    { name: "button", slot: "root" },
    { name: "switchControl", slot: "handle" },
    { name: "radio", slot: "dot" },
    { name: "textField", slot: "label" },
    { name: "linearProgress", slot: "indicator" },
] as const;

type Fixture = (typeof FIXTURES)[number];

const STATE =
    "background-color, color, border-color, outline-color, box-shadow";

/** The transitioned properties with full motion, and with reduced motion. */
const EXPECTED: Record<Fixture["name"], { full: string; reduced: string }> = {
    button: { full: STATE, reduced: STATE },
    switchControl: {
        full: "inset-inline-start, width, height, background-color",
        reduced: "background-color",
    },
    radio: { full: "transform, background-color", reduced: "background-color" },
    textField: {
        full: "top, inset-inline-start, padding-inline-start, padding-inline-end, margin-inline-start, background-color, transform, font-size, line-height, letter-spacing, color",
        reduced: "background-color, color",
    },
    linearProgress: { full: "width", reduced: "none" },
};

const classOf = (fns: Record<string, ClassFn>, { name, slot }: Fixture) => {
    const fn = fns[name];
    if (!fn) throw new Error(`no classes for ${name}`);
    return (fn({}) as Record<string, string>)[slot]!;
};

const STYLINGS: Record<
    "Panda" | Adapter,
    { classes: (fixture: Fixture) => string; css: () => Promise<string[]> }
> = {
    Panda: {
        classes: (fixture) =>
            classOf(
                pandaRecipes as unknown as Record<string, ClassFn>,
                fixture,
            ),
        css: async () => [pandaCss],
    },
    CSS: {
        classes: (fixture) =>
            classOf(
                classesFor(pureformConfig) as Record<string, ClassFn>,
                fixture,
            ),
        css: async () => [await commands.adapterCss("CSS", OPTIONS)],
    },
    Tailwind: {
        classes: (fixture) =>
            classOf(
                classesFor(pureformConfig) as Record<string, ClassFn>,
                fixture,
            ),
        css: async () => [await commands.adapterCss("Tailwind", OPTIONS)],
    },
};

interface Scenario {
    name: string;
    system: "reduce" | "no-preference";
    /** The motion attribute on each ancestor provider, outermost first. */
    providers: ("reduce" | "full")[];
    reduced: boolean;
}

const SCENARIOS: Scenario[] = [
    {
        name: "full motion",
        system: "no-preference",
        providers: [],
        reduced: false,
    },
    {
        name: "the system's reduced motion",
        system: "reduce",
        providers: [],
        reduced: true,
    },
    {
        name: "a reduce provider over the system's full motion",
        system: "no-preference",
        providers: ["reduce"],
        reduced: true,
    },
    {
        name: "a full provider over the system's reduced motion",
        system: "reduce",
        providers: ["full"],
        reduced: false,
    },
    {
        name: "a full provider nested in a reduce provider",
        system: "no-preference",
        providers: ["reduce", "full"],
        reduced: false,
    },
    {
        name: "a reduce provider nested in a full provider",
        system: "reduce",
        providers: ["full", "reduce"],
        reduced: true,
    },
];

/** Render each fixture in a frame and read its computed transition. */
const transitions = async (
    styling: (typeof STYLINGS)[keyof typeof STYLINGS],
    scenario: Scenario,
): Promise<{
    reducedMedia: boolean;
    values: Record<string, { property: string; duration: string }>;
}> => {
    await commands.emulateReducedMotion(scenario.system);
    const frame = document.createElement("iframe");
    frame.style.cssText = "width: 800px; height: 600px; border: 0";
    document.body.append(frame);
    try {
        const elements = FIXTURES.map(
            (fixture) =>
                `<div data-id="${fixture.name}" class="${styling.classes(fixture)}"></div>`,
        ).join("");
        const markup = scenario.providers.reduceRight(
            (inner, motion) =>
                `<div ${MOTION_ATTRIBUTE}="${motion}">${inner}</div>`,
            elements,
        );
        const doc = frame.contentDocument!;
        doc.open();
        doc.write(
            `<!doctype html><html><head>${(await styling.css())
                .map((sheet) => `<style>${sheet}</style>`)
                .join("")}</head><body>${markup}</body></html>`,
        );
        doc.close();
        const win = frame.contentWindow!;
        const values: Record<string, { property: string; duration: string }> =
            {};
        for (const element of doc.querySelectorAll<HTMLElement>("[data-id]")) {
            const style = win.getComputedStyle(element);
            values[element.dataset.id!] = {
                property: style.transitionProperty,
                duration: style.transitionDuration,
            };
        }
        return {
            reducedMedia: win.matchMedia("(prefers-reduced-motion: reduce)")
                .matches,
            values,
        };
    } finally {
        frame.remove();
    }
};

afterAll(async () => {
    // The suite's browser context reduces motion; put it back for the files after this one.
    await commands.emulateReducedMotion("reduce");
});

describe.each(Object.keys(STYLINGS) as (keyof typeof STYLINGS)[])(
    "%s: reduced motion stops movement only",
    (name) => {
        it.each(SCENARIOS)("$name", async (scenario) => {
            const { reducedMedia, values } = await transitions(
                STYLINGS[name],
                scenario,
            );
            expect(reducedMedia).toBe(scenario.system === "reduce");
            for (const { name: component } of FIXTURES) {
                const expected =
                    EXPECTED[component][scenario.reduced ? "reduced" : "full"];
                const value = values[component]!;
                if (expected === "none") {
                    expect(value, component).toEqual({
                        property: "none",
                        duration: "0s",
                    });
                } else {
                    expect(value.property, component).toBe(expected);
                    expect(value.duration, component).not.toMatch(
                        /^0s(, 0s)*$/,
                    );
                }
            }
        });
    },
);
