// Helpers the suites share: mounting a component's case, the names a state prop gives, forms and
// fieldsets around a scene, and what the page logged.

import { vi } from "vitest";

import { harness } from "#binding";

import type { ComponentCase, FormEntryValue } from "../components";
import { animationsDone } from "./animations";
import type { Mounted } from "./harness";
import type { SceneProps, SceneProvider } from "./scene";

/** Mounts a component with its case's props, then `props`, into `host`. */
export const mountCase = (
    component: ComponentCase,
    props: SceneProps = {},
    options: { host?: HTMLElement; provider?: SceneProvider } = {},
): Mounted =>
    harness.mount(
        {
            component: component.component,
            props: { ...component.props, ...props },
            provider: options.provider,
        },
        options.host,
    );

/** A component's renderings by name: its examples, then its opened overlays (`open: …`). */
export const renderings = (
    component: ComponentCase,
): (readonly [string, SceneProps])[] => [
    ...Object.entries(component.examples),
    ...Object.entries(component.opened ?? {}).map(
        ([name, props]) => [`open: ${name}`, props] as const,
    ),
];

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Waits for a mounted scene to settle, and for an overlay in it to be placed and done entering:
 *  Zag places a floating one a few frames after it opens, once the trigger has its layout. */
export const settlePlaced = async (): Promise<void> => {
    await harness.settle();
    for (let i = 0; i < 4; i++) await frame();
    await animationsDone();
    await harness.settle();
};

const capitalize = (name: string) => name[0]!.toUpperCase() + name.slice(1);

/** A state prop's three names: `checked`, `defaultChecked`, `onCheckedChange`. */
export const stateNames = (prop: string) => ({
    value: prop,
    defaultValue: `default${capitalize(prop)}`,
    onChange: `on${capitalize(prop)}Change`,
});

/** A host inside `markup`, at the element marked `data-host`: `<form><fieldset disabled>
 *  <div data-host></div></fieldset></form>`. The markup goes at the end of the body. */
export const hostIn = (markup: string): HTMLElement => {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    const outer = template.content.firstElementChild as HTMLElement;
    document.body.append(outer);
    const host = outer.matches("[data-host]")
        ? outer
        : outer.querySelector<HTMLElement>("[data-host]");
    if (!host) throw new Error("the markup has no [data-host]");
    return host;
};

/** The entries a form submits when `submit` runs, or `null` when it doesn't submit. */
export const submitted = async (
    form: HTMLFormElement,
    submit: () => Promise<void> | void,
): Promise<[string, FormEntryValue][] | null> => {
    let entries: [string, FormEntryValue][] | null = null;
    const onSubmit = (event: SubmitEvent) => {
        event.preventDefault();
        entries = [...new FormData(form, event.submitter)].map(
            ([name, value]) => [
                name,
                typeof value === "string"
                    ? value
                    : { file: value.name, type: value.type },
            ],
        );
    };
    form.addEventListener("submit", onSubmit);
    try {
        await submit();
        await harness.settle();
    } finally {
        form.removeEventListener("submit", onSubmit);
    }
    return entries;
};

/** Waits out a form reset: the browser's, then the binding's in the next task. */
export const afterReset = async (): Promise<void> => {
    await harness.settle();
    await harness.settle();
};

/** Collects what's logged to `console.error` and `console.warn` until `stop`. */
export const watchConsole = () => {
    const logged: string[] = [];
    const record =
        (level: string) =>
        (...args: unknown[]) =>
            logged.push(`${level}: ${args.map(String).join(" ")}`);
    const error = vi
        .spyOn(console, "error")
        .mockImplementation(record("error"));
    const warn = vi.spyOn(console, "warn").mockImplementation(record("warn"));
    return {
        logged,
        stop: () => {
            error.mockRestore();
            warn.mockRestore();
        },
    };
};
