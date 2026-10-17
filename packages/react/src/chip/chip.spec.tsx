import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Chip } from ".";
import { PureformProvider } from "..";
import { togglesRegistry } from "../__fixtures__/registry";
import { interact, mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = testIds.chip;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={togglesRegistry()}>
            {view}
        </PureformProvider>,
    );

describe("Chip, ready-made", () => {
    it("renders a native button with its touch target, the icon when given, and the label", async () => {
        withRegistry(
            <Chip label="Vegan" icon="✓" mirrorIcon variant="elevated" />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("BUTTON");
        expect(root.className).toBe("chip chip--variant-elevated");
        expect(
            [...root.children].map((child) =>
                child.getAttribute("data-pf-part"),
            ),
        ).toEqual(["touch-target", "icon", "label"]);
        expect(byTestId(ids.icon).getAttribute("aria-hidden")).toBe("true");
        expect(byTestId(ids.icon).hasAttribute("data-pf-mirror")).toBe(true);
        expect(byTestId(ids.label).textContent).toBe("Vegan");
        expect(root.hasAttribute("aria-pressed")).toBe(false);
    });

    it("renders no icon part without an icon", async () => {
        withRegistry(<Chip label="Vegan" />);
        await settle();
        expect(
            document.querySelector(`[data-testid="${ids.icon}"]`),
        ).toBeNull();
    });

    it("toggles as a filter chip, reported with aria-pressed", async () => {
        const onSelectedChange = vi.fn();
        withRegistry(
            <Chip
                label="Vegan"
                defaultSelected={false}
                onSelectedChange={onSelectedChange}
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.getAttribute("aria-pressed")).toBe("false");
        await interact(() => userEvent.click(root));
        expect(root.getAttribute("aria-pressed")).toBe("true");
        expect(onSelectedChange.mock.calls).toEqual([[{ selected: true }]]);
    });
});
