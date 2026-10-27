// Server rendering (design doc §5.7), for every example of every component, in both color
// schemes: Node renders the scene with the binding's server build, the page takes the HTML, and
// the binding hydrates it. Hydration must log nothing, keep every element the server rendered,
// and change no attribute (classes, `style`, `data-*`, `aria-*`, and the rest); then the
// component must respond. Controlled and default state render on the server.

import { themeScope } from "@pureform/styling-web";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { commands } from "vitest/browser";

import { harness } from "#binding";
import { registry } from "#registry";

import { COMPONENTS } from "./components";
import type { ComponentCase } from "./components";
import { expectNoChanges, hydrate, serverRendered } from "./harness/hydration";
import { stateNames, watchConsole } from "./harness/page";
import type { Scene, SceneProps } from "./harness/scene";
import {
    renderOnServer,
    SERVER_START_TIMEOUT,
    startServer,
} from "./harness/server";
import {
    countedSeedTheme,
    generated,
    importSeedGenerator,
} from "./harness/themes";

// The emulated scheme belongs to the page, which later test files reuse: put it back, or a file
// that reads the page's colors (axe's contrast) runs in the dark scheme.
afterAll(() => commands.emulateColorScheme("light"));

beforeAll(startServer, SERVER_START_TIMEOUT);

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
                expectNoChanges(component, changes);
                expect(
                    host.querySelector(`[data-testid="${component.root}"]`),
                ).not.toBeNull();
            },
        );
    });
});

const stateful = COMPONENTS.filter((component) => component.state);

// Both web bindings serialize textarea values as content, not value attributes. Native has no
// HTML textarea/hydration boundary; its controlled TextInput behavior is covered in Native tests.
describe.each(["Textarea", "TextArea"] as const)(
    "controlled Textarea content (%s)",
    (component) => {
        it.each(['First line\n<escaped> & "quoted"', "\nLeading newline", ""])(
            "preserves server content through hydration and owner updates (%j)",
            async (value) => {
                const scene: Scene = { component, props: { value } };
                const server = await serverRendered(scene);
                const rendered = server.querySelector("textarea")!;
                expect(rendered.textContent).toBe(value);
                expect(rendered.value).toBe(value);
                expect(rendered.querySelector("escaped")).toBeNull();
                server.remove();

                const host = await serverRendered(scene);
                const original = host.querySelector("textarea")!;
                const console = watchConsole();
                try {
                    const mounted = await harness.hydrate(scene, host);
                    await harness.settle();
                    expect(host.querySelector("textarea")).toBe(original);
                    expect(original.value).toBe(value);
                    await mounted.update({ value: "Updated\n& <text>" });
                    expect(original.value).toBe("Updated\n& <text>");
                    expect(console.logged).toEqual([]);
                } finally {
                    console.stop();
                }
            },
        );
    },
);

