import { createInteractionSource } from "@pureform/binding-core/interaction";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import * as tagsInput from ".";
import { run, settle } from "../testing/vanilla";
import type { MachineProps } from "../testing/vanilla";

afterEach(() => {
    document.body.innerHTML = "";
});

// Two chips, enough for the values the tests start with.
const MARKUP = `<div data-root>
    <div data-container>
        <div data-chip="0"><span data-label="0"></span><button data-remove="0"></button></div>
        <div data-chip="1"><span data-label="1"></span><button data-remove="1"></button></div>
        <input data-input>
    </div>
</div>`;

const render = (props: MachineProps<tagsInput.Schema>) => {
    const host = document.createElement("div");
    host.innerHTML = MARKUP;
    document.body.append(host);
    const $ = <E extends Element>(selector: string) =>
        host.querySelector<E>(selector)!;
    const running = run(
        tagsInput.machine,
        tagsInput.connect,
        { id: "tags", ...props },
        (api, spread) => {
            spread($("[data-root]"), api.getRootProps());
            spread($("[data-container]"), api.getContainerProps());
            spread($("[data-input]"), api.getInputProps());
            api.value.slice(0, 2).forEach((value, index) => {
                const item = { index, value };
                spread($(`[data-chip="${index}"]`), api.getChipProps(item));
                spread(
                    $(`[data-label="${index}"]`),
                    api.getChipLabelProps(item),
                );
                spread(
                    $(`[data-remove="${index}"]`),
                    api.getChipRemoveProps(item),
                );
            });
        },
    );
    return { ...running, $ };
};

describe("tags input machine", () => {
    it("is Zag's tags input under the preset's parts", () => {
        const { $, stop } = render({ defaultValue: ["red", "blue"] });
        expect($("[data-container]").getAttribute("data-part")).toBe("control");
        const chip = $<HTMLElement>('[data-chip="0"]');
        // Zag finds the chips by the preview's part name.
        expect(chip.dataset["part"]).toBe("item-preview");
        expect(chip.dataset["value"]).toBe("red");
        expect(chip.id).toBe("tags-input:tags:tag:red:0");
        expect($('[data-remove="1"]').getAttribute("aria-label")).toContain(
            "blue",
        );
        stop();
    });

    it("adds a tag on Enter and removes one with its remove button", async () => {
        const { $, api, stop } = render({ defaultValue: ["red"] });
        const input = $<HTMLInputElement>("[data-input]");
        await userEvent.click(input);
        await userEvent.type(input, "blue{Enter}");
        await settle();
        expect(api().value).toEqual(["red", "blue"]);
        await userEvent.click($('[data-remove="0"]'));
        await settle();
        expect(api().value).toEqual(["blue"]);
        stop();
    });

    it("doesn't edit a tag in place unless asked", async () => {
        const { $, api, stop } = render({ defaultValue: ["red"] });
        await userEvent.dblClick($('[data-chip="0"]'));
        await settle();
        expect(api().getItemState({ index: 0, value: "red" }).editing).toBe(
            false,
        );
        stop();
    });

    it("hovers the highlighted chip's source", async () => {
        const sources = new Map<
            string,
            ReturnType<typeof createInteractionSource>
        >();
        const source = (key: string) => {
            if (!sources.has(key)) sources.set(key, createInteractionSource());
            return sources.get(key)!;
        };
        const { $, stop } = render({
            defaultValue: ["red", "blue"],
            itemInteractionSource: source,
        });
        const input = $<HTMLInputElement>("[data-input]");
        await userEvent.click(input);
        await userEvent.keyboard("{Backspace}");
        await settle();
        const blue = source("tags-input:tags:tag:blue:1");
        expect(blue.state.hovered).toBe(true);
        await userEvent.keyboard("{ArrowLeft}");
        await settle();
        expect(blue.state.hovered).toBe(false);
        expect(source("tags-input:tags:tag:red:0").state.hovered).toBe(true);
        stop();
    });
});
