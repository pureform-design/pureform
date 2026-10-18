import { afterEach, describe, expect, it, vi } from "vitest";

import * as select from "./select";
import { run, settle } from "./testing/vanilla";

interface Item {
    readonly value: string;
    readonly label: string;
}

const SMALL = { value: "s", label: "Small" };
const MEDIUM = { value: "m", label: "Medium" };
const MID = { value: "m", label: "Mid" };

const collection = (...items: Item[]) => select.collection({ items });

const mount = (props: select.Props | Partial<select.Props>) => {
    document.body.innerHTML = `<select id="select:size:select"></select>`;
    const hidden = document.querySelector("select")!;
    let current = { id: "size", ...props };
    const control = run(
        select.machine,
        select.connect,
        current,
        (api, spread) => spread(hidden, api.getHiddenSelectProps()),
    );
    return {
        ...control,
        update(next: Partial<select.Props>) {
            current = { ...current, ...next };
            control.setProps(current);
        },
    };
};

const selected = (control: { service: select.Service }) => ({
    items: control.service.computed("selectedItems"),
    text: control.service.computed("valueAsString"),
});

afterEach(() => {
    document.body.innerHTML = "";
});

describe("select.machine's selected items", () => {
    it("follow a controlled value as soon as it changes", async () => {
        const control = mount({
            value: ["s"],
            collection: collection(SMALL, MEDIUM),
        });
        await settle();
        expect(selected(control)).toEqual({ items: [SMALL], text: "Small" });
        control.update({ value: ["m"] });
        expect(selected(control)).toEqual({ items: [MEDIUM], text: "Medium" });
        control.update({ value: [] });
        expect(selected(control)).toEqual({ items: [], text: "" });
        control.stop();
    });

    it("follow the collection as items are added, relabelled, and removed", async () => {
        const control = mount({
            defaultValue: ["m"],
            collection: collection(SMALL),
        });
        await settle();
        expect(selected(control)).toEqual({ items: [], text: "" });
        control.update({ collection: collection(SMALL, MEDIUM) });
        expect(selected(control)).toEqual({ items: [MEDIUM], text: "Medium" });
        control.update({ collection: collection(SMALL, MID) });
        expect(selected(control)).toEqual({ items: [MID], text: "Mid" });
        control.stop();
    });

    it("keep a selected item that leaves the collection, until it's no longer selected", async () => {
        const control = mount({
            defaultValue: ["m"],
            collection: collection(SMALL, MEDIUM),
        });
        await settle();
        control.update({ collection: collection(SMALL, MID) });
        await settle();
        control.update({ collection: collection(SMALL) });
        expect(selected(control)).toEqual({ items: [MID], text: "Mid" });
        await settle();
        expect(selected(control)).toEqual({ items: [MID], text: "Mid" });
        control.api().selectValue("s");
        await settle();
        expect(selected(control)).toEqual({ items: [SMALL], text: "Small" });
        control.api().setValue(["m"]);
        await settle();
        expect(selected(control)).toEqual({ items: [], text: "" });
        control.stop();
    });

    it("are reported with a chosen value, and kept for a controlled value", async () => {
        const onValueChange = vi.fn();
        const control = mount({
            value: ["m"],
            collection: collection(SMALL, MEDIUM),
            onValueChange,
        });
        await settle();
        control.update({ collection: collection(SMALL) });
        await settle();
        control.api().selectValue("s");
        await settle();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({
            value: ["s"],
            items: [SMALL],
        });
        expect(selected(control)).toEqual({ items: [MEDIUM], text: "Medium" });
        control.update({ value: ["s"] });
        await settle();
        expect(selected(control)).toEqual({ items: [SMALL], text: "Small" });
        control.stop();
    });
});
