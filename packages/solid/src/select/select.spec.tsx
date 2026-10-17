import { compositeTestIds, testIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Select } from ".";
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

    it("opens with a click and chooses an option, reporting the change once", async () => {
        const onValueChange = vi.fn();
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

    it("controlled: asks to change, and moves only with the prop", async () => {
        const [value, setValue] = createSignal<string | null>("m");
        const onValueChange = vi.fn();
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

    it("submits, and resets to its default with the form", async () => {
        const onValueChange = vi.fn();
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
