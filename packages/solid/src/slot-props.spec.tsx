import { buttonAnatomy } from "@pureform/anatomy";
import { createSignal, flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";

import { createSlotProps } from "./parts";
import type { SlotKeyedProps } from "./parts";
import { byTestId, mount } from "./testing/mount";

type Props = SlotKeyedProps<
    typeof buttonAnatomy,
    never,
    { label: { index: number } }
>;

function Label(props: Props & { readonly index?: number }) {
    const slots = createSlotProps<
        typeof buttonAnatomy,
        never,
        { label: { index: number } }
    >(props);
    const instance = () => ({ index: props.index ?? 0 });
    // createSlotProps invokes this accessor inside its live merge, not during setup.
    const label = slots("label", instance);
    return <span data-testid="label" {...label} />;
}

describe("createSlotProps", () => {
    it("follows plain to per-instance to absent customization without replacing the element", () => {
        const [classes, setClasses] = createSignal<Props["class"]>({
            label: "plain",
        });
        const [index, setIndex] = createSignal(1);
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            mount(() => <Label class={classes()} index={index()} />);
            const label = byTestId("label");
            expect(label.className).toBe("plain");
            setClasses({ label: (copy) => `copy-${copy.index}` });
            flush();
            expect(label.className).toBe("copy-1");
            setIndex(2);
            flush();
            expect(label.className).toBe("copy-2");
            setClasses({ label: "plain-again" });
            flush();
            expect(label.className).toBe("plain-again");
            setClasses(undefined);
            flush();
            expect(label.className).toBe("");
            expect(byTestId("label")).toBe(label);
            expect(warn).not.toHaveBeenCalled();
        } finally {
            warn.mockRestore();
        }
    });

    it("adds and removes slotProps keys, and a class or style set there gives way to the keyed ones", () => {
        const [overrides, setOverrides] = createSignal<Props["slotProps"]>();
        const style: Props["style"] = { label: { color: "red" } };
        mount(() => (
            <Label
                slotProps={overrides()}
                class={{ label: "keyed" }}
                style={style}
            />
        ));
        const label = byTestId("label");
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        // Keys the types leave out, passed through to reach the runtime check.
        const untyped1: object = {
            class: "slot",
            style: { "margin-top": "4px" },
        };
        setOverrides({
            label: {
                title: "added",
                ...untyped1,
            },
        });
        flush();
        expect(label.title).toBe("added");
        expect(label.className).toBe("keyed");
        expect(label.style.color).toBe("red");
        expect(label.style.marginTop).toBe("");
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('slotProps.label ignored "class", "style"'),
        );
        warn.mockRestore();
        setOverrides(undefined);
        flush();
        expect(label.hasAttribute("title")).toBe(false);
        expect(label.className).toBe("keyed");
    });

    it("does not evaluate instance data or customizations of an unconsumed part", () => {
        const instance = vi.fn<() => { index: number }>(() => ({ index: 1 }));
        const other = vi.fn<() => string>(() => "unused");
        function Plain() {
            const slots = createSlotProps<
                typeof buttonAnatomy,
                never,
                { label: { index: number } }
            >({
                class: {
                    label: "plain",
                    get root() {
                        return other();
                    },
                },
            });
            const label = slots("label", instance);
            return <span {...label} />;
        }
        mount(() => <Plain />);
        expect(instance).not.toHaveBeenCalled();
        expect(other).not.toHaveBeenCalled();
    });

    it("keeps getters and nested data on the reactive path even in literal customization", () => {
        const [title, setTitle] = createSignal("first");
        const [active, setActive] = createSignal(true);
        function WithGetters() {
            const slots = createSlotProps<typeof buttonAnatomy>({
                class: {
                    label: {
                        get active() {
                            return active();
                        },
                    },
                },
                slotProps: {
                    label: {
                        get title() {
                            return title();
                        },
                    },
                },
            });
            const label = slots("label");
            return <span data-testid="label" {...label} />;
        }
        mount(() => <WithGetters />);
        const label = byTestId("label");
        expect(label.title).toBe("first");
        expect(label.className).toBe("active");
        setTitle("second");
        setActive(false);
        flush();
        expect(label.title).toBe("second");
        expect(label.className).toBe("");
    });

    it("resolves changing instance data for styles and slot props, not just classes", () => {
        const [index, setIndex] = createSignal(1);
        const [overrides, setOverrides] = createSignal<Props["slotProps"]>({
            label: { title: "plain" },
        });
        const [styles, setStyles] = createSignal<Props["style"]>({
            label: { opacity: 1 },
        });
        mount(() => (
            <Label index={index()} slotProps={overrides()} style={styles()} />
        ));
        const label = byTestId("label");
        setOverrides({ label: (copy) => ({ title: `copy-${copy.index}` }) });
        setStyles({ label: (copy) => ({ opacity: copy.index / 10 }) });
        flush();
        expect(label.title).toBe("copy-1");
        expect(label.style.opacity).toBe("0.1");
        setIndex(2);
        flush();
        expect(label.title).toBe("copy-2");
        expect(label.style.opacity).toBe("0.2");
    });
});