describe.each(stateful)("$component, state", (component) => {
    const state = component.state!;
    const names = stateNames(state.prop);

    it.runIf(state.serverRendered !== false).each([
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

const controls = COMPONENTS.filter((component) => component.form);

describe.each(controls)("$component, fieldsets", (component) => {
    it.each([
        [
            "a disabled fieldset disables it",
            `<fieldset disabled><div data-host></div></fieldset>`,
            true,
        ],
        [
            "the first legend of a disabled fieldset leaves it enabled",
            `<fieldset disabled><legend><div data-host></div></legend></fieldset>`,
            false,
        ],
    ])("hydrated: %s", async (_, around, disabled) => {
        const { host, logged } = await hydrate(sceneOf(component, {}), around);
        expect(logged).toEqual([]);
        expect(component.form!.disabled(host)).toBe(disabled);
        expect(component.form!.control(host).matches(":disabled")).toBe(
            disabled,
        );
    });
});

describe.each(COMPONENTS)("$component, a named theme", (component) => {
    it("renders the theme's attributes on the server and hydrates without a change", async () => {
        const scene: Scene = {
            ...sceneOf(component, {}),
            provider: { theme: "teal" },
        };
        const attributes = registry.themeAttributes("teal");
        const rendered = await serverRendered(scene);
        for (const [name, value] of Object.entries(attributes)) {
            expect(rendered.firstElementChild!.getAttribute(name)).toBe(value);
        }
        rendered.remove();
        const { host, logged, changes } = await hydrate(scene);
        expect(logged).toEqual([]);
        expectNoChanges(component, changes);
        for (const [name, value] of Object.entries(attributes)) {
            expect(host.firstElementChild!.getAttribute(name)).toBe(value);
        }
    });
});

/** The seed the runtime theme cases generate from: the config's teal theme's. */
const SEED = "#006A60";

describe.each(COMPONENTS)("$component, a runtime theme", (component) => {
    const attribute = registry.themeAttribute ?? "data-theme";
    const scope = themeScope(countedSeedTheme({ seed: SEED }));
    const selector = `[${attribute}="${scope}"]`;
    const scene = (provider: Scene["provider"]): Scene => ({
        ...sceneOf(component, {}),
        provider,
    });
    const blocks = () =>
        [...document.head.querySelectorAll("style")].filter((style) =>
            style.textContent?.startsWith(selector),
        );

    it("renders its scope and its block on the server", async () => {
        const { html, head } = await renderOnServer(scene({ seed: SEED }));
        expect(html).toContain(`${attribute}="${scope}"`);
        expect(head).toContain(`${selector} {`);
        expect(head).toContain("@media (prefers-color-scheme: dark)");
    });

    it.each(["light", "dark"] as const)(
        "hydrates in the %s scheme keeping the server's block, and generates nothing",
        async (scheme) => {
            await commands.emulateColorScheme(scheme);
            const before = generated.count;
            const { host, logged, changes } = await hydrate(
                scene({ seed: SEED }),
            );
            expect(logged).toEqual([]);
            expectNoChanges(component, changes);
            expect(host.firstElementChild!.getAttribute(attribute)).toBe(scope);
            expect(blocks()).toHaveLength(1);
            expect(generated.count).toBe(before);
            // The block applies: the root reads the theme's colors.
            const root = byTestIdIn(host, component.root);
            expect(
                getComputedStyle(root)
                    .getPropertyValue("--colors-primary-light")
                    .trim(),
            ).toBe(
                /--colors-primary-light: ([^;]+);/.exec(
                    blocks()[0]!.textContent!,
                )![1],
            );
        },
    );

    it("hydrates with regenerate, generating the same block", async () => {
        // The first time in this page, the provider loads the generator after hydrating. The
        // first import of Material's generator has the dev server transform its sources, which a
        // busy machine can stretch past any wait, so it happens here first; the provider still
        // loads the counted source itself, after hydrating.
        await importSeedGenerator();
        const server = await serverRendered(
            scene({ seed: SEED, hydrate: "regenerate" }),
        );
        const css = blocks()[0]!.textContent;
        server.remove();
        const before = generated.count;
        const { logged, changes } = await hydrate(
            scene({ seed: SEED, hydrate: "regenerate" }),
        );
        // A load that fails warns rather than generating. The effect that loads can run late on a
        // busy machine.
        const loading = watchConsole();
        try {
            await vi.waitFor(
                () => {
                    expect(loading.logged).toEqual([]);
                    expect(generated.count).toBeGreaterThan(before);
                },
                { timeout: 5_000 },
            );
        } finally {
            loading.stop();
        }
        await harness.settle();
        expect(logged).toEqual([]);
        expectNoChanges(component, changes);
        expect(blocks()).toHaveLength(1);
        expect(blocks()[0]!.textContent).toBe(css);
    });

    it("renders overrides on the server and hydrates without a change", async () => {
        const overrides = { "colors.primary": "rgb(255, 0, 0)" };
        const { host, logged, changes } = await hydrate(scene({ overrides }));
        expect(logged).toEqual([]);
        expectNoChanges(component, changes);
        const provider = host.firstElementChild as HTMLElement;
        expect(provider.style.getPropertyValue("--colors-primary")).toBe(
            "rgb(255, 0, 0)",
        );
    });
});

/** The element under `host` with this test id. */
const byTestIdIn = (host: HTMLElement, id: string): HTMLElement =>
    host.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
