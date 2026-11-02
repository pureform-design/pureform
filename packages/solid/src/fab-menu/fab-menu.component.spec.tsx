import { testIds } from "@pureform/anatomy";
import { springRoleVar } from "@pureform/binding-web";
import { createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";

import { FabMenu } from ".";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/mount";

const ids = testIds.fabMenu;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={overlaysRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

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

const staggerRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={registry}>
            {view() as never}
        </PureformProvider>
    ));

afterEach(() => {
    document.documentElement.removeAttribute("style");
});

describe("FabMenu, composed", () => {
    const Menu = (props: { open: () => boolean; count: () => number }) => (
        <FabMenu.Root open={props.open()}>
            <FabMenu.CloseTrigger aria-label="Create">+</FabMenu.CloseTrigger>
            <FabMenu.List>
                {Array.from({ length: props.count() }, (_, i) => (
                    <FabMenu.Item value={`item-${i}`}>
                        <FabMenu.ItemLabel>Item {i}</FabMenu.ItemLabel>
                    </FabMenu.Item>
                ))}
            </FabMenu.List>
        </FabMenu.Root>
    );

    it("staggers its items on the theme's spring without being told how many there are", async () => {
        writeSlowEffects();
        staggerRegistry(() => <Menu open={() => true} count={() => 4} />);
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
        staggerRegistry(() => <Menu open={() => true} count={() => 12} />);
        await settle();
        expect(new Set(waits()).size).toBe(12);
    });

    it("leaves in reverse when it closes, and holds the list for its last item", async () => {
        writeSlowEffects();
        const [open, setOpen] = createSignal(true);
        staggerRegistry(() => <Menu open={open} count={() => 4} />);
        await settle();
        setOpen(false);
        flush();
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
        const [count, setCount] = createSignal(2);
        staggerRegistry(() => <Menu open={() => true} count={count} />);
        await settle();
        expect(waits()).toHaveLength(2);
        setCount(5);
        flush();
        await settle();
        expect(waits()).toHaveLength(5);
        expect(new Set(waits()).size).toBe(5);
    });

    it("doesn't stagger until the theme has the spring, so a first render is still", async () => {
        staggerRegistry(() => <Menu open={() => true} count={() => 3} />);
        await settle();
        expect(waits()).toEqual([undefined, undefined, undefined]);
        expect(all(ids.list)[0]!.style.getPropertyValue(TOTAL)).toBe("");
    });

    it("doesn't pass the stagger to the element as an attribute", async () => {
        writeSlowEffects();
        staggerRegistry(() => <Menu open={() => true} count={() => 2} />);
        await settle();
        expect(all(ids.root)[0]!.hasAttribute("itemcount")).toBe(false);
    });
});

describe("FabMenu, ready-made", () => {
    it("takes a function of each item in its parts' keys", async () => {
        withRegistry(() => (
            <FabMenu
                icon="+"
                fabLabel="Create"
                items={[
                    { value: "message", label: "Message", icon: "✉" },
                    { value: "call", label: "Call", icon: "☎" },
                ]}
                class={{
                    item: ({ item }) => `item-${item.value}`,
                    list: "actions",
                }}
                style={{
                    // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                    itemIcon: ({ index }) => ({ opacity: index ? 0.5 : 1 }),
                }}
                slotProps={{
                    itemLabel: ({ index }) => ({ title: `label ${index}` }),
                }}
                unstyled={{ item: ({ index }) => index === 0 }}
            />
        ));
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
