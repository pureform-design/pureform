import { createInteractionSource } from "@pureform/binding-core/interaction";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import * as slider from ".";
import { run, settle } from "../testing/vanilla";
import type { MachineProps } from "../testing/vanilla";

afterEach(() => {
    document.body.innerHTML = "";
});

const ROOT = `<div data-root style="position: relative; width: 200px; height: 40px">
    <div data-handle="0"></div><input data-input="0">
    <div data-handle="1"></div><input data-input="1">
</div>`;

/** A slider in `markup` (around `ROOT`), run with `props`; a single slider spreads the first
 *  thumb only. */
const render = (props: MachineProps<slider.Schema>, markup = ROOT) => {
    const host = document.createElement("div");
    host.innerHTML = markup;
    document.body.append(host);
    const root = host.querySelector<HTMLElement>("[data-root]")!;
    const handles = [...host.querySelectorAll<HTMLElement>("[data-handle]")];
    const inputs = [...host.querySelectorAll<HTMLInputElement>("[data-input]")];
    const thumbs = (props.defaultValue ?? props.value ?? [0]).length;
    const running = run(
        slider.machine,
        slider.connect,
        { id: "volume", ...props },
        (api, spread) => {
            spread(root, api.getRootProps());
            for (let index = 0; index < thumbs; index++) {
                spread(handles[index]!, api.getHandleProps(index));
                spread(inputs[index]!, api.getInputProps(index));
            }
        },
    );
    return { ...running, root, handles, inputs, host };
};

describe("slider machine", () => {
    it("is Zag's slider under the preset's parts, with the root as the control", () => {
        const { root, handles, inputs, api, stop } = render({
            defaultValue: [40],
            name: "volume",
        });
        expect(root.dataset["part"]).toBe("root");
        expect(root.id).toBe("slider:volume");
        expect(handles[0]!.getAttribute("role")).toBe("slider");
        expect(handles[0]!.dataset["part"]).toBe("handle");
        expect(handles[0]!.style.length).toBe(0);
        expect(inputs[0]!.dataset["part"]).toBe("input");
        expect(inputs[0]!.name).toBe("volume");
        expect(api().percents).toEqual([40]);
        stop();
    });

    it("steps with the arrows, the up and down ones too when horizontal", async () => {
        const onValueChange = vi.fn();
        const { api, handles, stop } = render({
            defaultValue: [40],
            onValueChange,
        });
        handles[0]!.focus();
        await settle();
        await userEvent.keyboard("{ArrowRight}");
        await settle();
        expect(api().value).toEqual([41]);
        await userEvent.keyboard("{ArrowUp}");
        await settle();
        expect(api().value).toEqual([42]);
        await userEvent.keyboard("{ArrowDown}");
        await settle();
        expect(api().value).toEqual([41]);
        expect(onValueChange).toHaveBeenLastCalledWith({ value: [41] });
        stop();
    });

    it("keeps a range's thumbs apart", async () => {
        const { api, handles, stop } = render({ defaultValue: [20, 60] });
        expect(api().percents).toEqual([20, 60]);
        handles[1]!.focus();
        await settle();
        await userEvent.keyboard("{Home}");
        await settle();
        expect(api().value).toEqual([20, 20]);
        stop();
    });

    it("takes no change while read-only", async () => {
        const { api, handles, stop } = render({
            defaultValue: [40],
            readOnly: true,
        });
        handles[0]!.focus();
        await userEvent.keyboard("{ArrowRight}");
        await settle();
        expect(api().value).toEqual([40]);
        stop();
    });

    it("presses and drags its source while the pointer is down", async () => {
        const source = createInteractionSource();
        const seen: string[] = [];
        source.subscribe((interaction) => seen.push(interaction.type));
        const { api, root, stop } = render({
            defaultValue: [40],
            interactionSource: source,
        });
        root.dispatchEvent(
            new PointerEvent("pointerdown", {
                bubbles: true,
                button: 0,
                clientX: root.getBoundingClientRect().left + 100,
            }),
        );
        await settle();
        expect(api().dragging).toBe(true);
        window.dispatchEvent(new PointerEvent("pointerup"));
        document.dispatchEvent(new PointerEvent("pointerup"));
        await settle();
        expect(api().dragging).toBe(false);
        expect(seen.filter((type) => type !== "focus")).toEqual([
            "press",
            "dragStart",
            "dragStop",
            "release",
        ]);
        stop();
    });

    it("disables its inputs, so they don't submit, and takes no drag", async () => {
        const { api, root, inputs, stop } = render({
            defaultValue: [40],
            disabled: true,
        });
        expect(inputs[0]!.disabled).toBe(true);
        root.dispatchEvent(
            new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
        );
        await settle();
        expect(api().dragging).toBe(false);
        stop();
    });

    it("follows a disabled fieldset by the browser's rule", async () => {
        const { api, host, stop } = render(
            { defaultValue: [40] },
            `<fieldset disabled><legend>${ROOT}</legend></fieldset>`,
        );
        await settle();
        expect(api().disabled).toBe(false);
        const fieldset = host.querySelector("fieldset")!;
        fieldset.append(fieldset.querySelector("[data-root]")!);
        await settle();
        expect(api().disabled).toBe(true);
        stop();
    });

    it("follows a changed thumbSize prop, which Zag reads once", async () => {
        const props = {
            defaultValue: [40],
            thumbAlignment: "contain" as const,
            thumbSize: { width: 20, height: 20 },
        };
        const view = render(props);
        await settle();
        expect(view.service.context.get("thumbSize")).toEqual({
            width: 20,
            height: 20,
        });
        view.setProps({ ...props, thumbSize: { width: 32, height: 24 } });
        await settle();
        expect(view.service.context.get("thumbSize")).toEqual({
            width: 32,
            height: 24,
        });
        view.stop();
    });
});
