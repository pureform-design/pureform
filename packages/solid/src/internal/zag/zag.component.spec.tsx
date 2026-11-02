import { render } from "@solidjs/web";
import * as checkbox from "@zag-js/checkbox";
import * as radio from "@zag-js/radio-group";
import * as zagSwitch from "@zag-js/switch";
import { createMemo, createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import {
    Key,
    mergeProps,
    normalizeProps,
    useMachine,
    useSyncExternalStore,
} from ".";

// The preset's `input` slot: a native input stretched invisibly over the whole control.
const OVERLAY = {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    opacity: "0",
    margin: "0",
} as const;
const BOX = {
    position: "relative",
    display: "inline-block",
    width: "40px",
    height: "40px",
} as const;

// Zag's hidden-input props, without its visually-hidden style, which the slot's replaces.
const overlaid = <P extends { style?: unknown }>(
    props: P,
): Omit<P, "style"> => {
    // oxlint-disable-next-line solid/reactivity -- Zag's plain props object, not a component's props
    const { style, ...rest } = props;
    void style;
    return rest;
};

let dispose: (() => void) | undefined;
afterEach(() => {
    dispose?.();
    document.body.innerHTML = "";
});

const mount = (view: () => unknown) => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(view as never, host);
    flush();
    return host;
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const formData = (form: HTMLFormElement) =>
    [...new FormData(form)]
        .map(([k, v]) => `${k}=${typeof v === "string" ? v : v.name}`)
        .join("&");

type CheckboxProps = Partial<checkbox.Props>;

function Checkbox(props: { machine?: CheckboxProps }) {
    const service = useMachine(checkbox.machine, () => ({
        id: "cb",
        name: "cb",
        ...props.machine,
    }));
    const api = createMemo(() => checkbox.connect(service, normalizeProps));
    return (
        <label data-testid="cb" {...api().getRootProps()} style={BOX}>
            <span {...api().getControlProps()} />
            <input
                data-testid="cb-input"
                {...overlaid(api().getHiddenInputProps())}
                style={OVERLAY}
            />
        </label>
    );
}

const byTestId = (id: string) =>
    document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

describe("checkbox through the overlaid native input", () => {
    it("toggles on a pointer click, calls back once, and submits", async () => {
        const onCheckedChange =
            vi.fn<(details: checkbox.CheckedChangeDetails) => void>();
        mount(() => (
            <form data-testid="form">
                <Checkbox machine={{ onCheckedChange }} />
            </form>
        ));
        await settle();
        const root = byTestId("cb");
        expect(root.dataset.state).toBe("unchecked");

        await userEvent.click(root);
        await settle();

        expect(root.dataset.state).toBe("checked");
        expect(root.matches(":has(:checked)")).toBe(true);
        expect(onCheckedChange).toHaveBeenCalledTimes(1);
        expect(onCheckedChange).toHaveBeenCalledWith({ checked: true });
        expect(formData(byTestId("form") as HTMLFormElement)).toBe("cb=on");
    });

    it("toggles from the keyboard, and marks keyboard focus", async () => {
        mount(() => <Checkbox />);
        await settle();
        await userEvent.keyboard("{Tab}");
        await settle();
        const root = byTestId("cb");
        expect(document.activeElement).toBe(byTestId("cb-input"));
        expect(root.matches(":has(:focus-visible)")).toBe(true);

        await userEvent.keyboard(" ");
        await settle();
        expect(root.dataset.state).toBe("checked");
    });

    it("follows a controlled prop, and only asks to change", async () => {
        const [checked, setChecked] = createSignal(false);
        const onCheckedChange =
            vi.fn<(details: checkbox.CheckedChangeDetails) => void>();
        mount(() => (
            <Checkbox machine={{ checked: checked(), onCheckedChange }} />
        ));
        await settle();
        const root = byTestId("cb");

        await userEvent.click(root);
        await settle();
        expect(onCheckedChange).toHaveBeenCalledWith({ checked: true });
        expect(root.dataset.state).toBe("unchecked");

        setChecked(true);
        flush();
        await settle();
        expect(root.dataset.state).toBe("checked");
        expect(onCheckedChange).toHaveBeenCalledTimes(1);
    });
});

function Switch(props: {
    onCheckedChange?: (d: { checked: boolean }) => void;
}) {
    const service = useMachine(zagSwitch.machine, () => ({
        id: "sw",
        name: "sw",
        onCheckedChange: props.onCheckedChange,
    }));
    const api = createMemo(() => zagSwitch.connect(service, normalizeProps));
    return (
        <label data-testid="sw" {...api().getRootProps()} style={BOX}>
            <span {...api().getControlProps()} />
            <input {...overlaid(api().getHiddenInputProps())} style={OVERLAY} />
        </label>
    );
}

describe("switch through the overlaid native input", () => {
    it("toggles on a click and from the keyboard", async () => {
        const onCheckedChange = vi.fn<(d: { checked: boolean }) => void>();
        mount(() => <Switch onCheckedChange={onCheckedChange} />);
        await settle();
        const root = byTestId("sw");

        await userEvent.click(root);
        await settle();
        expect(root.dataset.state).toBe("checked");

        await userEvent.keyboard(" ");
        await settle();
        expect(root.dataset.state).toBe("unchecked");
        expect(onCheckedChange.mock.calls).toEqual([
            [{ checked: true }],
            [{ checked: false }],
        ]);
    });
});

function RadioGroup(props: {
    onValueChange?: (d: { value: string | null }) => void;
}) {
    const service = useMachine(radio.machine, () => ({
        id: "rg",
        name: "rg",
        defaultValue: "a",
        onValueChange: props.onValueChange,
    }));
    const api = createMemo(() => radio.connect(service, normalizeProps));
    return (
        <div {...api().getRootProps()}>
            {/* oxlint-disable-next-line solid/prefer-for -- a fixed fixture list, rendered once and never recreated */}
            {["a", "b", "c"].map((value) => (
                <label
                    data-testid={`rg-${value}`}
                    {...api().getItemProps({ value })}
                    style={BOX}
                >
                    <span {...api().getItemControlProps({ value })} />
                    <input
                        {...overlaid(api().getItemHiddenInputProps({ value }))}
                        style={OVERLAY}
                    />
                </label>
            ))}
        </div>
    );
}

describe("radio group through the overlaid native inputs", () => {
    it("selects on a click and moves with the arrow keys", async () => {
        const onValueChange = vi.fn<(d: { value: string | null }) => void>();
        mount(() => (
            <form data-testid="form">
                <RadioGroup onValueChange={onValueChange} />
            </form>
        ));
        await settle();
        const state = () =>
            ["a", "b", "c"].map((v) => byTestId(`rg-${v}`).dataset.state);
        expect(state()).toEqual(["checked", "unchecked", "unchecked"]);

        await userEvent.click(byTestId("rg-b"));
        await settle();
        expect(state()).toEqual(["unchecked", "checked", "unchecked"]);

        await userEvent.keyboard("{ArrowDown}");
        await settle();
        expect(state()).toEqual(["unchecked", "unchecked", "checked"]);
        expect(formData(byTestId("form") as HTMLFormElement)).toBe("rg=c");
        expect(onValueChange.mock.calls).toEqual([
            [{ value: "b" }],
            [{ value: "c" }],
        ]);
    });
});

describe("the port's pieces", () => {
    it("keys a list, keeping an item's element when the list reorders", async () => {
        type Item = { id: string; label: string };
        const [items, setItems] = createSignal<Item[]>([
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ]);
        const host = mount(() => (
            <ul>
                <Key each={items()} by="id">
                    {(item) => <li>{item().label}</li>}
                </Key>
            </ul>
        ));
        const first = host.querySelector("li")!;
        setItems([
            { id: "b", label: "B" },
            { id: "a", label: "A2" },
        ]);
        flush();
        await settle();
        const lis = [...host.querySelectorAll("li")];
        expect(lis.map((li) => li.textContent)).toEqual(["B", "A2"]);
        expect(lis[1]).toBe(first);
    });

    it("follows an external store once settled", async () => {
        let value = 1;
        const listeners = new Set<VoidFunction>();
        const host = mount(() => {
            const snapshot = useSyncExternalStore(
                (onChange) => {
                    listeners.add(onChange);
                    return () => listeners.delete(onChange);
                },
                () => value,
            );
            return <p>{snapshot()}</p>;
        });
        await settle();
        value = 2;
        listeners.forEach((fn) => fn());
        flush();
        await settle();
        expect(host.textContent).toBe("2");
        dispose?.();
        dispose = undefined;
        expect(listeners.size).toBe(0);
    });

    it("renames Zag's React-shaped props to Solid 2's", () => {
        const props = normalizeProps.element({
            tabIndex: 0,
            readOnly: true,
            htmlFor: "x",
            className: "c",
            onChange: () => {},
            onFocus: () => {},
            style: { marginTop: 2, "--x": "1" },
        } as never) as Record<string, unknown>;
        expect(Object.keys(props).sort()).toEqual(
            [
                "class",
                "for",
                "onFocusIn",
                "onInput",
                "readonly",
                "style",
                "tabindex",
            ].sort(),
        );
        expect(props.style).toEqual({ "margin-top": 2, "--x": "1" });
        expect(normalizeProps.element({ readOnly: false } as never)).toEqual(
            {},
        );
    });

    it("writes ARIA booleans as strings, which Solid 2 would write as empty attributes", () => {
        expect(
            normalizeProps.element({
                "aria-hidden": true,
                "aria-checked": false,
                "aria-label": "x",
            } as never),
        ).toEqual({
            "aria-hidden": "true",
            "aria-checked": "false",
            "aria-label": "x",
        });
    });

    it("merges classes and handlers, and lets later sources win otherwise", () => {
        const first = vi.fn<() => void>();
        const second = vi.fn<() => void>();
        const merged = mergeProps(
            { class: "a", onClick: first, id: "one" },
            () => ({ class: "b", onClick: second, id: "two" }),
        ) as { class: string; onClick: () => void; id: string };
        expect(merged.class).toBe("a b");
        expect(merged.id).toBe("two");
        merged.onClick();
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
    });
});
