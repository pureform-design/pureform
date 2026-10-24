import { testIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Splitter } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { mount, settle, until } from "../testing/mount";

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={displayRegistry()}>
            <div style={{ width: "1024px", height: "200px" }}>
                {view() as never}
            </div>
        </PureformProvider>
    ));

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

const width = (element: HTMLElement) => element.getBoundingClientRect().width;

/** Drags `trigger` by `dx` in `steps` moves, `ms` apart. */
const drag = async (trigger: HTMLElement, dx: number, steps = 5, ms = 40) => {
    const rect = trigger.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    let x = rect.left + rect.width / 2;
    const at = (type: string, target: EventTarget) =>
        target.dispatchEvent(
            new PointerEvent(type, {
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y,
                button: 0,
                buttons: type === "pointerup" ? 0 : 1,
                pointerId: 1,
                pointerType: "mouse",
                isPrimary: true,
            }),
        );
    at("pointerdown", trigger);
    for (let step = 0; step < steps; step++) {
        await new Promise((resolve) => setTimeout(resolve, ms));
        x += dx / steps;
        at("pointermove", trigger);
        at("pointermove", document);
    }
    at("pointerup", trigger);
    at("pointerup", document);
    await settle();
};

const panes = [
    { id: "list", content: "List" },
    { id: "detail", content: "Detail" },
];

describe("Splitter", () => {
    it("renders its panes with a named divider holding the pill between them", async () => {
        withRegistry(() => (
            <Splitter panes={panes} resizeLabel="Resize list" />
        ));
        await settle();
        const root = all(testIds.splitter.root)[0]!;
        expect(root.className).toBe("splitter");
        const panels = all(testIds.splitter.panel);
        expect(panels.map((panel) => panel.textContent)).toEqual([
            "List",
            "Detail",
        ]);
        expect(panels[0]!.className).toBe("splitter__panel");
        const trigger = all(testIds.splitter.resizeTrigger)[0]!;
        expect(trigger.getAttribute("role")).toBe("separator");
        expect(trigger.getAttribute("aria-label")).toBe("Resize list");
        expect(trigger.tabIndex).toBe(0);
        const pill = all(testIds.splitter.resizeTriggerIndicator)[0]!;
        expect(pill.parentElement).toBe(trigger);
        expect(pill.getAttribute("aria-hidden")).toBe("true");
        await until(() =>
            expect(width(panels[0]!)).toBeCloseTo(width(panels[1]!), 0),
        );
    });

    it("gives the handle's pill its keyed props", async () => {
        withRegistry(() => (
            <Splitter
                panes={panes}
                class={{ resizeTriggerIndicator: "grip" }}
                style={{ resizeTriggerIndicator: { opacity: 0.5 } }}
                slotProps={{ resizeTriggerIndicator: { title: "pill" } }}
            />
        ));
        await settle();
        const pill = all(testIds.splitter.resizeTriggerIndicator)[0]!;
        expect(pill.classList.contains("grip")).toBe(true);
        expect(pill.style.opacity).toBe("0.5");
        expect(pill.title).toBe("pill");
    });

    it("resizes by the arrow keys without snapping", async () => {
        const onSizeChange = vi.fn();
        withRegistry(() => (
            <Splitter
                panes={panes}
                defaultSize={[40, 60]}
                onSizeChange={onSizeChange}
            />
        ));
        await settle();
        const trigger = all(testIds.splitter.resizeTrigger)[0]!;
        trigger.focus();
        await userEvent.keyboard("{ArrowRight}");
        await until(() =>
            expect(onSizeChange).toHaveBeenLastCalledWith({ size: [41, 59] }),
        );
        expect(trigger.getAttribute("aria-valuenow")).toBe("41");
    });

    it("stacked, resizes by the arrow keys up and down, and ignores them with no room", async () => {
        const errors: unknown[] = [];
        const onError = (event: ErrorEvent) => errors.push(event.error);
        window.addEventListener("error", onError);
        const onSizeChange = vi.fn();
        mount(() => (
            <PureformProvider registry={displayRegistry()}>
                <div style={{ width: "400px", height: "200px" }}>
                    <Splitter
                        panes={panes}
                        orientation="vertical"
                        onSizeChange={onSizeChange}
                    />
                </div>
                {/* A stacked splitter in a parent with no height: Zag has no sizes. */}
                <div style={{ width: "400px", height: "0px" }}>
                    <Splitter panes={panes} orientation="vertical" />
                </div>
            </PureformProvider>
        ));
        await settle();
        const [sized, empty] = all(testIds.splitter.resizeTrigger);
        sized!.focus();
        await userEvent.keyboard("{ArrowDown}");
        await until(() =>
            expect(onSizeChange).toHaveBeenLastCalledWith({ size: [51, 49] }),
        );
        await userEvent.keyboard("{ArrowUp}{ArrowUp}");
        await until(() =>
            expect(onSizeChange).toHaveBeenLastCalledWith({ size: [49, 51] }),
        );
        empty!.focus();
        await userEvent.keyboard("{ArrowUp}{ArrowDown}");
        await settle();
        window.removeEventListener("error", onError);
        expect(errors).toEqual([]);
    });

    it("snaps a dragged divider to the nearest anchor when let go", async () => {
        const onSizeChange = vi.fn();
        withRegistry(() => (
            <Splitter
                panes={panes}
                defaultSize={[30, 70]}
                onSizeChange={onSizeChange}
            />
        ));
        await settle();
        const trigger = all(testIds.splitter.resizeTrigger)[0]!;
        // From 30% of the 1000px room to about 45%: the nearest anchor is half.
        await drag(trigger, 150, 5, 120);
        await until(() =>
            expect(onSizeChange.mock.lastCall?.[0].size[0]).toBeCloseTo(50, 1),
        );
    });

    it("rests where it's let go without anchors", async () => {
        const onSizeChange = vi.fn();
        withRegistry(() => (
            <Splitter
                panes={panes}
                anchors={[]}
                defaultSize={[30, 70]}
                onSizeChange={onSizeChange}
            />
        ));
        await settle();
        const trigger = all(testIds.splitter.resizeTrigger)[0]!;
        await drag(trigger, 150, 5, 120);
        await settle();
        expect(onSizeChange.mock.lastCall?.[0].size[0]).toBeCloseTo(45, 0);
    });

    it("composes its parts, a pane stopping at its least size", async () => {
        withRegistry(() => (
            <Splitter.Root
                panels={[{ id: "a", minSize: "300px" }, { id: "b" }]}
                orientation="horizontal"
            >
                <Splitter.Panel id="a">A</Splitter.Panel>
                <Splitter.ResizeTrigger id="a:b" />
                <Splitter.Panel id="b">B</Splitter.Panel>
            </Splitter.Root>
        ));
        await settle();
        const trigger = all(testIds.splitter.resizeTrigger)[0]!;
        expect(trigger.getAttribute("aria-label")).toBe("Resize panes");
        await drag(trigger, -400);
        const panel = all(testIds.splitter.panel)[0]!;
        await until(() => expect(width(panel)).toBeCloseTo(300, -1));
    });
});
