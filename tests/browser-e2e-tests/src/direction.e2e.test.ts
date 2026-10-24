// Styles flip with the writing direction, checked in Chromium. For each web target (the Panda
// preset, the CSS adapter, and Tailwind through it), the components with styles logical
// properties can't express render left to right and right to left, and every part's box in
// right to left must mirror its left to right box across the root.

import * as pandaRecipes from "$recipes";
import { classesFor } from "@pureform/css-adapter";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { pureformConfig } from "../../panda-fixture/panda.pureform";
import type { Adapter } from "./commands";
import { mirroredBoxMismatches } from "./mirror";

import pandaCss from "#/styles.css?inline";

const OPTIONS = { prefix: "pf", themeAttribute: "data-panda-theme" };

type Classes = (
    name: string,
    selection?: Record<string, string>,
) => Record<string, string>;

const classesOf =
    (fns: Record<string, (selection: object) => unknown>): Classes =>
    (name, selection = {}) => {
        const fn = fns[name];
        if (!fn) throw new Error(`no classes for ${name}`);
        return fn(selection) as Record<string, string>;
    };

const adapterClasses = classesOf(
    classesFor(pureformConfig) as Record<
        string,
        (selection: object) => unknown
    >,
);

const STYLINGS: Record<
    "Panda" | Adapter,
    { classes: Classes; css: () => Promise<string> }
> = {
    Panda: {
        classes: classesOf(
            pandaRecipes as unknown as Record<
                string,
                (selection: object) => unknown
            >,
        ),
        css: async () => pandaCss,
    },
    CSS: {
        classes: adapterClasses,
        css: () => commands.adapterCss("CSS", OPTIONS),
    },
    Tailwind: {
        classes: adapterClasses,
        css: () => commands.adapterCss("Tailwind", OPTIONS),
    },
};

interface Fixture {
    name: string;
    markup: (classes: Classes) => string;
    prepare?: (root: HTMLElement) => void;
}

const switchMarkup =
    (checked: boolean) =>
    (classes: Classes): string => {
        const c = classes("switchControl");
        return `<span data-root class="${c.root}">
            <span data-part="touchTarget" class="${c.touchTarget}"></span>
            <input data-part="input" class="${c.input}" type="checkbox" role="switch"${checked ? " checked" : ""} />
            <span data-part="track" class="${c.track}">
                <span data-part="stateLayer" class="${c.stateLayer}"></span>
                <span data-part="handle" class="${c.handle}"><span data-part="icon" class="${c.icon}">✓</span></span>
            </span>
        </span>`;
    };

const progressMarkup =
    (indeterminate: boolean) =>
    (classes: Classes): string => {
        const c = classes("linearProgress", {
            indeterminate: String(indeterminate),
        });
        return `<div data-root class="${c.root}" role="progressbar" aria-valuenow="40" style="width: 320px; --components-linearProgress-value: 40">
            <div data-part="indicator" class="${c.indicator}"></div>
        </div>`;
    };

// The track turns with the arc while indeterminate, a gap past its head.
const circularMarkup = (classes: Classes): string => {
    const c = classes("circularProgress", { indeterminate: "true" });
    return `<div data-root class="${c.root}" role="progressbar">
        <span data-part="track" class="${c.track}"></span>
        <span data-part="endHalf" class="${c.endHalf}"><span data-part="endArc" class="${c.endArc}"></span></span>
        <span data-part="startHalf" class="${c.startHalf}"><span data-part="startArc" class="${c.startArc}"></span></span>
    </div>`;
};

/** Pause every animation under `root` at `time` milliseconds, so both directions measure the
 *  same frame. */
const pauseAt = (time: number) => (root: HTMLElement) => {
    const animations = root.getAnimations({ subtree: true });
    if (animations.length === 0) throw new Error("nothing is animating");
    for (const animation of animations) {
        animation.pause();
        animation.currentTime = time;
    }
};

const FIXTURES: Fixture[] = [
    { name: "switch, off", markup: switchMarkup(false) },
    { name: "switch, on", markup: switchMarkup(true) },
    { name: "linear progress", markup: progressMarkup(false) },
    {
        name: "indeterminate linear progress, entering",
        markup: progressMarkup(true),
        prepare: pauseAt(300),
    },
    {
        name: "indeterminate linear progress, midway",
        markup: progressMarkup(true),
        prepare: pauseAt(900),
    },
    {
        name: "indeterminate circular progress, growing",
        markup: circularMarkup,
        prepare: pauseAt(700),
    },
    {
        name: "indeterminate circular progress, shrinking",
        markup: circularMarkup,
        prepare: pauseAt(2200),
    },
];

describe.each(Object.keys(STYLINGS) as (keyof typeof STYLINGS)[])(
    "%s: styles flip with direction",
    (styling) => {
        let frame: HTMLIFrameElement;

        beforeAll(async () => {
            frame = document.createElement("iframe");
            frame.style.cssText = "width: 800px; height: 600px; border: 0";
            document.body.append(frame);
            const doc = frame.contentDocument!;
            doc.open();
            doc.write(
                `<!doctype html><html><head><style>${await STYLINGS[styling].css()}</style></head><body></body></html>`,
            );
            doc.close();
        });

        afterAll(() => frame.remove());

        it.each(FIXTURES)(
            "$name: every part mirrors in rtl",
            ({ markup, prepare }) => {
                const doc = frame.contentDocument!;
                expect(
                    mirroredBoxMismatches(
                        doc,
                        markup(STYLINGS[styling].classes),
                        prepare,
                    ),
                ).toEqual([]);
            },
        );
    },
);
