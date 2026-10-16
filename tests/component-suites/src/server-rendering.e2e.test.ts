// Server rendering (design doc §5.7), for every example of every component, in both color
// schemes: Node renders the scene with the binding's server build, the page takes the HTML, and
// the binding hydrates it. Hydration must log nothing, keep every element the server rendered,
// and change no attribute (classes, `style`, `data-*`, `aria-*`, and the rest); then the
// component must respond. Controlled and default state render on the server.

import { describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { harness } from "#binding";

import { COMPONENTS } from "./components";
import type { ComponentCase } from "./components";
import { hostIn, stateNames, watchConsole } from "./harness/page";
import type { Scene, SceneProps } from "./harness/scene";
import { renderOnServer, runScripts } from "./harness/server";

/** Every element under `host` with its attributes, in document order. */
const snapshot = (host: HTMLElement) =>
    [...host.querySelectorAll("*")].map((element) => ({
        element,
        tag: element.tagName.toLowerCase(),
        attributes: Object.fromEntries(
            [...element.attributes].map(({ name, value }) => [name, value]),
        ),
    }));

/** Renders the scene on the server and puts its HTML in a new host, before any hydration. */
const serverRendered = async (scene: Scene) => {
    const { html, head } = await renderOnServer(scene);
    runScripts(head);
    const host = hostIn(`<div data-host></div>`);
    host.innerHTML = html;
    return host;
};

/** Hydrates the server's HTML, and lists what hydration logged and changed. */
const hydrate = async (scene: Scene) => {
    const host = await serverRendered(scene);
    const before = snapshot(host);
    const console = watchConsole();
    try {
        await harness.hydrate(scene, host);
        await harness.settle();
    } finally {
        console.stop();
    }
    const after = snapshot(host);
    const changes = before.flatMap(({ element, tag, attributes }, index) => {
        if (!element.isConnected) return [`<${tag}> #${index} was replaced`];
        const now = after.find(
            (entry) => entry.element === element,
        )!.attributes;
        const names = new Set([
            ...Object.keys(attributes),
            ...Object.keys(now),
        ]);
        return [...names]
            .filter((name) => attributes[name] !== now[name])
            .map(
                (name) =>
                    `<${tag}> #${index} ${name}: ${JSON.stringify(attributes[name])} → ${JSON.stringify(now[name])}`,
            );
    });
    if (after.length !== before.length) {
        changes.push(
            `${before.length} elements before hydrating, ${after.length} after`,
        );
    }
    return { host, logged: console.logged, changes };
};

const sceneOf = (component: ComponentCase, props: SceneProps): Scene => ({
    component: component.component,
    props: { ...component.props, ...props },
});

describe.each(["light", "dark"] as const)("%s color scheme", (scheme) => {
    describe.each(COMPONENTS)("$component", (component) => {
        it.each(Object.entries(component.examples))(
            "%s hydrates without a warning or a change",
            async (_, props) => {
                await commands.emulateColorScheme(scheme);
                const { host, logged, changes } = await hydrate(
                    sceneOf(component, props),
                );
                expect(logged).toEqual([]);
                expect(changes).toEqual([]);
                expect(
                    host.querySelector(`[data-testid="${component.root}"]`),
                ).not.toBeNull();
            },
        );
    });
});

const stateful = COMPONENTS.filter((component) => component.state);

describe.each(stateful)("$component, state", (component) => {
    const state = component.state!;
    const names = stateNames(state.prop);

    it.each([
        ["default", names.defaultValue],
        ["controlled", names.value],
    ])("renders the %s value on the server", async (_, prop) => {
        for (const value of [state.from, state.to]) {
            const host = await serverRendered(
                sceneOf(component, { ...state.props, [prop]: value }),
            );
            expect(state.read(host)).toEqual(value);
            host.remove();
        }
    });

    it("responds once hydrated", async () => {
        const { host, logged } = await hydrate(
            sceneOf(component, {
                ...state.props,
                [names.defaultValue]: state.from,
            }),
        );
        expect(logged).toEqual([]);
        await state.act(host);
        await harness.settle();
        expect(state.read(host)).toEqual(state.to);
    });
});

// The design runs this suite for each web target and once with a runtime theme. Only the Panda
// target has a registry the bindings render yet.
it.todo("hydrates on the CSS and Tailwind targets (p5a)");
it.todo("hydrates with a runtime theme from the provider (p5b)");
