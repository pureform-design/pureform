import { afterEach, describe, expect, it } from "vitest";

import * as paginator from ".";
import { run, settle } from "../testing/vanilla";
import { anatomy } from "./paginator.anatomy";

const stops: (() => void)[] = [];
afterEach(() => {
    for (const stop of stops.splice(0)) stop();
    document.body.innerHTML = "";
});

const setUp = (props: Record<string, unknown>) => {
    const root = document.createElement("div");
    const triggers = {
        first: document.createElement("button"),
        prev: document.createElement("button"),
        next: document.createElement("button"),
        last: document.createElement("button"),
    };
    const range = document.createElement("span");
    root.append(...Object.values(triggers), range);
    document.body.append(root);
    const running = run(
        paginator.machine,
        paginator.connect,
        { id: "p", ...props },
        (api, spread) => {
            spread(root, api.getRootProps());
            spread(triggers.first, api.getFirstTriggerProps());
            spread(triggers.prev, api.getPrevTriggerProps());
            spread(triggers.next, api.getNextTriggerProps());
            spread(triggers.last, api.getLastTriggerProps());
            spread(range, api.getRangeLabelProps());
        },
    );
    stops.push(running.stop);
    return { root, triggers, range, running };
};

describe("paginator machine", () => {
    it("has the preset's parts", () => {
        expect(anatomy.keys()).toEqual(
            expect.arrayContaining([
                "root",
                "pageSize",
                "pageSizeLabel",
                "pageSizeSelect",
                "rangeLabel",
                "actions",
                "firstTrigger",
                "prevTrigger",
                "nextTrigger",
                "lastTrigger",
            ]),
        );
    });

    it("is a labelled group with named triggers and a polite range label", async () => {
        const { root, triggers, range } = setUp({ count: 95 });
        await settle();
        expect(root.getAttribute("role")).toBe("group");
        expect(root.getAttribute("aria-label")).toBe("Pagination");
        expect(triggers.next.getAttribute("aria-label")).toBe("Next page");
        expect(triggers.first.getAttribute("aria-label")).toBe("First page");
        expect(range.getAttribute("aria-live")).toBe("polite");
    });

    it("disables the backward triggers on the first page and the forward ones on the last", async () => {
        const { triggers, running } = setUp({ count: 25, defaultPageSize: 10 });
        await settle();
        expect(triggers.first.disabled).toBe(true);
        expect(triggers.prev.disabled).toBe(true);
        expect(triggers.next.disabled).toBe(false);
        triggers.last.click();
        await settle();
        expect(running.api().page).toBe(3);
        expect(triggers.next.disabled).toBe(true);
        expect(triggers.last.disabled).toBe(true);
        expect(triggers.prev.disabled).toBe(false);
    });

    it("keeps the first item of the page shown when the page size changes", async () => {
        const { running } = setUp({
            count: 100,
            defaultPageSize: 10,
            defaultPage: 4,
        });
        await settle();
        running.api().setPageSize(25);
        await settle();
        // Items 31–40 were shown; item 31 is on page 2 of 25.
        expect(running.api().page).toBe(2);
        expect(running.api().pageSize).toBe(25);
    });

    it("has no pages for no items", async () => {
        const { triggers, running } = setUp({ count: 0 });
        await settle();
        expect(running.api().totalPages).toBe(0);
        expect(triggers.next.disabled).toBe(true);
        expect(triggers.last.disabled).toBe(true);
    });

    it("pageAfterSize", () => {
        expect(paginator.pageAfterSize(1, 10, 50)).toBe(1);
        expect(paginator.pageAfterSize(6, 10, 5)).toBe(11);
        expect(paginator.pageAfterSize(3, 10, 10)).toBe(3);
    });
});
