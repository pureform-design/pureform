import { compositeTestIds, testIds } from "@pureform/anatomy";
import { act, screen } from "@testing-library/react";
import { Profiler, type ReactNode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Select } from ".";
import { PureformProvider } from "..";
import { textInputsRegistry } from "../__fixtures__/registry";
import { interact, mount, outside, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = testIds.select;
const menu = compositeTestIds.selectMenu;

const ITEMS = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium" },
    { value: "l", label: "Large", disabled: true },
];

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={textInputsRegistry()}>
            {view}
        </PureformProvider>,
    );

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
};

const item = (value: string) =>
    [
        ...document.querySelectorAll<HTMLElement>(
            `[data-testid="${menu.item}"]`,
        ),
    ].find((element) => element.dataset.value === value)!;

/** A select whose value its parent holds, taking every change it asks for, and `set` to change it
 *  from outside. */
const controlled = (initial: string | null) => {
    const handle = { set: (_value: string | null) => {} };
    function Controlled(props: { items: typeof ITEMS }): ReactNode {
        const [value, setValue] = useState(initial);
        handle.set = setValue;
        return (
            <Select
                label="Size"
                name="size"
                items={props.items}
                value={value}
                onValueChange={(details) => setValue(details.value)}
            />
        );
    }
    return {
        Controlled,
        set: (value: string | null): Promise<void> =>
            act(async () => {
                handle.set(value);
            }),
    };
};

describe("Select, option groups", () => {
    it("renders grouped options under their labels, in the order the groups first appear", async () => {
        withRegistry(
            <Select
                label="Food"
                items={[
                    { value: "none", label: "None" },
                    { value: "apple", label: "Apple", group: "Fruit" },
                    { value: "kale", label: "Kale", group: "Vegetables" },
                    { value: "pear", label: "Pear", group: "Fruit" },
                ]}
            />,
        );
        await settle();
        const options = [
            ...document.querySelectorAll<HTMLElement>(
                `[data-testid="${menu.item}"]`,
            ),
        ];
        expect(options.map((option) => option.dataset.value)).toEqual([
            "none",
            "apple",
            "pear",
            "kale",
        ]);
        expect(item("none").parentElement).toBe(byTestId(menu.root));
        const groups = [
            ...document.querySelectorAll<HTMLElement>(
                `[data-testid="${menu.itemGroup}"]`,
            ),
        ];
        expect(groups).toHaveLength(2);
        expect(groups[0]!.className).toBe("menu__itemGroup");
        expect(groups[0]!.getAttribute("role")).toBe("group");
        const labels = document.querySelectorAll<HTMLElement>(
            `[data-testid="${menu.itemGroupLabel}"]`,
        );
        expect(labels[0]!.textContent).toBe("Fruit");
        expect(labels[0]!.className).toBe("menu__itemGroupLabel");
        expect(groups[0]!.getAttribute("aria-labelledby")).toBe(labels[0]!.id);
        expect(item("pear").parentElement).toBe(groups[0]);
        expect(item("kale").parentElement).toBe(groups[1]);
    });
});

