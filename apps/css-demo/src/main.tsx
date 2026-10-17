// pureform on plain CSS, no Panda and no Tailwind: Solid's components and the registry's class
// factories, styled by the stylesheet the CSS target writes into `.pureform/`. The button and
// checkbox are `@pureform/solid`'s components; the rest are plain elements classed through
// `useClasses`, until their components exist.

import "@pureform/css-adapter/reset.css";
import "../.pureform/styles.css";
import { PureformProvider, useClasses } from "@pureform/solid";
import type { Direction } from "@pureform/solid";
import { Button } from "@pureform/solid/button";
import { Checkbox } from "@pureform/solid/checkbox";
import { Dynamic, render } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
import { For, createSignal } from "solid-js";

import { registry, themes } from "../.pureform";

type Theme = (typeof themes)[number];

const VARIANTS = ["filled", "tonal", "outlined", "text", "elevated"] as const;

const row: JSX.CSSProperties = {
    display: "flex",
    "flex-wrap": "wrap",
    gap: "12px",
    "align-items": "center",
};

const PICTURE = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#7aa6c2"/><circle cx="90" cy="18" r="10" fill="#f4d35e"/><path d="M0 60 40 22l30 30 20-14 30 22z" fill="#386641"/></svg>',
)}`;

function Heading(props: {
    level: "h1" | "h2" | "h3";
    style: "headlineMedium" | "titleLarge" | "titleMedium";
    children: JSX.Element;
}): JSX.Element {
    const classes = useClasses("text", () => ({ style: props.style }));
    return (
        <Dynamic component={props.level} class={classes().root.class}>
            {props.children}
        </Dynamic>
    );
}

function Section(props: { title: string; children: JSX.Element }): JSX.Element {
    return (
        <section style={{ display: "grid", gap: "12px" }}>
            <Heading level="h2" style="titleLarge">
                {props.title}
            </Heading>
            {props.children}
        </section>
    );
}

function IconButton(props: {
    shape: "none" | "cookie9Sided" | "clover4Leaf" | "sunny";
}): JSX.Element {
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

function Fab(props: { shape: "arch" | "pill" }): JSX.Element {
    const classes = useClasses("fab", () => ({ shape: props.shape }));
    return (
        <button
            class={classes().root.class}
            type="button"
            aria-label={`${props.shape} FAB`}
        >
            <span class={classes().touchTarget.class} />
            <span class={classes().container.class}>
                <span class={classes().icon.class}>+</span>
            </span>
        </button>
    );
}

function Avatar(props: { size: "small" | "medium" | "large" }): JSX.Element {
    const classes = useClasses("avatar", () => ({
        size: props.size,
        shape: "cookie9Sided",
    }));
    return (
        <span class={classes().root.class} role="img" aria-label="Ada Lovelace">
            AL
        </span>
    );
}

function TextField(props: { variant: "filled" | "outlined" }): JSX.Element {
    const classes = useClasses("textField", () => ({ variant: props.variant }));
    const id = `field-${props.variant}`;
    return (
        <div class={classes().root.class} style={{ width: "240px" }}>
            <div class={classes().container.class}>
                <input class={classes().input.class} id={id} placeholder=" " />
                <label class={classes().label.class} for={id}>
                    {props.variant} field
                </label>
            </div>
            <span class={classes().supportingText.class}>Supporting text</span>
        </div>
    );
}

function Switch(): JSX.Element {
    const classes = useClasses("switchControl", () => ({}));
    return (
        <label class={classes().root.class} title="switch">
            <span class={classes().touchTarget.class} />
            <input
                class={classes().input.class}
                type="checkbox"
                role="switch"
                checked
            />
            <span class={classes().track.class}>
                <span class={classes().stateLayer.class} />
                <span class={classes().handle.class}>
                    <span class={classes().icon.class}>✓</span>
                </span>
            </span>
        </label>
    );
}

function Artwork(): JSX.Element {
    const card = useClasses("card", () => ({ variant: "elevated" }));
    const media = useClasses("media", () => ({ aspect: "landscape" }));
    const body = useClasses("text", () => ({ style: "bodyMedium" }));
    return (
        <article
            class={card().root.class}
            style={{ width: "240px", display: "grid", gap: "12px" }}
        >
            <img class={media().root.class} src={PICTURE} alt="" />
            <Heading level="h3" style="titleMedium">
                Hills at dusk
            </Heading>
            <p class={body().root.class}>Styled by the plain CSS target.</p>
        </article>
    );
}

function App(): JSX.Element {
    const [theme, setTheme] = createSignal<Theme | undefined>(undefined);
    const [dir, setDir] = createSignal<Direction>("ltr");
    // The CSS follows the system's scheme unless the root has `.light` or `.dark`.
    const pickScheme = (scheme: "light" | "dark") => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(scheme);
    };
    return (
        // The provider writes the theme's attribute (`data-theme="teal"`) and `dir` on its element.
        <PureformProvider registry={registry} theme={theme()} dir={dir()}>
            <div
                style={{
                    display: "grid",
                    gap: "32px",
                    padding: "32px",
                    "min-height": "100dvh",
                    background: "var(--colors-surface)",
                    color: "var(--colors-on-surface)",
                }}
            >
                <Heading level="h1" style="headlineMedium">
                    pureform, Solid on plain CSS
                </Heading>
                <div style={row}>
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
                    <Button
                        label={
                            dir() === "ltr" ? "Right to left" : "Left to right"
                        }
                        variant="text"
                        onClick={() => setDir(dir() === "ltr" ? "rtl" : "ltr")}
                    />
                </div>
                <Section title="Buttons">
                    <div style={row}>
                        <For each={VARIANTS}>
                            {(variant) => (
                                <Button label={variant} variant={variant} />
                            )}
                        </For>
                        <Button
                            label="Next"
                            icon="→"
                            mirrorIcon
                            variant="tonal"
                        />
                    </div>
                </Section>
                <Section title="Shapes">
                    <div style={row}>
                        <For
                            each={
                                [
                                    "none",
                                    "cookie9Sided",
                                    "clover4Leaf",
                                    "sunny",
                                ] as const
                            }
                        >
                            {(shape) => <IconButton shape={shape} />}
                        </For>
                        <Fab shape="arch" />
                        <Fab shape="pill" />
                        <For each={["small", "medium", "large"] as const}>
                            {(size) => <Avatar size={size} />}
                        </For>
                    </div>
                </Section>
                <Section title="Fields">
                    <div style={row}>
                        <TextField variant="filled" />
                        <TextField variant="outlined" />
                    </div>
                </Section>
                <Section title="Controls">
                    <div style={row}>
                        <Checkbox aria-label="Checked" defaultChecked />
                        <Checkbox
                            aria-label="Indeterminate"
                            defaultChecked="indeterminate"
                        />
                        <Checkbox aria-label="Unchecked" />
                        <Switch />
                    </div>
                </Section>
                <Section title="Media">
                    <Artwork />
                </Section>
            </div>
        </PureformProvider>
    );
}

render(() => <App />, document.getElementById("app")!);
