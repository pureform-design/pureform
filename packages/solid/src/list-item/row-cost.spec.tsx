// A budget for what one row of a list costs to set up: a ready-made interactive list item, as an
// app's list draws its rows, so the per-instance cost can't creep back unnoticed.

import { createRegistry } from "@pureform/styling";
import type { ClassFactory, ComponentShape } from "@pureform/styling";
import { createSignal, DEV, flush, For } from "solid-js";
import { describe, expect, it } from "vitest";

import { PureformProvider } from "..";
import { Avatar } from "../avatar";
import { List } from "../list";
import { mount, settle } from "../testing/mount";
import { ListItem } from "./list-item";

const named =
    (
        component: string,
        slots: readonly string[],
    ): ClassFactory<ComponentShape> =>
    () =>
        Object.fromEntries(
            slots.map((slot) => [slot, { class: `${component}__${slot}` }]),
        ) as never;

const registry = () =>
    createRegistry({
        list: named("list", ["root", "item"]),
        listItem: named("list-item", [
            "root",
            "leading",
            "content",
            "overline",
            "headline",
            "supportingText",
            "trailing",
            "trailingText",
        ]),
        avatar: named("avatar", ["root"]),
        ripple: named("ripple", ["root", "ripple"]),
    } as never);

// The solid-js refresh plugin's memo between a component and its body, in development only.
const PLUMBING = 1 << 25;

/** The reactive nodes `add` creates: computations (memos and effects), other owners, and signals.
 *  Development's own nodes are left out: the owner around each component and the refresh
 *  plugin's memo, which production doesn't make. */
const nodesCreated = async (add: () => void): Promise<number> => {
    const owners: { _component?: unknown; _config?: number }[] = [];
    let signals = 0;
    DEV!.hooks.onOwner = (owner) => owners.push(owner as never);
    DEV!.hooks.onGraph = () => signals++;
    try {
        add();
        flush();
        await settle();
    } finally {
        delete (DEV!.hooks as { onOwner?: unknown }).onOwner;
        delete (DEV!.hooks as { onGraph?: unknown }).onGraph;
    }
    const own = owners.filter(
        (owner) =>
            owner._component === undefined &&
            ((owner._config ?? 0) & PLUMBING) === 0,
    );
    return own.length + signals;
};

const text = (value: string) => value;

describe("ListItem, setup cost", () => {
    it("makes no more reactive nodes per interactive row than its budget", async () => {
        const [rows, setRows] = createSignal<number[]>([]);
        mount(() => (
            <PureformProvider registry={registry() as never}>
                <List.Root>
                    <For each={rows()}>
                        {(row) => (
                            <List.Item>
                                {/* As an app's rows are drawn: a button with an avatar, and
                                    text read from its data. */}
                                <ListItem
                                    as="button"
                                    class={{ root: "row" }}
                                    headline={text(`Row ${row}`)}
                                    supportingText={text("Food · Oct 12")}
                                    leading={<Avatar color="primary">A</Avatar>}
                                    trailingText={text("-$12.30")}
                                    onClick={() => {}}
                                />
                            </List.Item>
                        )}
                    </For>
                </List.Root>
            </PureformProvider>
        ));
        await settle();
        const nodes = await nodesCreated(() => setRows([1]));
        // Covers the row's owner, the li, and the list item: each part's props memo and its
        // element's effects (root with its indication and layer, leading with the avatar,
        // content, headline, supporting and trailing text), the Shows for the text that can come
        // and go, the classes, the source's handlers, and the contexts. It was 144 before the
        // parts shared their slot props, dropped their extra memos, and built the leading content
        // once. Lower it when it drops.
        expect(nodes).toBeLessThanOrEqual(68);
        expect(nodes).toBeGreaterThan(40);
    });
});
