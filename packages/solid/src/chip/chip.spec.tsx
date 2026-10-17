import { testIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Chip } from ".";
import { PureformProvider } from "..";
import { togglesRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.chip;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={togglesRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

describe("Chip, ready-made", () => {
    it("renders a native button with its touch target, the icon when given, and the label", async () => {
        withRegistry(() => (
            <Chip label="Vegan" icon="✓" mirrorIcon variant="elevated" />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("BUTTON");
        expect(root.className).toBe("chip chip--variant-elevated");
        expect(
            [...root.children].map(
                (child) =>
                    child.getAttribute("data-pf-part") ??
                    (child.hasAttribute("data-ripple-layer") ? "layer" : null),
            ),
        ).toEqual(["layer", "touch-target", "icon", "label"]);
        expect(byTestId(ids.icon).getAttribute("aria-hidden")).toBe("true");
        expect(byTestId(ids.icon).hasAttribute("data-pf-mirror")).toBe(true);
        expect(byTestId(ids.label).textContent).toBe("Vegan");
        expect(root.hasAttribute("aria-pressed")).toBe(false);
    });

    it("renders no icon part without an icon", async () => {
        withRegistry(() => <Chip label="Vegan" />);
        await settle();
        expect(
            document.querySelector(`[data-testid="${ids.icon}"]`),
        ).toBeNull();
    });

    it("toggles as a filter chip, reported with aria-pressed", async () => {
        const onSelectedChange = vi.fn();
        withRegistry(() => (
            <Chip
                label="Vegan"
                defaultSelected={false}
                onSelectedChange={onSelectedChange}
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(root.getAttribute("aria-pressed")).toBe("false");
        await userEvent.click(root);
        await settle();
        expect(root.getAttribute("aria-pressed")).toBe("true");
        expect(onSelectedChange.mock.calls).toEqual([[{ selected: true }]]);
    });
});
