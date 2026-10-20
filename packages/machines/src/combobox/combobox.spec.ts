import { createInteractionSource } from "@pureform/binding-core/interaction";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import * as combobox from ".";
import { run, settle } from "../testing/vanilla";
import type { MachineProps } from "../testing/vanilla";

afterEach(() => {
    document.body.innerHTML = "";
});

const ITEMS = [
    { value: "paris", label: "Paris" },
    { value: "prague", label: "Prague" },
];

const MARKUP = `<div data-root>
    <div data-control><input data-input><button data-trigger></button></div>
    <div data-positioner><div data-content>
        <div data-item="0"></div><div data-item="1"></div>
    </div></div>
</div>`;

const render = (props: MachineProps<combobox.Schema>) => {
    const host = document.createElement("div");
    host.innerHTML = MARKUP;
    document.body.append(host);
    const $ = <E extends Element>(selector: string) =>
        host.querySelector<E>(selector)!;
    const running = run(
        combobox.machine,
        combobox.connect,
        {
            id: "city",
            collection: combobox.collection({
                items: ITEMS,
                itemToValue: (item) => item.value,
                itemToString: (item) => item.label,
            }),
            ...props,
        },
        (api, spread) => {
            spread($("[data-root]"), api.getRootProps());
            spread($("[data-control]"), api.getControlProps());
            spread($("[data-input]"), api.getInputProps());
            spread($("[data-trigger]"), api.getTriggerProps());
            spread($("[data-positioner]"), api.getPositionerProps());
            spread($("[data-content]"), api.getContentProps());
            ITEMS.forEach((item, index) =>
                spread($(`[data-item="${index}"]`), api.getItemProps({ item })),
            );
        },
    );
    return { ...running, $ };
};

const sourcesFor = () => {
    const sources = new Map<
        string,
        ReturnType<typeof createInteractionSource>
    >();
    return (key: string) => {
        if (!sources.has(key)) sources.set(key, createInteractionSource());
        return sources.get(key)!;
    };
};

describe("combobox machine", () => {
    it("is Zag's combobox: an editable input that opens a listbox", async () => {
        const { $, api, stop } = render({});
        const input = $<HTMLInputElement>("[data-input]");
        expect(input.getAttribute("role")).toBe("combobox");
        expect(input.readOnly).toBe(false);
        await userEvent.click(input);
        await userEvent.type(input, "Pr");
        await settle();
        expect(api().open).toBe(true);
        expect(api().inputValue).toBe("Pr");
        stop();
    });

    it("hovers the highlighted suggestion's source, and ends when it closes", async () => {
        const source = sourcesFor();
        const { $, stop } = render({
            itemInteractionSource: source,
            openOnClick: true,
        });
        const input = $<HTMLInputElement>("[data-input]");
        await userEvent.click(input);
        await userEvent.keyboard("{ArrowDown}");
        await settle();
        expect(source("paris").state.hovered).toBe(true);
        await userEvent.keyboard("{ArrowDown}");
        await settle();
        expect(source("paris").state.hovered).toBe(false);
        expect(source("prague").state.hovered).toBe(true);
        await userEvent.keyboard("{Escape}");
        await settle();
        expect(source("prague").state.hovered).toBe(false);
        stop();
    });

    it("presses the highlighted suggestion on Enter, not on Space", async () => {
        const source = sourcesFor();
        const pressed: string[] = [];
        const { $, api, stop } = render({
            itemInteractionSource: (key) => {
                const own = source(key);
                own.subscribe(() => {
                    if (own.state.pressed) pressed.push(key);
                });
                return own;
            },
            openOnClick: true,
        });
        const input = $<HTMLInputElement>("[data-input]");
        await userEvent.click(input);
        await userEvent.keyboard("{ArrowDown}");
        await userEvent.keyboard(" ");
        await settle();
        expect(pressed).toEqual([]);
        // Typing moved the highlight off; the next arrow puts it back on the first.
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await settle();
        expect(api().value).toEqual(["paris"]);
        expect(new Set(pressed)).toEqual(new Set(["paris"]));
        stop();
    });
});
