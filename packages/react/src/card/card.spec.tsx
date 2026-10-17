import { testIds } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { Card } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const ids = testIds.card;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={displayRegistry()}>
            {view}
        </PureformProvider>,
    );

/** The first element with a test id. */
const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E => {
    const element = document.querySelector<E>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};

describe("Card", () => {
    it("is a static surface around its children by default", async () => {
        withRegistry(
            <Card variant="outlined">
                <p>Plan</p>
            </Card>,
        );
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
    });

    it("is an interactive button with its touch target, disabled natively", async () => {
        withRegistry(
            <Card as="button" disabled>
                Plan
            </Card>,
        );
        await settle();
        const root = byTestId<HTMLButtonElement>(ids.root);
        expect(root.tagName).toBe("BUTTON");
        expect(root.type).toBe("button");
        expect(root.disabled).toBe(true);
        expect(root.className).toContain("card--interactive-true");
        expect(root.firstElementChild).toBe(byTestId(ids.touchTarget));
    });

    it("is a link with an href", async () => {
        withRegistry(<Card href="#plan">Plan</Card>);
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("A");
        expect(root.getAttribute("href")).toBe("#plan");
    });
});
