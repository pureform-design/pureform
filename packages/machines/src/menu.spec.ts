import { createInteractionSource } from "@pureform/binding-core/interaction";
import type { Interaction } from "@pureform/binding-core/interaction";
import { afterEach, describe, expect, it } from "vitest";

import * as menu from "./menu";
import { run, settle } from "./testing/vanilla";

const stops: (() => void)[] = [];
afterEach(() => {
    for (const stop of stops.splice(0)) stop();
    document.body.innerHTML = "";
});

const pointer = (type: string) =>
    new PointerEvent(type, {
        bubbles: true,
        button: 0,
        pointerType: "mouse",
        clientX: 10,
        clientY: 20,
    });

describe("menu", () => {
    it("presses a toggleable item through its interaction source, and passes groups through", async () => {
        const seen: Interaction["type"][] = [];
        const source = createInteractionSource();
        source.subscribe((interaction) => seen.push(interaction.type));
        const trigger = document.createElement("button");
        const positioner = document.createElement("div");
        const content = document.createElement("div");
        const group = document.createElement("div");
        const label = document.createElement("span");
        const option = document.createElement("div");
        group.append(label, option);
        content.append(group);
        positioner.append(content);
        document.body.append(trigger, positioner);
        const running = run(
            menu.machine,
            menu.connect,
            {
                id: "view",
                defaultOpen: true,
                itemInteractionSource: () => source,
            },
            (api, spread) => {
                spread(trigger, api.getTriggerProps());
                spread(positioner, api.getPositionerProps());
                spread(content, api.getContentProps());
                spread(group, api.getItemGroupProps({ id: "show" }));
                spread(label, api.getItemGroupLabelProps({ htmlFor: "show" }));
                spread(
                    option,
                    api.getOptionItemProps({
                        value: "grid",
                        type: "checkbox",
                        checked: true,
                    }),
                );
            },
        );
        stops.push(running.stop);
        await settle();
        expect(group.getAttribute("role")).toBe("group");
        expect(group.getAttribute("aria-labelledby")).toBe(label.id);
        expect(option.getAttribute("role")).toBe("menuitemcheckbox");
        expect(option.getAttribute("aria-checked")).toBe("true");
        option.dispatchEvent(pointer("pointerdown"));
        window.dispatchEvent(pointer("pointerup"));
        await settle();
        expect(seen).toContain("press");
    });

    it("presses a submenu's trigger item through the parent's source, and keeps the submenu's keys to it", async () => {
        const seen: string[] = [];
        const source = createInteractionSource();
        const parentSources = new Map<string, typeof source>();
        const sourceFor = (value: string) => {
            if (!parentSources.has(value)) {
                const next = createInteractionSource();
                next.subscribe((interaction) =>
                    seen.push(`${value}:${interaction.type}`),
                );
                parentSources.set(value, next);
            }
            return parentSources.get(value)!;
        };
        const parentContent = document.createElement("div");
        const triggerItem = document.createElement("div");
        const childPositioner = document.createElement("div");
        const childContent = document.createElement("div");
        const childItem = document.createElement("div");
        childContent.append(childItem);
        childPositioner.append(childContent);
        parentContent.append(triggerItem, childPositioner);
        document.body.append(parentContent);
        const child = run(
            menu.machine,
            menu.connect,
            { id: "child", itemInteractionSource: () => source },
            (api, spread) => {
                spread(childPositioner, api.getPositionerProps());
                spread(childContent, api.getContentProps());
                spread(childItem, api.getItemProps({ value: "copy" }));
            },
        );
        stops.push(child.stop);
        const parent = run(
            menu.machine,
            menu.connect,
            {
                id: "parent",
                defaultOpen: true,
                itemInteractionSource: sourceFor,
            },
            (api, spread) => {
                spread(parentContent, api.getContentProps());
                spread(triggerItem, api.getTriggerItemProps(child.api()));
            },
        );
        stops.push(parent.stop);
        parent.api().setChild(child.service as never);
        child.api().setParent(parent.service as never);
        await settle();
        expect(triggerItem.getAttribute("aria-haspopup")).toBe("menu");
        expect(triggerItem.getAttribute("aria-controls")).toBe(childContent.id);
        triggerItem.dispatchEvent(pointer("pointerdown"));
        window.dispatchEvent(pointer("pointerup"));
        await settle();
        expect(seen).toContain(`${triggerItem.id}:press`);
        // Enter in the submenu's content presses nothing of the parent's.
        parent.api().setHighlightedValue(triggerItem.id);
        await settle();
        seen.length = 0;
        childItem.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        );
        await settle();
        expect(seen.filter((entry) => entry.endsWith(":press"))).toEqual([]);
        // In its own content, it presses the highlighted item.
        parentContent.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        );
        await settle();
        expect(seen).toContain(`${triggerItem.id}:press`);
    });
});

describe("isContextMenuKey", () => {
    it("is the context menu key, or Shift+F10 alone", () => {
        expect(menu.isContextMenuKey({ key: "ContextMenu" })).toBe(true);
        expect(menu.isContextMenuKey({ key: "F10", shiftKey: true })).toBe(
            true,
        );
        expect(menu.isContextMenuKey({ key: "F10" })).toBe(false);
        expect(
            menu.isContextMenuKey({
                key: "F10",
                shiftKey: true,
                ctrlKey: true,
            }),
        ).toBe(false);
        expect(menu.isContextMenuKey({ key: "Enter" })).toBe(false);
    });
});