describe("Select, ready-made", () => {
    it("renders the field, a hidden select, and the list drawn as a menu", async () => {
        withRegistry(
            <Select label="Size" items={ITEMS} defaultValue="m" name="size" />,
        );
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

    it("opens with a click and chooses an option, reporting the change once", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <Select label="Size" items={ITEMS} onValueChange={onValueChange} />,
        );
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await interact(() => userEvent.click(input));
        await frames();
        expect(input.getAttribute("aria-expanded")).toBe("true");
        expect(byTestId(menu.root).hidden).toBe(false);
        await interact(() => userEvent.click(item("s")));
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: "s" });
        expect(input.value).toBe("Small");
        expect(byTestId(menu.root).hidden).toBe(true);
        expect(item("l").getAttribute("aria-disabled")).toBe("true");
    });

    it("opens on the first option starting with what's typed on the closed field, choosing nothing (APG)", async () => {
        const onValueChange = vi.fn();
        const items = [
            { value: "s", label: "Small" },
            { value: "m", label: "Medium" },
            { value: "x", label: "Mini" },
        ];
        withRegistry(
            <Select
                label="Size"
                items={items}
                defaultValue="s"
                onValueChange={onValueChange}
            />,
        );
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        input.focus();
        await interact(() => userEvent.keyboard("m"));
        await frames();
        expect(input.getAttribute("aria-expanded")).toBe("true");
        expect(byTestId(menu.root).hidden).toBe(false);
        expect(item("m").hasAttribute("data-highlighted")).toBe(true);
        expect(onValueChange).not.toHaveBeenCalled();
        expect(input.value).toBe("Small");
        // Typed again in the list, the same letter goes on to the next starting with it.
        await interact(() => userEvent.keyboard("m"));
        await frames();
        expect(item("x").hasAttribute("data-highlighted")).toBe(true);
        await interact(() => userEvent.keyboard("{Enter}"));
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: "x" });
    });

    it("opens a field as wide as the viewport onto a list that stays inside it", async () => {
        withRegistry(
            <div style={{ position: "absolute", left: 0, right: 0 }}>
                <Select label="Size" items={ITEMS} />
            </div>,
        );
        await settle();
        // The list opens against the field's input: as wide as the viewport, as the preset's is in
        // a full-width field.
        const input = byTestId(ids.input);
        input.style.boxSizing = "border-box";
        input.style.width = "100%";
        await interact(() => userEvent.click(input));
        await frames();
        expect(byTestId(menu.root).hidden).toBe(false);
        const width = document.documentElement.clientWidth;
        expect(input.getBoundingClientRect().width).toBe(width);
        expect(
            byTestId(menu.positioner).getBoundingClientRect().right,
        ).toBeLessThanOrEqual(width);
        expect(document.documentElement.scrollWidth).toBe(width);
    });

    it("controlled: shows the prop's option as it changes, and empties, in one render", async () => {
        const commits: string[] = [];
        const { Controlled, set } = controlled("m");
        withRegistry(
            <Profiler
                id="select"
                onRender={() =>
                    commits.push(byTestId<HTMLInputElement>(ids.input).value)
                }
            >
                <Controlled items={ITEMS} />
            </Profiler>,
        );
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        const hidden = byTestId<HTMLSelectElement>(ids.hiddenSelect);
        for (const next of ["s", "m", null, "s", null, "m"]) {
            commits.length = 0;
            await set(next);
            await settle();
            const label =
                ITEMS.find((option) => option.value === next)?.label ?? "";
            expect(commits).toEqual([label]);
            expect(input.value).toBe(label);
            expect(hidden.value).toBe(next ?? "");
        }
        await interact(() => userEvent.click(input));
        await frames();
        await interact(() => userEvent.click(item("s")));
        expect(input.value).toBe("Small");
    });

    it("follows its options' labels, and keeps a chosen option's after it leaves them", async () => {
        const { Controlled, set } = controlled("m");
        const items = outside(ITEMS);
        withRegistry(
            <items.Holder>
                {(current) => <Controlled items={current} />}
            </items.Holder>,
        );
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        for (const label of ["Mid", "Medium", "Mid"]) {
            await items.set(
                ITEMS.map((option) =>
                    option.value === "m" ? { ...option, label } : option,
                ),
            );
            await settle();
            expect(input.value).toBe(label);
        }
        await items.set(ITEMS.filter((option) => option.value !== "m"));
        await settle();
        expect(input.value).toBe("Mid");
        await items.set([...ITEMS, { value: "xl", label: "Extra large" }]);
        await settle();
        expect(input.value).toBe("Medium");
        await set("xl");
        await settle();
        expect(input.value).toBe("Extra large");
        await interact(() => userEvent.click(input));
        await frames();
        await interact(() => userEvent.click(item("s")));
        expect(input.value).toBe("Small");
    });

    it("controlled: asks to change, and moves only with the prop", async () => {
        const value = outside<string | null>("m");
        const onValueChange = vi.fn();
        withRegistry(
            <value.Holder>
                {(current) => (
                    <Select
                        label="Size"
                        items={ITEMS}
                        value={current}
                        onValueChange={onValueChange}
                    />
                )}
            </value.Holder>,
        );
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await interact(() => userEvent.click(input));
        await frames();
        await interact(() => userEvent.click(item("s")));
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: "s" });
        expect(input.value).toBe("Medium");
        await value.set(null);
        await settle();
        expect(input.value).toBe("");
        expect(
            byTestId<HTMLSelectElement>(ids.hiddenSelect).selectedIndex,
        ).toBe(-1);
    });

    it("submits, and resets to its default with the form", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <form>
                <Select
                    label="Size"
                    name="size"
                    items={ITEMS}
                    defaultValue="m"
                    onValueChange={onValueChange}
                />
            </form>,
        );
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        const form = input.closest("form")!;
        expect([...new FormData(form)]).toEqual([["size", "m"]]);
        input.focus();
        await interact(() => userEvent.keyboard("{ArrowLeft}"));
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
        withRegistry(
            <form>
                <Select
                    label="Size"
                    items={ITEMS}
                    supportingText="Fits most"
                    error="Pick a size"
                />
            </form>,
        );
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
