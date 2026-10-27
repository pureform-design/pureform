import { compositeTestIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Popover } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { Button } from "../button";
import { interact, mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = compositeTestIds.popover;

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

describe("Popover, ready-made", () => {
    it("renders its parts in place, named by its title, hidden while closed", async () => {
        withRegistry(
            <Popover
                trigger="Filters"
                heading="Filters"
                body="Pick some."
                actions={<button type="button">Apply</button>}
            />,
        );
        await settle();
        const content = byTestId(ids.content);
        expect(content.className).toBe("popover");
        expect(content.getAttribute("role")).toBe("dialog");
        expect(content.getAttribute("aria-labelledby")).toBe(
            byTestId(ids.title).id,
        );
        expect(byTestId(ids.title).tagName).toBe("H2");
        expect(byTestId(ids.body).textContent).toBe("Pick some.");
        expect(byTestId(ids.actions).querySelector("button")).not.toBeNull();
        expect(byTestId(ids.positioner).hidden).toBe(true);
        expect(byTestId(ids.root).contains(content)).toBe(true);
        expect(byTestId(ids.trigger).getAttribute("aria-haspopup")).toBe(
            "dialog",
        );
    });

    it("draws a caret, with Zag's tip inside, when given caret", async () => {
        withRegistry(<Popover trigger="Filters" body="Pick some." caret />);
        await settle();
        const caret = byTestId(ids.caret);
        expect(caret.parentElement).toBe(byTestId(ids.positioner));
        expect(caret.style.getPropertyValue("--arrow-background")).toBe(
            "currentColor",
        );
        expect(caret.querySelector("[data-part=arrow-tip]")).not.toBeNull();
    });

    it("opens from a press, and closes with Escape, giving focus back to its trigger", async () => {
        const onOpenChange =
            vi.fn<(details: ChangeDetails<"open", boolean>) => void>();
        withRegistry(
            <Popover
                trigger="Filters"
                heading="Filters"
                body={<input aria-label="Name" />}
                onOpenChange={onOpenChange}
            />,
        );
        await settle();
        const trigger = byTestId(ids.trigger);
        await interact(() => userEvent.click(trigger));
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: true });
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
        expect(byTestId(ids.positioner).hidden).toBe(false);
        await interact(() => userEvent.keyboard("{Escape}"));
        await frames();
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
        expect(byTestId(ids.positioner).hidden).toBe(true);
        expect(document.activeElement).toBe(trigger);
    });

    it("closes on a press outside, unless told otherwise", async () => {
        withRegistry(
            <>
                <button type="button" data-testid="elsewhere">
                    Elsewhere
                </button>
                <Popover trigger="Filters" body="Pick some." defaultOpen />
            </>,
        );
        await frames();
        expect(byTestId(ids.positioner).hidden).toBe(false);
        await interact(() => userEvent.click(byTestId("elsewhere")));
        await frames();
        expect(byTestId(ids.positioner).hidden).toBe(true);
    });

    it("stays open on a press outside with closeOnInteractOutside off", async () => {
        withRegistry(
            <>
                <button type="button" data-testid="elsewhere">
                    Elsewhere
                </button>
                <Popover
                    trigger="Filters"
                    body="Pick some."
                    defaultOpen
                    closeOnInteractOutside={false}
                />
            </>,
        );
        await frames();
        await interact(() => userEvent.click(byTestId("elsewhere")));
        await frames();
        expect(byTestId(ids.positioner).hidden).toBe(false);
    });

    it("is not modal unless told so: the page stays reachable", async () => {
        withRegistry(
            <>
                <button type="button" data-testid="elsewhere">
                    Elsewhere
                </button>
                <Popover trigger="Filters" body="Pick some." defaultOpen />
            </>,
        );
        await frames();
        expect(byTestId("elsewhere").closest("[aria-hidden=true]")).toBeNull();
        expect(byTestId(ids.content).getAttribute("aria-modal")).not.toBe(
            "true",
        );
    });

    it("hides the page from assistive technology when modal", async () => {
        withRegistry(
            <>
                <button type="button" data-testid="elsewhere">
                    Elsewhere
                </button>
                <Popover
                    trigger="Filters"
                    body="Pick some."
                    defaultOpen
                    modal
                />
            </>,
        );
        await frames();
        expect(
            byTestId("elsewhere").closest("[aria-hidden=true]"),
        ).not.toBeNull();
        expect(byTestId(ids.content).getAttribute("aria-modal")).toBe("true");
    });

    it("follows a controlled open", async () => {
        function Controlled(): ReactNode {
            const [open, setOpen] = useState(false);
            return (
                <>
                    <button
                        type="button"
                        data-testid="outside"
                        onClick={() => setOpen(true)}
                    >
                        Open
                    </button>
                    <Popover
                        trigger="Filters"
                        body="Pick some."
                        open={open}
                        onOpenChange={({ open }) => setOpen(open)}
                    />
                </>
            );
        }
        withRegistry(<Controlled />);
        await settle();
        expect(byTestId(ids.positioner).hidden).toBe(true);
        await interact(() => userEvent.click(byTestId("outside")));
        await frames();
        expect(byTestId(ids.positioner).hidden).toBe(false);
    });

    it("maps testId and unstyled from Root's", async () => {
        withRegistry(
            <Popover
                trigger="Filters"
                body="Pick some."
                testId={{ body: "stuff" }}
                unstyled={{ content: true }}
            />,
        );
        await settle();
        expect(byTestId("stuff").textContent).toBe("Pick some.");
        expect(byTestId(ids.content).className).toBe("");
    });
});

describe("Popover, compound", () => {
    it("closes from a close trigger drawn as a button", async () => {
        withRegistry(
            <Popover.Root defaultOpen>
                <Popover.Trigger as={Button} label="Filters" />
                <Popover.Positioner>
                    <Popover.Content>
                        <Popover.Title>Filters</Popover.Title>
                        <Popover.Body>Pick some.</Popover.Body>
                        <Popover.Actions>
                            <Popover.CloseTrigger as={Button} label="Cancel" />
                        </Popover.Actions>
                    </Popover.Content>
                </Popover.Positioner>
            </Popover.Root>,
        );
        await frames();
        expect(byTestId(ids.positioner).hidden).toBe(false);
        await interact(() => userEvent.click(byTestId(ids.closeTrigger)));
        await frames();
        expect(byTestId(ids.positioner).hidden).toBe(true);
    });
});
