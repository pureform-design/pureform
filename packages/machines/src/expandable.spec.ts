import { createInteractionSource } from "@pureform/binding-core/interaction";
import type { Interaction } from "@pureform/binding-core/interaction";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import * as accordion from "./accordion";
import { run, settle } from "./testing/vanilla";
import * as treeView from "./tree-view";

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

describe("accordion", () => {
    it("expands an item from its header, moves between headers with the arrow keys, and emits each header's interactions", async () => {
        const seen: Interaction["type"][] = [];
        const source = createInteractionSource();
        source.subscribe((interaction) => seen.push(interaction.type));
        const root = document.createElement("div");
        const values = ["a", "b"];
        const triggers = values.map((value) => {
            const button = document.createElement("button");
            button.textContent = value;
            return button;
        });
        const contents = values.map(() => document.createElement("div"));
        for (const [index] of values.entries()) {
            const item = document.createElement("div");
            item.append(triggers[index]!, contents[index]!);
            root.append(item);
        }
        document.body.append(root);
        const running = run(
            accordion.machine,
            accordion.connect,
            {
                id: "faq",
                collapsible: true,
                itemInteractionSource: (value) =>
                    value === "a" ? source : createInteractionSource(),
            },
            (api, spread) => {
                spread(root, api.getRootProps());
                for (const [index, value] of values.entries()) {
                    spread(
                        triggers[index]!,
                        api.getItemTriggerProps({ value }),
                    );
                    spread(
                        contents[index]!,
                        api.getItemContentProps({ value }),
                    );
                }
            },
        );
        stops.push(running.stop);
        await settle();
        expect(triggers[0]!.getAttribute("aria-expanded")).toBe("false");
        expect(contents[0]!.hidden).toBe(true);
        triggers[0]!.dispatchEvent(pointer("pointerdown"));
        await userEvent.click(triggers[0]!);
        await settle();
        expect(seen).toContain("press");
        expect(triggers[0]!.getAttribute("aria-expanded")).toBe("true");
        expect(contents[0]!.hidden).toBe(false);
        await userEvent.keyboard("{ArrowDown}");
        await settle();
        expect(document.activeElement).toBe(triggers[1]);
        await userEvent.keyboard("{Enter}");
        await settle();
        expect(triggers[1]!.getAttribute("aria-expanded")).toBe("true");
        expect(triggers[0]!.getAttribute("aria-expanded")).toBe("false");
    });
});

describe("tree view", () => {
    interface Node {
        id: string;
        name: string;
        children?: Node[];
    }
    const collection = treeView.collection<Node>({
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.name,
        rootNode: {
            id: "root",
            name: "",
            children: [
                {
                    id: "src",
                    name: "src",
                    children: [{ id: "index", name: "index.ts" }],
                },
                { id: "readme", name: "README.md" },
            ],
        },
    });

    it("makes a branch's control its treeitem, owning its group, and emits each row's interactions", async () => {
        const seen: Interaction["type"][] = [];
        const source = createInteractionSource();
        source.subscribe((interaction) => seen.push(interaction.type));
        document.body.innerHTML = `<div data-tree><div data-branch><div data-control>src</div><div data-group><div data-leaf="index">index.ts</div></div></div><div data-leaf="readme">README.md</div></div>`;
        const $ = (selector: string) =>
            document.querySelector<HTMLElement>(selector)!;
        const running = run(
            treeView.machine,
            treeView.connect,
            {
                id: "files",
                collection,
                itemInteractionSource: (value) =>
                    value === "src" ? source : createInteractionSource(),
            },
            (api, spread) => {
                spread($("[data-tree]"), api.getTreeProps());
                const src = { node: collection.at([0])!, indexPath: [0] };
                spread($("[data-branch]"), api.getBranchProps(src));
                spread($("[data-control]"), api.getBranchControlProps(src));
                spread($("[data-group]"), api.getBranchContentProps(src));
                spread(
                    $('[data-leaf="index"]'),
                    api.getItemProps({
                        node: collection.at([0, 0])!,
                        indexPath: [0, 0],
                    }),
                );
                spread(
                    $('[data-leaf="readme"]'),
                    api.getItemProps({
                        node: collection.at([1])!,
                        indexPath: [1],
                    }),
                );
            },
        );
        stops.push(running.stop);
        await settle();
        const control = $("[data-control]");
        expect(control.getAttribute("role")).toBe("treeitem");
        expect(control.getAttribute("aria-level")).toBe("1");
        expect(control.getAttribute("aria-expanded")).toBe("false");
        expect(control.getAttribute("aria-selected")).toBe("false");
        expect(control.getAttribute("aria-owns")).toBe($("[data-group]").id);
        expect($("[data-group]").id).not.toBe("");
        // The branch's element is plain: the row is the treeitem.
        expect($("[data-branch]").hasAttribute("role")).toBe(false);
        expect($("[data-branch]").hasAttribute("aria-expanded")).toBe(false);
        expect($("[data-group]").hidden).toBe(true);
        control.dispatchEvent(pointer("pointerdown"));
        await userEvent.click(control);
        await settle();
        expect(seen).toContain("press");
        expect(control.getAttribute("aria-expanded")).toBe("true");
        expect(control.getAttribute("aria-selected")).toBe("true");
        expect($("[data-group]").hidden).toBe(false);
        // The arrow keys walk the visible rows, into the expanded branch.
        await userEvent.keyboard("{ArrowDown}");
        await settle();
        expect(document.activeElement).toBe($('[data-leaf="index"]'));
        await userEvent.keyboard("{ArrowLeft}");
        await settle();
        expect(document.activeElement).toBe(control);
        await userEvent.keyboard("{ArrowLeft}");
        await settle();
        expect(control.getAttribute("aria-expanded")).toBe("false");
    });
});
