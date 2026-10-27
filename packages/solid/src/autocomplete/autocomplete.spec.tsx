import { compositeTestIds, testIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Autocomplete } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { textInputsRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.autocomplete;
const menu = compositeTestIds.autocompleteMenu;

const ITEMS = [
    { value: "paris", label: "Paris" },
    { value: "prague", label: "Prague" },
    { value: "rome", label: "Rome" },
    { value: "riga", label: "Riga", disabled: true },
];

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={textInputsRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const shown = () =>
    [
        ...document.querySelectorAll<HTMLElement>(
            `[data-testid="${menu.item}"]`,
        ),
    ].map((element) => element.textContent);

describe("Autocomplete, ready-made", () => {
    it("renders the field over an editable combobox, and the list drawn as a menu", async () => {
        withRegistry(() => (
            <Autocomplete label="City" items={ITEMS} name="city" />
        ));
        await settle();
        expect(byTestId(ids.root).className).toBe(
            "autocomplete autocomplete--trailingIcon-true",
        );
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.readOnly).toBe(false);
        expect(input.getAttribute("role")).toBe("combobox");
        expect(input.name).toBe("city");
        expect(input.placeholder).toBe(" ");
        expect(byTestId(ids.label).textContent).toBe("City");
        expect(byTestId(ids.trailingIcon).querySelector("svg")).not.toBeNull();
        expect(byTestId(menu.root).className).toBe("menu");
        expect(byTestId(menu.root).getAttribute("data-scope")).toBe(
            "autocomplete",
        );
        expect(byTestId(menu.positioner).hidden).toBe(true);
    });

    it("filters the suggestions as the text changes, and chooses one with the keys", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string | null>) => void>();
        withRegistry(() => (
            <Autocomplete
                label="City"
                items={ITEMS}
                onValueChange={onValueChange}
            />
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await userEvent.click(input);
        await userEvent.type(input, "pr");
        await settle();
        expect(input.getAttribute("aria-expanded")).toBe("true");
        expect(shown()).toEqual(["Prague"]);
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith({ value: "prague" });
        expect(input.value).toBe("Prague");
    });

    it("takes a filter, or none", async () => {
        withRegistry(() => (
            <Autocomplete
                label="City"
                items={ITEMS}
                filter={(item, text) =>
                    item.label.toLowerCase().startsWith(text.toLowerCase())
                }
            />
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await userEvent.click(input);
        await userEvent.type(input, "r");
        await settle();
        expect(shown()).toEqual(["Rome", "Riga"]);
    });

    it("keeps typed text no suggestion matches, and follows a controlled input value", async () => {
        const [text, setText] = createSignal("Lyon");
        withRegistry(() => (
            <Autocomplete
                label="City"
                items={ITEMS}
                inputValue={text()}
                onInputValueChange={(details) => setText(details.inputValue)}
            />
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.value).toBe("Lyon");
        setText("Rome");
        await settle();
        expect(input.value).toBe("Rome");
    });

    it("shows an error in place of the supporting text, and blocks submitting", async () => {
        withRegistry(() => (
            <form>
                <Autocomplete
                    label="City"
                    items={ITEMS}
                    supportingText="Where you live"
                    error="Pick a city"
                />
            </form>
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(byTestId(ids.supportingText).textContent).toBe("Pick a city");
        expect(input.getAttribute("aria-invalid")).toBe("true");
        expect(input.validity.customError).toBe(true);
        expect(input.getAttribute("aria-describedby")).toBe(
            byTestId(ids.supportingText).id,
        );
    });

    it("puts the text back on a form reset", async () => {
        withRegistry(() => (
            <form>
                <Autocomplete
                    label="City"
                    items={ITEMS}
                    defaultInputValue="Paris"
                />
            </form>
        ));
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await userEvent.click(input);
        await userEvent.clear(input);
        await userEvent.type(input, "Ro");
        await settle();
        input.form!.reset();
        await settle();
        expect(input.value).toBe("Paris");
    });
});
