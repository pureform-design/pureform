import { createInteractionSource } from "@pureform/binding-core/interaction";
import type { Interaction } from "@pureform/binding-core/interaction";
import { afterEach, describe, expect, it } from "vitest";

import * as selectionList from "./selection-list";
import { run, settle } from "./testing/vanilla";

const stops: (() => void)[] = [];
afterEach(() => {
    for (const stop of stops.splice(0)) stop();
    document.body.innerHTML = "";
});

const VALUES = ["inbox", "starred", "sent"];

const setUp = (props: Record<string, unknown> = {}) => {
    const content = document.createElement("ul");
    const collection = selectionList.collection({
        items: VALUES.map((value) => ({ value, label: value })),
    });
    const items = VALUES.map((value) => {
        const item = document.createElement("li");
        content.append(item);
        return { value, item };
    });
    document.body.append(content);
    const running = run(
        selectionList.machine,
        selectionList.connect,
        { id: "mail", collection, ...props },
        (api, spread) => {
            spread(content, api.getContentProps());
            for (const { value, item } of items) {
                spread(
                    item,
                    api.getItemProps({ item: collection.find(value)! }),
                );
            }
        },
    );
    stops.push(running.stop);
    return { content, items, running };
};

describe("selectionList", () => {
    it("is a listbox of options marked with aria-selected", async () => {
        const { content, items } = setUp({ defaultValue: ["starred"] });
        await settle();
        expect(content.getAttribute("role")).toBe("listbox");
        const [inbox, starred] = items.map(({ item }) => item);
        expect(inbox?.getAttribute("role")).toBe("option");
        expect(inbox?.getAttribute("aria-selected")).toBe("false");
        expect(starred?.getAttribute("aria-selected")).toBe("true");
    });

    it("selects several in multiple mode", async () => {
        const { items, running } = setUp({ selectionMode: "multiple" });
        await settle();
        for (const { item } of items) item.click();
        await settle();
        expect(running.api().value).toEqual(VALUES);
    });

    it("hovers the highlighted option on its interaction source while the list has focus", async () => {
        const seen: Interaction["type"][] = [];
        const source = createInteractionSource();
        source.subscribe((interaction) => seen.push(interaction.type));
        const { content, running } = setUp({
            itemInteractionSource: (value: string) =>
                value === "sent" ? source : createInteractionSource(),
        });
        await settle();
        content.focus();
        await settle();
        running.api().highlightValue("sent");
        await settle();
        expect(seen).toContain("hoverEnter");
    });
});
