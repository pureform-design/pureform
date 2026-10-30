import { compositeTestIds, testIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
import { attribution } from "solid-js/attribution";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Select } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { textInputsRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.select;
const menu = compositeTestIds.selectMenu;

const ITEMS = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium" },
    { value: "l", label: "Large", disabled: true },
];

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={textInputsRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
};

const item = (value: string) =>
    [
        ...document.querySelectorAll<HTMLElement>(
            `[data-testid="${menu.item}"]`,
        ),
    ].find((element) => element.dataset.value === value)!;

describe("Select, multiple", () => {
    const MANY = [
        { value: "s", label: "Small" },
        { value: "m", label: "Medium" },
        { value: "l", label: "Large" },
    ];

    it("toggles options without closing the list, reporting an array each time", async () => {
        const onValueChange =
            vi.fn<
                (details: ChangeDetails<"value", readonly string[]>) => void
            >();
        withRegistry(() => (
            <Select
                label="Size"
                multiple
                items={MANY}
                onValueChange={onValueChange}
            />
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await userEvent.click(input);
        await frames();
        await userEvent.click(item("s"));
        await userEvent.click(item("l"));
        expect(onValueChange).toHaveBeenNthCalledWith(1, { value: ["s"] });
        expect(onValueChange).toHaveBeenNthCalledWith(2, { value: ["s", "l"] });
        expect(input.getAttribute("aria-expanded")).toBe("true");
        expect(byTestId(menu.root).hidden).toBe(false);
        expect(input.value).toBe("Small, Large");
        expect(item("s").getAttribute("aria-selected")).toBe("true");
        expect(item("m").getAttribute("aria-selected")).toBe("false");
        expect(byTestId(menu.root).getAttribute("aria-multiselectable")).toBe(
            "true",
        );
        await userEvent.click(item("s"));
        expect(onValueChange).toHaveBeenLastCalledWith({ value: ["l"] });
        expect(input.value).toBe("Large");
    });

    it("toggles the highlighted option with Enter and Space, keeping the keys going", async () => {
        withRegistry(() => <Select label="Size" multiple items={MANY} />);
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        input.focus();
        await userEvent.keyboard("{ArrowDown}");
        await frames();
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await userEvent.keyboard("{ArrowDown} ");
        // The list opens on the first option, so these two are the second and third.
        expect(input.value).toBe("Medium, Large");
        expect(input.getAttribute("aria-expanded")).toBe("true");
        await userEvent.keyboard("{ArrowUp}{Enter}");
        expect(input.value).toBe("Large");
    });

    it("submits each chosen value under the same name, and resets to its default", async () => {
        const onValueChange =
            vi.fn<
                (details: ChangeDetails<"value", readonly string[]>) => void
            >();
        withRegistry(() => (
            <form>
                <Select
                    label="Size"
                    name="size"
                    multiple
                    items={MANY}
                    defaultValue={["s", "m"]}
                    onValueChange={onValueChange}
                />
            </form>
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        const form = input.closest("form")!;
        expect(new FormData(form).getAll("size")).toEqual(["s", "m"]);
        await userEvent.click(input);
        await frames();
        await userEvent.click(item("l"));
        await userEvent.click(item("s"));
        expect(new FormData(form).getAll("size")).toEqual(["m", "l"]);
        form.reset();
        await settle();
        await settle();
        expect(input.value).toBe("Small, Medium");
        expect(new FormData(form).getAll("size")).toEqual(["s", "m"]);
        expect(onValueChange).toHaveBeenLastCalledWith({
            value: ["s", "m"],
            reason: "reset",
        });
    });

    it("follows a controlled array, and takes a summary of the chosen options", async () => {
        const [value, setValue] = createSignal<readonly string[]>(["s"]);
        withRegistry(() => (
            <Select
                label="Size"
                multiple
                items={MANY}
                value={value()}
                summary={(chosen) =>
                    chosen.length > 1
                        ? `${chosen.length} sizes`
                        : (chosen[0]?.label ?? "")
                }
            />
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.value).toBe("Small");
        setValue(["s", "m", "l"]);
        await settle();
        expect(input.value).toBe("3 sizes");
        setValue([]);
        await settle();
        expect(input.value).toBe("");
    });
});

describe("Select, ready-made", () => {
    it("renders the field, a hidden select, and the list drawn as a menu", async () => {
        withRegistry(() => (
            <Select label="Size" items={ITEMS} defaultValue="m" name="size" />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toBe("select select--trailingIcon-true");
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.tagName).toBe("INPUT");
        expect(input.readOnly).toBe(true);
        expect(input.getAttribute("role")).toBe("combobox");
        expect(input.value).toBe("Medium");
        expect(input.getAttribute("aria-expanded")).toBe("false");
        expect(byTestId(ids.trailingIcon).querySelector("svg")).not.toBeNull();
        const hidden = byTestId<HTMLSelectElement>(ids.hiddenSelect);
        expect(hidden.className).toBe("");
        expect(hidden.value).toBe("m");
        expect([...hidden.options].map((option) => option.value)).toEqual([
            "s",
            "m",
            "l",
        ]);
        expect(byTestId(menu.root).className).toBe("menu");
        expect(byTestId(menu.root).hidden).toBe(true);
        expect(byTestId(menu.positioner).hidden).toBe(true);
        expect(byTestId(menu.root).getAttribute("data-scope")).toBe("select");
    });

    it("renders grouped options together in a group named by its label", async () => {
        withRegistry(() => (
            <Select
                label="Food"
                items={[
                    { value: "apple", label: "Apple", group: "Fruit" },
                    { value: "none", label: "None" },
                    { value: "kale", label: "Kale", group: "Vegetables" },
                    { value: "pear", label: "Pear", group: "Fruit" },
                ]}
            />
        ));
        await settle();
        const groups = [
            ...document.querySelectorAll<HTMLElement>(
                `[data-testid="${menu.itemGroup}"]`,
            ),
        ];
        expect(groups).toHaveLength(2);
        expect(groups[0]!.className).toBe("menu__itemGroup");
        expect(groups[0]!.getAttribute("role")).toBe("group");
        const labels = [
            ...document.querySelectorAll<HTMLElement>(
                `[data-testid="${menu.itemGroupLabel}"]`,
            ),
        ];
        expect(labels.map((label) => label.textContent)).toEqual([
            "Fruit",
            "Vegetables",
        ]);
        expect(groups[0]!.getAttribute("aria-labelledby")).toBe(labels[0]!.id);
        expect(
            [
                ...groups[0]!.querySelectorAll(`[data-testid="${menu.item}"]`),
            ].map((option) => option.getAttribute("data-value")),
        ).toEqual(["apple", "pear"]);
        expect(item("none").parentElement).toBe(byTestId(menu.root));
    });

    it("opens with a click and chooses an option, reporting the change once", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string | null>) => void>();
        withRegistry(() => (
            <Select label="Size" items={ITEMS} onValueChange={onValueChange} />
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await userEvent.click(input);
        await frames();
        expect(input.getAttribute("aria-expanded")).toBe("true");
        expect(byTestId(menu.root).hidden).toBe(false);
        await userEvent.click(item("s"));
        await settle();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: "s" });
        expect(input.value).toBe("Small");
        expect(byTestId(menu.root).hidden).toBe(true);
        expect(item("l").getAttribute("aria-disabled")).toBe("true");
    });

    it("opens on the first option starting with what's typed on the closed field, choosing nothing (APG)", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string | null>) => void>();
        const items = [
            { value: "s", label: "Small" },
            { value: "m", label: "Medium" },
            { value: "x", label: "Mini" },
        ];
        withRegistry(() => (
            <Select
                label="Size"
                items={items}
                defaultValue="s"
                onValueChange={onValueChange}
            />
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        input.focus();
        await userEvent.keyboard("m");
        await frames();
        await settle();
        expect(input.getAttribute("aria-expanded")).toBe("true");
        expect(byTestId(menu.root).hidden).toBe(false);
        expect(item("m").hasAttribute("data-highlighted")).toBe(true);
        expect(onValueChange).not.toHaveBeenCalled();
        expect(input.value).toBe("Small");
        // Typed again in the list, the same letter goes on to the next starting with it.
        await userEvent.keyboard("m");
        await frames();
        await settle();
        expect(item("x").hasAttribute("data-highlighted")).toBe(true);
        await userEvent.keyboard("{Enter}");
        await settle();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: "x" });
    });

    it("opens a field as wide as the viewport onto a list that stays inside it", async () => {
        withRegistry(() => (
            <div style={{ position: "absolute", left: 0, right: 0 }}>
                <Select label="Size" items={ITEMS} />
            </div>
        ));
        await settle();
        // The list opens against the field's input: as wide as the viewport, as the preset's is in
        // a full-width field.
        const input = byTestId(ids.input);
        input.style.boxSizing = "border-box";
        input.style.width = "100%";
        await userEvent.click(input);
        await frames();
        expect(byTestId(menu.root).hidden).toBe(false);
        const width = document.documentElement.clientWidth;
        expect(input.getBoundingClientRect().width).toBe(width);
        expect(
            byTestId(menu.positioner).getBoundingClientRect().right,
        ).toBeLessThanOrEqual(width);
        expect(document.documentElement.scrollWidth).toBe(width);
    });

    it("keeps the highlighted option in step with the highlight, with no frame between them", async () => {
        const warn = vi.spyOn(console, "warn");
        const release = attribution.enable({ log: false, checks: false });
        withRegistry(() => (
            <Select label="Size" items={ITEMS} defaultValue="m" />
        ));
        await settle();
        // Solid reports a relay once it has repeated.
        for (const value of ["s", "m", "s"]) {
            await userEvent.click(byTestId(ids.input));
            await frames();
            await userEvent.hover(item(value === "s" ? "m" : "s"));
            await frames();
            await userEvent.click(item(value));
            await settle();
        }
        release();
        expect(byTestId<HTMLInputElement>(ids.input).value).toBe("Small");
        const relays = warn.mock.calls.filter(([message]) =>
            String(message).startsWith("[EFFECT_RELAY_TEAR]"),
        );
        expect(relays).toEqual([]);
    });

    it("controlled: asks to change, and moves only with the prop", async () => {
        const [value, setValue] = createSignal<string | null>("m");
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string | null>) => void>();
        withRegistry(() => (
            <Select
                label="Size"
                items={ITEMS}
                value={value()}
                onValueChange={onValueChange}
            />
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await userEvent.click(input);
        await frames();
        await userEvent.click(item("s"));
        await settle();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: "s" });
        expect(input.value).toBe("Medium");
        setValue(null);
        await settle();
        expect(input.value).toBe("");
        expect(
            byTestId<HTMLSelectElement>(ids.hiddenSelect).selectedIndex,
        ).toBe(-1);
    });

    it("controlled: shows the prop's option as it changes, with no frame between them", async () => {
        const warn = vi.spyOn(console, "warn");
        const release = attribution.enable({ log: false, checks: false });
        const [value, setValue] = createSignal<string | null>("m");
        withRegistry(() => (
            <Select
                label="Size"
                name="size"
                items={ITEMS}
                value={value()}
                onValueChange={({ value }) => setValue(value)}
            />
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        const hidden = byTestId<HTMLSelectElement>(ids.hiddenSelect);
        // Solid reports a relay once it has repeated.
        for (const next of ["s", "m", null, "s", "m"]) {
            setValue(next);
            await settle();
            expect(input.value).toBe(
                ITEMS.find((item) => item.value === next)?.label ?? "",
            );
            expect(hidden.value).toBe(next ?? "");
        }
        await userEvent.click(input);
        await frames();
        await userEvent.click(item("s"));
        await settle();
        release();
        // oxlint-disable-next-line solid/reactivity -- the test asserts the signal's current value
        expect(value()).toBe("s");
        expect(input.value).toBe("Small");
        const relays = warn.mock.calls.filter(([message]) =>
            String(message).startsWith("[EFFECT_RELAY_TEAR]"),
        );
        expect(relays).toEqual([]);
    });

    it("follows its options' labels, and keeps a chosen option's after it leaves them", async () => {
        const warn = vi.spyOn(console, "warn");
        const release = attribution.enable({ log: false, checks: false });
        const [items, setItems] = createSignal(ITEMS);
        const [value, setValue] = createSignal<string | null>("m");
        withRegistry(() => (
            <Select
                label="Size"
                items={items()}
                value={value()}
                onValueChange={({ value }) => setValue(value)}
            />
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        for (const label of ["Mid", "Medium", "Mid"]) {
            setItems(
                ITEMS.map((option) =>
                    option.value === "m" ? { ...option, label } : option,
                ),
            );
            await settle();
            expect(input.value).toBe(label);
        }
        setItems(ITEMS.filter((option) => option.value !== "m"));
        await settle();
        expect(input.value).toBe("Mid");
        setItems(ITEMS.filter((option) => option.value !== "m").reverse());
        await settle();
        expect(input.value).toBe("Mid");
        setItems([...ITEMS, { value: "xl", label: "Extra large" }]);
        await settle();
        expect(input.value).toBe("Medium");
        setValue("xl");
        await settle();
        expect(input.value).toBe("Extra large");
        await userEvent.click(input);
        await frames();
        await userEvent.click(item("s"));
        await settle();
        release();
        expect(input.value).toBe("Small");
        const relays = warn.mock.calls.filter(([message]) =>
            String(message).startsWith("[EFFECT_RELAY_TEAR]"),
        );
        expect(relays).toEqual([]);
    });

    it("makes its items once per change when they're written in place", async () => {
        const [small, setSmall] = createSignal("Small");
        let made = 0;
        const sizes = (label: string) => {
            made++;
            return [
                { value: "s", label },
                { value: "m", label: "Medium" },
            ];
        };
        withRegistry(() => (
            <Select label="Size" items={sizes(small())} defaultValue="s" />
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await userEvent.click(input);
        await frames();
        expect(made).toBe(1);
        setSmall("Tiny");
        await settle();
        expect(made).toBe(2);
        expect(input.value).toBe("Tiny");
        expect(item("s").textContent).toBe("Tiny");
    });

    it("submits, and resets to its default with the form", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string | null>) => void>();
        withRegistry(() => (
            <form>
                <Select
                    label="Size"
                    name="size"
                    items={ITEMS}
                    defaultValue="m"
                    onValueChange={onValueChange}
                />
            </form>
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        const form = input.closest("form")!;
        expect([...new FormData(form)]).toEqual([["size", "m"]]);
        input.focus();
        await userEvent.keyboard("{ArrowLeft}");
        await settle();
        expect([...new FormData(form)]).toEqual([["size", "s"]]);
        form.reset();
        await settle();
        await settle();
        expect(input.value).toBe("Medium");
        expect(onValueChange).toHaveBeenLastCalledWith({
            value: "m",
            reason: "reset",
        });
    });

    it("shows an error in place of the supporting text, and blocks submitting", async () => {
        withRegistry(() => (
            <form>
                <Select
                    label="Size"
                    items={ITEMS}
                    supportingText="Fits most"
                    error="Pick a size"
                />
            </form>
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.getAttribute("aria-invalid")).toBe("true");
        expect(byTestId(ids.supportingText).textContent).toBe("Pick a size");
        expect(input.getAttribute("aria-describedby")).toBe(
            byTestId(ids.supportingText).id,
        );
        expect(input.closest("form")!.checkValidity()).toBe(false);
    });
});
