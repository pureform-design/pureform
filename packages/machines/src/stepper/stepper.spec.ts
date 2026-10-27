import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import * as stepper from ".";
import { run, settle } from "../testing/vanilla";
import type { MachineCallback, MachineProps } from "../testing/vanilla";

afterEach(() => {
    document.body.innerHTML = "";
});

const COUNT = 4;

interface Options {
    readonly invalid?: number[];
    readonly disabled?: number[];
}

// Four steps, without the preset: a list of items each holding a header, its indicator and a
// separator, then a panel per step.
const render = (
    props: MachineProps<stepper.Schema> = {},
    { invalid = [], disabled = [] }: Options = {},
) => {
    const host = document.createElement("div");
    host.innerHTML = `<div data-root><div data-list>${Array.from(
        { length: COUNT },
        (_, index) =>
            `<div data-item="${index}"><button data-trigger="${index}"><span data-indicator="${index}"></span><span data-label="${index}">Step ${index}</span></button><div data-separator="${index}"></div></div>`,
    ).join("")}</div>${Array.from(
        { length: COUNT },
        (_, index) => `<div data-content="${index}"></div>`,
    ).join("")}<button data-next></button><button data-prev></button></div>`;
    document.body.append(host);
    const $ = <E extends Element = HTMLElement>(selector: string) =>
        host.querySelector<E>(selector)!;
    const running = run(
        stepper.machine,
        stepper.connect,
        { id: "s", count: COUNT, ...props },
        (api, spread) => {
            spread($("[data-root]"), api.getRootProps());
            spread($("[data-list]"), api.getListProps());
            spread($("[data-next]"), api.getNextTriggerProps());
            spread($("[data-prev]"), api.getPrevTriggerProps());
            for (let index = 0; index < COUNT; index++) {
                spread(
                    $(`[data-item="${index}"]`),
                    api.getItemProps({ index }),
                );
                spread(
                    $(`[data-trigger="${index}"]`),
                    api.getTriggerProps({
                        index,
                        invalid: invalid.includes(index),
                        disabled: disabled.includes(index),
                    }),
                );
                spread(
                    $(`[data-indicator="${index}"]`),
                    api.getIndicatorProps({ index }),
                );
                spread($(`[data-label="${index}"]`), api.getLabelProps());
                spread(
                    $(`[data-separator="${index}"]`),
                    api.getSeparatorProps({ index }),
                );
                spread(
                    $(`[data-content="${index}"]`),
                    api.getContentProps({ index }),
                );
            }
        },
    );
    const trigger = (index: number) => $(`[data-trigger="${index}"]`);
    return { ...running, $, trigger };
};

