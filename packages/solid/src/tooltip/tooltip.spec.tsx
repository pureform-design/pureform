import { compositeTestIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Tooltip } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle, until } from "../testing/mount";

const ids = compositeTestIds.tooltip;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={overlaysRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

/** Moves the pointer off the trigger, where an earlier test or file may have left it resting
 *  (opening the tooltip as it rendered), and waits for the tooltip to close. */
const pointerOff = async (trigger: HTMLElement) => {
    await userEvent.unhover(trigger);
    await until(() => expect(byTestId(ids.positioner).hidden).toBe(true));
};

describe("Tooltip, ready-made", () => {
    it("renders its text in its surface, hidden while closed", async () => {
        withRegistry(() => (
            <Tooltip trigger="Save" supportingText="Save to drafts" />
        ));
        await settle();
        const content = byTestId(ids.content);
        expect(content.className).toBe("tooltip");
        expect(content.getAttribute("role")).toBe("tooltip");
        expect(byTestId(ids.supportingText).textContent).toBe("Save to drafts");
        expect(byTestId(ids.positioner).hidden).toBe(true);
        expect(byTestId(ids.trigger).className).toBe("button");
        expect(
            document.querySelector(`[data-testid="${ids.caret}"]`),
        ).toBeNull();
    });

    it("draws a caret, with Zag's tip inside, when given caret", async () => {
        withRegistry(() => (
            <Tooltip trigger="Save" supportingText="Save to drafts" caret />
        ));
        await settle();
        const caret = byTestId(ids.caret);
        expect(caret.parentElement).toBe(byTestId(ids.positioner));
        expect(caret.style.getPropertyValue("--arrow-background")).toBe(
            "currentColor",
        );
        expect(caret.querySelector("[data-part=arrow-tip]")).not.toBeNull();
    });

    it("opens on hover after its delay and describes the trigger", async () => {
        const openDelay = 100;
        let openedAt = 0;
        const onOpenChange = vi.fn<
            (details: ChangeDetails<"open", boolean>) => void
        >(({ open }: { open: boolean }) => {
            if (open) openedAt = performance.now();
        });
        withRegistry(() => (
            <Tooltip
                trigger="Save"
                supportingText="Save to drafts"
                openDelay={openDelay}
                closeDelay={0}
                onOpenChange={onOpenChange}
            />
        ));
        await settle();
        const trigger = byTestId(ids.trigger);
        await pointerOff(trigger);
        onOpenChange.mockClear();
        // When the pointer reaches the trigger: its first event, before the tooltip hears of it.
        let hoveredAt = 0;
        const hovers = new AbortController();
        window.addEventListener(
            "pointerover",
            (event) => {
                if (trigger.contains(event.target as Node))
                    hoveredAt ||= performance.now();
            },
            { capture: true, signal: hovers.signal },
        );
        await userEvent.hover(trigger);
        hovers.abort();
        expect(hoveredAt).toBeGreaterThan(0);
        await until(() => expect(byTestId(ids.positioner).hidden).toBe(false));
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: true });
        // A timer never fires early, however loaded the machine; the margin covers the clock's
        // coarsening.
        expect(openedAt - hoveredAt).toBeGreaterThanOrEqual(openDelay - 1);
        expect(trigger.getAttribute("aria-describedby")).toBe(
            byTestId(ids.content).id,
        );
        await userEvent.unhover(trigger);
        await until(() => expect(byTestId(ids.positioner).hidden).toBe(true));
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
    });

    it("lets the pointer through as it opens, so the trigger under it keeps the pointer", async () => {
        withRegistry(() => (
            <Tooltip
                trigger="Save"
                supportingText="Save to drafts"
                openDelay={0}
            />
        ));
        await settle();
        const trigger = byTestId(ids.trigger);
        const positioner = byTestId(ids.positioner);
        await pointerOff(trigger);
        // What the pointer hits the moment the tooltip shows: Zag lays it out at the corner of its
        // containing block, over the trigger, before it places it.
        let hit: Element | null = null;
        const shows = new MutationObserver(() => {
            if (positioner.hidden || hit) return;
            const box = trigger.getBoundingClientRect();
            hit = document.elementFromPoint(
                box.left + box.width / 2,
                box.top + box.height / 2,
            );
        });
        shows.observe(positioner, { attributeFilter: ["hidden"] });
        await userEvent.hover(trigger);
        await until(() => expect(hit).not.toBeNull());
        shows.disconnect();
        expect(trigger.contains(hit)).toBe(true);
    });

    it("lets the pointer through unless interactive", async () => {
        withRegistry(() => (
            <Tooltip trigger="Save" supportingText="Save" defaultOpen />
        ));
        await settle();
        expect(getComputedStyle(byTestId(ids.positioner)).pointerEvents).toBe(
            "none",
        );
    });
});
