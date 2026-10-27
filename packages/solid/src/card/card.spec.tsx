import { testIds } from "@pureform/anatomy";
import { createSignal, flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";

import { Card } from ".";
import { createInteractionSource, PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.card;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={displayRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

describe("Card", () => {
    it("is a static surface around its children by default", async () => {
        withRegistry(() => (
            <Card variant="outlined">
                <p>Plan</p>
            </Card>
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("DIV");
        expect(root.className).toBe(
            "card card--variant-outlined card--interactive-false",
        );
        expect(root.textContent).toBe("Plan");
        expect(
            document.querySelector(`[data-testid="${ids.touchTarget}"]`),
        ).toBe(null);
        expect(root.querySelector("[data-ripple-layer]")).toBe(null);
    });

    it("is an interactive button with its touch target, disabled natively", async () => {
        withRegistry(() => (
            <Card as="button" disabled>
                Plan
            </Card>
        ));
        await settle();
        const root = byTestId<HTMLButtonElement>(ids.root);
        expect(root.tagName).toBe("BUTTON");
        expect(root.type).toBe("button");
        expect(root.disabled).toBe(true);
        expect(root.className).toContain("card--interactive-true");
        // The ripple's layer comes first, then the touch target.
        expect(root.firstElementChild?.hasAttribute("data-ripple-layer")).toBe(
            true,
        );
        expect(root.children[1]).toBe(byTestId(ids.touchTarget));
    });

    it("is a link with an href", async () => {
        withRegistry(() => <Card href="#plan">Plan</Card>);
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("A");
        expect(root.getAttribute("href")).toBe("#plan");
    });

    it("ends a press when it becomes disabled, emitting to the source it has then", async () => {
        const warn = vi.spyOn(console, "warn");
        try {
            const source = createInteractionSource();
            const [disabled, setDisabled] = createSignal(false, {
                ownedWrite: true,
            });
            withRegistry(() => (
                <Card
                    as="button"
                    interactionSource={source}
                    disabled={disabled()}
                >
                    Plan
                </Card>
            ));
            await settle();
            byTestId(ids.root).dispatchEvent(
                new PointerEvent("pointerdown", {
                    bubbles: true,
                    button: 0,
                    pointerType: "mouse",
                }),
            );
            await settle();
            expect(source.state.pressed).toBe(true);
            setDisabled(true);
            flush();
            expect(source.state.pressed).toBe(false);
            expect(warn).not.toHaveBeenCalled();
        } finally {
            warn.mockRestore();
        }
    });
});

describe("Card's action area", () => {
    const pointer = (type: string, element: Element) =>
        element.dispatchEvent(
            new PointerEvent(type, {
                bubbles: true,
                button: 0,
                pointerType: "mouse",
            }),
        );

    it("is the card's one action beside its other controls, the container around them", async () => {
        const source = createInteractionSource();
        withRegistry(() => (
            <Card.Root padded={false} interactionSource={source}>
                <Card.ActionArea href="#plan">
                    <Card.Header>
                        <Card.HeaderText>
                            <Card.Headline>Basic plan</Card.Headline>
                        </Card.HeaderText>
                    </Card.Header>
                    <Card.Content>
                        <Card.SupportingText>$4 a month</Card.SupportingText>
                    </Card.Content>
                </Card.ActionArea>
                <Card.Actions>
                    <button type="button">Upgrade</button>
                </Card.Actions>
            </Card.Root>
        ));
        await settle();
        const root = byTestId(ids.root);
        const area = byTestId(ids.actionArea);
        expect(root.tagName).toBe("DIV");
        expect(root.className).toBe(
            "card card--interactive-false card--padded-false",
        );
        expect(area.tagName).toBe("A");
        expect(area.getAttribute("href")).toBe("#plan");
        expect(area.textContent).toBe("Basic plan$4 a month");
        // No control inside another, and the container takes no focus.
        expect(area.querySelector("a, button")).toBe(null);
        expect(root.hasAttribute("tabindex")).toBe(false);
        const upgrade = byTestId(ids.actions).querySelector("button")!;
        expect(area.contains(upgrade)).toBe(false);
        // The ripple's layer sits in the action area, not in the container.
        expect(area.firstElementChild?.hasAttribute("data-ripple-layer")).toBe(
            true,
        );
        expect(root.querySelector(":scope > [data-ripple-layer]")).toBe(null);
        // Its press reaches the card's source; another control's doesn't.
        pointer("pointerdown", area);
        await settle();
        expect(source.state.pressed).toBe(true);
        pointer("pointerup", area);
        await settle();
        expect(source.state.pressed).toBe(false);
        pointer("pointerdown", upgrade);
        await settle();
        expect(source.state.pressed).toBe(false);
        pointer("pointerup", upgrade);
    });

    it("is a button by default, disabled with Root", async () => {
        withRegistry(() => (
            <Card.Root disabled>
                <Card.ActionArea>Plan</Card.ActionArea>
            </Card.Root>
        ));
        await settle();
        const area = byTestId<HTMLButtonElement>(ids.actionArea);
        expect(area.tagName).toBe("BUTTON");
        expect(area.type).toBe("button");
        expect(area.disabled).toBe(true);
    });
});

describe("the ready-made Card's sections", () => {
    it("lays out the sections, and is one link when it has no other controls", async () => {
        withRegistry(() => (
            <Card
                href="#plan"
                media={<img alt="" />}
                headline="Basic plan"
                subhead="Monthly"
                supportingText="$4 a month"
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("A");
        expect(root.className).toBe(
            "card card--interactive-true card--padded-false",
        );
        expect(
            [...root.children]
                .map((child) => child.getAttribute("data-pf-part"))
                .filter(Boolean),
        ).toEqual(["touch-target", "media", "header", "content"]);
        expect(byTestId(ids.headline).textContent).toBe("Basic plan");
        expect(byTestId(ids.subhead).textContent).toBe("Monthly");
        expect(byTestId(ids.supportingText).textContent).toBe("$4 a month");
        expect(
            document.querySelector(`[data-testid="${ids.actionArea}"]`),
        ).toBe(null);
    });

    it("moves its action to the action area beside its actions", async () => {
        const click = vi.fn<(event: MouseEvent) => void>();
        withRegistry(() => (
            <Card
                as="button"
                onClick={click}
                aria-describedby="terms"
                headline="Basic plan"
                supportingText="$4 a month"
                actions={<button type="button">Upgrade</button>}
                footer="Billed monthly"
                testId="plan"
            />
        ));
        await settle();
        const root = byTestId("plan-root");
        const area = byTestId<HTMLButtonElement>("plan-action-area");
        expect(root.tagName).toBe("DIV");
        expect(root.className).toBe(
            "card card--interactive-false card--padded-false",
        );
        expect(area.tagName).toBe("BUTTON");
        expect(area.getAttribute("aria-describedby")).toBe("terms");
        expect(
            [...area.children]
                .map((child) => child.getAttribute("data-pf-part"))
                .filter(Boolean),
        ).toEqual(["header", "content"]);
        expect(
            [...root.children].map((child) =>
                child.getAttribute("data-pf-part"),
            ),
        ).toEqual(["action-area", "actions", "footer"]);
        area.click();
        expect(click).toHaveBeenCalledOnce();
        byTestId("plan-actions").querySelector("button")!.click();
        expect(click).toHaveBeenCalledOnce();
    });

    it("keeps a header holding a control out of the action area, before it", async () => {
        withRegistry(() => (
            <Card
                href="#plan"
                headline="Basic plan"
                headerAction={<button type="button">More</button>}
                supportingText="$4 a month"
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(
            [...root.children].map((child) =>
                child.getAttribute("data-pf-part"),
            ),
        ).toEqual(["header", "action-area"]);
        expect(byTestId(ids.actionArea).getAttribute("href")).toBe("#plan");
        expect(byTestId(ids.headerAction).textContent).toBe("More");
    });
});
