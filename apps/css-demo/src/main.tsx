// pureform on plain CSS, no Panda and no Tailwind: `@pureform/solid`'s components, styled by the
// stylesheet the CSS target writes into `.pureform/`.

import "@pureform/css-adapter/reset.css";
import "../.pureform/styles.css";
import { PureformProvider } from "@pureform/solid";
import type { Direction } from "@pureform/solid";
import { Avatar } from "@pureform/solid/avatar";
import { Button } from "@pureform/solid/button";
import { Card } from "@pureform/solid/card";
import { Checkbox } from "@pureform/solid/checkbox";
import { Fab } from "@pureform/solid/fab";
import { IconButton } from "@pureform/solid/icon-button";
import { Media } from "@pureform/solid/media";
import { Switch } from "@pureform/solid/switch";
import { Text } from "@pureform/solid/text";
import { TextField } from "@pureform/solid/text-field";
import { render } from "@solidjs/web";
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

function Section(props: { title: string; children: JSX.Element }): JSX.Element {
    return (
        <section style={{ display: "grid", gap: "12px" }}>
            <Text as="h2" textStyle="titleLarge">
                {props.title}
            </Text>
            {props.children}
        </section>
    );
}

function Artwork(): JSX.Element {
    return (
        <Card
            as="article"
            variant="elevated"
            style={{ root: { width: "240px", display: "grid", gap: "12px" } }}
        >
            <Media src={PICTURE} alt="" aspect="landscape" />
            <Text as="h3" textStyle="titleMedium">
                Hills at dusk
            </Text>
            <Text as="p" textStyle="bodyMedium">
                Styled by the plain CSS target.
            </Text>
        </Card>
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
                <Text as="h1" textStyle="headlineMedium">
                    pureform, Solid on plain CSS
                </Text>
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
                            {(shape) => (
                                <IconButton
                                    icon="★"
                                    aria-label={shape}
                                    variant="filled"
                                    shape={shape}
                                />
                            )}
                        </For>
                        <Fab icon="+" aria-label="arch FAB" shape="arch" />
                        <Fab icon="+" aria-label="pill FAB" shape="pill" />
                        <For each={["small", "medium", "large"] as const}>
                            {(size) => (
                                <Avatar
                                    label="Ada Lovelace"
                                    size={size}
                                    shape="cookie9Sided"
                                >
                                    AL
                                </Avatar>
                            )}
                        </For>
                    </div>
                </Section>
                <Section title="Fields">
                    <div style={row}>
                        <For each={["filled", "outlined"] as const}>
                            {(variant) => (
                                <TextField
                                    variant={variant}
                                    label={`${variant} field`}
                                    supportingText="Supporting text"
                                    style={{ root: { width: "240px" } }}
                                />
                            )}
                        </For>
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
                        <Switch
                            aria-label="switch"
                            icon="✓"
                            defaultChecked
                        />
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
