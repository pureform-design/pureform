import type { Direction } from "@pureform/solid";
import { PureformProvider } from "@pureform/solid";
import { Button } from "@pureform/solid/button";
import { Checkbox } from "@pureform/solid/checkbox";
import type { CheckedState } from "@pureform/solid/checkbox";
import type { JSX } from "@solidjs/web";
import { createFileRoute } from "@tanstack/solid-router";
import { For, createMemo, createSignal } from "solid-js";

import { registry } from "../../.pureform";

export const Route = createFileRoute("/components")({
    head: () => ({ meta: [{ title: "Components" }] }),
    component: ComponentsRoute,
});

// The button and checkbox from `@pureform/solid` in their variants and states, styled by the
// Panda target through the registry generated in `.pureform/`. React's demo
// (`apps/react-demo`) renders the same page.

const VARIANTS = ["filled", "tonal", "outlined", "text", "elevated"] as const;
const SIZES = ["small", "medium", "large"] as const;
const COLORS = ["primary", "secondary", "tertiary", "error"] as const;

const row: JSX.CSSProperties = {
    display: "flex",
    "flex-wrap": "wrap",
    "align-items": "center",
    gap: "16px",
};

function Section(props: { title: string; children: JSX.Element }): JSX.Element {
    return (
        <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ margin: 0, "font-size": "1.125rem" }}>
                {props.title}
            </h2>
            {props.children}
        </section>
    );
}

const FRUITS = ["Apples", "Pears", "Plums"] as const;

/** A parent checkbox over three children: indeterminate while some are checked. */
function AllFruits(): JSX.Element {
    const [picked, setPicked] = createSignal<readonly string[]>(["Pears"]);
    const all = createMemo<CheckedState>(() =>
        picked().length === FRUITS.length
            ? true
            : picked().length === 0
              ? false
              : "indeterminate",
    );
    return (
        <div style={{ display: "grid", gap: "4px" }}>
            <span style={row}>
                <Checkbox
                    aria-label="All fruits"
                    checked={all()}
                    onCheckedChange={({ checked }) =>
                        setPicked(checked === true ? FRUITS : [])
                    }
                />
                All fruits
            </span>
            <For each={FRUITS}>
                {(fruit) => (
                    <span style={{ ...row, "padding-inline-start": "32px" }}>
                        <Checkbox
                            aria-label={fruit}
                            checked={picked().includes(fruit)}
                            onCheckedChange={({ checked }) =>
                                setPicked((current) =>
                                    checked === true
                                        ? [...current, fruit]
                                        : current.filter(
                                              (name) => name !== fruit,
                                          ),
                                )
                            }
                        />
                        {fruit}
                    </span>
                )}
            </For>
        </div>
    );
}

/** A form whose submission shows what it sent. */
function Form(): JSX.Element {
    const [sent, setSent] = createSignal("");
    return (
        <form
            style={{ display: "grid", gap: "12px", "justify-items": "start" }}
            onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget, event.submitter);
                setSent(new URLSearchParams(data as never).toString());
            }}
        >
            <span style={row}>
                <Checkbox name="terms" ids={{ input: "terms" }} required />
                <label for="terms">I accept the terms</label>
            </span>
            <span style={row}>
                <Checkbox
                    aria-label="News"
                    name="news"
                    value="weekly"
                    defaultChecked
                />
                Send me news
            </span>
            <fieldset
                disabled
                style={{ ...row, border: "none", padding: 0, margin: 0 }}
            >
                <Checkbox
                    aria-label="Archived"
                    name="archived"
                    defaultChecked
                />
                In a disabled fieldset
            </fieldset>
            <span style={row}>
                <Button label="Send" type="submit" name="action" value="send" />
                <Button label="Reset" type="reset" variant="outlined" />
            </span>
            <output>{sent() && `Sent: ${sent()}`}</output>
        </form>
    );
}

function ComponentsRoute(): JSX.Element {
    const [dir, setDir] = createSignal<Direction>("ltr");
    return (
        <PureformProvider registry={registry} dir={dir()}>
            <main
                style={{
                    display: "grid",
                    gap: "32px",
                    padding: "32px",
                    "max-width": "960px",
                }}
            >
                <header style={{ ...row, "justify-content": "space-between" }}>
                    <h1 style={{ margin: 0, "font-size": "1.5rem" }}>
                        pureform, Solid on Panda
                    </h1>
                    <Button
                        label={
                            dir() === "ltr" ? "Right to left" : "Left to right"
                        }
                        variant="text"
                        onClick={() => setDir(dir() === "ltr" ? "rtl" : "ltr")}
                    />
                </header>

                <Section title="Button variants">
                    <div style={row}>
                        <For each={VARIANTS}>
                            {(variant) => (
                                <Button label={variant} variant={variant} />
                            )}
                        </For>
                    </div>
                    <div style={row}>
                        <For each={VARIANTS}>
                            {(variant) => (
                                <Button
                                    label={variant}
                                    variant={variant}
                                    disabled
                                />
                            )}
                        </For>
                    </div>
                </Section>

                <Section title="Button sizes, colors, icons, and toggles">
                    <div style={row}>
                        <For each={SIZES}>
                            {(size) => (
                                <Button label={size} size={size} icon="+" />
                            )}
                        </For>
                    </div>
                    <div style={row}>
                        <For each={COLORS}>
                            {(color) => (
                                <Button
                                    label={color}
                                    color={color}
                                    variant="tonal"
                                />
                            )}
                        </For>
                    </div>
                    <div style={row}>
                        <Button
                            label="Next"
                            icon="→"
                            mirrorIcon
                            variant="outlined"
                        />
                        <Button
                            label="Bold"
                            defaultSelected={false}
                            variant="tonal"
                        />
                        <Button.Root variant="text">
                            <Button.TouchTarget />
                            <Button.Label>Composed</Button.Label>
                        </Button.Root>
                    </div>
                </Section>

                <Section title="Checkbox states">
                    <div style={row}>
                        <Checkbox aria-label="Unchecked" />
                        <Checkbox aria-label="Checked" defaultChecked />
                        <Checkbox
                            aria-label="Indeterminate"
                            defaultChecked="indeterminate"
                        />
                        <Checkbox aria-label="Error" color="error" invalid />
                        <Checkbox aria-label="Disabled" disabled />
                        <Checkbox
                            aria-label="Disabled and checked"
                            disabled
                            defaultChecked
                        />
                        <Checkbox
                            aria-label="Read-only"
                            readOnly
                            defaultChecked
                        />
                    </div>
                    <AllFruits />
                </Section>

                <Section title="Forms">
                    <Form />
                </Section>
            </main>
        </PureformProvider>
    );
}