describe("stepper machine", () => {
    it("has a tab stop on the current header only, and marks the done indicators", async () => {
        const { trigger, $, api } = render({ defaultStep: 1 });
        await settle();
        expect(trigger(0).tabIndex).toBe(-1);
        expect(trigger(1).tabIndex).toBe(0);
        expect(trigger(1).getAttribute("aria-selected")).toBe("true");
        expect(trigger(2).tabIndex).toBe(-1);
        expect($('[data-indicator="0"]').getAttribute("aria-checked")).toBe(
            "true",
        );
        expect($('[data-indicator="1"]').hasAttribute("aria-checked")).toBe(
            false,
        );
        expect($('[data-item="1"]').getAttribute("role")).toBe("presentation");
        expect($('[data-item="1"]').hasAttribute("aria-current")).toBe(false);
        expect(api().value).toBe(1);
    });

    it("makes the last header the tab stop once every step is done", async () => {
        const { trigger } = render({ defaultStep: COUNT });
        await settle();
        expect(trigger(COUNT - 1).tabIndex).toBe(0);
        expect(trigger(0).tabIndex).toBe(-1);
    });

    it("marks an invalid header and disables one that can't be pressed", async () => {
        const { trigger } = render({}, { invalid: [2], disabled: [3] });
        await settle();
        expect(trigger(2).getAttribute("aria-invalid")).toBe("true");
        expect(trigger(1).hasAttribute("aria-invalid")).toBe(false);
        expect((trigger(3) as HTMLButtonElement).disabled).toBe(true);
    });

    it("moves focus with the arrow keys of a row, wrapping, and with Home and End", async () => {
        const { trigger } = render();
        await settle();
        trigger(0).focus();
        await userEvent.keyboard("{ArrowRight}");
        expect(document.activeElement).toBe(trigger(1));
        await userEvent.keyboard("{End}");
        expect(document.activeElement).toBe(trigger(COUNT - 1));
        await userEvent.keyboard("{ArrowRight}");
        expect(document.activeElement).toBe(trigger(0));
        await userEvent.keyboard("{ArrowLeft}");
        expect(document.activeElement).toBe(trigger(COUNT - 1));
        await userEvent.keyboard("{Home}");
        expect(document.activeElement).toBe(trigger(0));
        // Moving focus doesn't change the step.
        expect(trigger(0).getAttribute("aria-selected")).toBe("true");
    });

    it("flips a row's arrow keys under rtl, and uses up and down for a column", async () => {
        const rtl = render({ dir: "rtl" });
        await settle();
        rtl.trigger(0).focus();
        await userEvent.keyboard("{ArrowLeft}");
        expect(document.activeElement).toBe(rtl.trigger(1));
        await userEvent.keyboard("{ArrowDown}");
        expect(document.activeElement).toBe(rtl.trigger(1));
        rtl.stop();
        document.body.innerHTML = "";
        const column = render({ orientation: "vertical", dir: "rtl" });
        await settle();
        column.trigger(0).focus();
        await userEvent.keyboard("{ArrowDown}");
        expect(document.activeElement).toBe(column.trigger(1));
        await userEvent.keyboard("{ArrowUp}");
        expect(document.activeElement).toBe(column.trigger(0));
        await userEvent.keyboard("{ArrowRight}");
        expect(document.activeElement).toBe(column.trigger(0));
    });

    it("skips headers that can't be pressed", async () => {
        const { trigger } = render({}, { disabled: [1] });
        await settle();
        trigger(0).focus();
        await userEvent.keyboard("{ArrowRight}");
        expect(document.activeElement).toBe(trigger(2));
        await userEvent.keyboard("{ArrowLeft}");
        expect(document.activeElement).toBe(trigger(0));
    });

    it("goes to the step of a pressed header with Enter or Space", async () => {
        const onStepChange =
            vi.fn<MachineCallback<stepper.Schema, "onStepChange">>();
        const { trigger, api } = render({ onStepChange });
        await settle();
        trigger(0).focus();
        await userEvent.keyboard("{ArrowRight}{ArrowRight}{Enter}");
        await settle();
        expect(api().value).toBe(2);
        expect(onStepChange).toHaveBeenCalledWith({ step: 2 });
        await userEvent.keyboard("{ArrowLeft} ");
        await settle();
        expect(api().value).toBe(1);
    });

    it("leaves the steps to the next and previous triggers in linear mode", async () => {
        const { trigger, api, $ } = render({ linear: true });
        await settle();
        trigger(2).click();
        await settle();
        expect(api().value).toBe(0);
        expect(trigger(2).tabIndex).toBe(-1);
        $("[data-next]").click();
        await settle();
        expect(api().value).toBe(1);
        $("[data-prev]").click();
        await settle();
        expect(api().value).toBe(0);
    });

    it("is a list of disclosure buttons in a column, a tab list in a row", async () => {
        const column = render({ orientation: "vertical", defaultStep: 1 });
        await settle();
        expect(column.$("[data-list]").getAttribute("role")).toBe("list");
        expect(column.$('[data-item="0"]').getAttribute("role")).toBe(
            "listitem",
        );
        const header = column.trigger(1);
        expect(header.hasAttribute("role")).toBe(false);
        expect(header.getAttribute("aria-expanded")).toBe("true");
        expect(header.getAttribute("aria-current")).toBe("step");
        expect(column.trigger(0).getAttribute("aria-expanded")).toBe("false");
        expect(column.trigger(0).hasAttribute("aria-current")).toBe(false);
        expect(column.$('[data-content="1"]').getAttribute("role")).toBe(
            "region",
        );
        // Each header is a tab stop, as an accordion's are.
        expect(column.trigger(0).tabIndex).toBe(0);
        column.stop();
        document.body.innerHTML = "";
        const row = render({ defaultStep: 1 });
        await settle();
        expect(row.$("[data-list]").getAttribute("role")).toBe("tablist");
        expect(row.$('[data-content="1"]').getAttribute("role")).toBe(
            "tabpanel",
        );
    });

    it("shows only the current step's content", async () => {
        const { $ } = render({ defaultStep: 2 });
        await settle();
        expect($('[data-content="2"]').hasAttribute("hidden")).toBe(false);
        expect($('[data-content="0"]').hasAttribute("hidden")).toBe(true);
        expect($('[data-content="2"]').getAttribute("aria-labelledby")).toBe(
            $('[data-trigger="2"]').id,
        );
    });

    it("gives the label and caption their parts", () => {
        expect(stepper.anatomy.keys()).toEqual(
            expect.arrayContaining([
                "label",
                "caption",
                "trigger",
                "separator",
            ]),
        );
    });
});
