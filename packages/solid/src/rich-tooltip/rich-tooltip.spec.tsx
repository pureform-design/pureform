import { compositeTestIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { RichTooltip } from ".";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle, until } from "../testing/mount";

const ids = compositeTestIds.richTooltip;

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

describe("RichTooltip, ready-made", () => {
    it("renders its parts, hidden while closed", async () => {
        withRegistry(() => (
            <RichTooltip
                trigger="Save"
                subhead="Drafts"
                supportingText="Drafts stay here."
                actions={<button type="button">Learn more</button>}
            />
        ));
        await settle();
        const content = byTestId(ids.content);
        expect(content.className).toBe("richTooltip");
        expect(content.getAttribute("role")).toBe("tooltip");
        expect(byTestId(ids.subhead).textContent).toBe("Drafts");
        expect(byTestId(ids.supportingText).textContent).toBe(
            "Drafts stay here.",
        );
        expect(byTestId(ids.actions).querySelector("button")).not.toBeNull();
        expect(byTestId(ids.positioner).hidden).toBe(true);
    });

    it("draws a caret, with Zag's tip inside, when given caret", async () => {
        withRegistry(() => (
            <RichTooltip trigger="Save" supportingText="Save to drafts" caret />
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
        const onOpenChange = vi.fn(({ open }: { open: boolean }) => {
            if (open) openedAt = performance.now();
        });
        withRegistry(() => (
            <RichTooltip
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

    it("keeps the pointer on it, for its actions, unless told otherwise", async () => {
        withRegistry(() => (
            <RichTooltip
                trigger="Drafts"
                supportingText="Drafts stay here."
                defaultOpen
            />
        ));
        await settle();
        expect(getComputedStyle(byTestId(ids.positioner)).pointerEvents).toBe(
            "auto",
        );
    });
});
