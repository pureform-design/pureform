import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import * as carousel from ".";
import { run, settle } from "../testing/vanilla";
import type { MachineProps } from "../testing/vanilla";

afterEach(() => {
    document.body.innerHTML = "";
});

const COUNT = 6;

// Six 100px items in a 250px row, without the preset: each item a mask around its content.
const render = (props: MachineProps<carousel.Schema>) => {
    const host = document.createElement("div");
    host.innerHTML = `<div data-root><div data-group style="width:250px;height:80px">${Array.from(
        { length: COUNT },
        (_, index) =>
            `<div data-item="${index}" style="width:100px"><div data-mask="${index}"><div data-content="${index}"></div></div></div>`,
    ).join("")}</div></div>`;
    document.body.append(host);
    const $ = <E extends Element = HTMLElement>(selector: string) =>
        host.querySelector<E>(selector)!;
    const running = run(
        carousel.machine,
        carousel.connect,
        { id: "c", slideCount: COUNT, ...props },
        (api, spread) => {
            spread($("[data-root]"), api.getRootProps());
            spread($("[data-group]"), api.getItemGroupProps());
            for (let index = 0; index < COUNT; index++) {
                spread(
                    $(`[data-item="${index}"]`),
                    api.getItemProps({ index }),
                );
                spread(
                    $(`[data-mask="${index}"]`),
                    api.getMaskProps({ index }),
                );
                spread(
                    $(`[data-content="${index}"]`),
                    api.getContentProps({ index }),
                );
            }
        },
    );
    return { ...running, $ };
};

const frames = (count = 4) =>
    new Promise<void>((resolve) => {
        const next = (left: number) =>
            left === 0
                ? resolve()
                : requestAnimationFrame(() => next(left - 1));
        next(count);
    });

describe("carousel machine", () => {
    it("is Zag's carousel with a mask and content per item", async () => {
        const { $, stop } = render({});
        await settle();
        expect($("[data-group]").dataset["part"]).toBe("item-group");
        expect($('[data-item="0"]').dataset["part"]).toBe("item");
        expect($('[data-mask="0"]').dataset["part"]).toBe("mask");
        expect($('[data-content="0"]').dataset["part"]).toBe("content");
        // The preset spaces the items, not Zag.
        expect($("[data-group]").style.gap).toBe("");
        // Items size themselves, so the row is a flex row.
        expect($("[data-group]").style.display).toBe("flex");
        // Every mask takes focus from Tab; the current page's is marked.
        expect($('[data-mask="0"]').tabIndex).toBe(0);
        expect($('[data-mask="1"]').tabIndex).toBe(0);
        expect($('[data-mask="0"]').hasAttribute("data-current")).toBe(true);
        expect($('[data-mask="1"]').hasAttribute("data-current")).toBe(false);
        expect($('[data-item="1"]').hasAttribute("aria-hidden")).toBe(false);
        stop();
    });

    it("moves focus between masks with the arrow keys, Home and End", async () => {
        const { $, stop } = render({ reducedMotion: true });
        await settle();
        $('[data-mask="0"]').focus();
        await userEvent.keyboard("{ArrowRight}");
        expect(document.activeElement).toBe($('[data-mask="1"]'));
        await userEvent.keyboard("{End}");
        expect(document.activeElement).toBe($(`[data-mask="${COUNT - 1}"]`));
        await userEvent.keyboard("{Home}");
        expect(document.activeElement).toBe($('[data-mask="0"]'));
        stop();
    });

    it("flips the arrow keys under rtl", async () => {
        const { $, stop } = render({ dir: "rtl", reducedMotion: true });
        await settle();
        $('[data-mask="0"]').focus();
        await userEvent.keyboard("{ArrowLeft}");
        expect(document.activeElement).toBe($('[data-mask="1"]'));
        await userEvent.keyboard("{ArrowRight}");
        expect(document.activeElement).toBe($('[data-mask="0"]'));
        stop();
    });

    it("scrolls at once under reduced motion", async () => {
        const { $, api, stop } = render({ reducedMotion: true });
        await frames();
        api().scrollToIndex(2);
        await settle();
        // No smooth scroll in between: the row is where the item snaps on the next frame.
        await frames(1);
        expect($("[data-group]").scrollLeft).toBe(200);
        expect(api().page).toBe(2);
        stop();
    });

    it("scrolls smoothly otherwise", async () => {
        const { $, api, stop } = render({});
        await frames();
        api().scrollToIndex(2);
        await settle();
        await frames(1);
        expect($("[data-group]").scrollLeft).toBeLessThan(200);
        stop();
    });
});
