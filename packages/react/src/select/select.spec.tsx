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

    it("controlled: shows the prop's option as it changes, in one render", async () => {
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
        for (const next of ["s", "m", "s", "m"]) {
            commits.length = 0;
            await set(next);
            await settle();
            const label = ITEMS.find((option) => option.value === next)!.label;
            expect(commits).toEqual([label]);
            expect(input.value).toBe(label);
            expect(hidden.value).toBe(next);
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
