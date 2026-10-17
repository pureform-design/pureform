import { compositeTestIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Tooltip } from ".";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { interact, mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = compositeTestIds.tooltip;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={overlaysRegistry()}>
            {view}
        </PureformProvider>,
    );

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
};

describe("Tooltip, ready-made", () => {
    it("renders a plain tooltip's text in its surface, hidden while closed", async () => {
        withRegistry(
            <Tooltip trigger="Save" supportingText="Save to drafts" />,
        );
        await settle();
        const content = byTestId(ids.content);
        expect(content.className).toBe("tooltip");
        expect(content.getAttribute("role")).toBe("tooltip");
        expect(content.textContent).toBe("Save to drafts");
        expect(byTestId(ids.positioner).hidden).toBe(true);
        expect(
            document.querySelector(`[data-testid="${ids.supportingText}"]`),
        ).toBeNull();
        expect(byTestId(ids.trigger).className).toBe("button");
    });

    it("renders a rich tooltip's parts", async () => {
        withRegistry(
            <Tooltip
                trigger="Save"
                variant="rich"
                subhead="Drafts"
                supportingText="Drafts stay here."
                actions={<button type="button">Learn more</button>}
            />,
        );
        await settle();
        expect(byTestId(ids.content).className).toBe(
            "tooltip tooltip--variant-rich",
        );
        expect(byTestId(ids.subhead).textContent).toBe("Drafts");
        expect(byTestId(ids.supportingText).textContent).toBe(
            "Drafts stay here.",
        );
        expect(byTestId(ids.actions).querySelector("button")).not.toBeNull();
    });

    it("opens on hover after its delay and describes the trigger", async () => {
        const onOpenChange = vi.fn();
        withRegistry(
            <Tooltip
                trigger="Save"
                supportingText="Save to drafts"
                openDelay={0}
                closeDelay={0}
                onOpenChange={onOpenChange}
            />,
        );
        await settle();
        const trigger = byTestId(ids.trigger);
        // The pointer may already rest on it, where the last test left it.
        await interact(() => userEvent.unhover(trigger));
        await interact(() => userEvent.hover(trigger));
        await frames();
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: true });
        expect(byTestId(ids.positioner).hidden).toBe(false);
        expect(trigger.getAttribute("aria-describedby")).toBe(
            byTestId(ids.content).id,
        );
        await interact(() => userEvent.unhover(trigger));
        await frames();
        expect(byTestId(ids.positioner).hidden).toBe(true);
    });
});
