// The button and checkbox in their variants and states, styled by the Panda target through the
// registry generated in `.pureform/`.

import type { Direction } from "@pureform/react";
import { PureformProvider } from "@pureform/react";
import { Button } from "@pureform/react/button";
import { Checkbox } from "@pureform/react/checkbox";
import type { CheckedState } from "@pureform/react/checkbox";
import { type CSSProperties, type ReactNode, useState } from "react";

import { registry } from "../.pureform";

const VARIANTS = ["filled", "tonal", "outlined", "text", "elevated"] as const;
const SIZES = ["small", "medium", "large"] as const;
const COLORS = ["primary", "secondary", "tertiary", "error"] as const;

const row: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "16px",
};

function Section(props: { title: string; children: ReactNode }): ReactNode {
    return (
        <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "1.125rem" }}>{props.title}</h2>
            {props.children}
        </section>
    );
}

const FRUITS = ["Apples", "Pears", "Plums"] as const;

/** A parent checkbox over three children: indeterminate while some are checked. */
function AllFruits(): ReactNode {
    const [picked, setPicked] = useState<readonly string[]>(["Pears"]);
    const all: CheckedState =
        picked.length === FRUITS.length
            ? true
            : picked.length === 0
              ? false
              : "indeterminate";
    return (
        <div style={{ display: "grid", gap: "4px" }}>
            <span style={row}>
                <Checkbox
                    aria-label="All fruits"
                    checked={all}
                    onCheckedChange={({ checked }) =>
                        setPicked(checked === true ? FRUITS : [])
                    }
                />
                All fruits
            </span>
            {FRUITS.map((fruit) => (
                <span
                    key={fruit}
                    style={{ ...row, paddingInlineStart: "32px" }}
                >
                    <Checkbox
                        aria-label={fruit}
                        checked={picked.includes(fruit)}
                        onCheckedChange={({ checked }) =>
                            setPicked((current) =>
                                checked === true
                                    ? [...current, fruit]
                                    : current.filter((name) => name !== fruit),
                            )
                        }
                    />
                    {fruit}
                </span>
            ))}
        </div>
    );
}

/** A form whose submission shows what it sent. */
function Form(): ReactNode {
    const [sent, setSent] = useState("");
    return (
        <form
            style={{ display: "grid", gap: "12px", justifyItems: "start" }}
            onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(
                    event.currentTarget,
                    (event.nativeEvent as SubmitEvent).submitter,
                );
                setSent(new URLSearchParams(data as never).toString());
            }}
        >
            <span style={row}>
                <Checkbox name="terms" ids={{ input: "terms" }} required />
                <label htmlFor="terms">I accept the terms</label>
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
            <span style={row}>
                <Button label="Send" type="submit" name="action" value="send" />
                <Button label="Reset" type="reset" variant="outlined" />
            </span>
            <output>{sent && `Sent: ${sent}`}</output>
        </form>
    );
}

export function App(): ReactNode {
    const [dir, setDir] = useState<Direction>("ltr");
    return (
        <PureformProvider registry={registry} dir={dir}>
            <div
                style={{
                    display: "grid",
                    gap: "32px",
                    padding: "32px",
                    maxWidth: "960px",
                }}
            >
                <header style={{ ...row, justifyContent: "space-between" }}>
                    <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
                        pureform, React on Panda
                    </h1>
                    <Button
                        label={
                            dir === "ltr" ? "Right to left" : "Left to right"
                        }
                        variant="text"
                        onClick={() => setDir(dir === "ltr" ? "rtl" : "ltr")}
                    />
                </header>

                <Section title="Button variants">
                    <div style={row}>
                        {VARIANTS.map((variant) => (
                            <Button
                                key={variant}
                                label={variant}
                                variant={variant}
                            />
                        ))}
                    </div>
                    <div style={row}>
                        {VARIANTS.map((variant) => (
                            <Button
                                key={variant}
                                label={variant}
                                variant={variant}
                                disabled
                            />
                        ))}
                    </div>
                </Section>

                <Section title="Button sizes, colors, icons, and toggles">
                    <div style={row}>
                        {SIZES.map((size) => (
                            <Button
                                key={size}
                                label={size}
                                size={size}
                                icon="+"
                            />
                        ))}
                    </div>
                    <div style={row}>
                        {COLORS.map((color) => (
                            <Button
                                key={color}
                                label={color}
                                color={color}
                                variant="tonal"
                            />
                        ))}
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
            </div>
        </PureformProvider>
    );
}
