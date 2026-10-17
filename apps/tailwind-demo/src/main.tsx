// pureform's components and tokens in Tailwind: Solid's components and the registry's class
// factories, styled by the Tailwind stylesheet the Tailwind target writes into `.pureform/`. The
// layout and page colors are utilities over pureform's tokens, and utilities override a
// component's own style.

import "./app.css";
import { PureformProvider, useClasses } from "@pureform/solid";
import { Button } from "@pureform/solid/button";
import { Checkbox } from "@pureform/solid/checkbox";
import { render } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
import { For, createSignal } from "solid-js";

import { registry, themes } from "../.pureform";

type Theme = (typeof themes)[number];

const VARIANTS = ["filled", "tonal", "outlined", "text", "elevated"] as const;

const PICTURE = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#7aa6c2"/><circle cx="90" cy="18" r="10" fill="#f4d35e"/><path d="M0 60 40 22l30 30 20-14 30 22z" fill="#386641"/></svg>',
)}`;

function Row(props: { children: JSX.Element }): JSX.Element {
    return (
        <div class="flex flex-wrap items-center gap-3">{props.children}</div>
    );
}

function Section(props: { title: string; children: JSX.Element }): JSX.Element {
    return (
        <section class="grid gap-3">
            <h2 class="font-plain text-title-large text-on-surface-variant">
                {props.title}
            </h2>
            {props.children}
        </section>
    );
}

function IconButton(props: { shape: "cookie9Sided" | "sunny" }): JSX.Element {
    const classes = useClasses("iconButton", () => ({
        variant: "filled",
        shape: props.shape,
    }));
    return (
        <button
            class={classes().root.class}
            type="button"
            aria-label={props.shape}
        >
            <span class={classes().touchTarget.class} />
            <span class={classes().container.class}>★</span>
        </button>
    );
}

function TextField(): JSX.Element {
    const classes = useClasses("textField", () => ({ variant: "outlined" }));
    return (
        <div class={`${classes().root.class} w-60`}>
            <div class={classes().container.class}>
                <input
                    class={classes().input.class}
                    id="field"
                    placeholder=" "
                />
                <label class={classes().label.class} for="field">
                    outlined field
                </label>
            </div>
            <span class={classes().supportingText.class}>Supporting text</span>
        </div>
    );
}

function Artwork(): JSX.Element {
    const card = useClasses("card", () => ({ variant: "filled" }));
    const media = useClasses("media", () => ({ aspect: "landscape" }));
    const title = useClasses("text", () => ({ style: "titleMedium" }));
    return (
        <article class={`${card().root.class} grid w-60 gap-3 p-4`}>
            <img class={media().root.class} src={PICTURE} alt="" />
            <h3 class={title().root.class}>Hills at dusk</h3>
            <p class="text-body-medium text-on-surface-variant">
                A filled card, padded with Tailwind.
            </p>
        </article>
    );
}

function App(): JSX.Element {
    const [theme, setTheme] = createSignal<Theme | undefined>(undefined);
    // The stylesheet follows the system's scheme unless the root has `.light` or `.dark`.
    const pickScheme = (scheme: "light" | "dark") => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(scheme);
    };
    return (
        // The provider writes the theme's attribute (`data-theme="teal"`) on its element, which
        // the adapter's `theme-teal:` variant matches too.
        <PureformProvider registry={registry} theme={theme()}>
            <div class="grid min-h-dvh gap-8 bg-surface p-8 text-on-surface">
                <h1 class="text-headline-medium">
                    pureform, Solid on Tailwind
                </h1>
                <Row>
                    <For each={["light", "dark"] as const}>
                        {(scheme) => (
                            <Button
                                label={scheme}
                                variant="outlined"
                                onClick={() => pickScheme(scheme)}
                            />
                        )}
                    </For>
                    <Button
                        label="base theme"
                        variant="outlined"
                        onClick={() => setTheme(undefined)}
                    />
                    <For each={themes}>
                        {(name) => (
                            <Button
                                label={`${name} theme`}
                                variant="outlined"
                                onClick={() => setTheme(name)}
                            />
                        )}
                    </For>
                </Row>
                <Section title="Buttons">
                    <Row>
                        <For each={VARIANTS}>
                            {(variant) => (
                                <Button label={variant} variant={variant} />
                            )}
                        </For>
                    </Row>
                </Section>
                {/* Utilities sit in a later layer than components, so they win without
                    !important. */}
                <Section title="Overridden by utilities">
                    <Row>
                        <Button
                            label="rounded-none"
                            class={{ root: "rounded-none" }}
                        />
                        <Button
                            label="px-10"
                            variant="outlined"
                            class={{ root: "px-10" }}
                        />
                        <IconButton shape="cookie9Sided" />
                        <IconButton shape="sunny" />
                    </Row>
                </Section>
                <Section title="Fields and controls">
                    <Row>
                        <TextField />
                        <Checkbox aria-label="Checked" defaultChecked />
                        <Checkbox aria-label="Unchecked" />
                    </Row>
                </Section>
                {/* Theme variants from the adapter: `dark:` and `theme-teal:` follow the same
                    scopes as the components' own tokens. */}
                <Section title="Card and tokens">
                    <Row>
                        <Artwork />
                        <span class="rounded-full bg-primary-container px-3 py-1 text-label-large text-on-primary-container dark:outline-2 dark:outline-primary theme-teal:rounded-small">
                            badge
                        </span>
                    </Row>
                </Section>
            </div>
        </PureformProvider>
    );
}

render(() => <App />, document.getElementById("app")!);
