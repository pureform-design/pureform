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
});
