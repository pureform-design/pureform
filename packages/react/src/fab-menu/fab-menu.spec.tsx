import { testIds } from "@pureform/anatomy";
import { springRoleVar } from "@pureform/binding-web";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { FabMenu } from ".";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { mount, outside, settle } from "../testing/render";

const ids = testIds.fabMenu;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={overlaysRegistry()}>
            {view}
        </PureformProvider>,
    );

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

const registry = overlaysRegistry();

// The theme writes a spring token's parameters under `<var>-stiffness`, `-damping` and `-mass`.
const writeSlowEffects = (stiffness = 800) => {
    const name = springRoleVar(registry, "effectsSlow")!;
    const root = document.documentElement.style;
    root.setProperty(`${name}-stiffness`, String(stiffness));
    root.setProperty(`${name}-damping`, "1");
    root.setProperty(`${name}-mass`, "1");
};

const DELAY = "--components-fabMenu-staggerDelay";
const TOTAL = "--components-fabMenu-staggerTotal";

const waits = () =>
    all(ids.item).map((item) =>
        item.style.getPropertyValue(DELAY) === ""
            ? undefined
            : Number.parseFloat(item.style.getPropertyValue(DELAY)),
    );

const staggerRegistry = (view: ReactNode) =>
    mount(<PureformProvider registry={registry}>{view}</PureformProvider>);

afterEach(() => {
    document.documentElement.removeAttribute("style");
});

describe("FabMenu, composed", () => {
    const Menu = (props: { open?: boolean; count?: number }) => (
        <FabMenu.Root open={props.open ?? true}>
            <FabMenu.CloseTrigger aria-label="Create">+</FabMenu.CloseTrigger>
            <FabMenu.List>
                {Array.from({ length: props.count ?? 3 }, (_, i) => (
                    <FabMenu.Item key={i} value={`item-${i}`}>
                        <FabMenu.ItemLabel>Item {i}</FabMenu.ItemLabel>
                    </FabMenu.Item>
                ))}
            </FabMenu.List>
        </FabMenu.Root>
    );

    it("staggers its items on the theme's spring without being told how many there are", async () => {
        writeSlowEffects();
        staggerRegistry(<Menu count={4} />);
        await settle();
        const entering = waits();
        expect(entering).toHaveLength(4);
        // The item nearest the FAB, the last, enters first; each before it, later.
        expect(entering[3]).toBe(0);
        for (let i = 3; i > 0; i--) {
            expect(entering[i - 1]!).toBeGreaterThan(entering[i]!);
        }
    });

    it("counts every item it has, with no cap", async () => {
        writeSlowEffects();
        staggerRegistry(<Menu count={12} />);
        await settle();
        expect(new Set(waits()).size).toBe(12);
    });

    it("leaves in reverse when it closes, and holds the list for its last item", async () => {
        writeSlowEffects();
        const open = outside(true);
        staggerRegistry(
            <open.Holder>
                {(value) => <Menu open={value} count={4} />}
            </open.Holder>,
        );
        await settle();
        await open.set(false);
        await settle();
        const leaving = waits();
        expect(leaving[0]).toBe(0);
        for (let i = 0; i < 3; i++) {
            expect(leaving[i + 1]!).toBeGreaterThan(leaving[i]!);
        }
        const list = all(ids.list)[0]!;
        expect(Number.parseFloat(list.style.getPropertyValue(TOTAL))).toBe(
            Math.max(...(leaving as number[])),
        );
    });

    it("staggers the items a menu gains after it opens", async () => {
        writeSlowEffects();
        const count = outside(2);
        staggerRegistry(
            <count.Holder>{(value) => <Menu count={value} />}</count.Holder>,
        );
        await settle();
        expect(waits()).toHaveLength(2);
        await count.set(5);
        await settle();
        expect(waits()).toHaveLength(5);
        expect(new Set(waits()).size).toBe(5);
    });

    it("doesn't stagger until the theme has the spring, so a first render is still", async () => {
        staggerRegistry(<Menu count={3} />);
        await settle();
        expect(waits()).toEqual([undefined, undefined, undefined]);
        expect(all(ids.list)[0]!.style.getPropertyValue(TOTAL)).toBe("");
    });

    it("doesn't pass the stagger to the element as an attribute", async () => {
        writeSlowEffects();
        staggerRegistry(<Menu />);
        await settle();
        expect(all(ids.root)[0]!.hasAttribute("itemcount")).toBe(false);
    });
});

describe("FabMenu, ready-made", () => {
    it("takes a function of each item in its parts' keys", async () => {
        withRegistry(
            <FabMenu
                icon="+"
                fabLabel="Create"
                items={[
                    { value: "message", label: "Message", icon: "✉" },
                    { value: "call", label: "Call", icon: "☎" },
                ]}
                className={{
                    item: ({ item }) => `item-${item.value}`,
                    list: "actions",
                }}
                style={{
                    itemIcon: ({ index }) => ({ opacity: index ? 0.5 : 1 }),
                }}
                slotProps={{
                    itemLabel: ({ index }) => ({ title: `label ${index}` }),
                }}
                unstyled={{ item: ({ index }) => index === 0 }}
            />,
        );
        await settle();
        const items = all(ids.item);
        expect(items[0]!.className).toBe("item-message");
        expect(items[1]!.classList.contains("item-call")).toBe(true);
        expect(items[1]!.className).not.toBe("item-call");
        expect(all(ids.itemIcon)[1]!.style.opacity).toBe("0.5");
        expect(all(ids.itemLabel)[1]!.title).toBe("label 1");
        expect(all(ids.list)[0]!.classList.contains("actions")).toBe(true);
    });
});
